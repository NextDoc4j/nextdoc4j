import { describe, expect, it } from 'vitest';

import {
  applyPathParameters,
  buildDebugRequest,
  createBrowserCookies,
  createCurlCommand,
  resolveBodyKind,
} from '../../../src/features/playground/request';

describe('playground request utilities', () => {
  it('builds a JSON request with encoded path and query parameters', () => {
    const request = buildDebugRequest({
      apiBase: '/api',
      authToken: 'token-value',
      bodyKind: 'json',
      bodyText: '{"name":"Echo"}',
      contentType: 'application/json',
      globalHeaders: [{ name: 'X-Tenant', value: 'demo' }],
      method: 'post',
      origin: 'https://ui.example.test',
      path: '/users/{id}',
      pathParams: [{ enabled: true, name: 'id', value: 'echo/a' }],
      queryParams: [{ enabled: true, name: 'verbose', value: 'true' }],
    });

    expect(request.url.toString()).toBe('https://ui.example.test/api/users/echo%2Fa?verbose=true');
    expect(request.headers.get('Authorization')).toBe('Bearer token-value');
    expect(request.headers.get('X-Tenant')).toBe('demo');
    expect(request.headers.get('Content-Type')).toBe('application/json');
    expect(request.bodyPreview).toBe('{"name":"Echo"}');
  });

  it('uses browser-managed multipart boundaries and URL encoded fields', () => {
    const multipart = buildDebugRequest({
      apiBase: '',
      bodyKind: 'form-data',
      contentType: 'multipart/form-data',
      formFields: [{ enabled: true, name: 'name', value: 'Echo' }],
      headers: [{ enabled: true, name: 'Content-Type', value: 'multipart/form-data' }],
      method: 'post',
      origin: 'https://ui.example.test',
      path: '/upload',
    });
    const urlEncoded = buildDebugRequest({
      apiBase: '',
      bodyKind: 'urlencoded',
      method: 'post',
      origin: 'https://ui.example.test',
      path: '/token',
      urlEncodedFields: [{ enabled: true, name: 'grant_type', value: 'client_credentials' }],
    });

    expect(multipart.headers.has('Content-Type')).toBe(false);
    expect(multipart.bodyPreview).toBe('name=Echo');
    expect(urlEncoded.headers.get('Content-Type')).toBe('application/x-www-form-urlencoded');
    expect(urlEncoded.bodyPreview).toBe('grant_type=client_credentials');
  });

  it('maps content types and cURL consistently', () => {
    expect(resolveBodyKind('application/problem+json')).toBe('json');
    expect(resolveBodyKind('text/xml')).toBe('xml');
    expect(resolveBodyKind('multipart/form-data')).toBe('form-data');
    expect(applyPathParameters('/users/{id}', [{ enabled: true, name: 'id', value: 'a b' }])).toBe(
      '/users/a%20b',
    );

    const request = buildDebugRequest({
      apiBase: '',
      bodyKind: 'raw',
      bodyText: 'hello',
      contentType: 'text/plain',
      method: 'post',
      origin: 'https://ui.example.test',
      path: '/echo',
    });
    expect(createCurlCommand(request)).toContain("--data 'hello'");
    expect(createCurlCommand(request)).not.toContain('\n+');
    expect(createBrowserCookies([{ enabled: true, name: 'session', value: 'a b' }])).toEqual([
      'session=a%20b; Path=/; SameSite=Lax',
    ]);
  });

  it('keeps local parameters ahead of OpenAPI security credentials', () => {
    const request = buildDebugRequest({
      apiBase: '',
      bodyKind: 'none',
      cookies: [{ enabled: true, name: 'session', value: 'local-cookie' }],
      headers: [{ enabled: true, name: 'Authorization', value: 'Local token' }],
      method: 'get',
      origin: 'https://ui.example.test',
      path: '/secure',
      queryParams: [{ enabled: true, name: 'api_key', value: 'local-key' }],
      securityCredentials: [
        { in: 'header', name: 'Authorization', value: 'Bearer security-token' },
        { in: 'query', name: 'api_key', value: 'security-key' },
        { in: 'cookie', name: 'session', value: 'security-cookie' },
      ],
    });

    expect(request.headers.get('Authorization')).toBe('Local token');
    expect(request.url.searchParams.get('api_key')).toBe('local-key');
    expect(request.cookies).toEqual([{ enabled: true, name: 'session', value: 'local-cookie' }]);
  });

  it('merges global query parameters only when the interface has no local value', () => {
    const request = buildDebugRequest({
      apiBase: '',
      bodyKind: 'none',
      globalQueryParams: [
        { name: 'locale', value: 'zh-CN' },
        { name: 'page', value: '1' },
      ],
      method: 'get',
      origin: 'https://ui.example.test',
      path: '/users',
      queryParams: [{ enabled: true, name: 'page', value: '2' }],
    });

    expect(request.url.searchParams.get('page')).toBe('2');
    expect(request.url.searchParams.get('locale')).toBe('zh-CN');
  });

  it('does not inject globally disabled header or query rows', () => {
    const request = buildDebugRequest({
      apiBase: '',
      bodyKind: 'none',
      globalHeaders: [
        { enabled: false, name: 'X-Disabled', value: 'hidden' },
        { enabled: true, name: 'X-Enabled', value: 'shown' },
      ],
      globalQueryParams: [
        { enabled: false, name: 'disabled', value: 'hidden' },
        { enabled: true, name: 'enabled', value: 'shown' },
      ],
      method: 'get',
      origin: 'https://ui.example.test',
      path: '/users',
    });

    expect(request.headers.get('X-Disabled')).toBeNull();
    expect(request.headers.get('X-Enabled')).toBe('shown');
    expect(request.url.searchParams.get('disabled')).toBeNull();
    expect(request.url.searchParams.get('enabled')).toBe('shown');
  });

  it('lets a later service-scope global header override a default', () => {
    const request = buildDebugRequest({
      apiBase: '',
      bodyKind: 'none',
      globalHeaders: [
        { enabled: true, name: 'X-Tenant', value: 'global-tenant' },
        { enabled: true, name: 'X-Tenant', value: 'service-tenant' },
      ],
      method: 'get',
      origin: 'https://ui.example.test',
      path: '/users',
    });

    expect(request.headers.get('X-Tenant')).toBe('service-tenant');
  });

  it('preserves a disabled path placeholder for validation before sending', () => {
    expect(
      applyPathParameters('/users/{id}', [{ enabled: false, name: 'id', value: 'echo/a' }]),
    ).toBe('/users/{id}');
  });
});
