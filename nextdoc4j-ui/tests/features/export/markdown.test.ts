import { describe, expect, it } from 'vitest';

import { createOpenApiHtml } from '../../../src/features/export/html';
import { createOpenApiMarkdown } from '../../../src/features/export/markdown';
import { createOpenApiWordBlob } from '../../../src/features/export/word';
import type { OpenApiDocument } from '../../../src/types/openapi';

const document: OpenApiDocument = {
  components: {
    schemas: {
      LoginRequest: {
        properties: { account: { description: '登录账号', type: 'string' } },
        required: ['account'],
        type: 'object',
      },
    },
    securitySchemes: { bearer: { scheme: 'bearer', type: 'http' } },
  },
  info: { description: '认证服务', title: '认证 API', version: '1.0.0' },
  openapi: '3.0.3',
  paths: {
    '/login': {
      post: {
        'x-nextdoc4j-security': { ignore: true },
        operationId: 'login',
        requestBody: {
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } },
          },
        },
        responses: { '200': { description: '登录成功' } },
        summary: '登录',
      },
    },
  },
};

describe('OpenAPI Markdown and HTML export', () => {
  it('renders operation, Sa-Token metadata, schemas and examples as Markdown', () => {
    const markdown = createOpenApiMarkdown(document);

    expect(markdown).toContain('# 认证 API');
    expect(markdown).toContain('- [分组：默认分组](#分组-默认分组)');
    expect(markdown).toContain('#### POST `/login` · 登录');
    expect(markdown).toContain('公开接口：Sa-Token 明确标记为跳过校验');
    expect(markdown).toContain('### LoginRequest');
    expect(markdown).toContain('"account": "示例值"');
    expect(markdown).toContain('curl -X POST');
  });

  it('wraps the Markdown document in printable standalone HTML without raw source markup', () => {
    const html = createOpenApiHtml(document);

    expect(html).toContain('<!doctype html>');
    expect(html).toContain('<title>认证 API</title>');
    expect(html).toContain('<h1 id="认证-api">认证 API</h1>');
    expect(html).toContain('@media print');
  });

  it('creates a non-empty Word document through the lazy export module', async () => {
    const blob = await createOpenApiWordBlob(document);

    expect(blob.type).toBe(
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );
    expect(blob.size).toBeGreaterThan(0);
  });
});
