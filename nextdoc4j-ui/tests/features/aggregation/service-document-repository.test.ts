import { describe, expect, it, vi } from 'vitest';

import type { OpenApiDocument, ServiceDefinition, SwaggerConfig } from '../../../src/types/openapi';
import {
  createServiceDocumentRepository,
  mergeServiceDocuments,
} from '../../../src/features/aggregation/service-document-repository';

const service: ServiceDefinition = { name: '用户服务', url: '/gateway/users/v3/api-docs' };
const mainDocument: OpenApiDocument = {
  components: { schemas: { User: { type: 'object' } } },
  info: { title: 'User API', version: '1.0.0' },
  openapi: '3.0.3',
  paths: {
    '/users': { get: { operationId: 'listUsers', tags: ['用户'] } },
  },
  tags: [{ name: '用户' }],
};
const adminDocument: OpenApiDocument = {
  components: { schemas: { Admin: { type: 'object' }, User: { description: 'group version' } } },
  info: { title: 'Admin API', version: '1.0.0' },
  openapi: '3.0.3',
  paths: {
    '/admins': { get: { operationId: 'listAdmins', tags: ['管理'] } },
    '/users': { get: { operationId: 'groupUserVersion', tags: ['用户'] } },
  },
  tags: [{ name: '管理' }],
};
const serviceConfig: SwaggerConfig = {
  urls: [
    { name: '空分组', url: ' ' },
    { name: '全部接口', url: '/v3/api-docs/all' },
    { name: '管理接口', url: '/v3/api-docs/admin' },
    { name: '重复管理接口', url: '/v3/api-docs/admin' },
    { name: '失败分组', url: '/v3/api-docs/broken' },
    { name: '编码错误分组', url: '/v3/api-docs/%ZZ' },
  ],
};

describe('service document repository', () => {
  it('loads groups independently, deduplicates URLs and preserves usable main documents', async () => {
    const fetchDocument = vi.fn(async (url: string) => {
      if (url.endsWith('/admin')) return adminDocument;
      if (url.endsWith('/broken')) throw new Error('group offline');
      if (url.endsWith('/%ZZ')) throw new Error('invalid group URL');
      return mainDocument;
    });
    const fetchSwaggerConfig = vi.fn(async () => serviceConfig);
    const repository = createServiceDocumentRepository({ fetchDocument, fetchSwaggerConfig });

    const workspace = await repository.loadWorkspace(service, {
      docPath: '/v3/api-docs',
      serviceSwaggerConfigEnabled: true,
    });

    expect(fetchSwaggerConfig).toHaveBeenCalledWith(
      '/gateway/users/v3/api-docs/swagger-config',
      undefined,
      'swagger-config',
    );
    expect(workspace.groupDocuments.map((group) => group.name)).toEqual(['管理接口']);
    expect(workspace.errors).toEqual([
      {
        name: '失败分组',
        reason: 'group offline',
        url: '/gateway/users/v3/api-docs/broken',
      },
      {
        name: '编码错误分组',
        reason: 'invalid group URL',
        url: '/gateway/users/v3/api-docs/%ZZ',
      },
    ]);
    expect(workspace.document.paths?.['/users']?.get?.operationId).toBe('listUsers');
    expect(workspace.document.paths?.['/admins']?.get?.operationId).toBe('listAdmins');
    expect(workspace.document.components?.schemas?.User).toEqual({ type: 'object' });
    expect(workspace.document.components?.schemas?.Admin).toEqual({ type: 'object' });
    expect(fetchDocument).toHaveBeenCalledTimes(4);
  });

  it('deduplicates concurrent service document loads and refreshes after invalidation', async () => {
    const fetchDocument = vi.fn(async () => mainDocument);
    const fetchSwaggerConfig = vi.fn(async () => ({ urls: [] }));
    const repository = createServiceDocumentRepository({ fetchDocument, fetchSwaggerConfig });

    await Promise.all([
      repository.getServiceDocument(service),
      repository.getServiceDocument(service),
    ]);
    expect(fetchDocument).toHaveBeenCalledTimes(1);

    repository.invalidate(service);
    await repository.getServiceDocument(service);
    expect(fetchDocument).toHaveBeenCalledTimes(2);
  });

  it('invalidates a service main document, Swagger Config and loaded group documents together', async () => {
    const fetchDocument = vi.fn(async (url: string) =>
      url.endsWith('/admin') ? adminDocument : mainDocument,
    );
    const fetchSwaggerConfig = vi.fn(async () => ({
      urls: [{ name: '管理接口', url: '/v3/api-docs/admin' }],
    }));
    const repository = createServiceDocumentRepository({ fetchDocument, fetchSwaggerConfig });

    await repository.loadWorkspace(service, {
      docPath: '/v3/api-docs',
      serviceSwaggerConfigEnabled: true,
    });
    repository.invalidate(service);
    await repository.loadWorkspace(service, {
      docPath: '/v3/api-docs',
      serviceSwaggerConfigEnabled: true,
    });

    expect(fetchDocument).toHaveBeenCalledTimes(4);
    expect(fetchSwaggerConfig).toHaveBeenCalledTimes(2);
  });

  it('does not request a service Swagger Config unless the gateway explicitly enables it', async () => {
    const fetchDocument = vi.fn(async () => mainDocument);
    const fetchSwaggerConfig = vi.fn(async () => serviceConfig);
    const repository = createServiceDocumentRepository({ fetchDocument, fetchSwaggerConfig });

    const workspace = await repository.loadWorkspace(service, { docPath: '/v3/api-docs' });

    expect(fetchSwaggerConfig).not.toHaveBeenCalled();
    expect(workspace.groupDocuments).toEqual([]);
    expect(workspace.document).toEqual(mainDocument);
  });

  it('merges standalone documents without mutating their original path and component maps', () => {
    const merged = mergeServiceDocuments(mainDocument, [
      { document: adminDocument, id: 'admin', name: '管理接口', url: '/admin' },
    ]);

    expect(merged.paths).not.toBe(mainDocument.paths);
    expect(merged.components?.schemas).not.toBe(mainDocument.components?.schemas);
    expect(mainDocument.paths?.['/admins']).toBeUndefined();
    expect(mainDocument.components?.schemas?.Admin).toBeUndefined();
  });
});
