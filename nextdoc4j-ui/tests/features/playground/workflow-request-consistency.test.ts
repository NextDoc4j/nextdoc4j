import { afterEach, expect, it, vi } from 'vitest';
import {
  computeAes128Cbc,
  computeAesCbc,
  executePreRequestPipeline,
  executeWorkflowSteps,
} from '../../../src/features/playground/pre-post-engine';
import {
  createWorkflowStep,
  type WorkflowContext,
  type WorkflowStep,
} from '../../../src/features/playground/pre-post-types';
import { buildDebugRequest } from '../../../src/features/playground/request';

/** Creates a request snapshot with optional transport-specific data.
 * @param patch Request fields and callbacks for the scenario.
 * @returns Isolated context suitable for execution.
 */
const context = (patch: Partial<WorkflowContext> = {}): WorkflowContext => ({
  body: '{}',
  bodyKind: 'json',
  headers: [],
  queryParams: [],
  onLog: vi.fn(),
  setBody: vi.fn(),
  setHeaders: vi.fn(),
  setQueryParams: vi.fn(),
  origin: 'https://api.example.com',
  ...patch,
});
/** Creates an enabled workflow operation for the scenario.
 * @param patch Operation-specific fields.
 * @returns Step with a unique identity.
 */
const step = (patch: Partial<WorkflowStep>): WorkflowStep => ({
  ...createWorkflowStep('write', 'pre-request'),
  ...patch,
});

afterEach(() => vi.unstubAllGlobals());

it.each(['form-data', 'urlencoded'] as const)(
  'writes %s fields and path parameters without changing the draft',
  async (bodyKind) => {
    const original = [{ name: 'name', value: 'before', enabled: true }];
    const result = await executePreRequestPipeline(
      {
        steps: [
          step({
            source: 'fixed',
            value: '张三 & +',
            targetType: bodyKind === 'form-data' ? 'form' : 'urlencoded',
            targetField: 'name',
          }),
          step({ source: 'fixed', value: 'a/b', targetType: 'path', targetField: 'id' }),
          step({
            type: 'script',
            scriptCode: `nextdoc.request.${bodyKind === 'form-data' ? 'formFields' : 'urlEncodedFields'}.set('copy', nextdoc.request.${bodyKind === 'form-data' ? 'formFields' : 'urlEncodedFields'}.get('name'));`,
          }),
        ],
      },
      context({ bodyKind, formFields: original, urlEncodedFields: original }),
    );
    const request = buildDebugRequest({
      ...result,
      bodyKind,
      apiBase: '',
      origin: 'https://api.example.com',
      method: 'post',
      path: '/users/{id}',
      bodyText: result.body,
    });
    expect(request.url.pathname).toBe('/users/a%2Fb');
    expect((request.body as FormData | URLSearchParams).get('name')).toBe('张三 & +');
    expect((request.body as FormData | URLSearchParams).get('copy')).toBe('张三 & +');
    expect(original[0].value).toBe('before');
  },
);

it.each(['raw', 'xml'] as const)(
  'replaces the entire %s body and exposes it to scripts',
  async (bodyKind) => {
    const text = '<name>张三</name>';
    const result = await executePreRequestPipeline(
      {
        steps: [
          step({ source: 'fixed', value: text, targetType: 'text' }),
          step({
            type: 'script',
            scriptCode: 'nextdoc.request.body.setText(nextdoc.request.body.text() + "\\n");',
          }),
        ],
      },
      context({ bodyKind, body: 'original' }),
    );
    expect(result.body).toBe(text + '\n');
  },
);

it('applies pre-request authentication to the current request and retains earlier scheme values', async () => {
  const result = await executePreRequestPipeline(
    {
      steps: [
        step({ type: 'security', source: 'fixed', value: 'new-token', targetField: 'BearerAuth' }),
        step({ type: 'script', scriptCode: 'nextdoc.security.setToken("ApiKey", "new-key");' }),
      ],
    },
    context({
      securityKeys: ['BearerAuth', 'ApiKey'],
      securityValues: { BearerAuth: 'old-token', ApiKey: 'old-key' },
      securitySchemes: {
        BearerAuth: { type: 'http', scheme: 'bearer' },
        ApiKey: { type: 'apiKey', in: 'query', name: 'api_key' },
      },
      headers: [{ name: 'Authorization', value: 'Bearer old-token', enabled: true }],
    }),
  );
  expect(result.headers).toContainEqual({
    name: 'Authorization',
    value: 'Bearer new-token',
    enabled: true,
  });
  expect(result.queryParams).toContainEqual({ name: 'api_key', value: 'new-key', enabled: true });
  expect(result.securityValues).toEqual({ BearerAuth: 'new-token', ApiKey: 'new-key' });
});

it.each(['urlencoded', 'form-data'] as const)(
  'sends an auxiliary %s body with repeated fields and correct content type',
  async (requestBodyKind) => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}'));
    vi.stubGlobal('fetch', fetchMock);
    await executePreRequestPipeline(
      {
        steps: [
          step({
            type: 'request',
            method: 'POST',
            endpoint: '/form',
            requestBodyKind,
            requestBody: '{"name":"张三 & +","tag":["a","b"]}',
            inheritHeaders: true,
          }),
        ],
      },
      context({ headers: [{ name: 'Content-Type', value: 'application/json', enabled: true }] }),
    );
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect((init.body as URLSearchParams | FormData).getAll('tag')).toEqual(['a', 'b']);
    expect((init.body as URLSearchParams | FormData).get('name')).toBe('张三 & +');
    expect(new Headers(init.headers).get('content-type')).toBe(
      requestBodyKind === 'form-data' ? null : 'application/x-www-form-urlencoded;charset=UTF-8',
    );
  },
);

it.each(['json', 'text'] as const)(
  'preserves scalar auxiliary %s bodies',
  async (requestBodyKind) => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}'));
    vi.stubGlobal('fetch', fetchMock);
    await executePreRequestPipeline(
      {
        steps: [
          step({
            type: 'request',
            endpoint: '/value',
            method: 'POST',
            requestBodyKind,
            requestBody: '"hello"',
          }),
        ],
      },
      context(),
    );
    expect(fetchMock.mock.calls[0][1].body).toBe('"hello"');
  },
);

it('keeps a fresh HTTP error available after a failed auxiliary step and honors opt-in continuation', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async () =>
        new Response('{"code":"expired"}', { status: 401, headers: { 'x-error': 'auth' } }),
    ),
  );
  const request = step({
    id: 'auth',
    type: 'request',
    endpoint: '/auth',
    failurePolicy: 'continue',
  });
  const result = await executePreRequestPipeline(
    {
      steps: [
        request,
        step({
          type: 'extract',
          source: 'result',
          resultStepId: 'auth',
          path: 'json.code',
          saveAs: 'reason',
        }),
      ],
    },
    context(),
  );
  expect(result.runtime.variables.reason).toBe('expired');
  expect(result.runtime.results.auth).toMatchObject({
    status: 401,
    headers: { 'x-error': 'auth' },
    text: '{"code":"expired"}',
  });
  await expect(
    executePreRequestPipeline({ steps: [{ ...request, failurePolicy: 'abort' }] }, context()),
  ).rejects.toMatchObject({ response: { status: 401, json: { code: 'expired' } } });
  await expect(
    executePreRequestPipeline(
      { steps: [{ ...request, failurePolicy: 'abort', allowHttpErrors: true }] },
      context(),
    ),
  ).resolves.toMatchObject({ runtime: { results: { auth: { status: 401 } } } });
});

it('lets scripts inspect HTTP errors without treating a network failure as an HTTP response', async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(new Response('denied', { status: 403 }))
    .mockRejectedValueOnce(new TypeError('offline'));
  vi.stubGlobal('fetch', fetchMock);
  const result = await executePreRequestPipeline(
    {
      steps: [
        step({
          type: 'script',
          scriptCode: `
    try { await nextdoc.sendRequest({ url: '/auth' }); }
    catch (error) { nextdoc.variables.set('error', error.response); }
    try { await nextdoc.sendRequest({ url: '/auth', allowHttpErrors: true }); }
    catch (error) { nextdoc.variables.set('networkErrorHasResponse', Boolean(error.response)); }
  `,
        }),
      ],
    },
    context(),
  );
  expect(result.runtime.variables.error).toMatchObject({ status: 403, text: 'denied' });
  expect(result.runtime.variables.networkErrorHasResponse).toBe(false);
});

it('rejects missing or incorrectly sized AES parameters instead of using implicit defaults', async () => {
  await expect(computeAesCbc('plain')).rejects.toThrow('不能为空');
  expect(() => computeAes128Cbc('plain', 'short', '1234567890123456')).toThrow('16');
});

it('rejects manual writes that would otherwise report success while discarding the changes', async () => {
  const write = step({
    source: 'fixed',
    value: 'new',
    targetType: 'header',
    targetField: 'X-Value',
  });
  await expect(
    executeWorkflowSteps([write], 'pre-request', context({ manualStepId: write.id })),
  ).rejects.toThrow('手动步骤不能修改主请求');
});
