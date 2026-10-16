import { afterEach, describe, expect, it, vi } from 'vitest';
import { getApiBase, requestUrl } from '../../src/lib/http';
import { resolveServiceDocumentPrefix } from '../../src/features/aggregation/url';
import { buildDebugRequest } from '../../src/features/playground/request';
import { executePostResponsePipeline } from '../../src/features/playground/pre-post-engine';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('backend-hosted deployment URLs', () => {
  it('uses the same deployment prefix for auxiliary and main gateway requests', async () => {
    vi.stubEnv('PROD', true);
    vi.stubGlobal('location', { pathname: '/demo/doc.html' });
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}'));
    vi.stubGlobal('fetch', fetchMock);
    const routing = {
      apiBase: getApiBase(),
      origin: 'https://example.test',
      requestPrefix: '/demo/file',
    };
    await executePostResponsePipeline(
      {
        steps: [
          {
            id: 'auth',
            name: '认证',
            type: 'request',
            endpoint: '/auth',
            enabled: true,
            failurePolicy: 'abort',
          },
        ],
      },
      {
        ...routing,
        response: { status: 200, text: '{}' },
        onLog: vi.fn(),
      },
    );
    const request = buildDebugRequest({
      ...routing,
      bodyKind: 'none',
      method: 'get',
      path: '/auth',
    });
    expect(request.url.href).toBe('https://example.test/demo/file/auth');
    expect(fetchMock).toHaveBeenCalledWith(request.url.href, expect.anything());
  });

  it.each([
    ['/doc.html', ''],
    ['/index.html', ''],
    ['/', ''],
    ['/demo/doc.html', '/demo'],
    ['/demo/', '/demo'],
    ['/gateway/admin/index.html', '/gateway/admin'],
  ])('resolves documents and standalone debug requests from %s', (pathname, prefix) => {
    vi.stubEnv('PROD', true);
    vi.stubGlobal('location', { pathname });
    expect(getApiBase()).toBe(prefix);
    expect(requestUrl('/v3/api-docs')).toBe(`${prefix}/v3/api-docs`);
    expect(requestUrl('/v3/api-docs/swagger-config')).toBe(`${prefix}/v3/api-docs/swagger-config`);
    expect(requestUrl(`${prefix}/v3/api-docs/admin`)).toBe(`${prefix}/v3/api-docs/admin`);
    const request = buildDebugRequest({
      apiBase: getApiBase(),
      bodyKind: 'none',
      method: 'get',
      origin: 'https://example.test',
      path: '/users/list',
    });
    expect(request.url.href).toBe(`https://example.test${prefix}/users/list`);
  });

  it.each([
    ['/file/v3/api-docs', '/upload', '/demo/file/upload'],
    ['/demo/file/v3/api-docs', '/upload', '/demo/file/upload'],
    ['/user-service-sb3/v3/api-docs', '/api/admin/users', '/demo/user-service-sb3/api/admin/users'],
    [
      '/system-service-sb3/v3/api-docs',
      '/notification/list',
      '/demo/system-service-sb3/notification/list',
    ],
  ])('preserves the legacy gateway prefix from %s', (documentUrl, path, expected) => {
    vi.stubEnv('PROD', true);
    vi.stubGlobal('location', { pathname: '/demo/doc.html' });
    const request = buildDebugRequest({
      apiBase: getApiBase(),
      bodyKind: 'none',
      method: 'get',
      origin: 'https://example.test',
      path,
      requestPrefix: resolveServiceDocumentPrefix(documentUrl),
    });
    expect(request.url.href).toBe(`https://example.test${expected}`);
  });

  it('preserves absolute document and gateway URLs', () => {
    vi.stubEnv('PROD', true);
    vi.stubGlobal('location', { pathname: '/demo/doc.html' });
    expect(requestUrl('https://remote.test/file/v3/api-docs')).toBe(
      'https://remote.test/file/v3/api-docs',
    );
    const request = buildDebugRequest({
      apiBase: getApiBase(),
      bodyKind: 'none',
      method: 'get',
      origin: 'https://example.test',
      path: '/upload',
      requestPrefix: 'https://remote.test/file',
    });
    expect(request.url.href).toBe('https://remote.test/file/upload');
  });

  it('retains the development proxy even when the backend path starts with api', () => {
    vi.stubEnv('PROD', false);
    vi.stubEnv('VITE_GLOB_API_URL', '/api');
    vi.stubGlobal('location', { pathname: '/demo/doc.html' });
    expect(getApiBase()).toBe('/api');
    expect(requestUrl('/api/admin/v3/api-docs')).toBe('/api/api/admin/v3/api-docs');
  });
});
