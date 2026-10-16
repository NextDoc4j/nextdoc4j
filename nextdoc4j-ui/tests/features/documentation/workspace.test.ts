import { describe, expect, it } from 'vitest';

import type { OpenApiDocument } from '../../../src/types/openapi';
import {
  allOperationsSourceId,
  createDocumentationSources,
  findDocumentationOperation,
  getDocumentationOperationKey,
  getWorkspaceOverviewOperations,
} from '../../../src/features/documentation/workspace';

const mainDocument: OpenApiDocument = {
  info: { title: 'Main', version: '1.0.0' },
  openapi: '3.0.3',
  paths: {
    '/users': { get: { operationId: 'list', tags: ['用户'] } },
  },
};
const groupDocument: OpenApiDocument = {
  info: { title: 'Admin', version: '1.0.0' },
  openapi: '3.0.3',
  paths: {
    '/admins': { get: { operationId: 'list', tags: ['用户'] } },
    '/users': { get: { operationId: 'groupList', tags: ['用户'] } },
  },
};

describe('documentation workspace sources', () => {
  const sources = createDocumentationSources(mainDocument, [
    { document: groupDocument, id: 'service:admin', name: '管理分组', url: '/admin' },
  ]);

  it('builds all and SpringDoc source levels before tag groups', () => {
    expect(sources.map((source) => source.name)).toEqual(['所有接口', '管理分组']);
    expect(sources[0]?.groups[0]?.[0]).toBe('用户');
    expect(sources[1]?.operations[0]?.sourceGroupId).toBe('admin');
  });

  it('locates duplicate operation ids only inside the requested source', () => {
    expect(findDocumentationOperation(sources, allOperationsSourceId, 'list')?.path).toBe('/users');
    expect(findDocumentationOperation(sources, 'admin', 'list')?.path).toBe('/admins');
    expect(findDocumentationOperation(sources, undefined, 'list')?.path).toBe('/users');
  });

  it('uses source-aware UI keys and deduplicates overview methods and paths', () => {
    const mainOperation = sources[0]!.operations[0]!;
    const groupOperation = sources[1]!.operations.find((operation) => operation.path === '/users')!;

    expect(getDocumentationOperationKey(mainOperation)).not.toBe(
      getDocumentationOperationKey(groupOperation),
    );
    expect(getWorkspaceOverviewOperations(sources).map((operation) => operation.path)).toEqual([
      '/users',
      '/admins',
    ]);
  });
});
