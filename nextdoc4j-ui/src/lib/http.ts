import type { OpenApiDocument, SwaggerConfig } from '../types/openapi';

/**
 * Resolves the backend deployment directory using the legacy production strategy.
 * @param None; reads the build mode and current browser pathname.
 * @returns Deployment prefix in production, or the configured development proxy prefix.
 */
export const getApiBase = () => {
  const path = globalThis.location?.pathname || '/';
  return (
    import.meta.env.PROD
      ? path.slice(0, path.lastIndexOf('/'))
      : import.meta.env.VITE_GLOB_API_URL || ''
  ).replace(/\/+$/, '');
};

const isAbsoluteUrl = (url: string) => /^https?:\/\//i.test(url);

/**
 * Resolves a document or service prefix against the backend deployment directory.
 * @param path Document path or gateway service prefix; absolute HTTP URLs are preserved.
 * @param apiBase Backend deployment or development proxy prefix.
 * @returns Request base without duplicating an already present deployment prefix.
 */
export const resolveRequestBase = (path: string, apiBase = getApiBase()) => {
  if (isAbsoluteUrl(path)) return path.replace(/\/+$/, '');
  const base = apiBase.replace(/\/+$/, '');
  if (!path) return base;
  const normalizedPath = `/${path.replace(/^\/+/, '')}`;
  if (
    import.meta.env.PROD &&
    base &&
    (normalizedPath === base || normalizedPath.startsWith(`${base}/`))
  ) {
    return normalizedPath;
  }
  return `${base}${normalizedPath}`;
};

export interface JsonResourceValidators {
  etag?: string;
  lastModified?: string;
}

export type JsonResourceResponse<T> =
  | {
      data: T;
      etag?: string;
      lastModified?: string;
      status: 'modified';
    }
  | { status: 'not-modified' };

export const requestUrl = (path: string) => {
  if (isAbsoluteUrl(path)) return path;
  return resolveRequestBase(path);
};

/**
 * Requests one JSON resource with optional HTTP validators and explicit revalidation semantics.
 *
 * @param path Relative or absolute document URL.
 * @param validators Previously stored ETag or Last-Modified values.
 * @param signal Optional request cancellation signal.
 * @returns Modified JSON and response validators, or a not-modified result for HTTP 304.
 */
export async function fetchJsonResource<T>(
  path: string,
  validators: JsonResourceValidators = {},
  signal?: AbortSignal,
): Promise<JsonResourceResponse<T>> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (validators.etag) headers['If-None-Match'] = validators.etag;
  else if (validators.lastModified) headers['If-Modified-Since'] = validators.lastModified;
  const response = await fetch(requestUrl(path), {
    cache: 'no-cache',
    headers,
    signal,
  });
  if (response.status === 304) return { status: 'not-modified' };
  if (!response.ok) {
    throw new Error(`加载失败：${response.status} ${response.statusText}`);
  }
  return {
    data: (await response.json()) as T,
    etag: response.headers.get('ETag') || undefined,
    lastModified: response.headers.get('Last-Modified') || undefined,
    status: 'modified',
  };
}

/**
 * Loads one JSON resource for callers that do not manage a persistent validator cache.
 *
 * @param path Relative or absolute document URL.
 * @param signal Optional request cancellation signal.
 * @returns Parsed JSON response.
 */
async function readJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetchJsonResource<T>(path, {}, signal);
  if (response.status === 'not-modified') {
    throw new Error('服务端返回 304，但当前没有可用的本地文档');
  }
  return response.data;
}

export const fetchOpenApi = (path = '/v3/api-docs', signal?: AbortSignal) =>
  readJson<OpenApiDocument>(path, signal);

export const fetchSwaggerConfig = (signal?: AbortSignal) =>
  readJson<SwaggerConfig>('/v3/api-docs/swagger-config', signal);

/**
 * Loads a Swagger Config document from an explicitly resolved service endpoint.
 *
 * @param path Gateway or absolute Swagger Config URL.
 * @param signal Optional request cancellation signal.
 * @returns Parsed Swagger Config response.
 */
export const fetchSwaggerConfigAt = (path: string, signal?: AbortSignal) =>
  readJson<SwaggerConfig>(path, signal);
