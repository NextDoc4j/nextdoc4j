import { describe, expect, it } from 'vitest';

import {
  readWorkspaceScroll,
  writeWorkspaceScroll,
} from '../../../src/features/aggregation/workspace-scroll';

const createStorage = () => {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  };
};

describe('service workspace scroll state', () => {
  it('isolates positions by service and canonical route', () => {
    const storage = createStorage();
    const hash = '#/docs?group=users&operation=list';

    expect(writeWorkspaceScroll(storage, hash, 128.4, '/users/v3/api-docs')).toBe(true);
    expect(writeWorkspaceScroll(storage, hash, 64, '/system/v3/api-docs')).toBe(true);
    expect(readWorkspaceScroll(storage, hash, '/users/v3/api-docs')).toBe(128);
    expect(readWorkspaceScroll(storage, hash, '/system/v3/api-docs')).toBe(64);
    expect(readWorkspaceScroll(storage, hash)).toBe(0);
  });

  it('rejects unrelated anchors and clamps negative positions', () => {
    const storage = createStorage();

    expect(writeWorkspaceScroll(storage, '#section', 20)).toBe(false);
    expect(writeWorkspaceScroll(storage, '#/models', -1)).toBe(true);
    expect(readWorkspaceScroll(storage, '#/models')).toBe(0);
  });
});
