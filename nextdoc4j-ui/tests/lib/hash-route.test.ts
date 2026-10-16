import { describe, expect, it } from 'vitest';
import {
  createHashRoute,
  getOperationRoute,
  getDocumentGroupRouteKeys,
  parseHashRoute,
  parseValidHashRoute,
} from '../../src/lib/hash-route';

describe('Springdoc page routes', () => {
  it('normalizes uppercase methods, escaped path casing and trailing slashes', () => {
    const route = parseValidHashRoute('#/docs/paths/%2fusers/GET/debug/');
    expect(route).toMatchObject({ operationPath: '/users', operationMethod: 'get', debug: true });
    expect(createHashRoute(route!)).toBe('#/docs/paths/%2Fusers/get/debug');
  });
  it('distinguishes malformed routes from a valid home without restoring query links', () => {
    for (const hash of [
      '#/unknown',
      '#/docs/operations/',
      '#/docs/paths/%2Fx/INVALID',
      '#/docs/operations/x/extra',
      '#/settings/unknown',
      '#/docs?operation=x',
      '#/%ZZ',
    ]) {
      expect(parseValidHashRoute(hash)).toBeUndefined();
    }
    expect(parseValidHashRoute('#/home/')).toEqual({ view: 'docs' });
  });
  it('uses decoded group query values without double decoding or opaque collision suffixes', () => {
    const urls = [
      '/v3/api-docs?group=admin',
      '/v3/api-docs?group=app',
      '/v3/api-docs?group=a%252Fb',
    ];
    const keys = getDocumentGroupRouteKeys(urls.map((url) => ({ url })));
    expect(urls.map((url) => keys.get(url))).toEqual(['admin', 'app', 'a%2Fb']);
  });

  it('roundtrips a service-scoped operation without serializing panel selections', () => {
    const hash = createHashRoute({
      view: 'docs',
      sourceGroupId: 'system',
      serviceId: 'gateway-a',
      operationId: 'tree_1',
      debug: true,
      debugTab: 'headers',
      debugBody: 'json',
    });
    expect(hash).toBe('#/services/gateway-a/docs/system/operations/tree_1/debug');
    expect(parseHashRoute(hash)).toEqual({
      view: 'docs',
      serviceId: 'gateway-a',
      sourceGroupId: 'system',
      operationId: 'tree_1',
      debug: true,
    });
  });
  it('keeps tag, schema and settings resources unambiguous', () => {
    expect(createHashRoute({ view: 'docs', sourceGroupId: 'system', group: '部门/API' })).toBe(
      '#/docs/system/tags/%E9%83%A8%E9%97%A8%2FAPI',
    );
    expect(parseHashRoute('#/docs/schemas/Order%2FDetail').modelName).toBe('Order/Detail');
    expect(createHashRoute({ view: 'export' })).toBe('#/settings/export');
    expect(parseHashRoute('#/settings/auth').settingsSection).toBe('auth');
    expect(parseHashRoute('#/%ZZ')).toEqual({ view: 'docs' });
  });
  it('uses exact HTTP method and path for missing or duplicate operation IDs', () => {
    const document = {
      paths: {
        '/a': { get: { operationId: 'duplicate' } },
        '/b': { get: { operationId: 'duplicate' } },
      },
    };
    const address = getOperationRoute(
      { method: 'get', path: '/a', group: 'default', operationId: 'duplicate' },
      document,
    );
    expect(address).toEqual({ operationPath: '/a', operationMethod: 'get' });
    expect(parseHashRoute(createHashRoute({ view: 'docs', ...address }))).toEqual({
      view: 'docs',
      sourceGroupId: 'all',
      ...address,
    });
  });
  it('derives group identities from standalone and custom gateway URLs, not labels', () => {
    expect(
      getDocumentGroupRouteKeys(
        [{ url: '/v3/api-docs/system?x=1' }],
        '/v3/api-docs/swagger-config',
      ).get('/v3/api-docs/system?x=1'),
    ).toBe('system');
    expect(
      getDocumentGroupRouteKeys(
        [{ url: 'https://host/gateway/custom/docs/auth/' }],
        'https://host/gateway/custom/docs',
      )
        .values()
        .next().value,
    ).toBe('auth');
    const keys = getDocumentGroupRouteKeys([
      { url: '/v3/api-docs/operations' },
      { url: '/a/system' },
      { url: '/b/system' },
    ]);
    expect(keys.get('/v3/api-docs/operations')).toMatch(/^operations~/);
    expect(keys.get('/a/system')).not.toBe(keys.get('/b/system'));
  });
});
