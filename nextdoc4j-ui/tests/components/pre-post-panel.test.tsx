// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { PrePostOperationPanel } from '../../src/features/playground/pre-post-panel';

let host: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal('CSS', { escape: (value: string) => value });
  vi.stubGlobal('matchMedia', () => ({
    matches: true,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value() {
      this.setAttribute('open', '');
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value() {
      this.removeAttribute('open');
    },
  });
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it.each(['pre-request', 'post-response'] as const)(
  'adds a script from the unified %s step menu',
  async (phase) => {
    const onChange = vi.fn();
    await act(async () =>
      root.render(
        <PrePostOperationPanel config={{ steps: [] }} phase={phase} onChange={onChange} />,
      ),
    );
    expect(host.querySelector('.pre-post-script-add')).toBeNull();
    await act(async () =>
      host.querySelector<HTMLButtonElement>('[aria-label="添加步骤"]')!.click(),
    );
    await act(async () =>
      document.querySelector<HTMLButtonElement>('[data-select-value="script"]')!.click(),
    );
    expect(onChange.mock.calls[0][0].steps[0]).toMatchObject({ type: 'script', enabled: true });
  },
);

it('opens a compact key/value cache and expands structured values without displaying a JSON document', async () => {
  const onFlowChange = vi.fn();
  await act(async () =>
    root.render(
      <PrePostOperationPanel
        config={{ steps: [] }}
        phase="pre-request"
        onChange={vi.fn()}
        flow={{ token: 'long-value', enabled: false, count: 0, payload: { id: 'order-1' } }}
        onFlowChange={onFlowChange}
      />,
    ),
  );
  expect(host.querySelector('.workflow-flow-values')).toBeNull();
  expect(host.querySelector('dialog[open]')).toBeNull();
  const trigger = host.querySelector<HTMLButtonElement>('[aria-label="流程变量缓存"]')!;
  expect(trigger.textContent).toContain('4');
  await act(async () => trigger.click());
  const dialog = host.querySelector('dialog[open]')!;
  expect(dialog.querySelectorAll('tbody > tr')).toHaveLength(4);
  expect(dialog.querySelector('pre')).toBeNull();
  expect(dialog.textContent).toContain('false');
  expect(dialog.textContent).toContain('0');
  const details = dialog.querySelector<HTMLDetailsElement>('.workflow-cache-object')!;
  expect(details.querySelector('dl')).toBeNull();
  await act(async () => details.querySelector('summary')!.click());
  expect(details.querySelector('dt')?.textContent).toBe('id');
  expect(details.querySelector('dd')?.textContent).toContain('order-1');
  expect(onFlowChange).not.toHaveBeenCalled();
});

it('saves a text variable and clears cached values only after confirmation', async () => {
  const onFlowChange = vi.fn();
  const onResetFlow = vi.fn();
  const onChange = vi.fn();
  await act(async () =>
    root.render(
      <PrePostOperationPanel
        config={{ steps: [] }}
        phase="pre-request"
        onChange={onChange}
        flow={{ old: 'value' }}
        onFlowChange={onFlowChange}
        onResetFlow={onResetFlow}
      />,
    ),
  );
  await act(async () =>
    host.querySelector<HTMLButtonElement>('[aria-label="流程变量缓存"]')!.click(),
  );
  const dialog = host.querySelector('dialog[open]')!;
  await act(async () => {
    for (const [label, value] of [
      ['流程变量名', ' orderId '],
      ['流程变量值', '123'],
    ]) {
      const input = dialog.querySelector<HTMLInputElement>(`[aria-label="${label}"]`)!;
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
  await act(async () => dialog.querySelector<HTMLButtonElement>('button[type="submit"]')!.click());
  expect(onFlowChange).toHaveBeenCalledWith('orderId', '123');
  expect(dialog.querySelector<HTMLInputElement>('[aria-label="流程变量名"]')!.value).toBe('');
  await act(async () => dialog.querySelector<HTMLButtonElement>('.workflow-cache-reset')!.click());
  expect(onResetFlow).not.toHaveBeenCalled();
  await act(async () => dialog.querySelector<HTMLButtonElement>('.workflow-cache-danger')!.click());
  expect(onResetFlow).toHaveBeenCalledOnce();
  expect(onChange).not.toHaveBeenCalled();
});

it('keeps cached data readable while a request runs and disables mutation controls', async () => {
  await act(async () =>
    root.render(
      <PrePostOperationPanel
        config={{ steps: [] }}
        phase="pre-request"
        busy
        onChange={vi.fn()}
        flow={{ token: 'value' }}
        onFlowChange={vi.fn()}
        onResetFlow={vi.fn()}
      />,
    ),
  );
  await act(async () =>
    host.querySelector<HTMLButtonElement>('[aria-label="流程变量缓存"]')!.click(),
  );
  const dialog = host.querySelector('dialog[open]')!;
  expect(dialog.textContent).toContain('value');
  expect(dialog.querySelector<HTMLInputElement>('[aria-label="流程变量名"]')!.disabled).toBe(true);
  expect(dialog.querySelector<HTMLButtonElement>('.workflow-cache-reset')!.disabled).toBe(true);
  expect(dialog.querySelector<HTMLButtonElement>('[aria-label="关闭弹窗"]')!.disabled).toBe(false);
});

it('renders the variable edit form in a direct 3-column grid and safely copies values only on success', async () => {
  let clipboardResolve: () => void = () => {};
  const writeText = vi.fn().mockImplementation(
    () =>
      new Promise<void>((resolve) => {
        clipboardResolve = resolve;
      }),
  );
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText },
  });

  await act(async () =>
    root.render(
      <PrePostOperationPanel
        config={{ steps: [] }}
        phase="pre-request"
        onChange={vi.fn()}
        flow={{ token: 'secret-123' }}
        onFlowChange={vi.fn()}
        onResetFlow={vi.fn()}
      />,
    ),
  );
  await act(async () =>
    host.querySelector<HTMLButtonElement>('[aria-label="流程变量缓存"]')!.click(),
  );
  const dialog = host.querySelector('dialog[open]')!;
  const form = dialog.querySelector<HTMLFormElement>('.workflow-cache-form')!;
  expect(form).not.toBeNull();
  // Ensure no intermediate wrapper breaking the 3-column layout
  expect(form.querySelector('.workflow-cache-form-row')).toBeNull();
  expect(form.children[0].className).toBe('workflow-cache-form-title');
  expect(form.children[1].tagName).toBe('LABEL');
  expect(form.children[2].tagName).toBe('LABEL');
  expect(form.children[3].tagName).toBe('BUTTON');

  const copyBtn = dialog.querySelector<HTMLButtonElement>('.workflow-cache-copy-btn')!;
  expect(copyBtn).not.toBeNull();

  // Test failure case first
  writeText.mockImplementationOnce(() => Promise.reject(new Error('Permission denied')));
  await act(async () => copyBtn.click());
  // Does not throw and does not show false success
  expect(copyBtn.getAttribute('aria-label')).toBe('复制内容');

  // Test success case
  writeText.mockImplementationOnce(
    () =>
      new Promise<void>((resolve) => {
        clipboardResolve = resolve;
      }),
  );
  await act(async () => copyBtn.click());
  expect(writeText).toHaveBeenCalledWith('secret-123');
  // Before promise resolves, copied label is not active
  expect(copyBtn.getAttribute('aria-label')).toBe('复制内容');

  // Resolve clipboard
  await act(async () => clipboardResolve());
  expect(copyBtn.getAttribute('aria-label')).toBe('已复制');
});

it('uses dialog-contained fallback textarea when clipboard API is unavailable and handles circular data', async () => {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: undefined,
  });

  const execCommand = vi.fn().mockReturnValue(true);
  document.execCommand = execCommand;

  const circular: Record<string, unknown> = { key: 'value' };
  circular.self = circular;

  await act(async () =>
    root.render(
      <PrePostOperationPanel
        config={{ steps: [] }}
        phase="pre-request"
        onChange={vi.fn()}
        flow={{ normal: 'data', circular }}
        onFlowChange={vi.fn()}
        onResetFlow={vi.fn()}
      />,
    ),
  );
  await act(async () =>
    host.querySelector<HTMLButtonElement>('[aria-label="流程变量缓存"]')!.click(),
  );
  const dialog = host.querySelector('dialog[open]')!;
  const copyBtns = dialog.querySelectorAll<HTMLButtonElement>('.workflow-cache-copy-btn');
  expect(copyBtns.length).toBeGreaterThanOrEqual(1);

  // Normal copy uses fallback inside dialog[open]
  await act(async () => copyBtns[0].click());
  expect(execCommand).toHaveBeenCalledWith('copy');
  // Ensure no lingering textarea in dialog or document.body
  expect(dialog.querySelector('textarea')).toBeNull();
  expect(document.body.querySelector('textarea')).toBeNull();

  // Circular data copy does not throw
  await act(async () => copyBtns[1].click());
  expect(dialog.querySelector('textarea')).toBeNull();
});
