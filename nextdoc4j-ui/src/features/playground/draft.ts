import type { DebugParameter } from './types';
import { readStoredEnvelope, writeStoredEnvelope } from '../../lib/storage/envelope';

export interface DebugDraft {
  body: string;
  formFields: DebugParameter[];
  headers: DebugParameter[];
  pathParams: DebugParameter[];
  queryParams: DebugParameter[];
  urlEncodedFields: DebugParameter[];
}

const sensitiveHeaderNames = new Set([
  'authorization',
  'cookie',
  'proxy-authorization',
  'x-api-key',
]);
const draftStoragePrefix = 'nextdoc4j:workspace:draft';
const legacyDraftVersion = 'nextdoc4j:debug-draft:v1';
const draftSchemaVersion = 1;

const isDebugParameter = (value: unknown): value is DebugParameter => {
  if (!value || typeof value !== 'object') return false;
  const parameter = value as Partial<DebugParameter>;
  return (
    typeof parameter.enabled === 'boolean' &&
    typeof parameter.name === 'string' &&
    typeof parameter.value === 'string' &&
    (parameter.contentType === undefined || typeof parameter.contentType === 'string')
  );
};

const sanitizeParameters = (value: unknown, includeSensitive = false): DebugParameter[] =>
  Array.isArray(value)
    ? value
        .filter(isDebugParameter)
        .filter((parameter) => {
          const normalizedName = parameter.name.trim().toLowerCase();
          return includeSensitive || !sensitiveHeaderNames.has(normalizedName);
        })
        .map((parameter) => ({
          ...(parameter.contentType !== undefined ? { contentType: parameter.contentType } : {}),
          enabled: parameter.enabled,
          name: parameter.name,
          value: parameter.value,
        }))
    : [];

/**
 * Validates the minimum persisted draft shape while leaving field filtering to the existing sanitizer.
 *
 * @param value Unknown draft data from a storage envelope.
 * @returns True when the draft has a string body that can be safely sanitized.
 */
const isPersistedDebugDraft = (value: unknown): value is DebugDraft =>
  Boolean(
    value && typeof value === 'object' && typeof (value as Partial<DebugDraft>).body === 'string',
  );

/**
 * Creates the legacy draft key corresponding to one current version-independent key.
 *
 * @param storageKey Current draft storage key.
 * @returns Previous v1 draft key, or undefined when the current key is malformed.
 */
const createLegacyDebugDraftKey = (storageKey: string) => {
  const prefix = `${draftStoragePrefix}:`;
  if (!storageKey.startsWith(prefix)) return undefined;
  const segments = storageKey.slice(prefix.length).split(':');
  if (segments.length !== 4) return undefined;
  try {
    return [legacyDraftVersion, ...segments.map((segment) => decodeURIComponent(segment))]
      .map(encodeURIComponent)
      .join(':');
  } catch {
    return undefined;
  }
};

/**
 * Creates an isolated debug-draft key from the selected service and operation identity.
 *
 * @param input Service prefix and OpenAPI operation identity.
 * @returns Stable storage key scoped to service, method, path and content type.
 */
export const createDebugDraftKey = (input: {
  contentType: string;
  method: string;
  path: string;
  requestPrefix?: string;
}) =>
  `${draftStoragePrefix}:${[
    input.requestPrefix || 'single-app',
    input.method.toLowerCase(),
    input.path,
    input.contentType || 'none',
  ]
    .map(encodeURIComponent)
    .join(':')}`;

/**
 * Creates the storage-key prefix for every debug draft of a selected service.
 *
 * @param requestPrefix Gateway service prefix used to isolate draft requests.
 * @returns Encoded storage-key prefix shared by that service's drafts.
 */
export const createDebugDraftPrefix = (requestPrefix?: string) =>
  `${draftStoragePrefix}:${encodeURIComponent(requestPrefix || 'single-app')}:`;

/**
 * Removes values that should never be retained by the debug cache.
 *
 * @param draft Current editable request state.
 * @returns Safe draft that excludes Cookie values, files and sensitive headers.
 */
export const sanitizeDebugDraft = (draft: DebugDraft): DebugDraft => ({
  body: draft.body,
  formFields: sanitizeParameters(draft.formFields, true),
  headers: sanitizeParameters(draft.headers),
  pathParams: sanitizeParameters(draft.pathParams, true),
  queryParams: sanitizeParameters(draft.queryParams, true),
  urlEncodedFields: sanitizeParameters(draft.urlEncodedFields, true),
});

/**
 * Reads a safe debug draft from browser storage.
 *
 * @param storage Browser storage implementation.
 * @param storageKey Draft storage key.
 * @returns Parsed draft, or undefined when no valid draft exists.
 */
export const readDebugDraft = (
  storage: Pick<Storage, 'getItem' | 'removeItem' | 'setItem'>,
  storageKey: string,
): DebugDraft | undefined => {
  try {
    const stored = readStoredEnvelope(storage, storageKey, {
      schemaVersion: draftSchemaVersion,
      validate: isPersistedDebugDraft,
    });
    if (stored) return sanitizeDebugDraft(stored);

    const legacyKey = createLegacyDebugDraftKey(storageKey);
    const raw = legacyKey ? storage.getItem(legacyKey) : null;
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as Partial<DebugDraft>;
    if (typeof parsed.body !== 'string') return undefined;
    const draft = sanitizeDebugDraft({
      body: parsed.body,
      formFields: sanitizeParameters(parsed.formFields, true),
      headers: sanitizeParameters(parsed.headers),
      pathParams: sanitizeParameters(parsed.pathParams, true),
      queryParams: sanitizeParameters(parsed.queryParams, true),
      urlEncodedFields: sanitizeParameters(parsed.urlEncodedFields, true),
    });
    const migrated = writeStoredEnvelope(storage, storageKey, draft, draftSchemaVersion);
    if (migrated && legacyKey) storage.removeItem(legacyKey);
    return draft;
  } catch {
    return undefined;
  }
};

/**
 * Persists a sanitized debug draft in browser storage.
 *
 * @param storage Browser storage implementation.
 * @param storageKey Draft storage key.
 * @param draft Current editable request state.
 * @returns Nothing.
 */
export const writeDebugDraft = (
  storage: Pick<Storage, 'getItem' | 'key' | 'length' | 'removeItem' | 'setItem'>,
  storageKey: string,
  draft: DebugDraft,
) => {
  writeStoredEnvelope(storage, storageKey, sanitizeDebugDraft(draft), draftSchemaVersion);
};

/**
 * Deletes one operation and content-type scoped debug draft.
 *
 * @param storage Browser storage implementation.
 * @param storageKey Draft storage key.
 * @returns Nothing.
 */
export const removeDebugDraft = (storage: Pick<Storage, 'removeItem'>, storageKey: string) => {
  storage.removeItem(storageKey);
};

/**
 * Collects current and legacy draft keys belonging to one service request prefix.
 *
 * @param storage Browser storage containing draft keys.
 * @param requestPrefix Gateway service prefix used to isolate draft records.
 * @returns Matching storage keys without reading or changing their values.
 */
const getDebugDraftKeys = (storage: Pick<Storage, 'key' | 'length'>, requestPrefix?: string) => {
  const prefix = createDebugDraftPrefix(requestPrefix);
  const legacyPrefix = `${[legacyDraftVersion, requestPrefix || 'single-app']
    .map(encodeURIComponent)
    .join(':')}:`;
  return Array.from({ length: storage.length }, (_, index) => storage.key(index)).filter(
    (key): key is string => Boolean(key?.startsWith(prefix) || key?.startsWith(legacyPrefix)),
  );
};

/**
 * Counts debug drafts associated with one service without mutating browser storage.
 *
 * @param storage Browser storage containing draft keys.
 * @param requestPrefix Gateway service prefix used to isolate draft records.
 * @returns Number of current and legacy draft records in the selected scope.
 */
export const countDebugDrafts = (
  storage: Pick<Storage, 'key' | 'length'>,
  requestPrefix?: string,
) => getDebugDraftKeys(storage, requestPrefix).length;

/**
 * Removes every debug draft associated with one service request prefix.
 *
 * @param storage Browser storage implementation.
 * @param requestPrefix Gateway service prefix used in draft keys.
 * @returns Number of drafts removed from storage.
 */
export const clearDebugDrafts = (
  storage: Pick<Storage, 'key' | 'length' | 'removeItem'>,
  requestPrefix?: string,
) => {
  const keys = getDebugDraftKeys(storage, requestPrefix);
  keys.forEach((key) => storage.removeItem(key));
  return keys.length;
};
