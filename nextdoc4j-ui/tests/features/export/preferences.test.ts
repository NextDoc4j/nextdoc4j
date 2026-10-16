import { describe, expect, it } from 'vitest';

import {
  parseExportPreferences,
  readExportPreferences,
  writeExportPreferences,
} from '../../../src/features/export/preferences';

const createStorage = () => {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    removeItem: (key: string) => values.delete(key),
    setItem: (key: string, value: string) => values.set(key, value),
  };
};

describe('export preferences', () => {
  it('persists source-aware tag and operation selections', () => {
    const storage = createStorage();
    writeExportPreferences(storage, undefined, {
      aggregationOperationKeys: ['users:get:/users'],
      aggregationScope: 'fine',
      selection: { kind: 'tags', tags: ['用户', '管理员'] },
      serviceUrls: ['/users/v3/api-docs'],
      sourceId: 'user:all',
    });

    expect(readExportPreferences(storage)).toEqual({
      aggregationOperationKeys: ['users:get:/users'],
      aggregationScope: 'fine',
      selection: { kind: 'tags', tags: ['用户', '管理员'] },
      serviceUrls: ['/users/v3/api-docs'],
      sourceId: 'user:all',
    });
    expect(
      parseExportPreferences(
        JSON.stringify({
          selection: { kind: 'operations', operationKeys: ['all:get:/users'] },
          sourceId: 'user:all',
        }),
      ),
    ).toEqual({
      aggregationOperationKeys: [],
      aggregationScope: 'all',
      selection: { kind: 'operations', operationKeys: ['all:get:/users'] },
      serviceUrls: [],
      sourceId: 'user:all',
    });
  });

  it('rejects malformed stored selections', () => {
    expect(parseExportPreferences('{invalid')).toBeUndefined();
    expect(
      parseExportPreferences(JSON.stringify({ selection: { kind: 'tags', tags: [1] } })),
    ).toBeUndefined();
    expect(
      parseExportPreferences(JSON.stringify({ selection: { kind: 'unknown' }, sourceId: 'all' })),
    ).toBeUndefined();
  });
});
