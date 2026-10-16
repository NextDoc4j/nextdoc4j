import { describe, expect, it, vi } from 'vitest';

import { readStoredEnvelope, writeStoredEnvelope } from '../../../src/lib/storage/envelope';

const createStorage = () => {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    removeItem: vi.fn((key: string) => values.delete(key)),
    setItem: vi.fn((key: string, value: string) => values.set(key, value)),
  };
};

describe('stored envelope', () => {
  it('skips unchanged writes and records changed data', () => {
    const storage = createStorage();

    expect(writeStoredEnvelope(storage, 'settings', { theme: 'dark' }, 1)).toBe(true);
    expect(writeStoredEnvelope(storage, 'settings', { theme: 'dark' }, 1)).toBe(false);
    expect(writeStoredEnvelope(storage, 'settings', { theme: 'light' }, 1)).toBe(true);
    expect(storage.setItem).toHaveBeenCalledTimes(2);
  });

  it('migrates older records and leaves future-version records untouched', () => {
    const storage = createStorage();
    writeStoredEnvelope(storage, 'settings', { dark: true }, 1);
    const value = readStoredEnvelope(storage, 'settings', {
      migrations: { 1: (data) => ({ theme: (data as { dark: boolean }).dark ? 'dark' : 'light' }) },
      schemaVersion: 2,
      validate: (data): data is { theme: string } =>
        Boolean(
          data &&
          typeof data === 'object' &&
          typeof (data as { theme?: unknown }).theme === 'string',
        ),
    });

    expect(value).toEqual({ theme: 'dark' });
    writeStoredEnvelope(storage, 'future', { theme: 'dark' }, 3);
    expect(
      readStoredEnvelope(storage, 'future', {
        schemaVersion: 2,
        validate: (data): data is { theme: string } => Boolean(data),
      }),
    ).toBeUndefined();
    expect(storage.removeItem).not.toHaveBeenCalledWith('future');
    expect(writeStoredEnvelope(storage, 'settings', { theme: 'old-app' }, 1)).toBe(false);
  });
});
