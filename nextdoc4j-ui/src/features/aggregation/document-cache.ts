export interface DocumentCache<T> {
  clear: () => void;
  get: (key: string, loader: () => Promise<T>) => Promise<T>;
  has: (key: string) => boolean;
  invalidate: (key: string) => void;
}

/**
 * Creates a bounded LRU cache while deduplicating in-flight loads independently of eviction.
 * @template T Cached document value type.
 * @param capacity Maximum retained resolved entries; defaults to 32, zero disables retention.
 * @returns Cache operations; eviction releases only cache ownership, never active view references.
 */
export const createDocumentCache = <T>(capacity = 32): DocumentCache<T> => {
  const limit = Number.isFinite(capacity) ? Math.max(0, Math.floor(capacity)) : 32;
  const values = new Map<string, T>();
  const pending = new Map<string, Promise<T>>();

  /** Loads or touches one entry, allowing only the current request to populate its cache key.
   * @param key Resource identity.
   * @param loader Loader invoked once for concurrent requests to this key.
   * @returns Cached value or the shared load promise, retaining failure propagation.
   */
  const get = (key: string, loader: () => Promise<T>): Promise<T> => {
    if (values.has(key)) {
      const cached = values.get(key)!;
      values.delete(key);
      values.set(key, cached);
      return Promise.resolve(cached);
    }
    const existing = pending.get(key);
    if (existing) return existing;
    let loaded: Promise<T>;
    try {
      loaded = loader();
    } catch (error) {
      return Promise.reject(error);
    }
    const task = loaded
      .then((value) => {
        if (pending.get(key) === task && limit > 0) {
          values.set(key, value);
          while (values.size > limit) values.delete(values.keys().next().value!);
        }
        return value;
      })
      .finally(() => {
        if (pending.get(key) === task) pending.delete(key);
      });
    pending.set(key, task);
    return task;
  };

  return {
    clear: () => {
      values.clear();
      pending.clear();
    },
    get,
    has: (key) => values.has(key),
    invalidate: (key) => {
      values.delete(key);
      pending.delete(key);
    },
  };
};
