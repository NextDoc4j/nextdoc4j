import { describe, expect, it } from 'vitest';

import { composedDocument, emptyDocument, orderedDocument } from '../../fixtures/openapi-documents';
import {
  createExample,
  getContentTypes,
  getDefaultContentType,
  getMethodAccentColor,
  getOperations,
  groupOperations,
  resolveSchema,
  schemaName,
} from '../../../src/features/openapi/utils';

describe('OpenAPI utilities', () => {
  it('orders operations and tag groups by x-order before natural names', () => {
    expect(getOperations(orderedDocument).map((item) => item.operationId)).toEqual([
      'saveConfig',
      'getUser',
      'health',
    ]);
    expect(groupOperations(orderedDocument).map(([tag]) => tag)).toEqual([
      '系统管理',
      '用户管理',
      'default',
    ]);
  });

  it('includes parameters and nested schema metadata in operation search text', () => {
    const userOperation = getOperations(orderedDocument).find(
      (operation) => operation.operationId === 'getUser',
    );

    expect(userOperation?.searchText).toContain('keyword');
    expect(userOperation?.searchText).toContain('Display name keyword');
  });

  it('decodes JSON Pointer tokens when resolving component schemas', () => {
    const reference = { $ref: '#/components/schemas/User~1Profile~0v1' };
    const schemas = orderedDocument.components?.schemas ?? {};

    expect(schemaName(reference)).toBe('User/Profile~v1');
    expect(resolveSchema(reference, schemas)).toBe(schemas['User/Profile~v1']);
  });

  it('stops recursive examples at circular component references', () => {
    const schemas = orderedDocument.components?.schemas ?? {};

    expect(createExample({ $ref: '#/components/schemas/TreeNode' }, schemas)).toEqual({
      children: ['TreeNode'],
    });
  });

  it('uses defaults and the first composition branch in generated examples', () => {
    const schemas = orderedDocument.components?.schemas ?? {};

    expect(
      createExample(
        {
          allOf: [
            {
              properties: { tenant: { default: 'default-tenant', type: 'string' } },
              type: 'object',
            },
            { properties: { enabled: { type: 'boolean' } }, type: 'object' },
          ],
        },
        schemas,
      ),
    ).toEqual({ enabled: true, tenant: 'default-tenant' });
    expect(
      createExample(
        {
          oneOf: [
            { properties: { userId: { type: 'string' } }, type: 'object' },
            { properties: { teamId: { type: 'string' } }, type: 'object' },
          ],
        },
        schemas,
      ),
    ).toEqual({ userId: '' });
  });

  it('accepts an empty document and indexes referenced response schema descriptions', () => {
    expect(getOperations(emptyDocument)).toEqual([]);

    const searchOperation = getOperations(composedDocument)[0];
    expect(searchOperation?.searchText).toContain('供检索的显示名称');
    expect(searchOperation?.searchText).toContain('TeamResult');
  });

  it('uses shared method colors and prefers JSON media types', () => {
    expect(getMethodAccentColor('get')).toBe('#67c23a');
    expect(getMethodAccentColor('head')).toBe('#909399');
    expect(getMethodAccentColor('options')).toBe('#0d9488');
    expect(getMethodAccentColor('unknown')).toBe('#409eff');
    expect(
      getContentTypes({
        'application/xml': {},
        'application/json': {},
      }),
    ).toEqual(['application/xml', 'application/json']);
    expect(
      getDefaultContentType({
        'application/xml': {},
        'application/json': {},
      }),
    ).toBe('application/json');
  });
});
