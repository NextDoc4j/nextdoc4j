import type {
  ConsoleLogEntry,
  PrePostPhase,
  PrePostPhaseConfig,
  WorkflowContext,
  WorkflowRuntime,
  WorkflowResponse,
} from './pre-post-types';
import type { DebugParameter } from './types';
export interface ScriptResult {
  body: string;
  headers: DebugParameter[];
  queryParams: DebugParameter[];
  runtime: WorkflowRuntime;
  pathParams: DebugParameter[];
  formFields: DebugParameter[];
  urlEncodedFields: DebugParameter[];
  cookies: DebugParameter[];
  securityValues?: Record<string, string>;
}
export type ScriptWorkerMessage =
  | { type: 'log'; value: ConsoleLogEntry }
  | { type: 'done'; value: ScriptResult }
  | { type: 'error'; value: string; runtime?: WorkflowRuntime; response?: WorkflowResponse };

/**
 * Runs a script off the UI thread and terminates it on completion or cancellation.
 * @param phase Pipeline phase determining the available nextdoc API.
 * @param config Script and retained step configuration.
 * @param context Serializable inputs and callbacks receiving ordered script updates.
 * @returns The final request values for pre-request scripts, or nothing for post-response.
 */
export async function runPipelineScript(
  phase: PrePostPhase,
  config: PrePostPhaseConfig,
  context: WorkflowContext,
): Promise<ScriptResult> {
  context.signal?.throwIfAborted();
  const worker = new Worker(new URL('./pre-post-script-worker.ts', import.meta.url), {
    type: 'module',
  });
  let onAbort: (() => void) | undefined;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await new Promise<ScriptResult>((resolve, reject) => {
      onAbort = () => reject(context.signal?.reason ?? new Error('脚本已取消'));
      context.signal?.addEventListener('abort', onAbort, { once: true });
      // Playground supplies its configured request timeout through the signal.
      if (!context.signal)
        timeout = setTimeout(() => reject(new Error('脚本执行超过 30 秒')), 30_000);
      worker.onerror = (event) => reject(new Error(event.message || '脚本执行失败'));
      worker.onmessage = ({ data }: MessageEvent<ScriptWorkerMessage>) => {
        if (context.signal?.aborted) return;
        try {
          switch (data.type) {
            case 'log':
              context.onLog(data.value);
              break;
            case 'done':
              resolve(data.value);
              break;
            case 'error':
              if (context.runtime && data.runtime) Object.assign(context.runtime, data.runtime);
              reject(Object.assign(new Error(data.value), { response: data.response }));
          }
        } catch (error) {
          reject(error);
        }
      };
      worker.postMessage({
        phase,
        config,
        context: Object.fromEntries(
          Object.entries(context).filter(
            ([key, value]) => key !== 'signal' && typeof value !== 'function',
          ),
        ),
      });
    });
  } finally {
    if (onAbort) context.signal?.removeEventListener('abort', onAbort);
    if (timeout !== undefined) clearTimeout(timeout);
    worker.terminate();
  }
}
