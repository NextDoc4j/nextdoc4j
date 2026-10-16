import type { ServiceGroupDocument } from '../aggregation/service-document-repository';
import type { ApiOperation, OpenApiDocument } from '../../types/openapi';
import { getDocumentGroupRouteKeys } from '../../lib/hash-route';
import { getOperations, groupOperations } from '../openapi/utils';

export const allOperationsSourceId = 'all';

export interface DocumentationSource {
  document: OpenApiDocument;
  documentUrl: string;
  groups: Array<[string, ApiOperation[]]>;
  id: string;
  name: string;
  operations: ApiOperation[];
}

/**
 * Converts a main document and its SpringDoc groups into hierarchical navigation sources.
 *
 * @param mainDocument Main single-app or service OpenAPI document.
 * @param groupDocuments Successfully loaded non-all SpringDoc group documents.
 * @param documentUrl Main document or Swagger Config URL used to resolve group route names.
 * @returns Ordered sources containing source-aware tag groups and operations.
 */
export const createDocumentationSources = (
  mainDocument?: OpenApiDocument,
  groupDocuments: ServiceGroupDocument[] = [],
  documentUrl?: string,
): DocumentationSource[] => {
  if (!mainDocument) return [];

  /** Creates one navigation source while retaining its fetch URL for persistent selections.
   * @param id Route-facing group identifier.
   * @param name Display name supplied by Springdoc.
   * @param document Parsed OpenAPI document.
   * @param sourceUrl Stable document fetch identity.
   * @returns Source-aware operations and tag groups.
   */
  const createSource = (
    id: string,
    name: string,
    document: OpenApiDocument,
    sourceUrl: string,
  ): DocumentationSource => {
    const metadata = { sourceGroupId: id, sourceGroupName: name };
    const operations = getOperations(document, metadata);
    return {
      document,
      documentUrl: sourceUrl,
      groups: groupOperations(document, metadata, operations),
      id,
      name,
      operations,
    };
  };

  const groupRouteKeys = getDocumentGroupRouteKeys(groupDocuments, documentUrl);
  return [
    createSource(allOperationsSourceId, '所有接口', mainDocument, documentUrl || '/v3/api-docs'),
    ...groupDocuments.map((group) =>
      createSource(groupRouteKeys.get(group.url)!, group.name, group.document, group.url),
    ),
  ];
};

/**
 * Locates one source-aware operation from fixed Hash route state.
 *
 * @param sources Documentation navigation sources for the current workspace.
 * @param sourceGroupId Route source identifier; omitted values select the all-operations source.
 * @param operationId Unique OpenAPI operation identifier.
 * @param operationPath Exact path used when operationId is unavailable or duplicated.
 * @param operationMethod HTTP method accompanying the exact path.
 * @returns Matching operation, or undefined for a stale or invalid deep link.
 */
export const findDocumentationOperation = (
  sources: DocumentationSource[],
  sourceGroupId?: string,
  operationId?: string,
  operationPath?: string,
  operationMethod?: string,
) => {
  if (!operationId && !operationPath) return undefined;
  const source = sources.find((item) => item.id === (sourceGroupId || allOperationsSourceId));
  return source?.operations.find((operation) =>
    operationId
      ? operation.operationId === operationId
      : operation.path === operationPath && operation.method === operationMethod,
  );
};

/**
 * Creates a unique UI key for an operation whose method and path may repeat across groups.
 *
 * @param operation Source-aware OpenAPI operation.
 * @returns Stable source, method and path identity for selection and React rendering.
 */
export const getDocumentationOperationKey = (operation: ApiOperation) =>
  `${operation.sourceGroupId || allOperationsSourceId}:${operation.method}:${operation.path}`;

/**
 * Identifies one request across the all-document and Springdoc group navigation entries.
 *
 * @param operation Interface whose workspace tab or remembered page is being addressed.
 * @returns Method and path identity within the separately scoped active service.
 */
export const getWorkspaceOperationKey = (operation: ApiOperation) =>
  `${operation.method}:${operation.path}`;

/**
 * Produces a deduplicated overview list, preferring operations from the all-document source.
 *
 * @param sources Documentation sources in display order.
 * @returns Operations unique by HTTP method and path.
 */
export const getWorkspaceOverviewOperations = (sources: DocumentationSource[]) => {
  const seen = new Set<string>();
  return sources.flatMap((source) =>
    source.operations.filter((operation) => {
      const key = `${operation.method}:${operation.path}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }),
  );
};
