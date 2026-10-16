import { describe, expect, it } from 'vitest';

import {
  moveWorkspaceTab,
  orderWorkspaceTabs,
  readWorkspaceTabs,
} from '../../../src/features/workspace/tabs';

const createStorage = (value?: unknown) => ({
  getItem: () => (value === undefined ? null : JSON.stringify(value)),
});

describe('workspace tabs', () => {
  it('keeps fixed tabs before ordinary tabs without changing either group order', () => {
    const tabs = [
      { closable: true, id: 'first', label: 'First', route: '#/docs' },
      { closable: true, id: 'pinned', label: 'Pinned', pinned: true, route: '#/models' },
      { closable: true, id: 'second', label: 'Second', route: '#/export' },
    ];

    expect(orderWorkspaceTabs(tabs).map((tab) => tab.id)).toEqual(['pinned', 'first', 'second']);
  });

  it('moves tabs only within the same fixed-state group', () => {
    const tabs = [
      { closable: true, id: 'pinned', label: 'Pinned', pinned: true, route: '#/docs' },
      { closable: true, id: 'first', label: 'First', route: '#/models' },
      { closable: true, id: 'second', label: 'Second', route: '#/export' },
    ];

    expect(moveWorkspaceTab(tabs, 'second', 'first', 'before').map((tab) => tab.id)).toEqual([
      'pinned',
      'second',
      'first',
    ]);
    expect(moveWorkspaceTab(tabs, 'first', 'pinned', 'after')).toBe(tabs);
  });

  it('restores only valid, unique non-settings tabs', () => {
    const tabs = readWorkspaceTabs(
      createStorage([
        { closable: true, id: 'home', label: 'Home', route: '#/docs' },
        { closable: true, id: 'home', label: 'Duplicate', route: '#/models' },
        { closable: true, id: 'settings', label: 'Settings', route: '#/settings' },
        { closable: true, id: 'invalid', label: 'Invalid', route: 'https://example.com' },
      ]),
    );

    expect(tabs).toEqual([{ closable: true, id: 'home', label: 'Home', route: '#/docs' }]);
  });
});
