import { afterEach, expect, it, vi } from 'vitest';
import {
  createWorkflowRuntime,
  executeWorkflowSteps,
  executePreRequestPipeline,
  executePostResponsePipeline,
  computeRsaPkcs1,
  extractByJsonPath,
} from '../../../src/features/playground/pre-post-engine';
import {
  createWorkflowStep,
  type WorkflowContext,
  type WorkflowStep,
} from '../../../src/features/playground/pre-post-types';
import {
  clearWorkflowSession,
  readWorkflowSession,
  writeWorkflowSession,
} from '../../../src/features/playground/workflow-session';
import { createWorkflowScenario } from '../../fixtures/workflow-scenarios';
import { constants, generateKeyPairSync, privateDecrypt } from 'node:crypto';

/** Creates a disposable test request with explicit shared runtime.
 * @returns Request context and observable callbacks.
 */
const context = (): WorkflowContext => ({
  body: '{"password":"plain","nested":{"value":1}}',
  headers: [],
  queryParams: [],
  runtime: createWorkflowRuntime(),
  onLog: vi.fn(),
  setBody: vi.fn(),
  setHeaders: vi.fn(),
  setQueryParams: vi.fn(),
  origin: 'https://example.com',
  securityKeys: ['BearerAuth'],
  securityValues: {},
  onSecurityValuesChange: vi.fn(),
});
/** Creates one test step with defaults suitable for automatic execution.
 * @param patch Fields selecting its behavior.
 * @returns Enabled step.
 */
const step = (patch: Partial<WorkflowStep>): WorkflowStep => ({
  ...createWorkflowStep('extract', 'pre-request'),
  ...patch,
});

afterEach(() => vi.unstubAllGlobals());

it.each(['auto', 'json', 'urlencoded', 'form-data'] as const)(
  'preserves special characters in %s auxiliary request templates',
  async (requestBodyKind) => {
    const ctx = context();
    const password = 'a"b\\c\n中文';
    ctx.runtime!.flow.password = password;
    ctx.runtime!.flow.count = 2;
    ctx.runtime!.flow.enabled = false;
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}'));
    vi.stubGlobal('fetch', fetchMock);
    await executeWorkflowSteps(
      [
        step({
          type: 'request',
          endpoint: '/login',
          method: 'POST',
          requestBodyKind,
          requestBody:
            '{"password":"{{flow.password}}","count":{{flow.count}},"enabled":{{flow.enabled}}}',
        }),
      ],
      'pre-request',
      ctx,
    );
    const sent = fetchMock.mock.calls[0][1].body;
    if (requestBodyKind === 'json' || requestBodyKind === 'auto')
      expect(JSON.parse(sent)).toEqual({ password, count: 2, enabled: false });
    else {
      expect(sent.get('password')).toBe(password);
      expect(sent.get('count')).toBe('2');
      expect(sent.get('enabled')).toBe('false');
    }
  },
);

it('reads literal dotted variable names in input steps, conditions and templates', async () => {
  const ctx = context();
  ctx.runtime!.flow['captcha.code'] = 'ABCD';
  ctx.runtime!.flow.captcha = { code: 'nested' };
  expect(extractByJsonPath(ctx.runtime!.flow, '$.captcha.code')).toBe('nested');
  expect(extractByJsonPath({ $: 'literal' }, '$')).toEqual({ $: 'literal' });
  const fetchMock = vi.fn().mockResolvedValue(new Response('{}'));
  vi.stubGlobal('fetch', fetchMock);
  await executeWorkflowSteps(
    [
      step({ type: 'input', path: 'captcha.code' }),
      step({
        type: 'extract',
        source: 'flow',
        path: 'captcha.code',
        saveAs: 'code',
        condition: { source: 'flow', path: 'captcha.code', expected: 'ABCD' },
      }),
      step({ type: 'request', endpoint: '/{{flow.captcha.code}}/{{run.code}}' }),
    ],
    'pre-request',
    ctx,
  );
  expect(fetchMock.mock.calls[0][0]).toBe('https://example.com/ABCD/ABCD');
});

it('gets captcha manually, pauses for input and never refreshes it on main sends', async () => {
  const ctx = context();
  const steps = createWorkflowScenario('captcha', 'pre-request');
  steps[0].endpoint = '/captcha';
  const fetchMock = vi
    .fn()
    .mockResolvedValue(
      new Response('{"id":"challenge-1"}', { headers: { 'content-type': 'application/json' } }),
    );
  vi.stubGlobal('fetch', fetchMock);
  await executeWorkflowSteps(steps, 'pre-request', { ...ctx, manualStepId: steps[0].id });
  expect(ctx.runtime!.flow.captcha).toMatchObject({ json: { id: 'challenge-1' } });
  await expect(executePreRequestPipeline({ steps }, ctx)).rejects.toThrow('captchaCode');
  ctx.runtime!.flow.captchaCode = 'ABCD';
  const first = await executePreRequestPipeline({ steps }, ctx);
  const nextRun = createWorkflowRuntime(ctx.runtime!.flow, ctx.runtime!.results);
  const second = await executePreRequestPipeline({ steps }, { ...ctx, runtime: nextRun });
  expect(JSON.parse(first.body)).toMatchObject({ captcha: 'ABCD', uuid: 'challenge-1' });
  expect(second.body).toBe(first.body);
  expect(fetchMock).toHaveBeenCalledOnce();
});

it('shares run variables across visual and script steps and across pre/post phases', async () => {
  const ctx = context();
  await executePreRequestPipeline(
    {
      steps: [
        step({ type: 'extract', source: 'fixed', value: '123', saveAs: 'seed' }),
        step({
          type: 'script',
          scriptCode:
            'nextdoc.variables.set("encoded", nextdoc.crypto.base64Encode(nextdoc.variables.get("seed"))); return 7;',
        }),
        step({
          type: 'write',
          source: 'variable',
          path: 'encoded',
          targetType: 'body',
          targetField: 'nested.value',
        }),
      ],
    },
    ctx,
  );
  expect(ctx.setBody).toHaveBeenCalledWith(expect.stringContaining('MTIz'));
  await executePostResponsePipeline(
    {
      steps: [
        step({
          type: 'extract',
          source: 'variable',
          path: 'encoded',
          saveAs: 'last',
          scope: 'flow',
        }),
      ],
    },
    { ...ctx, response: { status: 200, text: '{}' } },
  );
  expect(ctx.runtime!.flow.last).toBe('MTIz');
});

it('keeps query names case-sensitive and rejects unsafe JSON destinations', async () => {
  const ctx = context();
  ctx.queryParams = [{ name: 'Token', value: 'first', enabled: true }];
  const result = await executePreRequestPipeline(
    {
      steps: [
        step({
          type: 'write',
          source: 'fixed',
          value: 'second',
          targetType: 'query',
          targetField: 'token',
        }),
      ],
    },
    ctx,
  );
  expect(result.queryParams).toHaveLength(2);
  await expect(
    executePreRequestPipeline(
      {
        steps: [
          step({
            type: 'write',
            source: 'fixed',
            value: 'bad',
            targetType: 'body',
            targetField: '__proto__.polluted',
          }),
        ],
      },
      ctx,
    ),
  ).rejects.toThrow('目标路径无效');
});

it('invalidates failed manual request results instead of exposing stale data', async () => {
  const ctx = context();
  const request = step({
    id: 'manual',
    type: 'request',
    trigger: 'manual',
    endpoint: '/captcha',
    saveAs: 'captcha',
    scope: 'flow',
  });
  ctx.runtime!.flow.captcha = { json: { id: 'stale' } };
  ctx.runtime!.results.manual = 'stale';
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
  await expect(
    executeWorkflowSteps([request], 'pre-request', { ...ctx, manualStepId: 'manual' }),
  ).rejects.toThrow('offline');
  expect(ctx.runtime!.flow.captcha).toBeUndefined();
  expect(ctx.runtime!.results.manual).toBeUndefined();
});

it('preserves previous authentication on failed response conditions and missing tokens', async () => {
  const ctx = context();
  const auth = step({
    type: 'security',
    source: 'response',
    path: '$.token',
    targetField: 'BearerAuth',
    condition: { source: 'response', path: 'status', expected: '200' },
  });
  await executePostResponsePipeline(
    { steps: [auth] },
    { ...ctx, response: { status: 401, text: '{}', json: {} } },
  );
  expect(ctx.onSecurityValuesChange).not.toHaveBeenCalled();
  await executePostResponsePipeline(
    { steps: [auth] },
    { ...ctx, response: { status: 200, text: '{}', json: {} } },
  );
  expect(ctx.onSecurityValuesChange).not.toHaveBeenCalled();
  await executePostResponsePipeline(
    { steps: [auth] },
    { ...ctx, response: { status: 200, text: '{}', json: { token: 'new' } } },
  );
  expect(ctx.onSecurityValuesChange).toHaveBeenCalledWith({ BearerAuth: 'new' });
});

it('supports JSON auxiliary bodies and refuses unresolved references', async () => {
  const ctx = context();
  ctx.runtime!.flow.uploadId = 'id-1';
  const fetchMock = vi.fn().mockResolvedValue(new Response('{}'));
  vi.stubGlobal('fetch', fetchMock);
  await executeWorkflowSteps(
    [
      step({
        type: 'request',
        endpoint: '/complete',
        method: 'POST',
        requestBody: '{"uploadId":"{{flow.uploadId}}"}',
      }),
    ],
    'pre-request',
    ctx,
  );
  expect(fetchMock.mock.calls[0][1].body).toBe('{"uploadId":"id-1"}');
  expect(fetchMock.mock.calls[0][1].headers.get('content-type')).toBe('application/json');
  await expect(
    executeWorkflowSteps(
      [step({ type: 'request', endpoint: '/{{flow.missing}}' })],
      'pre-request',
      ctx,
    ),
  ).rejects.toThrow('flow.missing');
  expect(fetchMock).toHaveBeenCalledOnce();
});

it('isolates flow state by service and discards it on reset', () => {
  writeWorkflowSession('a', { flow: { uploadId: 'a' }, results: {} });
  expect(readWorkflowSession('b').flow).toEqual({});
  const copy = readWorkflowSession('a');
  copy.flow.uploadId = 'changed';
  expect(readWorkflowSession('a').flow.uploadId).toBe('a');
  clearWorkflowSession('a');
  expect(readWorkflowSession('a').flow).toEqual({});
});

it.each([false, true])(
  'calls completion only after every file part succeeds (failure=%s)',
  async (failPart) => {
    const ctx = context();
    ctx.files = [{ name: 'file', file: new Blob(['abcdefgh']) }];
    const script = createWorkflowScenario('upload', 'pre-request')[0];
    script.scriptCode = script
      .scriptCode!.replace('const initUrl = "";', 'const initUrl = "/init";')
      .replace('const partUrl = "";', 'const partUrl = "/part";')
      .replace('const completeUrl = "";', 'const completeUrl = "/complete";')
      .replace('5 * 1024 * 1024', '4');
    const calls: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        calls.push(url);
        if (url.endsWith('/init')) return new Response('{"data":{"uploadId":"upload-1"}}');
        if (url.includes('partNumber=2') && failPart)
          return new Response('failed', { status: 500 });
        return new Response('{}', { headers: { etag: 'etag' } });
      }),
    );
    const run = executeWorkflowSteps([script], 'pre-request', { ...ctx, manualStepId: script.id });
    if (failPart) await expect(run).rejects.toThrow('500');
    else await run;
    expect(calls.some((url) => url.endsWith('/complete'))).toBe(!failPart);
    expect(ctx.runtime!.flow.uploadId).toBe('upload-1');
  },
);

it('encrypts RSA PKCS#1 v1.5 with UTF-8 for Java-compatible decryption', async () => {
  const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 1024 });
  const encrypted = await computeRsaPkcs1(
    '密码😀',
    publicKey.export({ type: 'spki', format: 'pem' }).toString(),
  );
  // Inspect the standard PKCS#1 block independently using Node's raw RSA operation.
  const block = privateDecrypt(
    { key: privateKey, padding: constants.RSA_NO_PADDING },
    Buffer.from(encrypted, 'base64'),
  );
  expect([...block.subarray(0, 2)]).toEqual([0, 2]);
  const separator = block.indexOf(0, 2);
  expect(separator).toBeGreaterThanOrEqual(10);
  expect(block.subarray(separator + 1).toString('utf8')).toBe('密码😀');
});
