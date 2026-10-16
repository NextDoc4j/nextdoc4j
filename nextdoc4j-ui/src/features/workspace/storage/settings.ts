import { readStoredEnvelope, writeStoredEnvelope } from '../../../lib/storage/envelope';
import { createServiceScope } from '../../aggregation/scope';
import type { GlobalHeader } from '../../playground/types';

export interface WorkspaceDefaultSettings {
  headers: GlobalHeader[];
  queryParams: GlobalHeader[];
}

export interface WorkspaceScopeSettings extends WorkspaceDefaultSettings {
  debugDraftEnabled: boolean;
  groupOverviewEnabled: boolean;
  rememberCredentials: boolean;
  rememberedCredentials: Record<string, string>;
}

const workspaceDefaultsStorageKey = 'nextdoc4j:workspace:defaults';
const workspaceScopeStoragePrefix = 'nextdoc4j:workspace:scope';
const workspaceSettingsSchemaVersion = 1;
const legacyHeadersStorageKey = 'nextdoc4j:global-headers';
const legacyQueryParamsStorageKey = 'nextdoc4j:global-query-params';
const legacyAuthStorageKey = 'nextdoc4j:auth-preferences';
const legacyDebugStorageKey = 'nextdoc4j:debug-cache-enabled';
const legacyOverviewStorageKey = 'nextdoc4j:group-overview-enabled';

const emptyDefaultSettings: WorkspaceDefaultSettings = { headers: [], queryParams: [] };
const emptyScopeSettings: WorkspaceScopeSettings = {
  debugDraftEnabled: true,
  groupOverviewEnabled: true,
  headers: [],
  queryParams: [],
  rememberCredentials: false,
  rememberedCredentials: {},
};

/**
 * Validates one request parameter row without changing the project's existing field rules.
 *
 * @param value Unknown row parsed from browser storage.
 * @returns True when the row matches the existing global-parameter shape.
 */
const isGlobalHeader = (value: unknown): value is GlobalHeader => {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<GlobalHeader>;
  return (
    typeof item.id === 'string' &&
    typeof item.name === 'string' &&
    typeof item.value === 'string' &&
    (item.enabled === undefined || typeof item.enabled === 'boolean') &&
    (item.description === undefined || typeof item.description === 'string')
  );
};

/**
 * Validates a list of global Header or Query parameter rows.
 *
 * @param value Unknown list parsed from browser storage.
 * @returns True when every item matches the existing parameter rules.
 */
const isGlobalHeaderList = (value: unknown): value is GlobalHeader[] =>
  Array.isArray(value) && value.every(isGlobalHeader);

/**
 * Validates a string-only map used for remembered security scheme values.
 *
 * @param value Unknown credential map parsed from browser storage.
 * @returns True when every credential value is a string.
 */
const isCredentialMap = (value: unknown): value is Record<string, string> =>
  Boolean(
    value &&
    typeof value === 'object' &&
    Object.values(value).every((item) => typeof item === 'string'),
  );

/**
 * Validates the default aggregation request parameter record.
 *
 * @param value Unknown data from a storage envelope.
 * @returns True when default Header and Query parameter lists are valid.
 */
const isWorkspaceDefaultSettings = (value: unknown): value is WorkspaceDefaultSettings => {
  if (!value || typeof value !== 'object') return false;
  const settings = value as Partial<WorkspaceDefaultSettings>;
  return isGlobalHeaderList(settings.headers) && isGlobalHeaderList(settings.queryParams);
};

/**
 * Validates service-scoped request, display and remembered-auth settings.
 *
 * @param value Unknown data from a storage envelope.
 * @returns True when every current workspace setting has the expected type.
 */
const isWorkspaceScopeSettings = (value: unknown): value is WorkspaceScopeSettings => {
  if (!value || typeof value !== 'object') return false;
  const settings = value as Partial<WorkspaceScopeSettings>;
  return (
    typeof settings.debugDraftEnabled === 'boolean' &&
    typeof settings.groupOverviewEnabled === 'boolean' &&
    isGlobalHeaderList(settings.headers) &&
    isGlobalHeaderList(settings.queryParams) &&
    typeof settings.rememberCredentials === 'boolean' &&
    isCredentialMap(settings.rememberedCredentials)
  );
};

/**
 * Parses a legacy JSON parameter list with the same filtering rules as the existing reader.
 *
 * @param serialized Legacy serialized Header or Query parameter list.
 * @returns Valid rows from the legacy list, or an empty list.
 */
const parseLegacyParameters = (serialized: string | null): GlobalHeader[] => {
  if (!serialized) return [];
  try {
    const value = JSON.parse(serialized) as unknown;
    return Array.isArray(value) ? value.filter(isGlobalHeader) : [];
  } catch {
    return [];
  }
};

/**
 * Parses the previous authentication record while preserving its remember choice.
 *
 * @param serialized Legacy serialized authentication preference.
 * @returns Remember choice and valid string credentials.
 */
const parseLegacyAuth = (serialized: string | null) => {
  if (!serialized) return { remember: false, values: {} as Record<string, string> };
  try {
    const value = JSON.parse(serialized) as { remember?: unknown; values?: unknown };
    return {
      remember: Boolean(value.remember),
      values: isCredentialMap(value.values) ? value.values : {},
    };
  } catch {
    return { remember: false, values: {} as Record<string, string> };
  }
};

/**
 * Converts a previous string boolean to a safe setting value.
 *
 * @param value Legacy browser-storage value.
 * @param fallback Value used when the legacy key is missing.
 * @returns Parsed boolean preference.
 */
const parseLegacyBoolean = (value: string | null, fallback: boolean) =>
  value === null ? fallback : value === 'true';

/**
 * Creates the stable workspace settings key for one single-app or service scope.
 *
 * @param serviceDocumentUrl Selected service OpenAPI URL, omitted for single-app mode.
 * @returns Version-independent workspace settings key.
 */
export const createWorkspaceScopeStorageKey = (serviceDocumentUrl?: string) =>
  `${workspaceScopeStoragePrefix}:${createServiceScope(serviceDocumentUrl)}`;

/**
 * Reads aggregation-wide request defaults and migrates their legacy single-app records.
 *
 * @param storage Browser local storage containing workspace settings.
 * @returns Valid global default Header and Query parameter lists.
 */
export const readWorkspaceDefaultSettings = (
  storage: Pick<Storage, 'getItem' | 'removeItem' | 'setItem'>,
): WorkspaceDefaultSettings => {
  try {
    const stored = readStoredEnvelope(storage, workspaceDefaultsStorageKey, {
      schemaVersion: workspaceSettingsSchemaVersion,
      validate: isWorkspaceDefaultSettings,
    });
    if (stored) return stored;
    const scope = createServiceScope();
    const legacy = {
      headers: parseLegacyParameters(storage.getItem(`${legacyHeadersStorageKey}:${scope}`)),
      queryParams: parseLegacyParameters(
        storage.getItem(`${legacyQueryParamsStorageKey}:${scope}`),
      ),
    };
    const migrated = writeStoredEnvelope(
      storage,
      workspaceDefaultsStorageKey,
      legacy,
      workspaceSettingsSchemaVersion,
    );
    if (migrated) {
      storage.removeItem(`${legacyHeadersStorageKey}:${scope}`);
      storage.removeItem(`${legacyQueryParamsStorageKey}:${scope}`);
    }
    return legacy;
  } catch {
    return emptyDefaultSettings;
  }
};

/**
 * Persists aggregation-wide request parameter defaults.
 *
 * @param storage Browser local storage receiving workspace settings.
 * @param settings Current global Header and Query parameter lists.
 * @returns True when storage changed, otherwise false.
 */
export const writeWorkspaceDefaultSettings = (
  storage: Pick<Storage, 'getItem' | 'setItem'>,
  settings: WorkspaceDefaultSettings,
) =>
  writeStoredEnvelope(
    storage,
    workspaceDefaultsStorageKey,
    settings,
    workspaceSettingsSchemaVersion,
  );

/**
 * Reads one workspace scope and lazily imports previous per-feature records.
 *
 * @param storage Browser local storage containing workspace settings.
 * @param serviceDocumentUrl Selected service OpenAPI URL, omitted for single-app mode.
 * @returns Valid settings for the selected workspace scope.
 */
export const readWorkspaceScopeSettings = (
  storage: Pick<Storage, 'getItem' | 'removeItem' | 'setItem'>,
  serviceDocumentUrl?: string,
): WorkspaceScopeSettings => {
  try {
    const storageKey = createWorkspaceScopeStorageKey(serviceDocumentUrl);
    const stored = readStoredEnvelope(storage, storageKey, {
      schemaVersion: workspaceSettingsSchemaVersion,
      validate: isWorkspaceScopeSettings,
    });
    if (stored) return stored;

    const scope = createServiceScope(serviceDocumentUrl);
    const legacyAuth = parseLegacyAuth(storage.getItem(`${legacyAuthStorageKey}:${scope}`));
    const fallbackDefaults = serviceDocumentUrl
      ? emptyDefaultSettings
      : readWorkspaceDefaultSettings(storage);
    const legacyHeaders = storage.getItem(`${legacyHeadersStorageKey}:${scope}`);
    const legacyQueryParams = storage.getItem(`${legacyQueryParamsStorageKey}:${scope}`);
    const settings: WorkspaceScopeSettings = {
      debugDraftEnabled: parseLegacyBoolean(
        storage.getItem(`${legacyDebugStorageKey}:${scope}`),
        true,
      ),
      groupOverviewEnabled: parseLegacyBoolean(
        storage.getItem(`${legacyOverviewStorageKey}:${scope}`),
        true,
      ),
      headers:
        legacyHeaders === null ? fallbackDefaults.headers : parseLegacyParameters(legacyHeaders),
      queryParams:
        legacyQueryParams === null
          ? fallbackDefaults.queryParams
          : parseLegacyParameters(legacyQueryParams),
      rememberCredentials: legacyAuth.remember,
      rememberedCredentials: legacyAuth.remember ? legacyAuth.values : {},
    };
    const migrated = writeStoredEnvelope(
      storage,
      storageKey,
      settings,
      workspaceSettingsSchemaVersion,
    );
    if (migrated) {
      storage.removeItem(`${legacyAuthStorageKey}:${scope}`);
      storage.removeItem(`${legacyDebugStorageKey}:${scope}`);
      storage.removeItem(`${legacyOverviewStorageKey}:${scope}`);
      storage.removeItem(`${legacyHeadersStorageKey}:${scope}`);
      storage.removeItem(`${legacyQueryParamsStorageKey}:${scope}`);
    }
    return settings;
  } catch {
    return emptyScopeSettings;
  }
};

/**
 * Persists a complete service-scoped document-management settings record.
 *
 * @param storage Browser local storage receiving workspace settings.
 * @param serviceDocumentUrl Selected service OpenAPI URL, omitted for single-app mode.
 * @param settings Complete current settings for the selected scope.
 * @returns True when storage changed, otherwise false.
 */
export const writeWorkspaceScopeSettings = (
  storage: Pick<Storage, 'getItem' | 'setItem'>,
  serviceDocumentUrl: string | undefined,
  settings: WorkspaceScopeSettings,
) =>
  writeStoredEnvelope(
    storage,
    createWorkspaceScopeStorageKey(serviceDocumentUrl),
    settings,
    workspaceSettingsSchemaVersion,
  );

/**
 * Applies a partial change without discarding unrelated settings in the same workspace scope.
 *
 * @param storage Browser local storage containing workspace settings.
 * @param serviceDocumentUrl Selected service OpenAPI URL, omitted for single-app mode.
 * @param patch Fields that changed in the active workspace.
 * @returns True when storage changed, otherwise false.
 */
export const patchWorkspaceScopeSettings = (
  storage: Pick<Storage, 'getItem' | 'removeItem' | 'setItem'>,
  serviceDocumentUrl: string | undefined,
  patch: Partial<WorkspaceScopeSettings>,
) =>
  writeWorkspaceScopeSettings(storage, serviceDocumentUrl, {
    ...readWorkspaceScopeSettings(storage, serviceDocumentUrl),
    ...patch,
  });
