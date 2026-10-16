// @vitest-environment jsdom
import { act, type ComponentProps } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { Sidebar } from '../../src/features/workspace/sidebar';
import {
  createDocumentationSources,
  getDocumentationOperationKey,
} from '../../src/features/documentation/workspace';

const sources = createDocumentationSources({
  openapi: '3.0.3',
  info: { title: '菜单定位', version: '1' },
  paths: {
    '/users': {
      get: { tags: ['Users'], summary: '用户列表', responses: {} },
      post: { tags: ['Users'], summary: '创建用户', responses: {} },
    },
    '/settings': {
      put: { tags: ['Settings'], summary: '修改设置', responses: {} },
    },
  },
});
const keyFor = (summary: string) =>
  getDocumentationOperationKey(sources[0].operations.find((item) => item.summary === summary)!);

let host: HTMLDivElement;
let root: Root;
let props: ComponentProps<typeof Sidebar>;
let reduced: boolean;
const positions = new Map<string, number>();
const scrollTo = vi.fn();

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  reduced = true;
  vi.stubGlobal('matchMedia', () => ({
    matches: reduced,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(500);
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(36);
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
    this: HTMLElement,
  ) {
    const isNavigation = this.classList.contains('workspace-sidebar-expanded-nav');
    const label = this.classList.contains('workspace-menu-operation')
      ? this.lastElementChild?.textContent
      : undefined;
    const top = isNavigation ? 0 : (positions.get(label ?? '') ?? 100);
    const height = isNavigation ? 500 : 36;
    return { top, bottom: top + height, left: 0, right: 280, width: 280, height } as DOMRect;
  });
  Object.defineProperty(Element.prototype, 'scrollTo', { configurable: true, value: scrollTo });
  positions.clear();
  props = {
    collapsed: false,
    groupOverviewEnabled: true,
    hasSecuritySchemes: false,
    maxWidth: 600,
    markdownGroups: [],
    minWidth: 240,
    navigationExpansion: 'free',
    onExpandForInitialSelection: vi.fn(),
    onNavigate: vi.fn(),
    onResizeChange: vi.fn(),
    onSelectSettings: vi.fn(),
    onSelectGroup: vi.fn(),
    onSelect: vi.fn(),
    onSelectMarkdown: vi.fn(),
    onSelectModel: vi.fn(),
    onWidthChange: vi.fn(),
    selectedKey: keyFor('用户列表'),
    settingsSection: 'auth',
    sources,
    view: 'docs',
    width: 300,
  };
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function renderSelection(summary: string) {
  await act(async () => root.render(<Sidebar {...props} selectedKey={keyFor(summary)} />));
}

async function settleInitialSelection() {
  await renderSelection('用户列表');
  await act(async () => vi.advanceTimersByTime(400));
  scrollTo.mockClear();
}

it.each(['free', 'accordion'] as const)(
  'keeps visible APIs in place after route selection and repeated clicks in %s mode',
  async (navigationExpansion) => {
    props.navigationExpansion = navigationExpansion;
    await settleInitialSelection();
    positions.set('创建用户', 180);
    await renderSelection('创建用户');
    await act(async () => vi.advanceTimersByTime(400));
    expect(scrollTo).not.toHaveBeenCalled();
    const selected = host.querySelector<HTMLButtonElement>('.workspace-menu-operation-active')!;
    expect(selected.textContent).toContain('创建用户');
    await act(async () => selected.click());
    expect(props.onSelect).not.toHaveBeenCalled();
  },
);

it('reveals an offscreen API in an open branch on the next frame and respects reduced motion', async () => {
  await settleInitialSelection();
  positions.set('创建用户', 860);
  await renderSelection('创建用户');
  await act(async () => vi.advanceTimersByTime(32));
  expect(scrollTo).toHaveBeenCalledExactlyOnceWith({ top: 628, behavior: 'auto' });
  await act(async () => vi.advanceTimersByTime(400));
  expect(scrollTo).toHaveBeenCalledTimes(1);
});

it('cancels restoration of an expanding branch when a newer API is selected', async () => {
  reduced = false;
  await settleInitialSelection();
  positions.set('修改设置', 1200);
  await renderSelection('修改设置');
  await act(async () => vi.advanceTimersByTime(32));
  expect(scrollTo).not.toHaveBeenCalled();
  await renderSelection('创建用户');
  await act(async () => vi.advanceTimersByTime(400));
  expect(scrollTo).not.toHaveBeenCalled();
  expect(host.querySelector('.workspace-menu-operation-active')?.textContent).toContain('创建用户');
});
