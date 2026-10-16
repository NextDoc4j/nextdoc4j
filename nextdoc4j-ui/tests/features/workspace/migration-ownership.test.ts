// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { migrateApplicationSettings } from '../../../src/features/workspace/storage/migration';
import { workspaceTransaction } from '../../../src/features/workspace/storage/database';
import { getApplicationId } from '../../../src/features/workspace/storage/identity';
import { createStoredEnvelope } from '../../../src/lib/storage/envelope';

/** Provides independent destination storage so ownership assertions do not reuse source values.
 * @param None; creates an empty in-memory settings destination.
 * @returns A Storage-compatible settings view.
 */
const destination = (): Storage => {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    key: (i) => [...values.keys()][i] ?? null,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
    removeItem: (key) => {
      values.delete(key);
    },
    clear: () => values.clear(),
  };
};
beforeEach(async () => {
  localStorage.clear();
  await workspaceTransaction<void>(['metadata'], 'readwrite', (tx, done) => {
    tx.objectStore('metadata').delete(['legacy-owner', 'application']);
    done(undefined);
  });
});
afterEach(() => {
  delete window.__NEXTDOC4J_CONFIG__;
  history.replaceState(null, '', '/');
});

describe('legacy ownership on backend context paths', () => {
  it('accepts boolean ownership without requiring an explicit storage namespace', async () => {
    history.replaceState(null, '', '/my-app/doc.html');
    window.__NEXTDOC4J_CONFIG__ = { legacyStorageOwner: true };
    const raw = JSON.stringify(createStoredEnvelope({ headers: [], queryParams: [] }, 1));
    localStorage.setItem('nextdoc4j:workspace:defaults', raw);
    const target = destination();
    await migrateApplicationSettings(target, destination(), getApplicationId());
    expect(target.getItem('nextdoc4j:workspace:defaults')).toBe(raw);
    localStorage.setItem('nextdoc4j:workspace:defaults', raw);
    history.replaceState(null, '', '/another-app/doc.html');
    const other = destination();
    await migrateApplicationSettings(other, destination(), getApplicationId());
    expect(other.length).toBe(0);
    expect(localStorage.getItem('nextdoc4j:workspace:defaults')).toBe(raw);
  });
  it.each([false, 'another-owner'])(
    'respects an explicit mismatched or disabled root declaration: %s',
    async (owner) => {
      history.replaceState(null, '', '/doc.html');
      window.__NEXTDOC4J_CONFIG__ = { legacyStorageOwner: owner };
      const raw = JSON.stringify(createStoredEnvelope({ headers: [], queryParams: [] }, 1));
      localStorage.setItem('nextdoc4j:workspace:defaults', raw);
      const target = destination();
      await migrateApplicationSettings(target, destination(), 'root-app');
      expect(target.length).toBe(0);
      expect(localStorage.getItem('nextdoc4j:workspace:defaults')).toBe(raw);
    },
  );

  it('requires explicit ownership outside the root and never steals another owner', async () => {
    history.replaceState(null, '', '/my-app/doc.html');
    const raw = JSON.stringify(createStoredEnvelope({ headers: [], queryParams: [] }, 1));
    localStorage.setItem('nextdoc4j:workspace:defaults', raw);
    const target = destination();
    window.__NEXTDOC4J_CONFIG__ = { storageNamespace: 'backend-a' };
    await migrateApplicationSettings(target, destination(), 'backend-a');
    expect(target.length).toBe(0);
    expect(localStorage.getItem('nextdoc4j:workspace:defaults')).toBe(raw);
    window.__NEXTDOC4J_CONFIG__.legacyStorageOwner = 'backend-a';
    await migrateApplicationSettings(target, destination(), 'backend-a');
    expect(target.getItem('nextdoc4j:workspace:defaults')).toBe(raw);
    expect(localStorage.getItem('nextdoc4j:workspace:defaults')).toBeNull();
    localStorage.setItem('nextdoc4j:workspace:defaults', raw);
    window.__NEXTDOC4J_CONFIG__ = {
      storageNamespace: 'backend-b',
      legacyStorageOwner: 'backend-b',
    };
    const other = destination();
    await migrateApplicationSettings(other, destination(), 'backend-b');
    expect(other.length).toBe(0);
    expect(localStorage.getItem('nextdoc4j:workspace:defaults')).toBe(raw);
  });
});
