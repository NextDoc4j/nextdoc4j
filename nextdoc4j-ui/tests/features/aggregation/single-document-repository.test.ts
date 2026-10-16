import { describe, expect, it, vi } from 'vitest';

import type { OpenApiDocument, SwaggerConfig } from '../../../src/types/openapi';
import { createSingleDocumentRepository } from '../../../src/features/aggregation/single-document-repository';

const mainDocument: OpenApiDocument = {
  components: { schemas: { User: { type: 'object' } } },
  info: { title: 'Single API', version: '1.0.0' },
  openapi: '3.0.3',
  paths: { '/users': { get: { operationId: 'listUsers' } } },
};
const groupDocument: OpenApiDocument = {
  components: { schemas: { Admin: { type: 'object' } } },
  info: { title: 'Admin Group', version: '1.0.0' },
  openapi: '3.0.3',
  paths: { '/admins': { get: { operationId: 'listAdmins' } } },
};
const config: SwaggerConfig = {
  urls: [
    { name: '全部接口', url: '/v3/api-docs/all' },
    { name: '管理接口', url: '/v3/api-docs/admin' },
    { name: '重复管理接口', url: '/v3/api-docs/admin' },
    { name: '失败分组', url: '/v3/api-docs/broken' },
    { name: '编码错误分组', url: '/v3/api-docs/%ZZ' },
  ],
};

describe('single document repository', () => {
  it('uses Swagger Config only as direct group-document URLs in single-app mode', async () => {
    const fetchDocument = vi.fn(async (url: string) => {
      if (url === '/v3/api-docs/admin') return groupDocument;
      if (url === '/v3/api-docs/broken') throw new Error('group unavailable');
      if (url === '/v3/api-docs/%ZZ') throw new Error('invalid group URL');
      return mainDocument;
    });
    const fetchSwaggerConfig = vi.fn(async () => config);
    const repository = createSingleDocumentRepository({ fetchDocument, fetchSwaggerConfig });

    const workspace = await repository.loadWorkspace(mainDocument, config);

    expect(workspace.groupDocuments.map((group) => group.url)).toEqual(['/v3/api-docs/admin']);
    expect(workspace.errors).toEqual([
      {
        name: '失败分组',
        reason: 'group unavailable',
        url: '/v3/api-docs/broken',
      },
      {
        name: '编码错误分组',
        reason: 'invalid group URL',
        url: '/v3/api-docs/%ZZ',
      },
    ]);
    expect(workspace.document.paths?.['/admins']?.get?.operationId).toBe('listAdmins');
    expect(fetchDocument).toHaveBeenCalledTimes(3);
  });

  it('deduplicates direct document and Swagger Config requests', async () => {
    const fetchDocument = vi.fn(async () => mainDocument);
    const fetchSwaggerConfig = vi.fn(async () => config);
    const repository = createSingleDocumentRepository({ fetchDocument, fetchSwaggerConfig });

    await Promise.all([
      repository.getDocument('/v3/api-docs'),
      repository.getDocument('/v3/api-docs'),
    ]);
    await Promise.all([
      repository.getSwaggerConfig('/v3/api-docs/swagger-config'),
      repository.getSwaggerConfig('/v3/api-docs/swagger-config'),
    ]);

    expect(fetchDocument).toHaveBeenCalledTimes(1);
    expect(fetchSwaggerConfig).toHaveBeenCalledTimes(1);
  });
});
