// @vitest-environment jsdom
import { act, useRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useMovingHighlight } from '../../src/components/rare-ui/use-moving-highlight';

let host: HTMLDivElement;
let root: Root;
let rowTop: number;
let rowWidth: number;

function Menu({ enabled = true, branch = true }: { enabled?: boolean; branch?: boolean }) {
  const layout = useRef<HTMLDivElement>(null);
  const nav = useRef<HTMLElement>(null);
  useMovingHighlight(nav, 'button', '.active', enabled, undefined, layout);
  return (
    <div ref={layout}>
      <nav className="rare-moving-menu" ref={nav}>
        {branch && <div className="branch">折叠内容</div>}
        <button className="active">当前接口</button>
        <button>另一接口</button>
        <button>
          <span>第三个接口</span>
        </button>
        <svg />
      </nav>
    </div>
  );
}

const transition = (target: Element, type: string, propertyName: string, pseudoElement = '') => {
  const event = new Event(type, { bubbles: true });
  Object.defineProperties(event, {
    propertyName: { value: propertyName },
    pseudoElement: { value: pseudoElement },
  });
  target.dispatchEvent(event);
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  rowTop = 40;
  rowWidth = 200;
  vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(200);
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(36);
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
    this: HTMLElement,
  ) {
    const top = this.matches('button') ? 10 + rowTop : 10;
    const left = this.matches('button') ? 24 : 20;
    const width = this.matches('button') ? rowWidth : 300;
    return { top, bottom: top + 36, left, right: left + width, width, height: 36 } as DOMRect;
  });
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

async function mount() {
  await act(async () => root.render(<Menu />));
  await act(async () => vi.advanceTimersByTime(32));
  return host.querySelector('nav')!;
}

it('follows live row positions and widths during folding without waiting for DOM mutations', async () => {
  const nav = await mount();
  await act(async () => transition(host.firstElementChild!, 'transitionrun', 'width'));
  rowTop = 20;
  rowWidth = 128;
  await act(async () => vi.advanceTimersByTime(32));
  expect(nav.style.getPropertyValue('--moving-active-y')).toBe('20px');
  expect(nav.style.getPropertyValue('--moving-active-width')).toBe('128px');
  expect(nav.hasAttribute('data-moving-layout')).toBe(true);
  rowTop = 12;
  rowWidth = 72;
  await act(async () => transition(host.firstElementChild!, 'transitionend', 'width'));
  await act(async () => vi.advanceTimersByTime(48));
  expect(nav.style.getPropertyValue('--moving-active-y')).toBe('12px');
  expect(nav.style.getPropertyValue('--moving-active-width')).toBe('72px');
  expect(nav.hasAttribute('data-moving-layout')).toBe(false);
  expect(nav.hasAttribute('data-moving-ready')).toBe(true);
});

it('keeps following until overlapping layout transitions finish or cancel', async () => {
  const nav = await mount();
  const owner = host.firstElementChild!;
  const branch = host.querySelector('.branch')!;
  await act(async () => {
    transition(owner, 'transitionrun', 'width');
    transition(branch, 'transitionrun', 'grid-template-rows');
    transition(owner, 'transitioncancel', 'width');
  });
  rowTop = 24;
  await act(async () => vi.advanceTimersByTime(48));
  expect(nav.hasAttribute('data-moving-layout')).toBe(true);
  expect(nav.style.getPropertyValue('--moving-active-y')).toBe('24px');
  await act(async () => transition(branch, 'transitionend', 'grid-template-rows'));
  await act(async () => vi.advanceTimersByTime(48));
  expect(nav.hasAttribute('data-moving-layout')).toBe(false);
});

it('restores selection motion when a lazy branch unmounts before its transition finishes', async () => {
  const nav = await mount();
  await act(async () =>
    transition(host.querySelector('.branch')!, 'transitionrun', 'grid-template-rows'),
  );
  rowTop = 0;
  await act(async () => root.render(<Menu branch={false} />));
  await act(async () => vi.advanceTimersByTime(48));
  expect(nav.style.getPropertyValue('--moving-active-y')).toBe('0px');
  expect(nav.hasAttribute('data-moving-layout')).toBe(false);
});

it('ignores decorative icon and highlight transitions and stops following when disabled', async () => {
  const nav = await mount();
  await act(async () => {
    transition(nav.querySelector('svg')!, 'transitionrun', 'transform');
    transition(nav, 'transitionrun', 'width', '::before');
  });
  expect(nav.hasAttribute('data-moving-layout')).toBe(false);
  await act(async () => transition(host.firstElementChild!, 'transitionrun', 'width'));
  await act(async () => root.render(<Menu enabled={false} />));
  expect(nav.hasAttribute('data-moving-layout')).toBe(false);
  const previousTop = nav.style.getPropertyValue('--moving-active-y');
  rowTop = 120;
  await act(async () => {
    transition(host.firstElementChild!, 'transitionrun', 'width');
    vi.advanceTimersByTime(48);
  });
  expect(nav.style.getPropertyValue('--moving-active-y')).toBe(previousTop);
});

it('coalesces rapid pointer targets and does not jump to old click focus across menu gaps', async () => {
  const nav = await mount();
  const [, clicked, hovered] = nav.querySelectorAll('button');
  await act(async () => clicked.focus());
  await act(async () => vi.advanceTimersByTime(32));
  const geometry = vi.spyOn(hovered, 'getBoundingClientRect');
  await act(async () => {
    clicked.dispatchEvent(new Event('pointerover', { bubbles: true }));
    nav.dispatchEvent(new Event('pointerover', { bubbles: true }));
    hovered.dispatchEvent(new Event('pointerover', { bubbles: true }));
  });
  expect(geometry).not.toHaveBeenCalled();
  await act(async () => vi.advanceTimersByTime(32));
  expect(geometry).toHaveBeenCalledTimes(1);
  expect(nav.style.getPropertyValue('--moving-hover-visible')).toBe('1');
  geometry.mockClear();
  await act(async () =>
    hovered.querySelector('span')!.dispatchEvent(new Event('pointerover', { bubbles: true })),
  );
  await act(async () => vi.advanceTimersByTime(32));
  expect(geometry).not.toHaveBeenCalled();

  await act(async () => nav.dispatchEvent(new Event('pointerover', { bubbles: true })));
  await act(async () => vi.advanceTimersByTime(32));
  expect(document.activeElement).toBe(clicked);
  expect(nav.style.getPropertyValue('--moving-hover-visible')).toBe('0');

  await act(async () =>
    clicked.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })),
  );
  await act(async () => vi.advanceTimersByTime(32));
  expect(nav.style.getPropertyValue('--moving-hover-visible')).toBe('1');
});

it('clears the focus highlight when focus moves to an item outside its container', async () => {
  const nav = await mount();
  const button = nav.querySelectorAll('button')[1];
  const external = document.createElement('button');
  host.append(external);
  await act(async () => button.focus());
  await act(async () => vi.advanceTimersByTime(32));
  expect(nav.style.getPropertyValue('--moving-hover-visible')).toBe('1');
  await act(async () => external.focus());
  await act(async () => vi.advanceTimersByTime(32));
  expect(nav.style.getPropertyValue('--moving-hover-visible')).toBe('0');
});
