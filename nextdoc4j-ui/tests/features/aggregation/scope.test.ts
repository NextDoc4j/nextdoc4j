import { describe, expect, it } from 'vitest';

import {
  createScopedStorageKey,
  createServiceScope,
} from '../../../src/features/aggregation/scope';

describe('aggregation service scopes', () => {
  it('uses a single-app scope until a service document URL is selected', () => {
    expect(createServiceScope()).toBe('single-app');
    expect(createScopedStorageKey('nextdoc4j:auth')).toBe('nextdoc4j:auth:single-app');
  });

  it('isolates storage keys for paths that contain separators and query values', () => {
    const usersKey = createScopedStorageKey(
      'nextdoc4j:auth',
      '/gateway/users/v3/api-docs?group=admin',
    );
    const systemKey = createScopedStorageKey(
      'nextdoc4j:auth',
      '/gateway/system/v3/api-docs?group=admin',
    );

    expect(usersKey).not.toBe(systemKey);
    expect(usersKey).toContain('%2Fgateway%2Fusers%2Fv3%2Fapi-docs%3Fgroup%3Dadmin');
  });
});
