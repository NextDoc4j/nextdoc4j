import type { OpenApiDocument, ServiceDefinition } from '../../types/openapi';

export interface ProbedService extends ServiceDefinition {
  document?: OpenApiDocument;
}

const collator = new Intl.Collator('zh-CN', { numeric: true, sensitivity: 'base' });

const orderOf = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER;
};

/**
 * Checks whether an OpenAPI document explicitly enables gateway aggregation mode.
 *
 * @param document Gateway OpenAPI document returned by the main document endpoint.
 * @returns True only when the aggregation extension contains the boolean value true.
 */
export const isAggregationEnabled = (document?: OpenApiDocument) =>
  document?.['x-nextdoc4j-aggregation']?.aggregation === true;

/**
 * Orders gateway services using x-order and a deterministic display-name fallback.
 *
 * @param services Gateway services from Swagger Config.
 * @returns A new ordered service list.
 */
export const sortServices = (services: ServiceDefinition[] = []) =>
  [...services].sort((left, right) => {
    const order = orderOf(left['x-order']) - orderOf(right['x-order']);
    return (
      order || collator.compare(left.name, right.name) || collator.compare(left.url, right.url)
    );
  });

/**
 * Probes all enabled service documents without allowing a failed service to stop the list.
 *
 * @param services Gateway service definitions to probe.
 * @param loadDocument OpenAPI document loader, injected for browser and test environments.
 * @returns Services decorated with UP/DOWN status, reason and successfully fetched document.
 */
export const probeServices = async (
  services: ServiceDefinition[],
  loadDocument: (service: ServiceDefinition) => Promise<OpenApiDocument>,
): Promise<ProbedService[]> => {
  const orderedServices = sortServices(services);
  return Promise.all(
    orderedServices.map(async (service) => {
      if (service.disabled) {
        return {
          ...service,
          reason: service.reason || '服务已在网关配置中禁用',
          status: 'DOWN' as const,
        };
      }
      try {
        const document = await loadDocument(service);
        return { ...service, disabled: false, document, reason: '', status: 'UP' as const };
      } catch (error) {
        return {
          ...service,
          disabled: true,
          reason: error instanceof Error ? error.message : '服务文档不可用',
          status: 'DOWN' as const,
        };
      }
    }),
  );
};

/**
 * Selects a usable service, preferring a previously selected URL when still available.
 *
 * @param services Probed services in display order.
 * @param preferredUrl Optional URL persisted from a prior browser session.
 * @returns The selected usable service, or undefined when every service is unavailable.
 */
export const selectAvailableService = (services: ServiceDefinition[], preferredUrl?: string) =>
  services.find((service) => service.url === preferredUrl && !service.disabled) ??
  services.find((service) => !service.disabled);

/**
 * Marks one service as unavailable while preserving all unrelated service state.
 *
 * @param services Current gateway services.
 * @param serviceUrl Service document URL to update.
 * @param reason Human-readable request failure reason.
 * @returns Updated service array.
 */
export const markServiceUnavailable = (
  services: ServiceDefinition[],
  serviceUrl: string,
  reason: string,
) =>
  services.map((service) =>
    service.url === serviceUrl
      ? { ...service, disabled: true, reason, status: 'DOWN' as const }
      : service,
  );

/**
 * Removes transient probe results before services are stored in UI state.
 *
 * @param services Services returned by a probe operation.
 * @returns Service definitions without the cached OpenAPI document payload.
 */
export const toServiceDefinitions = (services: ProbedService[]): ServiceDefinition[] =>
  services.map((service) => ({
    contextPath: service.contextPath,
    disabled: service.disabled,
    name: service.name,
    reason: service.reason,
    serviceId: service.serviceId,
    status: service.status,
    url: service.url,
    'x-order': service['x-order'],
  }));
