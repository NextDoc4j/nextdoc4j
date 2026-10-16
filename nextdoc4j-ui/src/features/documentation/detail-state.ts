import { operationIdentity, parseScopeToken } from '../workspace/storage/identity';
import { readOperationState, patchOperationState } from '../workspace/storage/repository';
import { readStoredEnvelope, writeStoredEnvelope } from '../../lib/storage/envelope';
import type { ApiOperation } from '../../types/openapi';

export interface OperationDetailSelectionState {
  activeRequestContentType?: string;
  activeRequestExampleKey?: string;
  activeResponseCode?: string;
  activeResponseContentType?: string;
  activeResponseExampleKey?: string;
  requestVariants: Map<string, number>;
  responseVariants: Map<string, number>;
}

export interface PersistedOperationDetailSelectionState {
  activeRequestContentType?: string;
  activeRequestExampleKey?: string;
  activeResponseCode?: string;
  activeResponseContentType?: string;
  activeResponseExampleKey?: string;
  requestVariants: Record<string, number>;
  responseVariants: Record<string, number>;
}

const detailStateStoragePrefix = 'nextdoc4j:workspace:operation-detail';
const detailStateSchemaVersion = 1;

/**
 * Validates a persisted branch-selection record without trusting browser storage contents.
 *
 * @param value Unknown value read from browser storage.
 * @returns True when every branch index is a non-negative integer.
 */
const isVariantRecord = (value: unknown): value is Record<string, number> =>
  Boolean(
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.values(value).every(
      (index) => typeof index === 'number' && Number.isInteger(index) && index >= 0,
    ),
  );

/**
 * Validates the complete operation-detail selection record.
 *
 * @param value Unknown data from a versioned browser-storage envelope.
 * @returns True when optional labels and both branch maps have supported shapes.
 */
const isPersistedDetailState = (
  value: unknown,
): value is PersistedOperationDetailSelectionState => {
  if (!value || typeof value !== 'object') return false;
  const state = value as Partial<PersistedOperationDetailSelectionState>;
  return (
    (state.activeRequestContentType === undefined ||
      typeof state.activeRequestContentType === 'string') &&
    (state.activeRequestExampleKey === undefined ||
      typeof state.activeRequestExampleKey === 'string') &&
    (state.activeResponseCode === undefined || typeof state.activeResponseCode === 'string') &&
    (state.activeResponseContentType === undefined ||
      typeof state.activeResponseContentType === 'string') &&
    (state.activeResponseExampleKey === undefined ||
      typeof state.activeResponseExampleKey === 'string') &&
    isVariantRecord(state.requestVariants) &&
    isVariantRecord(state.responseVariants)
  );
};

/**
 * Serializes branch selections into a JSON-safe record.
 *
 * @param variants Current request or response branch selections.
 * @returns Non-negative integer branch indexes keyed by field path.
 */
const serializeVariants = (variants: Map<string, number>): Record<string, number> =>
  Object.fromEntries(
    [...variants].filter(([key, index]) => Boolean(key) && Number.isInteger(index) && index >= 0),
  );

/**
 * Creates an isolated storage key for one operation-detail selection state.
 *
 * @param operation Operation identity, including its optional documentation source.
 * @param requestPrefix Active service or gateway request prefix.
 * @returns Encoded browser-storage key scoped to the operation and service.
 */
export const createOperationDetailStateKey = (
  operation: Pick<ApiOperation, 'method' | 'path' | 'sourceGroupId'>,
  requestPrefix = '',
) =>
  `${detailStateStoragePrefix}:${[
    requestPrefix || 'single-app',
    operation.sourceGroupId || 'all',
    operation.method.toLowerCase(),
    operation.path,
  ]
    .map(encodeURIComponent)
    .join(':')}`;

/**
 * Reads one operation-detail selection state from browser storage.
 *
 * @param storage Browser storage containing the optional selection record.
 * @param storageKey Isolated key created for the active operation.
 * @returns Restored selections, or undefined when the record is absent or invalid.
 */
export const readOperationDetailState = (
  storage: Pick<Storage, 'getItem' | 'removeItem' | 'setItem'>,
  storageKey: string,
): OperationDetailSelectionState | undefined => {
  const stored = readStoredEnvelope(storage, storageKey, {
    schemaVersion: detailStateSchemaVersion,
    validate: isPersistedDetailState,
  });
  if (!stored) return undefined;
  return {
    ...stored,
    requestVariants: new Map(Object.entries(stored.requestVariants)),
    responseVariants: new Map(Object.entries(stored.responseVariants)),
  };
};

/**
 * Persists one operation-detail selection state as a versioned browser record.
 *
 * @param storage Browser storage receiving the selection record.
 * @param storageKey Isolated key created for the active operation.
 * @param state Current request and response selections.
 * @returns True when storage was updated, otherwise false when the record was unchanged.
 */
export const writeOperationDetailState = (
  storage: Pick<Storage, 'getItem' | 'setItem'>,
  storageKey: string,
  state: OperationDetailSelectionState,
) =>
  writeStoredEnvelope(
    storage,
    storageKey,
    {
      activeRequestContentType: state.activeRequestContentType,
      activeRequestExampleKey: state.activeRequestExampleKey,
      activeResponseCode: state.activeResponseCode,
      activeResponseContentType: state.activeResponseContentType,
      activeResponseExampleKey: state.activeResponseExampleKey,
      requestVariants: serializeVariants(state.requestVariants),
      responseVariants: serializeVariants(state.responseVariants),
    } satisfies PersistedOperationDetailSelectionState,
    detailStateSchemaVersion,
  );

/** Restores detail selections from the hydrated interface record.
 * @param key Detail key containing the workspace token and document identity.
 * @returns Saved selections with branch maps restored.
 */
export const readPersistentDetailState = (
  key: string,
): OperationDetailSelectionState | undefined => {
  const [token, source, method, path] = key
    .slice(`${detailStateStoragePrefix}:`.length)
    .split(':')
    .map(decodeURIComponent);
  const identity = operationIdentity(parseScopeToken(token), method, path);
  const stored = readOperationState(identity)?.detailByDocument[source];
  return stored
    ? {
        ...stored,
        requestVariants: new Map(Object.entries(stored.requestVariants)),
        responseVariants: new Map(Object.entries(stored.responseVariants)),
      }
    : undefined;
};
/** Saves detail selections without creating a per-interface LocalStorage item.
 * @param key Detail key carrying service and document identities.
 * @param state Current validated detail selections.
 * @returns Nothing; updates the interface state queue.
 */
export const writePersistentDetailState = (key: string, state: OperationDetailSelectionState) => {
  const [token, source, method, path] = key
    .slice(`${detailStateStoragePrefix}:`.length)
    .split(':')
    .map(decodeURIComponent);
  patchOperationState(operationIdentity(parseScopeToken(token), method, path), {
    detailByDocument: {
      [source]: {
        ...state,
        requestVariants: serializeVariants(state.requestVariants),
        responseVariants: serializeVariants(state.responseVariants),
      },
    },
  });
};
