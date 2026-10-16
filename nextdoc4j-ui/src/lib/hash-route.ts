import type { ApiOperation, OpenApiDocument } from '../types/openapi';

export type AppView = 'docs' | 'export' | 'markdown' | 'models' | 'settings';
export type SettingsSectionRoute = 'auth' | 'config';

export interface HashRouteState {
  debug?: boolean;
  debugTab?: 'params' | 'body' | 'headers' | 'cookies' | 'pre-request' | 'post-response';
  debugTabExplicit?: boolean;
  debugBody?: 'none' | 'json' | 'xml' | 'raw' | 'form-data' | 'urlencoded' | 'binary';
  group?: string;
  markdownName?: string;
  modelName?: string;
  operationId?: string;
  operationPath?: string;
  operationMethod?: string;
  serviceId?: string;
  settingsSection?: SettingsSectionRoute;
  sourceGroupId?: string;
  view: AppView;
}

const operationCounts = new WeakMap<OpenApiDocument, Map<string, number>>();
const methods = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'trace'];
const documentResources = ['tags', 'schemas', 'operations', 'paths'];

/**
 * Selects an unambiguous OpenAPI operation address within its owning document.
 *
 * @param operation Interface being opened.
 * @param document Owning OpenAPI document used to detect duplicate operation identifiers.
 * @returns A unique operationId, or the exact path and HTTP method when it is absent or duplicated.
 */
export const getOperationRoute = (operation: ApiOperation, document: OpenApiDocument) => {
  let counts = operationCounts.get(document);
  if (!counts) {
    counts = new Map();
    for (const item of Object.values(document.paths ?? {})) {
      for (const method of methods) {
        const candidate = item[method as ApiOperation['method']];
        if (candidate?.operationId) {
          counts.set(candidate.operationId, (counts.get(candidate.operationId) ?? 0) + 1);
        }
      }
    }
    operationCounts.set(document, counts);
  }
  return operation.operationId && counts.get(operation.operationId) === 1
    ? { operationId: operation.operationId }
    : { operationPath: operation.path, operationMethod: operation.method };
};

/**
 * Assigns a stable readable route key without depending on document or service ordering.
 *
 * @param item Named document or service with a stable URL identity.
 * @param items All peers in the same namespace, used to detect duplicate names.
 * @param reserved Names already used by a built-in document source.
 * @returns The configured name or service ID, with a stable URL-derived suffix for collisions.
 */
export const getRouteKey = (
  item: { name: string; url: string; serviceId?: string },
  items: Array<{ name: string; url: string; serviceId?: string }>,
  reserved: string[] = [],
) => {
  const name = item.serviceId || item.name || 'default';
  const duplicate = items.some(
    (peer) => peer.url !== item.url && (peer.serviceId || peer.name || 'default') === name,
  );
  if (!duplicate && !reserved.includes(name) && !name.includes('~')) return name;
  let suffix = 14695981039346656037n;
  for (const character of item.url) {
    suffix = BigInt.asUintN(64, (suffix ^ BigInt(character.codePointAt(0)!)) * 1099511628211n);
  }
  return `${name}~${suffix.toString(36)}`;
};

/**
 * Derives document-group route keys from fetch URLs without using their display names.
 *
 * @param groups Loaded Springdoc groups with their resolved document URLs.
 * @param documentUrl Main document or Swagger Config URL, including any gateway prefix.
 * @returns URL-to-key mapping with stable suffixes for duplicate or reserved path names.
 */
export const getDocumentGroupRouteKeys = (
  groups: Array<{ url: string }>,
  documentUrl = '/v3/api-docs',
) => {
  const base = new URL(documentUrl, 'http://route.local/');
  const basePath = base.pathname.replace(/\/+$/, '').replace(/\/swagger-config$/, '');
  const names = groups.map(({ url }) => {
    let name = '';
    try {
      const parsed = new URL(url, base);
      const path = parsed.pathname.replace(/\/+$/, '');
      const suffix = path.startsWith(`${basePath}/`)
        ? path.slice(basePath.length + 1)
        : path.split('/api-docs/').slice(1).join('/api-docs/');
      name =
        parsed.searchParams.get('group')?.trim() ||
        decodeURIComponent(suffix || path.split('/').at(-1) || 'default');
    } catch {
      // Invalid URL escapes use a stable fallback instead of interrupting navigation.
    }
    return { name: name || 'default', url };
  });
  return new Map(
    names.map((item) => [item.url, getRouteKey(item, names, ['all', ...documentResources])]),
  );
};

/**
 * Parses workspace locations using Springdoc groups and OpenAPI resource names.
 *
 * @param hash Browser hash, with or without the leading hash marker.
 * @returns Page identity, or undefined for malformed or unsupported routes.
 */
export const parseValidHashRoute = (hash: string): HashRouteState | undefined => {
  if (hash.includes('?')) return undefined;
  let parts: string[];
  try {
    parts = hash
      .replace(/^#?\/?/, '')
      .replace(/\/+$/, '')
      .split('/')
      .map(decodeURIComponent);
  } catch {
    return undefined;
  }
  const route: HashRouteState = { view: 'docs' };
  if (parts[0] === 'services') {
    parts.shift();
    route.serviceId = parts.shift();
    if (!route.serviceId) return undefined;
  }
  const page = parts.shift();
  if (page === 'home') return parts.length === 0 ? route : undefined;
  if (page === 'settings') {
    if (parts.length > 1 || (parts[0] && !['auth', 'config', 'export'].includes(parts[0])))
      return undefined;
    return {
      ...route,
      view: parts[0] === 'export' ? 'export' : 'settings',
      settingsSection: parts[0] === 'auth' ? 'auth' : 'config',
    };
  }
  if (page === 'markdown') {
    if (parts.length > 2) return undefined;
    return { ...route, view: 'markdown', group: parts[0], markdownName: parts[1] };
  }
  if (page !== 'docs') return undefined;
  route.sourceGroupId = 'all';
  if (parts[0] && !documentResources.includes(parts[0])) route.sourceGroupId = parts.shift();
  const resource = parts.shift();
  if (!resource) return parts.length === 0 ? route : undefined;
  if (resource === 'tags') {
    if (parts.length !== 1 || !parts[0]) return undefined;
    return { ...route, group: parts[0] };
  }
  if (resource === 'schemas') {
    if (parts.length > 1) return undefined;
    return { ...route, view: 'models', modelName: parts[0] };
  }
  if (resource === 'operations') {
    route.operationId = parts.shift();
    if (!route.operationId) return undefined;
  } else if (resource === 'paths') {
    route.operationPath = parts.shift();
    route.operationMethod = parts.shift()?.toLowerCase();
    if (!route.operationPath || !methods.includes(route.operationMethod || '')) return undefined;
  } else return undefined;
  if (parts.length > 1 || (parts.length === 1 && parts[0] !== 'debug')) return undefined;
  if (parts[0] === 'debug') route.debug = true;
  return route;
};

/** Parses a page location with a home fallback for invalid browser addresses.
 * @param hash Current browser Hash.
 * @returns Valid page identity or the home page; legacy query routes are not supported.
 */
export const parseHashRoute = (hash: string): HashRouteState =>
  parseValidHashRoute(hash) ?? { view: 'docs' };

/**
 * Serializes page identity without placing debugger panel selections in the address.
 *
 * @param route Workspace page, optional service and OpenAPI resource identity.
 * @returns Shareable hash route compatible with backend-hosted static assets.
 */
export const createHashRoute = (route: HashRouteState): string => {
  const parts: string[] = [];
  if (route.serviceId) parts.push('services', route.serviceId);
  if (route.view === 'settings' || route.view === 'export') {
    parts.push('settings', route.view === 'export' ? 'export' : route.settingsSection || 'config');
  } else if (route.view === 'markdown') {
    parts.push('markdown');
    if (route.group || route.markdownName) parts.push(route.group || '');
    if (route.markdownName) parts.push(route.markdownName);
  } else if (
    route.view === 'models' ||
    route.sourceGroupId ||
    route.group ||
    route.operationId ||
    route.operationPath
  ) {
    parts.push('docs');
    if (route.sourceGroupId && route.sourceGroupId !== 'all') {
      parts.push(route.sourceGroupId);
    }
    if (route.view === 'models') {
      parts.push('schemas');
      if (route.modelName) parts.push(route.modelName);
    } else if (route.operationId || route.operationPath) {
      if (route.operationId) parts.push('operations', route.operationId);
      else parts.push('paths', route.operationPath!, route.operationMethod!);
      if (route.debug) parts.push('debug');
    } else if (route.group) parts.push('tags', route.group);
  } else parts.push('home');
  return `#/${parts.map((part) => encodeURIComponent(part)).join('/')}`;
};
