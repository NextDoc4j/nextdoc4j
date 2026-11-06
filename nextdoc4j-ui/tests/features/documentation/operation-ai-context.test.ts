import { describe, expect, it } from 'vitest';

import { createOperationAiContext } from '../../../src/features/documentation/operation-ai-context';
import type { ApiOperation, OpenApiDocument } from '../../../src/types/openapi';

const document: OpenApiDocument = {
  components: {
    schemas: {
      LoginRequest: {
        properties: {
          account: { description: '登录账号', type: 'string' },
          device: { description: '登录端', enum: ['web', 'app'], type: 'string' },
          password: { description: '登录密码', type: 'string' },
        },
        required: ['account', 'password'],
        type: 'object',
      },
      LoginResponse: {
        properties: {
          token: { description: '访问令牌', type: 'string' },
          user: {
            description: '当前用户',
            properties: {
              id: { description: '用户 ID', type: 'integer' },
              name: { description: '用户名', type: 'string' },
            },
            type: 'object',
          },
        },
        type: 'object',
      },
    },
    securitySchemes: {
      bearer: { bearerFormat: 'JWT', scheme: 'bearer', type: 'http' },
    },
  },
  info: { title: '认证 API', version: '1.0.0' },
  openapi: '3.0.3',
  paths: {},
  servers: [{ url: 'https://api.example.com/' }],
};

const operation: ApiOperation = {
  description: '用户登录，成功后返回访问令牌。',
  group: '认证',
  method: 'post',
  operationId: 'login',
  parameters: [
    {
      description: '租户标识',
      in: 'header',
      name: 'X-Tenant',
      required: true,
      schema: { type: 'string' },
    },
    {
      description: '登录后的跳转地址',
      in: 'query',
      name: 'redirect',
      required: false,
      schema: { type: 'string' },
    },
  ],
  path: '/api/auth/login',
  requestBody: {
    content: {
      'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } },
    },
    description: '登录请求体',
    required: true,
  },
  responses: {
    '200': {
      content: {
        'application/json': { schema: { $ref: '#/components/schemas/LoginResponse' } },
      },
      description: '登录成功',
    },
    '401': {
      content: {
        'application/json': {
          schema: { properties: { message: { type: 'string' } }, type: 'object' },
        },
      },
      description: '账号或密码错误',
    },
  },
  security: [{ bearer: [] }],
  summary: '登录',
  tags: ['认证', '登录'],
  'x-nextdoc4j-security': {
    permissions: [{ mode: 'AND', values: ['user:login'] }],
    roles: [{ mode: 'OR', values: ['admin', 'user'] }],
  },
};

describe('createOperationAiContext', () => {
  it('includes basic information and the complete operation contract', () => {
    const context = createOperationAiContext(operation, document);

    expect(context).toContain('请根据以下接口契约完成前端对接实现');
    expect(context).toContain('## 基础信息');
    expect(context).toContain('- 请求方法：POST');
    expect(context).toContain('- 请求路径：`/api/auth/login`');
    expect(context).toContain('- 接口名称：登录');
    expect(context).toContain('- operationId：`login`');
    expect(context).toContain('- 所属分组：认证 / 登录');
    expect(context).toContain('- Base URL：`https://api.example.com`');
    expect(context).toContain('## 接口契约');
    expect(context).toContain('#### POST `/api/auth/login` · 登录');
    expect(context).toContain('用户登录，成功后返回访问令牌。');
  });

  it('includes OpenAPI security and Sa-Token permission and role rules', () => {
    const context = createOperationAiContext(operation, document);

    expect(context).toContain('**鉴权方式**');
    expect(context).toContain('HTTP Bearer');
    expect(context).toContain('Token 格式为 JWT');
    expect(context).toContain('Sa-Token 权限：user:login');
    expect(context).toContain('Sa-Token 角色：admin 或 user');
  });

  it('includes request parameters, request body fields, enums and examples', () => {
    const context = createOperationAiContext(operation, document);

    expect(context).toContain('**Header 请求头参数**');
    expect(context).toContain('| X-Tenant | string | 是 | 示例值 | 租户标识 |');
    expect(context).toContain('**Query 查询参数**');
    expect(context).toContain('| redirect | string | 否 | 示例值 | 登录后的跳转地址 |');
    expect(context).toContain('**Body 请求体**');
    expect(context).toContain('- 必填：是');
    expect(context).toContain('**Content-Type：`application/json`**');
    expect(context).toContain('**请求体字段**');
    expect(context).toContain('| account | string | 是 | 登录账号 |');
    expect(context).toContain('| device | string | 否 | 登录端<br>**枚举值：**<br>web<br>app |');
  });

  it('includes a runnable curl example and response parameters', () => {
    const context = createOperationAiContext(operation, document);

    expect(context).toContain('**curl 示例**');
    expect(context).toContain('curl -X POST');
    expect(context).toContain('https://api.example.com/api/auth/login');
    expect(context).toContain('**响应参数**');
    expect(context).toContain('**HTTP 200 — 登录成功**');
    expect(context).toContain('| token | string | 否 | 访问令牌 |');
    expect(context).toContain('**错误响应汇总**');
    expect(context).toContain('| 401 | HTTP_401 | 账号或密码错误 |');
  });

  it('marks operations without security requirements as anonymous', () => {
    const context = createOperationAiContext(
      {
        group: '公共',
        method: 'get',
        path: '/health',
        responses: { '200': { description: 'OK' } },
        summary: '健康检查',
      },
      document,
    );

    expect(context).toContain('- 无需鉴权');
  });

  it('falls back to document-level security requirements', () => {
    const context = createOperationAiContext(
      {
        group: '公共',
        method: 'get',
        path: '/profile',
        responses: { '200': { description: 'OK' } },
        summary: '当前用户',
      },
      { ...document, security: [{ bearer: [] }] },
    );

    expect(context).toContain('HTTP Bearer');
    expect(context).not.toContain('- 无需鉴权');
  });

  it('marks Sa-Token ignored operations as public without leaking permission rules', () => {
    const context = createOperationAiContext(
      {
        ...operation,
        security: undefined,
        'x-nextdoc4j-security': { ignore: true },
      },
      document,
    );

    expect(context).toContain('公开接口：Sa-Token 明确标记为跳过校验');
    expect(context).not.toContain('Sa-Token 权限');
    expect(context).not.toContain('Sa-Token 角色');
  });
});
