import { describe, expect, it } from 'vitest';

import {
  mergeGlobalParameters,
  readRestoredWorkspaceHash,
  readStoredBoolean,
  readStoredParameters,
  readStoredSidebarWidth,
  readStoredThemePreference,
} from '../../../src/features/workspace/browser-preferences';

const createStorage = (values: Record<string, string> = {}) => ({
  getItem: (key: string) => values[key] ?? null,
});

describe('workspace browser preferences', () => {
  it('restores only valid global parameter rows and preserves service overrides', () => {
    const storage = createStorage({
      parameters: JSON.stringify([
        { id: 'tenant', name: 'X-Tenant', value: 'global' },
        { id: 'invalid', name: 'X-Invalid' },
      ]),
    });
    const globalItems = readStoredParameters(storage, 'parameters');

    expect(globalItems).toEqual([{ id: 'tenant', name: 'X-Tenant', value: 'global' }]);
    expect(
      mergeGlobalParameters(globalItems, [
        { id: 'service-tenant', name: 'x-tenant', value: 'service' },
      ]),
    ).toEqual([{ id: 'service-tenant', name: 'x-tenant', value: 'service' }]);
  });

  it('falls back safely for browser settings and restores supported values', () => {
    const storage = createStorage({ enabled: 'false', sidebar: '500', theme: 'dark' });

    expect(readStoredBoolean(storage, 'enabled', true)).toBe(false);
    expect(readStoredBoolean(storage, 'missing', true)).toBe(true);
    expect(readStoredThemePreference(storage, 'theme')).toBe('dark');
    expect(readStoredSidebarWidth(storage, 'sidebar', 220, 360, 256)).toBe(360);
    expect(readStoredSidebarWidth(storage, 'missing', 220, 360, 256)).toBe(256);
  });

  it('uses a document overview route when no valid workspace route was persisted', () => {
    expect(readRestoredWorkspaceHash(createStorage())).toBe('#/home');
    expect(
      readRestoredWorkspaceHash(
        createStorage({
          'nextdoc4j:last-workspace-route:single-app': '#/docs/schemas',
        }),
      ),
    ).toBe('#/docs/schemas');
  });
});
