import { readStoredEnvelope, writeStoredEnvelope } from '../../lib/storage/envelope';
import { createServiceScope } from '../aggregation/scope';
import {
  patchWorkspaceScopeSettings,
  readWorkspaceScopeSettings,
} from '../workspace/storage/settings';

export interface AuthPreferences {
  remember: boolean;
  values: Record<string, string>;
}

const emptyPreferences: AuthPreferences = { remember: false, values: {} };
const authSessionStoragePrefix = 'nextdoc4j:session:auth';
const legacyAuthStoragePrefix = 'nextdoc4j:auth-preferences';
const authSessionSchemaVersion = 1;

interface SessionAuthPreferences {
  values: Record<string, string>;
}

/**
 * Validates a session authentication record without accepting non-string credential values.
 *
 * @param value Unknown data from a storage envelope.
 * @returns True when the record contains a string-only credential map.
 */
const isSessionAuthPreferences = (value: unknown): value is SessionAuthPreferences => {
  if (!value || typeof value !== 'object') return false;
  const preferences = value as Partial<SessionAuthPreferences>;
  return Boolean(
    preferences.values &&
    typeof preferences.values === 'object' &&
    Object.values(preferences.values).every((item) => typeof item === 'string'),
  );
};

/**
 * Creates the session credential key for one single-app or service scope.
 *
 * @param serviceDocumentUrl Selected service OpenAPI URL, omitted for single-app mode.
 * @returns Stable session credential key.
 */
const createSessionAuthStorageKey = (serviceDocumentUrl?: string) =>
  `${authSessionStoragePrefix}:${createServiceScope(serviceDocumentUrl)}`;

/**
 * Creates the previous authentication key for lazy migration.
 *
 * @param serviceDocumentUrl Selected service OpenAPI URL, omitted for single-app mode.
 * @returns Legacy per-scope authentication key.
 */
const createLegacyAuthStorageKey = (serviceDocumentUrl?: string) =>
  `${legacyAuthStoragePrefix}:${createServiceScope(serviceDocumentUrl)}`;

/**
 * Parses persisted authentication preferences defensively.
 *
 * @param value Serialized session or local storage value.
 * @returns Valid preferences, or safe empty preferences for invalid data.
 */
export const parseAuthPreferences = (value: null | string): AuthPreferences => {
  if (!value) return emptyPreferences;
  try {
    const parsed = JSON.parse(value) as Partial<AuthPreferences>;
    if (!parsed.values || typeof parsed.values !== 'object') return emptyPreferences;
    return {
      remember: Boolean(parsed.remember),
      values: Object.fromEntries(
        Object.entries(parsed.values).filter(
          (entry): entry is [string, string] => typeof entry[1] === 'string',
        ),
      ),
    };
  } catch {
    return emptyPreferences;
  }
};

/**
 * Loads auth preferences, giving the current browser session precedence over remembered values.
 *
 * @param sessionStorage Browser session storage implementation.
 * @param localStorage Browser local storage implementation.
 * @param storageKey Shared storage key.
 * @returns Current session authentication preferences.
 */
export const readAuthPreferences = (
  sessionStorage: Pick<Storage, 'getItem'>,
  localStorage: Pick<Storage, 'getItem'>,
  storageKey: string,
) => parseAuthPreferences(sessionStorage.getItem(storageKey) ?? localStorage.getItem(storageKey));

/**
 * Stores credentials for the active tab and optionally persists them across sessions.
 *
 * @param preferences Credentials and remember choice from the settings panel.
 * @param sessionStorage Browser session storage implementation.
 * @param localStorage Browser local storage implementation.
 * @param storageKey Shared storage key.
 * @returns Nothing.
 */
export const writeAuthPreferences = (
  preferences: AuthPreferences,
  sessionStorage: Pick<Storage, 'setItem'>,
  localStorage: Pick<Storage, 'removeItem' | 'setItem'>,
  storageKey: string,
) => {
  const value = JSON.stringify(preferences);
  sessionStorage.setItem(storageKey, value);
  if (preferences.remember) localStorage.setItem(storageKey, value);
  else localStorage.removeItem(storageKey);
};

/**
 * Reads scoped session credentials first and falls back to explicitly remembered credentials.
 *
 * @param sessionStorage Browser session storage containing current-tab credentials.
 * @param localStorage Browser local storage containing remembered workspace settings.
 * @param serviceDocumentUrl Selected service OpenAPI URL, omitted for single-app mode.
 * @returns Current authentication values and remember choice.
 */
export const readScopedAuthPreferences = (
  sessionStorage: Pick<Storage, 'getItem' | 'removeItem' | 'setItem'>,
  localStorage: Pick<Storage, 'getItem' | 'removeItem' | 'setItem'>,
  serviceDocumentUrl?: string,
): AuthPreferences => {
  try {
    const settings = readWorkspaceScopeSettings(localStorage, serviceDocumentUrl);
    const sessionKey = createSessionAuthStorageKey(serviceDocumentUrl);
    let session = readStoredEnvelope(sessionStorage, sessionKey, {
      schemaVersion: authSessionSchemaVersion,
      validate: isSessionAuthPreferences,
    });
    if (!session) {
      const legacyKey = createLegacyAuthStorageKey(serviceDocumentUrl);
      const legacy = parseAuthPreferences(sessionStorage.getItem(legacyKey));
      if (Object.keys(legacy.values).length > 0) {
        session = { values: legacy.values };
        if (writeStoredEnvelope(sessionStorage, sessionKey, session, authSessionSchemaVersion)) {
          sessionStorage.removeItem(legacyKey);
        }
      }
    }
    return {
      remember: settings.rememberCredentials,
      values: session?.values ?? settings.rememberedCredentials,
    };
  } catch {
    return emptyPreferences;
  }
};

/**
 * Stores current credentials in the tab session and persists values locally only after opt-in.
 *
 * @param preferences Current authentication values and remember choice.
 * @param sessionStorage Browser session storage receiving current-tab credentials.
 * @param localStorage Browser local storage receiving explicitly remembered credentials.
 * @param serviceDocumentUrl Selected service OpenAPI URL, omitted for single-app mode.
 * @returns Nothing; storage failures leave the current React state usable.
 */
export const writeScopedAuthPreferences = (
  preferences: AuthPreferences,
  sessionStorage: Pick<Storage, 'getItem' | 'removeItem' | 'setItem'>,
  localStorage: Pick<Storage, 'getItem' | 'removeItem' | 'setItem'>,
  serviceDocumentUrl?: string,
) => {
  writeStoredEnvelope(
    sessionStorage,
    createSessionAuthStorageKey(serviceDocumentUrl),
    { values: preferences.values },
    authSessionSchemaVersion,
  );
  patchWorkspaceScopeSettings(localStorage, serviceDocumentUrl, {
    rememberCredentials: preferences.remember,
    rememberedCredentials: preferences.remember ? preferences.values : {},
  });
};
