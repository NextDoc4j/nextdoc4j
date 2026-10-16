import { afterEach, expect, it, vi } from 'vitest';
import { processResponseJson } from '../../../src/features/playground/response-processing';

const workers: WorkerDouble[] = [];
const latestWorker = () => workers.at(-1)!;
/** Simulates worker messaging to exercise cancellation and terminal cleanup. */
class WorkerDouble {
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onerror: ((event: { message: string }) => void) | null = null;
  onmessageerror: (() => void) | null = null;
  postMessage = vi.fn();
  terminate = vi.fn();
  constructor() {
    workers.push(this);
  }
}
afterEach(() => vi.unstubAllGlobals());
it('terminates a cancelled worker and ignores its late success', async () => {
  vi.stubGlobal('Worker', WorkerDouble);
  const controller = new AbortController();
  const result = processResponseJson('{"full":true}', controller.signal);
  controller.abort();
  latestWorker().onmessage?.({ data: { value: { full: true } } });
  await expect(result).rejects.toMatchObject({ name: 'AbortError' });
  expect(latestWorker().terminate).toHaveBeenCalledOnce();
});
it('returns complete data and always terminates on successful processing', async () => {
  vi.stubGlobal('Worker', WorkerDouble);
  const result = processResponseJson('{"full":true}');
  latestWorker().onmessage?.({ data: { value: { full: true } } });
  await expect(result).resolves.toEqual({ full: true });
  expect(latestWorker().terminate).toHaveBeenCalledOnce();
});
it('distinguishes invalid JSON from worker transport errors', async () => {
  vi.stubGlobal('Worker', WorkerDouble);
  const invalid = processResponseJson('invalid');
  latestWorker().onmessage?.({ data: { error: 'invalid JSON' } });
  await expect(invalid).rejects.toBeInstanceOf(SyntaxError);
  expect(latestWorker().terminate).toHaveBeenCalledOnce();
  const transport = processResponseJson('{}');
  latestWorker().onmessageerror?.();
  await expect(transport).rejects.toThrow('无法传递');
  expect(latestWorker().terminate).toHaveBeenCalledOnce();
});
