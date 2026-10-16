import { describe, expect, it, vi } from 'vitest';

import {
  createMemoryOpenApiCacheStore,
  type OpenApiCacheEntry,
} from '../../../src/features/aggregation/cache/database';
import {
  fingerprintJson,
  stableStringify,
} from '../../../src/features/aggregation/cache/fingerprint';
import {
  createOpenApiResourceLoader,
  openApiCacheSchemaVersion,
  openApiParserVersion,
} from '../../../src/features/aggregation/cache/revalidate';
import {
  restoreOpenApiWorkspace,
  saveOpenApiWorkspace,
} from '../../../src/features/aggregation/cache/workspace';
import type { JsonResourceValidators } from '../../../src/lib/http';
import type { OpenApiDocument } from '../../../src/types/openapi';

const document: OpenApiDocument = {
  info: { title: 'Test API', version: '1.0.0' },
  openapi: '3.0.3',
  paths: { '/users': { get: { operationId: 'listUsers' } } },
};

describe('OpenAPI persistent cache', () => {
  it('creates the same fingerprint for objects whose keys have different orders', async () => {
    const left = { info: { title: 'API', version: '1' }, openapi: '3.0.3', paths: {} };
    const right = { paths: {}, openapi: '3.0.3', info: { version: '1', title: 'API' } };

    expect(stableStringify(left)).toBe(stableStringify(right));
    await expect(fingerprintJson(left)).resolves.toBe(await fingerprintJson(right));
  });

  it('writes changed content once and skips an unchanged response', async () => {
    const store = createMemoryOpenApiCacheStore();
    const putDocument = vi.spyOn(store, 'putDocument');
    const validators: JsonResourceValidators[] = [];
    let responseDocument = document;
    const fetchResource = async <T>(_url: string, currentValidators: JsonResourceValidators) => {
      validators.push(currentValidators);
      return {
        data: structuredClone(responseDocument) as T,
        etag: 'document-v1',
        status: 'modified' as const,
      };
    };
    const loader = createOpenApiResourceLoader({ fetchResource, store });

    const first = await loader.load('/v3/api-docs', 'gateway');
    expect(loader.getChangedUrls()).toEqual(['/v3/api-docs']);
    loader.clearChangedUrls();
    const second = await loader.load('/v3/api-docs', 'gateway');

    expect(first).toEqual(document);
    expect(second).toBe(first);
    expect(loader.getChangedUrls()).toEqual([]);
    responseDocument = { ...document, info: { ...document.info, version: '2.0.0' } };
    const third = await loader.load('/v3/api-docs', 'gateway');

    expect(third).toEqual(responseDocument);
    expect(third).not.toBe(first);
    expect(loader.getChangedUrls()).toEqual(['/v3/api-docs']);
    expect(validators).toHaveLength(3);
    expect(validators[1]).toEqual({
      etag: 'document-v1',
      lastModified: undefined,
    });
    expect(putDocument).toHaveBeenCalledTimes(2);
  });

  it('uses cached content for HTTP 304 and recoverable request failures', async () => {
    const store = createMemoryOpenApiCacheStore();
    const entry: OpenApiCacheEntry<OpenApiDocument> = {
      data: document,
      etag: 'document-v1',
      fetchedAt: Date.now(),
      fingerprint: await fingerprintJson(document),
      key: '/v3/api-docs',
      kind: 'gateway',
      parserVersion: openApiParserVersion,
      schemaVersion: openApiCacheSchemaVersion,
      url: '/v3/api-docs',
    };
    await store.putDocument(entry);

    const notModifiedLoader = createOpenApiResourceLoader({
      fetchResource: async () => ({ status: 'not-modified' }),
      store,
    });
    await expect(notModifiedLoader.load('/v3/api-docs', 'gateway')).resolves.toEqual(document);

    const unavailableLoader = createOpenApiResourceLoader({
      fetchResource: async () => {
        throw new Error('offline');
      },
      store,
    });
    await expect(unavailableLoader.load('/v3/api-docs', 'gateway')).resolves.toEqual(document);
    expect(unavailableLoader.getStaleUrls()).toEqual(['/v3/api-docs']);
  });

  it('refreshes the retention timestamp after an old cached document is revalidated', async () => {
    const store = createMemoryOpenApiCacheStore();
    await store.putDocument({
      data: document,
      etag: 'document-v1',
      fetchedAt: 0,
      fingerprint: await fingerprintJson(document),
      key: '/v3/api-docs',
      kind: 'gateway',
      parserVersion: openApiParserVersion,
      schemaVersion: openApiCacheSchemaVersion,
      url: '/v3/api-docs',
    });
    const putDocument = vi.spyOn(store, 'putDocument');
    const loader = createOpenApiResourceLoader({
      fetchResource: async () => ({ status: 'not-modified' }),
      store,
    });

    await expect(loader.load('/v3/api-docs', 'gateway')).resolves.toBe(document);

    expect(loader.getChangedUrls()).toEqual([]);
    expect(putDocument).toHaveBeenCalledOnce();
    expect(putDocument.mock.calls[0]?.[0].fetchedAt).toBeGreaterThan(0);
  });

  it('does not persist a response after its request is cancelled', async () => {
    const store = createMemoryOpenApiCacheStore();
    const putDocument = vi.spyOn(store, 'putDocument');
    const controller = new AbortController();
    const loader = createOpenApiResourceLoader({
      fetchResource: async <T>() => {
        controller.abort();
        return { data: document as T, status: 'modified' };
      },
      store,
    });

    await expect(loader.load('/v3/api-docs', 'gateway', controller.signal)).rejects.toMatchObject({
      name: 'AbortError',
    });
    expect(putDocument).not.toHaveBeenCalled();
  });

  it('does not overwrite a cache record written by a newer schema', async () => {
    const store = createMemoryOpenApiCacheStore();
    await store.putDocument({
      data: document,
      fetchedAt: Date.now(),
      fingerprint: await fingerprintJson(document),
      key: '/v3/api-docs',
      kind: 'gateway',
      parserVersion: openApiParserVersion,
      schemaVersion: openApiCacheSchemaVersion + 1,
      url: '/v3/api-docs',
    });
    const putDocument = vi.spyOn(store, 'putDocument');
    const loader = createOpenApiResourceLoader({
      fetchResource: async <T>() => ({ data: document as T, status: 'modified' }),
      store,
    });

    await expect(loader.load('/v3/api-docs', 'gateway')).resolves.toEqual(document);
    expect(putDocument).not.toHaveBeenCalled();
  });

  it('restores only a fully persisted workspace manifest', async () => {
    const store = createMemoryOpenApiCacheStore();
    const loader = createOpenApiResourceLoader({
      fetchResource: async <T>() => ({ data: document as T, status: 'modified' }),
      store,
    });
    await loader.load('/v3/api-docs', 'gateway');

    await saveOpenApiWorkspace(store, {
      document,
      gatewayDocument: document,
      gatewayDocumentUrl: '/v3/api-docs',
      groupDocumentErrors: [],
      mainDocument: document,
      mainDocumentUrl: '/v3/api-docs',
      services: [],
      sourceGroupDocuments: [],
    });

    await expect(restoreOpenApiWorkspace(store, loader)).resolves.toMatchObject({
      document,
      gatewayDocument: document,
      mainDocument: document,
      services: [],
      sourceGroupDocuments: [],
    });
  });
});

it('evicts old memory values and reuses only matching persisted fingerprints', async () => {
  const store = createMemoryOpenApiCacheStore();
  const loader = createOpenApiResourceLoader({
    store,
    fetchResource: async <T>(url: string) => ({ status: 'modified' as const, data: { url } as T }),
  });
  const first = await loader.load('/memory-0', 'service');
  expect(await loader.readCached('/memory-0')).toBe(first);
  for (let i = 1; i <= 40; i++) await loader.load(`/memory-${i}`, 'service');
  // A subsequent persisted read must restore an evicted document rather than retaining its reference.
  const restored = await loader.readCached('/memory-0');
  expect(restored).toEqual(first);
  loader.invalidateMemory();
  const updated = { url: '/memory-0', changed: true };
  const entry =
    (await store.getDocument('/api/memory-0')) ?? (await store.getDocument('/memory-0'));
  expect(entry).toBeDefined();
  await store.putDocument({
    ...entry!,
    data: updated,
    fingerprint: await fingerprintJson(updated),
  });
  expect(await loader.readCached('/memory-0')).toEqual(updated);
});

it('does not overwrite fresh persistence with an invalidated late 304 response', async () => {
  const store = createMemoryOpenApiCacheStore();
  const old = { version: 'old' };
  const fresh = { version: 'fresh' };
  const cached = {
    data: old,
    fetchedAt: 0,
    fingerprint: await fingerprintJson(old),
    key: '/stale-touch',
    kind: 'service' as const,
    parserVersion: openApiParserVersion,
    schemaVersion: openApiCacheSchemaVersion,
    url: '/stale-touch',
  };
  await store.putDocument(cached);
  let finish: (() => void) | undefined;
  const loader = createOpenApiResourceLoader({
    store,
    fetchResource: () =>
      new Promise((resolve) => {
        finish = () => resolve({ status: 'not-modified' });
      }),
  });
  const task = loader.load('/stale-touch', 'service');
  await vi.waitFor(() => expect(finish).toBeDefined());
  loader.invalidateMemory('/stale-touch');
  await store.putDocument({
    ...cached,
    data: fresh,
    fingerprint: await fingerprintJson(fresh),
    fetchedAt: Date.now(),
  });
  finish!();
  await task;
  expect(await loader.readCached('/stale-touch')).toEqual(fresh);
});
it('refreshes an in-memory object when another loader updates its persisted fingerprint', async () => {
  const store = createMemoryOpenApiCacheStore();
  const loader = createOpenApiResourceLoader({
    store,
    fetchResource: async <T>() => ({ status: 'modified', data: { version: 1 } as T }),
  });
  await loader.load('/fingerprint-change', 'service');
  const cached = (await store.getDocument('/fingerprint-change'))!;
  await store.putDocument({
    ...cached,
    data: { version: 2 },
    fingerprint: await fingerprintJson({ version: 2 }),
  });
  expect(await loader.readCached('/fingerprint-change')).toEqual({ version: 2 });
});
it('releases the oldest runtime references while restoring documents from cloned persistence', async () => {
  const store = createMemoryOpenApiCacheStore();
  const read = store.getDocument.bind(store);
  store.getDocument = async <T>(key: string) => structuredClone(await read<T>(key));
  const loader = createOpenApiResourceLoader({
    store,
    fetchResource: async <T>(url: string) => ({ status: 'modified', data: { url } as T }),
  });
  const oldest = await loader.load('/lru-0', 'service');
  expect(await loader.readCached('/lru-0')).toBe(oldest);
  for (let i = 1; i < 100; i++) await loader.load(`/lru-${i}`, 'service');
  const restored = await loader.readCached('/lru-0');
  expect(restored).toEqual(oldest);
  expect(restored).not.toBe(oldest);
});
