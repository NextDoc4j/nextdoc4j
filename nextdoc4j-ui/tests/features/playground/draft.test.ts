import { describe, expect, it } from 'vitest';

import {
  clearDebugDrafts,
  createDebugDraftKey,
  createDebugDraftPrefix,
  readDebugDraft,
  sanitizeDebugDraft,
  writeDebugDraft,
} from '../../../src/features/playground/draft';

const createStorage = () => {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    key: (index: number) => [...values.keys()][index] ?? null,
    get length() {
      return values.size;
    },
    removeItem: (key: string) => values.delete(key),
    setItem: (key: string, value: string) => values.set(key, value),
  };
};

describe('debug draft cache', () => {
  it('scopes draft storage by service, operation and content type', () => {
    const shared = { method: 'POST', path: '/files', requestPrefix: '/users' };

    expect(createDebugDraftKey({ ...shared, contentType: 'application/json' })).not.toBe(
      createDebugDraftKey({ ...shared, contentType: 'multipart/form-data' }),
    );
    expect(createDebugDraftKey({ ...shared, contentType: 'application/json' })).not.toBe(
      createDebugDraftKey({ ...shared, contentType: 'application/json', requestPrefix: '/system' }),
    );
  });

  it('does not retain sensitive headers and restores valid non-sensitive draft values', () => {
    const storage = createStorage();
    const storageKey = 'draft';
    writeDebugDraft(storage, storageKey, {
      body: '{"name":"Echo"}',
      formFields: [{ enabled: true, name: 'note', value: 'hello' }],
      headers: [
        { enabled: true, name: 'Authorization', value: 'secret' },
        { enabled: true, name: 'X-Trace-Id', value: 'trace-1' },
      ],
      pathParams: [{ enabled: true, name: 'id', value: '1' }],
      queryParams: [{ enabled: true, name: 'page', value: '2' }],
      urlEncodedFields: [],
    });

    expect(readDebugDraft(storage, storageKey)).toEqual({
      body: '{"name":"Echo"}',
      formFields: [{ enabled: true, name: 'note', value: 'hello' }],
      headers: [{ enabled: true, name: 'X-Trace-Id', value: 'trace-1' }],
      pathParams: [{ enabled: true, name: 'id', value: '1' }],
      queryParams: [{ enabled: true, name: 'page', value: '2' }],
      urlEncodedFields: [],
    });
  });

  it('rejects malformed drafts and sanitizes data received from external storage', () => {
    const storage = createStorage();
    storage.setItem('malformed', '{not json');

    expect(readDebugDraft(storage, 'malformed')).toBeUndefined();
    expect(
      sanitizeDebugDraft({
        body: '',
        formFields: [],
        headers: [{ enabled: true, name: 'Cookie', value: 'secret' }],
        pathParams: [],
        queryParams: [],
        urlEncodedFields: [],
      }).headers,
    ).toEqual([]);
  });

  it('clears only drafts scoped to the selected service prefix', () => {
    const storage = createStorage();
    const usersKey = createDebugDraftKey({
      contentType: 'application/json',
      method: 'get',
      path: '/users',
      requestPrefix: '/users',
    });
    const systemKey = createDebugDraftKey({
      contentType: 'application/json',
      method: 'get',
      path: '/users',
      requestPrefix: '/system',
    });
    storage.setItem(usersKey, '{}');
    storage.setItem(systemKey, '{}');

    expect(createDebugDraftPrefix('/users')).toContain(encodeURIComponent('/users'));
    expect(clearDebugDrafts(storage, '/users')).toBe(1);
    expect(storage.getItem(usersKey)).toBeNull();
    expect(storage.getItem(systemKey)).toBe('{}');
  });

  it('does not silently evict user drafts after one hundred interfaces', () => {
    const storage = createStorage();
    for (let index = 0; index < 101; index += 1) {
      writeDebugDraft(
        storage,
        createDebugDraftKey({
          contentType: 'application/json',
          method: 'get',
          path: `/users/${index}`,
          requestPrefix: '/users',
        }),
        {
          body: String(index),
          formFields: [],
          headers: [],
          pathParams: [],
          queryParams: [],
          urlEncodedFields: [],
        },
      );
    }

    expect(storage.length).toBe(101);
  });
});
