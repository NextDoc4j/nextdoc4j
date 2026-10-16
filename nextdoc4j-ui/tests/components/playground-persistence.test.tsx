// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { createWorkflowScenario } from '../fixtures/workflow-scenarios';
import { createWorkflowStep } from '../../src/features/playground/pre-post-types';
import {
  clearWorkflowSession,
  readWorkflowSession,
  writeWorkflowSession,
} from '../../src/features/playground/workflow-session';
import { generateKeyPairSync, privateDecrypt, webcrypto } from 'node:crypto';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Playground } from '../../src/features/playground/playground';
import { clearPlaygroundFileCache } from '../../src/features/playground/file-memory';
import { operationIdentity, scopeToken } from '../../src/features/workspace/storage/identity';
import {
  prepareOperation,
  patchOperationDraft,
  flushPending,
  readOperationDraft,
  clearOperationDrafts,
} from '../../src/features/workspace/storage/repository';
import type { ApiOperation, OpenApiDocument } from '../../src/types/openapi';

let changeBody: ((value: string) => void) | undefined;
let bodyFieldMeta: import('../../src/components/code-editor').CodeEditorProps['getFieldMeta'];
vi.mock('../../src/components/code-editor', () => ({
  CodeEditor: (props: import('../../src/components/code-editor').CodeEditorProps) => {
    if (props.onChange) bodyFieldMeta = props.getFieldMeta;
    if (props.onChange) changeBody = props.onChange;
    return <pre data-testid="editor">{props.value}</pre>;
  },
}));
const scope = { appId: 'playground-ui', serviceKey: 'single-app' };
const operation: ApiOperation = {
  method: 'post',
  path: '/users',
  group: 'users',
  requestBody: { content: { 'application/json': { schema: { type: 'object' } } } },
  responses: {},
};
const document: OpenApiDocument = { paths: { '/users': { post: operation } } };
const identity = operationIdentity(scope, 'post', '/users');
const variants = new Map<string, number>();
let root: ReturnType<typeof createRoot>;
let host: HTMLDivElement;
const props = {
  cacheRevision: 0,
  debugTab: 'body' as const,
  debugBody: 'json' as const,
  onDebugRouteChange: vi.fn(),
  document,
  editableGlobalHeaders: [],
  editableGlobalQueryParams: [],
  globalHeaders: [],
  globalQueryParams: [],
  onClose: vi.fn(),
  onGlobalHeadersChange: vi.fn(),
  onGlobalQueryParamsChange: vi.fn(),
  onSecurityValuesChange: vi.fn(),
  operation,
  requestPrefix: '',
  storageScope: scopeToken(scope),
  requestVariants: variants,
  securityValues: {},
};
beforeEach(async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal('CSS', { escape: (value: string) => value });
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe = vi.fn();
      disconnect = vi.fn();
      unobserve = vi.fn();
    },
  );
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  clearPlaygroundFileCache();
  clearWorkflowSession(scopeToken(scope));
  sessionStorage.clear();
  host = window.document.createElement('div');
  window.document.body.append(host);
  root = createRoot(host);
  await clearOperationDrafts(identity);
  await prepareOperation(identity);
  patchOperationDraft(identity, {
    bodies: {
      'application/json': { body: '{"saved":true}', formFields: [], urlEncodedFields: [] },
    },
    common: { headers: [], pathParams: [], queryParams: [] },
  });
  await flushPending();
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  await flushPending();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it('selects the image view and returns to formatted response after closing its preview', async () => {
  const image =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6NfQAAAAASUVORK5CYII=';
  const fetchMock = vi
    .fn()
    .mockResolvedValue(
      new Response(JSON.stringify({ image }), { headers: { 'Content-Type': 'application/json' } }),
    );
  vi.stubGlobal('fetch', fetchMock);
  await act(async () =>
    root.render(
      <Playground {...props} debugCacheEnabled requestPrefix="https://example.test/api" />,
    ),
  );
  await act(async () => {
    host.querySelector<HTMLButtonElement>('.playground-endpoint__send')!.click();
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
  });
  expect(host.querySelector('.playground-response__image-count')).not.toBeNull();
  const group = host.querySelector('[aria-label="响应内容格式"]')!;
  const raw = [...group.querySelectorAll<HTMLButtonElement>('button')].find(
    (button) => button.textContent === '原始',
  )!;
  const images = [...group.querySelectorAll<HTMLButtonElement>('button')].find((button) =>
    button.textContent?.includes('图片'),
  )!;
  const pretty = [...group.querySelectorAll<HTMLButtonElement>('button')].find(
    (button) => button.textContent === '格式化',
  )!;
  expect(images.querySelector('svg')).toBeNull();
  await act(async () => raw.click());
  await act(async () => images.click());
  expect(images.getAttribute('aria-checked')).toBe('true');
  expect(window.document.querySelector('.image-dialog')).not.toBeNull();
  await act(async () =>
    window.document.querySelector<HTMLButtonElement>('.image-dialog__close-btn')!.click(),
  );
  expect(window.document.querySelector('.image-dialog')).toBeNull();
  expect(pretty.getAttribute('aria-checked')).toBe('true');
  expect(images.getAttribute('aria-checked')).toBe('false');
  expect(fetchMock).toHaveBeenCalledOnce();
});

describe('debug cache toggle and entry continuity', () => {
  it.each([undefined, 'params'] as const)(
    'opens a body-only interface on JSON instead of an inferred empty params tab: %s',
    async (savedTab) => {
      const onChange = vi.fn();
      await act(async () =>
        root.render(
          <Playground
            {...props}
            debugCacheEnabled
            debugTab={savedTab}
            debugBody={undefined}
            onDebugRouteChange={onChange}
          />,
        ),
      );
      const tabs = host.querySelector('[aria-label="请求配置区域"]')!;
      expect(tabs.querySelector('[aria-checked="true"]')?.textContent).toContain('Body');
      expect(host.querySelector('[data-testid="editor"]')).not.toBeNull();
      expect(onChange).toHaveBeenCalledWith({
        debugTab: 'body',
        debugBody: 'json',
        debugTabExplicit: false,
      });
      const params = [...tabs.querySelectorAll('button')].find((button) =>
        button.textContent?.includes('Params'),
      )!;
      await act(async () => params.click());
      expect(onChange).toHaveBeenLastCalledWith({
        debugTab: 'params',
        debugBody: 'json',
        debugTabExplicit: true,
      });
      await act(async () =>
        root.render(
          <Playground
            {...props}
            debugCacheEnabled
            debugTab="params"
            debugTabExplicit
            onDebugRouteChange={onChange}
          />,
        ),
      );
      expect(tabs.querySelector('[aria-checked="true"]')?.textContent).toContain('Params');
    },
  );

  it('reconciles an old draft against the previous definition before the first display of the latest document', async () => {
    const oldOperation: ApiOperation = {
      ...operation,
      requestBody: {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: { name: { type: 'string' }, keep: { type: 'string' } },
            },
          },
        },
      },
    };
    const nextOperation: ApiOperation = {
      ...operation,
      requestBody: {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: { nameNana: { type: 'string' }, keep: { type: 'string' } },
            },
          },
        },
      },
    };
    patchOperationDraft(identity, {
      bodies: {
        'application/json': {
          body: '{"name":"old","keep":"edited"}',
          formFields: [],
          urlEncodedFields: [],
        },
      },
    });
    await flushPending();
    await act(async () =>
      root.render(
        <Playground
          {...props}
          operation={nextOperation}
          previousDocument={{ paths: { '/users': { post: oldOperation } } }}
          document={{ paths: { '/users': { post: nextOperation } } }}
          debugCacheEnabled
        />,
      ),
    );
    const body = JSON.parse(host.querySelector('[data-testid="editor"]')!.textContent!);
    expect(body).not.toHaveProperty('name');
    expect(body).toHaveProperty('nameNana');
    expect(body.keep).toBe('edited');
  });

  it.each([true, false])(
    'updates active debug input on a new referenced schema without a remount (cache %s)',
    async (enabled) => {
      const original = {
        ...operation,
        requestBody: {
          content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } },
        },
      };
      const oldDocument: OpenApiDocument = {
        paths: { '/users': { post: original } },
        components: {
          schemas: {
            User: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                keep: { type: 'string' },
                deleted: { type: 'string' },
              },
            },
          },
        },
      };
      await act(async () =>
        root.render(
          <Playground
            {...props}
            operation={original}
            document={oldDocument}
            debugCacheEnabled={enabled}
          />,
        ),
      );
      await act(async () =>
        changeBody?.('{"name":"old","keep":"my input","deleted":"remove","custom":"retain"}'),
      );
      const newDocument: OpenApiDocument = {
        ...oldDocument,
        components: {
          schemas: {
            User: {
              type: 'object',
              properties: {
                nameNana: { type: 'string' },
                keep: { type: 'string' },
                added: { type: 'boolean', default: true },
              },
            },
          },
        },
      };
      await act(async () =>
        root.render(
          <Playground
            {...props}
            operation={original}
            document={newDocument}
            debugCacheEnabled={enabled}
          />,
        ),
      );
      const displayed = JSON.parse(host.querySelector('[data-testid="editor"]')!.textContent!);
      expect(displayed).toMatchObject({ keep: 'my input', custom: 'retain', added: true });
      expect(displayed).toHaveProperty('nameNana');
      expect(displayed).not.toHaveProperty('name');
      expect(displayed).not.toHaveProperty('deleted');
      await flushPending();
      if (enabled)
        expect(JSON.parse(readOperationDraft(identity)!.bodies['application/json'].body)).toEqual(
          displayed,
        );
    },
  );

  it('refreshes declared query rows without losing custom parameters or edited unchanged values', async () => {
    const row = (name: string, value: string) => ({ name, value, enabled: true });
    patchOperationDraft(identity, {
      common: {
        headers: [],
        pathParams: [],
        queryParams: [row('old', 'obsolete'), row('keep', 'edited'), row('custom', 'manual')],
      },
    });
    await flushPending();
    const oldOperation: ApiOperation = {
      ...operation,
      parameters: [
        { in: 'query', name: 'old', schema: { type: 'string' } },
        { in: 'query', name: 'keep', schema: { type: 'string' } },
      ],
    };
    await act(async () =>
      root.render(<Playground {...props} operation={oldOperation} debugCacheEnabled />),
    );
    const nextOperation: ApiOperation = {
      ...oldOperation,
      parameters: [
        { in: 'query', name: 'new', schema: { type: 'string', default: 'default' } },
        { in: 'query', name: 'keep', schema: { type: 'string' } },
      ],
    };
    await act(async () =>
      root.render(<Playground {...props} operation={nextOperation} debugCacheEnabled />),
    );
    await flushPending();
    expect(readOperationDraft(identity)?.common?.queryParams).toEqual([
      row('keep', 'edited'),
      row('custom', 'manual'),
      row('new', 'default'),
    ]);
  });
  it('does not erase inputs on disable and persists edits when re-enabled', async () => {
    await act(async () => root.render(<Playground {...props} debugCacheEnabled />));
    expect(host.textContent).toContain('{"saved":true}');
    await act(async () => root.render(<Playground {...props} debugCacheEnabled={false} />));
    expect(host.textContent).toContain('{"saved":true}');
    await act(async () => changeBody?.('{"temporary":true}'));
    await flushPending();
    expect(readOperationDraft(identity)?.bodies['application/json'].body).toBe('{"saved":true}');
    await act(async () => root.render(<Playground {...props} debugCacheEnabled />));
    await flushPending();
    expect(host.textContent).toContain('{"temporary":true}');
    expect(readOperationDraft(identity)?.bodies['application/json'].body).toBe(
      '{"temporary":true}',
    );
  });

  it('preserves editing when only the document-group entry changes', async () => {
    await act(async () => root.render(<Playground {...props} debugCacheEnabled />));
    await act(async () => changeBody?.('{"editing":true}'));
    await act(async () =>
      root.render(
        <Playground
          {...props}
          operation={{ ...operation, sourceGroupId: 'users' }}
          debugCacheEnabled
        />,
      ),
    );
    expect(host.textContent).toContain('{"editing":true}');
    await flushPending();
    expect(readOperationDraft(identity)?.bodies['application/json'].body).toBe('{"editing":true}');
  });

  it('starts with defaults when disabled and restores saved input on enabling without edits', async () => {
    await act(async () => root.render(<Playground {...props} debugCacheEnabled={false} />));
    expect(host.textContent).not.toContain('{"saved":true}');
    await act(async () => root.render(<Playground {...props} debugCacheEnabled />));
    expect(host.textContent).toContain('{"saved":true}');
  });
});

it('saves pre-request edits made immediately after clearing the draft', async () => {
  await act(async () =>
    root.render(
      <Playground {...props} debugCacheEnabled debugTab="pre-request" debugTabExplicit />,
    ),
  );
  await clearOperationDrafts(identity);
  await act(async () =>
    root.render(
      <Playground
        {...props}
        debugCacheEnabled
        debugTab="pre-request"
        debugTabExplicit
        cacheRevision={1}
      />,
    ),
  );
  const add = [...host.querySelectorAll('button')].find((button) =>
    button.textContent?.includes('添加步骤'),
  );
  expect(host.querySelector<HTMLButtonElement>('[aria-label="清空当前流程"]')?.disabled).toBe(true);
  expect(add).toBeDefined();
  await act(async () => add!.click());
  await act(async () =>
    [...window.document.querySelectorAll<HTMLButtonElement>('[role="option"]')]
      .find((button) => button.textContent === '转换数据')!
      .click(),
  );
  await flushPending();
  expect(readOperationDraft(identity)?.session?.preRequestConfig?.steps).toHaveLength(1);
  expect(host.querySelector<HTMLButtonElement>('[aria-label="清空当前流程"]')?.disabled).toBe(
    false,
  );
});

it('clears workflows for an inactive service without clearing other service workflows', async () => {
  const otherScope = { ...scope, serviceKey: 'other-service' };
  const otherIdentity = operationIdentity(otherScope, operation.method, operation.path);
  await prepareOperation(otherIdentity);
  for (const [target, name] of [
    [identity, 'original-step'],
    [otherIdentity, 'other-step'],
  ] as const) {
    patchOperationDraft(target, {
      session: {
        overrides: {},
        preRequestConfig: {
          steps: [
            {
              id: name,
              name,
              type: 'extract',
              source: 'fixed',
              value: 'token',
              enabled: true,
              failurePolicy: 'abort',
            },
          ],
        },
      },
    });
  }
  await act(async () =>
    root.render(
      <Playground
        key="original"
        {...props}
        debugCacheEnabled
        debugTab="pre-request"
        debugTabExplicit
      />,
    ),
  );
  expect(host.querySelector('input[value="original-step"]')).not.toBeNull();
  await act(async () =>
    root.render(
      <Playground
        key="other"
        {...props}
        storageScope={scopeToken(otherScope)}
        debugCacheEnabled
        debugTab="pre-request"
        debugTabExplicit
      />,
    ),
  );
  expect(host.querySelector('input[value="other-step"]')).not.toBeNull();
  await clearOperationDrafts(scope);
  // The application also clears session storage in its scoped legacy-cache cleanup.
  sessionStorage.clear();
  clearPlaygroundFileCache(scope);
  await act(async () =>
    root.render(
      <Playground
        key="original-again"
        {...props}
        debugCacheEnabled
        debugTab="pre-request"
        debugTabExplicit
      />,
    ),
  );
  expect(host.querySelector('input[value="original-step"]')).toBeNull();
  await act(async () =>
    root.render(
      <Playground
        key="other-again"
        {...props}
        storageScope={scopeToken(otherScope)}
        debugCacheEnabled
        debugTab="pre-request"
        debugTabExplicit
      />,
    ),
  );
  expect(host.querySelector('input[value="other-step"]')).not.toBeNull();
});

it('sends fresh RSA ciphertext on repeated sends while preserving the editable and persisted draft', async () => {
  vi.stubGlobal('crypto', webcrypto);
  const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 1024 });
  const fetchMock = vi
    .fn()
    .mockImplementation(
      async () => new Response('{}', { headers: { 'content-type': 'application/json' } }),
    );
  vi.stubGlobal('fetch', fetchMock);
  patchOperationDraft(identity, {
    bodies: {
      'application/json': {
        body: '{"username":"user","password":"123"}',
        formFields: [],
        urlEncodedFields: [],
      },
    },
    session: {
      overrides: {},
      preRequestConfig: {
        steps: [
          {
            id: 'rsa',
            name: '转换数据',
            type: 'transform',
            enabled: true,
            failurePolicy: 'abort',
            source: 'request',
            path: '$.password',
            algorithm: 'rsa-oaep',
            rsaHash: 'SHA-1',
            rsaPublicKey: publicKey.export({ type: 'spki', format: 'pem' }).toString(),
            saveAs: 'password',
          },
          {
            id: 'write',
            name: '写入请求',
            type: 'write',
            enabled: true,
            failurePolicy: 'abort',
            source: 'request',
            path: '$.password',
            targetType: 'body',
            targetField: 'password',
          },
        ],
      },
    },
  });
  await act(async () =>
    root.render(
      <Playground {...props} debugCacheEnabled debugTab="pre-request" debugTabExplicit />,
    ),
  );
  const send = [...host.querySelectorAll('button')].find(
    (button) => button.textContent?.trim() === '发送',
  )!;
  expect(send).toBeDefined();
  await act(async () => {
    send.click();
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  });
  expect(JSON.parse(fetchMock.mock.calls[0][1].body).password).toBe('123');
  const bind = [...host.querySelectorAll('button')].find((button) =>
    button.textContent?.includes('使用转换结果：password'),
  )!;
  await act(async () => bind.click());
  await act(async () => {
    send.click();
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });
  const sent = JSON.parse(fetchMock.mock.calls[1][1].body);
  expect(sent.password).not.toBe('123');
  expect(
    privateDecrypt(
      { key: privateKey, oaepHash: 'sha1' },
      Buffer.from(sent.password, 'base64'),
    ).toString(),
  ).toBe('123');
  await act(async () =>
    [...host.querySelectorAll('button')]
      .find((button) => button.textContent?.trim() === '实际请求')!
      .click(),
  );
  expect(host.textContent).toContain(sent.password);
  await act(async () => {
    send.click();
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
  });
  const repeated = JSON.parse(fetchMock.mock.calls[2][1].body);
  expect(repeated.password).not.toBe(sent.password);
  expect(
    privateDecrypt(
      { key: privateKey, oaepHash: 'sha1' },
      Buffer.from(repeated.password, 'base64'),
    ).toString(),
  ).toBe('123');
  await act(async () =>
    [...host.querySelectorAll('button')]
      .find((button) => button.textContent?.trim() === '实际请求')!
      .click(),
  );
  expect(host.textContent).toContain(repeated.password);
  await flushPending();
  expect(JSON.parse(readOperationDraft(identity)!.bodies['application/json'].body).password).toBe(
    '123',
  );
  await act(async () =>
    root.render(<Playground {...props} debugCacheEnabled debugTab="body" debugTabExplicit />),
  );
  expect(
    [...host.querySelectorAll('[data-testid="editor"]')].some(
      (editor) => editor.textContent === '{"username":"user","password":"123"}',
    ),
  ).toBe(true);
});

it('keeps pre-request header and query writes out of saved inputs', async () => {
  const fetchMock = vi.fn().mockImplementation(async () => new Response('{}'));
  vi.stubGlobal('fetch', fetchMock);
  patchOperationDraft(identity, {
    session: {
      overrides: {},
      preRequestConfig: {
        steps: [
          {
            id: 'header',
            name: '临时请求头',
            type: 'write',
            source: 'fixed',
            value: 'temporary',
            targetType: 'header',
            targetField: 'X-Signature',
            enabled: true,
            failurePolicy: 'abort',
          },
          {
            id: 'query',
            name: '临时参数',
            type: 'write',
            source: 'fixed',
            value: 'temporary',
            targetType: 'query',
            targetField: 'signature',
            enabled: true,
            failurePolicy: 'abort',
          },
        ],
      },
    },
  });
  await act(async () => root.render(<Playground {...props} debugCacheEnabled />));
  await act(async () => {
    [...host.querySelectorAll('button')]
      .find((button) => button.textContent?.trim() === '发送')!
      .click();
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
  });
  expect(new Headers(fetchMock.mock.calls[0][1].headers).get('X-Signature')).toBe('temporary');
  expect(new URL(String(fetchMock.mock.calls[0][0])).searchParams.get('signature')).toBe(
    'temporary',
  );
  await flushPending();
  const saved = readOperationDraft(identity)!;
  expect(saved.common?.headers.some((header) => header.name === 'X-Signature')).toBe(false);
  expect(saved.common?.queryParams.some((param) => param.name === 'signature')).toBe(false);
});

it('runs the captcha request manually, shows its result and sends the main request only after input', async () => {
  const steps = createWorkflowScenario('captcha', 'pre-request');
  steps[0].endpoint = '/captcha';
  patchOperationDraft(identity, { session: { overrides: {}, preRequestConfig: { steps } } });
  const fetchMock = vi
    .fn()
    .mockImplementation(
      async (url) =>
        new Response(
          String(url).endsWith('/captcha')
            ? '{"id":"challenge-1","img":"data:image/png;base64,YQ=="}'
            : '{}',
          { headers: { 'content-type': 'application/json' } },
        ),
    );
  vi.stubGlobal('fetch', fetchMock);
  await act(async () =>
    root.render(
      <Playground {...props} debugCacheEnabled debugTab="pre-request" debugTabExplicit />,
    ),
  );
  const run = [...host.querySelectorAll('button')].find(
    (button) => button.textContent === '运行此步骤',
  )!;
  await act(async () => {
    run.click();
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  });
  expect(String(fetchMock.mock.calls[0][0])).toContain('/captcha');
  expect(host.querySelector('img[alt="辅助请求返回的图片"]')?.getAttribute('src')).toBe(
    'data:image/png;base64,YQ==',
  );
  const send = [...host.querySelectorAll('button')].find(
    (button) => button.textContent?.trim() === '发送',
  )!;
  await act(async () => send.click());
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(host.textContent).toContain('captchaCode');
  const inputs = [...host.querySelectorAll<HTMLInputElement>('input')];
  const input = inputs.find((item) => item.parentElement?.textContent?.startsWith('填写值'))!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, 'ABCD');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await act(async () => {
    send.click();
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });
  expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toMatchObject({
    uuid: 'challenge-1',
    captcha: 'ABCD',
  });
  expect(readWorkflowSession(scopeToken(scope)).flow.captchaCode).toBe('ABCD');
  expect(JSON.parse(readOperationDraft(identity)!.bodies['application/json'].body)).toEqual({
    saved: true,
  });
});

it('preserves captcha inputs and results when a disabled manual step is clicked', async () => {
  const steps = createWorkflowScenario('captcha', 'pre-request');
  steps[0].enabled = false;
  patchOperationDraft(identity, { session: { overrides: {}, preRequestConfig: { steps } } });
  const saved = {
    flow: { captchaCode: 'ABCD', captcha: { json: { id: 'saved' } } },
    results: { [steps[0].id]: { json: { id: 'saved' } } },
  };
  writeWorkflowSession(scopeToken(scope), saved);
  const fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  await act(async () =>
    root.render(
      <Playground {...props} debugCacheEnabled debugTab="pre-request" debugTabExplicit />,
    ),
  );
  await act(async () =>
    [...host.querySelectorAll('button')]
      .find((button) => button.textContent === '运行此步骤')!
      .click(),
  );
  expect(fetchMock).not.toHaveBeenCalled();
  expect(readWorkflowSession(scopeToken(scope))).toEqual(saved);
});

it.each(['complete', 'cancel', 'error'] as const)(
  'runs SSE post-response operations only on normal completion: %s',
  async (outcome) => {
    let streamController!: ReadableStreamDefaultController<Uint8Array>;
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        streamController = controller;
      },
    });
    const fetchMock = vi.fn(
      async () => new Response(stream, { headers: { 'content-type': 'text/event-stream' } }),
    );
    vi.stubGlobal('fetch', fetchMock);
    patchOperationDraft(identity, {
      session: {
        overrides: {},
        postResponseConfig: {
          steps: [
            {
              ...createWorkflowStep('extract', 'post-response'),
              sourcePart: 'text',
              saveAs: 'events',
              scope: 'flow',
            },
            {
              ...createWorkflowStep('extract', 'post-response'),
              sourcePart: 'status',
              saveAs: 'status',
              scope: 'flow',
            },
          ],
        },
      },
    });
    await act(async () => root.render(<Playground {...props} debugCacheEnabled />));
    await act(async () => {
      [...host.querySelectorAll('button')]
        .find((button) => button.textContent?.trim() === '发送')!
        .click();
      await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    });
    expect(readWorkflowSession(scopeToken(scope)).flow).toEqual({});
    await act(async () => {
      streamController.enqueue(new TextEncoder().encode('data: hello\n\n'));
      if (outcome === 'cancel') {
        // Native Fetch aborts its body; closing the mock stream also verifies the explicit abort guard.
        [...host.querySelectorAll('button')]
          .find((button) => button.textContent?.includes('取消'))!
          .click();
      }
      if (outcome === 'error') streamController.error(new Error('broken stream'));
      else streamController.close();
    });
    expect(
      [...host.querySelectorAll('button')].some((button) => button.textContent?.trim() === '发送'),
    ).toBe(true);
    const flow = readWorkflowSession(scopeToken(scope)).flow;
    if (outcome === 'complete') {
      expect(flow.events).toContain('data: hello');
      expect(flow.status).toBe(200);
    } else expect(flow).toEqual({});
  },
);

it('exposes direct script editing and document-driven auxiliary requests without scenario templates', async () => {
  await act(async () =>
    root.render(
      <Playground {...props} debugCacheEnabled debugTab="pre-request" debugTabExplicit />,
    ),
  );
  expect(host.textContent).not.toContain('流程模板');
  await act(async () => host.querySelector<HTMLButtonElement>('[aria-label="添加步骤"]')!.click());
  await act(async () =>
    window.document.querySelector<HTMLButtonElement>('[data-select-value="script"]')!.click(),
  );
  expect(host.querySelectorAll('[data-workflow-step-id]')).toHaveLength(1);
  expect(host.querySelector('[data-testid="editor"]')).not.toBeNull();
  await act(async () => changeBody?.('return nextdoc.request.body.get();'));
  await flushPending();
  expect(readOperationDraft(identity)?.session?.preRequestConfig?.steps[0]).toMatchObject({
    type: 'script',
    scriptCode: 'return nextdoc.request.body.get();',
  });
  expect(host.textContent).not.toContain('步骤类型');
  expect(host.textContent).not.toContain('步骤名称');
  await act(async () => host.querySelector<HTMLButtonElement>('[aria-label="添加步骤"]')!.click());
  await act(async () =>
    window.document.querySelector<HTMLButtonElement>('[data-select-value="request"]')!.click(),
  );
  await act(async () => host.querySelector<HTMLButtonElement>('[aria-label="选择接口"]')!.click());
  await act(async () =>
    window.document.querySelector<HTMLButtonElement>('[data-select-value="POST /users"]')!.click(),
  );
  await flushPending();
  expect(readOperationDraft(identity)?.session?.preRequestConfig?.steps[1]).toMatchObject({
    type: 'request',
    method: 'POST',
    endpoint: '/users',
  });
  expect(host.querySelector<HTMLDetailsElement>('.workflow-request-custom')?.open).toBe(false);
});

it('applies steps after inherited overrides and gives post requests the actual sent headers', async () => {
  const fetchMock = vi.fn(
    async () => new Response('{}', { headers: { 'content-type': 'application/json' } }),
  );
  vi.stubGlobal('fetch', fetchMock);
  const globalHeader = { id: 'signature', name: 'X-Signature', value: 'global', enabled: true };
  const globalQuery = { id: 'signature', name: 'signature', value: 'global', enabled: true };
  patchOperationDraft(identity, {
    session: {
      overrides: {
        'header:x-signature': { value: 'old' },
        'query:signature': { value: 'old', enabled: false },
      },
      preRequestConfig: {
        steps: [
          {
            id: 'header',
            type: 'write',
            name: '新签名',
            enabled: true,
            failurePolicy: 'abort',
            source: 'fixed',
            value: 'new',
            targetType: 'header',
            targetField: 'X-Signature',
          },
          {
            id: 'query',
            type: 'write',
            name: '新参数',
            enabled: true,
            failurePolicy: 'abort',
            source: 'fixed',
            value: 'new',
            targetType: 'query',
            targetField: 'signature',
          },
        ],
      },
      postResponseConfig: {
        steps: [
          {
            id: 'post',
            type: 'request',
            name: '后置请求',
            enabled: true,
            failurePolicy: 'abort',
            endpoint: '/after',
            inheritHeaders: true,
          },
        ],
      },
    },
  });
  await act(async () =>
    root.render(
      <Playground
        {...props}
        debugCacheEnabled
        globalHeaders={[globalHeader]}
        globalQueryParams={[globalQuery]}
      />,
    ),
  );
  await act(async () => {
    [...host.querySelectorAll('button')]
      .find((button) => button.textContent?.trim() === '发送')!
      .click();
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });
  const calls = fetchMock.mock.calls as unknown as Array<[URL | string, RequestInit]>;
  expect(new Headers(calls[0][1].headers).get('X-Signature')).toBe('new');
  expect(new URL(String(calls[0][0])).searchParams.get('signature')).toBe('new');
  expect(new Headers(calls[1][1].headers).get('X-Signature')).toBe('new');
  await flushPending();
  expect(readOperationDraft(identity)?.session?.overrides['header:x-signature']?.value).toBe('old');
});

it('sends a pre-request token immediately without changing saved authentication', async () => {
  const fetchMock = vi.fn(async () => new Response('{}'));
  const onSecurityValuesChange = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  patchOperationDraft(identity, {
    session: {
      overrides: { 'header:authorization': { value: 'Bearer old-override' } },
      preRequestConfig: {
        steps: [
          {
            id: 'auth',
            type: 'security',
            name: '更新认证',
            enabled: true,
            failurePolicy: 'abort',
            source: 'fixed',
            value: 'fresh',
            targetField: 'BearerAuth',
          },
        ],
      },
    },
  });
  const securedDocument: OpenApiDocument = {
    ...document,
    security: [{ BearerAuth: [] }],
    components: { securitySchemes: { BearerAuth: { type: 'http', scheme: 'bearer' } } },
  };
  await act(async () =>
    root.render(
      <Playground
        {...props}
        document={securedDocument}
        securityValues={{ BearerAuth: 'old' }}
        onSecurityValuesChange={onSecurityValuesChange}
        debugCacheEnabled
      />,
    ),
  );
  await act(async () => {
    [...host.querySelectorAll('button')]
      .find((button) => button.textContent?.trim() === '发送')!
      .click();
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
  });
  const calls = fetchMock.mock.calls as unknown as Array<[URL, RequestInit]>;
  expect(new Headers(calls[0][1].headers).get('Authorization')).toBe('Bearer fresh');
  expect(onSecurityValuesChange).not.toHaveBeenCalled();
});

it.each(['form-data', 'urlencoded', 'raw', 'xml'] as const)(
  'sends the updated %s body while keeping the saved form or text unchanged',
  async (bodyKind) => {
    const mime = {
      'form-data': 'multipart/form-data',
      urlencoded: 'application/x-www-form-urlencoded',
      raw: 'text/plain',
      xml: 'application/xml',
    }[bodyKind];
    const form = bodyKind === 'form-data' || bodyKind === 'urlencoded';
    const before = bodyKind === 'xml' ? '<value>before</value>' : 'before';
    const after = bodyKind === 'xml' ? '<value>after</value>' : 'after';
    const fields = [{ name: 'value', value: 'before', enabled: true }];
    patchOperationDraft(identity, {
      bodies: { [mime]: { body: before, formFields: fields, urlEncodedFields: fields } },
      session: {
        overrides: {},
        preRequestConfig: {
          steps: [
            {
              id: 'body',
              type: 'write',
              name: '设置正文',
              enabled: true,
              failurePolicy: 'abort',
              source: 'fixed',
              value: after,
              targetType:
                bodyKind === 'form-data'
                  ? 'form'
                  : bodyKind === 'urlencoded'
                    ? 'urlencoded'
                    : 'text',
              targetField: form ? 'value' : undefined,
            },
          ],
        },
      },
    });
    const typedOperation = {
      ...operation,
      requestBody: { content: { [mime]: { schema: { type: form ? 'object' : 'string' } } } },
    } as ApiOperation;
    const fetchMock = vi.fn(async () => new Response('{}'));
    vi.stubGlobal('fetch', fetchMock);
    await act(async () =>
      root.render(
        <Playground
          {...props}
          operation={typedOperation}
          document={{ paths: { '/users': { post: typedOperation } } }}
          debugBody={bodyKind}
          debugCacheEnabled
        />,
      ),
    );
    await act(async () => {
      [...host.querySelectorAll('button')]
        .find((button) => button.textContent?.trim() === '发送')!
        .click();
      await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    });
    const calls = fetchMock.mock.calls as unknown as Array<[URL, RequestInit]>;
    expect(
      form ? (calls[0][1].body as FormData | URLSearchParams).get('value') : calls[0][1].body,
    ).toBe(after);
    await flushPending();
    const saved = readOperationDraft(identity)!.bodies[mime];
    expect(
      form
        ? (bodyKind === 'form-data' ? saved.formFields : saved.urlEncodedFields)[0].value
        : saved.body,
    ).toBe(before);
  },
);

it('keeps large-response post assertions and flow extraction independent from bounded previews', async () => {
  const { createLargeResponse } = await import('../fixtures/performance');
  const complete = createLargeResponse(5);
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async () =>
        new Response(complete, {
          headers: { 'content-type': 'application/json', 'content-disposition': 'inline' },
        }),
    ),
  );
  patchOperationDraft(identity, {
    session: {
      overrides: {},
      postResponseConfig: {
        steps: [
          {
            ...createWorkflowStep('assert', 'post-response'),
            source: 'response',
            path: 'tail',
            operator: 'equals',
            expectedValue: 'complete',
          },
          {
            ...createWorkflowStep('extract', 'post-response'),
            source: 'response',
            path: 'tail',
            saveAs: 'largeTail',
            scope: 'flow',
          },
        ],
      },
    },
  });
  await act(async () => root.render(<Playground {...props} debugCacheEnabled />));
  await act(async () => {
    [...host.querySelectorAll('button')]
      .find((button) => button.textContent?.trim() === '发送')!
      .click();
    await vi.waitFor(() =>
      expect(readWorkflowSession(scopeToken(scope)).flow.largeTail).toBe('complete'),
    );
  });
  const preview = host.querySelector('.playground-response__raw')!;
  expect(new TextEncoder().encode(preview.textContent ?? '').length).toBeLessThanOrEqual(
    256 * 1024,
  );
  expect(preview.textContent).not.toContain('complete');
  expect(host.textContent).toContain('搜索限于预览');
});

it('resolves body hover required markers from each containing object, including referenced array items', async () => {
  const requiredOperation: ApiOperation = {
    ...operation,
    requestBody: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['name', 'unspecified'],
            properties: {
              name: { type: 'string' },
              optional: { type: 'string' },
              unspecified: {},
              children: { type: 'array', items: { $ref: '#/components/schemas/Child' } },
            },
          },
        },
      },
    },
  };
  const requiredDocument: OpenApiDocument = {
    paths: { '/users': { post: requiredOperation } },
    components: {
      schemas: {
        Child: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'integer' }, name: { type: 'string' } },
        },
      },
    },
  };
  await act(async () =>
    root.render(
      <Playground
        {...props}
        operation={requiredOperation}
        document={requiredDocument}
        debugCacheEnabled
      />,
    ),
  );
  const source = '{"name":"test","children":[{"id":1,"name":"child"}]}';
  expect(bodyFieldMeta?.(['name'], source)?.required).toBe(true);
  expect(bodyFieldMeta?.(['optional'], source)?.required).toBe(false);
  expect(bodyFieldMeta?.(['unspecified'], source)?.required).toBe(true);
  expect(bodyFieldMeta?.(['children', 0, 'id'], source)?.required).toBe(true);
  expect(bodyFieldMeta?.(['children', 0, 'name'], source)?.required).toBe(false);
  expect(bodyFieldMeta?.(['children', 0], source)?.required).toBeUndefined();
  expect(bodyFieldMeta?.(['custom'], source)).toBeUndefined();
});
