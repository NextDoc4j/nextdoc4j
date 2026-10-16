import { describe, expect, it } from 'vitest';
import { getSchemaTypes } from '../../../src/features/openapi/schema';
import { createExample } from '../../../src/features/openapi/utils';
import { getRequestTypeLabel } from '../../../src/features/documentation/request-schema';
import {
  createJsonExample,
  resolveJsonExampleSchema,
} from '../../../src/features/documentation/json-example-model';
import { createSchemaMock } from '../../../src/features/export/mock';
import { describeSchemaLimits } from '../../../src/features/export/schema-diagnostics';
import type { Schema } from '../../../src/types/openapi';

describe('OpenAPI 3.1 display and example compatibility', () => {
  it('retains standard union types and produces a non-null example without mutating the document', () => {
    const schema: Schema = { type: ['integer', 'null'] };
    expect(getSchemaTypes(schema)).toEqual(['integer', 'null']);
    expect(getRequestTypeLabel(schema, {})).toBe('integer | null');
    expect(createExample(schema, {})).toBe(0);
    expect(
      createJsonExample(schema, 'body', { schemas: {}, variants: new Map(), direction: 'request' }),
    ).toBe(0);
    expect(schema.type).toEqual(['integer', 'null']);
    expect(createSchemaMock({ type: ['object', 'null'], example: null }, {})).toBeNull();
  });

  it('keeps null-only schemas null even when object keywords are present', () => {
    const schema: Schema = { type: ['null'], properties: { ignored: { type: 'string' } } };
    expect(createExample(schema, {})).toBeNull();
    expect(
      createJsonExample(schema, 'body', { schemas: {}, variants: new Map(), direction: 'model' }),
    ).toBeNull();
    expect(createSchemaMock(schema, {})).toBeNull();
  });

  it('uses discriminator mappings ahead of otherwise identical candidate shapes', () => {
    const schemas: Record<string, Schema> = {
      A: { type: 'object', properties: { kind: { type: 'string' }, a: { type: 'string' } } },
      B: { type: 'object', properties: { kind: { type: 'string' }, b: { type: 'integer' } } },
    };
    const schema: Schema = {
      discriminator: { propertyName: 'kind', mapping: { second: '#/components/schemas/B' } },
      oneOf: [{ $ref: '#/components/schemas/A' }, { $ref: '#/components/schemas/B' }],
    };
    const resolved = resolveJsonExampleSchema(schema, { kind: 'second' }, 'body', {
      schemas,
      variants: new Map(),
      direction: 'request',
    });
    expect(resolved.properties).toHaveProperty('b');
    expect(resolved.properties).not.toHaveProperty('a');
  });

  it('explains cyclic export branches without writing warnings into business JSON', () => {
    const schemas: Record<string, Schema> = {
      Node: { type: 'object', properties: { parent: { $ref: '#/components/schemas/Node' } } },
    };
    expect(
      describeSchemaLimits({ $ref: '#/components/schemas/Node' }, schemas).join(' '),
    ).toContain('循环引用 Node');
  });
});
