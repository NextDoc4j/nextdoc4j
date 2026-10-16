import type { ServiceDefinition } from '../../../types/openapi';
import { requestUrl } from '../../../lib/http';

export interface WorkspaceScope {
  appId: string;
  serviceKey: string;
}
export interface OperationIdentity extends WorkspaceScope {
  method: string;
  path: string;
}

/**
 * Identifies a backend-hosted application independently of its Hash navigation.
 * @param location Browser location or an explicit deployment address.
 * @param namespace Optional stable backend or build-time namespace.
 * @returns Application identity isolated by deployment directory and configuration endpoint.
 */
export const getApplicationId = (
  location = globalThis.location,
  namespace = globalThis.window?.__NEXTDOC4J_CONFIG__?.storageNamespace ||
    import.meta.env.VITE_STORAGE_NAMESPACE,
) => {
  if (namespace) return namespace;
  const href = location?.href || 'http://localhost/';
  const base = new URL('.', href);
  const config = new URL(requestUrl('/v3/api-docs/swagger-config'), href);
  config.hash = '';
  return JSON.stringify([base.pathname, config.href]);
};

/**
 * Builds a persistent service identity that does not depend on menu labels or order.
 * @param service Active service, omitted for a standalone backend.
 * @param services All services used to validate serviceId uniqueness.
 * @returns Application and service namespace.
 */
export const getWorkspaceScope = (
  service?: ServiceDefinition,
  services: ServiceDefinition[] = [],
): WorkspaceScope => ({
  appId: getApplicationId(),
  serviceKey: !service
    ? 'single-app'
    : service.serviceId &&
        services.filter((item) => item.serviceId === service.serviceId).length === 1
      ? JSON.stringify(['id', service.serviceId])
      : JSON.stringify([
          'url',
          new URL(requestUrl(service.url), globalThis.location?.href || 'http://localhost/').href,
        ]),
});

/**
 * Encodes a scope for existing component storage-key boundaries without using request prefixes.
 * @param scope Stable application and service identity.
 * @returns Losslessly encoded scope token.
 */
export const scopeToken = (scope: WorkspaceScope) =>
  JSON.stringify([scope.appId, scope.serviceKey]);

/**
 * Decodes a scope token supplied by the workspace to its detail and debugger components.
 * @param token Encoded scope token.
 * @returns Stable workspace scope.
 */
export const parseScopeToken = (token: string): WorkspaceScope => {
  const [appId, serviceKey] = JSON.parse(token) as [string, string];
  return { appId, serviceKey };
};

/**
 * Creates an interface identity shared by all its document-group entries.
 * @param scope Owning workspace.
 * @param method HTTP method.
 * @param path Exact OpenAPI path.
 * @returns Stable persistent identity.
 */
export const operationIdentity = (
  scope: WorkspaceScope,
  method: string,
  path: string,
): OperationIdentity => ({ ...scope, method: method.toLowerCase(), path });

/**
 * Produces an IndexedDB composite key for a workspace or interface.
 * @param identity Persistent scope or interface identity.
 * @returns Composite key without ambiguous string delimiters.
 */
export const identityKey = (identity: WorkspaceScope | OperationIdentity): string[] =>
  'method' in identity
    ? [identity.appId, identity.serviceKey, identity.method, identity.path]
    : [identity.appId, identity.serviceKey];

const scopes = new Map<string, WorkspaceScope>();
/** Registers configured services before workspace or preferences restoration.
 * @param services Backend service definitions.
 * @returns Nothing; refreshes stable identities for URL-based existing call sites.
 */
export const registerWorkspaceServices = (services: ServiceDefinition[]) => {
  for (const service of services) scopes.set(service.url, getWorkspaceScope(service, services));
};
/** Resolves an already registered service URL or the standalone application scope.
 * @param url Service document URL, omitted in standalone mode.
 * @returns Stable persistent scope.
 */
export const scopeForService = (url?: string) =>
  url ? (scopes.get(url) ?? getWorkspaceScope({ name: '', url })) : getWorkspaceScope();

/** Resolves the current configured URL for migration of a stable service scope.
 * @param scope Persistent service identity.
 * @returns Configured document URL, or undefined for the standalone application.
 */
export const serviceUrlForScope = (scope: WorkspaceScope) =>
  [...scopes].find(
    ([, value]) => value.appId === scope.appId && value.serviceKey === scope.serviceKey,
  )?.[0];
