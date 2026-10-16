// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import { usePlaygroundConsole } from '../../src/features/playground/use-playground-console';

let controls: ReturnType<typeof usePlaygroundConsole>;
/** Renders console state through its public hook for lifecycle tests.
 * @param props Current interface identity.
 * @returns Retained log text and omitted count.
 */
function Console({ scope }: { scope: string }) {
  controls = usePlaygroundConsole(scope);
  return (
    <div>
      {controls.consoleLogs.map((log) => log.content).join(',')}:{controls.consoleDropped}
    </div>
  );
}
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
it('batches logs and never restores cleared or unmounted batches', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.useFakeTimers();
  const host = document.createElement('div');
  const root = createRoot(host);
  await act(async () => root.render(<Console scope="first" />));
  await act(async () => {
    for (let i = 0; i < 1000; i++)
      controls.appendLog({ phase: 'net', category: 'NET', content: String(i), time: 'now' });
  });
  expect(host.textContent).toBe(':0');
  await act(async () => vi.advanceTimersByTime(100));
  expect(controls.consoleLogs).toHaveLength(500);
  expect(controls.consoleDropped).toBe(500);
  await act(async () => {
    controls.appendLog({ phase: 'net', category: 'NET', content: 'queued', time: 'now' });
    controls.clearLogs();
    vi.advanceTimersByTime(100);
  });
  expect(host.textContent).toBe(':0');
  await act(async () => {
    controls.appendLog({ phase: 'net', category: 'NET', content: 'old scope', time: 'now' });
    root.render(<Console scope="second" />);
  });
  await act(async () => vi.advanceTimersByTime(100));
  expect(host.textContent).toBe(':0');
  await act(async () => {
    controls.appendLog({ phase: 'net', category: 'NET', content: 'unmounted', time: 'now' });
    root.unmount();
  });
  expect(vi.getTimerCount()).toBe(0);
});
