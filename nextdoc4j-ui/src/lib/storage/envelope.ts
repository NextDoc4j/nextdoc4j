export interface StoredEnvelope<T> {
  appVersion: string;
  data: T;
  schemaVersion: number;
  updatedAt: number;
}

export interface StoredEnvelopeDefinition<T> {
  migrations?: Record<number, (value: unknown) => unknown>;
  schemaVersion: number;
  validate: (value: unknown) => value is T;
}

export const appVersion =
  typeof __APP_VERSION__ === 'string' && __APP_VERSION__ ? __APP_VERSION__ : 'development';

/**
 * Checks whether an unknown value has the common persisted-envelope fields.
 *
 * @param value Unknown value parsed from browser storage.
 * @returns True when the value has a usable envelope shape.
 */
const isStoredEnvelope = (value: unknown): value is StoredEnvelope<unknown> => {
  if (!value || typeof value !== 'object') return false;
  const envelope = value as Partial<StoredEnvelope<unknown>>;
  return (
    typeof envelope.appVersion === 'string' &&
    typeof envelope.schemaVersion === 'number' &&
    Number.isInteger(envelope.schemaVersion) &&
    envelope.schemaVersion >= 0 &&
    typeof envelope.updatedAt === 'number' &&
    Number.isFinite(envelope.updatedAt) &&
    'data' in envelope
  );
};

/**
 * Builds a versioned browser-storage value for one validated business record.
 *
 * @param data Business data to persist.
 * @param schemaVersion Current schema version owned by the business storage module.
 * @param updatedAt Time at which the business data changed.
 * @returns Complete storage envelope containing diagnostic application metadata.
 */
export const createStoredEnvelope = <T>(
  data: T,
  schemaVersion: number,
  updatedAt = Date.now(),
): StoredEnvelope<T> => ({ appVersion, data, schemaVersion, updatedAt });

/**
 * Serializes a business record only when its schema or data differs from the stored value.
 *
 * @param storage Browser storage receiving the record.
 * @param storageKey Stable key for the business record.
 * @param data Validated business data to persist.
 * @param schemaVersion Current schema version owned by the business storage module.
 * @returns True when written; false for unchanged or newer-version data. Storage failures propagate
 * so callers can preserve dependent writes and report or downgrade persistence failures.
 */
export const writeStoredEnvelope = <T>(
  storage: Pick<Storage, 'getItem' | 'setItem'>,
  storageKey: string,
  data: T,
  schemaVersion: number,
) => {
  const current = storage.getItem(storageKey);
  if (current) {
    try {
      const parsed = JSON.parse(current) as unknown;
      if (isStoredEnvelope(parsed)) {
        if (parsed.schemaVersion > schemaVersion) return false;
        if (
          parsed.schemaVersion === schemaVersion &&
          JSON.stringify(parsed.data) === JSON.stringify(data)
        ) {
          return false;
        }
      }
    } catch {
      // Invalid values are replaced by the next valid write.
    }
  }
  storage.setItem(storageKey, JSON.stringify(createStoredEnvelope(data, schemaVersion)));
  return true;
};

/**
 * Reads, validates and when necessary migrates one versioned browser-storage record.
 *
 * @param storage Browser storage containing the record.
 * @param storageKey Stable key for the business record.
 * @param definition Current schema, validator and optional one-step migrations.
 * @returns Valid current-version business data, or undefined when it cannot be used.
 */
export const readStoredEnvelope = <T>(
  storage: Pick<Storage, 'getItem' | 'removeItem' | 'setItem'>,
  storageKey: string,
  definition: StoredEnvelopeDefinition<T>,
): T | undefined => {
  try {
    const serialized = storage.getItem(storageKey);
    if (!serialized) return undefined;
    let parsed: unknown;
    try {
      parsed = JSON.parse(serialized) as unknown;
    } catch {
      storage.removeItem(storageKey);
      return undefined;
    }
    if (!isStoredEnvelope(parsed)) {
      storage.removeItem(storageKey);
      return undefined;
    }
    if (parsed.schemaVersion > definition.schemaVersion) return undefined;

    let migrated = false;
    let version = parsed.schemaVersion;
    let data = parsed.data;
    while (version < definition.schemaVersion) {
      const migrate = definition.migrations?.[version];
      if (!migrate) return undefined;
      data = migrate(data);
      version += 1;
      migrated = true;
    }
    if (!definition.validate(data)) {
      storage.removeItem(storageKey);
      return undefined;
    }
    if (migrated) {
      try {
        writeStoredEnvelope(storage, storageKey, data, definition.schemaVersion);
      } catch {
        // A failed migration write must not discard already validated in-memory data.
      }
    }
    return data;
  } catch {
    // Access restrictions and failed cleanup must not interrupt reading optional preferences.
    return undefined;
  }
};
