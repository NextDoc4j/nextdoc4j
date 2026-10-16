import { readStoredEnvelope, writeStoredEnvelope } from '../../lib/storage/envelope';
import type { ThemePreference } from '../workspace/browser-preferences';

export type ContentWidthPreference = 'auto' | 'standard' | 'wide';
export type NavigationExpansionPreference = 'accordion' | 'free';

export interface UserPreferences {
  contentWidth: ContentWidthPreference;
  copyrightEnabled: boolean;
  middleClickCloseEnabled: boolean;
  navigationExpansion: NavigationExpansionPreference;
  restoreTabsEnabled: boolean;
  theme: ThemePreference;
  watermarkEnabled: boolean;
}

export const defaultUserPreferences: UserPreferences = {
  contentWidth: 'standard',
  copyrightEnabled: true,
  middleClickCloseEnabled: true,
  navigationExpansion: 'free',
  restoreTabsEnabled: true,
  theme: 'system',
  watermarkEnabled: false,
};

const preferencesStorageKey = 'nextdoc4j:preferences';
const legacyThemeStorageKey = 'nextdoc4j:dark-mode:single-app';
const preferencesSchemaVersion = 2;

/**
 * Checks whether an unknown value is a supported three-state theme preference.
 *
 * @param value Unknown theme value read from browser storage.
 * @returns True when the value selects light, dark, or the operating-system theme.
 */
const isThemePreference = (value: unknown): value is ThemePreference =>
  value === 'light' || value === 'dark' || value === 'system';

/**
 * Validates the complete persisted user-preference record.
 *
 * @param value Unknown data read from the preferences storage envelope.
 * @returns True when every preference has the expected current schema type.
 */
const isUserPreferences = (value: unknown): value is UserPreferences => {
  if (!value || typeof value !== 'object') return false;
  const preferences = value as Partial<UserPreferences>;
  return (
    (preferences.contentWidth === 'auto' ||
      preferences.contentWidth === 'standard' ||
      preferences.contentWidth === 'wide') &&
    typeof preferences.copyrightEnabled === 'boolean' &&
    typeof preferences.middleClickCloseEnabled === 'boolean' &&
    (preferences.navigationExpansion === 'free' ||
      preferences.navigationExpansion === 'accordion') &&
    typeof preferences.restoreTabsEnabled === 'boolean' &&
    isThemePreference(preferences.theme) &&
    typeof preferences.watermarkEnabled === 'boolean'
  );
};

/**
 * Converts one legacy theme value to the current three-state preference.
 *
 * @param value Legacy string stored by the previous theme implementation.
 * @returns A supported theme preference.
 */
const parseLegacyTheme = (value: string): ThemePreference => {
  if (isThemePreference(value)) return value;
  if (value === 'true') return 'dark';
  if (value === 'false') return 'light';
  return 'system';
};

/**
 * Migrates the original theme-only preference record into the complete schema.
 *
 * @param value Previous schema data containing an optional theme field.
 * @returns Current preferences with the previous valid theme preserved.
 */
const migrateThemePreferences = (value: unknown): UserPreferences => {
  const theme =
    value && typeof value === 'object' && isThemePreference((value as { theme?: unknown }).theme)
      ? (value as { theme: ThemePreference }).theme
      : defaultUserPreferences.theme;
  return { ...defaultUserPreferences, theme };
};

/**
 * Reads all general UI preferences and imports the previous standalone theme when needed.
 *
 * @param storage Browser local storage containing user preferences.
 * @returns A complete validated preference record.
 */
export const readUserPreferences = (
  storage: Pick<Storage, 'getItem' | 'removeItem' | 'setItem'>,
): UserPreferences => {
  try {
    const preferences = readStoredEnvelope(storage, preferencesStorageKey, {
      migrations: { 1: migrateThemePreferences },
      schemaVersion: preferencesSchemaVersion,
      validate: isUserPreferences,
    });
    if (preferences) return preferences;

    const legacy = storage.getItem(legacyThemeStorageKey);
    if (legacy === null) return defaultUserPreferences;
    const migrated = { ...defaultUserPreferences, theme: parseLegacyTheme(legacy) };
    if (writeStoredEnvelope(storage, preferencesStorageKey, migrated, preferencesSchemaVersion)) {
      storage.removeItem(legacyThemeStorageKey);
    }
    return migrated;
  } catch {
    return defaultUserPreferences;
  }
};

/**
 * Persists the complete validated user-preference record.
 *
 * @param storage Browser local storage receiving preferences.
 * @param preferences Current general preference values.
 * @returns True when browser storage changed, otherwise false.
 */
export const writeUserPreferences = (
  storage: Pick<Storage, 'getItem' | 'setItem'>,
  preferences: UserPreferences,
) => writeStoredEnvelope(storage, preferencesStorageKey, preferences, preferencesSchemaVersion);

/**
 * Restores every general preference to its stable application default.
 *
 * @param storage Browser local storage receiving the default record.
 * @returns True when browser storage changed, otherwise false.
 */
export const resetUserPreferences = (storage: Pick<Storage, 'getItem' | 'setItem'>) =>
  writeUserPreferences(storage, defaultUserPreferences);

/**
 * Reads the visual theme while retaining compatibility with existing callers.
 *
 * @param storage Browser local storage containing visual preferences.
 * @returns Persisted theme, defaulting to the operating-system preference.
 */
export const readThemePreference = (
  storage: Pick<Storage, 'getItem' | 'removeItem' | 'setItem'>,
): ThemePreference => readUserPreferences(storage).theme;

/**
 * Persists a theme change without discarding other user preferences.
 *
 * @param storage Browser local storage receiving visual preferences.
 * @param theme Current light, dark, or operating-system theme choice.
 * @returns True when browser storage changed, otherwise false.
 */
export const writeThemePreference = (
  storage: Pick<Storage, 'getItem' | 'removeItem' | 'setItem'>,
  theme: ThemePreference,
) => writeUserPreferences(storage, { ...readUserPreferences(storage), theme });
