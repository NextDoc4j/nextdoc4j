import { copyText as writeClipboardText } from '../../lib/clipboard';
import {
  IconChevronLeft,
  IconCode,
  IconCopy,
  IconFile,
  IconIndentIncrease,
  IconMaximize,
  IconPlayerStop,
  IconRefresh,
  IconSend,
  IconSettings,
} from '@tabler/icons-react';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';
import { Input } from '../../components/input';
import type { HashRouteState } from '../../lib/hash-route';
import { useNotification } from '../../lib/notifications';
import { getSchemaType } from '../openapi/schema';
import {
  clearPlaygroundFileCache,
  fileMemoryCache,
  parseFileCacheScope,
  prePostMemoryCache,
  validateAndFilterFiles,
} from './file-memory';
import {
  authenticationTarget,
  excludedParameterKeys,
  parameterKey,
  resolveRequestParameters,
  type ParameterOverrides,
} from './parameter-overrides';
import { PlaygroundResponsePanel } from './playground-response-panel';
import { PrePostOperationPanel } from './pre-post-panel';
import type { PrePostPhaseConfig } from './pre-post-types';
import {
  createDefaultDraft,
  defaultParameters,
  getDefaultRequestTab,
  getRequestSchema,
  resolvePlaygroundOperation,
} from './request-defaults';
import { formatBytes } from './response-metrics';
import { truncateResponsePreview } from './response-preview';
import { processResponseJson } from './response-processing';
import { clearDebugOperation, createDebugSessionKey } from './session-cache';
import { usePlaygroundConsole } from './use-playground-console';
import { usePlaygroundDraft } from './use-playground-draft';
import { usePlaygroundRequest } from './use-playground-request';
import { getWorkflowPathOptions } from './workflow-path-options';
import { clearWorkflowSession, readWorkflowSession } from './workflow-session';

import { CodeEditor, type CodeEditorFieldMeta } from '../../components/code-editor';
import { ImagePreviewDialog } from '../../components/image-preview-dialog';
import { SegmentedControl } from '../../components/segmented-control';
import { Tooltip } from '../../components/tooltip';
import { getApiBase } from '../../lib/http';
import type { ApiOperation, OpenApiDocument, Parameter, Schema } from '../../types/openapi';
import { scanImagesFromResponse } from '../../utils/base64-image';
import {
  createJsonExamplePreview,
  resolveJsonExampleSchema,
} from '../documentation/json-example-model';
import { resolveRequestSchema } from '../documentation/request-schema';
import { resolveResponseReference } from '../documentation/response-schema';
import { getSchemaEnumItems, isIntegerSchema } from '../openapi/schema';
import { getContentTypes, getDefaultContentType, getOperations } from '../openapi/utils';
import {
  buildSecurityCredentials,
  getEffectiveSecurityRequirements,
  getRegisteredSecuritySchemes,
  resolveSecuritySchemes,
  selectSatisfiedSecurityRequirement,
} from '../security/security';
import { flushPending, reportPersistenceFailure } from '../workspace/storage/repository';
import { convertBodySource, formatPlaygroundXml } from './body-format';
import { createDebugDraftKey } from './draft';
import { isFileSchema } from './form-parameters';
import {
  LongValueDialog,
  PlaygroundFields,
  PlaygroundHint,
  type PlaygroundFieldRow,
} from './playground-fields';
import { PlaygroundSettingsDialog } from './playground-settings-dialog';
import {
  applyPathParameters,
  buildDebugRequest,
  createCurlCommand,
  resolveBodyKind,
} from './request';
import type {
  DebugBodyKind,
  DebugFileField,
  DebugParameter,
  DebugRequestInput,
  GlobalHeader,
} from './types';

interface PlaygroundProps {
  debugCacheEnabled: boolean;
  cacheRevision: number;
  debugTab?: HashRouteState['debugTab'];
  debugTabExplicit?: boolean;
  debugBody?: HashRouteState['debugBody'];
  onDebugRouteChange: (
    state: Pick<HashRouteState, 'debugTab' | 'debugBody' | 'debugTabExplicit'>,
  ) => void;
  document: OpenApiDocument;
  previousDocument?: OpenApiDocument;
  editableGlobalHeaders: GlobalHeader[];
  editableGlobalQueryParams: GlobalHeader[];
  globalHeaders: GlobalHeader[];
  globalQueryParams: GlobalHeader[];
  onClose: () => void;
  onGlobalHeadersChange: (value: GlobalHeader[]) => void;
  onGlobalQueryParamsChange: (value: GlobalHeader[]) => void;
  onSecurityValuesChange: (values: Record<string, string>) => void;
  operation: ApiOperation;
  requestPrefix: string;
  storageScope: string;
  requestVariants: Map<string, number>;
  securityValues: Record<string, string>;
}

type RequestTab = 'body' | 'cookies' | 'headers' | 'params' | 'pre-request' | 'post-response';
type ResponseTab = 'headers' | 'request' | 'response' | 'console';
type ResponseMode = 'pretty' | 'raw';

const bodyKinds: Array<{ label: string; value: DebugBodyKind }> = [
  { label: 'none', value: 'none' },
  { label: 'form-data', value: 'form-data' },
  { label: 'x-www', value: 'urlencoded' },
  { label: 'JSON', value: 'json' },
  { label: 'raw', value: 'raw' },
  { label: 'binary', value: 'binary' },
  { label: 'XML', value: 'xml' },
];

const bodyContentTypes: Record<DebugBodyKind, string> = {
  binary: 'application/octet-stream',
  'form-data': 'multipart/form-data',
  json: 'application/json',
  none: '',
  raw: 'text/plain',
  urlencoded: 'application/x-www-form-urlencoded',
  xml: 'application/xml',
};

/**
 * Provides the production online debugger using the approved detail-page language.
 *
 * @param props Operation, workspace configuration and global-setting callbacks.
 * @returns A real request editor, live response, request snapshot and quick-settings modal.
 */
export function Playground({
  debugCacheEnabled,
  cacheRevision,
  debugTab,
  debugTabExplicit,
  debugBody,
  onDebugRouteChange,
  document,
  previousDocument,
  editableGlobalHeaders,
  editableGlobalQueryParams,
  globalHeaders,
  globalQueryParams,
  onClose,
  onGlobalHeadersChange,
  onGlobalQueryParamsChange,
  onSecurityValuesChange,
  operation: rawOperation,
  requestPrefix,
  storageScope,
  requestVariants,
  securityValues,
}: PlaygroundProps) {
  const operation = useMemo(
    () => resolvePlaygroundOperation(rawOperation, document),
    [rawOperation, document],
  );
  const schemas = useMemo(() => document.components?.schemas ?? {}, [document.components?.schemas]);
  const declaredContentTypes = getContentTypes(operation.requestBody?.content);
  const defaultContentType = getDefaultContentType(operation.requestBody?.content);
  const initialBodyKind = resolveBodyKind(defaultContentType);
  const [bodyKind, setBodyKind] = useState<DebugBodyKind>(debugBody ?? initialBodyKind);
  const contentType = useMemo(() => {
    if (bodyKind === initialBodyKind && defaultContentType) return defaultContentType;
    if (bodyKind === 'json') {
      return (
        declaredContentTypes.find((item) => /(?:\/|\+)json$/iu.test(item) || item === '*/*') ||
        bodyContentTypes.json
      );
    }
    return bodyContentTypes[bodyKind];
  }, [bodyKind, declaredContentTypes, defaultContentType, initialBodyKind]);

  const operationFileKey = `${storageScope || requestPrefix || 'single-app'}:${operation.method.toLowerCase()}:${operation.path}`;
  const rawInitialFiles = fileMemoryCache.get(operationFileKey)?.data;
  const initialFiles = useMemo(
    () => validateAndFilterFiles(rawInitialFiles, operation, schemas, contentType),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const [pathParams, setPathParams] = useState(() =>
    defaultParameters(operation, 'path', document),
  );
  const [queryParams, setQueryParams] = useState(() =>
    defaultParameters(operation, 'query', document),
  );
  const [headers, setHeaders] = useState(() => defaultParameters(operation, 'header', document));
  const [cookies, setCookies] = useState(() => defaultParameters(operation, 'cookie', document));
  const [formFields, setFormFields] = useState<DebugParameter[]>([]);
  const [urlEncodedFields, setUrlEncodedFields] = useState<DebugParameter[]>([]);
  const [formFiles, setFormFiles] = useState<DebugFileField[]>(() => initialFiles.formFiles);
  const [formFileContentTypes, setFormFileContentTypes] = useState<Record<string, string>>(
    () => initialFiles.formFileContentTypes,
  );
  const [formFileEnabled, setFormFileEnabled] = useState<Record<string, boolean>>(
    () => initialFiles.formFileEnabled,
  );
  const [binaryFile, setBinaryFile] = useState<File | undefined>(() => initialFiles.binaryFile);
  const [body, setBody] = useState('');

  useEffect(() => {
    if (formFiles.length > 0 || binaryFile || Object.keys(formFileContentTypes).length > 0) {
      const { appId, serviceKey } = parseFileCacheScope(storageScope);
      fileMemoryCache.set(operationFileKey, {
        appId,
        serviceKey,
        storageScope,
        method: operation.method.toLowerCase(),
        path: operation.path,
        data: {
          binaryFile,
          formFileContentTypes,
          formFileEnabled,
          formFiles,
        },
      });
    } else {
      fileMemoryCache.delete(operationFileKey);
    }
  }, [
    operationFileKey,
    formFiles,
    formFileContentTypes,
    formFileEnabled,
    binaryFile,
    storageScope,
    operation.method,
    operation.path,
  ]);
  const defaultRequestTab = getDefaultRequestTab(operation);
  const requestTab =
    debugTab &&
    (debugTabExplicit === true || (debugTabExplicit === undefined && debugTab !== 'params'))
      ? debugTab
      : defaultRequestTab;
  /** Changes the parameter tab in the current debugger route.
   * @param tab Selected request area.
   * @returns Nothing; persists navigation without serializing request values.
   */
  const setRequestTab = (tab: RequestTab) =>
    onDebugRouteChange({ debugTab: tab, debugBody: bodyKind, debugTabExplicit: true });
  const [responseTab, setResponseTab] = useState<ResponseTab>('response');
  const [responseMode, setResponseMode] = useState<ResponseMode>('pretty');
  const [responseSearch, setResponseSearch] = useState('');
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [selectedImageKeyPath, setSelectedImageKeyPath] = useState<string | undefined>(undefined);

  const [timeoutSeconds, setTimeoutSeconds] = useState(30);
  const [credentials, setCredentials] = useState(true);
  const setFeedback = useNotification();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [bodyDialogOpen, setBodyDialogOpen] = useState(false);
  const [pathOverride, setPathOverride] = useState<string>();
  const [parameterOverrides, setParameterOverrides] = useState<ParameterOverrides>({});
  const [hydratedDraftKey, setHydratedDraftKey] = useState('');
  const [stackedLayout, setStackedLayout] = useState(false);
  const [paneRatio, setPaneRatio] = useState(0.48);
  const layoutRef = useRef<HTMLDivElement>(null);
  const bodySeedsRef = useRef(new Map<string, string>());
  const convertedBodyRef = useRef<{ value: unknown } | undefined>(undefined);
  const draftKey = useMemo(
    () =>
      createDebugDraftKey({
        contentType,
        method: operation.method,
        path: operation.path,
        requestPrefix: storageScope,
      }),
    [contentType, operation.method, operation.path, storageScope],
  );
  const requestSchema = useMemo(
    () => getRequestSchema(operation, schemas, contentType),
    [contentType, operation, schemas],
  );
  const requirements = useMemo(
    () =>
      operation['x-nextdoc4j-security']?.ignore
        ? []
        : getEffectiveSecurityRequirements(operation, document),
    [operation, document],
  );
  const selectedRequirement = useMemo(
    () => selectSatisfiedSecurityRequirement(requirements, securityValues) ?? requirements[0],
    [requirements, securityValues],
  );
  const securityCredentials = useMemo(
    () =>
      buildSecurityCredentials(
        selectedRequirement,
        document.components?.securitySchemes,
        securityValues,
      ),
    [document.components?.securitySchemes, securityValues, selectedRequirement],
  );
  const securitySchemes = useMemo(
    () => getRegisteredSecuritySchemes(document.components?.securitySchemes),
    [document.components?.securitySchemes],
  );

  const availableOperations = useMemo(() => getOperations(document), [document]);

  const [preRequestConfig, setPreRequestConfig] = useState<PrePostPhaseConfig>(() => ({
    steps: [],
  }));

  const [postResponseConfig, setPostResponseConfig] = useState<PrePostPhaseConfig>(() => ({
    steps: [],
  }));

  const workflowScope = storageScope || requestPrefix || 'single-app';
  const [flowData, setFlowData] = useState(() => readWorkflowSession(workflowScope));
  useEffect(() => {
    setFlowData(readWorkflowSession(workflowScope));
  }, [operation.method, operation.path, workflowScope]);

  const { consoleLogs, consoleDropped, appendLog, flushLogs, clearLogs } =
    usePlaygroundConsole(draftKey);
  const [consoleFilter, setConsoleFilter] = useState<'all' | 'pre' | 'net' | 'post'>('all');

  const filteredConsoleLogs = useMemo(() => {
    if (consoleFilter === 'all') return consoleLogs;
    if (consoleFilter === 'post') {
      return consoleLogs.filter((l) => l.phase === 'post' || l.phase === 'assert');
    }
    return consoleLogs.filter((l) => l.phase === consoleFilter);
  }, [consoleLogs, consoleFilter]);

  const requiredSecuritySchemes = useMemo(
    () =>
      resolveSecuritySchemes(
        selectedRequirement ? [selectedRequirement] : [],
        document.components?.securitySchemes,
      ),
    [selectedRequirement, document.components?.securitySchemes],
  );
  const authenticationSchemes = useMemo(
    () => resolveSecuritySchemes(requirements, document.components?.securitySchemes),
    [requirements, document.components?.securitySchemes],
  );
  const authenticationTargets = useMemo(() => {
    const targets = new Set(['header:authorization']);
    for (const scheme of authenticationSchemes) {
      const target = authenticationTarget(scheme);
      if (target) targets.add(parameterKey(target.in, target.name));
    }
    return targets;
  }, [authenticationSchemes]);
  const sessionKey = useMemo(
    () =>
      createDebugSessionKey({
        requestPrefix: storageScope,
        method: operation.method,
        path: operation.path,
      }),
    [storageScope, operation.method, operation.path],
  );
  useEffect(() => {
    if (debugBody) setBodyKind(debugBody);
  }, [debugBody]);
  useEffect(() => {
    if (debugTab !== requestTab || !debugBody) {
      onDebugRouteChange({
        debugTab: requestTab,
        debugBody: bodyKind,
        debugTabExplicit: debugTabExplicit === true,
      });
    }
  }, [debugTab, debugBody, debugTabExplicit, bodyKind, requestTab, onDebugRouteChange]);

  const securityHeaderNames = requiredSecuritySchemes.flatMap((scheme) => {
    if (scheme.type === 'apiKey') return scheme.in === 'header' ? [scheme.name || scheme.key] : [];
    return ['http', 'oauth2', 'openIdConnect'].includes(scheme.type) ? ['Authorization'] : [];
  });
  const conflictingSecurityHeaders = [
    ...new Set(
      securityHeaderNames.filter(
        (name, index) =>
          securityHeaderNames.findIndex(
            (candidate) => candidate.toLowerCase() === name.toLowerCase(),
          ) !== index,
      ),
    ),
  ];

  useEffect(() => {
    const media = globalThis.matchMedia('(max-width: 1100px)');

    /** Synchronizes the responsive orientation with the viewport.
     * @param None; reads the registered media query.
     * @returns Nothing; updates the stacked layout.
     */
    const sync = () => setStackedLayout(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);
  const { suppressCacheRef, draftMemoryRef, commonMemoryRef, liveFilesRef, clearedRevisionRef } =
    usePlaygroundDraft({
      cookies,
      binaryFile,
      formFileContentTypes,
      formFileEnabled,
      formFiles,
      cacheRevision,
      debugCacheEnabled,
      sessionKey,
      authenticationTargets,
      setParameterOverrides,
      setPathOverride,
      setPreRequestConfig,
      setPostResponseConfig,
      operation,
      document,
      contentType,
      requestVariants,
      draftKey,
      previousDocument,
      setFormFiles,
      setFormFileContentTypes,
      setFormFileEnabled,
      setBinaryFile,
      operationFileKey,
      setBody,
      setHeaders,
      setPathParams,
      setQueryParams,
      setFormFields,
      setUrlEncodedFields,
      setCookies,
      globalHeaders,
      globalQueryParams,
      bodySeedsRef,
      setHydratedDraftKey,
      headers,
      queryParams,
      body,
      formFields,
      pathParams,
      urlEncodedFields,
      parameterOverrides,
      pathOverride,
      postResponseConfig,
      preRequestConfig,
      hydratedDraftKey,
      storageScope,
    });

  const effectiveCredentials = useMemo(() => {
    const result = [...securityCredentials];
    const targets = new Set(result.map((item) => parameterKey(item.in, item.name)));
    for (const scheme of requiredSecuritySchemes) {
      const target = authenticationTarget(scheme);
      if (!target) continue;
      const key = parameterKey(target.in, target.name);
      const override = parameterOverrides[key];
      if (!targets.has(key) && override?.value !== undefined) {
        result.push({ ...target, value: override.value });
        targets.add(key);
      }
    }
    return result;
  }, [securityCredentials, requiredSecuritySchemes, parameterOverrides]);
  const effectiveHeaders = useMemo(
    () =>
      resolveRequestParameters(
        'header',
        headers,
        globalHeaders,
        effectiveCredentials,
        parameterOverrides,
      ),
    [headers, globalHeaders, effectiveCredentials, parameterOverrides],
  );
  const effectiveQuery = useMemo(
    () =>
      resolveRequestParameters(
        'query',
        queryParams,
        globalQueryParams,
        effectiveCredentials,
        parameterOverrides,
      ),
    [queryParams, globalQueryParams, effectiveCredentials, parameterOverrides],
  );
  const effectiveCookies = useMemo(
    () => resolveRequestParameters('cookie', cookies, [], effectiveCredentials, parameterOverrides),
    [cookies, effectiveCredentials, parameterOverrides],
  );
  const excludedParameters = useMemo<NonNullable<DebugRequestInput['excludedParameters']>>(() => {
    return (
      [
        ['header', headers],
        ['query', queryParams],
        ['cookie', cookies],
      ] as const
    ).flatMap(([location, items]) =>
      [...excludedParameterKeys(location, items, parameterOverrides)].map((key) => ({
        in: location,
        name: key.slice(key.indexOf(':') + 1),
      })),
    );
  }, [headers, queryParams, cookies, parameterOverrides]);
  // Browsers cannot selectively omit one stored Cookie; omission must apply to this whole fetch.
  const sendBrowserCredentials =
    credentials &&
    !excludedParameters.some(
      (item) =>
        item.in === 'cookie' ||
        (item.in === 'header' && ['authorization', 'cookie'].includes(item.name.toLowerCase())),
    );
  const requestCookies = useMemo(
    () => (sendBrowserCredentials ? effectiveCookies : []),
    [sendBrowserCredentials, effectiveCookies],
  );

  const builtRequest = useMemo(
    () =>
      buildDebugRequest({
        apiBase: getApiBase(),
        excludedParameters,
        binaryFile,
        bodyKind,
        bodyText: body,
        contentType,
        cookies: requestCookies,
        formFields,
        formFiles: formFiles.filter((item) => formFileEnabled[item.name] !== false),
        headers: effectiveHeaders,
        method: operation.method,
        origin: window.location.origin,
        path: pathOverride === undefined ? operation.path : `/${pathOverride.replace(/^\/+/, '')}`,
        pathParams,
        queryParams: effectiveQuery,
        requestPrefix,
        urlEncodedFields,
      }),
    [
      excludedParameters,
      binaryFile,
      body,
      bodyKind,
      contentType,
      requestCookies,
      formFields,
      formFiles,
      formFileEnabled,
      effectiveHeaders,
      operation.method,
      operation.path,
      pathOverride,
      pathParams,
      effectiveQuery,
      requestPrefix,
      urlEncodedFields,
    ],
  );
  const requestPath = applyPathParameters(pathOverride ?? operation.path, pathParams);
  const encodedPath = new URL(`/${requestPath.replace(/^\/+/, '')}`, window.location.origin)
    .pathname;
  const requestBasePath = builtRequest.url.pathname.endsWith(encodedPath)
    ? builtRequest.url.pathname.slice(0, -encodedPath.length)
    : '';
  const requestBaseUrl = `${builtRequest.url.origin}${requestBasePath}`;
  const request = builtRequest;

  /**
   * Copies text with a fallback for non-secure documentation hosts.
   *
   * @param value Exact text to copy.
   * @param message Visible success feedback.
   * @returns Resolves after the clipboard attempt.
   */
  const copy = async (value: string, message: string) => {
    try {
      await writeClipboardText(value);
      setFeedback(message);
      return true;
    } catch {
      setFeedback('复制失败，请手动选择内容复制');
      return false;
    }
  };

  /**
   * Selects another body mode and seeds raw or XML content from the current source.
   *
   * @param next Next body editor mode.
   * @returns Nothing after switching the MIME-specific draft namespace.
   */
  const selectBodyKind = async (next: DebugBodyKind) => {
    await flushPending().catch(reportPersistenceFailure);
    if (next === bodyKind) return;
    const nextContentType =
      next === initialBodyKind && defaultContentType
        ? defaultContentType
        : next === 'json'
          ? declaredContentTypes.find((item) => /(?:\/|\+)json$/iu.test(item) || item === '*/*') ||
            bodyContentTypes.json
          : bodyContentTypes[next];
    const nextDraftKey = createDebugDraftKey({
      contentType: nextContentType,
      method: operation.method,
      path: operation.path,
      requestPrefix: storageScope,
    });
    const sourceMode =
      bodyKind === 'json' || bodyKind === 'raw' || bodyKind === 'xml' ? bodyKind : undefined;
    const targetMode = next === 'json' || next === 'raw' || next === 'xml' ? next : undefined;
    if (sourceMode && targetMode) {
      try {
        const hint = convertedBodyRef.current
          ? convertedBodyRef.current.value
          : createJsonExamplePreview(
              { schema: requestSchema },
              { direction: 'request', schemas, variants: requestVariants },
              document.components,
              '',
            ).tree?.value;
        const converted = convertBodySource(body, sourceMode, targetMode, hint);
        bodySeedsRef.current.set(nextDraftKey, converted.text);
        convertedBodyRef.current = { value: converted.value };
        setBody(converted.text);
      } catch {
        setFeedback('当前内容格式有误，请修正后再切换，原内容已保留');
        return;
      }
    }
    setBodyKind(next);
    onDebugRouteChange({ debugTab: requestTab, debugBody: next });
  };

  /** Formats valid JSON or XML without discarding invalid input.
   * @param None; reads the current body text and body kind.
   * @returns Nothing; updates the editor or displays an error.
   */
  const formatBody = () => {
    const isXml = bodyKind === 'xml' || (bodyKind === 'raw' && body.trimStart().startsWith('<'));
    try {
      setBody(isXml ? formatPlaygroundXml(body) : JSON.stringify(JSON.parse(body), null, 2));
      setFeedback('已格式化');
    } catch {
      setFeedback(
        bodyKind === 'raw'
          ? '当前 raw 内容没有可格式化的 JSON 或 XML 结构'
          : isXml
            ? 'XML 格式有误'
            : 'JSON 格式有误',
      );
    }
  };

  /** Restores the active operation defaults and clears its local overrides.
   * @param alreadyCleared Whether the persistent cache was already cleared by the caller.
   * @returns Completion after clearing data and restoring editable defaults.
   */
  const clearDraft = async (alreadyCleared = false) => {
    const defaults = createDefaultDraft(operation, document, contentType, requestVariants);
    if (!alreadyCleared) await clearDebugOperation(sessionKey);
    suppressCacheRef.current = true;
    bodySeedsRef.current.clear();
    draftMemoryRef.current.clear();
    prePostMemoryCache.delete(sessionKey);
    setPreRequestConfig({
      steps: [],
    });
    setPostResponseConfig({
      steps: [],
    });
    commonMemoryRef.current = undefined;
    convertedBodyRef.current = undefined;
    setParameterOverrides({});
    setBody(defaults.body);
    setFormFields(defaults.formFields);
    setHeaders(
      defaults.headers.filter(
        (item) => !authenticationTargets.has(parameterKey('header', item.name)),
      ),
    );
    setPathParams(defaults.pathParams);
    setQueryParams(
      defaults.queryParams.filter(
        (item) => !authenticationTargets.has(parameterKey('query', item.name)),
      ),
    );
    setCookies(
      defaultParameters(operation, 'cookie', document).filter(
        (item) => !authenticationTargets.has(parameterKey('cookie', item.name)),
      ),
    );
    setUrlEncodedFields(defaults.urlEncodedFields);
    setFormFiles([]);
    setFormFileContentTypes({});
    setFormFileEnabled({});
    setBinaryFile(undefined);
    liveFilesRef.current = {
      binaryFile: undefined,
      formFileContentTypes: {},
      formFileEnabled: {},
      formFiles: [],
    };
    clearPlaygroundFileCache({
      storageScope,
      method: operation.method,
      path: operation.path,
    });
    setPathOverride(undefined);
    setFeedback('已恢复接口示例');
  };

  useEffect(() => {
    if (clearedRevisionRef.current === cacheRevision) return;
    clearedRevisionRef.current = cacheRevision;
    void clearDraft(true).catch(reportPersistenceFailure);
  });

  const {
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
  } = usePlaygroundRequest({
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
  });
  const [scannedImages, setScannedImages] = useState<{
    source: string;
    images: import('../../utils/base64-image').Base64ImageInfo[];
  }>();
  /** Scans a complete large response only after an explicit image-preview request.
   * @param None; uses the active response and shared cancellation controller.
   * @returns Completion after opening the current response's image results.
   */
  const scanLargeResponseImages = async () => {
    previewController.current?.abort();
    const current = new AbortController();
    previewController.current = current;
    setFormattingResponse(true);
    try {
      const images = (await processResponseJson(
        responseRawText,
        current.signal,
        'images',
      )) as import('../../utils/base64-image').Base64ImageInfo[];
      if (current.signal.aborted || previewController.current !== current) return;
      setScannedImages({ source: responseRawText, images });
      if (images.length) setImageDialogOpen(true);
      else setFeedback('完整响应中未发现图片');
    } catch (error) {
      if (!current.signal.aborted)
        setFeedback(error instanceof Error ? error.message : '图片扫描失败');
    } finally {
      if (previewController.current === current) setFormattingResponse(false);
    }
  };
  useEffect(() => setScannedImages(undefined), [responseRawText]);
  const detectedImages = useMemo(
    () =>
      responseLimited
        ? scannedImages?.source === responseRawText
          ? scannedImages.images
          : []
        : scanImagesFromResponse(responseText, responseJson),
    [responseText, responseJson, responseLimited, responseRawText, scannedImages],
  );

  /**
   * Starts pointer-driven resizing for the request and response cards.
   *
   * @param event Pointer event raised by the center divider.
   * @returns Nothing; installs temporary listeners and updates the pane ratio.
   */
  const startPaneResize = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    /**
     * Converts pointer movement into a bounded request-pane ratio.
     *
     * @param moveEvent Active pointer position.
     * @returns Nothing after updating the pane ratio.
     */
    const move = (moveEvent: PointerEvent) => {
      const bounds = layoutRef.current?.getBoundingClientRect();
      if (!bounds) return;
      const size = stackedLayout ? bounds.height : bounds.width;
      const offset = stackedLayout
        ? moveEvent.clientY - bounds.top
        : moveEvent.clientX - bounds.left;
      setPaneRatio(Math.min(0.66, Math.max(0.34, offset / size)));
    };
    /** Finishes pointer-driven panel resizing.
     * @param None; uses the current drag listeners.
     * @returns Nothing; removes drag listeners and restores cursor styles.
     */
    const stop = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', stop);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', stop, { once: true });
  };

  /**
   * Updates interface parameters or session overrides without writing workspace defaults.
   *
   * @param collection Local parameter state setter.
   * @param id Source-prefixed row identifier.
   * @param patch Editable parameter fields.
   * @returns Nothing after updating the owning collection.
   */
  const updateField = (
    collection: Dispatch<SetStateAction<DebugParameter[]>>,
    id: string,
    patch: Partial<DebugParameter>,
  ) => {
    if (id.startsWith('inherited:')) {
      const key = id.slice(10);
      setParameterOverrides((current) => ({ ...current, [key]: { ...current[key], ...patch } }));
      return;
    }
    const index = Number(id.slice(id.indexOf(':') + 1));
    collection((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    );
  };

  /**
   * Applies bulk enable changes to interface rows and session-only inherited overrides.
   *
   * @param collection Local parameter state setter.
   * @param enabled Next enabled state.
   * @param ids Selected source-prefixed row identifiers.
   * @returns Nothing after both owning collections are updated.
   */
  const toggleFields = (
    collection: Dispatch<SetStateAction<DebugParameter[]>>,
    enabled: boolean,
    ids: string[],
  ) => {
    const localIndexes = new Set(
      ids
        .filter((id) => id.startsWith('local:'))
        .map((id) => Number(id.slice(id.indexOf(':') + 1))),
    );
    collection((current) =>
      current.map((item, index) => (localIndexes.has(index) ? { ...item, enabled } : item)),
    );
    setParameterOverrides((current) => {
      const next = { ...current };
      ids
        .filter((id) => id.startsWith('inherited:'))
        .forEach((id) => {
          const key = id.slice(10);
          next[key] = { ...next[key], enabled };
        });
      return next;
    });
  };

  /**
   * Creates operation and global rows for one parameter location.
   *
   * @param location OpenAPI parameter location.
   * @param local Editable local rows.
   * @param globals Optional global Query or Header rows.
   * @returns Table rows with description, required and enum metadata.
   */
  const createParameterRows = (
    location: Parameter['in'],
    local: DebugParameter[],
    globals: GlobalHeader[] = [],
  ): PlaygroundFieldRow[] => {
    const definitions = (operation.parameters ?? []).filter((item) => item.in === location);
    const rows: PlaygroundFieldRow[] = [
      ...local.map((item, index) => {
        const definition = definitions.find((candidate) => candidate.name === item.name);
        const schema = resolveRequestSchema(
          definition?.schema ?? Object.values(definition?.content ?? {})[0]?.schema ?? {},
          schemas,
        );
        return {
          description: definition?.description || schema.description,
          enumItems: getSchemaEnumItems(schema),
          id: `local:${index}`,
          item,
          nameLocked: location === 'path',
          placeholder: location === 'path' ? `{${item.name}}` : undefined,
          required: location === 'path' || definition?.required,
          source: '接口' as const,
        };
      }),
      ...globals
        .filter((item) => item.name.trim())
        .map((item) => ({
          description: item.description,
          id: `inherited:${parameterKey(location, item.name)}`,
          item: { enabled: item.enabled !== false, name: item.name, value: item.value },
          nameLocked: true,
          source: '全局' as const,
        })),
      ...requiredSecuritySchemes.flatMap((scheme) => {
        const target = authenticationTarget(scheme);
        if (!target || target.in !== location) return [];
        const credential = buildSecurityCredentials(
          { [scheme.key]: [] },
          document.components?.securitySchemes,
          securityValues,
        )[0];
        return [
          {
            description: `${scheme.key} · ${scheme.description || '来自全局认证配置'}${credential ? '' : '（全局尚未填写，可填写本次请求值）'}`,
            id: `inherited:${parameterKey(location, target.name)}`,
            item: { enabled: true, name: target.name, value: credential?.value ?? '' },
            placeholder:
              scheme.type === 'http' && scheme.scheme?.toLowerCase() === 'bearer'
                ? 'Bearer <token>'
                : scheme.type === 'http' && scheme.scheme?.toLowerCase() === 'basic'
                  ? 'Basic <base64>'
                  : '填写本次请求凭据',
            nameLocked: true,
            required: true,
            source: '认证' as const,
          },
        ];
      }),
    ];
    const inheritedKeys = new Set(
      rows
        .filter((row) => row.id.startsWith('inherited:'))
        .map((row) => parameterKey(location, row.item.name)),
    );
    const baseline = resolveRequestParameters(
      location,
      local,
      globals,
      securityCredentials,
      {},
      true,
    );
    const seen = new Set<string>();
    return rows
      .filter((row) => {
        const key = parameterKey(location, row.item.name);
        if (!inheritedKeys.has(key)) return true;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((row) => {
        const key = parameterKey(location, row.item.name);
        const override = parameterOverrides[key];
        const inherited = inheritedKeys.has(key) || Boolean(override);
        const inheritedRows = inherited
          ? rows.filter((candidate) => candidate.id === `inherited:${key}`)
          : [];
        const hasLocalValue =
          inherited &&
          local.some(
            (item) =>
              parameterKey(location, item.name) === key &&
              (!item.enabled || Boolean(item.value.trim())),
          );
        const base = inherited
          ? (baseline.find((item) => parameterKey(location, item.name) === key) ?? row.item)
          : row.item;
        const item = { ...base, ...override };

        return {
          ...row,
          id: inherited ? `inherited:${key}` : row.id,
          nameLocked: inherited || row.nameLocked,
          source: inheritedRows[0]?.source ?? row.source,
          description: [
            ...new Set(
              [row.description, ...inheritedRows.map((candidate) => candidate.description)].filter(
                Boolean,
              ),
            ),
          ].join('\n'),
          overridden: inherited ? false : row.overridden,
          item,
          sessionState: inherited
            ? override?.enabled === false || (hasLocalValue && !item.enabled)
              ? '已禁用'
              : override || hasLocalValue
                ? '已覆盖'
                : '继承'
            : undefined,
          onRestore:
            inherited && (override || hasLocalValue)
              ? () => {
                  setParameterOverrides((current) => {
                    const next = { ...current };
                    delete next[key];
                    return next;
                  });
                  const setter =
                    location === 'header'
                      ? setHeaders
                      : location === 'query'
                        ? setQueryParams
                        : setCookies;
                  setter((current) =>
                    current.filter((entry) => parameterKey(location, entry.name) !== key),
                  );
                }
              : undefined,
          inherited,
        };
      });
  };

  /**
   * Patches or removes a local row from a simple parameter collection.
   *
   * @param setter Owning state setter.
   * @param id Local row identifier.
   * @param remove Whether to remove instead of patching.
   * @param patch Optional field patch.
   * @returns Nothing after updating the collection.
   */
  const updateLocal = (
    setter: Dispatch<SetStateAction<DebugParameter[]>>,
    id: string,
    remove = false,
    patch: Partial<DebugParameter> = {},
  ) => {
    const index = Number(id.slice(id.indexOf(':') + 1));
    setter((current) =>
      remove
        ? current.filter((_, itemIndex) => itemIndex !== index)
        : current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    );
  };

  const pathRows = createParameterRows('path', pathParams);
  const queryRows = createParameterRows('query', queryParams, globalQueryParams);
  const headerRows = createParameterRows('header', headers, globalHeaders);
  const cookieRows = createParameterRows('cookie', cookies);
  const formProperties = requestSchema.properties ?? {};
  const formRows: PlaygroundFieldRow[] = [
    ...formFields.map((item, index) => {
      const schema = resolveRequestSchema(formProperties[item.name] ?? {}, schemas);
      return {
        contentType: item.contentType ?? 'text/plain',
        description: schema.description,
        enumItems: getSchemaEnumItems(schema),
        id: `form:${index}`,
        item,
        required: requestSchema.required?.includes(item.name),
        source: '接口' as const,
      };
    }),
    ...Object.entries(formProperties)
      .filter(([, raw]) => isFileSchema(raw, schemas))
      .map(([name, raw]) => {
        const schema = resolveRequestSchema(raw, schemas);
        const selected = formFiles.filter((item) => item.name === name);
        return {
          contentType:
            selected[0]?.contentType ??
            formFileContentTypes[name] ??
            schema.contentMediaType ??
            'application/octet-stream',
          description: schema.description,
          fileField: true,
          files: selected.map((item) => item.file),
          multiple: getSchemaType(schema) === 'array',
          id: `file:${name}`,
          item: {
            contentType: selected[0]?.contentType ?? formFileContentTypes[name],
            enabled: formFileEnabled[name] !== false,
            name,
            value: selected.map((item) => item.file.name).join(', '),
          },
          nameLocked: true,
          removeLocked: true,
          required: requestSchema.required?.includes(name),
          source: '接口' as const,
        };
      }),
  ];

  /**
   * Resolves schema metadata for a JSON field in the current editable source.
   * @param path Object keys and array indexes derived from the source tokens.
   * @param source Current source, including unsaved edits in the expanded editor.
   * @returns Resolved field schema; unknown custom fields use an empty schema.
   */
  const getBodyFieldSchema = (path: Array<string | number>, source: string): Schema => {
    let currentValue: unknown;
    try {
      currentValue = JSON.parse(source);
    } catch {
      /* Incomplete JSON remains freely editable. */
    }
    let schema: Schema = requestSchema;
    const context = { direction: 'request' as const, schemas, variants: requestVariants };
    for (const key of path) {
      const resolved = resolveJsonExampleSchema(schema, currentValue, 'body', context);
      schema =
        typeof key === 'number'
          ? (resolved.prefixItems?.[key] ?? resolved.items ?? {})
          : (resolved.properties?.[key] ??
            (typeof resolved.additionalProperties === 'object'
              ? resolved.additionalProperties
              : {}));
      currentValue =
        currentValue && typeof currentValue === 'object'
          ? (currentValue as Record<string, unknown>)[key]
          : undefined;
    }
    return resolveJsonExampleSchema(schema, currentValue, 'body', context);
  };

  /**
   * Gets the hover explanation for a freely editable JSON field.
   * @param path Object keys and array indexes of the current field.
   * @param source Current source, including expanded-editor changes.
   * @returns Description and enum meanings without inline annotations.
   */
  const getBodyFieldDescription = (path: Array<string | number>, source: string): string => {
    const field = getBodyFieldSchema(path, source);
    const enums = getSchemaEnumItems(field);
    return [
      field.description?.trim(),
      enums.length
        ? `枚举：${enums
            .map((item) => `${item.value}${item.description ? ` - ${item.description}` : ''}`)
            .join('；')}`
        : '',
    ]
      .filter(Boolean)
      .join('\n');
  };

  /**
   * Supplies optional enum suggestions without constraining the edited JSON literal.
   * @param path Object keys and array indexes of the edited value.
   * @param source Current source used to resolve union branches.
   * @returns Declared enum choices and their descriptions.
   */
  const getBodyFieldOptions = (path: Array<string | number>, source: string) =>
    getSchemaEnumItems(getBodyFieldSchema(path, source));

  /** Resolves editor metadata for a request body field.
   * @param path Nested property or array path.
   * @param source Current JSON editor text.
   * @returns Field type, parent-declared required status, description and enum metadata.
   */
  const getBodyFieldMeta = (
    path: Array<string | number>,
    source: string,
  ): CodeEditorFieldMeta | undefined => {
    const field = getBodyFieldSchema(path, source);
    const name = path.at(-1);
    const parent =
      typeof name === 'string' ? getBodyFieldSchema(path.slice(0, -1), source) : undefined;
    const required =
      typeof name === 'string' && parent?.properties && Object.hasOwn(parent.properties, name)
        ? (parent.required?.includes(name) ?? false)
        : undefined;
    if (Object.keys(field).length === 0 && required === undefined) return undefined;
    const enums = getSchemaEnumItems(field);
    const type = isIntegerSchema(field)
      ? 'integer'
      : Array.isArray(field.type)
        ? field.type.join(' | ')
        : field.type || (field.properties ? 'object' : field.items ? 'array' : undefined);
    return {
      type,
      required,
      description: field.description?.trim() || field.title?.trim(),
      enums: enums.length ? enums : undefined,
    };
  };

  const responseSchema = useMemo(() => {
    const code = String(responseMetrics?.status || '');
    const raw = operation.responses?.[code] || operation.responses?.default;
    if (!raw) return {};
    const resolved = resolveResponseReference(raw, document.components);
    const types = getContentTypes(resolved.content);
    const mime =
      types.find((item) => responseMetrics?.contentType.includes(item)) ||
      getDefaultContentType(resolved.content);
    return resolved.content?.[mime]?.schema || {};
  }, [document.components, operation.responses, responseMetrics]);

  const workflowPaths = useMemo(() => {
    let requestValue: unknown;
    try {
      requestValue = JSON.parse(body);
    } catch {
      // Incomplete or non-JSON bodies still offer documented fields.
    }
    const responseOptions = new Map(
      getWorkflowPathOptions(responseSchema, schemas, responseJson).map((item) => [
        item.value,
        item,
      ]),
    );
    for (const raw of Object.values(operation.responses ?? {})) {
      const response = resolveResponseReference(raw, document.components);
      for (const media of Object.values(response.content ?? {})) {
        for (const item of getWorkflowPathOptions(media.schema ?? {}, schemas)) {
          if (!responseOptions.has(item.value)) responseOptions.set(item.value, item);
        }
      }
    }
    return {
      request: getWorkflowPathOptions(requestSchema, schemas, requestValue),
      response: [...responseOptions.values()],
    };
  }, [
    body,
    requestSchema,
    responseSchema,
    responseJson,
    schemas,
    operation.responses,
    document.components,
  ]);

  /** Resolves the response schema matching an editor field.
   * @param path Nested property or array path.
   * @param source Response JSON text used to infer missing schema information.
   * @returns Resolved schema for the requested field.
   */
  const getResponseFieldSchema = (path: Array<string | number>, source: string): Schema => {
    let currentValue: unknown;
    try {
      currentValue = JSON.parse(source);
    } catch {
      /* Incomplete JSON remains freely readable */
    }
    let schema: Schema = responseSchema;
    const context = { direction: 'response' as const, schemas, variants: new Map() };
    for (const key of path) {
      const resolved = resolveJsonExampleSchema(schema, currentValue, 'response', context);
      schema =
        typeof key === 'number'
          ? (resolved.prefixItems?.[key] ?? resolved.items ?? {})
          : (resolved.properties?.[key] ??
            (typeof resolved.additionalProperties === 'object'
              ? resolved.additionalProperties
              : {}));
      currentValue =
        currentValue && typeof currentValue === 'object'
          ? (currentValue as Record<string, unknown>)[key]
          : undefined;
    }
    return resolveJsonExampleSchema(schema, currentValue, 'response', context);
  };

  /** Builds response editor field metadata.
   * @param path Nested property or array path.
   * @param source Response JSON text.
   * @returns Type, description, required status and enum values.
   */
  const getResponseFieldMeta = (
    path: Array<string | number>,
    source: string,
  ): CodeEditorFieldMeta | undefined => {
    const field = getResponseFieldSchema(path, source);
    if (!field || Object.keys(field).length === 0) return undefined;
    const enums = getSchemaEnumItems(field);
    const type = isIntegerSchema(field)
      ? 'integer'
      : Array.isArray(field.type)
        ? field.type.join(' | ')
        : field.type || (field.properties ? 'object' : field.items ? 'array' : undefined);
    return {
      type,
      description: field.description?.trim() || field.title?.trim(),
      enums: enums.length ? enums : undefined,
    };
  };

  /** Builds the response field description and enum help text.
   * @param path Nested property or array path.
   * @param source Response JSON text.
   * @returns Readable description for the editor tooltip.
   */
  const getResponseFieldDescription = (path: Array<string | number>, source: string): string => {
    const field = getResponseFieldSchema(path, source);
    const enums = getSchemaEnumItems(field);
    return [
      field.description?.trim() || field.title?.trim(),
      enums.length
        ? `枚举：${enums
            .map((item) => `${item.value}${item.description ? ` - ${item.description}` : ''}`)
            .join('；')}`
        : '',
    ]
      .filter(Boolean)
      .join('\n');
  };
  /** Creates full response download data only when the user requests it.
   * @param None; reads the current complete response source.
   * @returns Original text and download metadata without reparsing JSON.
   */
  const getResponseExport = () => ({
    text: responseRawText || responseText,
    type: responseMetrics?.contentType || 'text/plain',
    filename: responseJson !== undefined ? 'response.json' : 'response.txt',
  });
  /** Formats a large JSON response without replacing its complete workflow data.
   * @param None.
   * @returns Completion after publishing a bounded preview or a visible failure.
   */
  const formatLargeResponse = async () => {
    previewController.current?.abort();
    const current = new AbortController();
    previewController.current = current;
    setFormattingResponse(true);
    try {
      const preview = await processResponseJson(responseRawText, current.signal, true);
      if (previewController.current === current && !current.signal.aborted) {
        setResponseText(String(preview));
        setResponseMode('pretty');
      }
    } catch (error) {
      if (!current.signal.aborted)
        setFeedback(error instanceof Error ? error.message : '格式化失败');
    } finally {
      if (previewController.current === current) setFormattingResponse(false);
    }
  };
  const visibleResponseText = useMemo(() => {
    const text =
      responseMode === 'raw'
        ? responseLimited
          ? truncateResponsePreview(responseRawText)
          : responseRawText
        : responseText;
    const query = responseSearch.trim().toLowerCase();
    return query
      ? text
          .split('\n')
          .filter((line) => line.toLowerCase().includes(query))
          .join('\n')
      : text;
  }, [responseMode, responseLimited, responseRawText, responseText, responseSearch]);
  const preActionCount = preRequestConfig.steps.filter((item) => item.enabled).length;
  const postActionCount = postResponseConfig.steps.filter((item) => item.enabled).length;

  const requestTabs: Array<{ label: string; value: RequestTab }> = [
    { label: `Params ${pathRows.length + queryRows.length}`, value: 'params' },
    { label: 'Body', value: 'body' },
    { label: `Headers ${headerRows.length}`, value: 'headers' },
    { label: `Cookies ${cookieRows.length}`, value: 'cookies' },
    { label: preActionCount ? `前置操作 ${preActionCount}` : '前置操作', value: 'pre-request' },
    { label: postActionCount ? `后置操作 ${postActionCount}` : '后置操作', value: 'post-response' },
  ];
  const statusReasonText = useMemo(() => {
    if (sending) return '请求中';
    if (responseError) return responseError;
    if (!responseMetrics) return undefined;
    if (responseMetrics.statusText && responseMetrics.statusText.trim()) {
      return responseMetrics.statusText;
    }
    const commonReasons: Record<number, string> = {
      200: 'OK',
      201: 'Created',
      202: 'Accepted',
      204: 'No Content',
      301: 'Moved Permanently',
      302: 'Found',
      304: 'Not Modified',
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      405: 'Method Not Allowed',
      408: 'Request Timeout',
      409: 'Conflict',
      422: 'Unprocessable Entity',
      429: 'Too Many Requests',
      500: 'Internal Server Error',
      502: 'Bad Gateway',
      503: 'Service Unavailable',
      504: 'Gateway Timeout',
    };
    return commonReasons[responseMetrics.status] || `${responseMetrics.status}`;
  }, [sending, responseError, responseMetrics]);

  const liveResponseLabel = useMemo(() => {
    const base =
      streaming || sseEvents.length
        ? `实时响应 ${sseEvents.length}${sseDropped ? `（已省略 ${sseDropped} 条）` : ''}`
        : '实时响应';

    if (sending) {
      return (
        <span className="playground-tab-label">
          <span>{base}</span>
          <span className="playground-status-badge is-pending" title="请求中">
            ...
          </span>
        </span>
      );
    }

    if (responseError) {
      return (
        <span className="playground-tab-label">
          <span>{base}</span>
          <Tooltip autoFlip={false} placement="bottom" content={responseError}>
            <span className="playground-status-badge is-error">Error</span>
          </Tooltip>
        </span>
      );
    }

    if (responseMetrics) {
      const isError = responseMetrics.status >= 400;
      return (
        <span className="playground-tab-label">
          <span>{base}</span>
          <Tooltip autoFlip={false} placement="bottom" content={statusReasonText}>
            <span className={`playground-status-badge ${isError ? 'is-error' : 'is-success'}`}>
              {responseMetrics.status}
            </span>
          </Tooltip>
        </span>
      );
    }

    return base;
  }, [
    streaming,
    sseEvents.length,
    sseDropped,
    sending,
    responseError,
    responseMetrics,
    statusReasonText,
  ]);

  const responseTabs: Array<{ label: ReactNode; title?: string; value: ResponseTab }> = useMemo(
    () => [
      {
        label: liveResponseLabel,
        title: statusReasonText,
        value: 'response',
      },
      { label: '头信息', value: 'headers' },
      { label: '实际请求', value: 'request' },
      { label: consoleLogs.length ? `控制台 ${consoleLogs.length}` : '控制台', value: 'console' },
    ],
    [liveResponseLabel, statusReasonText, consoleLogs.length],
  );

  return (
    <div className="playground-page">
      <div className="playground-context">
        <div>
          <span>{operation.group}</span>
          <i>·</i>
          <strong>{operation.summary || operation.operationId || operation.path}</strong>
          {operation.description && <small>{operation.description}</small>}
        </div>
        <span className="playground-context__environment">
          <i /> 当前环境
        </span>
      </div>
      <header className="playground-endpoint" data-method={operation.method}>
        <button
          aria-label="返回文档详情"
          className="playground-endpoint__back"
          onClick={onClose}
          style={{ width: `calc(${operation.method.length}ch + 18px)` }}
          title="返回文档详情"
          type="button"
        >
          <IconChevronLeft aria-hidden="true" size={16} />
        </button>
        <div className="playground-endpoint__address">
          <span className="playground-endpoint__method">{operation.method.toUpperCase()}</span>
          <div className="playground-endpoint__resource">
            <code className="playground-endpoint__url" title={requestBaseUrl}>
              {requestBaseUrl}
            </code>
            <Input
              variant="embedded"
              aria-label="请求 Path（可编辑）"
              autoComplete="off"
              className="playground-endpoint__path"
              onChange={(event) => setPathOverride(event.target.value)}
              placeholder="/请求路径"
              spellCheck={false}
              title="编辑请求路径"
              value={requestPath}
            />
          </div>
        </div>
        <div className="playground-endpoint__actions">
          <Tooltip content="复制 cURL">
            <button
              aria-label="复制 cURL"
              onClick={() => void copy(createCurlCommand(request), 'cURL 已复制')}
              type="button"
            >
              <IconCode aria-hidden="true" size={17} />
            </button>
          </Tooltip>
          <Tooltip content="恢复接口示例">
            <button
              aria-label="恢复接口示例"
              onClick={() => void clearDraft().catch(reportPersistenceFailure)}
              type="button"
            >
              <IconRefresh aria-hidden="true" size={16} />
            </button>
          </Tooltip>
          <Tooltip content="全局认证、参数与请求设置">
            <button aria-label="请求设置" onClick={() => setSettingsOpen(true)} type="button">
              <IconSettings aria-hidden="true" size={17} />
            </button>
          </Tooltip>
          <Tooltip
            content={sending ? '取消请求（⌘ / Ctrl + Enter）' : '发送请求（⌘ / Ctrl + Enter）'}
          >
            <button
              className={
                sending ? 'playground-endpoint__send is-stop' : 'playground-endpoint__send'
              }
              onClick={() => void send()}
              type="button"
            >
              {sending ? (
                <IconPlayerStop aria-hidden="true" size={13} />
              ) : (
                <IconSend aria-hidden="true" size={13} />
              )}
              {sending ? '取消' : '发送'}
            </button>
          </Tooltip>
        </div>
      </header>

      <div
        className={stackedLayout ? 'playground-layout is-stacked' : 'playground-layout'}
        ref={layoutRef}
        style={{ '--playground-request-size': `${paneRatio * 100}%` } as CSSProperties}
      >
        <section className="playground-panel">
          <header className="playground-panel__heading">
            <SegmentedControl
              ariaLabel="请求配置区域"
              autoWidth
              className="playground-panel__tabs"
              onChange={setRequestTab}
              options={requestTabs}
              value={requestTab}
            />
          </header>
          <div
            className={`playground-panel__body ${
              requestTab === 'pre-request' || requestTab === 'post-response' ? 'is-pre-post' : ''
            }`.trim()}
          >
            {requestTab === 'params' && (
              <>
                {pathRows.length > 0 && (
                  <section className="playground-section">
                    <header>
                      <h3>路径参数</h3>
                      <code>Path</code>
                    </header>
                    <PlaygroundFields
                      onUpdate={(id, patch) => {
                        if (pathOverride !== undefined && patch.value !== undefined) {
                          const previous = pathParams[Number(id.slice(id.indexOf(':') + 1))];
                          if (previous?.value) {
                            setPathOverride((current) =>
                              current
                                ?.split('/')
                                .map((segment, index) =>
                                  operation.path.split('/')[index] === `{${previous.name}}` &&
                                  segment === encodeURIComponent(previous.value)
                                    ? `{${previous.name}}`
                                    : segment,
                                )
                                .join('/'),
                            );
                          }
                        }
                        updateField(setPathParams, id, patch);
                      }}
                      rows={pathRows}
                    />
                  </section>
                )}
                <section className="playground-section">
                  <header>
                    <h3>查询参数</h3>
                    <code>Query</code>
                  </header>
                  <PlaygroundFields
                    onAdd={(parameter) => {
                      setQueryParams((current) => [...current, parameter]);
                      return `local:${queryParams.length}`;
                    }}
                    onRemove={(id) => updateLocal(setQueryParams, id, true)}
                    onToggleAll={(enabled, ids) => toggleFields(setQueryParams, enabled, ids)}
                    onUpdate={(id, patch) => updateField(setQueryParams, id, patch)}
                    rows={queryRows}
                  />
                </section>
              </>
            )}
            {requestTab === 'headers' && (
              <section className="playground-section">
                {conflictingSecurityHeaders.length > 0 && (
                  <p className="playground-security-note" role="status">
                    文档要求多个认证方案同时生效，但它们共用 {conflictingSecurityHeaders.join('、')}{' '}
                    请求头，无法同时写入；自动注入时只能采用已填写的首个凭据。
                  </p>
                )}
                <PlaygroundFields
                  headerNames
                  onAdd={(parameter) => {
                    setHeaders((current) => [...current, parameter]);
                    return `local:${headers.length}`;
                  }}
                  onRemove={(id) => updateLocal(setHeaders, id, true)}
                  onToggleAll={(enabled, ids) => toggleFields(setHeaders, enabled, ids)}
                  onUpdate={(id, patch) => updateField(setHeaders, id, patch)}
                  rows={headerRows}
                />
              </section>
            )}
            {requestTab === 'cookies' && (
              <section className="playground-section">
                {!sendBrowserCredentials && cookieRows.length > 0 && (
                  <p className="playground-security-note" role="status">
                    当前请求不携带浏览器 Cookie。浏览器无法单独省略某个已保存的 Cookie，禁用
                    Authorization 或 Cookie 参数时会一并省略浏览器凭据。
                  </p>
                )}
                <PlaygroundFields
                  onAdd={(parameter) => {
                    setCookies((current) => [...current, parameter]);
                    return `local:${cookies.length}`;
                  }}
                  onRemove={(id) => updateLocal(setCookies, id, true)}
                  onUpdate={(id, patch) => updateField(setCookies, id, patch)}
                  rows={cookieRows}
                />
              </section>
            )}
            {requestTab === 'body' && (
              <section className="playground-body-editor">
                <div className="playground-body-editor__header">
                  <SegmentedControl
                    ariaLabel="请求体类型"
                    autoWidth
                    mode="tabs"
                    className="playground-body-editor__types"
                    value={bodyKind}
                    onChange={selectBodyKind}
                    options={bodyKinds}
                  />
                  <header className="playground-body-editor__meta">
                    <span>
                      <strong>{requestSchema.referenceName || '请求体'}</strong>
                      {requestSchema.description && <small>{requestSchema.description}</small>}
                    </span>
                    <code>{contentType || '无请求体'}</code>
                    {['json', 'raw', 'xml'].includes(bodyKind) && (
                      <div className="playground-source-tools">
                        <div>
                          <PlaygroundHint text="格式化">
                            <button aria-label="格式化请求体" onClick={formatBody} type="button">
                              <IconIndentIncrease aria-hidden="true" size={15} />
                            </button>
                          </PlaygroundHint>
                          <PlaygroundHint text="放大编辑">
                            <button
                              aria-label="放大编辑完整请求体"
                              onClick={() => setBodyDialogOpen(true)}
                              type="button"
                            >
                              <IconMaximize aria-hidden="true" size={14} />
                            </button>
                          </PlaygroundHint>
                          <PlaygroundHint text="复制请求体">
                            <button
                              aria-label="复制请求体"
                              onClick={() => void copy(body, '请求体已复制')}
                              type="button"
                            >
                              <IconCopy aria-hidden="true" size={14} />
                            </button>
                          </PlaygroundHint>
                        </div>
                      </div>
                    )}
                  </header>
                </div>
                {bodyKind === 'none' ? (
                  <div className="playground-empty">
                    <b>∅</b>
                    <strong>此请求不携带 Body</strong>
                  </div>
                ) : bodyKind === 'form-data' ? (
                  <PlaygroundFields
                    allowContentType
                    onAdd={(parameter) => {
                      setFormFields((current) => [...current, parameter]);
                      return `form:${formFields.length}`;
                    }}
                    onFileChange={(id, files) => {
                      const name = id.slice(5);
                      const selectedContentType = formRows.find(
                        (row) => row.id === id,
                      )?.contentType;
                      setFormFiles((current) => {
                        const rest = current.filter((item) => item.name !== name);
                        return [
                          ...rest,
                          ...files.map((file) => ({
                            contentType: selectedContentType,
                            file,
                            name,
                          })),
                        ];
                      });
                    }}
                    onRemove={(id) => updateLocal(setFormFields, id, true)}
                    onUpdate={(id, patch) => {
                      if (id.startsWith('file:')) {
                        const name = id.slice(5);
                        if (patch.contentType !== undefined) {
                          setFormFileContentTypes((current) => ({
                            ...current,
                            [name]: patch.contentType!,
                          }));
                        }
                        if (patch.enabled !== undefined) {
                          setFormFileEnabled((current) => ({
                            ...current,
                            [name]: patch.enabled!,
                          }));
                        }
                        setFormFiles((current) =>
                          current.map((item) =>
                            item.name === name
                              ? {
                                  ...item,
                                  ...(patch.contentType !== undefined
                                    ? { contentType: patch.contentType }
                                    : {}),
                                }
                              : item,
                          ),
                        );
                      } else updateLocal(setFormFields, id, false, patch);
                    }}
                    rows={formRows}
                  />
                ) : bodyKind === 'urlencoded' ? (
                  <PlaygroundFields
                    hideMetadata
                    onAdd={(parameter) => {
                      setUrlEncodedFields((current) => [...current, parameter]);
                      return `encoded:${urlEncodedFields.length}`;
                    }}
                    onRemove={(id) => updateLocal(setUrlEncodedFields, id, true)}
                    onUpdate={(id, patch) => updateLocal(setUrlEncodedFields, id, false, patch)}
                    rows={urlEncodedFields.map((item, index) => {
                      const schema = resolveRequestSchema(formProperties[item.name] ?? {}, schemas);
                      return {
                        description: schema.description,
                        enumItems: getSchemaEnumItems(schema),
                        id: `encoded:${index}`,
                        item,
                        required: requestSchema.required?.includes(item.name),
                        source: '接口' as const,
                      };
                    })}
                  />
                ) : bodyKind === 'binary' ? (
                  <label className="playground-binary">
                    <IconFile aria-hidden="true" size={30} stroke={1.4} />
                    <strong>{binaryFile?.name || '选择二进制文件'}</strong>
                    {binaryFile && <span>{formatBytes(binaryFile.size)}</span>}
                    <input
                      aria-label="选择二进制请求文件"
                      onChange={(event) => setBinaryFile(event.target.files?.[0])}
                      type="file"
                    />
                  </label>
                ) : (
                  <CodeEditor
                    language={bodyKind === 'xml' ? 'xml' : bodyKind === 'json' ? 'json' : 'text'}
                    getFieldDescription={getBodyFieldDescription}
                    getFieldOptions={getBodyFieldOptions}
                    getFieldMeta={getBodyFieldMeta}
                    onChange={setBody}
                    value={body}
                    truncateLongStrings={false}
                    hoverTooltip={true}
                  />
                )}
              </section>
            )}
            {requestTab === 'pre-request' && (
              <PrePostOperationPanel
                availableOperations={availableOperations}
                pathOptions={workflowPaths}
                securityOptions={securitySchemes.map((item) => ({
                  value: item.key,
                  label: `${item.key} · ${item.type}`,
                }))}
                busy={sending}
                flow={flowData.flow}
                results={flowData.results}
                onRunStep={(step) => void runManualStep(step)}
                onFlowChange={(name, value) =>
                  saveFlow({ ...flowData, flow: { ...flowData.flow, [name]: value } })
                }
                onResetFlow={() => {
                  clearWorkflowSession(workflowScope);
                  setFlowData(readWorkflowSession(workflowScope));
                }}
                config={preRequestConfig}
                onChange={setPreRequestConfig}
                phase="pre-request"
              />
            )}
            {requestTab === 'post-response' && (
              <PrePostOperationPanel
                availableOperations={availableOperations}
                pathOptions={workflowPaths}
                securityOptions={securitySchemes.map((item) => ({
                  value: item.key,
                  label: `${item.key} · ${item.type}`,
                }))}
                busy={sending}
                flow={flowData.flow}
                results={flowData.results}
                onRunStep={(step) => void runManualStep(step)}
                onFlowChange={(name, value) =>
                  saveFlow({ ...flowData, flow: { ...flowData.flow, [name]: value } })
                }
                onResetFlow={() => {
                  clearWorkflowSession(workflowScope);
                  setFlowData(readWorkflowSession(workflowScope));
                }}
                precedingSteps={preRequestConfig.steps}
                config={postResponseConfig}
                onChange={setPostResponseConfig}
                phase="post-response"
              />
            )}
          </div>
        </section>

        <div
          aria-label="调整请求和响应区域大小"
          aria-orientation={stackedLayout ? 'horizontal' : 'vertical'}
          className="playground-divider"
          onKeyDown={(event) => {
            const previous = stackedLayout ? 'ArrowUp' : 'ArrowLeft';
            const next = stackedLayout ? 'ArrowDown' : 'ArrowRight';
            if (event.key === previous) setPaneRatio((value) => Math.max(0.34, value - 0.02));
            if (event.key === next) setPaneRatio((value) => Math.min(0.66, value + 0.02));
          }}
          onPointerDown={startPaneResize}
          role="separator"
          tabIndex={0}
        >
          <i />
        </div>

        <PlaygroundResponsePanel
          setResponseTab={setResponseTab}
          responseTabs={responseTabs}
          responseTab={responseTab}
          responseMetrics={responseMetrics}
          setResponseMode={setResponseMode}
          responseMode={responseMode}
          detectedImages={detectedImages}
          imageDialogOpen={imageDialogOpen}
          setSelectedImageKeyPath={setSelectedImageKeyPath}
          setImageDialogOpen={setImageDialogOpen}
          responseText={responseText}
          responseRawText={responseRawText}
          copy={copy}
          getResponseExport={getResponseExport}
          downloadBlob={downloadBlob}
          setResponseSearch={setResponseSearch}
          responseSearch={responseSearch}
          responseLimited={responseLimited}
          responseJson={responseJson}
          formattingResponse={formattingResponse}
          formatLargeResponse={formatLargeResponse}
          scanLargeResponseImages={scanLargeResponseImages}
          sending={sending}
          streaming={streaming}
          responseError={responseError}
          sseEvents={sseEvents}
          sseDropped={sseDropped}
          visibleResponseText={visibleResponseText}
          schemas={schemas}
          getResponseFieldMeta={getResponseFieldMeta}
          getResponseFieldDescription={getResponseFieldDescription}
          sentRequest={sentRequest}
          responseHeaders={responseHeaders}
          setConsoleFilter={setConsoleFilter}
          consoleFilter={consoleFilter}
          clearLogs={clearLogs}
          consoleDropped={consoleDropped}
          filteredConsoleLogs={filteredConsoleLogs}
        />
      </div>

      {settingsOpen && (
        <PlaygroundSettingsDialog
          credentials={credentials}
          globalHeaders={editableGlobalHeaders}
          globalQueryParams={editableGlobalQueryParams}
          onClose={() => setSettingsOpen(false)}
          onCredentialsChange={setCredentials}
          onGlobalHeadersChange={onGlobalHeadersChange}
          onGlobalQueryParamsChange={onGlobalQueryParamsChange}
          onSecurityValuesChange={onSecurityValuesChange}
          onTimeoutChange={setTimeoutSeconds}
          securitySchemes={securitySchemes}
          securityValues={securityValues}
          timeoutSeconds={timeoutSeconds}
        />
      )}
      {bodyDialogOpen && (
        <LongValueDialog
          name={`${bodyKind.toUpperCase()} 请求体`}
          language={bodyKind === 'xml' ? 'xml' : bodyKind === 'json' ? 'json' : 'text'}
          getFieldDescription={getBodyFieldDescription}
          getFieldOptions={getBodyFieldOptions}
          getFieldMeta={getBodyFieldMeta}
          onClose={() => setBodyDialogOpen(false)}
          onSave={setBody}
          value={body}
        />
      )}
      <ImagePreviewDialog
        open={imageDialogOpen}
        onClose={() => {
          setImageDialogOpen(false);
          setResponseMode('pretty');
        }}
        images={detectedImages}
        initialFocusKeyPath={selectedImageKeyPath}
      />
    </div>
  );
}
