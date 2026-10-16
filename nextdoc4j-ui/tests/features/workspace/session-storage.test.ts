import { describe, expect, it } from 'vitest';
import { createStoredEnvelope } from '../../../src/lib/storage/envelope';

import {
  readSessionActiveServiceUrl,
  readSessionSidebar,
  readSessionWorkspaceHash,
  readSessionWorkspaceScroll,
  readSessionWorkspaceTabs,
  sidebarDefaultWidth,
  sidebarMinWidth,
  sidebarMaxWidth,
  writeSessionSidebar,
  writeSessionActiveServiceUrl,
  writeSessionWorkspaceScroll,
} from '../../../src/features/workspace/storage/session';

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

describe('workspace session storage', () => {
  it.each([null, '', '   ', 'invalid'])(
    'uses the shared default for missing or invalid width %s',
    (storedWidth) => {
      const sessionStorage = createStorage();
      const localStorage = createStorage();
      if (storedWidth !== null) localStorage.setItem('nextdoc4j:sidebar-width', storedWidth);
      // Other session reads can initialize sidebar state before the sidebar mounts.
      readSessionActiveServiceUrl(sessionStorage, localStorage);
      expect(
        readSessionSidebar(
          sessionStorage,
          localStorage,
          sidebarMinWidth,
          sidebarMaxWidth,
          sidebarDefaultWidth,
        ),
      ).toEqual({
        collapsed: false,
        width: sidebarDefaultWidth,
      });
    },
  );

  it('starts at 300px independently of the resize limits', () => {
    const sidebar = readSessionSidebar(
      createStorage(),
      createStorage(),
      sidebarMinWidth,
      sidebarMaxWidth,
      sidebarDefaultWidth,
    );
    expect(sidebar.width).toBe(300);
    expect(sidebar.width).toBeGreaterThan(sidebarMinWidth);
    expect(sidebar.width).toBeLessThan(sidebarMaxWidth);
  });

  it('migrates the previous default from local storage before another session read initializes it', () => {
    const sessionStorage = createStorage();
    const localStorage = createStorage();
    localStorage.setItem('nextdoc4j:sidebar-width', '560');
    readSessionActiveServiceUrl(sessionStorage, localStorage);
    expect(
      readSessionSidebar(
        sessionStorage,
        localStorage,
        sidebarMinWidth,
        sidebarMaxWidth,
        sidebarDefaultWidth,
      ).width,
    ).toBe(300);
    expect(localStorage.getItem('nextdoc4j:sidebar-width')).toBeNull();
  });

  it.each([320, 480, 560])(
    'migrates only the former session default and preserves custom width %s',
    (width) => {
      const sessionStorage = createStorage();
      const localStorage = createStorage();
      const state = {
        activeServiceUrl: '/users/v3/api-docs',
        routesByScope: { 'single-app': '#/docs/schemas' },
        scrollByRoute: {},
        sidebar: { collapsed: true, width },
        tabsByScope: {
          'single-app': [{ closable: true, id: 'home', label: '首页', route: '#/home' }],
        },
      };
      sessionStorage.setItem(
        'nextdoc4j:session:ui',
        JSON.stringify(createStoredEnvelope(state, 1)),
      );
      expect(
        readSessionSidebar(
          sessionStorage,
          localStorage,
          sidebarMinWidth,
          sidebarMaxWidth,
          sidebarDefaultWidth,
        ),
      ).toEqual({ collapsed: true, width: width === 560 ? 300 : width });
      expect(readSessionActiveServiceUrl(sessionStorage, localStorage)).toBe(
        state.activeServiceUrl,
      );
      expect(readSessionWorkspaceHash(sessionStorage, localStorage)).toBe('#/docs/schemas');
      expect(readSessionWorkspaceTabs(sessionStorage, localStorage)).toEqual(
        state.tabsByScope['single-app'],
      );
      expect(
        JSON.parse(sessionStorage.getItem('nextdoc4j:session:ui')!).data.sidebar.defaultWidth,
      ).toBe(300);

      writeSessionSidebar(sessionStorage, localStorage, { collapsed: false, width: 560 });
      expect(
        readSessionSidebar(
          sessionStorage,
          localStorage,
          sidebarMinWidth,
          sidebarMaxWidth,
          sidebarDefaultWidth,
        ),
      ).toEqual({ collapsed: false, width: 560 });
    },
  );

  it('restores the updated default when a readable old session cannot be rewritten', () => {
    const sessionStorage = createStorage();
    sessionStorage.setItem(
      'nextdoc4j:session:ui',
      JSON.stringify(
        createStoredEnvelope(
          {
            routesByScope: {},
            scrollByRoute: {},
            tabsByScope: {},
            sidebar: { collapsed: false, width: 560 },
          },
          1,
        ),
      ),
    );
    const blocked = {
      ...sessionStorage,
      setItem: () => {
        throw new Error('storage denied');
      },
    };
    expect(
      readSessionSidebar(
        blocked,
        createStorage(),
        sidebarMinWidth,
        sidebarMaxWidth,
        sidebarDefaultWidth,
      ).width,
    ).toBe(300);
  });

  it('migrates active service, sidebar, route, tabs and scroll into the session record', () => {
    const sessionStorage = createStorage();
    const localStorage = createStorage();
    localStorage.setItem('nextdoc4j:active-service', '/users/v3/api-docs');
    localStorage.setItem('nextdoc4j:sidebar-collapsed', 'true');
    localStorage.setItem('nextdoc4j:sidebar-width', '320');
    localStorage.setItem('nextdoc4j:last-workspace-route:single-app', '#/docs/schemas');
    localStorage.setItem(
      'nextdoc4j:workspace-tabs:single-app',
      JSON.stringify([{ closable: true, id: 'home', label: '首页', route: '#/home' }]),
    );
    sessionStorage.setItem('nextdoc4j:workspace-scroll:single-app:%23%2Fdocs%2Fschemas', '128');

    expect(readSessionActiveServiceUrl(sessionStorage, localStorage)).toBe('/users/v3/api-docs');
    expect(readSessionSidebar(sessionStorage, localStorage, 220, 360, 256)).toEqual({
      collapsed: true,
      width: 320,
    });
    expect(readSessionWorkspaceHash(sessionStorage, localStorage)).toBe('#/docs/schemas');
    expect(readSessionWorkspaceTabs(sessionStorage, localStorage)).toEqual([
      { closable: true, id: 'home', label: '首页', route: '#/home' },
    ]);
    expect(readSessionWorkspaceScroll(sessionStorage, localStorage, '#/docs/schemas')).toBe(128);
    expect(localStorage.getItem('nextdoc4j:active-service')).toBeNull();
  });

  it('stores and restores a bounded non-negative route position', () => {
    const sessionStorage = createStorage();
    const localStorage = createStorage();

    expect(writeSessionWorkspaceScroll(sessionStorage, localStorage, '#/docs', 42.8)).toBe(true);
    expect(readSessionWorkspaceScroll(sessionStorage, localStorage, '#/docs')).toBe(43);
  });

  it('clears a previous aggregation service when the workspace becomes a single application', () => {
    const sessionStorage = createStorage();
    const localStorage = createStorage();

    expect(writeSessionActiveServiceUrl(sessionStorage, localStorage, '/users/v3/api-docs')).toBe(
      true,
    );
    expect(readSessionActiveServiceUrl(sessionStorage, localStorage)).toBe('/users/v3/api-docs');

    expect(writeSessionActiveServiceUrl(sessionStorage, localStorage)).toBe(true);
    expect(readSessionActiveServiceUrl(sessionStorage, localStorage)).toBeUndefined();
  });
});
