import type { OpenApiDocument, SwaggerConfig } from '../../src/types/openapi';

export const emptyDocument: OpenApiDocument = {
  info: { title: 'Empty API', version: '1.0.0' },
  openapi: '3.0.3',
  paths: {},
};

export const orderedDocument: OpenApiDocument = {
  components: {
    schemas: {
      'User/Profile~v1': {
        properties: {
          id: { type: 'integer' },
        },
        type: 'object',
      },
      TreeNode: {
        properties: {
          children: {
            items: { $ref: '#/components/schemas/TreeNode' },
            type: 'array',
          },
        },
        type: 'object',
      },
    },
  },
  info: { title: 'Fixture API', version: '1.0.0' },
  openapi: '3.0.3',
  paths: {
    '/health': {
      get: {
        operationId: 'health',
        summary: 'Health check',
        'x-order': 30,
      },
    },
    '/system/config': {
      post: {
        operationId: 'saveConfig',
        summary: 'Save config',
        tags: ['系统管理'],
        'x-order': 10,
      },
    },
    '/users/{id}': {
      get: {
        operationId: 'getUser',
        parameters: [
          {
            description: 'Display name keyword',
            in: 'query',
            name: 'keyword',
            schema: { type: 'string' },
          },
        ],
        summary: 'Get user',
        tags: ['用户管理'],
        'x-order': 20,
      },
    },
  },
  tags: [
    { name: '用户管理', 'x-order': 20 },
    { name: '系统管理', 'x-order': 10 },
  ],
};

export const composedDocument: OpenApiDocument = {
  components: {
    schemas: {
      BaseAudit: {
        properties: {
          createdAt: { description: '创建时间', format: 'date-time', type: 'string' },
        },
        type: 'object',
      },
      CreateUserRequest: {
        allOf: [
          { $ref: '#/components/schemas/BaseAudit' },
          {
            properties: {
              role: {
                description: '用户角色',
                enum: ['ADMIN', 'USER'],
                type: 'string',
              },
            },
            type: 'object',
          },
        ],
      },
      SearchResult: {
        oneOf: [
          { $ref: '#/components/schemas/UserResult' },
          { $ref: '#/components/schemas/TeamResult' },
        ],
      },
      TeamResult: {
        properties: { teamId: { type: 'string' } },
        type: 'object',
      },
      TreeNode: {
        properties: {
          children: {
            items: { $ref: '#/components/schemas/TreeNode' },
            type: 'array',
          },
        },
        type: 'object',
      },
      UserResult: {
        properties: {
          displayName: { description: '供检索的显示名称', type: 'string' },
        },
        type: 'object',
      },
    },
  },
  info: { title: 'Composed API', version: '1.0.0' },
  openapi: '3.0.3',
  paths: {
    '/search': {
      get: {
        operationId: 'search',
        responses: {
          '200': {
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SearchResult' },
              },
            },
            description: '搜索结果',
          },
        },
        summary: '搜索用户或团队',
        tags: ['搜索'],
      },
    },
  },
};

export const debugDocument: OpenApiDocument = {
  components: {
    schemas: {
      UploadResult: {
        properties: {
          fileId: { type: 'string' },
          originalName: { type: 'string' },
        },
        type: 'object',
      },
    },
  },
  info: { title: 'Debug API', version: '1.0.0' },
  openapi: '3.0.3',
  paths: {
    '/events': {
      get: {
        operationId: 'subscribeEvents',
        responses: {
          '200': {
            content: {
              'text/event-stream': {
                schema: { type: 'string' },
              },
            },
            description: '持续推送任务进度',
          },
        },
        summary: '订阅事件',
        tags: ['调试'],
      },
    },
    '/files': {
      post: {
        operationId: 'uploadFiles',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                properties: { source: { type: 'string' } },
                type: 'object',
              },
            },
            'application/x-www-form-urlencoded': {
              schema: {
                properties: { source: { type: 'string' } },
                type: 'object',
              },
            },
            'multipart/form-data': {
              schema: {
                properties: {
                  attachment: { format: 'binary', type: 'string' },
                  note: { type: 'string' },
                },
                type: 'object',
              },
            },
          },
          required: true,
        },
        responses: {
          '200': {
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/UploadResult' },
              },
              'application/xml': {
                schema: { type: 'string' },
              },
            },
            description: '上传成功',
          },
        },
        summary: '上传文件',
        tags: ['调试'],
      },
    },
  },
};

export const aggregationGatewayDocument: OpenApiDocument = {
  'x-nextdoc4j-aggregation': {
    aggregation: true,
    docPath: '/v3/api-docs',
    serviceSwaggerConfigEnabled: true,
  },
  info: { title: 'Gateway API', version: '1.0.0' },
  openapi: '3.0.3',
  paths: {},
};

export const aggregationSwaggerConfig: SwaggerConfig = {
  urls: [
    { name: '系统服务', url: '/system/v3/api-docs', 'x-order': 10 },
    { name: '用户服务', url: '/users/v3/api-docs', 'x-order': 20 },
    { disabled: true, name: '不可用服务', reason: 'maintenance', url: '/offline/v3/api-docs' },
  ],
};

export const unavailableAggregationSwaggerConfig: SwaggerConfig = {
  urls: aggregationSwaggerConfig.urls?.map((service) => ({
    ...service,
    disabled: true,
    reason: service.reason || 'probe failed',
    status: 'DOWN',
  })),
};
