import {
  readPersistentDebugSession,
  writePersistentDebugSession,
  clearPersistentDebugOperation,
} from '../workspace/storage/operation-cache';
import { readStoredEnvelope, writeStoredEnvelope } from '../../lib/storage/envelope';
import { createDebugDraftKey } from './draft';
import { createId } from '../../lib/id';
import type { ParameterOverrides } from './parameter-overrides';
import type { PrePostPhaseConfig } from './pre-post-types';

export interface DebugSessionCache {
  credentialEpoch?: string;
  overrides: ParameterOverrides;
  pathOverride?: string;
  postResponseConfig?: PrePostPhaseConfig;
  preRequestConfig?: PrePostPhaseConfig;
}

/**
 * Creates an operation-wide cache key independent of the selected request media type.
 * @param input Service, method and path identifying the current interface.
 * @returns A key in the existing draft namespace so scoped clearing includes session overrides.
 */
export function createDebugSessionKey(input: {
  requestPrefix?: string;
  method: string;
  path: string;
}): string {
  return createDebugDraftKey({ ...input, contentType: '__session__' });
}

/**
 * Validates persisted override data before it affects request construction.
 * @param value Unknown cache payload.
 * @returns Whether the payload contains only supported override fields and valid primitive types.
 */
function isSessionCache(value: unknown): value is DebugSessionCache {
  if (!value || typeof value !== 'object') return false;
  // Legacy authenticationEnabled is intentionally ignored; per-row overrides remain valid.
  const data = value as DebugSessionCache;
  return (
    (data.credentialEpoch === undefined || typeof data.credentialEpoch === 'string') &&
    (data.pathOverride === undefined || typeof data.pathOverride === 'string') &&
    (data.preRequestConfig === undefined ||
      (typeof data.preRequestConfig === 'object' && data.preRequestConfig !== null)) &&
    (data.postResponseConfig === undefined ||
      (typeof data.postResponseConfig === 'object' && data.postResponseConfig !== null)) &&
    Boolean(
      data.overrides && typeof data.overrides === 'object' && !Array.isArray(data.overrides),
    ) &&
    Object.entries(data.overrides).every(
      ([key, patch]) =>
        /^(header|query|cookie):.+/u.test(key) &&
        patch &&
        typeof patch === 'object' &&
        !Array.isArray(patch) &&
        Object.keys(patch).every((field) => field === 'value' || field === 'enabled') &&
        (patch.value === undefined || typeof patch.value === 'string') &&
        (patch.enabled === undefined || typeof patch.enabled === 'boolean'),
    )
  );
}

/**
 * Determines whether an override value belongs only in current-tab storage.
 * @param key Parameter location and normalized name.
 * @param authenticationTargets Authentication fields declared by the active document.
 * @returns True for cookies, known credential headers and declared authentication fields.
 */
function isCredential(key: string, authenticationTargets: Set<string>): boolean {
  return (
    authenticationTargets.has(key) ||
    key.startsWith('cookie:') ||
    [
      'header:authorization',
      'header:proxy-authorization',
      'header:cookie',
      'header:x-api-key',
    ].includes(key)
  );
}

/**
 * Restores operation overrides and merges current-tab credential values over persistent states.
 * @param key Current operation session key.
 * @param targets Declared authentication fields used to reject persistent credential values.
 * @returns Validated saved state or default inheritance when storage is absent/unavailable.
 */
export function readDebugSession(key: string, targets: Set<string>): DebugSessionCache {
  const result: DebugSessionCache = { overrides: {} };
  try {
    const local = readPersistentDebugSession(key);
    const session = readStoredEnvelope(sessionStorage, key, {
      schemaVersion: 1,
      validate: isSessionCache,
    });
    if (local) {
      result.pathOverride = local.pathOverride;
      result.preRequestConfig = local.preRequestConfig;
      result.postResponseConfig = local.postResponseConfig;
      for (const [name, patch] of Object.entries(local.overrides)) {
        if (!isCredential(name, targets)) result.overrides[name] = patch;
        else if (patch.enabled !== undefined) result.overrides[name] = { enabled: patch.enabled };
      }
    }
    if (session) {
      if (session.preRequestConfig) result.preRequestConfig = session.preRequestConfig;
      if (session.postResponseConfig) result.postResponseConfig = session.postResponseConfig;
    }
    if (session && local && session.credentialEpoch === local.credentialEpoch)
      for (const [name, patch] of Object.entries(session.overrides)) {
        if (isCredential(name, targets))
          result.overrides[name] = { ...result.overrides[name], ...patch };
      }
  } catch {
    /* Disabled storage must not prevent debugging. */
  }
  return result;
}

/**
 * Omits default empty workflows while retaining disabled steps and saved scripts.
 * @param config Current phase configuration, if present.
 * @returns The configuration when it contains user content, otherwise undefined.
 */
function storedPhaseConfig(config?: PrePostPhaseConfig): PrePostPhaseConfig | undefined {
  return config && config.steps.length > 0 ? config : undefined;
}

/**
 * Saves ordinary overrides persistently and credential values in current-tab storage only.
 * @param key Current operation session key.
 * @param data Session state, with inheritance represented by absent entries.
 * @param targets Declared authentication fields.
 * @returns Nothing; failures leave the current in-memory request usable.
 */
export function writeDebugSession(
  key: string,
  data: DebugSessionCache,
  targets: Set<string>,
): void {
  const persistent: ParameterOverrides = {},
    temporary: ParameterOverrides = {};
  for (const [name, patch] of Object.entries(data.overrides)) {
    if (!isCredential(name, targets)) persistent[name] = patch;
    else {
      if (patch.enabled !== undefined) persistent[name] = { enabled: patch.enabled };
      if (patch.value !== undefined) temporary[name] = { value: patch.value };
    }
  }
  const preRequestConfig = storedPhaseConfig(data.preRequestConfig);
  const postResponseConfig = storedPhaseConfig(data.postResponseConfig);
  try {
    const previous = readPersistentDebugSession(key);
    const credentialEpoch = Object.keys(temporary).length
      ? (previous?.credentialEpoch ?? createId())
      : undefined;
    if (
      Object.keys(persistent).length ||
      Object.keys(temporary).length ||
      data.pathOverride !== undefined ||
      preRequestConfig !== undefined ||
      postResponseConfig !== undefined
    )
      writePersistentDebugSession(key, {
        ...data,
        preRequestConfig,
        postResponseConfig,
        credentialEpoch,
        overrides: persistent,
      });
    else writePersistentDebugSession(key, { overrides: {} });
    if (
      Object.keys(temporary).length ||
      preRequestConfig !== undefined ||
      postResponseConfig !== undefined
    )
      writeStoredEnvelope(
        sessionStorage,
        key,
        {
          credentialEpoch,
          overrides: temporary,
          postResponseConfig,
          preRequestConfig,
        },
        1,
      );
    else sessionStorage.removeItem(key);
  } catch {
    /* Storage remains optional. */
  }
}

/**
 * Clears every media draft and both override stores for one interface.
 * @param key Operation-wide session key in the shared draft namespace.
 * @returns Nothing; other interfaces and global settings remain untouched.
 */
export async function clearDebugOperation(key: string): Promise<void> {
  await clearPersistentDebugOperation(key);
  sessionStorage.removeItem(key);
}
