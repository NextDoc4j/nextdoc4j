import { getSchemaType } from './schema';
import { hasSchemaDefaultValue, normalizeSchemaDefaults } from './schema';

import type {
  ApiOperation,
  HttpMethod,
  MediaDefinition,
  OpenApiDocument,
  Operation,
  Paths,
  Schema,
} from '../../types/openapi';

const methods: HttpMethod[] = ['get', 'post', 'put', 'delete', 'patch', 'head', 'options'];
const methodRank = new Map(methods.map((method, index) => [method, index]));
const collator = new Intl.Collator('zh-CN', { numeric: true, sensitivity: 'base' });

const orderOf = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER;
};

const addSearchToken = (tokens: Set<string>, value: unknown) => {
  if (value === null || value === undefined || typeof value === 'object') return;
  const text = String(value).trim();
  if (text) tokens.add(text);
};

const collectSchemaSearchTokens = (
  schema: Schema | undefined,
  schemas: Record<string, Schema>,
  tokens: Set<string>,
  seenReferences = new Set<string>(),
  seenSchemas = new WeakSet<object>(),
) => {
  if (!schema || typeof schema !== 'object' || seenSchemas.has(schema)) return;
  seenSchemas.add(schema);

  addSearchToken(tokens, schemaName(schema));
  addSearchToken(tokens, schema.title);
  addSearchToken(tokens, schema.description);
  addSearchToken(tokens, schema.type);
  addSearchToken(tokens, schema.format);
  schema.enum?.forEach((value) => addSearchToken(tokens, value));

  const reference = schema.$ref ? schemaName(schema) : '';
  if (reference) {
    if (seenReferences.has(reference)) return;
    seenReferences.add(reference);
    collectSchemaSearchTokens(schemas[reference], schemas, tokens, seenReferences, seenSchemas);
  }

  Object.entries(schema.properties ?? {}).forEach(([name, property]) => {
    addSearchToken(tokens, name);
    collectSchemaSearchTokens(property, schemas, tokens, seenReferences, seenSchemas);
  });
  collectSchemaSearchTokens(schema.items, schemas, tokens, seenReferences, seenSchemas);
  schema.allOf?.forEach((item) =>
    collectSchemaSearchTokens(item, schemas, tokens, seenReferences, seenSchemas),
  );
  schema.oneOf?.forEach((item) =>
    collectSchemaSearchTokens(item, schemas, tokens, seenReferences, seenSchemas),
  );
  schema.anyOf?.forEach((item) =>
    collectSchemaSearchTokens(item, schemas, tokens, seenReferences, seenSchemas),
  );
};

const createOperationSearchText = (
  operation: Operation,
  path: string,
  method: HttpMethod,
  schemas: Record<string, Schema>,
) => {
  const tokens = new Set<string>();
  [operation.summary, operation.description, operation.operationId, path, method].forEach((value) =>
    addSearchToken(tokens, value),
  );
  operation.tags?.forEach((tag) => addSearchToken(tokens, tag));
  operation.parameters?.forEach((parameter) => {
    [parameter.name, parameter.in, parameter.description].forEach((value) =>
      addSearchToken(tokens, value),
    );
    collectSchemaSearchTokens(parameter.schema, schemas, tokens);
  });
  addSearchToken(tokens, operation.requestBody?.description);
  Object.entries(operation.requestBody?.content ?? {}).forEach(([contentType, definition]) => {
    addSearchToken(tokens, contentType);
    collectSchemaSearchTokens(definition.schema, schemas, tokens);
  });
  Object.entries(operation.responses ?? {}).forEach(([status, response]) => {
    addSearchToken(tokens, status);
    addSearchToken(tokens, response.description);
    Object.entries(response.content ?? {}).forEach(([contentType, definition]) => {
      addSearchToken(tokens, contentType);
      collectSchemaSearchTokens(definition.schema, schemas, tokens);
    });
  });
  return [...tokens].join(' ');
};

export const methodColor = (method: string) =>
  ({
    delete: 'bg-rose-100 text-rose-700',
    get: 'bg-emerald-100 text-emerald-700',
    head: 'bg-slate-200 text-slate-700',
    options: 'bg-slate-200 text-slate-700',
    patch: 'bg-orange-100 text-orange-700',
    post: 'bg-sky-100 text-sky-700',
    put: 'bg-violet-100 text-violet-700',
  })[method.toLowerCase()] ?? 'bg-slate-100 text-slate-600';

/**
 * Gets the accent color used to identify a documented HTTP method.
 *
 * @param method HTTP method from an OpenAPI operation.
 * @returns A stable accent color, defaulting to the POST color for unknown methods.
 */
export const getMethodAccentColor = (method: string) =>
  ({
    delete: '#f56c6c',
    get: '#67c23a',
    head: '#909399',
    options: '#0d9488',
    patch: '#e6a23c',
    post: '#409eff',
    put: '#8b5cf6',
  })[method.toLowerCase()] ?? '#409eff';

/**
 * Gets the declared media types from an OpenAPI request or response content object.
 *
 * @param content Request or response media definitions.
 * @returns Media-type keys in declaration order, omitting empty JSON alternatives to multipart.
 */
export const getContentTypes = (content?: Record<string, MediaDefinition>) => {
  const entries = Object.entries(content ?? {});
  const hasMultipart = entries.some(
    ([type, media]) =>
      type.toLowerCase().split(';')[0].trim() === 'multipart/form-data' && media.schema,
  );
  return entries
    .filter(([type, media]) => {
      if (!hasMultipart || type.toLowerCase().split(';')[0].trim() !== 'application/json')
        return true;
      return (
        (media.schema && Object.keys(normalizeSchemaDefaults(media.schema)).length > 0) ||
        media.example !== undefined ||
        Object.keys(media.examples ?? {}).length > 0
      );
    })
    .map(([type]) => type);
};

/**
 * Chooses a stable media type, favoring JSON when a document declares it.
 *
 * @param content Request or response media definitions.
 * @returns The preferred media type, or an empty string when none is declared.
 */
export const getDefaultContentType = (content?: Record<string, MediaDefinition>) => {
  const contentTypes = getContentTypes(content);
  return (
    contentTypes.find((contentType) => contentType.toLowerCase().includes('application/json')) ??
    contentTypes[0] ??
    ''
  );
};

/**
 * Flattens an OpenAPI paths object into sorted, navigation-ready operations.
 *
 * @param document OpenAPI document to inspect.
 * @returns Operations sorted by extension order, display name, path and HTTP method.
 */
export interface OperationSourceMetadata {
  sourceGroupId?: string;
  sourceGroupName?: string;
}

export const getOperations = (
  document?: OpenApiDocument,
  source: OperationSourceMetadata = {},
): ApiOperation[] => {
  if (!document?.paths) return [];
  const schemas = document.components?.schemas ?? {};
  return Object.entries(document.paths)
    .flatMap(([path, pathItem]) =>
      methods.flatMap((method) => {
        const operation = pathItem[method] as Operation | undefined;
        if (!operation) return [];
        const normalizedOperation: ApiOperation = {
          ...operation,
          group: operation.tags?.[0] || 'default',
          method,
          path,
          ...source,
        };
        let searchText: string | undefined;
        Object.defineProperty(normalizedOperation, 'searchText', {
          configurable: true,
          enumerable: false,
          get: () => (searchText ??= createOperationSearchText(operation, path, method, schemas)),
        });
        return [normalizedOperation];
      }),
    )
    .sort((left, right) => {
      const order = orderOf(left['x-order']) - orderOf(right['x-order']);
      if (order !== 0) return order;
      const nameOrder = collator.compare(left.summary || left.path, right.summary || right.path);
      if (nameOrder !== 0) return nameOrder;
      const pathOrder = collator.compare(left.path, right.path);
      if (pathOrder !== 0) return pathOrder;
      return (methodRank.get(left.method) ?? 99) - (methodRank.get(right.method) ?? 99);
    });
};

/**
 * Groups operations by their primary tag and applies OpenAPI tag ordering.
 *
 * @param document OpenAPI document to inspect.
 * @param source Source metadata attached when operations must remain group-aware.
 * @param preparedOperations Optional normalized operations that avoid repeating schema traversal.
 * @returns Ordered tag and operation pairs for documentation navigation.
 */
export const groupOperations = (
  document?: OpenApiDocument,
  source: OperationSourceMetadata = {},
  preparedOperations?: ApiOperation[],
) => {
  const groups = new Map<string, ApiOperation[]>();
  (preparedOperations ?? getOperations(document, source)).forEach((operation) => {
    const items = groups.get(operation.group) ?? [];
    items.push(operation);
    groups.set(operation.group, items);
  });
  const tagOrder = new Map(
    (document?.tags ?? []).map((tag) => [tag.name, orderOf(tag['x-order'])]),
  );
  return [...groups.entries()].sort(([left], [right]) => {
    const order =
      (tagOrder.get(left) ?? Number.MAX_SAFE_INTEGER) -
      (tagOrder.get(right) ?? Number.MAX_SAFE_INTEGER);
    return order || collator.compare(left, right);
  });
};

/**
 * Decodes one JSON Pointer token in RFC 6901 order without treating it as a URI.
 * @param token Escaped reference-name segment.
 * @returns The original name with escaped slashes and tildes restored.
 */
export const decodeJsonPointerToken = (token: string) =>
  token.replaceAll('~1', '/').replaceAll('~0', '~');

/**
 * Resolves an OpenAPI schema's local reference name.
 *
 * @param schema Schema or reference to inspect.
 * @returns Decoded component name or title; empty when neither is available.
 */
export const schemaName = (schema?: Schema) =>
  (schema?.$ref ? decodeJsonPointerToken(schema.$ref.split('/').at(-1) ?? '') : schema?.title) ||
  '';

/**
 * Resolves a local component-schema reference while preserving inline schemas.
 *
 * @param schema Inline or referenced schema.
 * @param schemas Component schema registry.
 * @returns The component schema when a local reference can be resolved.
 */
export const resolveSchema = (schema: Schema | undefined, schemas: Record<string, Schema>) => {
  const name = schemaName(schema);
  return (name && schemas[name]) || schema;
};

/**
 * Merges schema fragments while retaining all fields required to generate a representative example.
 *
 * @param base Shared schema fields declared before composition branches.
 * @param addition One allOf, oneOf or anyOf schema fragment.
 * @returns Combined schema with merged properties and required-field lists.
 */
const mergeExampleSchema = (base: Schema, addition: Schema): Schema => {
  const properties = { ...base.properties, ...addition.properties };
  const required = [...new Set([...(base.required ?? []), ...(addition.required ?? [])])];
  return {
    ...base,
    ...addition,
    ...(Object.keys(properties).length > 0 ? { properties } : {}),
    ...(required.length > 0 ? { required } : {}),
  };
};

/**
 * Removes composition declarations before a selected branch is merged into a schema.
 *
 * @param schema Schema that may define allOf, oneOf or anyOf branches.
 * @returns Schema metadata that applies to every composition branch.
 */
const getExampleSchemaBase = (schema: Schema): Schema => {
  const base = { ...schema };
  delete base.allOf;
  delete base.anyOf;
  delete base.oneOf;
  return base;
};

/**
 * Infers a schema type for example generation when type is omitted by the OpenAPI producer.
 *
 * @param schema Schema whose structural shape should be classified.
 * @returns Inferred OpenAPI type, or undefined for an unconstrained schema.
 */
const getExampleSchemaType = (schema: Schema) => {
  if (getSchemaType(schema)) return getSchemaType(schema);
  if (schema.properties) return 'object';
  if (schema.items || schema.prefixItems) return 'array';
  if (schema.enum?.length) return typeof schema.enum[0];
  return undefined;
};

/**
 * Creates a safe example value from an OpenAPI schema.
 *
 * @param schema Schema that defines the example.
 * @param schemas Component schema registry.
 * @param seen Reference names already traversed, used to stop circular structures.
 * @returns A display and request-ready example value.
 */
export const createExample = (
  schema: Schema | undefined,
  schemas: Record<string, Schema>,
  seen = new Set<string>(),
): unknown => {
  if (!schema) return '';
  if (schema.example !== undefined) return schema.example;
  if (hasSchemaDefaultValue(schema.default)) return schema.default;
  if (schema.const !== undefined) return schema.const;
  if (schema.enum?.length) return schema.enum[0];
  const refName = schemaName(schema);
  if (schema.$ref && refName) {
    if (seen.has(refName)) return refName;
    const nextSeen = new Set(seen);
    nextSeen.add(refName);
    return createExample(schemas[refName], schemas, nextSeen);
  }

  const baseSchema = getExampleSchemaBase(schema);
  const merged = schema.allOf?.length
    ? schema.allOf.reduce<Schema>(
        (result, item) => mergeExampleSchema(result, resolveSchema(item, schemas) ?? item),
        baseSchema,
      )
    : schema.oneOf?.length || schema.anyOf?.length
      ? mergeExampleSchema(
          baseSchema,
          resolveSchema((schema.oneOf ?? schema.anyOf ?? [])[0], schemas) ??
            (schema.oneOf ?? schema.anyOf ?? [])[0],
        )
      : schema;
  const type = getExampleSchemaType(merged);
  if (type === 'null') return null;
  if (merged.prefixItems?.length)
    return merged.prefixItems.map((item) => createExample(item, schemas, new Set(seen)));
  if (type === 'array') return [createExample(merged.items, schemas, new Set(seen))];
  if (type === 'object' || merged.properties) {
    return Object.fromEntries(
      Object.entries(merged.properties ?? {}).map(([key, item]) => [
        key,
        createExample(item, schemas, new Set(seen)),
      ]),
    );
  }
  if (type === 'boolean') return true;
  if (type === 'integer' || type === 'number') return 0;
  if (merged.format === 'date-time') return new Date().toISOString();
  return '';
};

export const toPrettyJson = (value: unknown) => JSON.stringify(value, null, 2);

export const documentStats = (document?: OpenApiDocument) => ({
  groups: groupOperations(document).length,
  models: Object.keys(document?.components?.schemas ?? {}).length,
  operations: getOperations(document).length,
});

export const getOperation = (paths: Paths | undefined, path: string, method: string) =>
  paths?.[path]?.[method as HttpMethod] as Operation | undefined;
