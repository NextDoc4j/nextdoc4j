import { createServer } from 'node:http';

const port = Number(process.env.NEXTDOC4J_FIXTURE_PORT || 8010);

const responseSchema = {
  properties: {
    code: { example: '0', type: 'string' },
    data: { type: 'object' },
    message: { example: 'ok', type: 'string' },
  },
  type: 'object',
};

/**
 * Builds a minimal OpenAPI document for one fixture service or SpringDoc group.
 *
 * @param title Human-readable API title.
 * @param path OpenAPI operation path.
 * @param operationId Stable operation identifier.
 * @param tag Primary OpenAPI tag.
 * @returns OpenAPI 3.0 document used by compatibility browser tests.
 */
const createDocument = (title, path, operationId, tag) => ({
  components: {
    schemas: {
      ApiResponse: responseSchema,
    },
    securitySchemes: {
      BearerAuth: { bearerFormat: 'JWT', scheme: 'bearer', type: 'http' },
    },
  },
  info: { description: `${title} compatibility fixture`, title, version: '1.0.0' },
  openapi: '3.0.3',
  paths: {
    [path]: {
      get: {
        operationId,
        responses: {
          200: {
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } },
            },
            description: 'OK',
          },
        },
        security: [{ BearerAuth: [] }],
        summary: `${title} operation`,
        tags: [tag],
      },
    },
  },
  tags: [{ name: tag }],
});

const gatewayDocument = {
  'x-nextdoc4j': {
    markdown: [
      {
        content: '# 聚合兼容 Fixture\n\n该文档由本地协议 Fixture Server 提供。',
        displayName: 'Fixture 说明',
        group: '网关文档',
      },
    ],
  },
  'x-nextdoc4j-aggregation': {
    aggregation: true,
    docPath: '/v3/api-docs',
    serviceSwaggerConfigEnabled: true,
  },
  components: {
    securitySchemes: {
      GatewayKey: { in: 'header', name: 'X-Gateway-Key', type: 'apiKey' },
    },
  },
  info: { title: 'Compatibility Gateway', version: '1.0.0' },
  openapi: '3.0.3',
  paths: {},
};

const gatewayConfig = {
  urls: [
    { name: '用户服务', url: '/services/users/v3/api-docs', 'x-order': 10 },
    { name: '系统服务', url: '/services/system/v3/api-docs', 'x-order': 20 },
    { name: '故障服务', url: '/services/offline/v3/api-docs', 'x-order': 30 },
  ],
  'x-nextdoc4j-gateway': {
    globalSecuritySchemes: {
      TenantKey: { in: 'query', name: 'tenant_key', type: 'apiKey' },
    },
  },
};

const documents = new Map([
  ['/v3/api-docs', gatewayDocument],
  ['/v3/api-docs/swagger-config', gatewayConfig],
  [
    '/services/users/v3/api-docs',
    createDocument('User Service', '/users', 'listUsers', '用户管理'),
  ],
  [
    '/services/users/v3/api-docs/swagger-config',
    {
      urls: [
        { name: '全部用户接口', url: '/v3/api-docs/all' },
        { name: '用户管理分组', url: '/v3/api-docs/admin' },
      ],
    },
  ],
  [
    '/services/users/v3/api-docs/admin',
    createDocument('User Admin Group', '/users/admin', 'listUserAdmins', '用户管理'),
  ],
  [
    '/services/system/v3/api-docs',
    createDocument('System Service', '/system/health', 'systemHealth', '系统管理'),
  ],
  ['/services/system/v3/api-docs/swagger-config', { urls: [] }],
]);

/**
 * Writes a JSON response for a fixture API endpoint.
 *
 * @param response Node HTTP response object.
 * @param statusCode HTTP response status.
 * @param body JSON-serializable response value.
 * @returns Nothing.
 */
const writeJson = (response, statusCode, body) => {
  response.writeHead(statusCode, {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json; charset=utf-8',
  });
  response.end(JSON.stringify(body));
};

const server = createServer((request, response) => {
  const path = new URL(request.url || '/', `http://${request.headers.host}`).pathname;
  if (path.startsWith('/services/offline/')) {
    writeJson(response, 503, { message: 'Fixture service unavailable' });
    return;
  }
  const document = documents.get(path);
  if (!document) {
    writeJson(response, 404, { message: `Fixture endpoint not found: ${path}` });
    return;
  }
  writeJson(response, 200, document);
});

server.listen(port, '127.0.0.1', () => {
  process.stdout.write(`Nextdoc4j compatibility fixture listening on http://127.0.0.1:${port}\n`);
});
