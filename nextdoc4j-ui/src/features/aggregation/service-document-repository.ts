import type { OpenApiDocument, ServiceDefinition, SwaggerConfig } from '../../types/openapi';

import type { OpenApiResourceKind } from './cache/database';
import { createDocumentCache } from './document-cache';
import { resolveServiceGroupDocumentUrl, resolveServiceSwaggerConfigUrl } from './url';

export interface ServiceGroupDocument {
  document: OpenApiDocument;
  id: string;
  name: string;
  url: string;
}

export interface ServiceGroupDocumentError {
  name: string;
  reason: string;
  url: string;
}

export interface ServiceWorkspaceDocument {
  document: OpenApiDocument;
  errors: ServiceGroupDocumentError[];
  groupDocuments: ServiceGroupDocument[];
  mainDocument: OpenApiDocument;
}

export interface ServiceWorkspaceLoadOptions {
  docPath?: string;
  serviceSwaggerConfigEnabled?: boolean;
  signal?: AbortSignal;
}

export interface ServiceDocumentRepository {
  clear: () => void;
  getGroupDocument: (
    service: ServiceDefinition,
    group: ServiceDefinition,
    docPath?: string,
    signal?: AbortSignal,
  ) => Promise<OpenApiDocument>;
  getServiceConfig: (service: ServiceDefinition, signal?: AbortSignal) => Promise<SwaggerConfig>;
  getServiceDocument: (
    service: ServiceDefinition,
    signal?: AbortSignal,
  ) => Promise<OpenApiDocument>;
  invalidate: (service?: ServiceDefinition) => void;
  loadWorkspace: (
    service: ServiceDefinition,
    options?: ServiceWorkspaceLoadOptions,
  ) => Promise<ServiceWorkspaceDocument>;
}

interface CreateRepositoryOptions {
  invalidateMemory?: (url?: string) => void;
  fetchDocument: (
    url: string,
    signal?: AbortSignal,
    kind?: OpenApiResourceKind,
  ) => Promise<OpenApiDocument>;
  fetchSwaggerConfig: (
    url: string,
    signal?: AbortSignal,
    kind?: OpenApiResourceKind,
  ) => Promise<SwaggerConfig>;
}

/**
 * Gets a URL's final path segment without letting malformed percent escapes stop document loading.
 *
 * @param url Swagger Config document URL.
 * @returns Decoded final path segment, or its raw value when it contains invalid encoding.
 */
const getLastPathSegment = (url: string) => {
  const segment = url.split('?')[0]?.replace(/\/+$/, '').split('/').at(-1) || 'default';
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
};

const isAllDocumentUrl = (url: string) => getLastPathSegment(url).toLowerCase() === 'all';

/**
 * Merges a service's main and group documents without replacing main-document operations.
 *
 * @param mainDocument Main OpenAPI document, normally the service's all-document endpoint.
 * @param groupDocuments Successfully loaded service group documents.
 * @returns Navigation-ready OpenAPI document with deduplicated paths and components.
 */
export const mergeServiceDocuments = (
  mainDocument: OpenApiDocument,
  groupDocuments: ServiceGroupDocument[],
): OpenApiDocument => {
  const paths = { ...(mainDocument.paths ?? {}) };
  const schemas = { ...(mainDocument.components?.schemas ?? {}) };
  const responses = { ...(mainDocument.components?.responses ?? {}) };
  const headers = { ...(mainDocument.components?.headers ?? {}) };
  const examples = { ...(mainDocument.components?.examples ?? {}) };
  const securitySchemes = { ...(mainDocument.components?.securitySchemes ?? {}) };
  const tags = [...(mainDocument.tags ?? [])];
  const tagNames = new Set(tags.map((tag) => tag.name));

  groupDocuments.forEach(({ document }) => {
    Object.entries(document.paths ?? {}).forEach(([path, pathItem]) => {
      paths[path] = { ...pathItem, ...paths[path] };
    });
    Object.entries(document.components?.schemas ?? {}).forEach(([name, schema]) => {
      schemas[name] ??= schema;
    });
    Object.entries(document.components?.responses ?? {}).forEach(([name, response]) => {
      responses[name] ??= response;
    });
    Object.entries(document.components?.headers ?? {}).forEach(([name, header]) => {
      headers[name] ??= header;
    });
    Object.entries(document.components?.examples ?? {}).forEach(([name, example]) => {
      examples[name] ??= example;
    });
    Object.entries(document.components?.securitySchemes ?? {}).forEach(([name, scheme]) => {
      securitySchemes[name] ??= scheme;
    });
    (document.tags ?? []).forEach((tag) => {
      if (!tagNames.has(tag.name)) {
        tags.push(tag);
        tagNames.add(tag.name);
      }
    });
  });

  return {
    ...mainDocument,
    components: {
      ...mainDocument.components,
      ...(Object.keys(schemas).length > 0 ? { schemas } : {}),
      ...(Object.keys(responses).length > 0 ? { responses } : {}),
      ...(Object.keys(headers).length > 0 ? { headers } : {}),
      ...(Object.keys(examples).length > 0 ? { examples } : {}),
      ...(Object.keys(securitySchemes).length > 0 ? { securitySchemes } : {}),
    },
    paths,
    ...(tags.length > 0 ? { tags } : {}),
  };
};

/**
 * Creates a cache-backed service document repository for aggregation mode.
 *
 * @param options Fetch functions supplied by the browser application or tests.
 * @returns Repository that deduplicates service, config and group-document requests.
 */
export const createServiceDocumentRepository = (
  options: CreateRepositoryOptions,
): ServiceDocumentRepository => {
  const documentCache = createDocumentCache<OpenApiDocument>();
  const configCache = createDocumentCache<SwaggerConfig>();
  const groupUrlsByService = new Map<string, Set<string>>();

  const getServiceDocument = (service: ServiceDefinition, signal?: AbortSignal) =>
    documentCache.get(service.url, () => options.fetchDocument(service.url, signal, 'service'));

  const getServiceConfig = (service: ServiceDefinition, signal?: AbortSignal) => {
    const configUrl = resolveServiceSwaggerConfigUrl(service.url);
    return configCache.get(configUrl, () =>
      options.fetchSwaggerConfig(configUrl, signal, 'swagger-config'),
    );
  };

  const getGroupDocument = (
    service: ServiceDefinition,
    group: ServiceDefinition,
    docPath?: string,
    signal?: AbortSignal,
  ) => {
    const groupUrl = resolveServiceGroupDocumentUrl(service.url, group.url, docPath);
    const serviceGroupUrls = groupUrlsByService.get(service.url) ?? new Set<string>();
    serviceGroupUrls.add(groupUrl);
    groupUrlsByService.set(service.url, serviceGroupUrls);
    return documentCache.get(groupUrl, () => options.fetchDocument(groupUrl, signal, 'group'));
  };

  const loadWorkspace = async (
    service: ServiceDefinition,
    workspaceOptions: ServiceWorkspaceLoadOptions = {},
  ): Promise<ServiceWorkspaceDocument> => {
    const { docPath, serviceSwaggerConfigEnabled = false, signal } = workspaceOptions;
    const mainDocument = await getServiceDocument(service, signal);
    let groups: ServiceDefinition[] = [];
    if (serviceSwaggerConfigEnabled) {
      try {
        const config = await getServiceConfig(service, signal);
        const seenUrls = new Set<string>();
        groups = (config.urls ?? []).filter((group) => {
          if (!group.url.trim()) return false;
          const groupUrl = resolveServiceGroupDocumentUrl(service.url, group.url, docPath);
          if (group.disabled || isAllDocumentUrl(group.url) || seenUrls.has(groupUrl)) return false;
          seenUrls.add(groupUrl);
          return true;
        });
      } catch (error) {
        if (signal?.aborted) throw error;
        // Per-service Swagger Config is optional; the main document remains usable without it.
      }
    }

    const results = await Promise.all(
      groups.map(async (group) => {
        const url = resolveServiceGroupDocumentUrl(service.url, group.url, docPath);
        try {
          const document = await getGroupDocument(service, group, docPath, signal);
          return {
            kind: 'success' as const,
            value: {
              document,
              id: `${service.url}:${url}`,
              name: group.name || getLastPathSegment(group.url),
              url,
            },
          };
        } catch (error) {
          return {
            kind: 'error' as const,
            value: {
              name: group.name || getLastPathSegment(group.url),
              reason: error instanceof Error ? error.message : '分组文档不可用',
              url,
            },
          };
        }
      }),
    );
    const groupDocuments = results.flatMap((result) =>
      result.kind === 'success' ? [result.value] : [],
    );
    const errors = results.flatMap((result) => (result.kind === 'error' ? [result.value] : []));

    return {
      document: mergeServiceDocuments(mainDocument, groupDocuments),
      errors,
      groupDocuments,
      mainDocument,
    };
  };

  return {
    clear: () => {
      options.invalidateMemory?.();
      documentCache.clear();
      configCache.clear();
      groupUrlsByService.clear();
    },
    getGroupDocument,
    getServiceConfig,
    getServiceDocument,
    invalidate: (service?: ServiceDefinition) => {
      options.invalidateMemory?.();
      if (!service) {
        documentCache.clear();
        configCache.clear();
        groupUrlsByService.clear();
        return;
      }
      documentCache.invalidate(service.url);
      configCache.invalidate(resolveServiceSwaggerConfigUrl(service.url));
      groupUrlsByService
        .get(service.url)
        ?.forEach((groupUrl) => documentCache.invalidate(groupUrl));
      groupUrlsByService.delete(service.url);
    },
    loadWorkspace,
  };
};
