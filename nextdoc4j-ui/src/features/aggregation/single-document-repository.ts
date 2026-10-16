import type { OpenApiDocument, SwaggerConfig } from '../../types/openapi';
import type { OpenApiResourceKind } from './cache/database';

import { createDocumentCache } from './document-cache';
import {
  mergeServiceDocuments,
  type ServiceGroupDocument,
  type ServiceGroupDocumentError,
  type ServiceWorkspaceDocument,
} from './service-document-repository';

export interface SingleDocumentRepository {
  clear: () => void;
  getDocument: (
    url: string,
    signal?: AbortSignal,
    kind?: OpenApiResourceKind,
  ) => Promise<OpenApiDocument>;
  getSwaggerConfig: (url: string, signal?: AbortSignal) => Promise<SwaggerConfig>;
  invalidate: (url?: string) => void;
  loadWorkspace: (
    mainDocument: OpenApiDocument,
    swaggerConfig?: SwaggerConfig,
    signal?: AbortSignal,
  ) => Promise<ServiceWorkspaceDocument>;
}

interface CreateSingleRepositoryOptions {
  invalidateMemory?: (url?: string) => void;
  fetchDocument: (
    url: string,
    signal?: AbortSignal,
    kind?: OpenApiResourceKind,
  ) => Promise<OpenApiDocument>;
  fetchSwaggerConfig: (
    url: string,
    signal?: AbortSignal,
    kind?: OpenApiResourceKind,
  ) => Promise<SwaggerConfig>;
}

/**
 * Gets a URL's final path segment without letting malformed percent escapes stop document loading.
 *
 * @param url Swagger Config document URL.
 * @returns Decoded final path segment, or its raw value when it contains invalid encoding.
 */
const getLastPathSegment = (url: string) => {
  const segment = url.split('?')[0]?.replace(/\/+$/, '').split('/').at(-1) || 'default';
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
};

const isAllDocumentUrl = (url: string) => getLastPathSegment(url).toLowerCase() === 'all';

/**
 * Creates a cache-backed document repository for a non-aggregation SpringDoc application.
 *
 * @param options Fetch functions supplied by the browser application or tests.
 * @returns Repository for a main document, its Swagger Config and direct group documents.
 */
export const createSingleDocumentRepository = (
  options: CreateSingleRepositoryOptions,
): SingleDocumentRepository => {
  const documentCache = createDocumentCache<OpenApiDocument>();
  const configCache = createDocumentCache<SwaggerConfig>();

  const getDocument = (url: string, signal?: AbortSignal, kind: OpenApiResourceKind = 'gateway') =>
    documentCache.get(url, () => options.fetchDocument(url, signal, kind));

  const getSwaggerConfig = (url: string, signal?: AbortSignal) =>
    configCache.get(url, () => options.fetchSwaggerConfig(url, signal, 'swagger-config'));

  const loadWorkspace = async (
    mainDocument: OpenApiDocument,
    swaggerConfig?: SwaggerConfig,
    signal?: AbortSignal,
  ): Promise<ServiceWorkspaceDocument> => {
    const seenUrls = new Set<string>();
    const groups = (swaggerConfig?.urls ?? []).filter((group) => {
      const url = group.url.trim();
      if (!url || group.disabled || isAllDocumentUrl(url) || seenUrls.has(url)) return false;
      seenUrls.add(url);
      return true;
    });
    const results = await Promise.all(
      groups.map(async (group) => {
        const url = group.url.trim();
        try {
          const document = await getDocument(url, signal, 'group');
          return {
            kind: 'success' as const,
            value: {
              document,
              id: `single-app:${url}`,
              name: group.name || getLastPathSegment(url),
              url,
            },
          };
        } catch (error) {
          return {
            kind: 'error' as const,
            value: {
              name: group.name || getLastPathSegment(url),
              reason: error instanceof Error ? error.message : '分组文档不可用',
              url,
            },
          };
        }
      }),
    );
    const groupDocuments: ServiceGroupDocument[] = results.flatMap((result) =>
      result.kind === 'success' ? [result.value] : [],
    );
    const errors: ServiceGroupDocumentError[] = results.flatMap((result) =>
      result.kind === 'error' ? [result.value] : [],
    );

    return {
      document: mergeServiceDocuments(mainDocument, groupDocuments),
      errors,
      groupDocuments,
      mainDocument,
    };
  };

  return {
    clear: () => {
      options.invalidateMemory?.();
      documentCache.clear();
      configCache.clear();
    },
    getDocument,
    getSwaggerConfig,
    invalidate: (url?: string) => {
      options.invalidateMemory?.(url);
      if (!url) {
        documentCache.clear();
        configCache.clear();
        return;
      }
      documentCache.invalidate(url);
    },
    loadWorkspace,
  };
};
