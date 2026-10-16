// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { EditorView } from '@codemirror/view';
import { foldAll, foldedRanges } from '@codemirror/language';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { CodeEditor } from '../../src/components/code-editor';
import { formatJsonNodePath } from '../../src/components/json-node-controls';

let host: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
const value = JSON.stringify(
  { role: '管理员', status: 1, children: [{ id: 2 }], empty: [] },
  null,
  2,
);
const metadata = () => ({
  type: 'string',
  description: '角色说明',
  enums: [{ value: 1, description: '启用' }],
});
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  Object.defineProperty(Range.prototype, 'getClientRects', { configurable: true, value: () => [] });
  Object.defineProperty(Range.prototype, 'getBoundingClientRect', {
    configurable: true,
    value: () => new DOMRect(),
  });
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
it.each([true, false])(
  'keeps disclosure focus and source intact across folding (readOnly=%s)',
  async (readOnly) => {
    await act(async () =>
      root.render(<CodeEditor readOnly={readOnly} language="json" value={value} />),
    );
    const view = EditorView.findFromDOM(host.querySelector('.cm-editor')!)!;
    const arrow = host.querySelector<HTMLButtonElement>('.cm-inline-fold-btn')!;
    arrow.focus();
    await act(async () => arrow.click());
    expect(arrow.isConnected).toBe(true);
    expect(document.activeElement).toBe(arrow);
    expect(arrow.getAttribute('aria-expanded')).toBe('false');
    expect(foldedRanges(view.state).size).toBe(1);
    await act(async () => arrow.click());
    expect(arrow.getAttribute('aria-expanded')).toBe('true');
    expect(foldedRanges(view.state).size).toBe(0);
    expect(view.state.doc.toString()).toBe(value);
  },
);
it('renders counts and borderless annotation controls without changing source; toggling descriptions preserves folds', async () => {
  await act(async () =>
    root.render(
      <CodeEditor readOnly language="json" value={value} showAnnotations getFieldMeta={metadata} />,
    ),
  );
  expect(host.querySelector('.cm-lineNumbers')).toBeNull();
  expect([...host.querySelectorAll('.cm-json-count')].map((el) => el.textContent)).toEqual([
    '4 entries',
    '1 entry',
    '1 entry',
    '0 entries',
  ]);
  expect(host.querySelector('.cm-inline-desc')?.textContent).toContain('// string');
  expect(host.textContent).not.toContain('枚举 1项');
  const view = EditorView.findFromDOM(host.querySelector('.cm-editor')!)!;
  expect(view.state.doc.toString()).toBe(value);
  await act(async () => foldAll(view));
  expect(foldedRanges(view.state).size).toBeGreaterThan(0);
  await act(async () =>
    root.render(
      <CodeEditor
        readOnly
        language="json"
        value={value}
        showAnnotations={false}
        getFieldMeta={metadata}
      />,
    ),
  );
  expect(host.querySelector('.cm-inline-desc')).toBeNull();
  expect(EditorView.findFromDOM(host.querySelector('.cm-editor')!)).toBe(view);
  expect(foldedRanges(view.state).size).toBeGreaterThan(0);
  expect(view.state.doc.toString()).toBe(value);
});
it('copies full folded nodes and key/value pairs as JSON, never annotations or counts', async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
  await act(async () =>
    root.render(
      <CodeEditor readOnly language="json" value={value} showAnnotations getFieldMeta={metadata} />,
    ),
  );
  const field = host.querySelector<HTMLButtonElement>('[aria-label="复制 $.role"]')!;
  expect(field).not.toBeNull();
  await act(async () => field.click());
  await act(async () =>
    [...document.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')]
      .find((el) => el.textContent === '复制键值对')!
      .click(),
  );
  expect(JSON.parse(writeText.mock.calls[0][0])).toEqual({ role: '管理员' });
  const view = EditorView.findFromDOM(host.querySelector('.cm-editor')!)!;
  await act(async () => foldAll(view));
  await act(async () => host.querySelector<HTMLButtonElement>('[aria-label="复制 $"]')!.click());
  await act(async () =>
    [...document.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')]
      .find((el) => el.textContent === '复制完整 JSON')!
      .click(),
  );
  expect(JSON.parse(writeText.mock.calls[1][0])).toEqual(JSON.parse(value));
});
it('does not render description metadata in editable JSON bodies and preserves text edits', async () => {
  const onChange = vi.fn();
  await act(async () =>
    root.render(
      <CodeEditor language="json" value={value} onChange={onChange} getFieldMeta={metadata} />,
    ),
  );
  expect(host.querySelector('.cm-inline-desc')).toBeNull();
  const view = EditorView.findFromDOM(host.querySelector('.cm-editor')!)!;
  await act(async () =>
    view.dispatch({
      changes: { from: value.indexOf('管理员'), to: value.indexOf('管理员') + 3, insert: '访客' },
    }),
  );
  expect(JSON.parse(onChange.mock.lastCall![0]).role).toBe('访客');
  expect(host.querySelector('.cm-lineNumbers')).toBeNull();
});

it('tracks hover over annotation widgets without changing JSON or capturing their controls', async () => {
  const onChange = vi.fn();
  await act(async () =>
    root.render(
      <CodeEditor
        readOnly
        language="json"
        value={value}
        showAnnotations
        getFieldMeta={metadata}
        onChange={onChange}
      />,
    ),
  );
  const view = EditorView.findFromDOM(host.querySelector('.cm-editor')!)!;
  const annotation = host.querySelector<HTMLElement>('.cm-inline-desc')!;
  const row = annotation.closest('.cm-line')!;
  await act(async () => annotation.dispatchEvent(new MouseEvent('mousemove', { bubbles: true })));
  expect(row.classList.contains('cm-active-hover-line')).toBe(true);
  expect(view.state.doc.toString()).toBe(value);
  expect(onChange).not.toHaveBeenCalled();
  const layer = host.querySelector('.cm-json-hover-layer')!;
  expect(view.contentDOM.contains(layer)).toBe(false);
  expect(layer.getAttribute('aria-hidden')).toBe('true');
  expect(row.querySelector('.cm-json-node-copy')).not.toBeNull();
  await act(async () => view.contentDOM.dispatchEvent(new MouseEvent('mouseleave')));
  expect(row.classList.contains('cm-active-hover-line')).toBe(false);
});
it('formats array and special-character property paths unambiguously', () => {
  expect(formatJsonNodePath(['items', 0, 'a.b', 'quoted"key'])).toBe(
    '$.items[0]["a.b"]["quoted\\"key"]',
  );
});

it('keeps all compact JSON node actions reachable and counts visible when collapsed', async () => {
  const compact = '{"items":[1,2],"a.b":true}';
  await act(async () => root.render(<CodeEditor readOnly language="json" value={compact} />));
  expect(
    [...host.querySelectorAll('.cm-json-node-copy')].map((button) =>
      button.getAttribute('aria-label'),
    ),
  ).toEqual(['复制 $', '复制 $.items', '复制 $.items[0]', '复制 $.items[1]', '复制 $["a.b"]']);
  expect(host.querySelectorAll('.cm-json-copy-anchor.is-inline')).toHaveLength(5);
  await act(async () => root.render(<CodeEditor readOnly language="json" value={value} />));
  const view = EditorView.findFromDOM(host.querySelector('.cm-editor')!)!;
  await act(async () => foldAll(view));
  expect(host.querySelector('.cm-json-count')?.textContent).toBe('4 entries');
  expect(host.querySelectorAll('.cm-json-node-copy')).toHaveLength(1);
});
it('keeps non-JSON source free of JSON counts and copy decorations', async () => {
  await act(async () => root.render(<CodeEditor language="xml" value="<node>value</node>" />));
  expect(host.querySelector('.cm-json-count')).toBeNull();
  expect(host.querySelector('.cm-json-node-copy')).toBeNull();
  expect(host.querySelector('.cm-lineNumbers')).not.toBeNull();
});

it('preserves exact numeric source when copying int64 values and their property pair', async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
  await act(async () =>
    root.render(
      <CodeEditor readOnly language="json" value={'{\n  "id": 9223372036854775807\n}'} />,
    ),
  );
  await act(async () => host.querySelector<HTMLButtonElement>('[aria-label="复制 $.id"]')!.click());
  await act(async () =>
    [...document.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')]
      .find((el) => el.textContent === '复制节点值')!
      .click(),
  );
  expect(writeText.mock.calls[0][0]).toBe('9223372036854775807');
  await act(async () => host.querySelector<HTMLButtonElement>('[aria-label="复制 $.id"]')!.click());
  await act(async () =>
    [...document.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')]
      .find((el) => el.textContent === '复制键值对')!
      .click(),
  );
  expect(writeText.mock.calls[1][0]).toContain('"id": 9223372036854775807');
});
