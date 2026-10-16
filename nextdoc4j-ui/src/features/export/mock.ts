import { getSchemaType, getSchemaTypes, hasSchemaDefaultValue } from '../openapi/schema';
import { resolveSchema, schemaName } from '../openapi/utils';
import type { Schema } from '../../types/openapi';

/**
 * Infers a real enum member from OpenAPI extensions, patterns or field descriptions.
 *
 * @param schema Resolved string schema that may describe a Java enum.
 * @param fieldName Property name used for common enum conventions.
 * @returns An inferred enum value, or undefined when the available metadata is insufficient.
 */
const getInferredEnumValue = (schema: Schema, fieldName: string) => {
  const schemaValue = schema.enum?.find(
    (value) => value !== null && value !== undefined && String(value).trim(),
  );
  if (schemaValue !== undefined) return String(schemaValue);

  const extensionValue = schema['x-nextdoc4j-enum']?.items?.find(
    (item) => item.value !== null && item.value !== undefined && String(item.value).trim(),
  )?.value;
  if (extensionValue !== null && extensionValue !== undefined && String(extensionValue).trim()) {
    return String(extensionValue);
  }

  const patternValues = schema.pattern?.match(/[A-Z][A-Z0-9_]{1,}/gu) ?? [];
  if (patternValues.length) return patternValues[0];

  const description = schema.description || '';
  if (/(?:枚举|可选值|可选项|取值|允许值|allowed values?)/iu.test(description)) {
    const labelledValue =
      /(?:枚举(?:值)?|可选(?:值|项)?|取值|允许值)[^A-Za-z0-9_-]*([A-Za-z][A-Za-z0-9_-]*)/iu.exec(
        description,
      )?.[1];
    if (labelledValue) return labelledValue;
    const englishValue = /allowed values?\s*(?::|are)?\s*([A-Za-z][A-Za-z0-9_-]*)/iu.exec(
      description,
    )?.[1];
    if (englishValue) return englishValue;
    const descriptionValues = description.match(/[A-Z][A-Z0-9_]{1,}/gu) ?? [];
    if (descriptionValues.length) return descriptionValues[0];
  }

  const normalizedName = fieldName.toLowerCase();
  if (normalizedName === 'status' || normalizedName.endsWith('status')) return 'ENABLED';
  if (normalizedName === 'priority' || normalizedName.endsWith('priority')) return 'HIGH';
  return undefined;
};

/**
 * Creates a meaningful string from schema format and field-name conventions.
 *
 * @param schema Resolved string schema.
 * @param fieldName Optional property or parameter name providing semantic context.
 * @returns Non-empty representative string value.
 */
const createStringMock = (schema: Schema, fieldName = '') => {
  const normalizedName = fieldName.toLowerCase();
  const enumValue = getInferredEnumValue(schema, fieldName);
  if (enumValue) return enumValue;
  if (schema.format === 'date-time') return '2026-01-01T12:00:00Z';
  if (schema.format === 'date') return '2026-01-01';
  if (schema.format === 'uuid') return '550e8400-e29b-41d4-a716-446655440000';
  if (schema.format === 'email') return 'user@example.com';
  if (schema.format === 'uri' || schema.format === 'url') return 'https://example.com/resource';
  if (schema.format === 'binary') return 'example-file.bin';
  if (normalizedName.includes('token')) return 'mock-access-token';
  if (normalizedName === 'code' || normalizedName.endsWith('code')) return '0';
  if (/^(count|limit|offset|page|pageindex|pagenum|pagesize|size)$/u.test(normalizedName))
    return '1';
  if (/^(active|enabled|success)$/u.test(normalizedName)) return 'true';
  if (normalizedName.includes('message') || normalizedName === 'msg') return '操作成功';
  if (normalizedName.includes('phone') || normalizedName.includes('mobile')) return '13800138000';
  if (normalizedName.includes('name') || normalizedName.includes('title')) return '示例名称';
  if (normalizedName === 'id' || normalizedName.endsWith('id')) return 'example-id';
  if (normalizedName.includes('password')) return 'Example@123';
  return '示例值';
};

/**
 * Selects the schema shape used to generate a representative value.
 *
 * @param schema Inline or referenced schema containing optional composition branches.
 * @param schemas Component schema registry.
 * @returns Resolved schema with oneOf or anyOf reduced to its first candidate.
 */
const selectMockSchema = (schema: Schema, schemas: Record<string, Schema>): Schema => {
  const resolved = resolveSchema(schema, schemas) ?? schema;
  const alternative = resolved.oneOf?.[0] ?? resolved.anyOf?.[0];
  return alternative
    ? { ...resolved, ...(resolveSchema(alternative, schemas) ?? alternative) }
    : resolved;
};

/**
 * Collects object properties contributed by nested allOf fragments.
 *
 * @param schema Inline, referenced or composed object schema to inspect.
 * @param schemas Component schema registry.
 * @param seenReferences Component references already traversed to stop circular composition.
 * @returns Merged property definitions in their original declaration order.
 */
const collectAllOfProperties = (
  schema: Schema,
  schemas: Record<string, Schema>,
  seenReferences: Set<string>,
): Record<string, Schema> => {
  const referenceName = schema.$ref ? schemaName(schema) : '';
  if (referenceName) {
    if (seenReferences.has(referenceName)) return {};
    const nextReferences = new Set(seenReferences);
    nextReferences.add(referenceName);
    return collectAllOfProperties(schemas[referenceName] ?? schema, schemas, nextReferences);
  }
  const properties = { ...(schema.properties ?? {}) };
  schema.allOf?.forEach((fragment) => {
    Object.assign(properties, collectAllOfProperties(fragment, schemas, seenReferences));
  });
  return properties;
};

/**
 * Produces a non-empty mock value while retaining valid explicit example content.
 *
 * @param schema Schema corresponding to the value being completed.
 * @param schemas Component schema registry.
 * @param value Optional explicit example value that may contain empty placeholders.
 * @param fieldName Optional field or parameter name used for semantic string generation.
 * @param seenReferences Component references already traversed to stop circular recursion.
 * @returns Schema-compatible value without null or empty-string placeholders.
 */
export const createSchemaMock = (
  schema: Schema | undefined,
  schemas: Record<string, Schema>,
  value?: unknown,
  fieldName = '',
  seenReferences = new Set<string>(),
): unknown => {
  if (!schema) {
    if (Array.isArray(value)) {
      return (value.length ? value : [undefined]).map((item) =>
        createSchemaMock(undefined, schemas, item, fieldName, seenReferences),
      );
    }
    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value).map(([name, item]) => [
          name,
          createSchemaMock(undefined, schemas, item, name, seenReferences),
        ]),
      );
    }
    if (value !== null && value !== undefined && value !== '') return value;
    return fieldName.toLowerCase() === 'data'
      ? { value: '示例数据' }
      : createStringMock({}, fieldName);
  }

  const referenceName = schema.$ref ? schemaName(schema) : '';
  if (referenceName) {
    if (seenReferences.has(referenceName)) return { reference: referenceName };
    const nextReferences = new Set(seenReferences);
    nextReferences.add(referenceName);
    const referencedSchema = schemas[referenceName];
    if (!referencedSchema) {
      return createSchemaMock(
        undefined,
        schemas,
        value,
        fieldName || referenceName,
        nextReferences,
      );
    }
    const mergedSchema = { ...referencedSchema, ...schema };
    delete mergedSchema.$ref;
    return createSchemaMock(
      mergedSchema,
      schemas,
      value,
      fieldName || referenceName,
      nextReferences,
    );
  }

  const selected = selectMockSchema(schema, schemas);
  const preferredValue =
    value !== undefined
      ? value
      : selected.example !== undefined
        ? selected.example
        : hasSchemaDefaultValue(selected.default)
          ? selected.default
          : selected.const !== undefined
            ? selected.const
            : selected.examples?.[0] !== undefined
              ? selected.examples[0]
              : selected.enum?.[0];

  if (selected.allOf?.length) {
    const explicitObject =
      preferredValue && typeof preferredValue === 'object' && !Array.isArray(preferredValue)
        ? (preferredValue as Record<string, unknown>)
        : {};
    const properties = collectAllOfProperties(selected, schemas, seenReferences);
    if (Object.keys(properties).length || Object.keys(explicitObject).length) {
      return createObjectMock(
        { ...selected, properties, type: 'object' },
        schemas,
        explicitObject,
        seenReferences,
      );
    }
    return createSchemaMock(selected.allOf[0], schemas, preferredValue, fieldName, seenReferences);
  }

  const type =
    getSchemaType(selected) ||
    (selected.properties ? 'object' : undefined) ||
    (selected.items || selected.prefixItems?.length ? 'array' : undefined) ||
    (preferredValue !== null && preferredValue !== undefined ? typeof preferredValue : undefined);

  if (
    type === 'null' ||
    (preferredValue === null && (selected.nullable || getSchemaTypes(selected).includes('null')))
  )
    return null;
  if (type === 'object') {
    const explicitObject =
      preferredValue && typeof preferredValue === 'object' && !Array.isArray(preferredValue)
        ? (preferredValue as Record<string, unknown>)
        : {};
    return createObjectMock(selected, schemas, explicitObject, seenReferences);
  }
  if (type === 'array') {
    const explicitItems = Array.isArray(preferredValue) ? preferredValue : [];
    if (selected.prefixItems?.length) {
      const itemCount = Math.max(explicitItems.length, selected.prefixItems.length);
      return Array.from({ length: itemCount }, (_, index) =>
        createSchemaMock(
          selected.prefixItems?.[index] ?? selected.items,
          schemas,
          explicitItems[index],
          fieldName,
          seenReferences,
        ),
      );
    }
    if (!selected.items) {
      const sourceItems = explicitItems.length ? explicitItems : [undefined];
      return sourceItems.map((item) =>
        createSchemaMock(undefined, schemas, item, fieldName, seenReferences),
      );
    }
    const sourceItems = explicitItems.length ? explicitItems : [undefined];
    return sourceItems.map((item) =>
      createSchemaMock(selected.items, schemas, item, fieldName, seenReferences),
    );
  }

  if (type === 'boolean') return typeof preferredValue === 'boolean' ? preferredValue : true;
  if (type === 'integer' || type === 'number') {
    if (typeof preferredValue === 'number') return preferredValue;
    const normalizedName = fieldName.toLowerCase();
    if (normalizedName.includes('timestamp') || normalizedName.endsWith('time')) {
      return 1710000000000;
    }
    if (normalizedName === 'code' || normalizedName.endsWith('code')) return 0;
    return selected.minimum ?? 1;
  }
  if (
    (typeof preferredValue === 'string' ||
      typeof preferredValue === 'number' ||
      typeof preferredValue === 'boolean') &&
    String(preferredValue).trim()
  ) {
    return String(preferredValue);
  }
  return createStringMock(selected, fieldName);
};

/**
 * Completes every declared object property and preserves compatible explicit fields.
 *
 * @param schema Resolved object schema.
 * @param schemas Component schema registry.
 * @param value Explicit object example whose placeholders should be completed.
 * @param seenReferences Component references already traversed by the parent call.
 * @returns Object containing meaningful values for declared and explicit properties.
 */
const createObjectMock = (
  schema: Schema,
  schemas: Record<string, Schema>,
  value: Record<string, unknown>,
  seenReferences: Set<string>,
) => {
  const properties = schema.properties ?? {};
  const result: Record<string, unknown> = {};
  const names = [...new Set([...Object.keys(properties), ...Object.keys(value)])];
  names.forEach((name) => {
    result[name] = createSchemaMock(properties[name], schemas, value[name], name, seenReferences);
  });
  if (!names.length && typeof schema.additionalProperties === 'object') {
    result.exampleKey = createSchemaMock(
      schema.additionalProperties,
      schemas,
      undefined,
      'exampleKey',
      seenReferences,
    );
  }
  return names.length || Object.keys(result).length ? result : { value: createStringMock(schema) };
};
