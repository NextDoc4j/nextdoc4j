// @vitest-environment jsdom
import { SelectMenu } from '../../src/components/select-menu';
import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GlobalSearch } from '../../src/features/workspace/global-search';
import { createDocumentationSources } from '../../src/features/documentation/workspace';
import { Modal } from '../../src/components/modal';
import { SegmentedControl } from '../../src/components/segmented-control';
import { ContentErrorBoundary } from '../../src/components/content-error-boundary';

let host: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal('CSS', { escape: (value: string) => value });
  vi.stubGlobal('matchMedia', () => ({
    matches: true,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  Object.defineProperty(Element.prototype, 'scrollIntoView', { configurable: true, value() {} });
  Object.defineProperty(Element.prototype, 'scrollTo', { configurable: true, value() {} });
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
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('workspace interaction contracts', () => {
  it('preserves focus and prevents Escape dismissal while the modal is busy', async () => {
    vi.useFakeTimers();
    const trigger = document.createElement('button');
    document.body.append(trigger);
    trigger.focus();
    const close = vi.fn();
    await act(async () =>
      root.render(
        <Modal open busy title="请求处理中" onClose={close}>
          <input />
        </Modal>,
      ),
    );
    expect(document.documentElement.style.overflow).toBe('hidden');
    await act(async () =>
      host.querySelector('dialog')!.dispatchEvent(new Event('cancel', { cancelable: true })),
    );
    expect(close).not.toHaveBeenCalled();
    await act(async () =>
      root.render(
        <Modal open={false} title="请求处理中" onClose={close}>
          <input />
        </Modal>,
      ),
    );
    await act(async () => vi.runAllTimersAsync());
    expect(document.activeElement).toBe(trigger);
    expect(document.documentElement.style.overflow).not.toBe('hidden');
    trigger.remove();
  });

  it('changes vertical menu selection and focus together from the keyboard', async () => {
    /** Hosts controlled selection to verify the public keyboard contract.
     * @param None.
     * @returns A settings-style vertical segmented control.
     */
    function Menu() {
      const [value, setValue] = useState('query');
      return (
        <SegmentedControl
          ariaLabel="设置菜单"
          orientation="vertical"
          value={value}
          onChange={setValue}
          options={[
            { value: 'query', label: 'Query' },
            { value: 'headers', label: 'Headers' },
          ]}
        />
      );
    }
    await act(async () => root.render(<Menu />));
    const buttons = host.querySelectorAll('button');
    buttons[0].focus();
    await act(async () =>
      buttons[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })),
    );
    expect(buttons[1].getAttribute('aria-checked')).toBe('true');
    expect(document.activeElement).toBe(buttons[1]);
  });

  it('recovers the content boundary after switching documents', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    /** Models an invalid external document causing a render failure.
     * @param None.
     * @returns Never; throws during render for boundary recovery verification.
     */
    function InvalidDocument(): never {
      throw new Error('Invalid schema');
    }
    await act(async () =>
      root.render(
        <ContentErrorBoundary resetKeys={['broken']}>
          <InvalidDocument />
        </ContentErrorBoundary>,
      ),
    );
    expect(host.textContent).toContain('当前内容暂时无法显示');
    await act(async () =>
      root.render(
        <ContentErrorBoundary resetKeys={['valid']}>
          <p>接口详情</p>
        </ContentErrorBoundary>,
      ),
    );
    expect(host.textContent).toBe('接口详情');
  });
  it('opens the ranked search result when Enter is pressed during debounce', async () => {
    vi.useFakeTimers();
    const sources = createDocumentationSources({
      openapi: '3.1.0',
      info: { title: 'Demo', version: '1' },
      paths: {
        '/api/target': { post: { summary: 'Target', responses: {} } },
        '/api/post': { get: { summary: 'Read article', responses: {} } },
      },
    });
    const onSelect = vi.fn(
      async (entry: import('../../src/features/workspace/search-index').SearchEntry) => {
        void entry;
      },
    );
    const onClose = vi.fn();
    await act(async () =>
      root.render(
        <GlobalSearch
          sources={sources}
          services={[]}
          documents={[]}
          activeServiceUrl=""
          serviceName="Demo"
          loadSources={async () => []}
          onSelect={onSelect}
          onClose={onClose}
        />,
      ),
    );
    const input = host.querySelector('input')!;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(
        input,
        'get post',
      );
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await act(async () =>
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })),
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(150);
    });
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect.mock.calls[0][0]).toMatchObject({ path: '/api/post', method: 'GET' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

it('anchors short upward menus directly above their trigger', async () => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  vi.stubGlobal('innerHeight', 650);
  await act(async () =>
    root.render(
      <SelectMenu
        ariaLabel="写入目标"
        value="body"
        options={[
          { value: 'body', label: 'Body (JSON)' },
          { value: 'header', label: 'Header' },
        ]}
        onChange={vi.fn()}
      />,
    ),
  );
  const trigger = host.querySelector<HTMLButtonElement>('button')!;
  vi.spyOn(trigger, 'getBoundingClientRect').mockReturnValue({
    top: 600,
    bottom: 628,
    left: 20,
    right: 220,
    width: 200,
    height: 28,
    x: 20,
    y: 600,
    toJSON: () => ({}),
  });
  await act(async () => trigger.click());
  const menu = document.querySelector<HTMLElement>('[role="listbox"]')!;
  expect(menu.style.bottom).toBe('56px');
  expect(menu.style.top).toBe('');
});

it('supports searchable filtering and renders colored tags and descriptions', async () => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  const onChange = vi.fn();
  await act(async () =>
    root.render(
      <SelectMenu
        ariaLabel="选择接口"
        searchable
        searchPlaceholder="搜索接口..."
        value="GET /users"
        options={[
          {
            value: 'GET /users',
            label: 'GET /users',
            tag: 'GET',
            tagColor: '#10b981',
            description: '获取用户列表',
          },
          {
            value: 'POST /users',
            label: 'POST /users',
            tag: 'POST',
            tagColor: '#3b82f6',
            description: '创建用户',
          },
          {
            value: 'DELETE /users/{id}',
            label: 'DELETE /users/{id}',
            tag: 'DELETE',
            tagColor: '#ef4444',
            description: '删除用户',
          },
        ]}
        onChange={onChange}
      />,
    ),
  );
  const trigger = host.querySelector<HTMLButtonElement>('button')!;
  expect(trigger.querySelector('.select-menu__tag')?.textContent).toBe('GET');
  await act(async () => trigger.click());
  const searchInput = document.querySelector<HTMLInputElement>('.select-menu__search-input')!;
  expect(searchInput).not.toBeNull();
  expect(searchInput.placeholder).toBe('搜索接口...');

  // Filter by description keyword
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(
      searchInput,
      '创建',
    );
    searchInput.dispatchEvent(new Event('input', { bubbles: true }));
  });
  const options = document.querySelectorAll<HTMLButtonElement>('button[data-select-value]');
  expect(options).toHaveLength(1);
  expect(options[0].getAttribute('data-select-value')).toBe('POST /users');
  expect(options[0].querySelector('.select-menu__tag')?.textContent).toBe('POST');
  expect(options[0].querySelector('.select-menu__option-desc')?.textContent).toBe('创建用户');

  // Click filtered option
  await act(async () => options[0].click());
  expect(onChange).toHaveBeenCalledWith('POST /users');
});

it('keeps search input focused while filtering and handles Space and Enter cleanly without bubbling', async () => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  const onChange = vi.fn();
  await act(async () =>
    root.render(
      <SelectMenu
        ariaLabel="选择接口"
        searchable
        searchPlaceholder="搜索接口..."
        value=""
        options={[
          { value: 'GET /users', label: 'GET /users' },
          { value: 'POST /orders', label: 'POST /orders' },
        ]}
        onChange={onChange}
      />,
    ),
  );
  const trigger = host.querySelector<HTMLButtonElement>('button')!;
  await act(async () => trigger.click());
  const searchInput = document.querySelector<HTMLInputElement>('.select-menu__search-input')!;
  expect(searchInput).not.toBeNull();
  searchInput.focus();
  expect(document.activeElement).toBe(searchInput);

  // Type a filter query that changes the first matched option
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(
      searchInput,
      'POST',
    );
    searchInput.dispatchEvent(new Event('input', { bubbles: true }));
  });
  // Focus should remain on the search input, not stolen by the option button
  expect(document.activeElement).toBe(searchInput);

  // Pressing Space should not select an option or close the menu
  await act(async () => {
    searchInput.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
  });
  expect(onChange).not.toHaveBeenCalled();
  expect(document.querySelector('.select-menu__menu')).not.toBeNull();

  // Pressing Enter should select the focused option and call onChange only ONCE
  await act(async () => {
    searchInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  });
  expect(onChange).toHaveBeenCalledTimes(1);
  expect(onChange).toHaveBeenCalledWith('POST /orders');
});

it('does not commit option when Enter is pressed during IME composition', async () => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  const onChange = vi.fn();
  await act(async () =>
    root.render(
      <SelectMenu
        ariaLabel="选择接口"
        searchable
        value=""
        options={[{ value: 'POST /orders', label: '/orders', tag: 'POST' }]}
        onChange={onChange}
      />,
    ),
  );
  const trigger = host.querySelector<HTMLButtonElement>('button')!;
  await act(async () => trigger.click());
  const searchInput = document.querySelector<HTMLInputElement>('.select-menu__search-input')!;

  // Simulate Enter key event during IME composition
  const composingEvent = new KeyboardEvent('keydown', {
    key: 'Enter',
    bubbles: true,
  });
  Object.defineProperty(composingEvent, 'isComposing', {
    value: true,
    configurable: true,
  });
  Object.defineProperty(composingEvent, 'keyCode', {
    value: 229,
    configurable: true,
  });
  await act(async () => {
    searchInput.dispatchEvent(composingEvent);
  });
  expect(onChange).not.toHaveBeenCalled();
  expect(document.querySelector('.select-menu__menu')).not.toBeNull();
});

it('clears search input, restores full list and refocuses input when clear button is clicked', async () => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  const onChange = vi.fn();
  await act(async () =>
    root.render(
      <SelectMenu
        ariaLabel="选择接口"
        searchable
        value=""
        options={[
          { value: 'GET /users', label: '/users', tag: 'GET' },
          { value: 'POST /orders', label: '/orders', tag: 'POST' },
        ]}
        onChange={onChange}
      />,
    ),
  );
  const trigger = host.querySelector<HTMLButtonElement>('button')!;
  await act(async () => trigger.click());
  const searchInput = document.querySelector<HTMLInputElement>('.select-menu__search-input')!;

  // Initially clear button does not exist
  expect(document.querySelector('.select-menu__search-clear')).toBeNull();

  // Type query to filter
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(
      searchInput,
      'users',
    );
    searchInput.dispatchEvent(new Event('input', { bubbles: true }));
  });

  const clearBtn = document.querySelector<HTMLButtonElement>('.select-menu__search-clear');
  expect(clearBtn).not.toBeNull();
  // Clear button is not an option
  expect(clearBtn?.getAttribute('role')).toBeNull();
  expect(clearBtn?.classList.contains('select-menu__option')).toBe(false);

  // Filtered options count is 1, and options have select-menu__option class
  let options = document.querySelectorAll<HTMLButtonElement>('button[data-select-value]');
  expect(options).toHaveLength(1);
  expect(options[0].classList.contains('select-menu__option')).toBe(true);

  // Click clear button
  await act(async () => {
    clearBtn!.click();
  });

  // Query is cleared and search input is refocused
  expect(searchInput.value).toBe('');
  expect(document.activeElement).toBe(searchInput);
  expect(document.querySelector('.select-menu__search-clear')).toBeNull();

  // All options restored
  options = document.querySelectorAll<HTMLButtonElement>('button[data-select-value]');
  expect(options).toHaveLength(2);
});

it('restores keyboard selection after clearing an empty search and closes on Tab', async () => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  const onChange = vi.fn();
  await act(async () =>
    root.render(
      <SelectMenu
        ariaLabel="接口"
        searchable
        value=""
        options={[
          { value: 'disabled', label: '禁用', disabled: true },
          { value: 'first', label: '第一个' },
        ]}
        onChange={onChange}
      />,
    ),
  );
  await act(async () => host.querySelector<HTMLButtonElement>('button')!.click());
  const input = document.querySelector<HTMLInputElement>('.select-menu__search-input')!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, 'none');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await act(async () =>
    document.querySelector<HTMLButtonElement>('.select-menu__search-clear')!.click(),
  );
  await act(async () =>
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })),
  );
  expect(onChange).toHaveBeenCalledExactlyOnceWith('first');
  await act(async () => host.querySelector<HTMLButtonElement>('button')!.click());
  await act(async () =>
    document
      .querySelector<HTMLInputElement>('.select-menu__search-input')!
      .dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true })),
  );
  expect(document.querySelector('.select-menu__menu')).toBeNull();
});

it('windows large menus and keeps the last keyboard option mounted', async () => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  const onChange = vi.fn();
  await act(async () =>
    root.render(
      <SelectMenu
        ariaLabel="接口"
        searchable
        value=""
        options={Array.from({ length: 10000 }, (_, index) => ({
          value: String(index),
          label: `接口 ${index}`,
        }))}
        onChange={onChange}
      />,
    ),
  );
  await act(async () => host.querySelector<HTMLButtonElement>('button')!.click());
  expect(document.querySelectorAll('[data-select-value]').length).toBeLessThan(25);
  const search = document.querySelector<HTMLInputElement>('.select-menu__search-input')!;
  await act(async () =>
    search.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true })),
  );
  expect(document.querySelector('[data-select-value="9999"]')).not.toBeNull();
  expect(
    document
      .getElementById(search.getAttribute('aria-activedescendant')!)
      ?.getAttribute('data-select-value'),
  ).toBe('9999');
  await act(async () =>
    search.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })),
  );
  expect(onChange).toHaveBeenCalledExactlyOnceWith('9999');
});

it('keeps a manually scrolled virtual list at its scroll position after geometry updates', async () => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  await act(async () =>
    root.render(
      <SelectMenu
        ariaLabel="接口"
        searchable
        value=""
        options={Array.from({ length: 1000 }, (_, i) => ({ value: String(i), label: `接口 ${i}` }))}
        onChange={vi.fn()}
      />,
    ),
  );
  await act(async () => host.querySelector<HTMLButtonElement>('button')!.click());
  const list = document.querySelector<HTMLDivElement>('.select-menu__options-wrap')!;
  await act(async () => {
    list.scrollTop = 29000;
    list.dispatchEvent(new Event('scroll', { bubbles: true }));
  });
  await act(
    async () =>
      new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))),
  );
  expect(list.scrollTop).toBe(29000);
});
it('recovers from disabled and removed active choices without selecting unavailable options', async () => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  const onChange = vi.fn();
  await act(async () =>
    root.render(
      <SelectMenu
        ariaLabel="接口"
        searchable
        value="a"
        options={[{ value: 'a', label: 'A' }]}
        onChange={onChange}
      />,
    ),
  );
  await act(async () => host.querySelector<HTMLButtonElement>('button')!.click());
  await act(async () =>
    root.render(
      <SelectMenu
        ariaLabel="接口"
        searchable
        value="a"
        options={[{ value: 'a', label: 'A', disabled: true }]}
        onChange={onChange}
      />,
    ),
  );
  await act(async () =>
    document
      .querySelector<HTMLInputElement>('.select-menu__search-input')!
      .dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })),
  );
  expect(onChange).not.toHaveBeenCalled();
  await act(async () =>
    root.render(
      <SelectMenu
        ariaLabel="接口"
        searchable
        value="a"
        options={[{ value: 'b', label: 'B' }]}
        onChange={onChange}
      />,
    ),
  );
  await act(async () =>
    document
      .querySelector<HTMLInputElement>('.select-menu__search-input')!
      .dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })),
  );
  expect(onChange).toHaveBeenCalledExactlyOnceWith('b');
});

it.each([false, true])(
  'finds and selects model descriptions from %s remote indexing',
  async (remote) => {
    vi.useFakeTimers();
    const modelSources = createDocumentationSources({
      components: {
        schemas: {
          UpdateMenusReq: { type: 'object', description: '角色菜单更新参数' },
        },
      },
    });
    const service = { name: '角色服务', url: '/roles/v3/api-docs' };
    const onSelect = vi.fn(async () => undefined);
    const loadSources = vi.fn(async () => modelSources);
    await act(async () =>
      root.render(
        <GlobalSearch
          sources={remote ? [] : modelSources}
          services={remote ? [service] : []}
          documents={[]}
          activeServiceUrl=""
          serviceName="当前文档"
          loadSources={loadSources}
          onSelect={onSelect}
          onClose={vi.fn()}
        />,
      ),
    );
    await act(async () => vi.advanceTimersByTimeAsync(100));
    const input = host.querySelector('input')!;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(
        input,
        '角色',
      );
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await act(async () => vi.advanceTimersByTimeAsync(200));
    const result = host.querySelector<HTMLDivElement>('.command-search__item')!;
    expect(result).not.toBeNull();
    expect(result.textContent).toContain('角色菜单更新参数');
    expect(result.querySelector('mark')?.textContent).toBe('角色');
    await act(async () => result.click());
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'model',
        path: 'UpdateMenusReq',
        serviceUrl: remote ? service.url : '',
      }),
    );
    if (remote) expect(loadSources).toHaveBeenCalled();
  },
);

it.each([false, true])(
  'shows API description match excerpts from remote=%s sources without interpreting markup',
  async (remote) => {
    vi.useFakeTimers();
    const sources = createDocumentationSources({
      paths: {
        '/access': {
          post: {
            summary: 'Grant access',
            operationId: 'grantAccess',
            description: '配置角色权限 <img src=x onerror="alert(1)">',
            tags: ['授权管理'],
          },
        },
      },
    });
    await act(async () =>
      root.render(
        <GlobalSearch
          sources={remote ? [] : sources}
          services={remote ? [{ name: 'Service', url: '/remote/docs' }] : []}
          documents={[]}
          activeServiceUrl=""
          serviceName="Demo"
          loadSources={async () => sources}
          onSelect={async () => undefined}
          onClose={vi.fn()}
        />,
      ),
    );
    await act(async () => vi.advanceTimersByTimeAsync(100));
    const input = host.querySelector('input')!;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(
        input,
        '角色',
      );
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await act(async () => vi.advanceTimersByTimeAsync(200));
    expect(host.querySelector('.command-search__match')?.textContent).toContain(
      '接口说明匹配：配置角色权限',
    );
    expect(host.querySelector('.command-search__match mark')?.textContent).toBe('角色');
    expect(host.querySelector('.command-search__match img')).toBeNull();
  },
);
it('shows a document body excerpt and preserves document navigation', async () => {
  vi.useFakeTimers();
  const onSelect = vi.fn(async () => undefined);
  const documentEntry = {
    id: 'guide',
    kind: 'document' as const,
    title: '说明文档',
    path: '说明文档',
    group: '开发指南',
    method: 'DOC',
    service: 'Demo',
    serviceUrl: '',
    route: '#/markdown/开发指南/说明文档',
    text: '说明文档',
    content: '前言。'.repeat(100) + '角色权限的配置方法',
  };
  await act(async () =>
    root.render(
      <GlobalSearch
        sources={[]}
        services={[]}
        documents={[documentEntry]}
        activeServiceUrl=""
        serviceName="Demo"
        loadSources={async () => []}
        onSelect={onSelect}
        onClose={vi.fn()}
      />,
    ),
  );
  await act(async () => vi.advanceTimersByTimeAsync(100));
  const input = host.querySelector('input')!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, '角色');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await act(async () => vi.advanceTimersByTimeAsync(200));
  expect(host.querySelector('.command-search__match')?.textContent).toContain('正文匹配：');
  expect(host.querySelector('.command-search__match mark')?.textContent).toBe('角色');
  await act(async () => host.querySelector<HTMLDivElement>('.command-search__item')!.click());
  expect(onSelect).toHaveBeenCalledWith(documentEntry);
});

it('keeps the next editable picker open when an earlier selection restores focus on a later frame', async () => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  vi.useFakeTimers();
  await act(async () =>
    root.render(
      <>
        <SelectMenu
          ariaLabel="来源路径"
          editable
          value=""
          onChange={vi.fn()}
          options={[{ value: '$.source', label: '来源' }]}
        />
        <SelectMenu
          ariaLabel="目标路径"
          editable
          value=""
          onChange={vi.fn()}
          options={[{ value: '$.target', label: '目标' }]}
        />
      </>,
    ),
  );
  const source = host.querySelector<HTMLInputElement>('[aria-label="来源路径"]')!;
  const target = host.querySelector<HTMLInputElement>('[aria-label="目标路径"]')!;
  await act(async () => source.click());
  await act(async () =>
    document.querySelector<HTMLButtonElement>('[data-select-value="$.source"]')!.click(),
  );
  await act(async () => target.click());
  await act(async () => vi.advanceTimersByTimeAsync(32));
  expect(document.activeElement).toBe(target);
  expect(document.querySelector('[data-select-value="$.target"]')).not.toBeNull();
});
