import type { RefObject } from 'react';
import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import type { ApiOperation, OpenApiDocument } from '../../types/openapi';
import {
  readPersistentDebugDraft,
  writePersistentDebugDraft,
} from '../workspace/storage/operation-cache';
import { type DebugDraft } from './draft';
import {
  fileMemoryCache,
  parseFileCacheScope,
  prePostMemoryCache,
  validateAndFilterFiles,
  type PlaygroundFileMemory,
} from './file-memory';
import { isFileSchema } from './form-parameters';
import { parameterKey, type ParameterOverrides } from './parameter-overrides';
import type { PrePostPhaseConfig } from './pre-post-types';
import { reconcileDraft, reconcileParameters } from './reconcile-draft';
import {
  createDefaultDraft,
  defaultParameters,
  getRequestSchema,
  resolvePlaygroundOperation,
} from './request-defaults';
import { readDebugSession, writeDebugSession } from './session-cache';
import type { DebugFileField, DebugParameter, GlobalHeader } from './types';

interface Inputs {
  cookies: DebugParameter[];
  binaryFile: File | undefined;
  formFileContentTypes: Record<string, string>;
  formFileEnabled: Record<string, boolean>;
  formFiles: DebugFileField[];
  cacheRevision: number;
  debugCacheEnabled: boolean;
  sessionKey: string;
  authenticationTargets: Set<string>;
  setParameterOverrides: Dispatch<SetStateAction<ParameterOverrides>>;
  setPathOverride: Dispatch<SetStateAction<string | undefined>>;
  setPreRequestConfig: Dispatch<SetStateAction<PrePostPhaseConfig>>;
  setPostResponseConfig: Dispatch<SetStateAction<PrePostPhaseConfig>>;
  operation: ApiOperation;
  document: OpenApiDocument;
  contentType: string;
  requestVariants: Map<string, number>;
  draftKey: string;
  previousDocument: OpenApiDocument | undefined;
  setFormFiles: Dispatch<SetStateAction<DebugFileField[]>>;
  setFormFileContentTypes: Dispatch<SetStateAction<Record<string, string>>>;
  setFormFileEnabled: Dispatch<SetStateAction<Record<string, boolean>>>;
  setBinaryFile: Dispatch<SetStateAction<File | undefined>>;
  operationFileKey: string;
  setBody: Dispatch<SetStateAction<string>>;
  setHeaders: Dispatch<SetStateAction<DebugParameter[]>>;
  setPathParams: Dispatch<SetStateAction<DebugParameter[]>>;
  setQueryParams: Dispatch<SetStateAction<DebugParameter[]>>;
  setFormFields: Dispatch<SetStateAction<DebugParameter[]>>;
  setUrlEncodedFields: Dispatch<SetStateAction<DebugParameter[]>>;
  setCookies: Dispatch<SetStateAction<DebugParameter[]>>;
  globalHeaders: GlobalHeader[];
  globalQueryParams: GlobalHeader[];
  bodySeedsRef: RefObject<Map<string, string>>;
  setHydratedDraftKey: Dispatch<SetStateAction<string>>;
  headers: DebugParameter[];
  queryParams: DebugParameter[];
  body: string;
  formFields: DebugParameter[];
  pathParams: DebugParameter[];
  urlEncodedFields: DebugParameter[];
  parameterOverrides: ParameterOverrides;
  pathOverride: string | undefined;
  postResponseConfig: PrePostPhaseConfig;
  preRequestConfig: PrePostPhaseConfig;
  hydratedDraftKey: string;
  storageScope: string;
}
/** Owns PlaygroundDraft state and lifecycle for its caller.
 * @param input Explicit domain inputs and callbacks.
 * @returns Derived state and operations consumed by the composing view.
 */
export function usePlaygroundDraft({
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
}: Inputs) {
  const [restoredSessionKey, setRestoredSessionKey] = useState('');
  const clearedRevisionRef = useRef(cacheRevision);
  const suppressCacheRef = useRef(false);
  const suppressValueRef = useRef('');
  const sessionRestorePendingRef = useRef(false);
  const restoredSessionRef = useRef('');
  const restoredDraftRef = useRef('');
  const documentDefaultsRef = useRef(
    new Map<string, { draft: DebugDraft; cookies: DebugParameter[] }>(),
  );
  const enabledRef = useRef(debugCacheEnabled);
  const disabledBaselineRef = useRef('');
  const dirtyDisabledRef = useRef(false);
  const draftMemoryRef = useRef(new Map<string, DebugDraft>());
  const commonMemoryRef = useRef<
    Pick<DebugDraft, 'headers' | 'pathParams' | 'queryParams'> | undefined
  >(undefined);

  useLayoutEffect(() => {
    if (
      restoredSessionRef.current === sessionKey &&
      (!debugCacheEnabled || enabledRef.current || dirtyDisabledRef.current)
    )
      return;
    restoredSessionRef.current = sessionKey;
    sessionRestorePendingRef.current = true;
    const saved = debugCacheEnabled
      ? readDebugSession(sessionKey, authenticationTargets)
      : { overrides: {}, pathOverride: undefined };
    setParameterOverrides(saved.overrides);
    setPathOverride(saved.pathOverride);
    setRestoredSessionKey(sessionKey);

    const cachedPrePost = prePostMemoryCache.get(sessionKey);
    const savedPre = saved.preRequestConfig?.steps ? saved.preRequestConfig : undefined;
    const savedPost = saved.postResponseConfig?.steps ? saved.postResponseConfig : undefined;
    const initialPre = cachedPrePost?.preRequestConfig ??
      savedPre ?? {
        steps: [],
      };
    const initialPost = cachedPrePost?.postResponseConfig ??
      savedPost ?? {
        steps: [],
      };
    setPreRequestConfig(initialPre);
    setPostResponseConfig(initialPost);
  }, [
    sessionKey,
    debugCacheEnabled,
    authenticationTargets,
    setParameterOverrides,
    setPathOverride,
    setPreRequestConfig,
    setPostResponseConfig,
  ]);

  const liveDraftRef = useRef({
    body,
    headers,
    pathParams,
    queryParams,
    formFields,
    urlEncodedFields,
    cookies,
  });
  liveDraftRef.current = {
    body,
    headers,
    pathParams,
    queryParams,
    formFields,
    urlEncodedFields,
    cookies,
  };
  const liveFilesRef = useRef<PlaygroundFileMemory>({
    binaryFile,
    formFileContentTypes,
    formFileEnabled,
    formFiles,
  });
  liveFilesRef.current = {
    binaryFile,
    formFileContentTypes,
    formFileEnabled,
    formFiles,
  };
  useLayoutEffect(() => {
    const defaults = createDefaultDraft(operation, document, contentType, requestVariants);
    const nextCookies = defaultParameters(operation, 'cookie', document);
    let previous = documentDefaultsRef.current.get(draftKey);
    const oldDefinition = previousDocument?.paths?.[operation.path]?.[operation.method];
    if (!previous && previousDocument && oldDefinition) {
      const oldOperation = resolvePlaygroundOperation(
        {
          ...oldDefinition,
          method: operation.method,
          path: operation.path,
          group: operation.group,
        },
        previousDocument,
      );
      previous = {
        draft: createDefaultDraft(oldOperation, previousDocument, contentType, requestVariants),
        cookies: defaultParameters(oldOperation, 'cookie', previousDocument),
      };
    }
    documentDefaultsRef.current.set(draftKey, { draft: defaults, cookies: nextCookies });

    if (restoredDraftRef.current === draftKey) {
      const currentFiles = liveFilesRef.current;
      const validated = validateAndFilterFiles(
        currentFiles,
        operation,
        document.components?.schemas ?? {},
        contentType,
      );
      const filesChanged =
        validated.formFiles.length !== currentFiles.formFiles.length ||
        validated.binaryFile !== currentFiles.binaryFile ||
        validated.formFiles.some((item, index) => item !== currentFiles.formFiles[index]) ||
        Object.keys(validated.formFileContentTypes).length !==
          Object.keys(currentFiles.formFileContentTypes).length ||
        Object.keys(validated.formFileEnabled).length !==
          Object.keys(currentFiles.formFileEnabled).length;
      if (filesChanged) {
        setFormFiles(validated.formFiles);
        setFormFileContentTypes(validated.formFileContentTypes);
        setFormFileEnabled(validated.formFileEnabled);
        setBinaryFile(validated.binaryFile);
        liveFilesRef.current = validated;
        const cachedRecord = fileMemoryCache.get(operationFileKey);
        if (
          validated.formFiles.length > 0 ||
          validated.binaryFile ||
          Object.keys(validated.formFileContentTypes).length > 0
        ) {
          if (cachedRecord) {
            cachedRecord.data = validated;
          }
        } else {
          fileMemoryCache.delete(operationFileKey);
        }
      }
    }

    const documentChanged =
      previous &&
      (JSON.stringify(previous.draft) !== JSON.stringify(defaults) ||
        JSON.stringify(previous.cookies) !== JSON.stringify(nextCookies));
    if (documentChanged && previous) {
      const current =
        restoredDraftRef.current === draftKey
          ? liveDraftRef.current
          : (draftMemoryRef.current.get(draftKey) ??
            (debugCacheEnabled ? readPersistentDebugDraft(draftKey, defaults) : undefined) ??
            defaults);
      const next = reconcileDraft(
        restoredDraftRef.current === draftKey
          ? current
          : { ...current, ...commonMemoryRef.current },
        previous.draft,
        defaults,
      );
      const properties = getRequestSchema(
        operation,
        document.components?.schemas ?? {},
        contentType,
      ).properties;
      const fields = next.formFields.filter(
        (item) => !isFileSchema(properties?.[item.name] ?? {}, document.components?.schemas ?? {}),
      );
      setBody(next.body);
      setHeaders(
        next.headers.filter(
          (item) => !authenticationTargets.has(parameterKey('header', item.name)),
        ),
      );
      setPathParams(next.pathParams);
      setQueryParams(
        next.queryParams.filter(
          (item) => !authenticationTargets.has(parameterKey('query', item.name)),
        ),
      );
      setFormFields(fields);
      setUrlEncodedFields(next.urlEncodedFields);
      setCookies(
        reconcileParameters(
          restoredDraftRef.current === draftKey ? liveDraftRef.current.cookies : previous.cookies,
          previous.cookies,
          nextCookies,
        ).filter((item) => !authenticationTargets.has(parameterKey('cookie', item.name))),
      );
      const removed = new Set<string>();
      for (const [location, oldRows, newRows] of [
        ['header', previous.draft.headers, defaults.headers],
        ['query', previous.draft.queryParams, defaults.queryParams],
        ['cookie', previous.cookies, nextCookies],
      ] as const) {
        for (const row of oldRows)
          if (
            !newRows.some(
              (item) => parameterKey(location, item.name) === parameterKey(location, row.name),
            )
          ) {
            const key = parameterKey(location, row.name);
            const inherited =
              location === 'header' ? globalHeaders : location === 'query' ? globalQueryParams : [];
            if (
              !authenticationTargets.has(key) &&
              !inherited.some((item) => parameterKey(location, item.name) === key)
            )
              removed.add(key);
          }
      }
      setParameterOverrides((currentOverrides) =>
        Object.fromEntries(Object.entries(currentOverrides).filter(([key]) => !removed.has(key))),
      );
      bodySeedsRef.current.set(draftKey, next.body);
      draftMemoryRef.current.set(draftKey, { ...next, formFields: fields });
      commonMemoryRef.current = {
        headers: next.headers,
        pathParams: next.pathParams,
        queryParams: next.queryParams,
      };
      restoredDraftRef.current = draftKey;
      setHydratedDraftKey(draftKey);
      return;
    }
    if (
      restoredDraftRef.current === draftKey &&
      (!debugCacheEnabled || enabledRef.current || dirtyDisabledRef.current)
    ) {
      enabledRef.current = debugCacheEnabled;
      return;
    }
    restoredDraftRef.current = draftKey;
    enabledRef.current = debugCacheEnabled;
    dirtyDisabledRef.current = false;
    disabledBaselineRef.current = '';
    let draft: DebugDraft | undefined = draftMemoryRef.current.get(draftKey);
    if (debugCacheEnabled) {
      try {
        draft = draft ?? readPersistentDebugDraft(draftKey, defaults);
      } catch {
        // Draft storage is optional and should never block an API request.
      }
    }
    const next = { ...(draft ?? defaults), ...commonMemoryRef.current };
    const hasSelectedBodyVariant = [...requestVariants.keys()].some((key) =>
      key.startsWith('body'),
    );
    const bodyDraft = hasSelectedBodyVariant ? defaults : next;
    setBody(
      hasSelectedBodyVariant
        ? defaults.body
        : (bodySeedsRef.current.get(draftKey) ?? bodyDraft.body),
    );
    const properties = getRequestSchema(
      operation,
      document.components?.schemas ?? {},
      contentType,
    ).properties;
    setFormFields(
      bodyDraft.formFields.filter(
        (item) => !isFileSchema(properties?.[item.name] ?? {}, document.components?.schemas ?? {}),
      ),
    );
    setHeaders(
      next.headers.filter((item) => !authenticationTargets.has(parameterKey('header', item.name))),
    );
    setPathParams(next.pathParams);
    setQueryParams(
      next.queryParams.filter(
        (item) => !authenticationTargets.has(parameterKey('query', item.name)),
      ),
    );
    setUrlEncodedFields(bodyDraft.urlEncodedFields);
    const cachedRecord = fileMemoryCache.get(operationFileKey);
    const validFiles = validateAndFilterFiles(
      cachedRecord?.data,
      operation,
      document.components?.schemas ?? {},
      contentType,
    );
    if (
      validFiles.formFiles.length > 0 ||
      validFiles.binaryFile ||
      Object.keys(validFiles.formFileContentTypes).length > 0
    ) {
      if (cachedRecord) {
        cachedRecord.data = validFiles;
      }
    } else {
      fileMemoryCache.delete(operationFileKey);
    }
    setFormFiles(validFiles.formFiles);
    setFormFileContentTypes(validFiles.formFileContentTypes);
    setFormFileEnabled(validFiles.formFileEnabled);
    setBinaryFile(validFiles.binaryFile);
    liveFilesRef.current = validFiles;
    setCookies(
      defaultParameters(operation, 'cookie', document).filter(
        (item) => !authenticationTargets.has(parameterKey('cookie', item.name)),
      ),
    );
    suppressCacheRef.current = true;
    setHydratedDraftKey(draftKey);
  }, [
    authenticationTargets,
    operationFileKey,
    contentType,
    debugCacheEnabled,
    document,
    draftKey,
    globalHeaders,
    globalQueryParams,
    operation,
    previousDocument,
    requestVariants,
    setBody,
    bodySeedsRef,
    setFormFields,
    setHeaders,
    setPathParams,
    setQueryParams,
    setUrlEncodedFields,
    setFormFiles,
    setFormFileContentTypes,
    setFormFileEnabled,
    setBinaryFile,
    setCookies,
    setHydratedDraftKey,
    setParameterOverrides,
  ]);
  const currentDraft = useMemo<DebugDraft>(
    () => ({
      body,
      formFields,
      headers: headers.filter(
        (item) => !authenticationTargets.has(parameterKey('header', item.name)),
      ),
      pathParams,
      queryParams: queryParams.filter(
        (item) => !authenticationTargets.has(parameterKey('query', item.name)),
      ),
      urlEncodedFields,
    }),
    [authenticationTargets, body, formFields, headers, pathParams, queryParams, urlEncodedFields],
  );
  const cachePayload = useMemo(
    () =>
      JSON.stringify({
        currentDraft,
        parameterOverrides,
        pathOverride,
        postResponseConfig,
        preRequestConfig,
      }),
    [currentDraft, parameterOverrides, pathOverride, postResponseConfig, preRequestConfig],
  );
  const lastCachePayloadRef = useRef(cachePayload);
  useLayoutEffect(() => {
    if (!debugCacheEnabled && !disabledBaselineRef.current)
      disabledBaselineRef.current = lastCachePayloadRef.current;
    lastCachePayloadRef.current = cachePayload;
    if (sessionRestorePendingRef.current) {
      sessionRestorePendingRef.current = false;
      return;
    }
    if (hydratedDraftKey !== draftKey || restoredSessionKey !== sessionKey) return;
    if (suppressCacheRef.current) {
      suppressCacheRef.current = false;
      suppressValueRef.current = cachePayload;
      return;
    }
    if (suppressValueRef.current === cachePayload) return;
    suppressValueRef.current = '';
    bodySeedsRef.current.set(draftKey, body);
    draftMemoryRef.current.set(draftKey, currentDraft);
    commonMemoryRef.current = {
      headers: currentDraft.headers,
      pathParams: currentDraft.pathParams,
      queryParams: currentDraft.queryParams,
    };
    prePostMemoryCache.set(sessionKey, {
      ...parseFileCacheScope(storageScope),
      storageScope,
      method: operation.method.toLowerCase(),
      path: operation.path,
      postResponseConfig,
      preRequestConfig,
    });
    if (!debugCacheEnabled) {
      if (!disabledBaselineRef.current) disabledBaselineRef.current = cachePayload;
      else if (disabledBaselineRef.current !== cachePayload) dirtyDisabledRef.current = true;
      return;
    }
    try {
      writePersistentDebugDraft(draftKey, currentDraft);
      writeDebugSession(
        sessionKey,
        {
          overrides: parameterOverrides,
          pathOverride,
          postResponseConfig,
          preRequestConfig,
        },
        authenticationTargets,
      );
    } catch {
      /* Browser storage is optional. */
    }
  }, [
    authenticationTargets,
    body,
    cachePayload,
    currentDraft,
    debugCacheEnabled,
    draftKey,
    hydratedDraftKey,
    parameterOverrides,
    pathOverride,
    postResponseConfig,
    preRequestConfig,
    storageScope,
    operation.method,
    operation.path,
    restoredSessionKey,
    sessionKey,
    bodySeedsRef,
  ]);

  return { suppressCacheRef, draftMemoryRef, commonMemoryRef, liveFilesRef, clearedRevisionRef };
}
