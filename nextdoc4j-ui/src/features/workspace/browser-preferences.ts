import { readWorkspaceHash } from '../aggregation/workspace-route';
import type { GlobalHeader } from '../playground/types';

export type ThemePreference = 'light' | 'dark' | 'system';

/**
 * Reads persisted global request parameters without preventing application startup.
 *
 * @param storage Browser storage that contains Header or Query parameter rows.
 * @param storageKey Storage key containing the serialized parameter rows.
 * @returns Valid parameter rows, or an empty list for missing or malformed data.
 */
export const readStoredParameters = (
  storage: Pick<Storage, 'getItem'>,
  storageKey: string,
): GlobalHeader[] => {
  try {
    const value = JSON.parse(storage.getItem(storageKey) || '[]');
    if (!Array.isArray(value)) return [];
    return value.filter(
      (item): item is GlobalHeader =>
        typeof item?.id === 'string' &&
        typeof item.name === 'string' &&
        typeof item.value === 'string' &&
        (item.enabled === undefined || typeof item.enabled === 'boolean') &&
        (item.description === undefined || typeof item.description === 'string'),
    );
  } catch {
    return [];
  }
};

/**
 * Combines global defaults with active-service overrides while preserving service precedence.
 *
 * @param globalItems Parameters configured for every aggregation service.
 * @param serviceItems Parameters configured only for the currently selected service.
 * @returns Global rows followed by service rows that do not share a configured parameter name.
 */
export const mergeGlobalParameters = (
  globalItems: GlobalHeader[],
  serviceItems: GlobalHeader[],
) => {
  const serviceNames = new Set(
    serviceItems.map((item) => item.name.trim().toLocaleLowerCase()).filter(Boolean),
  );
  return [
    ...globalItems.filter((item) => !serviceNames.has(item.name.trim().toLocaleLowerCase())),
    ...serviceItems,
  ];
};

/**
 * Reads a boolean user preference with a safe default when browser storage is unavailable.
 *
 * @param storage Browser storage that contains the preference.
 * @param storageKey Preference storage key.
 * @param defaultValue Value used for missing, malformed or inaccessible storage.
 * @returns Persisted boolean preference or the provided default.
 */
export const readStoredBoolean = (
  storage: Pick<Storage, 'getItem'>,
  storageKey: string,
  defaultValue: boolean,
) => {
  try {
    const value = storage.getItem(storageKey);
    return value === null ? defaultValue : value === 'true';
  } catch {
    return defaultValue;
  }
};

/**
 * Restores the selected visual theme while converting the previous boolean preference.
 *
 * @param storage Browser storage that contains the visual preference.
 * @param storageKey Storage key that owns the visual theme preference.
 * @returns A supported theme preference, defaulting to the operating-system setting.
 */
export const readStoredThemePreference = (
  storage: Pick<Storage, 'getItem'>,
  storageKey: string,
): ThemePreference => {
  try {
    const value = storage.getItem(storageKey);
    if (value === 'light' || value === 'dark' || value === 'system') return value;
    if (value === 'true') return 'dark';
    if (value === 'false') return 'light';
  } catch {
    // Theme selection remains available for the current page when storage is unavailable.
  }
  return 'system';
};

/**
 * Reads the current operating-system color-scheme preference without assuming browser support.
 *
 * @returns True when the operating system currently prefers a dark color scheme.
 */
export const getSystemDarkMode = () =>
  globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;

/**
 * Reads a persisted sidebar width while keeping it within the supported workspace layout range.
 *
 * @param storage Browser storage that contains the sidebar width.
 * @param storageKey Storage key that owns the saved width.
 * @param minWidth Minimum supported width in CSS pixels.
 * @param maxWidth Maximum supported width in CSS pixels.
 * @param defaultWidth Width used for missing, malformed or inaccessible storage.
 * @returns A rounded width constrained to the configured range.
 */
export const readStoredSidebarWidth = (
  storage: Pick<Storage, 'getItem'>,
  storageKey: string,
  minWidth: number,
  maxWidth: number,
  defaultWidth: number,
) => {
  try {
    const value = storage.getItem(storageKey);
    if (value === null) return defaultWidth;
    const width = Number(value);
    if (!Number.isFinite(width)) return defaultWidth;
    return Math.min(maxWidth, Math.max(minWidth, Math.round(width)));
  } catch {
    return defaultWidth;
  }
};

/**
 * Reads the last selected aggregation service without failing application startup.
 *
 * @param storage Browser storage that contains the selected service URL.
 * @param storageKey Storage key that owns the selected service URL.
 * @returns Persisted service document URL, or undefined when storage is unavailable.
 */
export const readStoredServiceUrl = (storage: Pick<Storage, 'getItem'>, storageKey: string) => {
  try {
    return storage.getItem(storageKey) || undefined;
  } catch {
    return undefined;
  }
};

/**
 * Persists the selected aggregation service for the next browser session.
 *
 * @param storage Browser storage that receives the selected service URL.
 * @param storageKey Storage key that owns the selected service URL.
 * @param serviceUrl Service OpenAPI document URL to remember.
 * @returns Nothing; storage failures do not affect the active workspace.
 */
export const writeStoredServiceUrl = (
  storage: Pick<Storage, 'setItem'>,
  storageKey: string,
  serviceUrl: string,
) => {
  try {
    storage.setItem(storageKey, serviceUrl);
  } catch {
    // Browser privacy settings can deny storage without affecting document use.
  }
};

/**
 * Reads a restorable service route without exposing storage failures to workspace loading.
 *
 * @param storage Browser storage that contains the last workspace route.
 * @param serviceDocumentUrl Selected service URL; omitted for single-app mode.
 * @returns Persisted route or the document overview route.
 */
export const readRestoredWorkspaceHash = (
  storage: Pick<Storage, 'getItem'>,
  serviceDocumentUrl?: string,
) => {
  try {
    return readWorkspaceHash(storage, serviceDocumentUrl) || '#/home';
  } catch {
    return '#/home';
  }
};
