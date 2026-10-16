import { describe, expect, it } from 'vitest';

import {
  createOpenApiSubset,
  selectExportOperations,
} from '../../../src/features/export/openapi-subset';
import {
  createDocumentationSources,
  getDocumentationOperationKey,
} from '../../../src/features/documentation/workspace';
import type { OpenApiDocument } from '../../../src/types/openapi';

const document: OpenApiDocument = {
  components: {
    schemas: {
      Audit: { properties: { createdAt: { type: 'string' } }, type: 'object' },
      CreateUser: {
        allOf: [
          { $ref: '#/components/schemas/Audit' },
          { properties: { profile: { $ref: '#/components/schemas/UserProfile' } }, type: 'object' },
        ],
      },
      ErrorResponse: { properties: { message: { type: 'string' } }, type: 'object' },
      Node: {
        properties: { child: { $ref: '#/components/schemas/Node' } },
        type: 'object',
      },
      SearchResult: {
        oneOf: [
          { $ref: '#/components/schemas/UserProfile' },
          { $ref: '#/components/schemas/ErrorResponse' },
        ],
      },
      Unused: { type: 'object' },
      UserProfile: {
        properties: { tree: { $ref: '#/components/schemas/Node' } },
        type: 'object',
      },
    },
    securitySchemes: {
      bearer: { scheme: 'bearer', type: 'http' },
      unused: { in: 'header', name: 'X-Unused', type: 'apiKey' },
    },
  },
  info: { title: 'Export API', version: '1.0.0' },
  openapi: '3.0.3',
  paths: {
    '/health': {
      get: { operationId: 'health', responses: { '204': { description: 'OK' } }, tags: ['系统'] },
    },
    '/users': {
      post: {
        operationId: 'createUser',
        requestBody: {
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateUser' } } },
        },
        responses: {
          '200': {
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/SearchResult' } },
            },
            description: 'OK',
          },
        },
        security: [{ bearer: [] }],
        tags: ['用户'],
      },
    },
  },
  tags: [{ name: '系统' }, { name: '用户' }],
};

describe('OpenAPI subset export', () => {
  const source = createDocumentationSources(document)[0]!;

  it('selects a tag or individual source-aware operation without crossing sources', () => {
    const userOperation = source.operations.find((operation) => operation.path === '/users')!;

    expect(selectExportOperations(source, { kind: 'tags', tags: ['用户'] })).toEqual([
      userOperation,
    ]);
    expect(
      selectExportOperations(source, {
        kind: 'operations',
        operationKeys: [getDocumentationOperationKey(userOperation)],
      }),
    ).toEqual([userOperation]);
  });

  it('exports selected paths with transitive schemas and referenced security schemes only', () => {
    const selected = selectExportOperations(source, { kind: 'tags', tags: ['用户'] });
    const subset = createOpenApiSubset(document, selected);

    expect(Object.keys(subset.paths ?? {})).toEqual(['/users']);
    expect(Object.keys(subset.components?.schemas ?? {}).sort()).toEqual([
      'Audit',
      'CreateUser',
      'ErrorResponse',
      'Node',
      'SearchResult',
      'UserProfile',
    ]);
    expect(Object.keys(subset.components?.securitySchemes ?? {})).toEqual(['bearer']);
    expect(subset.tags?.map((tag) => tag.name)).toEqual(['用户']);
    expect(document.components?.schemas?.Unused).toEqual({ type: 'object' });
    expect(document.paths?.['/health']).toBeDefined();
  });
});

it('retains nested 3.1 schemas, path parameters and component response dependencies', () => {
  const source: OpenApiDocument = {
    openapi: '3.1.0',
    paths: {
      '/items': {
        parameters: [
          { in: 'query', name: 'filter', schema: { $ref: '#/components/schemas/Filter' } },
        ],
        get: { responses: { '200': { $ref: '#/components/responses/Items' } } },
      },
    },
    components: {
      responses: {
        Items: {
          content: {
            'application/json': {
              schema: {
                type: 'array',
                contains: { $ref: '#/components/schemas/Item' },
                unevaluatedItems: { $ref: '#/components/schemas/Extra' },
              },
            },
          },
        },
      },
      schemas: {
        Item: { properties: { child: { $ref: '#/components/schemas/Item' } } },
        Extra: { unevaluatedItems: false },
        Filter: { type: 'string' },
        Unused: { type: 'string' },
      },
    },
  };
  const before = JSON.stringify(source);
  const result = createOpenApiSubset(source, createDocumentationSources(source)[0].operations);
  expect(Object.keys(result.components?.schemas ?? {}).sort()).toEqual(['Extra', 'Filter', 'Item']);
  expect(result.paths?.['/items'].parameters).toEqual(source.paths?.['/items'].parameters);
  expect(JSON.stringify(source)).toBe(before);
});

it('retains local dynamic references without treating example or external refs as dependencies', () => {
  const source: OpenApiDocument = {
    openapi: '3.1.0',
    paths: {
      '/dynamic': {
        get: {
          responses: {
            '200': {
              content: {
                'application/json': {
                  schema: {
                    $dynamicRef: '#/components/schemas/A~1B',
                    example: { $ref: '#/components/schemas/Unused' },
                    properties: { external: { $ref: 'https://example.test/schemas/Unused' } },
                  },
                },
              },
            },
          },
        },
      },
    },
    components: { schemas: { 'A/B': { type: 'string' }, Unused: { type: 'string' } } },
  };
  const subset = createOpenApiSubset(source, createDocumentationSources(source)[0].operations);
  expect(Object.keys(subset.components?.schemas ?? {})).toEqual(['A/B']);
});
