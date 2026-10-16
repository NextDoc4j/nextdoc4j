import { readStoredEnvelope, writeStoredEnvelope } from '../../../lib/storage/envelope';
import { createServiceScope, createScopedStorageKey } from '../../aggregation/scope';
import { normalizeWorkspaceHash, readWorkspaceHash } from '../../aggregation/workspace-route';
import { readWorkspaceScroll } from '../../aggregation/workspace-scroll';
import {
  isWorkspaceTab,
  orderWorkspaceTabs,
  readWorkspaceTabs,
  workspaceTabsStorageBaseKey,
  type WorkspaceTab,
} from '../tabs';

interface SidebarSessionState {
  collapsed: boolean;
  width: number;
}

interface SessionUiState {
  activeServiceUrl?: string;
  routesByScope: Record<string, string>;
  scrollByRoute: Record<string, number>;
  sidebar: SidebarSessionState & { defaultWidth?: number };
  tabsByScope: Record<string, WorkspaceTab[]>;
}

const sessionUiStorageKey = 'nextdoc4j:session:ui';
const sessionUiSchemaVersion = 1;
const legacyActiveServiceStorageKey = 'nextdoc4j:active-service';
const legacySidebarCollapsedStorageKey = 'nextdoc4j:sidebar-collapsed';
const legacySidebarWidthStorageKey = 'nextdoc4j:sidebar-width';
const legacyWorkspaceRouteStorageKey = 'nextdoc4j:last-workspace-route';
const legacyWorkspaceScrollStorageKey = 'nextdoc4j:workspace-scroll';

export const sidebarDefaultWidth = 300;
export const sidebarMinWidth = 220;
export const sidebarMaxWidth = 560;
const previousSidebarDefaultWidth = 560;

const defaultSessionUiState: SessionUiState = {
  routesByScope: {},
  scrollByRoute: {},
  sidebar: { collapsed: false, width: sidebarDefaultWidth, defaultWidth: sidebarDefaultWidth },
  tabsByScope: {},
};

/**
 * Validates a string-only record used for service-scoped routes.
 *
 * @param value Unknown route record from browser storage.
 * @returns True when every record value is a string.
 */
const isStringRecord = (value: unknown): value is Record<string, string> =>
  Boolean(
    value &&
    typeof value === 'object' &&
    Object.values(value).every((item) => typeof item === 'string'),
  );

/**
 * Validates a finite-number record used for route scroll positions.
 *
 * @param value Unknown scroll record from browser storage.
 * @returns True when every position is a finite non-negative number.
 */
const isScrollRecord = (value: unknown): value is Record<string, number> =>
  Boolean(
    value &&
    typeof value === 'object' &&
    Object.values(value).every(
      (item) => typeof item === 'number' && Number.isFinite(item) && item >= 0,
    ),
  );

/**
 * Validates service-scoped lists of restorable workspace tabs.
 *
 * @param value Unknown tabs record from browser storage.
 * @returns True when every scope contains valid workspace tabs.
 */
const isTabsRecord = (value: unknown): value is Record<string, WorkspaceTab[]> =>
  Boolean(
    value &&
    typeof value === 'object' &&
    Object.values(value).every(
      (tabs) => Array.isArray(tabs) && tabs.every((tab) => isWorkspaceTab(tab)),
    ),
  );

/**
 * Validates the complete current-tab UI state record.
 *
 * @param value Unknown data from a session storage envelope.
 * @returns True when every session UI field has a supported shape.
 */
const isSessionUiState = (value: unknown): value is SessionUiState => {
  if (!value || typeof value !== 'object') return false;
  const state = value as Partial<SessionUiState>;
  return (
    (state.activeServiceUrl === undefined || typeof state.activeServiceUrl === 'string') &&
    isStringRecord(state.routesByScope) &&
    isScrollRecord(state.scrollByRoute) &&
    Boolean(
      state.sidebar &&
      typeof state.sidebar.collapsed === 'boolean' &&
      typeof state.sidebar.width === 'number' &&
      Number.isFinite(state.sidebar.width),
    ) &&
    isTabsRecord(state.tabsByScope)
  );
};

/**
 * Constrains one restored sidebar width to the active layout limits.
 *
 * @param value Persisted width candidate.
 * @param minWidth Minimum supported width.
 * @param maxWidth Maximum supported width.
 * @param fallback Width used for invalid values.
 * @returns Rounded width within the supported interval.
 */
const normalizeSidebarWidth = (
  value: unknown,
  minWidth: number,
  maxWidth: number,
  fallback: number,
) => {
  if (value == null || (typeof value === 'string' && !value.trim())) return fallback;
  const width = Number(value);
  if (!Number.isFinite(width)) return fallback;
  return Math.min(maxWidth, Math.max(minWidth, Math.round(width)));
};

/**
 * Creates the map key for one scope and canonical Hash route scroll position.
 *
 * @param hash Fixed application Hash route.
 * @param serviceDocumentUrl Selected service URL, omitted for single-app mode.
 * @returns Stable scroll map key, or undefined for a non-application Hash.
 */
const createSessionScrollKey = (hash: string, serviceDocumentUrl?: string) => {
  const normalizedHash = normalizeWorkspaceHash(hash);
  if (!normalizedHash) return undefined;
  return `${createServiceScope(serviceDocumentUrl)}:${encodeURIComponent(normalizedHash)}`;
};

const migrateSidebarDefault = (state: SessionUiState): SessionUiState => ({
  ...state,
  sidebar: {
    ...state.sidebar,
    // Migrate the old automatic default once; later manually selected maximum widths survive.
    width:
      state.sidebar.width === (state.sidebar.defaultWidth ?? previousSidebarDefaultWidth)
        ? sidebarDefaultWidth
        : state.sidebar.width,
    defaultWidth: sidebarDefaultWidth,
  },
});

/**
 * Reads the session UI state and imports the previous local active-service and sidebar values.
 *
 * @param sessionStorage Browser session storage containing current-tab state.
 * @param localStorage Browser local storage containing previous UI records.
 * @returns Complete current session UI state.
 */
const readSessionUiState = (
  sessionStorage: Pick<Storage, 'getItem' | 'removeItem' | 'setItem'>,
  localStorage: Pick<Storage, 'getItem' | 'removeItem'>,
): SessionUiState => {
  const stored = readStoredEnvelope(sessionStorage, sessionUiStorageKey, {
    schemaVersion: sessionUiSchemaVersion,
    validate: isSessionUiState,
  });
  if (stored) {
    if (stored.sidebar.defaultWidth === sidebarDefaultWidth) return stored;
    const state = migrateSidebarDefault(stored);
    try {
      writeStoredEnvelope(sessionStorage, sessionUiStorageKey, state, sessionUiSchemaVersion);
    } catch {
      // A blocked cache update must not prevent restoring the visible layout.
    }
    return state;
  }

  const activeServiceUrl = localStorage.getItem(legacyActiveServiceStorageKey) || undefined;
  const state = migrateSidebarDefault({
    ...defaultSessionUiState,
    activeServiceUrl,
    sidebar: {
      collapsed: localStorage.getItem(legacySidebarCollapsedStorageKey) === 'true',
      width: normalizeSidebarWidth(
        localStorage.getItem(legacySidebarWidthStorageKey),
        0,
        Number.MAX_SAFE_INTEGER,
        defaultSessionUiState.sidebar.width,
      ),
    },
  });
  const migrated = writeStoredEnvelope(
    sessionStorage,
    sessionUiStorageKey,
    state,
    sessionUiSchemaVersion,
  );
  if (migrated) {
    localStorage.removeItem(legacyActiveServiceStorageKey);
    localStorage.removeItem(legacySidebarCollapsedStorageKey);
    localStorage.removeItem(legacySidebarWidthStorageKey);
  }
  return state;
};

/**
 * Writes the complete current-tab UI state while skipping unchanged records.
 *
 * @param sessionStorage Browser session storage receiving current-tab state.
 * @param state Complete current session UI state.
 * @returns True when storage changed, otherwise false.
 */
const writeSessionUiState = (
  sessionStorage: Pick<Storage, 'getItem' | 'setItem'>,
  state: SessionUiState,
) => writeStoredEnvelope(sessionStorage, sessionUiStorageKey, state, sessionUiSchemaVersion);

/**
 * Reads the active aggregation service from current-tab state.
 *
 * @param sessionStorage Browser session storage containing current-tab state.
 * @param localStorage Browser local storage containing previous UI records.
 * @returns Selected service document URL, or undefined in single-app mode.
 */
export const readSessionActiveServiceUrl = (
  sessionStorage: Pick<Storage, 'getItem' | 'removeItem' | 'setItem'>,
  localStorage: Pick<Storage, 'getItem' | 'removeItem'>,
) =>
  readSessionUiState(sessionStorage, localStorage).activeServiceUrl ||
  localStorage.getItem('nextdoc4j:last-service') ||
  undefined;

/**
 * Persists the active aggregation service in current-tab state.
 *
 * @param sessionStorage Browser session storage receiving current-tab state.
 * @param localStorage Browser local storage used only for legacy migration.
 * @param serviceUrl Selected service OpenAPI document URL, or undefined in single-app mode.
 * @returns True when storage changed, otherwise false.
 */
export const writeSessionActiveServiceUrl = (
  sessionStorage: Pick<Storage, 'getItem' | 'removeItem' | 'setItem'>,
  localStorage: Pick<Storage, 'getItem' | 'removeItem' | 'setItem'>,
  serviceUrl?: string,
) => {
  const state = readSessionUiState(sessionStorage, localStorage);
  const nextState = { ...state };
  if (serviceUrl) {
    nextState.activeServiceUrl = serviceUrl;
    localStorage.setItem('nextdoc4j:last-service', serviceUrl);
  } else {
    delete nextState.activeServiceUrl;
    localStorage.removeItem('nextdoc4j:last-service');
  }
  return writeSessionUiState(sessionStorage, nextState);
};

/**
 * Reads the current-tab sidebar presentation within configured width limits.
 *
 * @param sessionStorage Browser session storage containing current-tab state.
 * @param localStorage Browser local storage containing previous UI records.
 * @param minWidth Minimum supported expanded width.
 * @param maxWidth Maximum supported expanded width.
 * @param defaultWidth Width used when stored state is invalid.
 * @returns Valid collapsed state and bounded width.
 */
export const readSessionSidebar = (
  sessionStorage: Pick<Storage, 'getItem' | 'removeItem' | 'setItem'>,
  localStorage: Pick<Storage, 'getItem' | 'removeItem'>,
  minWidth: number,
  maxWidth: number,
  defaultWidth: number,
): SidebarSessionState => {
  const sidebar = readSessionUiState(sessionStorage, localStorage).sidebar;
  return {
    collapsed: sidebar.collapsed,
    width: normalizeSidebarWidth(sidebar.width, minWidth, maxWidth, defaultWidth),
  };
};

/**
 * Persists current sidebar presentation in current-tab state.
 *
 * @param sessionStorage Browser session storage receiving current-tab state.
 * @param localStorage Browser local storage used only for legacy migration.
 * @param sidebar Current collapsed state and bounded width.
 * @returns True when storage changed, otherwise false.
 */
export const writeSessionSidebar = (
  sessionStorage: Pick<Storage, 'getItem' | 'removeItem' | 'setItem'>,
  localStorage: Pick<Storage, 'getItem' | 'removeItem'>,
  sidebar: SidebarSessionState,
) => {
  const state = readSessionUiState(sessionStorage, localStorage);
  return writeSessionUiState(sessionStorage, {
    ...state,
    sidebar: { ...sidebar, defaultWidth: sidebarDefaultWidth },
  });
};

/**
 * Reads and lazily migrates the last valid route for one document scope.
 *
 * @param sessionStorage Browser session storage containing current-tab state.
 * @param localStorage Browser local storage containing previous scoped routes.
 * @param serviceDocumentUrl Selected service URL, omitted for single-app mode.
 * @returns Canonical Hash route, or undefined when none was saved.
 */
export const readSessionWorkspaceHash = (
  sessionStorage: Pick<Storage, 'getItem' | 'removeItem' | 'setItem'>,
  localStorage: Pick<Storage, 'getItem' | 'removeItem'>,
  serviceDocumentUrl?: string,
) => {
  const state = readSessionUiState(sessionStorage, localStorage);
  const scope = createServiceScope(serviceDocumentUrl);
  const stored = normalizeWorkspaceHash(state.routesByScope[scope] || '');
  if (stored) return stored;
  const legacy = readWorkspaceHash(localStorage, serviceDocumentUrl);
  if (!legacy) return undefined;
  const migrated = writeSessionUiState(sessionStorage, {
    ...state,
    routesByScope: { ...state.routesByScope, [scope]: legacy },
  });
  if (migrated) {
    localStorage.removeItem(
      createScopedStorageKey(legacyWorkspaceRouteStorageKey, serviceDocumentUrl),
    );
  }
  return legacy;
};

/**
 * Stores the current valid route for one document scope.
 *
 * @param sessionStorage Browser session storage receiving current-tab state.
 * @param localStorage Browser local storage used only for legacy migration.
 * @param hash Current application Hash route.
 * @param serviceDocumentUrl Selected service URL, omitted for single-app mode.
 * @returns True when a valid route was stored.
 */
export const writeSessionWorkspaceHash = (
  sessionStorage: Pick<Storage, 'getItem' | 'removeItem' | 'setItem'>,
  localStorage: Pick<Storage, 'getItem' | 'removeItem'>,
  hash: string,
  serviceDocumentUrl?: string,
) => {
  const normalizedHash = normalizeWorkspaceHash(hash);
  if (!normalizedHash) return false;
  const state = readSessionUiState(sessionStorage, localStorage);
  const scope = createServiceScope(serviceDocumentUrl);
  writeSessionUiState(sessionStorage, {
    ...state,
    routesByScope: { ...state.routesByScope, [scope]: normalizedHash },
  });
  return true;
};

/**
 * Reads and lazily migrates workspace tabs for one document scope.
 *
 * @param sessionStorage Browser session storage containing current-tab state.
 * @param localStorage Browser local storage containing previous scoped tabs.
 * @param serviceDocumentUrl Selected service URL, omitted for single-app mode.
 * @returns Valid ordered workspace tabs.
 */
export const readSessionWorkspaceTabs = (
  sessionStorage: Pick<Storage, 'getItem' | 'removeItem' | 'setItem'>,
  localStorage: Pick<Storage, 'getItem' | 'removeItem'>,
  serviceDocumentUrl?: string,
) => {
  const state = readSessionUiState(sessionStorage, localStorage);
  const scope = createServiceScope(serviceDocumentUrl);
  const stored = state.tabsByScope[scope];
  if (stored) return orderWorkspaceTabs(stored);
  const legacy = readWorkspaceTabs(localStorage, serviceDocumentUrl);
  const migrated = writeSessionUiState(sessionStorage, {
    ...state,
    tabsByScope: { ...state.tabsByScope, [scope]: legacy },
  });
  if (migrated) {
    localStorage.removeItem(
      createScopedStorageKey(workspaceTabsStorageBaseKey, serviceDocumentUrl),
    );
  }
  return legacy;
};

/**
 * Stores workspace tabs for one document scope.
 *
 * @param sessionStorage Browser session storage receiving current-tab state.
 * @param localStorage Browser local storage used only for legacy migration.
 * @param tabs Current ordered workspace tabs.
 * @param serviceDocumentUrl Selected service URL, omitted for single-app mode.
 * @returns True when storage changed, otherwise false.
 */
export const writeSessionWorkspaceTabs = (
  sessionStorage: Pick<Storage, 'getItem' | 'removeItem' | 'setItem'>,
  localStorage: Pick<Storage, 'getItem' | 'removeItem'>,
  tabs: WorkspaceTab[],
  serviceDocumentUrl?: string,
) => {
  const state = readSessionUiState(sessionStorage, localStorage);
  const scope = createServiceScope(serviceDocumentUrl);
  return writeSessionUiState(sessionStorage, {
    ...state,
    tabsByScope: { ...state.tabsByScope, [scope]: tabs },
  });
};

/**
 * Reads and lazily migrates one route's current-tab scroll position.
 *
 * @param sessionStorage Browser session storage containing current-tab state.
 * @param localStorage Browser local storage used only for session UI migration.
 * @param hash Current application Hash route.
 * @param serviceDocumentUrl Selected service URL, omitted for single-app mode.
 * @returns Saved non-negative pixel offset, or zero.
 */
export const readSessionWorkspaceScroll = (
  sessionStorage: Pick<Storage, 'getItem' | 'removeItem' | 'setItem'>,
  localStorage: Pick<Storage, 'getItem' | 'removeItem'>,
  hash: string,
  serviceDocumentUrl?: string,
) => {
  const key = createSessionScrollKey(hash, serviceDocumentUrl);
  if (!key) return 0;
  const state = readSessionUiState(sessionStorage, localStorage);
  if (state.scrollByRoute[key] !== undefined) return state.scrollByRoute[key];
  const legacy = readWorkspaceScroll(sessionStorage, hash, serviceDocumentUrl);
  if (legacy <= 0) return 0;
  const migrated = writeSessionUiState(sessionStorage, {
    ...state,
    scrollByRoute: { ...state.scrollByRoute, [key]: legacy },
  });
  if (migrated) {
    sessionStorage.removeItem(
      `${createScopedStorageKey(legacyWorkspaceScrollStorageKey, serviceDocumentUrl)}:${encodeURIComponent(normalizeWorkspaceHash(hash) || '')}`,
    );
  }
  return legacy;
};

/**
 * Stores one route's current-tab scroll position.
 *
 * @param sessionStorage Browser session storage receiving current-tab state.
 * @param localStorage Browser local storage used only for session UI migration.
 * @param hash Current application Hash route.
 * @param scrollTop Non-negative content offset in pixels.
 * @param serviceDocumentUrl Selected service URL, omitted for single-app mode.
 * @returns True when a valid route was stored.
 */
export const writeSessionWorkspaceScroll = (
  sessionStorage: Pick<Storage, 'getItem' | 'removeItem' | 'setItem'>,
  localStorage: Pick<Storage, 'getItem' | 'removeItem'>,
  hash: string,
  scrollTop: number,
  serviceDocumentUrl?: string,
) => {
  const key = createSessionScrollKey(hash, serviceDocumentUrl);
  if (!key) return false;
  const state = readSessionUiState(sessionStorage, localStorage);
  writeSessionUiState(sessionStorage, {
    ...state,
    scrollByRoute: {
      ...state.scrollByRoute,
      [key]: Math.max(0, Math.round(scrollTop)),
    },
  });
  return true;
};
