import { describe, expect, it, vi } from 'vitest';

import {
  patchWorkspaceScopeSettings,
  readWorkspaceDefaultSettings,
  readWorkspaceScopeSettings,
} from '../../../src/features/workspace/storage/settings';
import {
  readThemePreference,
  writeThemePreference,
} from '../../../src/features/preferences/storage';

const createStorage = () => {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    removeItem: vi.fn((key: string) => values.delete(key)),
    setItem: vi.fn((key: string, value: string) => values.set(key, value)),
  };
};

describe('versioned browser settings', () => {
  it('migrates theme and service-scoped document settings without changing parameter rules', () => {
    const storage = createStorage();
    const headers = [{ enabled: true, id: 'trace', name: 'X-Trace-Id', value: '1' }];
    storage.setItem('nextdoc4j:dark-mode:single-app', 'dark');
    storage.setItem('nextdoc4j:global-headers:single-app', JSON.stringify(headers));
    storage.setItem('nextdoc4j:global-query-params:single-app', '[]');
    storage.setItem('nextdoc4j:debug-cache-enabled:single-app', 'false');
    storage.setItem('nextdoc4j:group-overview-enabled:single-app', 'true');

    expect(readThemePreference(storage)).toBe('dark');
    expect(readWorkspaceDefaultSettings(storage).headers).toEqual(headers);
    expect(readWorkspaceScopeSettings(storage)).toMatchObject({
      debugDraftEnabled: false,
      groupOverviewEnabled: true,
      headers,
      queryParams: [],
    });
    expect(storage.getItem('nextdoc4j:dark-mode:single-app')).toBeNull();
  });

  it('patches one field and skips writes when persisted data is unchanged', () => {
    const storage = createStorage();
    readWorkspaceScopeSettings(storage, '/users/v3/api-docs');
    const calls = storage.setItem.mock.calls.length;

    patchWorkspaceScopeSettings(storage, '/users/v3/api-docs', {
      groupOverviewEnabled: true,
    });
    expect(storage.setItem).toHaveBeenCalledTimes(calls);

    patchWorkspaceScopeSettings(storage, '/users/v3/api-docs', {
      groupOverviewEnabled: false,
    });
    expect(readWorkspaceScopeSettings(storage, '/users/v3/api-docs').groupOverviewEnabled).toBe(
      false,
    );
  });

  it('does not rewrite an unchanged theme preference', () => {
    const storage = createStorage();
    writeThemePreference(storage, 'system');
    writeThemePreference(storage, 'system');
    expect(storage.setItem).toHaveBeenCalledTimes(1);
  });
});
