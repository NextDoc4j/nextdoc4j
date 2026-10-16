import { getApplicationId } from './identity';

/**
 * Wraps small browser settings in a backend-application namespace.
 * @param kind Native browser storage area.
 * @returns Storage-compatible view that cannot enumerate or delete other applications' keys.
 */
const createApplicationStorage = (kind: 'localStorage' | 'sessionStorage'): Storage => {
  /** Resolves the physical namespace for this backend deployment.
   * @param None; uses application configuration and the current deployment URL.
   * @returns Prefix shared by small settings in this storage view.
   */
  const prefix = () => `nextdoc4j:app:${encodeURIComponent(getApplicationId())}:`;
  /** Enumerates only keys owned by this application.
   * @param None; reads the selected native storage area.
   * @returns Physical keys within the current application prefix.
   */
  const keys = () => {
    const storage = globalThis[kind];
    return Array.from({ length: storage.length }, (_, i) => storage.key(i)!).filter((key) =>
      key.startsWith(prefix()),
    );
  };
  return {
    get length() {
      return keys().length;
    },
    key(index) {
      const key = keys()[index];
      return key ? key.slice(prefix().length) : null;
    },
    getItem(key) {
      return globalThis[kind].getItem(prefix() + key);
    },
    setItem(key, value) {
      globalThis[kind].setItem(prefix() + key, value);
    },
    removeItem(key) {
      globalThis[kind].removeItem(prefix() + key);
    },
    clear() {
      for (const key of keys()) globalThis[kind].removeItem(key);
    },
  };
};
export const applicationLocalStorage = createApplicationStorage('localStorage');
export const applicationSessionStorage = createApplicationStorage('sessionStorage');
