import { describe, expect, it } from 'vitest';

import {
  normalizeWorkspaceHash,
  readWorkspaceHash,
  writeWorkspaceHash,
} from '../../../src/features/aggregation/workspace-route';

const createStorage = () => {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  };
};

describe('service workspace route state', () => {
  it('canonicalizes fixed Hash state and rejects unrelated fragments', () => {
    expect(normalizeWorkspaceHash('#/docs/admin/operations/list')).toBe(
      '#/docs/admin/operations/list',
    );
    expect(normalizeWorkspaceHash('#external-anchor')).toBeUndefined();
    expect(normalizeWorkspaceHash('')).toBeUndefined();
  });

  it('keeps single-app and aggregation service routes isolated', () => {
    const storage = createStorage();
    writeWorkspaceHash(storage, '#/docs/schemas');
    writeWorkspaceHash(storage, '#/docs/operations/list', '/users/v3/api-docs');
    writeWorkspaceHash(storage, '#/settings/config', '/system/v3/api-docs');

    expect(readWorkspaceHash(storage)).toBe('#/docs/schemas');
    expect(readWorkspaceHash(storage, '/users/v3/api-docs')).toBe('#/docs/operations/list');
    expect(readWorkspaceHash(storage, '/system/v3/api-docs')).toBe('#/settings/config');
  });
});
