// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { OperationDetail } from '../../src/features/documentation/operation-detail';
import { operationIdentity, scopeToken } from '../../src/features/workspace/storage/identity';
import {
  prepareOperation,
  patchOperationState,
  readOperationState,
  flushPending,
} from '../../src/features/workspace/storage/repository';
import type { ApiOperation } from '../../src/types/openapi';
import { getNotifications, removeNotification } from '../../src/lib/notifications';

vi.mock('../../src/components/code-editor', () => ({ CodeEditor: () => null }));

it.each(['unavailable', 'denied'] as const)(
  'copies endpoint URL and Path with inline feedback when the Clipboard API is %s',
  async (mode) => {
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
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value:
        mode === 'denied'
          ? { writeText: vi.fn().mockRejectedValue(new Error('denied')) }
          : undefined,
    });
    const copied: string[] = [];
    const execDescriptor = Object.getOwnPropertyDescriptor(document, 'execCommand');
    Object.defineProperty(document, 'execCommand', {
      configurable: true,
      value: vi.fn((command: string) => {
        expect(command).toBe('copy');
        const textarea = document.activeElement as HTMLTextAreaElement;
        expect(textarea.tagName).toBe('TEXTAREA');
        copied.push(textarea.value);
        return true;
      }),
    });
    const existingNotifications = new Set(getNotifications().map((item) => item.id));
    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);
    const operation: ApiOperation = {
      method: 'get',
      path: '/users',
      group: 'users',
      summary: '用户接口',
    };
    try {
      await act(async () =>
        root.render(
          <OperationDetail
            operation={operation}
            document={{ paths: {} }}
            requestPrefix="http://192.168.0.8:8080/api"
            storageScope={scopeToken({ appId: 'clipboard-test', serviceKey: 'single-app' })}
            storageDocumentUrl="/docs"
            storageReady={false}
            onOpenPlayground={vi.fn()}
          />,
        ),
      );
      const url = host.querySelector<HTMLButtonElement>('[aria-label="复制完整 URL"]')!;
      url.focus();
      await act(async () => url.click());
      expect(copied).toEqual(['http://192.168.0.8:8080/api/users']);
      expect(url.dataset.copied).toBe('true');
      expect(url.querySelector('[role="status"]')?.textContent).toBe('已复制');
      expect(document.activeElement).toBe(url);
      const path = host.querySelector<HTMLButtonElement>('[aria-label="复制 Path"]')!;
      path.focus();
      await act(async () => path.click());
      expect(copied).toEqual(['http://192.168.0.8:8080/api/users', '/users']);
      expect(path.dataset.copied).toBe('true');
      expect(path.querySelector('[role="status"]')?.textContent).toBe('已复制');
      expect(getNotifications().filter((item) => !existingNotifications.has(item.id))).toEqual([]);
      expect(document.activeElement).toBe(path);
      expect(document.querySelector('textarea')).toBeNull();
    } finally {
      await act(async () => root.unmount());
      host.remove();
      for (const item of getNotifications())
        if (!existingNotifications.has(item.id)) removeNotification(item.id);
      if (clipboardDescriptor) Object.defineProperty(navigator, 'clipboard', clipboardDescriptor);
      else Reflect.deleteProperty(navigator, 'clipboard');
      if (execDescriptor) Object.defineProperty(document, 'execCommand', execDescriptor);
      else Reflect.deleteProperty(document, 'execCommand');
      vi.unstubAllGlobals();
    }
  },
);
it.each(['untouched', 'edited', 'unavailable'] as const)(
  'keeps documentation usable and protects hydration: %s',
  async (mode) => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe = vi.fn();
        unobserve = vi.fn();
        disconnect = vi.fn();
      },
    );
    vi.stubGlobal('matchMedia', () => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    const scope = { appId: `detail-hydration-${mode}`, serviceKey: 'single-app' };
    const operation: ApiOperation = {
      method: 'get',
      path: '/users',
      group: 'users',
      summary: '用户接口',
      requestBody: {
        content: {
          'application/json': { schema: { type: 'object' } },
          'application/xml': { schema: { type: 'object' } },
        },
      },
      responses: {
        '200': { description: 'OK' },
        '201': { description: 'Created' },
        '202': { description: 'Accepted' },
      },
    };
    const identity = operationIdentity(scope, operation.method, operation.path);
    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);
    const props = {
      operation,
      document: { paths: { '/users': { get: operation } } },
      storageScope: scopeToken(scope),
      storageDocumentUrl: '/docs',
      requestPrefix: '',
      onOpenPlayground: vi.fn(),
    };
    try {
      await act(async () => root.render(<OperationDetail {...props} storageReady={false} />));
      expect(host.textContent).toContain('用户接口');
      expect(host.querySelector('.legacy-operation')?.hasAttribute('inert')).toBe(false);
      const debugButton = [...host.querySelectorAll('button')].find((button) =>
        button.textContent?.includes('在线调试'),
      )!;
      await act(async () => debugButton.click());
      expect(props.onOpenPlayground).toHaveBeenCalledOnce();
      if (mode !== 'untouched') {
        const responseButton = [...host.querySelectorAll('button')].find(
          (button) => button.textContent?.trim() === '202',
        )!;
        expect(responseButton).toBeDefined();
        await act(async () => responseButton.click());
      }
      expect(readOperationState(identity)).toBeUndefined();
      if (mode === 'unavailable') return;
      await prepareOperation(identity);
      patchOperationState(identity, {
        detailByDocument: {
          '/docs': {
            activeResponseCode: '201',
            activeRequestContentType: 'application/xml',
            requestVariants: {},
            responseVariants: {},
          },
        },
      });
      await flushPending();
      await act(async () => root.render(<OperationDetail {...props} storageReady />));
      await flushPending();
      expect(host.querySelector('.legacy-operation')?.hasAttribute('inert')).toBe(false);
      expect(readOperationState(identity)?.detailByDocument['/docs'].activeResponseCode).toBe(
        mode === 'edited' ? '202' : '201',
      );
      expect(readOperationState(identity)?.detailByDocument['/docs'].activeRequestContentType).toBe(
        'application/xml',
      );
    } finally {
      await act(async () => root.unmount());
      host.remove();
      vi.unstubAllGlobals();
    }
  },
);
