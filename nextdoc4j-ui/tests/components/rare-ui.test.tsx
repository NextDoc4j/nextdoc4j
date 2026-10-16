// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { DeleteButton } from '../../src/components/rare-ui/delete-button';
import { CodeBlock } from '../../src/components/rare-ui/code-block';
import { AnimatedCounter } from '../../src/components/rare-ui/animated-counter';
import { ScrollProgress } from '../../src/components/rare-ui/scroll-progress';
import { Modal } from '../../src/components/modal';
import { MarkdownContent } from '../../src/features/documentation/markdown-content';
import { copyText } from '../../src/lib/clipboard';
import { AnimatedCopyButton } from '../../src/components/rare-ui/animated-copy-button';
import { AnimatedDetails, HeightTransition } from '../../src/components/rare-ui/height-transition';

let host: HTMLDivElement;
let root: Root;
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal('matchMedia', () => ({
    matches: true,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
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
  document.documentElement.classList.remove('dark');
  delete document.documentElement.dataset.themePreference;
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it('waits for the actual copy result, blocks duplicate attempts and resets successful feedback', async () => {
  vi.useFakeTimers();
  let resolve!: (success: boolean) => void;
  const copy = vi
    .fn()
    .mockImplementationOnce(
      () =>
        new Promise<boolean>((done) => {
          resolve = done;
        }),
    )
    .mockResolvedValueOnce(true);
  await act(async () => root.render(<AnimatedCopyButton aria-label="复制响应" onCopy={copy} />));
  const button = host.querySelector<HTMLButtonElement>('button')!;
  await act(async () => {
    button.click();
    button.click();
  });
  expect(copy).toHaveBeenCalledTimes(1);
  expect(button.disabled).toBe(true);
  expect(button.hasAttribute('data-copied')).toBe(false);
  await act(async () => resolve(false));
  expect(button.disabled).toBe(false);
  expect(button.hasAttribute('data-copied')).toBe(false);
  await act(async () => button.click());
  expect(button.hasAttribute('data-copied')).toBe(true);
  await act(async () => vi.advanceTimersByTime(1800));
  expect(button.hasAttribute('data-copied')).toBe(false);
});

it('does not show successful feedback on a new source when an older copy finishes', async () => {
  let resolve!: () => void;
  const copy = vi.fn(
    () =>
      new Promise<void>((done) => {
        resolve = done;
      }),
  );
  await act(async () => root.render(<AnimatedCopyButton text="old" onCopy={copy} />));
  await act(async () => host.querySelector<HTMLButtonElement>('button')!.click());
  await act(async () => root.render(<AnimatedCopyButton text="new" onCopy={copy} />));
  await act(async () => resolve());
  expect(host.querySelector('button')?.hasAttribute('data-copied')).toBe(false);
});

it('makes closing details inert immediately, retains inputs and cancels closing when reopened', async () => {
  vi.useFakeTimers();
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  await act(async () =>
    root.render(
      <AnimatedDetails defaultOpen summary="执行设置">
        <input defaultValue="保存的配置" />
      </AnimatedDetails>,
    ),
  );
  const details = host.querySelector('details')!;
  const summary = host.querySelector('summary')!;
  const input = host.querySelector('input')!;
  await act(async () => summary.click());
  expect(summary.getAttribute('aria-expanded')).toBe('false');
  expect(details.open).toBe(true);
  expect(input.closest('[inert]')).not.toBeNull();
  await act(async () => summary.click());
  await act(async () => vi.advanceTimersByTime(200));
  expect(details.open).toBe(true);
  expect(input.closest('[inert]')).toBeNull();
  expect(host.querySelector('input')).toBe(input);
  expect(input.value).toBe('保存的配置');
  await act(async () => summary.click());
  await act(async () => vi.advanceTimersByTime(200));
  expect(details.open).toBe(false);
});

it('lazily mounts tree branches, retains closing content and cancels stale unmount on reversal', async () => {
  vi.useFakeTimers();
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  }));
  const render = (open: boolean) => (
    <HeightTransition open={open} unmountOnExit>
      <button>子级字段</button>
    </HeightTransition>
  );
  await act(async () => root.render(render(false)));
  expect(host.querySelector('button')).toBeNull();
  await act(async () => root.render(render(true)));
  const button = host.querySelector('button')!;
  await act(async () => root.render(render(false)));
  expect(button.closest('[inert]')).not.toBeNull();
  expect(button.isConnected).toBe(true);
  await act(async () => vi.advanceTimersByTime(80));
  await act(async () => root.render(render(true)));
  await act(async () => vi.advanceTimersByTime(200));
  expect(host.querySelector('button')).toBe(button);
  expect(button.closest('[inert]')).toBeNull();
  await act(async () => root.render(render(false)));
  await act(async () => vi.advanceTimersByTime(200));
  expect(host.querySelector('button')).toBeNull();
});

it('removes lazy closed branches immediately with reduced motion', async () => {
  await act(async () =>
    root.render(
      <HeightTransition unmountOnExit>
        <button>子级字段</button>
      </HeightTransition>,
    ),
  );
  await act(async () =>
    root.render(
      <HeightTransition open={false} unmountOnExit>
        <button>子级字段</button>
      </HeightTransition>,
    ),
  );
  expect(host.querySelector('button')).toBeNull();
});

it('requires confirmation and cancels with Escape without dismissing the owning modal', async () => {
  const remove = vi.fn();
  const close = vi.fn();
  await act(async () =>
    root.render(
      <Modal open title="参数" onClose={close}>
        <DeleteButton compact label="删除 Token" description="删除此配置" onConfirm={remove} />
      </Modal>,
    ),
  );
  const trigger = host.querySelector<HTMLButtonElement>('[aria-label="删除 Token"]')!;
  await act(async () => trigger.click());
  const panel = host.querySelector<HTMLElement>('.rare-delete-confirm')!;
  expect(panel.closest('dialog')).not.toBeNull();
  expect(panel.textContent).toContain('删除此配置');
  expect(panel.classList.contains('is-compact')).toBe(true);
  const actions = [...panel.querySelectorAll('button')];
  expect(actions.map((button) => button.getAttribute('aria-label'))).toEqual([
    '确认删除',
    '取消删除',
  ]);
  expect(actions.every((button) => button.textContent === '' && button.querySelector('svg'))).toBe(
    true,
  );
  expect(remove).not.toHaveBeenCalled();
  await act(async () =>
    panel.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
    ),
  );
  expect(document.activeElement).toBe(trigger);
  expect(close).not.toHaveBeenCalled();
  expect(remove).not.toHaveBeenCalled();
});

it('awaits deletion, prevents repeat submissions and retains a failed action for retry', async () => {
  let reject!: (error: Error) => void;
  const remove = vi
    .fn()
    .mockImplementationOnce(
      () =>
        new Promise<void>((_resolve, fail) => {
          reject = fail;
        }),
    )
    .mockResolvedValueOnce(undefined);
  await act(async () => root.render(<DeleteButton label="清理草稿" onConfirm={remove} />));
  await act(async () => host.querySelector<HTMLButtonElement>('button')!.click());
  const confirm = document.querySelector<HTMLButtonElement>(
    '.rare-delete-confirm-actions .is-danger',
  )!;
  await act(async () => {
    confirm.click();
    confirm.click();
  });
  expect(remove).toHaveBeenCalledTimes(1);
  expect(confirm.disabled).toBe(true);
  expect(host.textContent).not.toContain('操作已完成');
  await act(async () => reject(new Error('storage failure')));
  expect(document.querySelector('[role="alert"]')?.textContent).toContain('操作失败');
  expect(confirm.disabled).toBe(false);
  await act(async () => confirm.click());
  expect(remove).toHaveBeenCalledTimes(2);
  expect(host.textContent).toContain('操作已完成');
});

it('keeps a single accessible number when its digits and sign change', async () => {
  await act(async () => root.render(<AnimatedCounter value={9} />));
  expect(host.textContent).toBe('9');
  await act(async () => root.render(<AnimatedCounter value={-12.5} decimals={1} />));
  expect(host.querySelector('.rare-counter-value')?.textContent).toBe('-12.5');
  expect(host.querySelectorAll('[data-slot="animated-counter-digit"]')).toHaveLength(3);
});

it('tracks the owning document viewport, clamps overscroll and updates when content height changes', async () => {
  vi.useFakeTimers();
  let resized = () => {};
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(callback: () => void) {
        resized = callback;
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  const unrelated = document.createElement('main');
  const scroller = document.createElement('main');
  let height = 1000;
  Object.defineProperty(scroller, 'scrollHeight', { get: () => height });
  Object.defineProperty(scroller, 'clientHeight', { value: 200 });
  scroller.scrollTop = 400;
  scroller.scrollTo = vi.fn();
  unrelated.scrollTo = vi.fn();
  document.body.append(unrelated, scroller);
  try {
    await act(async () => root.render(<ScrollProgress containerRef={{ current: scroller }} />));
    expect(host.textContent).toBe('50%');
    await act(async () => {
      scroller.scrollTop = 1200;
      scroller.dispatchEvent(new Event('scroll'));
      vi.advanceTimersByTime(32);
    });
    expect(host.textContent).toBe('100%');
    await act(async () => {
      scroller.scrollTop = -20;
      scroller.dispatchEvent(new Event('scroll'));
      vi.advanceTimersByTime(32);
    });
    expect(host.textContent).toBe('0%');
    await act(async () => {
      height = 600;
      scroller.scrollTop = 200;
      resized();
      vi.advanceTimersByTime(32);
    });
    expect(host.textContent).toBe('50%');
    await act(async () => {
      height = 200;
      resized();
      vi.advanceTimersByTime(32);
    });
    expect(host.textContent).toBe('100%');
    await act(async () =>
      host.querySelector<HTMLButtonElement>('[aria-label="回到顶部"]')!.click(),
    );
    expect(scroller.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'auto' });
    expect(unrelated.scrollTo).not.toHaveBeenCalled();
  } finally {
    unrelated.remove();
    scroller.remove();
  }
});

it('uses the workspace light palette over an OS dark preference and follows theme changes', async () => {
  document.documentElement.dataset.themePreference = 'light';
  await act(async () =>
    root.render(<CodeBlock code="type User = string;" language="typescript" />),
  );
  const code = host.querySelector<HTMLElement>('[data-slot="code-block"]')!;
  const lightBackground = code.style.getPropertyValue('--cb-bg');
  expect(lightBackground).toBe('oklch(0.985 0 0)');
  await act(async () => {
    document.documentElement.classList.add('dark');
  });
  expect(code.style.getPropertyValue('--cb-bg')).not.toBe(lightBackground);
  await act(async () => {
    document.documentElement.classList.remove('dark');
  });
  expect(code.style.getPropertyValue('--cb-bg')).toBe(lightBackground);
});

it('copies inside the active dialog when the Clipboard API rejects access', async () => {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
  });
  const exec = vi.fn(() => {
    expect(document.activeElement?.closest('dialog[open]')).not.toBeNull();
    expect((document.activeElement as HTMLTextAreaElement).value).toBe(
      'export type User = string;',
    );
    return true;
  });
  Object.defineProperty(document, 'execCommand', { configurable: true, value: exec });
  await act(async () =>
    root.render(
      <Modal open title="类型" onClose={vi.fn()}>
        <CodeBlock code="export type User = string;" language="typescript" />
      </Modal>,
    ),
  );
  await act(async () => host.querySelector<HTMLButtonElement>('[aria-label="复制代码"]')!.click());
  expect(exec).toHaveBeenCalledOnce();
  expect(host.querySelector('[aria-label="已复制"]')).not.toBeNull();
  expect(document.querySelector('textarea')).toBeNull();
});

it('reports a failed fallback instead of announcing a successful copy', async () => {
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined });
  Object.defineProperty(document, 'execCommand', { configurable: true, value: () => false });
  await expect(copyText('source')).rejects.toThrow('复制失败');
  expect(document.querySelector('textarea')).toBeNull();
});

it('renders fenced code as inert text and preserves sanitized Markdown across updates', async () => {
  const content =
    '# 文档\n\n<script>window.injected = true</script>\n\n```html\n<img src=x onerror="alert(1)">\n```\n\n```ts\nconst value = 1;\n```';
  await act(async () => root.render(<MarkdownContent allowHtml content={content} />));
  expect(host.querySelector('h1')?.textContent).toBe('文档');
  expect(host.querySelector('script')).toBeNull();
  expect(host.querySelector('img')).toBeNull();
  expect(host.querySelectorAll('[data-slot="code-block"]')).toHaveLength(2);
  expect(host.textContent).toContain('<img src=x onerror="alert(1)">');
  await act(async () =>
    root.render(<MarkdownContent content={'## 更新\n\n```json\n{"ok":true}\n```'} />),
  );
  expect(host.querySelectorAll('[data-slot="code-block"]')).toHaveLength(1);
  expect(host.textContent).toContain('"ok"');
  expect(host.textContent).not.toContain('onerror');
});
