// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';

import { OperationHeroCard } from '../../src/features/documentation/operation-hero-card';
import type { ApiOperation, OpenApiDocument } from '../../src/types/openapi';

it('copies the complete operation contract from the AI assistant button', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  }));

  const clipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined });
  const execDescriptor = Object.getOwnPropertyDescriptor(document, 'execCommand');
  const copied: string[] = [];
  Object.defineProperty(document, 'execCommand', {
    configurable: true,
    value: vi.fn((command: string) => {
      expect(command).toBe('copy');
      copied.push((document.activeElement as HTMLTextAreaElement).value);
      return true;
    }),
  });

  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);

  try {
    const document: OpenApiDocument = {
      components: {
        schemas: {
          LoginRequest: {
            properties: { account: { type: 'string' } },
            required: ['account'],
            type: 'object',
          },
        },
        securitySchemes: { bearer: { scheme: 'bearer', type: 'http' } },
      },
      servers: [{ url: 'https://api.example.com' }],
    };
    const operation: ApiOperation = {
      group: '认证',
      method: 'post',
      operationId: 'login',
      path: '/api/auth/login',
      requestBody: {
        content: {
          'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } },
        },
        required: true,
      },
      responses: { '200': { description: '登录成功' } },
      security: [{ bearer: [] }],
      summary: '登录',
    };

    await act(async () =>
      root.render(
        <OperationHeroCard
          document={document}
          onOpenPlayground={vi.fn()}
          operation={operation}
          requestPrefix="https://api.example.com"
        />,
      ),
    );

    const button = host.querySelector<HTMLButtonElement>('[aria-label="AI 助手：复制接口信息"]');
    expect(button).not.toBeNull();
    await act(async () => button!.click());

    expect(copied).toHaveLength(1);
    expect(copied[0]).toContain('## 基础信息');
    expect(copied[0]).toContain('- 请求方法：POST');
    expect(copied[0]).toContain('- 请求路径：`/api/auth/login`');
    expect(copied[0]).toContain('## 接口契约');
    expect(copied[0]).toContain('**鉴权方式**');
    expect(copied[0]).toContain('**Body 请求体**');
    expect(copied[0]).toContain('**响应参数**');
    expect(copied[0]).not.toBe('POST /api/auth/login\n接口名称：登录\n接口描述：');
  } finally {
    await act(async () => root.unmount());
    host.remove();
    if (clipboardDescriptor) Object.defineProperty(navigator, 'clipboard', clipboardDescriptor);
    else Reflect.deleteProperty(navigator, 'clipboard');
    if (execDescriptor) Object.defineProperty(document, 'execCommand', execDescriptor);
    else Reflect.deleteProperty(document, 'execCommand');
    vi.unstubAllGlobals();
  }
});
