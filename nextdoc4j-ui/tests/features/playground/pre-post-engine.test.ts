import { createCipheriv, createHash } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  computeMd5,
  computeSha256,
  computeAes128Cbc,
  computeAesCbc,
  executePostResponsePipeline,
  executePreRequestPipeline,
  executeWorkflowSteps,
  extractByJsonPath,
} from '../../../src/features/playground/pre-post-engine';

const preContext = () => ({
  body: '{"password":"plain"}',
  headers: [],
  queryParams: [],
  onLog: vi.fn(),
  setBody: vi.fn(),
  setHeaders: vi.fn(),
  setQueryParams: vi.fn(),
});

afterEach(() => vi.unstubAllGlobals());

describe('pre/post workflow engine', () => {
  it('runs extraction, transformation and request write in order', async () => {
    const context = preContext();
    let headers: Array<{ enabled: boolean; name: string; value: string }> = [];
    await executeWorkflowSteps(
      [
        {
          id: 'extract',
          name: '提取',
          type: 'extract',
          enabled: true,
          failurePolicy: 'abort',
          source: 'response',
          path: '$.token',
          saveAs: 'token',
        },
        {
          id: 'encode',
          name: '编码',
          type: 'transform',
          enabled: true,
          failurePolicy: 'abort',
          source: 'variable',
          path: 'token',
          algorithm: 'base64',
          saveAs: 'encoded',
        },
        {
          id: 'write',
          name: '写入',
          type: 'write',
          enabled: true,
          failurePolicy: 'abort',
          source: 'variable',
          path: 'encoded',
          targetType: 'header',
          targetField: 'X-Token',
        },
      ],
      'pre-request',
      {
        ...context,
        response: { json: { token: 'hello' }, status: 200, text: '{"token":"hello"}' },
        setHeaders: (value) => {
          headers = value;
        },
      },
    );
    expect(headers).toEqual([{ enabled: true, name: 'X-Token', value: 'aGVsbG8=' }]);
  });

  it('continues after a failed step when configured', async () => {
    const onLog = vi.fn();
    await executeWorkflowSteps(
      [
        {
          id: 'bad',
          name: '缺失字段',
          type: 'extract',
          enabled: true,
          failurePolicy: 'continue',
          source: 'response',
          path: '$.missing',
          saveAs: 'x',
        },
        {
          id: 'good',
          name: '断言',
          type: 'assert',
          enabled: true,
          failurePolicy: 'abort',
          source: 'response',
          path: 'status',
          sourcePart: 'status',
          operator: 'equals',
          expectedValue: '200',
        },
      ],
      'post-response',
      {
        body: '',
        headers: [],
        queryParams: [],
        response: { json: {}, status: 200, text: '{}' },
        onLog,
        setBody: vi.fn(),
        setHeaders: vi.fn(),
        setQueryParams: vi.fn(),
      },
    );
    expect(onLog).toHaveBeenCalled();
  });

  it('supports JSONPath and script cancellation', async () => {
    expect(extractByJsonPath({ body: { token: 'x' } }, '$.body.token')).toBe('x');
    const controller = new AbortController();
    vi.useFakeTimers();
    try {
      const running = executePreRequestPipeline(
        {
          steps: [
            {
              id: 'script',
              name: '脚本',
              type: 'script',
              enabled: true,
              failurePolicy: 'abort',
              scriptCode:
                'await new Promise(resolve => setTimeout(resolve, 100)); nextdoc.request.body.set("password", "late");',
            },
          ],
        },
        { ...preContext(), signal: controller.signal },
      );
      const rejection = expect(running).rejects.toMatchObject({ name: 'AbortError' });
      controller.abort();
      await rejection;
      await vi.advanceTimersByTimeAsync(100);
    } finally {
      vi.useRealTimers();
    }
  });

  it('runs post-response scripts with the new configuration shape', async () => {
    const onSecurityValuesChange = vi.fn();
    await executePostResponsePipeline(
      {
        steps: [
          {
            id: 'script',
            name: '脚本',
            type: 'script',
            enabled: true,
            failurePolicy: 'abort',
            scriptCode: 'nextdoc.security.setToken("auth", "token");',
          },
        ],
      },
      {
        response: { status: 200, json: {}, text: '{}' },
        securityValues: {},
        securityKeys: ['auth'],
        onSecurityValuesChange,
        onLog: vi.fn(),
      },
    );
    expect(onSecurityValuesChange).toHaveBeenCalledWith({ auth: 'token' });
  });
});

it.each(['token', '$.token'])('reads variable path %s', async (path) => {
  const context = preContext();
  await executeWorkflowSteps(
    [
      {
        id: '1',
        name: '提取',
        type: 'extract',
        source: 'fixed',
        value: '中文',
        saveAs: 'token',
        enabled: true,
        failurePolicy: 'abort',
      },
      {
        id: '2',
        name: '写入',
        type: 'write',
        source: 'variable',
        path,
        targetType: 'header',
        targetField: 'X-Token',
        enabled: true,
        failurePolicy: 'abort',
      },
    ],
    'pre-request',
    context,
  );
  expect(context.setHeaders).toHaveBeenCalledWith([
    { enabled: true, name: 'X-Token', value: '中文' },
  ]);
});

it('round trips UTF-8 base64 including emoji', async () => {
  const context = preContext();
  await executePreRequestPipeline(
    {
      steps: [
        {
          id: 'script',
          name: '脚本',
          type: 'script',
          enabled: true,
          failurePolicy: 'abort',
          scriptCode:
            'nextdoc.request.body.set(nextdoc.crypto.base64Decode(nextdoc.crypto.base64Encode("中文😀")));',
        },
      ],
    },
    context,
  );
  expect(context.setBody).toHaveBeenCalledWith(JSON.stringify('中文😀'));
});

it('stops failed post steps without rejecting the received response', async () => {
  const context = {
    response: { status: 200, json: {}, text: '{}' },
    securityValues: {},
    securityKeys: ['auth'],
    onLog: vi.fn(),
    onSecurityValuesChange: vi.fn(),
  };
  await expect(
    executePostResponsePipeline(
      {
        steps: [
          {
            id: '1',
            name: '断言',
            type: 'assert',
            source: 'response',
            path: 'status',
            sourcePart: 'status',
            expectedValue: '201',
            enabled: true,
            failurePolicy: 'abort',
          },
          {
            id: '2',
            name: '认证',
            type: 'write',
            source: 'fixed',
            value: 'unexpected',
            targetType: 'security',
            enabled: true,
            failurePolicy: 'abort',
          },
        ],
      },
      context,
    ),
  ).resolves.toBeUndefined();
  expect(context.onLog).toHaveBeenCalledWith(expect.objectContaining({ status: 'fail' }));
  expect(context.onSecurityValuesChange).not.toHaveBeenCalled();
});

it('keeps HTTP metadata separate from JSON fields and supports nested arrays', async () => {
  const context = {
    ...preContext(),
    response: {
      status: 200,
      text: 'raw',
      json: { status: 'SUCCESS', text: 'body text', items: [{ token: 'nested' }] },
    },
  };
  await executeWorkflowSteps(
    [
      ...[
        ['status', '200'],
        ['text', 'raw'],
        ['$.status', 'SUCCESS'],
        ['$.text', 'body text'],
        ['$.items[0].token', 'nested'],
      ].map(([path, expectedValue]) => ({
        id: path,
        name: path,
        type: 'assert' as const,
        source: 'response' as const,
        sourcePart:
          path === 'status'
            ? ('status' as const)
            : path === 'text'
              ? ('text' as const)
              : ('body' as const),
        path,
        expectedValue,
        enabled: true,
        failurePolicy: 'abort' as const,
      })),
    ],
    'post-response',
    context,
  );
  expect(context.onLog.mock.calls.every(([entry]) => entry.status === 'pass')).toBe(true);
});

it('uses service routing and credentials for post-response child requests', async () => {
  const fetchMock = vi.fn().mockResolvedValue(new Response('{}'));
  vi.stubGlobal('fetch', fetchMock);
  await executePostResponsePipeline(
    {
      steps: [
        {
          id: '1',
          name: '请求',
          type: 'request',
          endpoint: '/auth',
          enabled: true,
          failurePolicy: 'abort',
        },
      ],
    },
    {
      apiBase: '/api',
      origin: 'https://example.com',
      requestPrefix: '/service-a',
      sendBrowserCredentials: true,
      response: { status: 200, text: '{}' },
      securityValues: {},
      securityKeys: ['auth'],
      onLog: vi.fn(),
      onSecurityValuesChange: vi.fn(),
    },
  );
  expect(fetchMock).toHaveBeenCalledWith(
    'https://example.com/api/service-a/auth',
    expect.objectContaining({ credentials: 'include' }),
  );
});

it.each(['', 'abc', '中文😀', 'a'.repeat(55), 'b'.repeat(64), 'c'.repeat(129)])(
  'matches independent hash and AES vectors for %j',
  async (input) => {
    expect(computeMd5(input)).toBe(createHash('md5').update(input).digest('hex'));
    expect(computeSha256(input)).toBe(createHash('sha256').update(input).digest('hex'));
    const key = '1234567890123456';
    const iv = '6543210987654321';
    const cipher = createCipheriv('aes-128-cbc', key, iv);
    const expected = Buffer.concat([cipher.update(input, 'utf8'), cipher.final()]).toString(
      'base64',
    );
    expect(computeAes128Cbc(input, key, iv)).toBe(expected);
    expect(await computeAesCbc(input, key, iv)).toBe(expected);
  },
);
