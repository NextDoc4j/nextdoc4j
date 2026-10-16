import { getSchemaTypes, hasSchemaDefaultValue, isIntegerSchema } from '../openapi/schema';
import { schemaName } from '../openapi/utils';
import { getRequestType, prepareRequestSchema, resolveRequestSchema } from './request-schema';
import { resolveResponseReference } from './response-schema';
import type { MediaDefinition, OpenApiDocument, Schema } from '../../types/openapi';

type DisplaySchema = ReturnType<typeof resolveRequestSchema>;
export interface JsonExampleNode {
  id: string;
  parent: string | null;
  path: string;
  key: string | number | null;
  value: unknown;
  schema: DisplaySchema;
  depth: number;
  index: number;
  siblings: number;
  children: JsonExampleNode[];
  complex: boolean;
  array: boolean;
}
export interface JsonExampleContext {
  schemas: Record<string, Schema>;
  variants: Map<string, number>;
  direction: 'request' | 'response' | 'model';
}

/**
 * Selects a composition branch from explicit preview choices or the actual example shape.
 * @param raw Original schema, including references and combinations.
 * @param value Current example value, if already declared.
 * @param path Field path used by the parameter view for branch selection.
 * @param context Model registry, direction and explicit branch choices.
 * @returns A resolved schema whose properties and annotations match the displayed value.
 */
export function resolveJsonExampleSchema(
  raw: Schema,
  value: unknown,
  path: string,
  context: JsonExampleContext,
): DisplaySchema {
  const schema = resolveRequestSchema(raw, context.schemas);
  const options = schema.oneOf?.length ? schema.oneOf : schema.anyOf;
  if (!options?.length) return schema;
  const scores = options.map((option) => {
    const candidate = resolveRequestSchema(option, context.schemas);
    let score = 0;
    const type = value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
    if (
      getRequestType(candidate) === type ||
      (getRequestType(candidate) === 'integer' && Number.isInteger(value))
    )
      score += 2;
    if (candidate.const !== undefined) score += Object.is(candidate.const, value) ? 50 : -100;
    if (candidate.enum?.length && value !== undefined)
      score += candidate.enum.some((item) => Object.is(item, value)) ? 20 : -20;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      for (const [name, child] of Object.entries(candidate.properties || {})) {
        if (!Object.hasOwn(value, name)) {
          if (candidate.required?.includes(name)) score -= 2;
          continue;
        }
        score += 3;
        const node = resolveRequestSchema(child, context.schemas),
          actual = (value as Record<string, unknown>)[name];
        if (node.const !== undefined) score += Object.is(node.const, actual) ? 50 : -100;
        if (node.enum?.length)
          score += node.enum.some((item) => Object.is(item, actual)) ? 20 : -20;
      }
    }
    return score;
  });
  const discriminator = schema.discriminator;
  const discriminatorValue =
    discriminator && value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)[discriminator.propertyName]
      : undefined;
  const mappedReference =
    typeof discriminatorValue === 'string'
      ? discriminator?.mapping?.[discriminatorValue]
      : undefined;
  const discriminatedIndex =
    typeof discriminatorValue === 'string'
      ? options.findIndex((option) => {
          if (mappedReference)
            return (
              option.$ref === mappedReference ||
              (option.$ref?.startsWith('#/components/schemas/') &&
                schemaName(option) === mappedReference)
            );
          return Boolean(
            option.$ref?.startsWith('#/components/schemas/') &&
            schemaName(option) === discriminatorValue,
          );
        })
      : -1;
  const selected =
    context.variants.get(path) ??
    (discriminatedIndex >= 0
      ? discriminatedIndex
      : value === undefined
        ? 0
        : scores.indexOf(Math.max(...scores)));
  return prepareRequestSchema(raw, path, {
    schemas: context.schemas,
    variants: new Map(context.variants).set(path, selected),
  }).schema;
}

/**
 * Checks the type of a candidate inherited from a union's shared examples.
 * @param value Candidate example, enum or default value.
 * @param schema Currently selected branch schema.
 * @returns Whether the candidate can represent the selected JSON value type.
 */
function matchesExampleType(value: unknown, schema: Schema): boolean {
  if (value === null)
    return Boolean(
      schema.nullable || getSchemaTypes(schema).includes('null') || schema.type === 'null',
    );
  if (isIntegerSchema(schema)) {
    if (Number.isInteger(value)) return true;
    if (typeof value === 'string' && /^-?\d+$/.test(value.trim())) return true;
  }
  const declared = getSchemaTypes(schema);
  const types = declared.length ? declared : [getRequestType(schema)];
  return types.some((type) => {
    if (type === 'any') return true;
    if (type === 'integer') return Number.isInteger(value);
    if (type === 'array') return Array.isArray(value);
    if (type === 'object') return typeof value === 'object' && !Array.isArray(value);
    if (type === 'file') return typeof value === 'string';
    return typeof value === type;
  });
}

/**
 * Derives an illustrative JSON value when the document omits a complete example.
 * @param raw Original model definition.
 * @param path Field path shared with the parameter view.
 * @param context Schemas, branch choices and request/response visibility.
 * @param seen References already entered while constructing this value.
 * @param depth Current nesting depth.
 * @param recursiveReferences References whose single recursive child was already generated.
 * @returns Declared examples first; otherwise a bounded structural example with finite collections.
 */
export function createJsonExample(
  raw: Schema,
  path: string,
  context: JsonExampleContext,
  seen = new Set<string>(),
  depth = 0,
  recursiveReferences = new Set<string>(),
): unknown {
  const schema = resolveJsonExampleSchema(raw, undefined, path, context);
  const original = resolveRequestSchema(raw, context.schemas);
  const union = Boolean(original.oneOf?.length || original.anyOf?.length);
  const candidates = [
    ...(schema.example !== undefined ? [schema.example] : []),
    ...(schema.examples ?? []),
    ...(schema.const !== undefined ? [schema.const] : []),
    ...(schema.enum ?? []),
    ...(hasSchemaDefaultValue(schema.default) ? [schema.default] : []),
  ];
  const example = candidates.find(
    (value) => value !== undefined && (!union || matchesExampleType(value, schema)),
  );
  if (example !== undefined) {
    if (isIntegerSchema(schema) && typeof example === 'string' && /^-?\d+$/.test(example.trim())) {
      return parseInt(example.trim(), 10);
    }
    return example;
  }
  const type = getRequestType(schema);
  if (type === 'null') return null;
  const repeated = schema.references?.filter((ref) => seen.has(ref)) ?? [];
  if (depth > 10 || (repeated.length > 0 && recursiveReferences.size > 0))
    return type === 'array' ? [] : {};
  const next = new Set([...seen, ...(schema.references || [])]);
  const nextRecursive = new Set([...recursiveReferences, ...repeated]);
  if (schema.properties)
    return Object.fromEntries(
      Object.entries(schema.properties)
        .filter(([, child]) => {
          const field = resolveRequestSchema(child, context.schemas);
          return (
            !field.hidden &&
            (context.direction === 'model' ||
              (context.direction === 'request'
                ? !field.readOnly && field.accessMode?.toUpperCase() !== 'READ_ONLY'
                : !field.writeOnly && field.accessMode?.toUpperCase() !== 'WRITE_ONLY'))
          );
        })
        .map(([name, child]) => [
          name,
          createJsonExample(child, `${path}.${name}`, context, next, depth + 1, nextRecursive),
        ]),
    );
  if (schema.prefixItems?.length)
    return schema.prefixItems.map((item, index) =>
      createJsonExample(item, `${path}[${index}]`, context, next, depth + 1, nextRecursive),
    );
  if (schema.items) {
    const item = resolveJsonExampleSchema(schema.items, undefined, path + '[]', context);
    return item.references?.some((ref) => next.has(ref) && nextRecursive.size > 0)
      ? []
      : [createJsonExample(schema.items, path + '[]', context, next, depth + 1, nextRecursive)];
  }
  if (type === 'object') return {};
  if (type === 'array') return [];
  if (type === 'boolean') return false;
  if (type === 'integer' || type === 'number') return 0;
  if (type === 'string' || type === 'file') return '';
  return null;
}

/**
 * Formats a property path without confusing dotted keys with nested properties.
 * @param parent Parent's displayed JSON path.
 * @param key Object key or array index.
 * @returns An unambiguous path suitable for the outline and clipboard.
 */
export function getJsonExamplePath(parent: string, key: string | number): string {
  return typeof key === 'number'
    ? `${parent}[${key}]`
    : /^[A-Za-z_$][\w$]*$/.test(key)
      ? `${parent}.${key}`
      : `${parent}[${JSON.stringify(key)}]`;
}

/**
 * Builds the annotated outline directly from the actual JSON value.
 * @param value Complete example value, preserving null, false, zero and empty collections.
 * @param raw Original schema associated with this value.
 * @param context Model context used to resolve properties and combination branches.
 * @param path JSON path displayed to the reader.
 * @param key Current property key; null identifies the root.
 * @param id JSON Pointer used as a stable node identifier.
 * @param parent Parent node identifier; null identifies the root.
 * @param depth Current tree depth.
 * @param index Position within the containing collection.
 * @param siblings Number of nodes in the containing collection.
 * @param schemaPath Field path used to locate the selected parameter branch.
 * @returns An annotated JSON tree; counts are based on actual entries, never schema fields.
 */
export function buildJsonExampleTree(
  value: unknown,
  raw: Schema,
  context: JsonExampleContext,
  path = '$',
  key: string | number | null = null,
  id = '',
  parent: string | null = null,
  depth = 0,
  index = 0,
  siblings = 1,
  schemaPath = 'body',
): JsonExampleNode {
  const schema = resolveJsonExampleSchema(raw, value, schemaPath, context);
  const array = Array.isArray(value);
  const complex = value !== null && typeof value === 'object';
  const entries: Array<[string | number, unknown]> = array
    ? value.map((item, i) => [i, item])
    : complex
      ? Object.entries(value as Record<string, unknown>)
      : [];
  const children = entries.map(([childKey, item], i) => {
    const child = array
      ? schema.prefixItems?.[Number(childKey)] || schema.items || {}
      : schema.properties?.[String(childKey)] ||
        (typeof schema.additionalProperties === 'object' ? schema.additionalProperties : {});
    return buildJsonExampleTree(
      item,
      child,
      context,
      getJsonExamplePath(path, childKey),
      childKey,
      `${id}/${String(childKey).replaceAll('~', '~0').replaceAll('/', '~1')}`,
      id,
      depth + 1,
      i,
      entries.length,
      typeof childKey === 'number'
        ? schema.prefixItems?.[childKey]
          ? `${schemaPath}[${childKey}]`
          : `${schemaPath}[]`
        : `${schemaPath}.${childKey}`,
    );
  });
  return { id, parent, path, key, value, schema, depth, index, siblings, children, complex, array };
}

/**
 * Serializes a complete JSON value for node and whole-example copying.
 * @param value Original example or subtree, without display annotations.
 * @returns Indented JSON text; undefined produces no example text.
 */
export function stringifyJsonExample(value: unknown): string {
  return JSON.stringify(value, null, 2) ?? '';
}

export interface JsonExampleOption {
  key: string;
  label: string;
  description?: string;
  value?: unknown;
  externalValue?: string;
  unresolvedReference?: string;
}

export interface JsonExamplePreview {
  schema: DisplaySchema;
  tree?: JsonExampleNode;
  provenance: '文档示例' | '结构示例';
  options: JsonExampleOption[];
  selectedExample: string;
  message?: string;
  externalValue?: string;
}

/**
 * Lists named examples while resolving local references and retaining explicit empty values.
 * @param definition Selected media definition.
 * @param components Registries from the active document.
 * @returns Named examples in declaration order, including metadata for unresolved or external entries.
 */
export function getJsonExampleOptions(
  definition: MediaDefinition | undefined,
  components: OpenApiDocument['components'],
): JsonExampleOption[] {
  return Object.entries(definition?.examples ?? {}).map(([key, raw]) => {
    const resolved = resolveResponseReference(raw, components);
    return {
      key,
      label: resolved.summary?.trim() || key,
      description: resolved.description,
      value: resolved.value,
      externalValue: resolved.externalValue,
      unresolvedReference: resolved.unresolvedReference,
    };
  });
}

/**
 * Produces the selected JSON preview without replacing null or copying display annotations.
 * @param definition Selected media definition.
 * @param context Component models, field-branch choices and request/response direction.
 * @param components Registries used for named-example references.
 * @param exampleKey Selected named example, falling back to the first declared one.
 * @returns Annotated example and its provenance, or a readable unavailable state.
 */
export function createJsonExamplePreview(
  definition: MediaDefinition | undefined,
  context: JsonExampleContext,
  components: OpenApiDocument['components'],
  exampleKey: string,
): JsonExamplePreview {
  const options = getJsonExampleOptions(definition, components);
  const selected = options.find((option) => option.key === exampleKey) ?? options[0];
  const explicit = definition?.example !== undefined ? definition.example : selected?.value;
  const raw = definition?.schema ?? {};
  const schema = resolveJsonExampleSchema(raw, explicit, 'body', context);
  const original = resolveRequestSchema(raw, context.schemas);
  const union = Boolean(original.oneOf?.length || original.anyOf?.length);
  const schemaValue = [
    ...(schema.example !== undefined ? [schema.example] : []),
    ...(schema.examples ?? []),
  ].find((value) => value !== undefined && (!union || matchesExampleType(value, schema)));
  const provenance = explicit !== undefined || schemaValue !== undefined ? '文档示例' : '结构示例';
  const base = { schema, options, selectedExample: selected?.key ?? '', provenance } as const;
  if (explicit === undefined && selected?.unresolvedReference)
    return { ...base, message: `未解析的示例引用：${selected.unresolvedReference}` };
  if (explicit === undefined && selected?.externalValue)
    return { ...base, message: '此示例由外部资源提供', externalValue: selected.externalValue };
  if (explicit === undefined && schemaValue === undefined && schema.unresolvedReference)
    return { ...base, message: `未解析的模型引用：${schema.unresolvedReference}` };
  const value =
    explicit !== undefined
      ? explicit
      : schemaValue !== undefined
        ? schemaValue
        : definition?.schema
          ? createJsonExample(definition.schema, 'body', context)
          : undefined;
  return value === undefined
    ? { ...base, message: '文档未提供内容示例或结构定义' }
    : { ...base, tree: buildJsonExampleTree(value, raw, context) };
}

/**
 * Traverses a JsonExampleNode tree according to a JSON key path.
 * @param root Root node of the JSON example tree.
 * @param path Array of property names and array indexes.
 * @returns The matching node, or undefined if the path does not exist.
 */
export function findJsonExampleNode(
  root: JsonExampleNode | undefined,
  path: Array<string | number>,
): JsonExampleNode | undefined {
  let curr = root;
  for (const segment of path) {
    if (!curr) return undefined;
    const strSegment = String(segment);
    curr = curr.children.find((child) => String(child.key) === strSegment);
  }
  return curr;
}
