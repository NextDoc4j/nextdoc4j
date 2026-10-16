import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { getApiBase } from '../../lib/http';
import type { ApiOperation, OpenApiDocument } from '../../types/openapi';
import { toPrettyJson } from '../openapi/utils';
import type { ResolvedSecurityScheme } from '../security/security';
import { formatPlaygroundXml } from './body-format';
import { parameterKey } from './parameter-overrides';
import {
  createWorkflowRuntime,
  executePostResponsePipeline,
  executePreRequestPipeline,
  executeWorkflowSteps,
} from './pre-post-engine';
import type {
  ConsoleLogEntry,
  PrePostPhaseConfig,
  WorkflowRuntime,
  WorkflowStep,
} from './pre-post-types';
import { canRunWorkflowStepManually } from './pre-post-types';
import {
  applyPathParameters,
  buildDebugRequest,
  canApplyBrowserCookies,
  createBrowserCookies,
} from './request';
import { consumeSseStream, parseDebugResponse } from './response';
import {
  formatBytes,
  formatResponseSource,
  getDownloadFileName,
  getResourceTiming,
  measureRequestBody,
  measureText,
  type ResponseMetrics,
} from './response-metrics';
import { largeResponseBytes, truncateResponsePreview } from './response-preview';
import { SseBuffer } from './sse-buffer';
import type { DebugBodyKind, DebugFileField, DebugParameter, SseEvent } from './types';
import { readWorkflowSession, writeWorkflowSession } from './workflow-session';

interface RequestSnapshot {
  body: string;
  contentType: string;
  cookies: DebugParameter[];
  headers: Array<[string, string]>;
  method: string;
  sentAt: string;
  url: string;
}

type ResponseTab = 'headers' | 'request' | 'response' | 'console';

interface Inputs {
  request: {
    body: BodyInit | undefined;
    bodyKind: DebugBodyKind;
    bodyPreview: string;
    cookies: DebugParameter[];
    formFields: DebugParameter[];
    formFiles: DebugFileField[];
    headers: Headers;
    method: string;
    url: URL;
    urlEncodedFields: DebugParameter[];
  };
  sendBrowserCredentials: boolean;
  setFeedback: (message: string) => void;
  contentType: string;
  workflowScope: string;
  setFlowData: Dispatch<SetStateAction<Pick<WorkflowRuntime, 'flow' | 'results'>>>;
  preRequestConfig: PrePostPhaseConfig;
  timeoutSeconds: number;
  requestTab: 'body' | 'headers' | 'pre-request' | 'post-response' | 'params' | 'cookies';
  body: string;
  bodyKind: DebugBodyKind;
  pathParams: DebugParameter[];
  formFields: DebugParameter[];
  urlEncodedFields: DebugParameter[];
  effectiveQuery: DebugParameter[];
  requestPrefix: string;
  securityValues: Record<string, string>;
  securitySchemes: ResolvedSecurityScheme[];
  document: OpenApiDocument;
  binaryFile: File | undefined;
  formFiles: DebugFileField[];
  formFileEnabled: Record<string, boolean>;
  onSecurityValuesChange: (values: Record<string, string>) => void;
  appendLog: (entry: ConsoleLogEntry) => void;
  flushLogs: () => void;
  pathOverride: string | undefined;
  requestBaseUrl: string;
  setResponseTab: Dispatch<SetStateAction<ResponseTab>>;
  operation: ApiOperation;
  excludedParameters: { in: 'header' | 'query' | 'cookie'; name: string }[];
  postResponseConfig: PrePostPhaseConfig;
  settingsOpen: boolean;
}
/** Owns PlaygroundRequest state and lifecycle for its caller.
 * @param input Explicit domain inputs and callbacks.
 * @returns Derived state and operations consumed by the composing view.
 */
export function usePlaygroundRequest({
  request,
  sendBrowserCredentials,
  setFeedback,
  contentType,
  workflowScope,
  setFlowData,
  preRequestConfig,
  timeoutSeconds,
  requestTab,
  body,
  bodyKind,
  pathParams,
  formFields,
  urlEncodedFields,
  effectiveQuery,
  requestPrefix,
  securityValues,
  securitySchemes,
  document,
  binaryFile,
  formFiles,
  formFileEnabled,
  onSecurityValuesChange,
  appendLog,
  flushLogs,
  pathOverride,
  requestBaseUrl,
  setResponseTab,
  operation,
  excludedParameters,
  postResponseConfig,
  settingsOpen,
}: Inputs) {
  const [responseText, setResponseText] = useState('');
  const [responseRawText, setResponseRawText] = useState('');
  const [responseJson, setResponseJson] = useState<unknown>();
  const [responseLimited, setResponseLimited] = useState(false);
  const [formattingResponse, setFormattingResponse] = useState(false);
  const [responseHeaders, setResponseHeaders] = useState<Array<[string, string]>>([]);
  const [responseMetrics, setResponseMetrics] = useState<ResponseMetrics>();
  const [responseError, setResponseError] = useState('');
  const [sseEvents, setSseEvents] = useState<SseEvent[]>([]);
  const [sseDropped, setSseDropped] = useState(0);
  const [sending, setSending] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [sentRequest, setSentRequest] = useState<RequestSnapshot>();
  const activeRequestRef = useRef<AbortController | undefined>(undefined);
  const requestTimerRef = useRef<number | undefined>(undefined);
  const previewController = useRef<AbortController | undefined>(undefined);
  useEffect(() => {
    setSending(false);
    setStreaming(false);
    setFormattingResponse(false);
    setResponseText('');
    setResponseRawText('');
    setResponseJson(undefined);
    setResponseMetrics(undefined);
    setResponseHeaders([]);
    setResponseError('');
    setResponseLimited(false);
    setSseEvents([]);
    setSseDropped(0);
    setSentRequest(undefined);
    return () => {
      window.clearTimeout(requestTimerRef.current);
      activeRequestRef.current?.abort();
      activeRequestRef.current = undefined;
      previewController.current?.abort();
      previewController.current = undefined;
    };
  }, [operation.method, operation.path, workflowScope]);
  useEffect(() => () => previewController.current?.abort(), [responseRawText]);
  /**
   * Applies editable Cookies within browser same-origin constraints.
   *
   * @param target Final request snapshot after workflow changes.
   * @returns Whether the network request may continue.
   */
  const applyCookies = (target = request) => {
    if (!sendBrowserCredentials || !target.cookies.length) return true;
    if (!canApplyBrowserCookies(target.url, window.location.origin)) {
      setFeedback('跨域请求无法由浏览器写入 Cookie，请在目标域预先完成认证');
      return false;
    }
    createBrowserCookies(target.cookies).forEach((value) => {
      globalThis.document.cookie = value;
    });
    return true;
  };

  /**
   * Downloads response data through a temporary object URL.
   *
   * @param blob Response data.
   * @param fileName Download filename.
   * @returns Nothing after triggering the browser download.
   */
  const downloadBlob = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const anchor = globalThis.document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  /** Captures the effective request independently from later edits.
   * @param targetRequest Final browser request whose headers and body are displayed.
   * @returns Immutable application request snapshot.
   */
  const createSnapshot = (targetRequest = request): RequestSnapshot => ({
    body: targetRequest.bodyPreview,
    contentType,
    cookies: targetRequest.cookies.map((item) => ({ ...item })),
    headers: [...targetRequest.headers.entries()],
    method: targetRequest.method,
    sentAt: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
    url: targetRequest.url.toString(),
  });

  /** Stores explicit flow changes in the current service's page session.
   * @param data Flow variables and retained manual step results.
   * @returns Nothing; updates the shared flow and its visible snapshot.
   */
  const saveFlow = (data: Pick<WorkflowRuntime, 'flow' | 'results'>) => {
    writeWorkflowSession(workflowScope, data);
    setFlowData(readWorkflowSession(workflowScope));
  };

  /** Executes a manual auxiliary step without sending the main interface.
   * @param step User-selected manual request or script.
   * @returns Completion after recording its output, or a visible error.
   */
  const runManualStep = async (step: WorkflowStep) => {
    if (activeRequestRef.current || !step.enabled) return;
    if (!canRunWorkflowStepManually(step)) {
      setFeedback('该步骤需要随主请求自动执行，请修改执行方式');
      return;
    }
    const nextController = new AbortController();
    activeRequestRef.current = nextController;
    setSending(true);
    const session = readWorkflowSession(workflowScope);
    const runtime = createWorkflowRuntime(session.flow, session.results);
    // Refreshing an auxiliary result invalidates user input captured for the old result.
    for (const input of preRequestConfig.steps.filter(
      (item) => item.type === 'input' && item.resultStepId === step.id,
    )) {
      if (input.path) delete runtime.flow[input.path];
    }
    delete runtime.results[step.id];
    if (step.saveAs && step.scope === 'flow') delete runtime.flow[step.saveAs];
    saveFlow({ flow: runtime.flow, results: runtime.results });
    const timeout = (requestTimerRef.current = window.setTimeout(
      () => nextController.abort(),
      timeoutSeconds * 1000,
    ));
    try {
      await executeWorkflowSteps(
        [step],
        requestTab === 'post-response' ? 'post-response' : 'pre-request',
        {
          body,
          bodyKind,
          pathParams,
          formFields,
          urlEncodedFields,
          cookies: request.cookies,
          headers: [...request.headers].map(([name, value]) => ({ enabled: true, name, value })),
          queryParams: effectiveQuery,
          runtime,
          apiBase: getApiBase(),
          origin: window.location.origin,
          requestPrefix,
          sendBrowserCredentials,
          securityValues,
          securityKeys: securitySchemes.map((item) => item.key),
          securitySchemes: document.components?.securitySchemes,
          files: [
            ...(binaryFile ? [{ name: binaryFile.name, file: binaryFile }] : []),
            ...formFiles
              .filter((item) => formFileEnabled[item.name] !== false)
              .map((item) => ({ name: item.name, file: item.file })),
          ],
          response: responseMetrics
            ? {
                status: responseMetrics.status,
                json: responseJson,
                text: responseRawText,
                headers: Object.fromEntries(responseHeaders),
              }
            : undefined,
          manualStepId: step.id,
          signal: nextController.signal,
          setBody: () => undefined,
          setHeaders: () => undefined,
          setQueryParams: () => undefined,
          onSecurityValuesChange: (values) => {
            if (activeRequestRef.current === nextController && !nextController.signal.aborted)
              onSecurityValuesChange(values);
          },
          onLog: (entry) => {
            if (activeRequestRef.current === nextController) appendLog(entry);
          },
        },
      );
      if (activeRequestRef.current === nextController && !nextController.signal.aborted)
        setFeedback('手动步骤已完成，主请求未发送');
    } catch (error) {
      if (activeRequestRef.current === nextController)
        setFeedback(
          nextController.signal.aborted
            ? '手动步骤已取消或超时'
            : error instanceof Error
              ? error.message
              : String(error),
        );
    } finally {
      window.clearTimeout(timeout);
      if (activeRequestRef.current === nextController) {
        flushLogs();
        if (!nextController.signal.aborted)
          saveFlow({ flow: runtime.flow, results: runtime.results });
        activeRequestRef.current = undefined;
        setSending(false);
      }
    }
  };

  /** Sends or cancels the active interface request and executes its workflow.
   * @param None; reads the current request configuration.
   * @returns Completion after the request, cancellation or stream ends.
   */
  const send = async () => {
    if (activeRequestRef.current) {
      activeRequestRef.current.abort();
      return;
    }
    if (pathOverride !== undefined) {
      try {
        new URL(`${requestBaseUrl.replace(/\/+$/u, '')}/${pathOverride.replace(/^\/+/, '')}`);
      } catch {
        setFeedback('请输入有效的请求 Path');
        return;
      }
    }
    if (bodyKind === 'binary' && !binaryFile) {
      setFeedback('请选择要发送的二进制文件');
      return;
    }

    setResponseTab('response');
    previewController.current?.abort();
    setFormattingResponse(false);
    setResponseLimited(false);
    setResponseText('');
    setResponseRawText('');
    setResponseJson(undefined);
    setResponseHeaders([]);
    setResponseMetrics(undefined);
    setResponseError('');
    setSseEvents([]);
    setSseDropped(0);
    setStreaming(false);
    setSending(true);

    const nextController = new AbortController();
    activeRequestRef.current = nextController;
    let timeout = (requestTimerRef.current = window.setTimeout(
      () => nextController.abort(),
      timeoutSeconds * 1000,
    ));

    // Pre-request changes belong to this send only; preserve the editable draft.
    const flowSession = readWorkflowSession(workflowScope);
    const runtime = createWorkflowRuntime(flowSession.flow, flowSession.results);
    let activeBody = body;
    let activeHeaders = [...request.headers].map(([name, value]) => ({
      enabled: true,
      name,
      value,
    }));
    let activeQueryParams = effectiveQuery;
    let activePathParams = pathParams;
    let activeFormFields = formFields;
    let activeUrlEncodedFields = urlEncodedFields;
    let activeCookies = request.cookies;
    let activeSecurityValues = securityValues;

    try {
      if (preRequestConfig.steps.some((step) => step.enabled)) {
        const pipelineRes = await executePreRequestPipeline(preRequestConfig, {
          apiBase: getApiBase(),
          body: activeBody,
          bodyKind,
          pathParams: activePathParams,
          formFields: activeFormFields,
          urlEncodedFields: activeUrlEncodedFields,
          cookies: activeCookies,
          runtime,
          securityValues,
          securityKeys: securitySchemes.map((item) => item.key),
          securitySchemes: document.components?.securitySchemes,
          files: [
            ...(binaryFile ? [{ name: binaryFile.name, file: binaryFile }] : []),
            ...formFiles
              .filter((item) => formFileEnabled[item.name] !== false)
              .map((item) => ({ name: item.name, file: item.file })),
          ],
          headers: activeHeaders,
          onLog: (entry) => {
            if (activeRequestRef.current === nextController) appendLog(entry);
          },
          origin: window.location.origin,
          queryParams: activeQueryParams,
          requestPrefix: requestPrefix || '',
          sendBrowserCredentials,
          signal: nextController.signal,
          setBody: (b) => {
            activeBody = b;
          },
          setHeaders: (h) => {
            const next = h;
            activeHeaders = next;
          },
          setQueryParams: (q) => {
            const next = q;
            activeQueryParams = next;
          },
        });
        if (activeRequestRef.current !== nextController || nextController.signal.aborted) return;
        activeBody = pipelineRes.body;
        activeHeaders = pipelineRes.headers;
        activeQueryParams = pipelineRes.queryParams;
        activePathParams = pipelineRes.pathParams;
        activeFormFields = pipelineRes.formFields;
        activeUrlEncodedFields = pipelineRes.urlEncodedFields;
        activeCookies = pipelineRes.cookies;
        activeSecurityValues = pipelineRes.securityValues ?? securityValues;
      }

      if (bodyKind === 'json') {
        try {
          JSON.parse(activeBody);
        } catch {
          throw new Error('JSON 格式有误，请检查前置操作和请求内容');
        }
      }
      if (bodyKind === 'xml') formatPlaygroundXml(activeBody);
      const activePath =
        pathOverride === undefined ? operation.path : `/${pathOverride.replace(/^\/+/, '')}`;
      if (/\{[^{}]+\}/u.test(applyPathParameters(activePath, activePathParams)))
        throw new Error('请填写路径参数或通过前置操作设置路径参数');
      // Defaults and user overrides were resolved before the pipeline; explicit step writes win.
      const actualRequest = buildDebugRequest({
        apiBase: getApiBase(),
        binaryFile,
        bodyKind,
        bodyText: activeBody,
        contentType,
        cookies: activeCookies,
        excludedParameters: excludedParameters.filter((item) => {
          const active =
            item.in === 'header'
              ? activeHeaders
              : item.in === 'query'
                ? activeQueryParams
                : activeCookies;
          return !active.some(
            (parameter) =>
              parameter.enabled &&
              parameterKey(item.in, parameter.name) === parameterKey(item.in, item.name),
          );
        }),
        formFields: activeFormFields,
        formFiles: formFiles.filter((item) => formFileEnabled[item.name] !== false),
        headers: activeHeaders,
        method: operation.method,
        origin: window.location.origin,
        path: activePath,
        pathParams: activePathParams,
        queryParams: activeQueryParams,
        requestPrefix,
        urlEncodedFields: activeUrlEncodedFields,
      });
      if (!applyCookies(actualRequest)) return;

      const preparationStarted = performance.now();
      const snapshot = createSnapshot(actualRequest);
      const preparation = performance.now() - preparationStarted;
      setSentRequest(snapshot);

      const startedAt = performance.now();
      const fetchResponse = await fetch(actualRequest.url, {
        body: actualRequest.body,
        credentials: sendBrowserCredentials ? 'include' : 'omit',
        headers: actualRequest.headers,
        method: actualRequest.method,
        signal: nextController.signal,
      });
      if (activeRequestRef.current !== nextController) return;
      const receivedHeaders = [...fetchResponse.headers.entries()];
      const responseContentType = fetchResponse.headers.get('content-type') || '';
      const requestHeaderText = [...actualRequest.headers.entries()]
        .map(([name, value]) => `${name}: ${value}\r\n`)
        .join('');
      const responseHeaderText = receivedHeaders
        .map(([name, value]) => `${name}: ${value}\r\n`)
        .join('');
      setResponseHeaders(receivedHeaders);
      const baseMetrics = {
        contentType: responseContentType,
        duration: performance.now() - startedAt,
        preparation,
        requestBodySize: measureRequestBody(actualRequest),
        requestHeaderSize: measureText(requestHeaderText),
        responseBodySize: 0,
        responseHeaderSize: measureText(responseHeaderText),
        status: fetchResponse.status,
        statusText: fetchResponse.statusText,
      };

      const logTime =
        new Date().toTimeString().split(' ')[0] +
        '.' +
        String(new Date().getMilliseconds()).padStart(3, '0');
      appendLog({
        category: 'NET',
        content: `${actualRequest.method} ${actualRequest.url.pathname}${actualRequest.url.search} (${fetchResponse.status} ${fetchResponse.statusText}, ${Math.round(performance.now() - startedAt)}ms)`,
        phase: 'net',
        time: logTime,
      });

      let workflowResponseText = '';
      let workflowResponseJson: unknown;
      if (responseContentType.toLowerCase().startsWith('text/event-stream')) {
        window.clearTimeout(timeout);
        setStreaming(true);
        setResponseMetrics(baseMetrics);
        const buffer = new SseBuffer();
        let publishTimer: number | undefined;
        /** Publishes bounded stream history outside React state updater functions.
         * @param None; reads only the current request's buffer.
         * @returns Nothing; skips stale requests and unmounted pages.
         */
        const publish = () => {
          window.clearTimeout(publishTimer);
          publishTimer = undefined;
          if (activeRequestRef.current !== nextController) return;
          const snapshot = buffer.snapshot();
          setSseEvents(snapshot.events);
          setSseDropped(snapshot.dropped);
          setResponseRawText(snapshot.raw);
          setResponseMetrics({
            ...baseMetrics,
            duration: performance.now() - startedAt,
            responseBodySize: snapshot.bytes,
          });
        };
        try {
          await consumeSseStream(fetchResponse, (event) => {
            if (activeRequestRef.current !== nextController) return;
            buffer.append(event);
            if (publishTimer === undefined) publishTimer = window.setTimeout(publish, 100);
          });
        } finally {
          publish();
        }
        if (activeRequestRef.current !== nextController) return;
        setResponseMetrics((current) =>
          current
            ? {
                ...current,
                duration: performance.now() - startedAt,
                timing: getResourceTiming(actualRequest.url.toString()),
              }
            : current,
        );
        workflowResponseText = buffer.snapshot().raw;
        // Streaming is unbounded, but post-response operations still use the configured timeout.
        window.clearTimeout(timeout);
        timeout = requestTimerRef.current = window.setTimeout(
          () => nextController.abort(),
          timeoutSeconds * 1000,
        );
      } else {
        const parsed = await parseDebugResponse(fetchResponse, nextController.signal);
        if (activeRequestRef.current !== nextController) return;
        const limited = parsed.size > largeResponseBytes && parsed.kind !== 'binary';
        setResponseLimited(limited);
        if (parsed.kind === 'binary' && parsed.data instanceof Blob) {
          downloadBlob(parsed.data, getDownloadFileName(fetchResponse));
          setResponseText(`检测到二进制响应，已下载文件（${formatBytes(parsed.size)}）`);
        } else if (parsed.kind !== 'json' && typeof parsed.data === 'string') {
          setResponseText(
            limited
              ? truncateResponsePreview(parsed.data)
              : formatResponseSource(parsed.data, parsed.kind),
          );
        } else {
          setResponseJson(parsed.data);
          setResponseText(
            limited
              ? truncateResponsePreview(parsed.rawText ?? '')
              : (toPrettyJson(parsed.data) ?? ''),
          );
        }
        setResponseRawText(parsed.rawText ?? '');
        setResponseMetrics({
          ...baseMetrics,
          duration: performance.now() - startedAt,
          responseBodySize: parsed.size,
          timing: getResourceTiming(actualRequest.url.toString()),
        });

        workflowResponseText = parsed.rawText ?? '';
        workflowResponseJson = parsed.data;
      }
      nextController.signal.throwIfAborted();

      await executePostResponsePipeline(postResponseConfig, {
        runtime,
        body: activeBody,
        bodyKind,
        headers: [...actualRequest.headers].map(([name, value]) => ({
          enabled: true,
          name,
          value,
        })),
        queryParams: activeQueryParams,
        pathParams: activePathParams,
        formFields: activeFormFields,
        urlEncodedFields: activeUrlEncodedFields,
        cookies: activeCookies,
        securityKeys: securitySchemes.map((item) => item.key),
        securitySchemes: document.components?.securitySchemes,
        apiBase: getApiBase(),
        origin: window.location.origin,
        requestPrefix,
        sendBrowserCredentials,
        onLog: (entry) => {
          if (activeRequestRef.current === nextController) appendLog(entry);
        },
        onSecurityValuesChange: (values) => {
          if (activeRequestRef.current === nextController && !nextController.signal.aborted)
            onSecurityValuesChange(values);
        },
        response: {
          headers: Object.fromEntries(receivedHeaders),
          json: workflowResponseJson,
          status: fetchResponse.status,
          text: workflowResponseText,
        },
        securityValues: activeSecurityValues,
        signal: nextController.signal,
      });
    } catch (error) {
      if (activeRequestRef.current !== nextController) return;
      const message = nextController.signal.aborted
        ? `请求已取消或超过 ${timeoutSeconds} 秒超时`
        : error instanceof Error
          ? error.message
          : '请求失败';
      setResponseError(message);
      setFeedback(message);
    } finally {
      window.clearTimeout(timeout);
      if (activeRequestRef.current === nextController) {
        flushLogs();
        if (!nextController.signal.aborted)
          saveFlow({ flow: runtime.flow, results: flowSession.results });
        setStreaming(false);
        setSending(false);
        activeRequestRef.current = undefined;
      }
    }
  };

  useEffect(() => {
    /**
     * Sends or cancels through the shared keyboard shortcut outside settings.
     *
     * @param event Document keyboard event.
     * @returns Nothing after forwarding the command.
     */
    const shortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter' && !settingsOpen) {
        event.preventDefault();
        void send();
      }
    };
    globalThis.document.addEventListener('keydown', shortcut);
    return () => globalThis.document.removeEventListener('keydown', shortcut);
  });

  return {
    send,
    runManualStep,
    saveFlow,
    downloadBlob,
    responseText,
    responseRawText,
    responseJson,
    responseLimited,
    formattingResponse,
    responseHeaders,
    responseMetrics,
    responseError,
    sseEvents,
    sseDropped,
    sending,
    streaming,
    sentRequest,
    setResponseText,
    setFormattingResponse,
    previewController,
  };
}
