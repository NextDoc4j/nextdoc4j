import { afterEach, describe, expect, it, vi } from 'vitest';

import { fetchJsonResource } from '../../src/lib/http';

describe('JSON resource HTTP loading', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('forces network revalidation and sends the strongest available validator', async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 304 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      fetchJsonResource('/v3/api-docs', {
        etag: 'document-v1',
        lastModified: 'Wed, 09 Sep 2026 08:00:00 GMT',
      }),
    ).resolves.toEqual({ status: 'not-modified' });
    expect(fetchMock).toHaveBeenCalledWith(
      '/v3/api-docs',
      expect.objectContaining({
        cache: 'no-cache',
        headers: {
          Accept: 'application/json',
          'If-None-Match': 'document-v1',
        },
      }),
    );
  });

  it('returns JSON data and response validators for changed content', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify({ openapi: '3.0.3' }), {
            headers: {
              'Content-Type': 'application/json',
              ETag: 'document-v2',
              'Last-Modified': 'Wed, 09 Sep 2026 09:00:00 GMT',
            },
            status: 200,
          }),
      ),
    );

    await expect(fetchJsonResource('/v3/api-docs')).resolves.toEqual({
      data: { openapi: '3.0.3' },
      etag: 'document-v2',
      lastModified: 'Wed, 09 Sep 2026 09:00:00 GMT',
      status: 'modified',
    });
  });
});
