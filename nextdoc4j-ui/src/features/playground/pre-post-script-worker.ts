import { createWorkflowRuntime, executeWorkflowSteps } from './pre-post-engine';
import type {
  PrePostPhase,
  PrePostPhaseConfig,
  WorkflowContext,
  WorkflowResponse,
} from './pre-post-types';
import type { ScriptWorkerMessage } from './pre-post-script-runner';

/** Sends an ordered script result or log to its owning page.
 * @param message Serializable worker message.
 * @returns Nothing; queues the message.
 */
const send = (message: ScriptWorkerMessage): void => globalThis.postMessage(message);

globalThis.onmessage = async (
  event: MessageEvent<{
    phase: PrePostPhase;
    config: PrePostPhaseConfig;
    context: WorkflowContext;
  }>,
) => {
  const { phase, config, context } = event.data;
  let { body, headers, queryParams } = context;
  let { pathParams = [], formFields = [], urlEncodedFields = [], cookies = [] } = context;
  let securityValues: Record<string, string> | undefined;
  const runtime = context.runtime ?? createWorkflowRuntime();
  try {
    await executeWorkflowSteps(config.steps, phase, {
      ...context,
      runtime,
      // Worker failures must propagate to the owning step's failure policy.
      onLog: (value) => {
        if (value.status !== 'pass') send({ type: 'log', value });
      },
      setBody: (value) => {
        body = value;
      },
      setHeaders: (value) => {
        headers = value;
      },
      setQueryParams: (value) => {
        queryParams = value;
      },
      setPathParams: (value) => {
        pathParams = value;
      },
      setFormFields: (value) => {
        formFields = value;
      },
      setUrlEncodedFields: (value) => {
        urlEncodedFields = value;
      },
      setCookies: (value) => {
        cookies = value;
      },
      onSecurityValuesChange: (value) => {
        securityValues = value;
      },
    });
    send({
      type: 'done',
      value: {
        body,
        headers,
        queryParams,
        runtime,
        securityValues,
        pathParams,
        formFields,
        urlEncodedFields,
        cookies,
      },
    });
  } catch (error) {
    const value = error instanceof Error ? error.message : String(error);
    try {
      send({
        type: 'error',
        runtime,
        value,
        response:
          error instanceof Error && 'response' in error
            ? (error.response as WorkflowResponse)
            : undefined,
      });
    } catch {
      send({ type: 'error', value: '脚本结果必须是可传递的数据：' + value });
    }
  }
};
