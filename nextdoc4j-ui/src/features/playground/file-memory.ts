import type { ApiOperation, Schema } from '../../types/openapi';
import type { DebugFileField } from './types';
import type { PrePostPhaseConfig } from './pre-post-types';
import { resolveRequestSchema } from '../documentation/request-schema';
import { getRequestSchema } from './request-defaults';
import { getSchemaType } from '../openapi/schema';
import { isFileSchema } from './form-parameters';
import { resolveBodyKind } from './request';
export interface PlaygroundFileMemory {
  binaryFile?: File;
  formFileContentTypes: Record<string, string>;
  formFileEnabled: Record<string, boolean>;
  formFiles: DebugFileField[];
}

export interface PlaygroundFileRecord {
  appId?: string;
  serviceKey?: string;
  storageScope: string;
  method: string;
  path: string;
  data: PlaygroundFileMemory;
}

export const fileMemoryCache = new Map<string, PlaygroundFileRecord>();
export const prePostMemoryCache = new Map<
  string,
  {
    postResponseConfig: PrePostPhaseConfig;
    preRequestConfig: PrePostPhaseConfig;
    appId?: string;
    serviceKey?: string;
    storageScope?: string;
    method: string;
    path: string;
  }
>();

export interface ClearPlaygroundFileCacheOptions {
  appId?: string;
  serviceKey?: string;
  storageScope?: string;
  method?: string;
  path?: string;
}

/**
 * Clears in-memory file and workflow caches matching a workspace, service, or operation.
 * @param options Optional scope filter; omit to clear all cached files.
 * @returns Nothing; removes matching files and workflow configurations.
 */
export function clearPlaygroundFileCache(options?: ClearPlaygroundFileCacheOptions): void {
  if (!options) {
    fileMemoryCache.clear();
    prePostMemoryCache.clear();
    return;
  }
  for (const [key, record] of fileMemoryCache.entries()) {
    if (options.appId && record.appId !== options.appId) continue;
    if (options.serviceKey && record.serviceKey !== options.serviceKey) continue;
    if (options.storageScope && record.storageScope !== options.storageScope) continue;
    if (options.method && record.method !== options.method.toLowerCase()) continue;
    if (options.path && record.path !== options.path) continue;
    fileMemoryCache.delete(key);
  }
  for (const [key, record] of prePostMemoryCache.entries()) {
    if (options.appId && record.appId !== options.appId) continue;
    if (options.serviceKey && record.serviceKey !== options.serviceKey) continue;
    if (options.storageScope && record.storageScope !== options.storageScope) continue;
    if (options.method && record.method !== options.method.toLowerCase()) continue;
    if (options.path && record.path !== options.path) continue;
    prePostMemoryCache.delete(key);
  }
}

/**
 * Parses the scopeToken passed to Playground to extract appId and serviceKey.
 * @param storageScope Encoded scope token or raw scope identifier.
 * @returns Parsed workspace scope object containing optional appId and serviceKey.
 */
export function parseFileCacheScope(storageScope?: string): {
  appId?: string;
  serviceKey?: string;
} {
  if (!storageScope) return {};
  try {
    const parsed = JSON.parse(storageScope);
    if (Array.isArray(parsed) && parsed.length >= 2) {
      return { appId: String(parsed[0]), serviceKey: String(parsed[1]) };
    }
  } catch {
    // fallback
  }
  return { appId: storageScope };
}

/**
 * Filters cached in-memory files against the latest OpenAPI operation definition:
 * - Drops file fields no longer in the request schema
 * - Truncates multi-file lists to a single file if the schema was updated to single-file
 * - Clears binary file if the operation body does not support binary
 * @param cached Raw in-memory file record previously cached for this operation.
 * @param operation Active OpenAPI operation definition.
 * @param schemas Component schema registry from the document.
 * @param contentType Optional active request MIME type.
 * @returns Sanitized and validated in-memory file state matching current schema rules.
 */
export function validateAndFilterFiles(
  cached: PlaygroundFileMemory | undefined,
  operation: ApiOperation,
  schemas: Record<string, Schema>,
  contentType?: string,
): PlaygroundFileMemory {
  if (!cached) {
    return {
      binaryFile: undefined,
      formFileContentTypes: {},
      formFileEnabled: {},
      formFiles: [],
    };
  }

  const content = operation.requestBody?.content;
  const multipartType =
    (contentType?.startsWith('multipart/') ? contentType : undefined) ??
    Object.keys(content ?? {}).find((type) => type.startsWith('multipart/'));

  const fileFieldMap = new Map<string, { multiple: boolean }>();
  if (multipartType || content) {
    const targetType = multipartType ?? Object.keys(content ?? {})[0] ?? 'multipart/form-data';
    const formSchema = getRequestSchema(operation, schemas, targetType);
    const properties = formSchema.properties ?? {};

    for (const [name, raw] of Object.entries(properties)) {
      if (isFileSchema(raw, schemas)) {
        const resolved = resolveRequestSchema(raw, schemas);
        const multiple = getSchemaType(resolved) === 'array';
        fileFieldMap.set(name, { multiple });
      }
    }
  }

  const nextFormFiles: DebugFileField[] = [];
  const seenSingleFields = new Set<string>();

  for (const item of cached.formFiles ?? []) {
    const meta = fileFieldMap.get(item.name);
    if (!meta) continue;
    if (!meta.multiple) {
      if (seenSingleFields.has(item.name)) continue;
      seenSingleFields.add(item.name);
    }
    nextFormFiles.push(item);
  }

  const nextContentTypes: Record<string, string> = {};
  for (const [key, val] of Object.entries(cached.formFileContentTypes ?? {})) {
    if (fileFieldMap.has(key)) {
      nextContentTypes[key] = val;
    }
  }

  const nextEnabled: Record<string, boolean> = {};
  for (const [key, val] of Object.entries(cached.formFileEnabled ?? {})) {
    if (fileFieldMap.has(key)) {
      nextEnabled[key] = val;
    }
  }

  let nextBinaryFile: File | undefined = cached.binaryFile;
  if (nextBinaryFile) {
    const hasRequestBody = Boolean(operation.requestBody);
    const contentTypes = Object.keys(content ?? {});
    const supportsBinary =
      contentTypes.length === 0
        ? hasRequestBody
        : contentTypes.some((type) => resolveBodyKind(type) === 'binary' || type === '*/*');
    if (!supportsBinary) {
      nextBinaryFile = undefined;
    }
  }

  return {
    binaryFile: nextBinaryFile,
    formFileContentTypes: nextContentTypes,
    formFileEnabled: nextEnabled,
    formFiles: nextFormFiles,
  };
}
