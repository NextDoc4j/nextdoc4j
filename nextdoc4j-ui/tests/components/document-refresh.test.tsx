// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { App } from '../../src/app';
import type { OpenApiDocument } from '../../src/types/openapi';

const fixtures = vi.hoisted(() => {
  const old = { openapi: '3.0.3', info: { title: 'OLD DOCUMENT', version: '1' }, paths: {} };
  return {
    old,
    getDocument: vi.fn(),
    cached: {
      document: old,
      mainDocument: old,
      gatewayDocument: old,
      services: [],
      sourceGroupDocuments: [],
      groupDocumentErrors: [],
    },
  };
});
vi.mock('../../src/features/aggregation/cache/workspace', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  restoreOpenApiWorkspace: vi.fn(async () => fixtures.cached),
  saveOpenApiWorkspace: vi.fn(async () => undefined),
}));
vi.mock('../../src/features/aggregation/single-document-repository', () => ({
  createSingleDocumentRepository: () => ({
    getDocument: fixtures.getDocument,
    getSwaggerConfig: async () => ({ urls: [] }),
    loadWorkspace: async (document: OpenApiDocument) => ({
      document,
      mainDocument: document,
      groupDocuments: [],
      errors: [],
    }),
    clear: vi.fn(),
  }),
}));
it.each([
  '',
  '#/not-a-page',
  '#/docs/operations/missing',
  '#/docs/missing-group',
  '#/docs/schemas/missing',
  '#/services/missing/home',
])('waits for the document and replaces invalid destinations with home: %s', async (hash) => {
  history.replaceState(null, '', '/' + hash);
  localStorage.clear();
  sessionStorage.clear();
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  Object.defineProperty(Element.prototype, 'scrollTo', { configurable: true, value: vi.fn() });
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe = vi.fn();
      disconnect = vi.fn();
    },
  );
  const next: OpenApiDocument = { ...fixtures.old, info: { title: 'NEW DOCUMENT', version: '2' } };
  let resolve!: (document: OpenApiDocument) => void;
  fixtures.getDocument.mockReturnValue(
    new Promise<OpenApiDocument>((done) => {
      resolve = done;
    }),
  );
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  try {
    await act(async () => {
      root.render(<App />);
    });
    expect(fixtures.getDocument).toHaveBeenCalled();
    expect(host.textContent).not.toContain('OLD DOCUMENT');
    expect(host.querySelector('.workspace-sidebar')).toBeNull();
    await act(async () => {
      resolve(next);
      await new Promise((done) => setTimeout(done, 100));
    });
    expect(host.textContent).toContain('NEW DOCUMENT');
    expect(host.textContent).not.toContain('OLD DOCUMENT');
    expect(window.location.hash).toBe('#/home');
  } finally {
    await act(async () => root.unmount());
    host.remove();
    vi.unstubAllGlobals();
  }
});
