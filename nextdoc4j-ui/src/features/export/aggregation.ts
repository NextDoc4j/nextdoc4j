import type { OpenApiDocument, Paths, Schema, SecurityScheme } from '../../types/openapi';
import type { AggregationExportDocument } from './types';

/**
 * Creates an independent JSON-compatible copy before merging service export documents.
 *
 * @template T JSON-compatible document value type.
 * @param document Source document value that must remain unchanged.
 * @returns Deep-cloned document value suitable for merge operations.
 */
const cloneDocument = <T>(document: T): T => JSON.parse(JSON.stringify(document)) as T;

/**
 * Combines selected service OpenAPI subsets into one aggregation export document.
 *
 * @param documents Dependency-complete OpenAPI subsets selected from aggregation services.
 * @returns A merged document, or undefined when no service document is available for export.
 */
export const mergeAggregationExportDocuments = (
  documents: AggregationExportDocument[],
): OpenApiDocument | undefined => {
  const firstDocument = documents[0]?.document;
  if (!firstDocument) return undefined;

  const paths: Paths = {};
  const schemas: Record<string, Schema> = {};
  const securitySchemes: Record<string, SecurityScheme> = {};
  const tags = new Map<string, NonNullable<OpenApiDocument['tags']>[number]>();

  documents.forEach(({ document }) => {
    Object.entries(document.paths ?? {}).forEach(([path, pathItem]) => {
      paths[path] = { ...paths[path], ...cloneDocument(pathItem) };
    });
    Object.entries(document.components?.schemas ?? {}).forEach(([name, schema]) => {
      schemas[name] ??= cloneDocument(schema);
    });
    Object.entries(document.components?.securitySchemes ?? {}).forEach(([name, scheme]) => {
      securitySchemes[name] ??= cloneDocument(scheme);
    });
    document.tags?.forEach((tag) => tags.set(tag.name, cloneDocument(tag)));
  });

  const result = cloneDocument(firstDocument);
  result.paths = paths;
  result.components = {
    ...result.components,
    ...(Object.keys(schemas).length > 0 ? { schemas } : {}),
    ...(Object.keys(securitySchemes).length > 0 ? { securitySchemes } : {}),
  };
  if (!Object.keys(result.components).length) delete result.components;
  result.tags = [...tags.values()];
  if (!result.tags.length) delete result.tags;
  result.info = {
    ...result.info,
    title: `${firstDocument.info?.title || 'Nextdoc4j'} 聚合接口规范文档`,
  };
  return result;
};
