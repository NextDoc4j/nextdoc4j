import { decodeJsonPointerToken } from '../openapi/utils';
import { prepareRequestSchema, resolveRequestSchema, getRequestTypeLabel } from './request-schema';
import type { MediaDefinition, OpenApiDocument, Schema } from '../../types/openapi';

export interface ResponseSchemaContext {
  query: string;
  schemas: Record<string, Schema>;
  variants: Map<string, number>;
}

/**
 * Resolves local response, request, parameter and example references without fetching documents.
 *
 * @param raw Inline or referenced response, request body, parameter, header or named example.
 * @param components Registries from the active document.
 * @param trail References already followed, used to stop cyclic component aliases.
 * @returns Resolved metadata with inline overrides, or a visible unresolved-reference marker.
 */
export const resolveResponseReference = <T extends { $ref?: string }>(
  raw: T,
  components: OpenApiDocument['components'],
  trail = new Set<string>(),
): T & { unresolvedReference?: string } => {
  if (!raw.$ref) return raw;
  const reference = raw.$ref;
  const parts = reference.slice(2).split('/');
  const category = parts[1];
  const name = parts[2] === undefined ? undefined : decodeJsonPointerToken(parts[2]);
  const registry =
    category === 'responses'
      ? components?.responses
      : category === 'headers'
        ? components?.headers
        : category === 'examples'
          ? components?.examples
          : category === 'parameters'
            ? components?.parameters
            : category === 'requestBodies'
              ? components?.requestBodies
              : undefined;
  const target =
    reference.startsWith('#/components/') &&
    parts.length === 3 &&
    name &&
    registry &&
    Object.hasOwn(registry, name)
      ? registry[name]
      : undefined;
  if (!target || trail.has(reference)) return { ...raw, unresolvedReference: reference };
  const inline = { ...raw };
  delete inline.$ref;
  return {
    ...resolveResponseReference(target as unknown as T, components, new Set(trail).add(reference)),
    ...inline,
  };
};

/**
 * Gets the first explicit response example independently of synthesized JSON examples.
 *
 * @param definition Media or header metadata declaring an example or named examples.
 * @param components Registries used to resolve named-example references.
 * @param exampleKey Optional named example selected in the JSON panel.
 * @returns The first declared value, preserving null, false, zero and empty strings.
 */
export const getResponseExample = (
  definition: Pick<MediaDefinition, 'example' | 'examples'> | undefined,
  components: OpenApiDocument['components'],
  exampleKey?: string,
): unknown => {
  if (definition?.example !== undefined) return definition.example;
  if (exampleKey && definition?.examples && Object.hasOwn(definition.examples, exampleKey))
    return resolveResponseReference(definition.examples[exampleKey], components).value;
  for (const raw of Object.values(definition?.examples ?? {})) {
    const example = resolveResponseReference(raw, components);
    if (example.value !== undefined) return example.value;
  }
  return undefined;
};

/**
 * Reads one original example property without treating strings or inherited keys as objects.
 *
 * @param value Parent example object or array.
 * @param key Property name or array index.
 * @returns The declared child value, or undefined when it is absent.
 */
export const getResponseExampleProperty = (value: unknown, key: string | number): unknown =>
  value !== null && typeof value === 'object' && Object.hasOwn(value, key)
    ? (value as Record<string | number, unknown>)[key]
    : undefined;

/**
 * Preserves response-visible properties, including fields generated only by the server.
 *
 * @param raw Original field schema.
 * @param schemas Active component schemas.
 * @returns False for hidden or write-only fields; read-only fields remain visible.
 */
export const isResponseFieldVisible = (raw: Schema, schemas: Record<string, Schema>): boolean => {
  const schema = resolveRequestSchema(raw, schemas);
  return !schema.hidden && !schema.writeOnly && schema.accessMode?.toUpperCase() !== 'WRITE_ONLY';
};

/**
 * Finds a field or matching descendant in the currently selected response branches.
 *
 * @param raw Original field schema.
 * @param path Full field path.
 * @param context Current query, models and selected composition branches.
 * @param seen References already visited during the search.
 * @param depth Current nesting depth, bounded consistently with the rendered tree.
 * @returns Whether this field or a visible descendant matches the query.
 */
export const matchesResponseSchema = (
  raw: Schema,
  path: string,
  context: ResponseSchemaContext,
  seen = new Set<string>(),
  depth = 0,
): boolean => {
  const query = context.query.trim().toLowerCase();
  if (!query) return true;
  const { schema } = prepareRequestSchema(raw, path, context);
  if (
    [
      path,
      schema.description,
      schema.referenceName,
      schema.title,
      getRequestTypeLabel(schema, context.schemas),
    ].some((value) => value?.toLowerCase().includes(query))
  )
    return true;
  if (depth >= 10 || schema.references?.some((reference) => seen.has(reference))) return false;
  const next = new Set([...seen, ...(schema.references ?? [])]);
  return (
    Object.entries(schema.properties ?? {}).some(
      ([name, value]) =>
        isResponseFieldVisible(value, context.schemas) &&
        matchesResponseSchema(value, `${path}.${name}`, context, next, depth + 1),
    ) ||
    Boolean(
      schema.items && matchesResponseSchema(schema.items, `${path}[]`, context, next, depth + 1),
    ) ||
    Boolean(
      schema.prefixItems?.some(
        (item, index) =>
          isResponseFieldVisible(item, context.schemas) &&
          matchesResponseSchema(item, `${path}[${index}]`, context, next, depth + 1),
      ),
    ) ||
    Boolean(
      schema.additionalProperties &&
      isResponseFieldVisible(
        typeof schema.additionalProperties === 'object' ? schema.additionalProperties : {},
        context.schemas,
      ) &&
      matchesResponseSchema(
        typeof schema.additionalProperties === 'object' ? schema.additionalProperties : {},
        `${path}.{key}`,
        context,
        next,
        depth + 1,
      ),
    )
  );
};
