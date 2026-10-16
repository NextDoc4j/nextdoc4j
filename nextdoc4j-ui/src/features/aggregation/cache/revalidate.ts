import {
  fetchJsonResource,
  requestUrl,
  type JsonResourceResponse,
  type JsonResourceValidators,
} from '../../../lib/http';
import { fingerprintJson } from './fingerprint';
import type { OpenApiCacheEntry, OpenApiCacheStore, OpenApiResourceKind } from './database';

export const openApiCacheSchemaVersion = 1;
export const openApiParserVersion = 'openapi-workspace-1';
const openApiCacheTouchInterval = 1000 * 60 * 60 * 24;

export interface OpenApiResourceLoader {
  invalidateMemory: (url?: string) => void;
  cleanup: (maxAge?: number) => Promise<void>;
  clearChangedUrls: () => void;
  clearStaleUrls: () => void;
  getChangedUrls: () => string[];
  getStaleUrls: () => string[];
  load: <T>(url: string, kind: OpenApiResourceKind, signal?: AbortSignal) => Promise<T>;
  readCached: <T>(url: string) => Promise<T | undefined>;
}

interface CreateOpenApiResourceLoaderOptions {
  fetchResource?: <T>(
    url: string,
    validators: JsonResourceValidators,
    signal?: AbortSignal,
  ) => Promise<JsonResourceResponse<T>>;
  parserVersion?: string;
  store: OpenApiCacheStore;
}

/**
 * Checks whether a persisted resource can be interpreted by the current cache implementation.
 *
 * @param entry Persisted resource candidate.
 * @param parserVersion Current OpenAPI parser and merge rules identity.
 * @returns True when the resource schema and parser version are current.
 */
const isUsableEntry = (
  entry: OpenApiCacheEntry | undefined,
  parserVersion: string,
): entry is OpenApiCacheEntry =>
  Boolean(
    entry &&
    entry.schemaVersion === openApiCacheSchemaVersion &&
    entry.parserVersion === parserVersion,
  );

/**
 * Identifies cancellation errors that must never fall back to stale data.
 *
 * @param reason Unknown request failure.
 * @param signal Optional request cancellation signal.
 * @returns True when the request was explicitly aborted.
 */
const isAbortReason = (reason: unknown, signal?: AbortSignal) =>
  Boolean(
    signal?.aborted ||
    (reason instanceof DOMException && reason.name === 'AbortError') ||
    (reason instanceof Error && reason.name === 'AbortError'),
  );

/**
 * Stops post-response fingerprinting and persistence after explicit request cancellation.
 *
 * @param signal Optional request cancellation signal.
 * @returns Nothing when active; throws an AbortError when cancelled.
 */
const throwIfAborted = (signal?: AbortSignal) => {
  if (!signal?.aborted) return;
  if (signal.reason) throw signal.reason;
  throw new DOMException('请求已取消', 'AbortError');
};

/**
 * Creates a URL-level OpenAPI loader that revalidates once per page lifecycle and persists changes.
 *
 * @param options Persistent store, parser version and optional test fetcher.
 * @returns Resource loader with stale fallback and retention cleanup operations.
 */
export const createOpenApiResourceLoader = ({
  fetchResource = fetchJsonResource,
  parserVersion = openApiParserVersion,
  store,
}: CreateOpenApiResourceLoaderOptions): OpenApiResourceLoader => {
  const changedUrls = new Set<string>();
  const staleUrls = new Set<string>();
  const cachedValues = new Map<string, { value: unknown; fingerprint: string }>();
  let generation = 0;
  /** Retains a resource only while its request generation is current.
   * @param key Resolved resource URL.
   * @param value Complete immutable document.
   * @param fingerprint Content identity from persistence or network.
   * @param expected Generation captured before asynchronous work.
   * @returns Stable document when fingerprints match, otherwise the incoming value.
   */
  const retainValue = <T>(key: string, value: T, fingerprint: string, expected: number): T => {
    if (expected !== generation) return value;
    const previous = cachedValues.get(key);
    const reused = previous?.fingerprint === fingerprint ? (previous.value as T) : value;
    cachedValues.delete(key);
    cachedValues.set(key, { value: reused, fingerprint });
    while (cachedValues.size > 32) cachedValues.delete(cachedValues.keys().next().value!);
    return reused;
  };

  /**
   * Refreshes an unchanged entry's validation time without replacing its stable runtime value.
   *
   * @param entry Cached resource confirmed by the latest server response.
   * @param response Optional modified response carrying refreshed HTTP validators.
   * @param expected Generation captured when this load began.
   * @returns Promise resolved after any necessary persistence update.
   */
  const touchCachedEntry = async <T>(
    entry: OpenApiCacheEntry<T>,
    response: Extract<JsonResourceResponse<T>, { status: 'modified' }> | undefined,
    expected: number,
  ) => {
    if (expected !== generation) return;
    const validatorsChanged = Boolean(
      response && (response.etag !== entry.etag || response.lastModified !== entry.lastModified),
    );
    if (!validatorsChanged && Date.now() - entry.fetchedAt < openApiCacheTouchInterval) return;
    try {
      await store.putDocument({
        ...entry,
        etag: response ? response.etag : entry.etag,
        fetchedAt: Date.now(),
        lastModified: response ? response.lastModified : entry.lastModified,
      });
    } catch {
      // A failed freshness update must not discard an otherwise usable cached document.
    }
  };

  /**
   * Reads one persisted cache entry without exposing storage failures to document loading.
   *
   * @param key Fully resolved document URL.
   * @returns Persisted cache entry, or undefined when storage is unavailable.
   */
  const readStoredEntry = async <T>(key: string) => {
    try {
      return await store.getDocument<T>(key);
    } catch {
      return undefined;
    }
  };

  /**
   * Performs one unconditional retry when a server returns 304 without matching local data.
   *
   * @param url Document URL requested by the repository.
   * @param signal Optional request cancellation signal.
   * @returns Modified JSON resource response.
   */
  const fetchWithoutValidators = async <T>(url: string, signal?: AbortSignal) => {
    const response = await fetchResource<T>(url, {}, signal);
    if (response.status === 'not-modified') {
      throw new Error('服务端返回 304，但当前没有可用的本地文档');
    }
    return response;
  };

  return {
    invalidateMemory: (url?: string) => {
      generation++;
      if (url) cachedValues.delete(requestUrl(url));
      else cachedValues.clear();
    },
    cleanup: async (maxAge = 1000 * 60 * 60 * 24 * 7) => {
      try {
        await store.deleteDocumentsFetchedBefore(Date.now() - maxAge);
      } catch {
        // Persistent cleanup is optional and must not block document loading.
      }
    },
    clearChangedUrls: () => changedUrls.clear(),
    clearStaleUrls: () => staleUrls.clear(),
    getChangedUrls: () => [...changedUrls],
    getStaleUrls: () => [...staleUrls],
    load: async <T>(url: string, kind: OpenApiResourceKind, signal?: AbortSignal) => {
      const expectedGeneration = generation;
      const key = requestUrl(url);
      const persisted = await readStoredEntry<T>(key);
      const cached = isUsableEntry(persisted, parserVersion) ? persisted : undefined;
      const writtenByFutureSchema = Boolean(
        persisted && persisted.schemaVersion > openApiCacheSchemaVersion,
      );
      const validators = cached ? { etag: cached.etag, lastModified: cached.lastModified } : {};
      try {
        let response = await fetchResource<T>(url, validators, signal);
        if (response.status === 'not-modified') {
          if (cached) {
            throwIfAborted(signal);
            await touchCachedEntry(cached as OpenApiCacheEntry<T>, undefined, expectedGeneration);
            return retainValue(key, cached.data as T, cached.fingerprint, expectedGeneration);
          }
          response = await fetchWithoutValidators<T>(url, signal);
        }

        throwIfAborted(signal);
        const fingerprint = await fingerprintJson(response.data);
        throwIfAborted(signal);
        if (cached?.fingerprint === fingerprint) {
          await touchCachedEntry(cached as OpenApiCacheEntry<T>, response, expectedGeneration);
          return retainValue(key, cached.data as T, cached.fingerprint, expectedGeneration);
        }
        if (expectedGeneration === generation) changedUrls.add(url);
        retainValue(key, response.data, fingerprint, expectedGeneration);
        const entry: OpenApiCacheEntry<T> = {
          data: response.data,
          etag: response.etag,
          fetchedAt: Date.now(),
          fingerprint,
          key,
          kind,
          lastModified: response.lastModified,
          parserVersion,
          schemaVersion: openApiCacheSchemaVersion,
          url,
        };
        if (!writtenByFutureSchema && expectedGeneration === generation) {
          try {
            await store.putDocument(entry);
          } catch {
            // Network data remains usable when persistent storage is unavailable or full.
          }
        }
        return response.data;
      } catch (reason) {
        if (isAbortReason(reason, signal)) throw reason;
        if (cached) {
          if (expectedGeneration === generation) staleUrls.add(url);
          return retainValue(key, cached.data as T, cached.fingerprint, expectedGeneration);
        }
        throw reason;
      }
    },
    readCached: async <T>(url: string) => {
      const expectedGeneration = generation;
      const key = requestUrl(url);
      const entry = await readStoredEntry<T>(key);
      return isUsableEntry(entry, parserVersion)
        ? retainValue(key, entry.data as T, entry.fingerprint, expectedGeneration)
        : undefined;
    },
  };
};
