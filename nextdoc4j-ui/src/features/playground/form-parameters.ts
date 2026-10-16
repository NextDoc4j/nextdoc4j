import { getSchemaType } from '../openapi/schema';
import { createExample, resolveSchema, schemaName } from '../openapi/utils';
import { resolveRequestSchema } from '../documentation/request-schema';
import type { ApiOperation, OpenApiDocument, Schema } from '../../types/openapi';
import type { DebugParameter } from './types';

/**
 * Detects single files and file arrays, including referenced form field schemas.
 * @param schema Form field schema.
 * @param schemas Local component schema registry.
 * @returns True for binary/byte strings or arrays of those strings.
 */
export const isFileSchema = (schema: Schema, schemas: Record<string, Schema>): boolean => {
  const resolved = resolveRequestSchema(schema, schemas);
  const item =
    getSchemaType(resolved) === 'array' ? resolveRequestSchema(resolved.items, schemas) : resolved;
  return (
    getSchemaType(item) === 'string' &&
    ['binary', 'byte'].includes(item.format?.toLowerCase() ?? '')
  );
};

/**
 * Collects inline and inherited form fields while stopping cyclic component references.
 * @param schema Form body schema or composition branch.
 * @param schemas Local component schema registry.
 * @param seen Decoded reference names already visited in this branch.
 * @returns Merged properties, with inline definitions overriding inherited fields.
 */
const mergeSchemaProperties = (
  schema: Schema | undefined,
  schemas: Record<string, Schema>,
  seen = new Set<string>(),
): Record<string, Schema> => {
  if (!schema) return {};
  const referenceName = schema.$ref ? schemaName(schema) : undefined;
  if (referenceName) {
    if (seen.has(referenceName)) return {};
    seen.add(referenceName);
  }
  const resolved = resolveSchema(schema, schemas) ?? schema;
  const inherited = resolved.allOf?.reduce<Record<string, Schema>>(
    (properties, item) => ({
      ...properties,
      ...mergeSchemaProperties(item, schemas, new Set(seen)),
    }),
    {},
  );
  return { ...inherited, ...resolved.properties };
};

const serializeParameterValue = (value: unknown) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value) ?? '';
  } catch {
    return String(value);
  }
};

/**
 * Derives editable form fields from an OpenAPI request-body schema.
 *
 * @param operation OpenAPI operation containing the selected request body.
 * @param document Active document used to resolve component schema references.
 * @param contentType Selected request media type.
 * @returns Non-binary request body properties prepared for form editing.
 */
export const createFormParameters = (
  operation: ApiOperation,
  document: OpenApiDocument,
  contentType: string,
): DebugParameter[] => {
  const schemas = document.components?.schemas ?? {};
  const media = operation.requestBody?.content?.[contentType];
  const schema = media?.schema;
  return Object.entries(mergeSchemaProperties(schema, schemas))
    .filter(([, property]) => !isFileSchema(property, schemas))
    .map(([name, property]) => ({
      contentType: media?.encoding?.[name]?.contentType || 'text/plain',
      enabled: true,
      name,
      value: serializeParameterValue(createExample(property, schemas)),
    }));
};

/**
 * Detects whether a selected media type should expose OpenAPI properties as form rows.
 *
 * @param contentType Selected request media type.
 * @returns True for form-data and URL encoded request bodies.
 */
export const isFormContentType = (contentType: string) =>
  ['application/x-www-form-urlencoded', 'multipart/form-data'].includes(
    contentType.toLowerCase().split(';')[0].trim(),
  );
