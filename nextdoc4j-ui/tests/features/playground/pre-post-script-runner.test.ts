import { Worker as NodeWorker } from 'node:worker_threads';
import { afterEach, expect, it, vi } from 'vitest';
import { runPipelineScript } from '../../../src/features/playground/pre-post-script-runner';

afterEach(() => vi.unstubAllGlobals());

it('terminates a synchronous infinite loop when the request is cancelled', async () => {
  let stopped: Promise<number> | undefined;
  const terminate = vi.fn();
  class LoopWorker {
    onmessage?: (event: { data: unknown }) => void;
    onerror?: (event: { message: string }) => void;
    private worker = new NodeWorker(
      `
      const { parentPort } = require('node:worker_threads');
      parentPort.on('message', () => {
        parentPort.postMessage({ type: 'log', value: { content: 'started' } });
        while (true) {}
      });
    `,
      { eval: true },
    );

    constructor() {
      this.worker.on('message', (data) => this.onmessage?.({ data }));
      this.worker.on('error', (error) => this.onerror?.({ message: error.message }));
    }
    /** Forwards the start message to a real worker thread.
     * @param data Serializable pipeline inputs.
     * @returns Nothing after scheduling execution.
     */
    postMessage(data: unknown) {
      this.worker.postMessage(data);
    }
    /** Stops the worker even while it is executing synchronous code.
     * @returns Nothing; records a promise for thread shutdown.
     */
    terminate() {
      terminate();
      stopped = this.worker.terminate();
    }
  }
  vi.stubGlobal('Worker', LoopWorker);
  const controller = new AbortController();
  const running = runPipelineScript(
    'pre-request',
    {
      steps: [
        {
          id: 'script',
          name: '脚本',
          type: 'script',
          enabled: true,
          failurePolicy: 'abort',
          scriptCode: 'while (true) {}',
        },
      ],
    },
    {
      body: '',
      headers: [],
      queryParams: [],
      signal: controller.signal,
      onLog: () => controller.abort(),
      setBody: vi.fn(),
      setHeaders: vi.fn(),
      setQueryParams: vi.fn(),
    },
  );
  await expect(running).rejects.toMatchObject({ name: 'AbortError' });
  expect(terminate).toHaveBeenCalledOnce();
  await stopped;
});

it('carries request fields and authentication across real isolated script workers', async () => {
  const { executePreRequestPipeline } =
    await import('../../../src/features/playground/pre-post-engine');
  const { createWorkflowStep } = await import('../../../src/features/playground/pre-post-types');
  class SourceWorker {
    onmessage?: (event: { data: unknown }) => void;
    onerror?: (event: { message: string }) => void;
    private worker = new NodeWorker(
      `
      const { parentPort } = require('node:worker_threads');
      (async () => {
        const { createServer } = await import('vite');
        const server = await createServer({
          configFile: false,
          optimizeDeps: { noDiscovery: true, include: [] },
          server: { middlewareMode: true, watch: null },
        });
        globalThis.postMessage = value => parentPort.postMessage(value);
        await server.ssrLoadModule('/src/features/playground/pre-post-script-worker.ts');
        parentPort.on('message', data => globalThis.onmessage({ data }));
      })().catch(error => { throw error; });
    `,
      { eval: true },
    );
    constructor() {
      this.worker.on('message', (data) => this.onmessage?.({ data }));
      this.worker.on('error', (error) => this.onerror?.({ message: error.message }));
    }
    /** Runs the real worker entry with a structured clone of the request.
     * @param data Script configuration and transport context.
     * @returns Nothing; schedules isolated execution.
     */
    postMessage(data: unknown) {
      this.worker.postMessage(data);
    }
    /** Releases the worker and its Vite resources after completion or failure.
     * @returns Nothing; initiates thread termination.
     */
    terminate() {
      void this.worker.terminate();
    }
  }
  vi.stubGlobal('window', {});
  vi.stubGlobal('Worker', SourceWorker);
  const result = await executePreRequestPipeline(
    {
      steps: [
        {
          ...createWorkflowStep('script', 'pre-request'),
          scriptCode:
            'nextdoc.security.setToken("BearerAuth", "fresh"); nextdoc.request.formFields.set("name", "updated");',
        },
        {
          ...createWorkflowStep('script', 'pre-request'),
          scriptCode:
            'nextdoc.assert(nextdoc.request.headers.get("Authorization") === "Bearer fresh", "missing token"); nextdoc.assert(nextdoc.request.formFields.get("name") === "updated", "missing field"); nextdoc.security.setToken("ApiKey", "key");',
        },
      ],
    },
    {
      body: '',
      bodyKind: 'form-data',
      headers: [],
      queryParams: [],
      securityKeys: ['BearerAuth', 'ApiKey'],
      securityValues: { BearerAuth: 'old', ApiKey: 'old' },
      securitySchemes: {
        BearerAuth: { type: 'http', scheme: 'bearer' },
        ApiKey: { type: 'apiKey', in: 'query', name: 'api_key' },
      },
      onLog: vi.fn(),
      setBody: vi.fn(),
      setHeaders: vi.fn(),
      setQueryParams: vi.fn(),
    },
  );
  expect(result.securityValues).toEqual({ BearerAuth: 'fresh', ApiKey: 'key' });
  expect(result.formFields).toEqual([{ name: 'name', value: 'updated', enabled: true }]);
  expect(result.queryParams).toEqual([{ name: 'api_key', value: 'key', enabled: true }]);
}, 15_000);
