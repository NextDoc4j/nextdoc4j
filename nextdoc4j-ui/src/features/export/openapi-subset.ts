import { getDocumentationOperationKey, type DocumentationSource } from '../documentation/workspace';
import { schemaName } from '../openapi/utils';
import type {
  ApiOperation,
  OpenApiDocument,
  Operation,
  Schema,
  SecurityRequirement,
} from '../../types/openapi';

export type ExportSelection =
  | { kind: 'all' }
  | { kind: 'groups'; sourceIds: string[] }
  | { kind: 'operations'; operationKeys: string[] }
  | { kind: 'tags'; tags: string[] };

/** Copies export data without mutating the loaded document.
 * @param value JSON-compatible document fragment.
 * @returns Independent fragment preserving its JSON representation.
 */
const cloneDocumentValue = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

/**
 * Resolves the operations selected by one export scope inside one documentation source.
 *
 * @param source Current main-document or SpringDoc group source.
 * @param selection Requested all, tag or individual-operation export scope.
 * @returns Operations belonging to the selected source and scope.
 */
export const selectExportOperations = (source: DocumentationSource, selection: ExportSelection) => {
  if (selection.kind === 'all') return source.operations;
  if (selection.kind === 'groups') return [];
  if (selection.kind === 'tags') {
    const selectedTags = new Set(selection.tags);
    return source.operations.filter((operation) => selectedTags.has(operation.group));
  }
  const selectedKeys = new Set(selection.operationKeys);
  return source.operations.filter((operation) =>
    selectedKeys.has(getDocumentationOperationKey(operation)),
  );
};

/**
 * Adds component-schema references reachable through an inline or referenced schema.
 *
 * @param schema Schema currently being traversed.
 * @param allSchemas Complete source-document schema registry.
 * @param selectedNames Mutable set of component schema names included in the subset.
 * @returns Nothing.
 */
const collectSchemaReferences = (
  schema: Schema | undefined,
  allSchemas: Record<string, Schema>,
  selectedNames: Set<string>,
) => {
  if (!schema) return;
  const references = [
    schema.$ref,
    schema.$dynamicRef,
    ...Object.values(schema.discriminator?.mapping ?? {}),
  ];
  for (const reference of references) {
    if (!reference?.startsWith('#/components/schemas/')) continue;
    const referenceName = schemaName({ $ref: reference });
    if (referenceName && allSchemas[referenceName] && !selectedNames.has(referenceName)) {
      selectedNames.add(referenceName);
      collectSchemaReferences(allSchemas[referenceName], allSchemas, selectedNames);
    }
  }
  schema.allOf?.forEach((item) => collectSchemaReferences(item, allSchemas, selectedNames));
  schema.anyOf?.forEach((item) => collectSchemaReferences(item, allSchemas, selectedNames));
  schema.oneOf?.forEach((item) => collectSchemaReferences(item, allSchemas, selectedNames));
  collectSchemaReferences(schema.items, allSchemas, selectedNames);
  collectSchemaReferences(schema.contains, allSchemas, selectedNames);
  if (typeof schema.unevaluatedItems === 'object') {
    collectSchemaReferences(schema.unevaluatedItems, allSchemas, selectedNames);
  }
  schema.prefixItems?.forEach((item) => collectSchemaReferences(item, allSchemas, selectedNames));
  if (typeof schema.additionalProperties === 'object') {
    collectSchemaReferences(schema.additionalProperties, allSchemas, selectedNames);
  }
  Object.values(schema.properties ?? {}).forEach((item) =>
    collectSchemaReferences(item, allSchemas, selectedNames),
  );
};

/**
 * Collects schemas from structural parameter, body, response and header fields only.
 * @param value An operation, parameter, body, response, header or media definition.
 * @param document Source document resolving local component references.
 * @param selectedNames Reachable schema names accumulated by this export.
 * @param visited Component references already traversed, preventing reference cycles.
 * @returns Nothing; extends the schema dependency set without examining example data.
 */
const collectStructuralSchemas = (
  value: unknown,
  document: OpenApiDocument,
  selectedNames: Set<string>,
  visited = new Set<string>(),
): void => {
  if (!value || typeof value !== 'object') return;
  const node = value as Record<string, unknown>;
  if (typeof node.$ref === 'string' && !visited.has(node.$ref)) {
    const match = /^#\/components\/(parameters|requestBodies|responses|headers)\/([^/]+)$/.exec(
      node.$ref,
    );
    if (match) {
      visited.add(node.$ref);
      const kind = match[1] as 'parameters' | 'requestBodies' | 'responses' | 'headers';
      const name = match[2].replaceAll('~1', '/').replaceAll('~0', '~');
      collectStructuralSchemas(
        document.components?.[kind]?.[name],
        document,
        selectedNames,
        visited,
      );
    }
  }
  collectSchemaReferences(
    node.schema as Schema | undefined,
    document.components?.schemas ?? {},
    selectedNames,
  );
  if (Array.isArray(node.parameters)) {
    node.parameters.forEach((item) =>
      collectStructuralSchemas(item, document, selectedNames, visited),
    );
  }
  collectStructuralSchemas(node.requestBody, document, selectedNames, visited);
  for (const key of ['content', 'responses', 'headers']) {
    const children = node[key];
    if (children && typeof children === 'object') {
      Object.values(children).forEach((item) =>
        collectStructuralSchemas(item, document, selectedNames, visited),
      );
    }
  }
};

/**
 * Collects security-scheme names referenced by an operation or its document default.
 *
 * @param operation Raw OpenAPI operation selected for export.
 * @param document Source document containing default security requirements.
 * @param selectedNames Mutable set of security scheme names included in the subset.
 * @returns Nothing.
 */
const collectSecuritySchemeReferences = (
  operation: Operation,
  document: OpenApiDocument,
  selectedNames: Set<string>,
) => {
  const requirements: SecurityRequirement[] = operation.security ?? document.security ?? [];
  requirements.forEach((requirement) => {
    Object.keys(requirement).forEach((name) => selectedNames.add(name));
  });
};

/**
 * Builds an immutable OpenAPI subset for operations from a single service or SpringDoc source.
 *
 * @param document Source OpenAPI document whose metadata is retained in the result.
 * @param operations Source-aware operations selected for export.
 * @returns OpenAPI document containing only selected paths and their reachable dependencies.
 */
export const createOpenApiSubset = (
  document: OpenApiDocument,
  operations: ApiOperation[],
): OpenApiDocument => {
  const sourcePaths = document.paths ?? {};
  const allSchemas = document.components?.schemas ?? {};
  const allSecuritySchemes = document.components?.securitySchemes ?? {};
  const selectedSchemaNames = new Set<string>();
  const selectedSecuritySchemeNames = new Set<string>();
  const selectedTagNames = new Set<string>();
  const paths: NonNullable<OpenApiDocument['paths']> = {};

  operations.forEach((selectedOperation) => {
    const sourceOperation = sourcePaths[selectedOperation.path]?.[selectedOperation.method];
    if (!sourceOperation) return;
    paths[selectedOperation.path] = {
      ...(sourcePaths[selectedOperation.path]?.parameters
        ? { parameters: cloneDocumentValue(sourcePaths[selectedOperation.path].parameters) }
        : {}),
      ...paths[selectedOperation.path],
      [selectedOperation.method]: cloneDocumentValue(sourceOperation),
    };
    sourceOperation.tags?.forEach((tag) => selectedTagNames.add(tag));
    if (!sourceOperation.tags?.length && selectedOperation.group !== 'default') {
      selectedTagNames.add(selectedOperation.group);
    }
    collectStructuralSchemas(sourceOperation, document, selectedSchemaNames);
    collectStructuralSchemas(
      { parameters: sourcePaths[selectedOperation.path]?.parameters },
      document,
      selectedSchemaNames,
    );
    collectSecuritySchemeReferences(sourceOperation, document, selectedSecuritySchemeNames);
  });

  // These component registries are retained, so their schema dependencies must be retained too.
  for (const kind of ['parameters', 'requestBodies', 'responses', 'headers'] as const) {
    Object.values(document.components?.[kind] ?? {}).forEach((item) =>
      collectStructuralSchemas(item, document, selectedSchemaNames),
    );
  }
  const result = cloneDocumentValue(document);
  result.paths = paths;
  const components = { ...(result.components ?? {}) };
  const schemas = Object.fromEntries(
    [...selectedSchemaNames]
      .filter((name) => allSchemas[name])
      .map((name) => [name, cloneDocumentValue(allSchemas[name]!)]),
  );
  const securitySchemes = Object.fromEntries(
    [...selectedSecuritySchemeNames]
      .filter((name) => allSecuritySchemes[name])
      .map((name) => [name, cloneDocumentValue(allSecuritySchemes[name]!)]),
  );

  if (Object.keys(schemas).length) components.schemas = schemas;
  else delete components.schemas;
  if (Object.keys(securitySchemes).length) components.securitySchemes = securitySchemes;
  else delete components.securitySchemes;
  if (Object.keys(components).length) result.components = components;
  else delete result.components;

  const tags = (document.tags ?? []).filter((tag) => selectedTagNames.has(tag.name));
  if (tags.length) result.tags = cloneDocumentValue(tags);
  else delete result.tags;

  return result;
};

/**
 * Produces a download-safe filename for one exported OpenAPI subset format.
 *
 * @param title OpenAPI document title.
 * @param sourceName Selected source-group display name.
 * @param extension File extension without the leading dot.
 * @returns Sanitized filename with a stable NextDoc4j suffix.
 */
export const createExportFileName = (title: string, sourceName: string, extension: string) =>
  `${`${title || 'openapi'}-${sourceName || 'all'}`.replaceAll(/[\\/:*?"<>|]/g, '_')}-nextdoc4j.${extension}`;

/**
 * Produces a download-safe JSON filename for an exported OpenAPI subset.
 *
 * @param title OpenAPI document title.
 * @param sourceName Selected source-group display name.
 * @returns Sanitized JSON filename with a stable NextDoc4j suffix.
 */
export const createOpenApiExportFileName = (title: string, sourceName: string) =>
  createExportFileName(title, sourceName, 'json');
