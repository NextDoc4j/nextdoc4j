export const workspaceStores = [
  'workspaces',
  'operationStates',
  'debugDrafts',
  'metadata',
] as const;
export type WorkspaceStore = (typeof workspaceStores)[number];
let connection: Promise<IDBDatabase> | undefined;

/**
 * Opens user-owned persistence separately from disposable OpenAPI resource caches.
 * @param factory Browser IndexedDB implementation.
 * @returns Open database; rejects on unavailable or blocked storage without deleting data.
 */
export const openWorkspaceDatabase = (
  factory: IDBFactory = globalThis.indexedDB,
): Promise<IDBDatabase> => {
  if (connection) return connection;
  connection = new Promise((resolve, reject) => {
    if (!factory) {
      reject(new Error('浏览器不支持持久化存储'));
      return;
    }
    const request = factory.open('nextdoc4j-workspace', 1);
    request.onupgradeneeded = () => {
      for (const name of workspaceStores) {
        const keyPath =
          name === 'metadata'
            ? ['appId', 'name']
            : name === 'workspaces'
              ? ['appId', 'serviceKey']
              : ['appId', 'serviceKey', 'method', 'path'];
        const store = request.result.createObjectStore(name, { keyPath });
        store.createIndex('appId', 'appId');
        if (name !== 'metadata') store.createIndex('scope', ['appId', 'serviceKey']);
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => {
        db.close();
        connection = undefined;
      };
      resolve(db);
    };
    request.onerror = () => {
      connection = undefined;
      reject(request.error);
    };
    request.onblocked = () => {
      connection = undefined;
      reject(new Error('存储升级被旧窗口阻塞，请关闭旧页面后重试'));
    };
  });
  const opening = connection;
  void opening.catch(() => {
    if (connection === opening) connection = undefined;
  });
  return opening;
};

/**
 * Executes database requests while resolving only after the entire transaction commits.
 * @param stores Object stores participating in the transaction.
 * @param mode Read or write access.
 * @param action Synchronous transaction setup; asynchronous requests must remain in IDB callbacks.
 * @returns The result assigned by the action after commit.
 */
export const workspaceTransaction = async <T>(
  stores: WorkspaceStore[],
  mode: IDBTransactionMode,
  action: (transaction: IDBTransaction, result: (value: T) => void) => void,
): Promise<T> => {
  const db = await openWorkspaceDatabase();
  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(stores, mode);
    let value: T;
    transaction.oncomplete = () => resolve(value);
    transaction.onabort = () => reject(transaction.error || new Error('持久化事务已中止'));
    transaction.onerror = () => reject(transaction.error || new Error('持久化事务失败'));
    try {
      action(transaction, (next) => {
        value = next;
      });
    } catch (error) {
      transaction.abort();
      reject(error);
    }
  });
};

/**
 * Reads one persisted record without changing its lifecycle or contents.
 * @param store Target table.
 * @param key Composite record identity.
 * @returns Stored record, or undefined when absent.
 */
export const readWorkspaceRecord = <T>(store: WorkspaceStore, key: string[]) =>
  workspaceTransaction<T | undefined>([store], 'readonly', (tx, result) => {
    const request = tx.objectStore(store).get(key);
    request.onsuccess = () => result(request.result as T | undefined);
  });
