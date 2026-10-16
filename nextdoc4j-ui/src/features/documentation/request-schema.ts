import {
  formatSchemaValue,
  getSchemaType,
  getSchemaTypes,
  isIntegerSchema,
  normalizeSchemaDefaults,
} from '../openapi/schema';
import { schemaName } from '../openapi/utils';
import type { MediaDefinition, Parameter, Schema } from '../../types/openapi';

export interface RequestSchemaSource {
  label: string;
  properties: string[];
  reference: boolean;
}

export interface RequestDisplaySchema extends Schema {
  referenceName?: string;
  references?: string[];
  sourceKeyword?: 'allOf' | 'oneOf' | 'anyOf';
  sources?: RequestSchemaSource[];
  unresolvedReference?: string;
}

export interface RequestComposition {
  keyword: 'oneOf' | 'anyOf';
  options: Schema[];
  selected: number;
}

export interface RequestField {
  children: RequestField[];
  composition?: RequestComposition;
  cycle?: string;
  recursive?: boolean;
  depth: number;
  description?: string;
  encoding?: NonNullable<MediaDefinition['encoding']>[string];
  examples: unknown[];
  key: string;
  name: string;
  parameter?: Parameter;
  required: boolean;
  schema: RequestDisplaySchema;
  truncated: boolean;
}

export interface RequestTreeContext {
  includeReadOnly?: boolean;
  ancestors: Set<string>;
  recursiveReferences?: Set<string>;
  schemas: Record<string, Schema>;
  variants: Map<string, number>;
}

/**
 * Combines request schema fragments without discarding properties or required names.
 *
 * @param base Shared schema definition.
 * @param addition Referenced or selected schema fragment.
 * @returns A new display schema with merged properties and required fields.
 */
const mergeSchema = (
  base: RequestDisplaySchema,
  addition: RequestDisplaySchema,
): RequestDisplaySchema => ({
  ...base,
  ...addition,
  ...(base.properties || addition.properties
    ? { properties: { ...base.properties, ...addition.properties } }
    : {}),
  required: [...new Set([...(base.required ?? []), ...(addition.required ?? [])])],
});

/**
 * Resolves local references and allOf fragments while retaining their field provenance.
 *
 * @param raw Original OpenAPI schema.
 * @param schemas Component schema registry.
 * @param trail References already visited during reference and composition resolution.
 * @returns Display schema with merged allOf fields, provenance and unresolved-reference metadata.
 */
export const resolveRequestSchema = (
  raw: Schema = {},
  schemas: Record<string, Schema>,
  trail = new Set<string>(),
): RequestDisplaySchema => {
  raw = normalizeSchemaDefaults(raw);
  if (raw.$dynamicRef)
    return {
      ...raw,
      unresolvedReference: `$dynamicRef 尚不支持动态作用域解析：${raw.$dynamicRef}`,
    };
  if (raw.$ref) {
    const reference = raw.$ref;
    const target = reference.startsWith('#/components/schemas/')
      ? schemas[schemaName(raw)]
      : undefined;
    if (!target || trail.has(reference)) return { ...raw, unresolvedReference: reference };
    const inline = { ...raw };
    delete inline.$ref;
    const resolved = resolveRequestSchema(target, schemas, new Set(trail).add(reference));
    return {
      ...mergeSchema(resolved, resolveRequestSchema(inline, schemas, trail)),
      referenceName: schemaName(raw),
      references: [...new Set([reference, ...(resolved.references ?? [])])],
    };
  }
  if (!raw.allOf?.length) return { ...raw };
  const base = { ...raw };
  delete base.allOf;
  const localProperties = new Set(Object.keys(base.properties ?? {}));
  const sources: RequestSchemaSource[] = [];
  const result = raw.allOf.reduce<RequestDisplaySchema>((merged, fragment, index) => {
    const resolved = resolveRequestSchema(fragment, schemas, trail);
    sources.push({
      label: resolved.referenceName || resolved.title || `分支 ${index + 1}`,
      properties: Object.keys(resolved.properties ?? {}).filter(
        (name) => !localProperties.has(name),
      ),
      reference: Boolean(fragment.$ref),
    });
    return mergeSchema(merged, resolved);
  }, {});
  if (localProperties.size) {
    sources.push({
      label: raw.title || '当前定义',
      properties: [...localProperties],
      reference: false,
    });
  }
  return {
    ...mergeSchema(result, base),
    description: raw.description ?? result.description,
    ...(Object.hasOwn(raw, 'default') ? { default: raw.default } : {}),
    referenceName: undefined,
    references: [],
    sourceKeyword: 'allOf',
    sources,
  };
};

/**
 * Selects the current oneOf or anyOf view while preserving shared field declarations.
 *
 * @param raw Schema with optional references or composition keywords.
 * @param key Stable request field path used to store the selected branch.
 * @param context Component schemas and current branch selections.
 * @returns The selected schema and its branch-switching metadata.
 */
export const prepareRequestSchema = (
  raw: Schema,
  key: string,
  context: Pick<RequestTreeContext, 'schemas' | 'variants'>,
): { schema: RequestDisplaySchema; composition?: RequestComposition } => {
  const resolved = resolveRequestSchema(raw, context.schemas);
  const keyword = resolved.oneOf?.length ? 'oneOf' : resolved.anyOf?.length ? 'anyOf' : undefined;
  if (!keyword) return { schema: resolved };
  const options = resolved[keyword]!;
  const selected = Math.max(0, Math.min(context.variants.get(key) ?? 0, options.length - 1));
  const base = { ...resolved };
  delete base.oneOf;
  delete base.anyOf;
  const branch = resolveRequestSchema(options[selected], context.schemas);
  const commonProperties = Object.keys(base.properties ?? {});
  const schema = mergeSchema(base, branch);
  return {
    composition: { keyword, options, selected },
    schema: {
      ...schema,
      description: base.description ?? branch.description,
      ...(Object.hasOwn(base, 'default') ? { default: base.default } : {}),
      ...(commonProperties.length
        ? {
            sourceKeyword: keyword,
            sources: [
              {
                label: base.referenceName || '公共定义',
                properties: commonProperties,
                reference: true,
              },
              ...(branch.sources ?? [
                {
                  label: branch.referenceName || '当前分支',
                  properties: Object.keys(branch.properties ?? {}),
                  reference: false,
                },
              ]),
            ],
          }
        : {}),
      references: [...new Set([...(base.references ?? []), ...(branch.references ?? [])])],
    },
  };
};

/**
 * Gets the declared request value type, identifying binary strings as files for display.
 *
 * @param schema Resolved request schema.
 * @returns Type label without inferring a type from the parameter name or its example.
 */
export const getRequestType = (schema: Schema): string => {
  if (getSchemaType(schema) === 'string' && schema.format === 'binary') return 'file';
  if (isIntegerSchema(schema)) return 'integer';
  return (
    getSchemaType(schema) ||
    (schema.properties || schema.additionalProperties !== undefined
      ? 'object'
      : schema.items || schema.prefixItems
        ? 'array'
        : 'any')
  );
};

/**
 * Formats request types while retaining referenced array-element model names.
 *
 * @param schema Resolved request schema.
 * @param schemas Component schema registry.
 * @param depth Type-label recursion depth for nested arrays.
 * @returns Compact primitive, object or array type text.
 */
export const getRequestTypeLabel = (
  schema: Schema,
  schemas: Record<string, Schema>,
  depth = 0,
): string => {
  const declared = getSchemaTypes(schema);
  if (declared.length > 1)
    return declared
      .map((type) => getRequestTypeLabel({ ...schema, type, types: undefined }, schemas, depth))
      .join(' | ');
  const type = getRequestType(schema);
  if (type !== 'array' || depth >= 10) return type;
  const item = resolveRequestSchema(schema.items ?? {}, schemas);
  const itemType = item.referenceName || getRequestTypeLabel(item, schemas, depth + 1);
  const format = item.format && getRequestType(item) !== 'file' ? `<${item.format}>` : '';
  return `array<${itemType}${format}>`;
};

/**
 * Preserves explicit empty strings, nulls, false values and zeroes in request metadata.
 *
 * @param value Original example, default or restriction value.
 * @returns A readable value with an explicit representation for an empty string.
 */
export const formatRequestValue = (value: unknown): string =>
  value === '' ? '""' : formatSchemaValue(value);

/**
 * Collects declared examples independently from defaults and selects relevant union examples.
 *
 * @param schema Display schema for the active branch.
 * @param parameter Optional Path, Query, Header or Cookie parameter.
 * @param composition Whether the current field represents a selected union branch.
 * @returns Unique declared examples, keeping all original examples if none match the selected type.
 */
const getRequestExamples = (
  schema: Schema,
  parameter?: Parameter,
  composition?: RequestComposition,
): unknown[] => {
  const values =
    parameter?.example !== undefined
      ? [parameter.example]
      : parameter?.examples && Object.keys(parameter.examples).length
        ? Object.values(parameter.examples)
            .filter((example) => example.value !== undefined)
            .map((example) => example.value)
        : schema.example !== undefined
          ? [schema.example]
          : (schema.examples ?? []).filter((value) => value !== undefined);
  const matched = composition
    ? values.filter((value) => {
        const type = getRequestType(schema);
        if (type === 'integer') return Number.isInteger(value);
        if (type === 'array') return Array.isArray(value);
        if (type === 'object')
          return value !== null && typeof value === 'object' && !Array.isArray(value);
        return typeof value === type;
      })
    : values;
  return [
    ...new Map(
      (matched.length ? matched : values).map(
        (value) => [`${typeof value}:${formatRequestValue(value)}`, value] as const,
      ),
    ).values(),
  ];
};

/**
 * Converts a request field into a recursive display node with cycle and depth guards.
 *
 * @param name Property name or array/dictionary placeholder.
 * @param raw Original schema for this node.
 * @param key Complete request field path.
 * @param required Whether the containing object requires the field.
 * @param context Current schemas, ancestry, branch selection and consumed recursive references.
 * @param depth Current request-tree nesting level.
 * @param parameter Optional parameter metadata outside the schema.
 * @returns A complete request field with initially expanded child definitions.
 */
export const createRequestField = (
  name: string,
  raw: Schema,
  key: string,
  required: boolean,
  context: RequestTreeContext,
  depth = 0,
  parameter?: Parameter,
): RequestField => {
  const { schema, composition } = prepareRequestSchema(raw, key, context);
  const item = schema.items
    ? prepareRequestSchema(schema.items, `${key}[]`, context).schema
    : undefined;
  const references = [...(schema.references ?? []), ...(item?.references ?? [])];
  const repeatedReference = references.find((reference) => context.ancestors.has(reference));
  const cycle =
    repeatedReference && Boolean(context.recursiveReferences?.size) ? repeatedReference : undefined;
  const nextContext = {
    ...context,
    ancestors: new Set([...context.ancestors, ...references]),
    recursiveReferences: new Set([
      ...(context.recursiveReferences ?? []),
      ...(repeatedReference ? [repeatedReference] : []),
    ]),
  };
  const truncated =
    depth >= 10 && Boolean(schema.properties || schema.items || schema.additionalProperties);
  return {
    children:
      cycle || truncated || schema.unresolvedReference
        ? []
        : createRequestChildren(schema, key, nextContext, depth + 1),
    composition,
    cycle,
    recursive: Boolean(repeatedReference && !cycle),
    depth,
    description: parameter?.description ?? schema.description,
    examples: getRequestExamples(schema, parameter, composition),
    key,
    name,
    parameter,
    required,
    schema,
    truncated,
  };
};

/**
 * Builds object fields, array items and dictionary entries without hiding request constraints.
 *
 * @param schema Parent's selected display schema.
 * @param key Parent field path.
 * @param context Current schema registry and reference ancestry.
 * @param depth Depth assigned to direct children.
 * @returns Request-visible child nodes, excluding read-only and hidden properties.
 */
export const createRequestChildren = (
  schema: Schema,
  key: string,
  context: RequestTreeContext,
  depth = 0,
): RequestField[] => {
  const children = Object.entries(schema.properties ?? {})
    .filter(([, property]) => {
      const resolved = resolveRequestSchema(property, context.schemas);
      return (
        !resolved.hidden &&
        (context.includeReadOnly ||
          (!resolved.readOnly && resolved.accessMode?.toUpperCase() !== 'READ_ONLY'))
      );
    })
    .map(([name, property]) =>
      createRequestField(
        name,
        property,
        `${key}.${name}`,
        schema.required?.includes(name) ?? false,
        context,
        depth,
      ),
    );
  if (schema.prefixItems?.length) {
    children.push(
      ...schema.prefixItems.map((item, index) =>
        createRequestField(`[${index}]`, item, `${key}[${index}]`, false, context, depth),
      ),
    );
  }
  if (schema.items) {
    const itemKey = `${key}[]`;
    const prepared = prepareRequestSchema(schema.items, itemKey, context);
    if (prepared.schema.properties && !prepared.composition && !prepared.schema.sources?.length) {
      children.push(
        ...createRequestChildren(
          prepared.schema,
          itemKey,
          {
            ...context,
            ancestors: new Set([...context.ancestors, ...(prepared.schema.references ?? [])]),
          },
          depth,
        ),
      );
    } else {
      // The array field already entered this item entity; its structural wrapper is not another recursion.
      const itemContext = {
        ...context,
        ancestors: new Set(
          [...context.ancestors].filter(
            (reference) => !prepared.schema.references?.includes(reference),
          ),
        ),
      };
      children.push(createRequestField('[]', schema.items, itemKey, false, itemContext, depth));
    }
  }
  if (schema.additionalProperties !== undefined && schema.additionalProperties !== false) {
    const value =
      typeof schema.additionalProperties === 'object' ? schema.additionalProperties : {};
    children.push(createRequestField('{key}', value, `${key}.{key}`, false, context, depth));
  }
  return children;
};

/**
 * Finds a scalar array item whose metadata belongs inline rather than in an entity subtree.
 *
 * @param field Request field containing an optional array item.
 * @returns The scalar item, or undefined for objects, nested arrays, tuples and unresolved branches.
 */
export const getScalarArrayItem = (field: RequestField): RequestField | undefined => {
  if (getRequestType(field.schema) !== 'array' || field.schema.prefixItems?.length)
    return undefined;
  const item = field.children.length === 1 ? field.children[0] : undefined;
  if (
    !item ||
    item.key !== `${field.key}[]` ||
    item.children.length ||
    item.composition ||
    item.cycle ||
    item.truncated ||
    item.schema.unresolvedReference ||
    ['object', 'array'].includes(getRequestType(item.schema))
  )
    return undefined;
  return item;
};

/**
 * Determines whether a node needs an entity-level disclosure control.
 *
 * @param field Request field to inspect.
 * @returns True only for visible children or an unresolved/depth-limited structure.
 */
export const hasRequestChildren = (field: RequestField): boolean =>
  Boolean(
    (field.children.length && !getScalarArrayItem(field)) ||
    field.schema.unresolvedReference ||
    field.truncated,
  );

/**
 * Formats declared length, numeric and array-size limits without inferring backend validation.
 *
 * @param schema Display schema containing optional bounds.
 * @returns Compact constraint labels, including exclusive bounds when explicitly declared.
 */
export const getRequestRanges = (schema: Schema): string[] => {
  const ranges: string[] = [];
  if (schema.minLength !== undefined && schema.maxLength !== undefined)
    ranges.push(`${schema.minLength}–${schema.maxLength} 字符`);
  else {
    if (schema.minLength !== undefined) ranges.push(`≥ ${schema.minLength} 字符`);
    if (schema.maxLength !== undefined) ranges.push(`≤ ${schema.maxLength} 字符`);
  }
  const minimum =
    typeof schema.exclusiveMinimum === 'number' ? schema.exclusiveMinimum : schema.minimum;
  const maximum =
    typeof schema.exclusiveMaximum === 'number' ? schema.exclusiveMaximum : schema.maximum;
  if (minimum !== undefined)
    ranges.push(
      `${schema.exclusiveMinimum === true || typeof schema.exclusiveMinimum === 'number' ? '>' : '≥'} ${minimum}`,
    );
  if (maximum !== undefined)
    ranges.push(
      `${schema.exclusiveMaximum === true || typeof schema.exclusiveMaximum === 'number' ? '<' : '≤'} ${maximum}`,
    );
  if (schema.minItems !== undefined && schema.maxItems !== undefined)
    ranges.push(`${schema.minItems}–${schema.maxItems} 项`);
  else {
    if (schema.minItems !== undefined) ranges.push(`至少 ${schema.minItems} 项`);
    if (schema.maxItems !== undefined) ranges.push(`最多 ${schema.maxItems} 项`);
  }
  if (schema.multipleOf !== undefined) ranges.push(`${schema.multipleOf} 的倍数`);
  if (schema.minProperties !== undefined) ranges.push(`至少 ${schema.minProperties} 个属性`);
  if (schema.maxProperties !== undefined) ranges.push(`最多 ${schema.maxProperties} 个属性`);
  return ranges;
};
