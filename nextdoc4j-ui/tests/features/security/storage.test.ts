import { describe, expect, it } from 'vitest';

import {
  parseAuthPreferences,
  readAuthPreferences,
  readScopedAuthPreferences,
  writeAuthPreferences,
  writeScopedAuthPreferences,
} from '../../../src/features/security/storage';

const createStorage = () => {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    removeItem: (key: string) => values.delete(key),
    setItem: (key: string, value: string) => values.set(key, value),
  };
};

describe('authentication preference storage', () => {
  it('returns empty values for missing or malformed storage', () => {
    expect(parseAuthPreferences(null)).toEqual({ remember: false, values: {} });
    expect(parseAuthPreferences('{invalid')).toEqual({ remember: false, values: {} });
    expect(parseAuthPreferences('{"values":{"bearer":"token","invalid":42}}')).toEqual({
      remember: false,
      values: { bearer: 'token' },
    });
  });

  it('uses session values first and persists to local storage only after explicit opt-in', () => {
    const sessionStorage = createStorage();
    const localStorage = createStorage();
    localStorage.setItem('auth', JSON.stringify({ remember: true, values: { bearer: 'old' } }));
    sessionStorage.setItem('auth', JSON.stringify({ remember: false, values: { bearer: 'new' } }));

    expect(readAuthPreferences(sessionStorage, localStorage, 'auth')).toEqual({
      remember: false,
      values: { bearer: 'new' },
    });

    writeAuthPreferences(
      { remember: false, values: { bearer: 'session-only' } },
      sessionStorage,
      localStorage,
      'auth',
    );
    expect(localStorage.getItem('auth')).toBeNull();
    expect(readAuthPreferences(sessionStorage, localStorage, 'auth').values.bearer).toBe(
      'session-only',
    );

    writeAuthPreferences(
      { remember: true, values: { bearer: 'remembered' } },
      sessionStorage,
      localStorage,
      'auth',
    );
    expect(readAuthPreferences(localStorage, sessionStorage, 'auth').values.bearer).toBe(
      'remembered',
    );
  });

  it('keeps scoped credentials in session storage unless remember is enabled', () => {
    const sessionStorage = createStorage();
    const localStorage = createStorage();

    writeScopedAuthPreferences(
      { remember: false, values: { bearer: 'session-only' } },
      sessionStorage,
      localStorage,
      '/users/v3/api-docs',
    );
    expect(readScopedAuthPreferences(sessionStorage, localStorage, '/users/v3/api-docs')).toEqual({
      remember: false,
      values: { bearer: 'session-only' },
    });

    writeScopedAuthPreferences(
      { remember: true, values: { bearer: 'remembered' } },
      sessionStorage,
      localStorage,
      '/users/v3/api-docs',
    );
    const newSession = createStorage();
    expect(readScopedAuthPreferences(newSession, localStorage, '/users/v3/api-docs')).toEqual({
      remember: true,
      values: { bearer: 'remembered' },
    });

    writeScopedAuthPreferences(
      { remember: false, values: { bearer: 'new-session' } },
      newSession,
      localStorage,
      '/users/v3/api-docs',
    );
    expect(readScopedAuthPreferences(createStorage(), localStorage, '/users/v3/api-docs')).toEqual({
      remember: false,
      values: {},
    });
  });
});
