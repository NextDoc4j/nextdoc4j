import { describe, expect, it, vi } from 'vitest';

import { createDocumentCache } from '../../../src/features/aggregation/document-cache';

describe('aggregation document cache', () => {
  it('deduplicates concurrent requests and serves the resolved value afterward', async () => {
    const cache = createDocumentCache<{ version: number }>();
    let resolveLoad: ((value: { version: number }) => void) | undefined;
    const loader = vi.fn(
      () =>
        new Promise<{ version: number }>((resolve) => {
          resolveLoad = resolve;
        }),
    );

    const first = cache.get('/users/v3/api-docs', loader);
    const second = cache.get('/users/v3/api-docs', loader);
    expect(loader).toHaveBeenCalledTimes(1);

    resolveLoad?.({ version: 1 });
    await expect(Promise.all([first, second])).resolves.toEqual([{ version: 1 }, { version: 1 }]);
    await expect(cache.get('/users/v3/api-docs', loader)).resolves.toEqual({ version: 1 });
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('does not cache a failed request and supports explicit invalidation', async () => {
    const cache = createDocumentCache<number>();
    const failedLoader = vi.fn(async () => {
      throw new Error('offline');
    });
    await expect(cache.get('/users/v3/api-docs', failedLoader)).rejects.toThrow('offline');
    await expect(cache.get('/users/v3/api-docs', async () => 1)).resolves.toBe(1);
    expect(cache.has('/users/v3/api-docs')).toBe(true);

    cache.invalidate('/users/v3/api-docs');
    expect(cache.has('/users/v3/api-docs')).toBe(false);
    await expect(cache.get('/users/v3/api-docs', async () => 2)).resolves.toBe(2);

    cache.clear();
    expect(cache.has('/users/v3/api-docs')).toBe(false);
  });

  it('does not restore stale values when an in-flight request is invalidated', async () => {
    const cache = createDocumentCache<number>();
    let resolveLoad: ((value: number) => void) | undefined;
    const staleRequest = cache.get(
      '/users/v3/api-docs',
      () =>
        new Promise<number>((resolve) => {
          resolveLoad = resolve;
        }),
    );

    cache.invalidate('/users/v3/api-docs');
    await expect(cache.get('/users/v3/api-docs', async () => 2)).resolves.toBe(2);
    resolveLoad?.(1);
    await expect(staleRequest).resolves.toBe(1);
    await expect(cache.get('/users/v3/api-docs', async () => 3)).resolves.toBe(2);
  });
});

describe('bounded document retention', () => {
  it('evicts the least recently read value and leaves active objects usable', async () => {
    const cache = createDocumentCache<{ name: string }>(2);
    const first = await cache.get('first', async () => ({ name: 'first' }));
    await cache.get('second', async () => ({ name: 'second' }));
    await cache.get('first', async () => ({ name: 'unexpected' }));
    await cache.get('third', async () => ({ name: 'third' }));
    expect(cache.has('second')).toBe(false);
    expect(cache.has('first')).toBe(true);
    expect(first.name).toBe('first');
  });

  it('does not let a cleared in-flight load overwrite a newer value', async () => {
    const cache = createDocumentCache<number>(1);
    let finish!: (value: number) => void;
    const old = cache.get(
      'same',
      () =>
        new Promise<number>((resolve) => {
          finish = resolve;
        }),
    );
    cache.clear();
    await cache.get('same', async () => 2);
    finish(1);
    await old;
    expect(await cache.get('same', async () => 3)).toBe(2);
  });
});
