import { describe, expect, it } from 'vitest';

import {
  resolveServiceDocumentPrefix,
  resolveServiceGroupDocumentUrl,
  resolveServiceSwaggerConfigUrl,
} from '../../../src/features/aggregation/url';

describe('aggregation URL utilities', () => {
  it('derives the gateway service prefix from the document URL', () => {
    expect(resolveServiceDocumentPrefix('/gateway/users/v3/api-docs')).toBe('/gateway/users');
    expect(resolveServiceDocumentPrefix('/gateway/users/v3/api-docs/', '/v3/api-docs/')).toBe(
      '/gateway/users',
    );
    expect(resolveServiceDocumentPrefix('/gateway/users/openapi', '/v3/api-docs')).toBe(
      '/gateway/users/openapi',
    );
  });

  it('resolves absolute, relative and gateway-rooted group document URLs', () => {
    expect(resolveServiceGroupDocumentUrl('/gateway/users/v3/api-docs', '/v3/api-docs/admin')).toBe(
      '/gateway/users/v3/api-docs/admin',
    );
    expect(resolveServiceGroupDocumentUrl('/gateway/users/v3/api-docs', 'admin')).toBe(
      '/gateway/users/v3/api-docs/admin',
    );
    expect(
      resolveServiceGroupDocumentUrl(
        '/gateway/users/v3/api-docs',
        'https://docs.example.test/v3/api-docs/admin',
      ),
    ).toBe('https://docs.example.test/v3/api-docs/admin');
  });

  it('resolves Swagger Config adjacent to the OpenAPI document URL', () => {
    expect(resolveServiceSwaggerConfigUrl('/gateway/users/v3/api-docs/')).toBe(
      '/gateway/users/v3/api-docs/swagger-config',
    );
  });
});
