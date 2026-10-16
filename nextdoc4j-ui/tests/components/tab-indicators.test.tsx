// @vitest-environment jsdom
import { act, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { SegmentedControl } from '../../src/components/segmented-control';
import { useTabIndicators } from '../../src/components/use-tab-indicators';

let host: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
const disconnected = vi.fn();
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.useFakeTimers();
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect = disconnected;
    },
  );
  vi.spyOn(HTMLElement.prototype, 'offsetLeft', 'get').mockImplementation(function (
    this: HTMLElement,
  ) {
    return this.textContent === 'Long label' ? 82 : 2;
  });
  vi.spyOn(HTMLElement.prototype, 'offsetTop', 'get').mockReturnValue(2);
  vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(function (
    this: HTMLElement,
  ) {
    return this.textContent === 'Long label' ? 120 : 80;
  });
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(24);
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
it('moves active and ghost geometry without changing selection on hover', async () => {
  const changed = vi.fn();
  /** Hosts existing selection behavior while measuring presentation layers.
   * @param None.
   * @returns A controlled segmented switch.
   */
  function Example() {
    const [value, setValue] = useState('a');
    return (
      <SegmentedControl
        ariaLabel="choice"
        autoWidth
        value={value}
        onChange={(next) => {
          changed(next);
          setValue(next);
        }}
        options={[
          { value: 'a', label: 'Short' },
          { value: 'b', label: 'Long label' },
        ]}
      />
    );
  }
  await act(async () => root.render(<Example />));
  const container = host.querySelector<HTMLElement>('.workspace-segmented')!;
  const buttons = container.querySelectorAll('button');
  expect(container.style.getPropertyValue('--tab-active-width')).toBe('80px');
  await act(async () => buttons[1].dispatchEvent(new Event('pointerover', { bubbles: true })));
  expect(changed).not.toHaveBeenCalled();
  expect(container.style.getPropertyValue('--tab-hover-x')).toBe('82px');
  expect(container.style.getPropertyValue('--tab-hover-visible')).toBe('1');
  await act(async () => buttons[1].click());
  await act(async () => vi.advanceTimersByTime(32));
  expect(changed).toHaveBeenCalledExactlyOnceWith('b');
  expect(container.style.getPropertyValue('--tab-active-width')).toBe('120px');
  expect(container.style.getPropertyValue('--tab-hover-visible')).toBe('0');
});
it('attaches after loading and hides the active layer when the last tab closes', async () => {
  /** Models the workspace loading boundary without changing its tab DOM or handlers.
   * @param props Container availability and current tabs.
   * @returns Loading content or the workspace tab container.
   */
  function Example({ loaded, empty = false }: { loaded: boolean; empty?: boolean }) {
    const ref = useRef<HTMLDivElement>(null);
    useTabIndicators(ref, ':scope > button', ':scope > .active', loaded);
    return loaded ? (
      <div ref={ref}>{!empty && <button className="active">Short</button>}</div>
    ) : (
      <p>Loading</p>
    );
  }
  await act(async () => root.render(<Example loaded={false} />));
  await act(async () => root.render(<Example loaded />));
  const container = host.firstElementChild as HTMLElement;
  expect(container.style.getPropertyValue('--tab-active-visible')).toBe('1');
  await act(async () => root.render(<Example loaded empty />));
  await act(async () => vi.advanceTimersByTime(32));
  expect(container.style.getPropertyValue('--tab-active-visible')).toBe('0');
  await act(async () => root.render(<Example loaded={false} />));
  expect(disconnected).toHaveBeenCalled();
});

it('preserves disabled scope behavior without showing a hover layer for unavailable options', async () => {
  const onChange = vi.fn();
  await act(async () =>
    root.render(
      <SegmentedControl
        ariaLabel="参数作用域"
        mode="tabs"
        value="global"
        onChange={onChange}
        options={[
          { value: 'global', label: '全部服务默认' },
          { value: 'service', label: '当前服务', disabled: true },
        ]}
      />,
    ),
  );
  const container = host.querySelector<HTMLElement>('.workspace-segmented')!;
  const disabled = container.querySelectorAll('button')[1];
  expect(disabled.disabled).toBe(true);
  await act(async () => {
    disabled.click();
    disabled.dispatchEvent(new Event('pointerover', { bubbles: true }));
  });
  expect(onChange).not.toHaveBeenCalled();
  expect(container.style.getPropertyValue('--tab-hover-visible')).toBe('0');
  expect(container.querySelector('[aria-selected="true"]')?.textContent).toBe('全部服务默认');
});
