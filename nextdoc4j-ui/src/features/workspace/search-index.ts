import { getOperations } from '../openapi/utils';
import type { ApiOperation } from '../../types/openapi';
import { createHashRoute, getOperationRoute } from '../../lib/hash-route';
import { allOperationsSourceId, type DocumentationSource } from '../documentation/workspace';

export type SearchSource = Pick<DocumentationSource, 'id' | 'name' | 'document'> & {
  operations?: ApiOperation[];
};

/** Enumerates remote operations one path at a time instead of sorting an entire service on the UI thread.
 * @param source Loaded document with optional existing navigation operations.
 * @returns Lazy operations preserving the owning document's routing semantics.
 */
function* sourceOperations(source: SearchSource): Generator<ApiOperation> {
  if (source.operations) {
    yield* source.operations;
    return;
  }
  const paths = source.document.paths ?? {};
  for (const path in paths) {
    yield* getOperations({ ...source.document, paths: { [path]: paths[path] } });
  }
}

export interface SearchEntry {
  id: string;
  kind: 'api' | 'model' | 'document';
  title: string;
  description?: string;
  operationId?: string;
  tags?: string[];
  content?: string;
  group: string;
  path: string;
  method: string;
  service: string;
  serviceUrl: string;
  route: string;
  text: string;
}

/**
 * Enumerates bounded search metadata, preferring the merged source over duplicate SpringDoc groups.
 * @param sources Loaded service navigation sources, merged source first.
 * @param service Display name of the owning service.
 * @param serviceUrl Service identity; empty for a single application.
 * @returns Lazy rows containing searchable identity, API metadata and model descriptions;
 * parameter and schema-property contents remain outside the search scope.
 */
export function* searchEntries(
  sources: SearchSource[],
  service: string,
  serviceUrl: string,
): Generator<SearchEntry> {
  const seen = new Set<string>();
  for (const source of sources) {
    const sourceGroupId = source.id === allOperationsSourceId ? undefined : source.id;
    for (const operation of sourceOperations(source)) {
      const id = `${serviceUrl}:api:${operation.method}:${operation.path}`;
      if (seen.has(id)) continue;
      seen.add(id);
      const title = operation.summary || operation.path;
      yield {
        id,
        kind: 'api',
        title,
        description: operation.description,
        operationId: operation.operationId,
        tags: operation.tags,
        group: operation.group,
        path: operation.path,
        method: operation.method.toUpperCase(),
        service,
        serviceUrl,
        route: createHashRoute({
          view: 'docs',
          group: operation.group,
          ...getOperationRoute(operation, source.document),
          sourceGroupId,
        }),
        text: `${operation.method} ${operation.path} ${title}`.toLowerCase(),
      };
    }
    for (const name in source.document.components?.schemas ?? {}) {
      const schema = source.document.components!.schemas![name];
      const id = `${serviceUrl}:model:${name}`;
      if (seen.has(id)) continue;
      seen.add(id);
      yield {
        id,
        kind: 'model',
        title: schema.title || name,
        description: schema.description?.trim() || undefined,
        group: source.name,
        path: name,
        method: 'SCHEMA',
        service,
        serviceUrl,
        route: createHashRoute({ view: 'models', modelName: name, sourceGroupId }),
        text: `${name} ${schema.title ?? ''} ${schema.description ?? ''}`.toLowerCase(),
      };
    }
  }
}
