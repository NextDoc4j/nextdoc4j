import { describe, expect, it } from 'vitest';

import type {
  OpenApiDocument,
  Operation,
  SecurityRequirement,
  SecurityScheme,
} from '../../../src/types/openapi';
import {
  buildSecurityCredentials,
  getRegisteredSecuritySchemes,
  getEffectiveSecurityRequirements,
  getOperationSecurityRequirements,
  resolveSecuritySchemes,
  selectSatisfiedSecurityRequirement,
} from '../../../src/features/security/security';

const schemes: Record<string, SecurityScheme> = {
  basicAuth: { scheme: 'basic', type: 'http' },
  bearerAuth: { bearerFormat: 'JWT', scheme: 'bearer', type: 'http' },
  cookieKey: { in: 'cookie', name: 'session_id', type: 'apiKey' },
  queryKey: { in: 'query', name: 'access_key', type: 'apiKey' },
};

const document: OpenApiDocument = {
  components: { securitySchemes: schemes },
  info: { title: 'Security API', version: '1.0.0' },
  openapi: '3.0.3',
  paths: {},
  security: [{ bearerAuth: [] }],
};

describe('OpenAPI security utilities', () => {
  it('uses an explicit empty operation security list to opt out of global security', () => {
    const anonymousOperation: Operation = { security: [] };
    const inheritedOperation: Operation = {};

    expect(getEffectiveSecurityRequirements(anonymousOperation, document)).toEqual([]);
    expect(getEffectiveSecurityRequirements(inheritedOperation, document)).toEqual([
      { bearerAuth: [] },
    ]);
  });

  it('uses only operation-level requirements for legacy debug authentication', () => {
    expect(getOperationSecurityRequirements({})).toEqual([]);
    expect(getOperationSecurityRequirements({ security: [] })).toEqual([]);
    expect(getOperationSecurityRequirements({ security: [{ bearerAuth: [] }] })).toEqual([
      { bearerAuth: [] },
    ]);
    expect(
      getOperationSecurityRequirements({
        security: [{ bearerAuth: [] }],
        'x-nextdoc4j-security': { ignore: true },
      }),
    ).toEqual([]);
  });

  it('selects a complete requirement alternative and resolves its schemes', () => {
    const requirements: SecurityRequirement[] = [
      { basicAuth: [], queryKey: [] },
      { bearerAuth: [] },
    ];

    expect(selectSatisfiedSecurityRequirement(requirements, { bearerAuth: 'token' })).toEqual({
      bearerAuth: [],
    });
    expect(resolveSecuritySchemes(requirements, schemes).map((scheme) => scheme.key)).toEqual([
      'basicAuth',
      'queryKey',
      'bearerAuth',
    ]);
    expect(getRegisteredSecuritySchemes(schemes).map((scheme) => scheme.key)).toEqual([
      'basicAuth',
      'bearerAuth',
      'cookieKey',
      'queryKey',
    ]);
  });

  it('creates bearer, basic, query and cookie request credentials', () => {
    expect(
      buildSecurityCredentials({ basicAuth: [], cookieKey: [], queryKey: [] }, schemes, {
        basicAuth: 'echo:secret',
        cookieKey: 'session',
        queryKey: 'key-1',
      }),
    ).toEqual([
      { in: 'header', name: 'Authorization', value: 'Basic ZWNobzpzZWNyZXQ=' },
      { in: 'cookie', name: 'session_id', value: 'session' },
      { in: 'query', name: 'access_key', value: 'key-1' },
    ]);
  });
});
