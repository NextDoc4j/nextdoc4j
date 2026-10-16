import type { ServiceDefinition } from '../../../types/openapi';

export type OpenApiResourceKind = 'gateway' | 'group' | 'service' | 'swagger-config';

export interface OpenApiCacheEntry<T = unknown> {
  data: T;
  etag?: string;
  fetchedAt: number;
  fingerprint: string;
  key: string;
  kind: OpenApiResourceKind;
  lastModified?: string;
  parserVersion: string;
  schemaVersion: number;
  url: string;
}

export interface WorkspaceGroupDocumentReference {
  id: string;
  name: string;
  url: string;
}

export interface OpenApiWorkspaceManifest {
  activeService?: ServiceDefinition;
  gatewayConfigUrl?: string;
  gatewayDocumentUrl: string;
  groupDocuments: WorkspaceGroupDocumentReference[];
  mainDocumentUrl: string;
  parserVersion: string;
  schemaVersion: number;
  scope: string;
  services: ServiceDefinition[];
  updatedAt: number;
}

export interface OpenApiCacheStore {
  deleteDocumentsFetchedBefore: (timestamp: number) => Promise<void>;
  getDocument: <T>(key: string) => Promise<OpenApiCacheEntry<T> | undefined>;
  getManifest: (scope: string) => Promise<OpenApiWorkspaceManifest | undefined>;
  putDocument: <T>(entry: OpenApiCacheEntry<T>) => Promise<void>;
  putManifest: (manifest: OpenApiWorkspaceManifest) => Promise<void>;
}

const databaseName = 'nextdoc4j-cache';
const databaseVersion = 1;
const documentsStoreName = 'documents';
const manifestsStoreName = 'workspaceManifests';

/**
 * Converts an IndexedDB request callback into a Promise result.
 *
 * @param request IndexedDB request to observe.
 * @returns Promise resolved with the request result or rejected with its error.
 */
const resolveRequest = <T>(request: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB 请求失败'));
  });

/**
 * Waits until one IndexedDB transaction commits or aborts.
 *
 * @param transaction IndexedDB transaction to observe.
 * @returns Promise resolved after commit or rejected after failure.
 */
const completeTransaction = (transaction: IDBTransaction) =>
  new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB 事务失败'));
    transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB 事务已取消'));
  });

/**
 * Opens the versioned OpenAPI cache database and creates missing object stores.
 *
 * @param factory Browser IndexedDB factory.
 * @returns Promise resolved with the opened database.
 */
const openDatabase = (factory: IDBFactory) =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const request = factory.open(databaseName, databaseVersion);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(documentsStoreName)) {
        const documents = database.createObjectStore(documentsStoreName, { keyPath: 'key' });
        documents.createIndex('fetchedAt', 'fetchedAt');
      }
      if (!database.objectStoreNames.contains(manifestsStoreName)) {
        database.createObjectStore(manifestsStoreName, { keyPath: 'scope' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('无法打开 OpenAPI 缓存'));
  });

/**
 * Creates an asynchronous IndexedDB store for OpenAPI resources and workspace manifests.
 *
 * @param factory Browser IndexedDB factory, omitted when the API is unavailable.
 * @returns Cache-store operations that reject when IndexedDB cannot be used.
 */
export const createIndexedDbOpenApiCacheStore = (
  factory: IDBFactory | undefined = globalThis.indexedDB,
): OpenApiCacheStore => {
  let databaseTask: Promise<IDBDatabase> | undefined;

  /**
   * Resolves the shared database connection for all cache operations.
   *
   * @returns Promise resolved with the available database connection.
   */
  const getDatabase = () => {
    if (!factory) return Promise.reject(new Error('当前浏览器不支持 IndexedDB'));
    databaseTask ??= openDatabase(factory);
    return databaseTask;
  };

  return {
    deleteDocumentsFetchedBefore: async (timestamp) => {
      const database = await getDatabase();
      const transaction = database.transaction(documentsStoreName, 'readwrite');
      const index = transaction.objectStore(documentsStoreName).index('fetchedAt');
      const request = index.openKeyCursor(IDBKeyRange.upperBound(timestamp, true));
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) return;
        transaction.objectStore(documentsStoreName).delete(cursor.primaryKey);
        cursor.continue();
      };
      await completeTransaction(transaction);
    },
    getDocument: async <T>(key: string) => {
      const database = await getDatabase();
      const transaction = database.transaction(documentsStoreName, 'readonly');
      return (await resolveRequest(transaction.objectStore(documentsStoreName).get(key))) as
        OpenApiCacheEntry<T> | undefined;
    },
    getManifest: async (scope) => {
      const database = await getDatabase();
      const transaction = database.transaction(manifestsStoreName, 'readonly');
      return (await resolveRequest(transaction.objectStore(manifestsStoreName).get(scope))) as
        OpenApiWorkspaceManifest | undefined;
    },
    putDocument: async (entry) => {
      const database = await getDatabase();
      const transaction = database.transaction(documentsStoreName, 'readwrite');
      transaction.objectStore(documentsStoreName).put(entry);
      await completeTransaction(transaction);
    },
    putManifest: async (manifest) => {
      const database = await getDatabase();
      const transaction = database.transaction(manifestsStoreName, 'readwrite');
      transaction.objectStore(manifestsStoreName).put(manifest);
      await completeTransaction(transaction);
    },
  };
};

/**
 * Creates a deterministic in-memory implementation for tests and storage fallbacks.
 *
 * @returns Cache-store operations backed by local Maps.
 */
export const createMemoryOpenApiCacheStore = (): OpenApiCacheStore => {
  const documents = new Map<string, OpenApiCacheEntry>();
  const manifests = new Map<string, OpenApiWorkspaceManifest>();
  return {
    deleteDocumentsFetchedBefore: async (timestamp) => {
      documents.forEach((entry, key) => {
        if (entry.fetchedAt < timestamp) documents.delete(key);
      });
    },
    getDocument: async <T>(key: string) => documents.get(key) as OpenApiCacheEntry<T> | undefined,
    getManifest: async (scope) => manifests.get(scope),
    putDocument: async (entry) => {
      documents.set(entry.key, entry);
    },
    putManifest: async (manifest) => {
      manifests.set(manifest.scope, manifest);
    },
  };
};
