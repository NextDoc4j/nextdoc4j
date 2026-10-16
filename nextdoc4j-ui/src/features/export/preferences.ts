import { readStoredEnvelope, writeStoredEnvelope } from '../../lib/storage/envelope';
import { createServiceScope } from '../aggregation/scope';
import type { ExportSelection } from './openapi-subset';

export type AggregationExportScope = 'all' | 'fine' | 'services';

export interface ExportPreferences {
  aggregationOperationKeys: string[];
  aggregationScope: AggregationExportScope;
  selection: ExportSelection;
  serviceUrls: string[];
  sourceId: string;
}

const exportStoragePrefix = 'nextdoc4j:export';
const legacyExportStoragePrefix = 'nextdoc4j:export-preferences';
const exportSchemaVersion = 1;

/**
 * Validates a list whose persisted members must all be strings.
 *
 * @param value Unknown list from browser storage.
 * @returns True when every list member is a string.
 */
const isStringList = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

/**
 * Parses the source and single-document range shared by legacy and current export settings.
 *
 * @param value Unknown export preference data.
 * @returns Valid source and range, or undefined when the shape is unsupported.
 */
const parseExportRange = (
  value: unknown,
): Pick<ExportPreferences, 'selection' | 'sourceId'> | undefined => {
  if (!value || typeof value !== 'object') return undefined;
  const parsed = value as Partial<ExportPreferences>;
  if (typeof parsed.sourceId !== 'string' || !parsed.selection) return undefined;
  const selection = parsed.selection as Partial<ExportSelection>;
  if (selection.kind === 'all') return { selection: { kind: 'all' }, sourceId: parsed.sourceId };
  if (selection.kind === 'groups' && isStringList(selection.sourceIds)) {
    return {
      selection: { kind: 'groups', sourceIds: selection.sourceIds },
      sourceId: parsed.sourceId,
    };
  }
  if (selection.kind === 'tags' && isStringList(selection.tags)) {
    return { selection: { kind: 'tags', tags: selection.tags }, sourceId: parsed.sourceId };
  }
  if (selection.kind === 'operations' && isStringList(selection.operationKeys)) {
    return {
      selection: { kind: 'operations', operationKeys: selection.operationKeys },
      sourceId: parsed.sourceId,
    };
  }
  return undefined;
};

/**
 * Validates a complete current export preference record.
 *
 * @param value Unknown data from a storage envelope.
 * @returns True when single-document and aggregation selections are valid.
 */
const isExportPreferences = (value: unknown): value is ExportPreferences => {
  if (!value || typeof value !== 'object' || !parseExportRange(value)) return false;
  const preferences = value as Partial<ExportPreferences>;
  return (
    (preferences.aggregationScope === 'all' ||
      preferences.aggregationScope === 'fine' ||
      preferences.aggregationScope === 'services') &&
    isStringList(preferences.aggregationOperationKeys) &&
    isStringList(preferences.serviceUrls)
  );
};

/**
 * Creates a complete export record from a supported previous range-only value.
 *
 * @param value Unknown legacy value from browser storage.
 * @returns Current export preferences, or undefined for malformed legacy data.
 */
const migrateLegacyPreferences = (value: unknown): ExportPreferences | undefined => {
  const range = parseExportRange(value);
  if (!range) return undefined;
  return {
    ...range,
    aggregationOperationKeys: [],
    aggregationScope: 'all',
    serviceUrls: [],
  };
};

/**
 * Creates the current export selection key for one document scope.
 *
 * @param serviceDocumentUrl Selected service OpenAPI URL, omitted for single-app mode.
 * @returns Version-independent export preference key.
 */
export const createExportStorageKey = (serviceDocumentUrl?: string) =>
  `${exportStoragePrefix}:${createServiceScope(serviceDocumentUrl)}`;

/**
 * Parses one current or legacy serialized export preference value.
 *
 * @param value Serialized browser-storage value.
 * @returns Valid complete preferences, or undefined for malformed values.
 */
export const parseExportPreferences = (value: null | string): ExportPreferences | undefined => {
  if (!value) return undefined;
  try {
    const parsed = JSON.parse(value) as unknown;
    if (isExportPreferences(parsed)) return parsed;
    return migrateLegacyPreferences(parsed);
  } catch {
    return undefined;
  }
};

/**
 * Reads a saved export selection and lazily migrates the previous scoped key.
 *
 * @param storage Browser local storage containing export settings.
 * @param serviceDocumentUrl Selected service OpenAPI URL, omitted for single-app mode.
 * @returns Persisted complete selection, or undefined when no valid selection exists.
 */
export const readExportPreferences = (
  storage: Pick<Storage, 'getItem' | 'removeItem' | 'setItem'>,
  serviceDocumentUrl?: string,
) => {
  const storageKey = createExportStorageKey(serviceDocumentUrl);
  const stored = readStoredEnvelope(storage, storageKey, {
    schemaVersion: exportSchemaVersion,
    validate: isExportPreferences,
  });
  if (stored) return stored;

  const legacyKey = `${legacyExportStoragePrefix}:${createServiceScope(serviceDocumentUrl)}`;
  const legacy = parseExportPreferences(storage.getItem(legacyKey));
  if (!legacy) return undefined;
  if (writeStoredEnvelope(storage, storageKey, legacy, exportSchemaVersion)) {
    storage.removeItem(legacyKey);
  }
  return legacy;
};

/**
 * Persists the current single-document and aggregation download ranges.
 *
 * @param storage Browser local storage receiving export settings.
 * @param serviceDocumentUrl Selected service OpenAPI URL, omitted for single-app mode.
 * @param preferences Current complete export selection.
 * @returns True when storage changed, otherwise false.
 */
export const writeExportPreferences = (
  storage: Pick<Storage, 'getItem' | 'setItem'>,
  serviceDocumentUrl: string | undefined,
  preferences: ExportPreferences,
) =>
  writeStoredEnvelope(
    storage,
    createExportStorageKey(serviceDocumentUrl),
    preferences,
    exportSchemaVersion,
  );
