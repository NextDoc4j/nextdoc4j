// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../src/app';
import { brandStorageKeys } from '../../src/features/brand/brand';
import { applicationLocalStorage } from '../../src/features/workspace/storage/browser-storage';
import type { OpenApiDocument } from '../../src/types/openapi';

const demoDoc: OpenApiDocument = {
  info: { title: 'NextDoc4j Demo', version: '1.0.0' },
  openapi: '3.0.3',
  paths: {},
};

let getDocumentResolve: (doc: OpenApiDocument) => void;

vi.mock('../../src/features/aggregation/cache/workspace', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  restoreOpenApiWorkspace: vi.fn(async () => undefined),
  saveOpenApiWorkspace: vi.fn(async () => undefined),
}));

vi.mock('../../src/features/aggregation/single-document-repository', () => ({
  createSingleDocumentRepository: () => ({
    getDocument: () =>
      new Promise<OpenApiDocument>((resolve) => {
        getDocumentResolve = resolve;
      }),
    getSwaggerConfig: async () => ({ urls: [] }),
    loadWorkspace: async (doc: OpenApiDocument) => ({
      document: doc,
      errors: [],
      groupDocuments: [],
      mainDocument: doc,
    }),
    clear: vi.fn(),
  }),
}));

let host: HTMLDivElement;

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  Object.defineProperty(Element.prototype, 'scrollTo', { configurable: true, value: vi.fn() });
  vi.stubGlobal('matchMedia', () => ({
    addEventListener: vi.fn(),
    matches: false,
    removeEventListener: vi.fn(),
  }));
  host = document.createElement('div');
  document.body.append(host);
});

afterEach(() => {
  host.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Loading brand title synchronization', () => {
  it('instantly renders persisted brand title on loading screen before network resolves', async () => {
    applicationLocalStorage.setItem(brandStorageKeys.title, 'NextDoc4j Demo');

    const root = createRoot(host);
    await act(async () => {
      root.render(<App />);
    });

    // Before network request finishes, the loading screen must already display 'NextDoc4j Demo'
    const loadingTitle = host.querySelector('.workspace-loading-title');
    expect(loadingTitle?.textContent).toBe('NextDoc4j Demo');
    expect(host.querySelector('.workspace-loading-sub')?.textContent).toBe('正在加载接口文档');

    // Complete the pending request
    await act(async () => {
      getDocumentResolve(demoDoc);
    });

    await act(async () => {
      root.unmount();
    });
  });

  it('updates brand title as soon as nextDocument arrives and persists to storage', async () => {
    localStorage.setItem(brandStorageKeys.title, 'Other application');
    localStorage.setItem(brandStorageKeys.logo, 'https://example.com/other.png');

    const root = createRoot(host);
    await act(async () => {
      root.render(<App />);
    });

    // Cold start ignores unowned storage and falls back to the default brand.
    const coldLoadingTitle = host.querySelector('.workspace-loading-title');
    expect(coldLoadingTitle?.textContent).toBe('NextDoc4j');
    expect(applicationLocalStorage.getItem(brandStorageKeys.title)).toBeNull();

    // Deliver the document
    await act(async () => {
      getDocumentResolve(demoDoc);
    });

    // Must be persisted to localStorage for instant subsequent loads
    expect(applicationLocalStorage.getItem(brandStorageKeys.title)).toBe('NextDoc4j Demo');
    expect(localStorage.getItem(brandStorageKeys.title)).toBe('Other application');
    expect(localStorage.getItem(brandStorageKeys.logo)).toBe('https://example.com/other.png');

    await act(async () => {
      root.unmount();
    });
  });
});
