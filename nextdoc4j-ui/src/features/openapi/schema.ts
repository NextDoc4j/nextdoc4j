import type { Schema } from '../../types/openapi';

/** Reads standard OpenAPI 3.1 type arrays and the existing SpringDoc types extension.
 * @param schema Original schema; omitted for unconstrained values.
 * @returns Declared types without mutating the source document.
 */
export const getSchemaTypes = (schema?: Schema): string[] => {
  if (Array.isArray(schema?.type)) return schema.type;
  if (schema?.types?.length) return schema.types;
  return schema?.type ? [schema.type] : [];
};

/** Selects a representative non-null type for structure rendering and generated examples.
 * @param schema Original schema.
 * @returns First non-null declared type, null for null-only schemas, or undefined.
 */
export const getSchemaType = (schema?: Schema): string | undefined => {
  const types = getSchemaTypes(schema);
  return types.find((type) => type !== 'null') ?? types[0];
};

export interface SchemaEnumItem {
  description?: string;
  value: number | string;
}

/**
 * Distinguishes real schema defaults from empty values emitted by document generators.
 *
 * @param value Declared schema default.
 * @returns False for null, undefined, blank strings and the generator placeholder; keeps zero and false.
 */
export const hasSchemaDefaultValue = (value: unknown): boolean =>
  value !== undefined &&
  value !== null &&
  (typeof value !== 'string' || (value.trim() !== '' && value.trim() !== '##default'));

// Parsed schema objects are immutable; weak caching avoids repeatedly cloning nested definitions.
const normalizedSchemas = new WeakMap<Schema, Schema>();

/**
 * Removes empty defaults from schema definitions without touching example or business data objects.
 *
 * @param schema Original schema, including nested properties and composition branches.
 * @returns A schema copy whose actual child schemas use the same default-value rule.
 */
export const normalizeSchemaDefaults = (schema: Schema): Schema => {
  if (!schema || typeof schema !== 'object') return schema;
  const cached = normalizedSchemas.get(schema);
  if (cached) return cached;
  const normalized = { ...schema };
  normalizedSchemas.set(schema, normalized);
  normalizedSchemas.set(normalized, normalized);
  if (Array.isArray(schema.type)) {
    normalized.types = [...schema.type];
    normalized.type = getSchemaType(schema);
    if (schema.type.includes('null')) normalized.nullable = true;
  }
  if (!hasSchemaDefaultValue(schema.default)) delete normalized.default;
  if (schema.properties) {
    normalized.properties = Object.fromEntries(
      Object.entries(schema.properties).map(([key, value]) => [
        key,
        normalizeSchemaDefaults(value),
      ]),
    );
  }
  for (const key of ['allOf', 'oneOf', 'anyOf', 'prefixItems'] as const) {
    const branches = schema[key];
    if (branches) normalized[key] = branches.map(normalizeSchemaDefaults);
  }
  for (const key of ['items', 'contains', 'additionalProperties', 'unevaluatedItems'] as const) {
    const child = schema[key];
    if (child && typeof child === 'object') normalized[key] = normalizeSchemaDefaults(child);
  }
  return normalized;
};

/**
 * Checks if a schema represents an integer type by format (int32, int64, integer, int) or type.
 * When format is integer-like, it takes precedence over a declared string type.
 */
export const isIntegerSchema = (schema?: Schema): boolean => {
  if (!schema) return false;
  const format = schema.format?.toLowerCase();
  if (format === 'int32' || format === 'int64' || format === 'integer' || format === 'int') {
    return true;
  }
  const types = getSchemaTypes(schema);
  return types.some((t) => t.toLowerCase() === 'integer');
};

/**
 * Returns standard OpenAPI enum values or the richer Nextdoc4j enum extension.
 * When the schema specifies an integer format, numeric string enum values are coerced to numbers.
 *
 * @param schema Schema whose enum metadata should be displayed.
 * @returns Normalized enum values with optional descriptions.
 */
export const getSchemaEnumItems = (schema?: Schema): SchemaEnumItem[] => {
  const extendedItems = schema?.['x-nextdoc4j-enum']?.items;
  const isInt = isIntegerSchema(schema);

  const coerce = (val: unknown): number | string => {
    if (isInt && val !== undefined && val !== null) {
      if (typeof val === 'number') return Math.trunc(val);
      if (typeof val === 'string' && /^-?\d+$/.test(val.trim())) {
        const num = parseInt(val.trim(), 10);
        if (!Number.isNaN(num)) return num;
      }
    }
    return typeof val === 'number' || typeof val === 'string' ? val : String(val ?? '');
  };

  if (extendedItems?.length) {
    return extendedItems.map((item) => ({
      ...item,
      value: coerce(item.value),
    }));
  }
  return (schema?.enum ?? []).map((value) => ({ value: coerce(value) }));
};

/**
 * Formats a schema default or example for a compact metadata label.
 *
 * @param value OpenAPI default or example value.
 * @returns JSON text when serializable, or a safe string fallback.
 */
export const formatSchemaValue = (value: unknown) => {
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
};
