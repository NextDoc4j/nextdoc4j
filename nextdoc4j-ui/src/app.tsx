import { useTabIndicators } from './components/use-tab-indicators';
import { ScrollProgress } from './components/rare-ui/scroll-progress';
import { HttpMethodBadge } from './components/rare-ui/http-method-badge';
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { ContentErrorBoundary } from './components/content-error-boundary';
import { WorkspaceLoading } from './components/workspace-loading';
import { useWorkspaceDocuments } from './features/aggregation/use-workspace-documents';
import type { SearchEntry } from './features/workspace/search-index';
import {
  applicationLocalStorage,
  applicationSessionStorage,
} from './features/workspace/storage/browser-storage';
import {
  getWorkspaceScope,
  operationIdentity,
  scopeForService,
  scopeToken,
  type OperationIdentity,
} from './features/workspace/storage/identity';
import { clearOwnedLegacyDrafts } from './features/workspace/storage/migration';
import {
  clearOperationDrafts,
  countOperationDrafts,
  flushPending,
  getPersistenceFailure,
  isOperationPrepared,
  patchOperationState,
  prepareOperation,
  readOperationState,
  readWorkspace,
  reportPersistenceFailure,
  retainOperation,
  retryPersistence,
  subscribePersistence,
} from './features/workspace/storage/repository';
import { useWorkspaceTabDrag } from './features/workspace/use-workspace-tab-drag';
import { useWorkspaceTabMenu } from './features/workspace/use-workspace-tab-menu';
import { useWorkspaceTabs } from './features/workspace/use-workspace-tabs';
import { useWorkspaceTheme } from './features/workspace/use-workspace-theme';

import {
  IconApi,
  IconAdjustments,
  IconCube,
  IconDownload,
  IconFileText,
  IconShieldLock,
  IconArrowBarLeft,
  IconArrowBarRight,
  IconArrowsLeftRight,
  IconArrowsMaximize,
  IconArrowsMinimize,
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconDeviceDesktop,
  IconExternalLink,
  IconHome2,
  IconMoon,
  IconPin,
  IconPinFilled,
  IconRefresh,
  IconSearch,
  IconSettings,
  IconSun,
  IconX,
} from '@tabler/icons-react';
import { SelectMenu } from './components/select-menu';
import { createIndexedDbOpenApiCacheStore } from './features/aggregation/cache/database';
import { createOpenApiResourceLoader } from './features/aggregation/cache/revalidate';
import {
  createServiceDocumentRepository,
  type ServiceWorkspaceLoadOptions,
} from './features/aggregation/service-document-repository';
import { isAggregationEnabled } from './features/aggregation/service-manager';
import { createSingleDocumentRepository } from './features/aggregation/single-document-repository';
import { resolveServiceDocumentPrefix } from './features/aggregation/url';
import {
  defaultBrandLogo,
  defaultBrandTitle,
  readStoredBrand,
  resolveBrandMetadata,
  writeStoredBrand,
  type BrandMetadata,
} from './features/brand/brand';
import { findMarkdownDocument, groupMarkdownDocuments } from './features/documentation/markdown';
import {
  allOperationsSourceId,
  createDocumentationSources,
  findDocumentationOperation,
  getDocumentationOperationKey,
  getWorkspaceOperationKey,
  getWorkspaceOverviewOperations,
} from './features/documentation/workspace';
import { createOpenApiSubset } from './features/export/openapi-subset';
import type { AggregationExportDocument, AggregationExportResult } from './features/export/types';
import type { ManagementSection } from './features/management/management-page';
import type { GlobalHeader } from './features/playground/types';
import { CopyrightText } from './features/preferences/copyright-text';
import { PreferencesDrawer } from './features/preferences/preferences-drawer';
import {
  defaultUserPreferences,
  readUserPreferences,
  resetUserPreferences,
  writeUserPreferences,
  type UserPreferences,
} from './features/preferences/storage';
import {
  clearPersistedWorkspaces,
  readPersistedWorkspace,
  writePersistedWorkspace,
} from './features/preferences/workspace';
import {
  mergeGatewaySecuritySchemes,
  withSecuritySchemes,
} from './features/security/gateway-security';
import { getRegisteredSecuritySchemes } from './features/security/security';
import {
  readScopedAuthPreferences,
  writeScopedAuthPreferences,
  type AuthPreferences,
} from './features/security/storage';
import { mergeGlobalParameters } from './features/workspace/browser-preferences';
import { Sidebar } from './features/workspace/sidebar';
import {
  readSessionActiveServiceUrl,
  sidebarDefaultWidth,
  sidebarMinWidth,
  sidebarMaxWidth,
  readSessionSidebar,
  readSessionWorkspaceHash,
  readSessionWorkspaceScroll,
  writeSessionSidebar,
  writeSessionWorkspaceHash,
  writeSessionWorkspaceScroll,
} from './features/workspace/storage/session';
import {
  patchWorkspaceScopeSettings,
  readWorkspaceDefaultSettings,
  readWorkspaceScopeSettings,
  writeWorkspaceDefaultSettings,
} from './features/workspace/storage/settings';
import { type WorkspaceTab } from './features/workspace/tabs';
import {
  getDocumentGroupRouteKeys,
  getOperationRoute,
  getRouteKey,
  parseHashRoute,
  parseValidHashRoute,
  createHashRoute as serializeHashRoute,
  type AppView,
  type HashRouteState,
} from './lib/hash-route';
import type {
  ApiOperation,
  OpenApiDocument,
  ServiceDefinition,
  SwaggerConfig,
} from './types/openapi';

const sidebarCollapsedWidth = 72;
const gatewayDocumentUrl = '/v3/api-docs';
const gatewayConfigUrl = '/v3/api-docs/swagger-config';
const headerBrandLogoSize = 28;
const headerBrandLogoExpandedOffset = 8;
const headerBrandLogoCollapsedOffset = (sidebarCollapsedWidth - headerBrandLogoSize) / 2;
const emptyAggregationServices: ServiceDefinition[] = [];
const HomePage = lazy(() =>
  import('./features/home/home-page').then(({ HomePage: Component }) => ({ default: Component })),
);
const MarkdownReader = lazy(() =>
  import('./features/documentation/markdown-reader').then(({ MarkdownReader: Component }) => ({
    default: Component,
  })),
);
const OperationDetail = lazy(() =>
  import('./features/documentation/operation-detail').then(({ OperationDetail: Component }) => ({
    default: Component,
  })),
);
const Overview = lazy(() =>
  import('./features/documentation/overview').then(({ Overview: Component }) => ({
    default: Component,
  })),
);
const ExportPage = lazy(() =>
  import('./features/export/export-page').then(({ ExportPage: Component }) => ({
    default: Component,
  })),
);
const ManagementPage = lazy(() =>
  import('./features/management/management-page').then(({ ManagementPage: Component }) => ({
    default: Component,
  })),
);
const ModelsPage = lazy(() =>
  import('./features/models/models-page').then(({ ModelsPage: Component }) => ({
    default: Component,
  })),
);
const Playground = lazy(() =>
  import('./features/playground/playground').then(({ Playground: Component }) => ({
    default: Component,
  })),
);

const GlobalSearch = lazy(() =>
  import('./features/workspace/global-search').then(({ GlobalSearch }) => ({
    default: GlobalSearch,
  })),
);

/**
 * Loads session-scoped security credentials and optionally remembered credentials.
 *
 * @returns Valid authentication preferences, or a safe empty preference on storage failure.
 */
const getStoredAuthPreferences = (serviceDocumentUrl?: string): AuthPreferences => {
  try {
    return readScopedAuthPreferences(
      applicationSessionStorage,
      applicationLocalStorage,
      serviceDocumentUrl,
    );
  } catch {
    return { remember: false, values: {} };
  }
};

/**
 * Reads a current-tab workspace route while falling back to the document overview.
 *
 * @param serviceDocumentUrl Selected service OpenAPI URL, omitted for single-app mode.
 * @returns Restorable Hash route for the selected document scope.
 */
const getRestoredWorkspaceHash = (serviceDocumentUrl?: string) => {
  try {
    const restoreTabsEnabled = readUserPreferences(applicationLocalStorage).restoreTabsEnabled;
    if (restoreTabsEnabled) {
      const sessionRoute = readSessionWorkspaceHash(
        applicationSessionStorage,
        applicationLocalStorage,
        serviceDocumentUrl,
      );
      if (sessionRoute) return sessionRoute;
      const persistedRoute = readPersistedWorkspace(
        applicationLocalStorage,
        serviceDocumentUrl,
      ).activeRoute;
      if (persistedRoute) return persistedRoute;
      return (
        readSessionWorkspaceHash(
          applicationSessionStorage,
          applicationLocalStorage,
          serviceDocumentUrl,
        ) || '#/home'
      );
    }
    return '#/home';
  } catch {
    return '#/home';
  }
};

/**
 * Combines an explicit page address with that interface's remembered debugger panels.
 *
 * @param hash Current browser hash including any service prefix.
 * @returns Route identity and optional session-only debugger selections.
 */
const readWorkspacePage = (hash: string): HashRouteState => parseHashRoute(hash);

/** Hosts the OpenAPI data flow and fixed URL-based workspace navigation. */
export function App() {
  const [persistenceError, setPersistenceError] = useState(getPersistenceFailure);
  useEffect(() => subscribePersistence(() => setPersistenceError(getPersistenceFailure())), []);
  const operationSelectionRevision = useRef(0);
  const persistenceIdentityRef = useRef<OperationIdentity | undefined>(undefined);
  const [preparedIdentity, setPreparedIdentity] = useState('');
  const [initialServiceUrl] = useState(() =>
    readSessionActiveServiceUrl(applicationSessionStorage, applicationLocalStorage),
  );
  const [initialWorkspaceDefaults] = useState(() =>
    readWorkspaceDefaultSettings(applicationLocalStorage),
  );
  const [initialWorkspaceSettings] = useState(() =>
    readWorkspaceScopeSettings(applicationLocalStorage, initialServiceUrl),
  );
  const [initialSessionSidebar] = useState(() =>
    readSessionSidebar(
      applicationSessionStorage,
      applicationLocalStorage,
      sidebarMinWidth,
      sidebarMaxWidth,
      sidebarDefaultWidth,
    ),
  );

  const [hashState, setHashState] = useState(() => readWorkspacePage(window.location.hash));

  const playgroundOpen = hashState.debug === true;
  const [playgroundVariants, setPlaygroundVariants] = useState<Map<string, number>>(
    () => new Map(),
  );
  const [debugCacheRevision, setDebugCacheRevision] = useState(0);
  const [settingsServiceDocumentUrl, setSettingsServiceDocumentUrl] = useState(initialServiceUrl);
  const [authPreferences, setAuthPreferences] = useState(() =>
    getStoredAuthPreferences(initialServiceUrl),
  );
  const [globalHeaders, setGlobalHeaders] = useState<GlobalHeader[]>(
    initialWorkspaceSettings.headers,
  );
  const [globalQueryParams, setGlobalQueryParams] = useState<GlobalHeader[]>(
    initialWorkspaceSettings.queryParams,
  );
  const [globalDefaultHeaders, setGlobalDefaultHeaders] = useState<GlobalHeader[]>(
    initialWorkspaceDefaults.headers,
  );
  const [globalDefaultQueryParams, setGlobalDefaultQueryParams] = useState<GlobalHeader[]>(
    initialWorkspaceDefaults.queryParams,
  );
  const [debugCacheEnabled, setDebugCacheEnabled] = useState(
    initialWorkspaceSettings.debugDraftEnabled,
  );
  const [groupOverviewEnabled, setGroupOverviewEnabled] = useState(
    initialWorkspaceSettings.groupOverviewEnabled,
  );

  const [workspaceTabs, setWorkspaceTabs] = useState<WorkspaceTab[]>([]);
  const [hydratedWorkspaceTabsStorageKey, setHydratedWorkspaceTabsStorageKey] = useState<string>();
  const {
    tabContextMenu,
    setTabContextMenu,
    tabContextMenuRef,
    workspaceFullscreen,
    openWorkspaceTabMenu,
    openWorkspaceTabInNewWindow,
    toggleWorkspaceFullscreen,
  } = useWorkspaceTabMenu();
  const [searchOpen, setSearchOpen] = useState(false);
  const [failedBrandLogo, setFailedBrandLogo] = useState<string>();
  const [brandSnapshot, setBrandSnapshot] = useState<BrandMetadata>(() => {
    const stored = readStoredBrand(applicationLocalStorage);
    const hasCustomTitle = Boolean(
      stored.title && stored.title.trim().toLowerCase() !== defaultBrandTitle.toLowerCase(),
    );
    return {
      footerText: undefined,
      hasCustomLogo: Boolean(stored.logo),
      hasCustomTitle,
      logo: stored.logo || defaultBrandLogo,
      title: stored.title || defaultBrandTitle,
    };
  });
  const [userPreferences, setUserPreferences] = useState<UserPreferences>(() =>
    readUserPreferences(applicationLocalStorage),
  );
  const [preferencesDrawerOpen, setPreferencesDrawerOpen] = useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(initialSessionSidebar.collapsed);
  const [sidebarWidth, setSidebarWidth] = useState(initialSessionSidebar.width);
  const [compactViewport, setCompactViewport] = useState(
    () => globalThis.matchMedia?.('(max-width: 767px)').matches ?? false,
  );
  const [compactSidebarOpen, setCompactSidebarOpen] = useState(false);
  const visibleSidebarCollapsed = compactViewport ? !compactSidebarOpen : sidebarCollapsed;
  const [sidebarResizing, setSidebarResizing] = useState(false);
  const [settingsSection, setSettingsSection] = useState<ManagementSection>(
    () => hashState.settingsSection ?? 'config',
  );
  const themePreference = userPreferences.theme;
  const { systemDarkMode, runThemeTransition } = useWorkspaceTheme(themePreference);
  const expandSidebarForInitialSelection = useCallback(() => {
    if (!compactViewport) setSidebarCollapsed(false);
  }, [compactViewport]);
  const openApiCacheStore = useRef(createIndexedDbOpenApiCacheStore());
  const openApiResourceLoader = useRef(
    createOpenApiResourceLoader({ store: openApiCacheStore.current }),
  );
  const serviceDocumentRepository = useRef(
    createServiceDocumentRepository({
      invalidateMemory: (url) => openApiResourceLoader.current.invalidateMemory(url),
      fetchDocument: (url, signal, kind = 'service') =>
        openApiResourceLoader.current.load<OpenApiDocument>(url, kind, signal),
      fetchSwaggerConfig: (url, signal, kind = 'swagger-config') =>
        openApiResourceLoader.current.load<SwaggerConfig>(url, kind, signal),
    }),
  );
  const singleDocumentRepository = useRef(
    createSingleDocumentRepository({
      invalidateMemory: (url) => openApiResourceLoader.current.invalidateMemory(url),
      fetchDocument: (url, signal, kind = 'gateway') =>
        openApiResourceLoader.current.load<OpenApiDocument>(url, kind, signal),
      fetchSwaggerConfig: (url, signal, kind = 'swagger-config') =>
        openApiResourceLoader.current.load<SwaggerConfig>(url, kind, signal),
    }),
  );
  const servicesRef = useRef<ServiceDefinition[]>([]);
  const userPreferencesRef = useRef(userPreferences);
  const activeServiceRef = useRef<null | ServiceDefinition>(null);
  /**
   * Builds a page address in the active aggregation service namespace.
   *
   * @param route Target page and optional explicit service identity.
   * @returns Hash route scoped to the active service, or an unscoped single-app route.
   */
  const createHashRoute = useCallback(
    (route: HashRouteState) =>
      serializeHashRoute({
        ...route,
        serviceId:
          route.serviceId ??
          (activeServiceRef.current
            ? getRouteKey(activeServiceRef.current, servicesRef.current)
            : undefined),
      }),
    [],
  );
  /** Replaces an invalid destination with the active workspace home without adding history.
   * @param None; uses the current service namespace.
   * @returns Nothing; synchronizes the URL and page state.
   */
  const replaceWithHome = useCallback(() => {
    const hash = createHashRoute({ view: 'docs' });
    window.history.replaceState(null, '', hash);
    setHashState(parseHashRoute(hash));
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  }, [createHashRoute]);
  const contentRef = useRef<HTMLElement | null>(null);
  const workspaceTabsRef = useRef<HTMLDivElement | null>(null);
  const workspaceTabElementRefs = useRef(new Map<string, HTMLDivElement>());
  const workspaceTabsOrderRef = useRef<WorkspaceTab[]>([]);
  const workspaceTabsScopeRef = useRef<string | undefined>(undefined);
  const themeMenuRef = useRef<HTMLDivElement | null>(null);
  const serviceSwitchController = useRef<AbortController | null>(null);
  const scrollWriteFrame = useRef<number | null>(null);

  /**
   * Updates general preferences and animates only when their resolved theme changes.
   *
   * @param nextPreferences Complete preference record emitted by the active settings control.
   * @param closeThemeMenu Whether the compact header theme menu should close with the update.
   * @returns Nothing; delegates theme changes to the shared snapshot transition.
   */
  const changeUserPreferences = useCallback(
    (nextPreferences: UserPreferences, closeThemeMenu = false) => {
      const nextDarkMode =
        nextPreferences.theme === 'dark' || (nextPreferences.theme === 'system' && systemDarkMode);
      runThemeTransition(nextDarkMode, () => {
        userPreferencesRef.current = nextPreferences;
        setUserPreferences(nextPreferences);
        if (closeThemeMenu) setThemeMenuOpen(false);
      });
    },
    [runThemeTransition, systemDarkMode],
  );

  const {
    loadService,
    selectService,
    reloadWorkspace,
    gatewayDocument,
    gatewayConfig,
    document,
    mainDocument,
    sourceGroupDocuments,
    services,
    activeService,
    loading,
    setLoading,
    workspaceCacheReady,
    setWorkspaceCacheReady,
    previousWorkspaceRef,
    error,
    groupDocumentErrors,
  } = useWorkspaceDocuments({
    serviceDocumentRepository,
    singleDocumentRepository,
    servicesRef,
    setSettingsServiceDocumentUrl,
    setAuthPreferences,
    getStoredAuthPreferences,
    setGlobalHeaders,
    setGlobalQueryParams,
    setDebugCacheEnabled,
    setGroupOverviewEnabled,
    activeServiceRef,
    setBrandSnapshot,
    openApiResourceLoader,
    contentRef,
    userPreferencesRef,
    workspaceTabsOrderRef,
    serviceSwitchController,
    createHashRoute,
    getRestoredWorkspaceHash,
    openApiCacheStore,
    initialServiceUrl,
    gatewayDocumentUrl,
    gatewayConfigUrl,
    replaceWithHome,
  });
  useTabIndicators(
    workspaceTabsRef,
    ':scope > .workspace-tab',
    ':scope > .workspace-tab-active',
    Boolean(document),
  );
  const aggregationEnabled = isAggregationEnabled(gatewayDocument);
  const { workspaceTabDrag, workspaceTabDragRef, startWorkspaceTabDrag, finishWorkspaceTabDrag } =
    useWorkspaceTabDrag({
      workspaceTabs,
      setWorkspaceTabs,
      workspaceTabsOrderRef,
      workspaceTabsRef,
      workspaceTabElementRefs,
      setTabContextMenu,
      resetKey: document,
    });

  useEffect(() => {
    const handler = async () => {
      const targetHash = window.location.hash;
      void flushPending().catch(reportPersistenceFailure);
      if (window.location.hash !== targetHash) return;
      if (!parseValidHashRoute(targetHash)) {
        replaceWithHome();
        return;
      }
      const nextHashState = readWorkspacePage(targetHash);
      if (serviceSwitchController.current) {
        serviceSwitchController.current.abort();
        if (activeServiceRef.current) {
          setLoading(false);
          setWorkspaceCacheReady(true);
        }
      }
      if (
        nextHashState.serviceId &&
        nextHashState.serviceId !==
          (activeServiceRef.current
            ? getRouteKey(activeServiceRef.current, servicesRef.current)
            : undefined)
      ) {
        const service = servicesRef.current.find(
          (item) => getRouteKey(item, servicesRef.current) === nextHashState.serviceId,
        );
        if (
          !gatewayDocument ||
          !isAggregationEnabled(gatewayDocument) ||
          !service ||
          service.disabled
        ) {
          replaceWithHome();
          return;
        }
        const controller = new AbortController();
        serviceSwitchController.current = controller;
        const loaded = await loadService(service, controller.signal, {
          docPath: gatewayDocument?.['x-nextdoc4j-aggregation']?.docPath,
          serviceSwaggerConfigEnabled:
            gatewayDocument?.['x-nextdoc4j-aggregation']?.serviceSwaggerConfigEnabled === true,
        });
        if (controller.signal.aborted || window.location.hash !== targetHash) return;
        if (!loaded) {
          replaceWithHome();
          return;
        }
      }
      const targetOperation = findDocumentationOperation(
        documentationSourcesRef.current,
        nextHashState.sourceGroupId,
        nextHashState.operationId,
        nextHashState.operationPath,
        nextHashState.operationMethod,
      );
      const targetIdentity = targetOperation
        ? operationIdentity(
            scopeForService(activeServiceRef.current?.url),
            targetOperation.method,
            targetOperation.path,
          )
        : undefined;
      const targetPage = targetIdentity ? readOperationState(targetIdentity) : undefined;
      setHashState({ ...nextHashState, ...targetPage?.debug });
      if (nextHashState.view === 'settings') {
        setSettingsSection(nextHashState.settingsSection ?? 'config');
      }
      try {
        writeSessionWorkspaceHash(
          applicationSessionStorage,
          applicationLocalStorage,
          window.location.hash,
          activeServiceRef.current?.url,
        );
        if (userPreferencesRef.current.restoreTabsEnabled) {
          writePersistedWorkspace(
            applicationLocalStorage,
            {
              activeRoute: window.location.hash,
              tabs:
                workspaceTabsScopeRef.current ===
                scopeToken(scopeForService(activeServiceRef.current?.url))
                  ? workspaceTabsOrderRef.current
                  : (readWorkspace(scopeForService(activeServiceRef.current?.url))?.tabs ?? []),
            },
            activeServiceRef.current?.url,
          );
        }
      } catch {
        // Route restoration is optional when browser storage is unavailable.
      }
    };
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, [gatewayDocument, loadService, replaceWithHome, setLoading, setWorkspaceCacheReady]);

  useEffect(() => {
    if (!workspaceCacheReady || loading || !activeService) return;
    const route = parseHashRoute(window.location.hash);
    if (route.serviceId) return;
    const hash = createHashRoute(route);
    window.history.replaceState(null, '', hash);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  }, [activeService, createHashRoute, loading, workspaceCacheReady]);

  useEffect(
    () => () => {
      serviceSwitchController.current?.abort();
      if (scrollWriteFrame.current !== null) {
        cancelAnimationFrame(scrollWriteFrame.current);
      }
    },
    [],
  );
  useEffect(() => {
    try {
      writeScopedAuthPreferences(
        authPreferences,
        applicationSessionStorage,
        applicationLocalStorage,
        settingsServiceDocumentUrl,
      );
    } catch {
      // Storage can be unavailable in privacy-restricted browser contexts.
    }
  }, [authPreferences, settingsServiceDocumentUrl]);
  useEffect(() => {
    try {
      patchWorkspaceScopeSettings(applicationLocalStorage, settingsServiceDocumentUrl, {
        headers: globalHeaders,
      });
    } catch {
      // Global request settings are optional when browser storage is unavailable.
    }
  }, [globalHeaders, settingsServiceDocumentUrl]);
  useEffect(() => {
    try {
      patchWorkspaceScopeSettings(applicationLocalStorage, settingsServiceDocumentUrl, {
        queryParams: globalQueryParams,
      });
    } catch {
      // Global request settings are optional when browser storage is unavailable.
    }
  }, [globalQueryParams, settingsServiceDocumentUrl]);
  useEffect(() => {
    if (!aggregationEnabled) return;
    try {
      writeWorkspaceDefaultSettings(applicationLocalStorage, {
        headers: globalDefaultHeaders,
        queryParams: globalDefaultQueryParams,
      });
    } catch {
      // Global aggregation defaults remain available during the current browser session.
    }
  }, [aggregationEnabled, globalDefaultHeaders, globalDefaultQueryParams]);
  useEffect(() => {
    try {
      patchWorkspaceScopeSettings(applicationLocalStorage, settingsServiceDocumentUrl, {
        debugDraftEnabled: debugCacheEnabled,
      });
    } catch {
      // Browser privacy settings can deny non-essential request-draft storage.
    }
  }, [debugCacheEnabled, settingsServiceDocumentUrl]);
  useEffect(() => {
    try {
      patchWorkspaceScopeSettings(applicationLocalStorage, settingsServiceDocumentUrl, {
        groupOverviewEnabled,
      });
    } catch {
      // The overview preference remains available for the current page when storage is unavailable.
    }
  }, [groupOverviewEnabled, settingsServiceDocumentUrl]);
  useEffect(() => {
    userPreferencesRef.current = userPreferences;
    try {
      writeUserPreferences(applicationLocalStorage, userPreferences);
      if (!userPreferences.restoreTabsEnabled) {
        clearPersistedWorkspaces(applicationLocalStorage);
      }
    } catch {
      // User preferences remain available for the current page when storage is unavailable.
    }
  }, [userPreferences]);
  useEffect(() => {
    if (!themeMenuOpen) return;
    const closeOnOutsidePress = (event: PointerEvent) => {
      if (event.target instanceof Node && !themeMenuRef.current?.contains(event.target)) {
        setThemeMenuOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setThemeMenuOpen(false);
    };
    globalThis.document.addEventListener('pointerdown', closeOnOutsidePress);
    globalThis.document.addEventListener('keydown', closeOnEscape);
    return () => {
      globalThis.document.removeEventListener('pointerdown', closeOnOutsidePress);
      globalThis.document.removeEventListener('keydown', closeOnEscape);
    };
  }, [themeMenuOpen]);

  useEffect(() => {
    try {
      writeSessionSidebar(applicationSessionStorage, applicationLocalStorage, {
        collapsed: sidebarCollapsed,
        width: sidebarWidth,
      });
    } catch {
      // The visual preference remains available for the current page when storage is unavailable.
    }
  }, [sidebarCollapsed, sidebarWidth]);

  /**
   * Opens a workspace page and selects the first sidebar model when entering entity browsing.
   *
   * @param view Target workspace page.
   * @param sourceGroupId Optional document source, defaulting to all interfaces.
   * @returns Nothing; updates the Hash route with the page and optional model selection.
   */
  const navigate = (view: AppView, sourceGroupId?: string) => {
    const source = documentationSources.find(
      (item) => item.id === (sourceGroupId || allOperationsSourceId),
    );
    const modelName =
      view === 'models'
        ? Object.keys(source?.document.components?.schemas ?? {}).sort((left, right) =>
            left.localeCompare(right, 'zh-CN'),
          )[0]
        : undefined;
    window.location.hash = createHashRoute({ modelName, sourceGroupId, view });
  };

  useEffect(() => {
    const media = globalThis.matchMedia?.('(max-width: 767px)');
    if (!media) return;
    /** Updates narrow-screen navigation without changing the stored desktop layout.
     * @param None; reads the viewport media query.
     * @returns Nothing; updates viewport state and closes the temporary navigation.
     */
    const updateViewport = () => {
      setCompactViewport(media.matches);
      setCompactSidebarOpen(false);
    };
    media.addEventListener('change', updateViewport);
    return () => media.removeEventListener('change', updateViewport);
  }, []);

  useEffect(() => setCompactSidebarOpen(false), [hashState]);

  /**
   * Changes desktop navigation or the temporary narrow-screen sidebar.
   *
   * @param collapsed Whether navigation should use its compact presentation.
   * @returns Nothing; updates the corresponding sidebar state.
   */
  const setSidebarCollapsedState = useCallback(
    (collapsed: boolean) => {
      if (compactViewport) {
        setCompactSidebarOpen(!collapsed);
        return;
      }
      if (sidebarCollapsed === collapsed) return;
      setSidebarCollapsed(collapsed);
    },
    [compactViewport, sidebarCollapsed],
  );

  const selectSettingsSection = (section: ManagementSection) => {
    setSettingsSection(section);
    window.location.hash = createHashRoute({ settingsSection: section, view: 'settings' });
  };
  /**
   * Restores the last page for one interface selected from the menu or overview.
   *
   * @param operation Source-aware interface operation to display.
   * @returns Nothing; navigates to the saved page, defaulting to documentation on first visit.
   */
  const selectOperation = useCallback(
    async (operation: ApiOperation) => {
      const selectionRevision = ++operationSelectionRevision.current;
      const serviceUrl = activeServiceRef.current?.url;
      void flushPending().catch(reportPersistenceFailure);
      const source = documentationSourcesRef.current.find(
        (item) => item.id === (operation.sourceGroupId || allOperationsSourceId),
      );
      if (!source) return;
      const operationKey = getWorkspaceOperationKey(operation);
      const identity = operationIdentity(
        scopeForService(activeServiceRef.current?.url),
        operation.method,
        operation.path,
      );
      if (!isOperationPrepared(identity))
        await prepareOperation(identity).catch(reportPersistenceFailure);
      if (
        selectionRevision !== operationSelectionRevision.current ||
        serviceUrl !== activeServiceRef.current?.url
      )
        return;
      const saved = readOperationState(identity);
      const rememberedPage = saved ? { debug: saved.page === 'debug', ...saved.debug } : undefined;
      const currentOperation = findDocumentationOperation(
        documentationSourcesRef.current,
        hashState.sourceGroupId,
        hashState.operationId,
        hashState.operationPath,
        hashState.operationMethod,
      );
      const sameOperation =
        hashState.view === 'docs' &&
        currentOperation &&
        getWorkspaceOperationKey(currentOperation) === operationKey;
      const page = sameOperation ? hashState : rememberedPage;
      const targetRoute = createHashRoute({
        debug: page?.debug,
        group: operation.group,
        ...getOperationRoute(operation, source.document),
        sourceGroupId: operation.sourceGroupId,
        view: 'docs',
      });
      if (window.location.hash === targetRoute) return;
      if (!sameOperation) setPlaygroundVariants(new Map());
      window.location.hash = targetRoute;
    },
    [createHashRoute, hashState],
  );
  /**
   * Opens online debugging for the currently selected interface.
   *
   * @param variants Request composition branches selected in the documentation view.
   * @returns Nothing; exposes the playground in the current workspace.
   */
  const openPlayground = useCallback(
    (variants: Map<string, number>) => {
      setPlaygroundVariants(new Map(variants));
      window.location.hash = createHashRoute({
        ...parseHashRoute(window.location.hash),
        debug: true,
      });
    },
    [createHashRoute],
  );

  /**
   * Remembers debugger panel selections without changing the page address.
   *
   * @param state Selected parameter panel and request body representation.
   * @returns Nothing; updates local state and the interface's session record.
   */
  const updateDebugRoute = useCallback(
    (state: Pick<HashRouteState, 'debugTab' | 'debugBody' | 'debugTabExplicit'>) => {
      setHashState((current) => ({ ...current, ...state }));
      if (persistenceIdentityRef.current)
        patchOperationState(persistenceIdentityRef.current, { debug: state });
    },
    [],
  );
  /**
   * Opens the overview route for one sidebar API group without selecting a concrete operation.
   *
   * @param group OpenAPI Tag name that identifies the requested overview group.
   * @param sourceGroupId Optional SpringDoc source identifier that owns the Tag.
   * @returns Nothing; replaces the current Hash route with the selected group overview.
   */
  const selectOperationGroup = (group: string, sourceGroupId?: string) => {
    window.location.hash = createHashRoute({ group, sourceGroupId, view: 'docs' });
  };
  const selectMarkdownDocument = (markdownDocument: { displayName: string; group: string }) => {
    window.location.hash = createHashRoute({
      group: markdownDocument.group,
      markdownName: markdownDocument.displayName,
      view: 'markdown',
    });
  };
  const selectModel = useCallback(
    (modelName: string, sourceGroupId?: string) => {
      window.location.hash = createHashRoute({ modelName, sourceGroupId, view: 'models' });
    },
    [createHashRoute],
  );
  const documentationSources = useMemo(
    () =>
      createDocumentationSources(
        mainDocument,
        sourceGroupDocuments,
        activeService?.url ?? gatewayConfig?.configUrl ?? gatewayConfigUrl,
      ),
    [mainDocument, sourceGroupDocuments, activeService?.url, gatewayConfig?.configUrl],
  );
  const documentationSourcesRef = useRef(documentationSources);
  documentationSourcesRef.current = documentationSources;
  const routeMatchesActiveService =
    !hashState.serviceId ||
    Boolean(activeService && getRouteKey(activeService, services) === hashState.serviceId);
  const selectedOperation = useMemo(
    () =>
      routeMatchesActiveService
        ? findDocumentationOperation(
            documentationSources,
            hashState.sourceGroupId,
            hashState.operationId,
            hashState.operationPath,
            hashState.operationMethod,
          )
        : undefined,
    [
      routeMatchesActiveService,
      documentationSources,
      hashState.operationId,
      hashState.operationPath,
      hashState.operationMethod,
      hashState.sourceGroupId,
    ],
  );
  const activeDocumentationSource = useMemo(
    () =>
      documentationSources.find(
        (source) => source.id === (hashState.sourceGroupId || allOperationsSourceId),
      ) ?? documentationSources.find((source) => source.id === allOperationsSourceId),
    [documentationSources, hashState.sourceGroupId],
  );
  const activeDocumentationDocument = activeDocumentationSource?.document ?? document;
  const overviewOperations = useMemo(() => {
    const sourceOperations = hashState.sourceGroupId
      ? (activeDocumentationSource?.operations ?? [])
      : getWorkspaceOverviewOperations(documentationSources);
    if (!hashState.group || selectedOperation) return sourceOperations;
    return sourceOperations.filter((operation) => operation.group === hashState.group);
  }, [
    activeDocumentationSource?.operations,
    documentationSources,
    hashState.group,
    hashState.sourceGroupId,
    selectedOperation,
  ]);
  const markdownSourceDocument = aggregationEnabled ? gatewayDocument : document;
  const markdownGroups = useMemo(
    () => groupMarkdownDocuments(markdownSourceDocument),
    [markdownSourceDocument],
  );
  const selectedMarkdownDocument = useMemo(
    () => findMarkdownDocument(markdownSourceDocument, hashState.group, hashState.markdownName),
    [hashState.group, hashState.markdownName, markdownSourceDocument],
  );
  useEffect(() => {
    if (loading || !workspaceCacheReady || !document) return;
    const route = parseValidHashRoute(window.location.hash);
    if (!route) {
      replaceWithHome();
      return;
    }
    if (
      route.serviceId &&
      route.serviceId !== (activeService ? getRouteKey(activeService, services) : undefined)
    ) {
      if (
        !aggregationEnabled ||
        !services.some(
          (service) => !service.disabled && getRouteKey(service, services) === route.serviceId,
        )
      )
        replaceWithHome();
      return;
    }
    const source = documentationSources.find(
      (item) => item.id === (route.sourceGroupId || allOperationsSourceId),
    );
    const missingSource = route.sourceGroupId && !source;
    const missingOperation =
      (route.operationId || route.operationPath) &&
      !findDocumentationOperation(
        documentationSources,
        route.sourceGroupId,
        route.operationId,
        route.operationPath,
        route.operationMethod,
      );
    const missingGroup =
      route.view === 'docs' &&
      route.group &&
      !source?.groups.some(([name]) => name === route.group);
    const missingModel =
      route.view === 'models' &&
      route.modelName &&
      !Object.hasOwn(source?.document.components?.schemas ?? {}, route.modelName);
    const missingMarkdown =
      route.view === 'markdown' &&
      route.markdownName &&
      !findMarkdownDocument(markdownSourceDocument, route.group, route.markdownName);
    if (missingSource || missingOperation || missingGroup || missingModel || missingMarkdown)
      replaceWithHome();
  }, [
    loading,
    workspaceCacheReady,
    document,
    hashState,
    activeService,
    services,
    aggregationEnabled,
    documentationSources,
    markdownSourceDocument,
    replaceWithHome,
  ]);

  const currentView = hashState.view;
  const activeServiceDocumentUrl = activeService?.url;
  const storageScope = scopeForService(activeService?.url);
  const storageScopeToken = scopeToken(storageScope);
  const activeRequestPrefixRef = useRef('');
  const aggregationDocPath = gatewayDocument?.['x-nextdoc4j-aggregation']?.docPath;
  const activeRequestPrefix = useMemo(
    () =>
      activeServiceDocumentUrl
        ? resolveServiceDocumentPrefix(activeServiceDocumentUrl, aggregationDocPath)
        : '',
    [activeServiceDocumentUrl, aggregationDocPath],
  );
  activeRequestPrefixRef.current = activeRequestPrefix;
  const persistentOperation = selectedOperation
    ? operationIdentity(storageScope, selectedOperation.method, selectedOperation.path)
    : undefined;
  persistenceIdentityRef.current = persistentOperation;
  const persistentOperationKey = persistentOperation ? JSON.stringify(persistentOperation) : '';
  const operationStorageReady = Boolean(
    persistentOperation && isOperationPrepared(persistentOperation),
  );
  useEffect(() => {
    if (!persistentOperation) {
      setPreparedIdentity('');
      return;
    }
    let cancelled = false;
    const identity = persistentOperation;
    const release = retainOperation(identity);
    void (async () => {
      await prepareOperation(identity).catch(reportPersistenceFailure);
      if (cancelled) return;
      const saved = readOperationState(identity);
      setHashState((current) => ({ ...current, ...saved?.debug }));
      setPreparedIdentity(persistentOperationKey);
    })();
    return () => {
      cancelled = true;
      release();
    };
    // Identity is deliberately independent of the document-group entry and debug panel selections.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persistentOperationKey]);
  useEffect(() => {
    if (!persistentOperation || preparedIdentity !== persistentOperationKey) return;
    patchOperationState(persistentOperation, {
      page: hashState.debug ? 'debug' : 'detail',
      lastRoute: window.location.hash,
      lastEntry: {
        documentUrl: activeDocumentationSource?.documentUrl || gatewayDocumentUrl,
        tag: selectedOperation?.group,
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preparedIdentity, persistentOperationKey, hashState.debug, hashState.sourceGroupId]);

  /**
   * Loads full-document subsets for selected aggregation services without replacing the active workspace.
   *
   * @param selectedServices Available gateway services selected for one combined export.
   * @returns Successful service documents and isolated failure messages for partial aggregation export.
   */
  const loadAggregationExportDocuments = useCallback(
    async (selectedServices: ServiceDefinition[]): Promise<AggregationExportResult> => {
      const workspaceOptions: ServiceWorkspaceLoadOptions = {
        docPath: gatewayDocument?.['x-nextdoc4j-aggregation']?.docPath,
        serviceSwaggerConfigEnabled:
          gatewayDocument?.['x-nextdoc4j-aggregation']?.serviceSwaggerConfigEnabled === true,
      };
      const results: Array<AggregationExportDocument | { error: string }> = await Promise.all(
        selectedServices.map(
          async (service): Promise<AggregationExportDocument | { error: string }> => {
            try {
              const workspace = await serviceDocumentRepository.current.loadWorkspace(
                service,
                workspaceOptions,
              );
              const exportSources = createDocumentationSources(
                workspace.document,
                workspace.groupDocuments,
                service.url,
              );
              const source = exportSources.find((item) => item.id === allOperationsSourceId);
              if (!source) throw new Error('服务未返回可导出的主文档');
              return {
                document: createOpenApiSubset(source.document, source.operations),
                groups: exportSources
                  .filter((item) => item.id !== allOperationsSourceId)
                  .map((item) => ({
                    name: item.name,
                    operationKeys: item.operations.map(
                      (operation) => `${operation.method}:${operation.path}`,
                    ),
                  })),
                serviceName: service.name,
                serviceUrl: service.url,
              };
            } catch (reason) {
              return {
                error: `${service.name}：${reason instanceof Error ? reason.message : '文档加载失败'}`,
              };
            }
          },
        ),
      );
      const documents: AggregationExportDocument[] = [];
      const failures: string[] = [];
      results.forEach((result) => {
        if ('error' in result) failures.push(result.error);
        else documents.push(result);
      });
      return { documents, failures };
    },
    [gatewayDocument],
  );

  /**
   * Clears only the persisted debug drafts belonging to the active service namespace.
   *
   * @returns Count of draft records removed from browser storage.
   */
  const clearActiveDebugDrafts = useCallback(async () => {
    const scope = scopeForService(activeServiceRef.current?.url);
    const count = await clearOperationDrafts(scope);
    await clearOwnedLegacyDrafts(scope.appId, activeRequestPrefixRef.current, scope.serviceKey);
    const { clearPlaygroundFileCache } = await import('./features/playground/file-memory');
    clearPlaygroundFileCache({ appId: scope.appId, serviceKey: scope.serviceKey });
    setDebugCacheRevision((value) => value + 1);
    return count;
  }, []);

  /** Counts saved interface drafts without loading request bodies.
   * @param None; reads the active service reference.
   * @returns Number of drafts after pending writes commit.
   */
  const getActiveDebugDraftCount = useCallback(
    () => countOperationDrafts(scopeForService(activeServiceRef.current?.url)),
    [],
  );
  const securitySchemes = useMemo(
    () =>
      getRegisteredSecuritySchemes(
        mergeGatewaySecuritySchemes(
          document,
          aggregationEnabled ? gatewayDocument : undefined,
          aggregationEnabled ? gatewayConfig : undefined,
        ),
      ),
    [aggregationEnabled, document, gatewayConfig, gatewayDocument],
  );
  const playgroundDocument = useMemo(
    () =>
      document
        ? withSecuritySchemes(
            document,
            mergeGatewaySecuritySchemes(
              document,
              aggregationEnabled ? gatewayDocument : undefined,
              aggregationEnabled ? gatewayConfig : undefined,
            ),
          )
        : undefined,
    [aggregationEnabled, document, gatewayConfig, gatewayDocument],
  );
  const isAggregation = aggregationEnabled;
  const configurationServices = useMemo(
    () => services.filter((service) => !service.disabled),
    [services],
  );
  const allDebugCacheEnabled = useMemo(() => {
    if (!isAggregation || configurationServices.length === 0) return debugCacheEnabled;
    return configurationServices.every((service) =>
      service.url === activeService?.url
        ? debugCacheEnabled
        : readWorkspaceScopeSettings(applicationLocalStorage, service.url).debugDraftEnabled,
    );
  }, [activeService?.url, configurationServices, debugCacheEnabled, isAggregation]);
  const allGroupOverviewEnabled = useMemo(() => {
    if (!isAggregation || configurationServices.length === 0) return groupOverviewEnabled;
    return configurationServices.every((service) =>
      service.url === activeService?.url
        ? groupOverviewEnabled
        : readWorkspaceScopeSettings(applicationLocalStorage, service.url).groupOverviewEnabled,
    );
  }, [activeService?.url, configurationServices, groupOverviewEnabled, isAggregation]);

  /**
   * Applies the debug-draft cache preference to every available aggregation service.
   *
   * @param enabled Whether debug drafts should be persisted for all aggregation services.
   * @returns Nothing; writes each service preference and synchronizes the active service state.
   */
  const updateAllDebugCacheEnabled = useCallback(
    (enabled: boolean) => {
      try {
        configurationServices.forEach((service) => {
          patchWorkspaceScopeSettings(applicationLocalStorage, service.url, {
            debugDraftEnabled: enabled,
          });
        });
      } catch {
        // Browser privacy settings can deny non-essential debug preference storage.
      }
      setDebugCacheEnabled(enabled);
    },
    [configurationServices],
  );

  /**
   * Applies the group-overview preference to every available aggregation service.
   *
   * @param enabled Whether group overview should be enabled for all aggregation services.
   * @returns Nothing; writes each service preference and synchronizes the active service state.
   */
  const updateAllGroupOverviewEnabled = useCallback(
    (enabled: boolean) => {
      try {
        configurationServices.forEach((service) => {
          patchWorkspaceScopeSettings(applicationLocalStorage, service.url, {
            groupOverviewEnabled: enabled,
          });
        });
      } catch {
        // Browser privacy settings can deny non-essential overview preference storage.
      }
      setGroupOverviewEnabled(enabled);
    },
    [configurationServices],
  );

  /**
   * Clears debug drafts for every available aggregation service request prefix.
   *
   * @returns Number of draft records removed across the aggregation services.
   */
  const clearAllDebugDrafts = useCallback(async () => {
    const appId = getWorkspaceScope().appId;
    const count = await clearOperationDrafts({ appId });
    await clearOwnedLegacyDrafts(appId);
    const { clearPlaygroundFileCache } = await import('./features/playground/file-memory');
    clearPlaygroundFileCache({ appId });
    setDebugCacheRevision((value) => value + 1);
    return count;
  }, []);

  /** Counts drafts across the current application's services, including unavailable services.
   * @param None; reads the application identity.
   * @returns Number of persisted interface drafts.
   */
  const getAllDebugDraftCount = useCallback(
    () => countOperationDrafts({ appId: getWorkspaceScope().appId }),
    [],
  );

  /**
   * Loads the service selected as the global-parameter configuration scope.
   *
   * @param serviceUrl OpenAPI document URL selected from an aggregation service list.
   * @returns Nothing; unavailable services are ignored and valid services load asynchronously.
   */
  const selectConfigurationService = useCallback(
    (serviceUrl: string) => {
      const service = services.find((item) => item.url === serviceUrl);
      if (!service || service.disabled) return;
      void selectService(
        service,
        {
          docPath: gatewayDocument?.['x-nextdoc4j-aggregation']?.docPath,
          serviceSwaggerConfigEnabled:
            gatewayDocument?.['x-nextdoc4j-aggregation']?.serviceSwaggerConfigEnabled === true,
        },
        true,
      );
    },
    [gatewayDocument, selectService, services],
  );

  /**
   * Restores general preferences and Nextdoc4j behavior switches to their defaults.
   *
   * @returns Nothing; persists general defaults and enables scoped document behaviors.
   */
  const restoreDefaultPreferences = useCallback(() => {
    try {
      resetUserPreferences(applicationLocalStorage);
    } catch {
      // In-memory defaults remain usable when local storage is unavailable.
    }
    changeUserPreferences(defaultUserPreferences);
    if (isAggregation) {
      updateAllDebugCacheEnabled(true);
      updateAllGroupOverviewEnabled(true);
    } else {
      setDebugCacheEnabled(true);
      setGroupOverviewEnabled(true);
    }
  }, [
    changeUserPreferences,
    isAggregation,
    updateAllDebugCacheEnabled,
    updateAllGroupOverviewEnabled,
  ]);
  const effectiveGlobalHeaders = useMemo(
    () =>
      isAggregation ? mergeGlobalParameters(globalDefaultHeaders, globalHeaders) : globalHeaders,
    [globalDefaultHeaders, globalHeaders, isAggregation],
  );
  const effectiveGlobalQueryParams = useMemo(
    () =>
      isAggregation
        ? mergeGlobalParameters(globalDefaultQueryParams, globalQueryParams)
        : globalQueryParams,
    [globalDefaultQueryParams, globalQueryParams, isAggregation],
  );
  const apiDocsDocument = gatewayDocument ?? document;
  const resolvedBrand = useMemo(
    () =>
      resolveBrandMetadata(apiDocsDocument, {
        fallbackLogo: brandSnapshot.logo,
        fallbackTitle: brandSnapshot.title,
        hasCustomTitle: brandSnapshot.hasCustomTitle,
      }),
    [apiDocsDocument, brandSnapshot.hasCustomTitle, brandSnapshot.logo, brandSnapshot.title],
  );
  const brandTitle = resolvedBrand.title;
  const brandLogo =
    resolvedBrand.logo && failedBrandLogo !== resolvedBrand.logo
      ? resolvedBrand.logo
      : defaultBrandLogo;
  const brandFooterText = resolvedBrand.footerText;
  const shouldShowBrandLogo = failedBrandLogo !== brandLogo;

  useEffect(() => {
    globalThis.document.title = brandTitle;
  }, [brandTitle]);

  useEffect(() => {
    if (resolvedBrand.hasCustomTitle || resolvedBrand.hasCustomLogo) {
      writeStoredBrand(resolvedBrand, applicationLocalStorage);
    }
  }, [resolvedBrand]);

  const operationGroupCount =
    documentationSources.find((source) => source.id === allOperationsSourceId)?.groups.length ?? 0;
  const unavailableServiceCount = services.filter(
    (service) => service.disabled || service.status === 'DOWN',
  ).length;
  const searchDocuments = useMemo<SearchEntry[]>(
    () =>
      markdownGroups.flatMap(([group, items]) =>
        items.map((item) => ({
          id: `markdown:${group}:${item.displayName}`,
          kind: 'document' as const,
          title: item.displayName,
          content: item.content,
          path: item.displayName,
          group,
          method: 'DOC',
          service: aggregationEnabled ? '网关文档' : brandTitle || '当前文档',
          serviceUrl: '',
          route: createHashRoute({ group, markdownName: item.displayName, view: 'markdown' }),
          text: item.displayName.toLowerCase(),
        })),
      ),
    [createHashRoute, markdownGroups, aggregationEnabled, brandTitle],
  );
  const searchServices = useMemo(
    () => (aggregationEnabled ? services : []),
    [aggregationEnabled, services],
  );

  /** Loads service navigation through the existing cache without switching the active workspace.
   * @param service Service chosen for background search indexing.
   * @param signal Cancellation signal owned by the search dialog.
   * @returns Navigation sources with canonical routes and SpringDoc group metadata.
   */
  const loadSearchSources = useCallback(
    async (service: ServiceDefinition, signal: AbortSignal) => {
      const workspace = await serviceDocumentRepository.current.loadWorkspace(service, {
        docPath: gatewayDocument?.['x-nextdoc4j-aggregation']?.docPath,
        serviceSwaggerConfigEnabled:
          gatewayDocument?.['x-nextdoc4j-aggregation']?.serviceSwaggerConfigEnabled === true,
        signal,
      });
      if (signal.aborted) throw new DOMException('Search cancelled', 'AbortError');
      const groupRouteKeys = getDocumentGroupRouteKeys(workspace.groupDocuments, service.url);
      return [
        { document: workspace.mainDocument, id: allOperationsSourceId, name: '所有接口' },
        ...workspace.groupDocuments.map((group) => ({
          document: group.document,
          id: groupRouteKeys.get(group.url)!,
          name: group.name,
        })),
      ];
    },
    [gatewayDocument],
  );
  const { currentTab, closeWorkspaceTab, toggleWorkspaceTabPin, closeWorkspaceTabs } =
    useWorkspaceTabs({
      routeMatchesActiveService,
      currentView,
      selectedOperation,
      activeDocumentationSource,
      gatewayDocumentUrl,
      createHashRoute,
      hashState,
      activeDocumentationDocument,
      selectedMarkdownDocument,
      settingsSection,
      activeService,
      document,
      userPreferencesRef,
      documentationSources,
      setWorkspaceTabs,
      setHydratedWorkspaceTabsStorageKey,
      loading,
      hydratedWorkspaceTabsStorageKey,
      workspaceTabs,
      userPreferences,
      workspaceTabsOrderRef,
      workspaceTabsScopeRef,
      storageScopeToken,
      workspaceTabDragRef,
      workspaceTabsRef,
      workspaceTabElementRefs,
    });

  /** Opens a result after verifying its target service has become active.
   * @param result Indexed route and owning service identity.
   * @returns Completion after navigation, or a rejection when the target service is unavailable.
   */
  const openSearchResult = async (result: SearchEntry) => {
    if (result.serviceUrl && result.serviceUrl !== activeServiceRef.current?.url) {
      const service = servicesRef.current.find((item) => item.url === result.serviceUrl);
      if (!service || service.disabled) throw new Error('Service unavailable');
      await selectService(service, {
        docPath: gatewayDocument?.['x-nextdoc4j-aggregation']?.docPath,
        serviceSwaggerConfigEnabled:
          gatewayDocument?.['x-nextdoc4j-aggregation']?.serviceSwaggerConfigEnabled === true,
      });
      if (activeServiceRef.current?.url !== result.serviceUrl)
        throw new Error('Service unavailable');
    }
    window.location.hash = createHashRoute(parseHashRoute(result.route));
  };

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (!contentRef.current) return;
      try {
        const rememberedScroll =
          persistenceIdentityRef.current &&
          readOperationState(persistenceIdentityRef.current)?.scroll?.detail;
        contentRef.current.scrollTop =
          rememberedScroll ??
          readSessionWorkspaceScroll(
            applicationSessionStorage,
            applicationLocalStorage,
            window.location.hash,
            activeService?.url,
          );
      } catch {
        contentRef.current.scrollTop = 0;
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [activeService?.url, document, hashState, preparedIdentity]);

  /**
   * Persists content scrolling at most once per animation frame.
   *
   * @returns Nothing.
   */
  const handleContentScroll = useCallback(() => {
    if (scrollWriteFrame.current !== null) return;
    scrollWriteFrame.current = requestAnimationFrame(() => {
      scrollWriteFrame.current = null;
      if (!contentRef.current) return;
      try {
        if (persistenceIdentityRef.current)
          patchOperationState(persistenceIdentityRef.current, {
            scroll: { detail: contentRef.current.scrollTop },
          });
        writeSessionWorkspaceScroll(
          applicationSessionStorage,
          applicationLocalStorage,
          window.location.hash,
          contentRef.current.scrollTop,
          activeServiceRef.current?.url,
        );
      } catch {
        // Scroll restoration is optional when session storage is unavailable.
      }
    });
  }, []);

  useEffect(() => {
    /** Opens the palette without stealing shortcuts from another modal or composition session.
     * @param event Global keyboard event.
     * @returns Nothing; opens search for the platform command shortcut.
     */
    const openSearch = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        event.isComposing ||
        event.altKey ||
        event.shiftKey ||
        !(event.metaKey || event.ctrlKey) ||
        event.key.toLowerCase() !== 'k' ||
        globalThis.document.querySelector('dialog[open], [role="dialog"][aria-modal="true"]')
      )
        return;
      event.preventDefault();
      setSearchOpen(true);
    };
    globalThis.document.addEventListener('keydown', openSearch);
    return () => globalThis.document.removeEventListener('keydown', openSearch);
  }, []);

  const headerSidebarWidth =
    compactViewport || sidebarCollapsed ? sidebarCollapsedWidth : sidebarWidth;
  const headerBrandLogoOffset =
    compactViewport || sidebarCollapsed
      ? headerBrandLogoCollapsedOffset
      : headerBrandLogoExpandedOffset;
  const contextMenuTab = tabContextMenu
    ? workspaceTabs.find((tab) => tab.id === tabContextMenu.tabId)
    : undefined;
  const contextMenuTabIndex = contextMenuTab
    ? workspaceTabs.findIndex((tab) => tab.id === contextMenuTab.id)
    : -1;
  const canCloseContextMenuTab = Boolean(contextMenuTab?.closable && !contextMenuTab.pinned);
  const canCloseTabsLeft = workspaceTabs
    .slice(0, contextMenuTabIndex)
    .some((tab) => tab.closable && !tab.pinned);
  const canCloseTabsRight = workspaceTabs
    .slice(contextMenuTabIndex + 1)
    .some((tab) => tab.closable && !tab.pinned);
  const canCloseOtherTabs = workspaceTabs.some(
    (tab) => tab.id !== contextMenuTab?.id && tab.closable && !tab.pinned,
  );
  const canCloseAnyTabs = workspaceTabs.some((tab) => tab.closable && !tab.pinned);
  const themePreferenceLabel =
    themePreference === 'light' ? '浅色模式' : themePreference === 'dark' ? '深色模式' : '跟随系统';

  if (loading && !document)
    return (
      <LoadingScreen
        brandLogo={brandLogo}
        brandTitle={brandTitle}
        hasCustomTitle={resolvedBrand.hasCustomTitle}
      />
    );
  if (error && !document)
    return <ErrorScreen error={error} onRetry={() => window.location.reload()} />;
  if (!document)
    return (
      <ErrorScreen error="服务未返回有效 OpenAPI 文档。" onRetry={() => window.location.reload()} />
    );

  return (
    <div
      className="h-screen min-h-[620px] bg-canvas"
      data-workspace-root
      style={
        {
          '--workspace-sidebar-width': `${headerSidebarWidth}px`,
          '--workspace-sidebar-expanded-width': `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      {searchOpen && (
        <Suspense fallback={null}>
          <GlobalSearch
            sources={documentationSources}
            services={searchServices}
            activeServiceUrl={aggregationEnabled ? activeService?.url || '' : ''}
            serviceName={activeService?.name || brandTitle || '当前文档'}
            documents={searchDocuments}
            loadSources={loadSearchSources}
            onSelect={openSearchResult}
            onClose={() => setSearchOpen(false)}
          />
        </Suspense>
      )}
      <div className="flex h-full flex-col">
        <header
          className={`workspace-header-bar relative grid h-[47px] shrink-0 ${sidebarResizing ? 'transition-none' : 'transition-[grid-template-columns] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none'}`}
          style={{
            gridTemplateColumns:
              'var(--workspace-sidebar-preview, var(--workspace-sidebar-width)) minmax(0, 1fr)',
          }}
        >
          <div className="workspace-header-brand relative min-w-0 overflow-hidden">
            <span
              className="absolute top-1/2 z-10 h-7 w-7 -translate-y-1/2 transition-[left] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
              style={{ left: headerBrandLogoOffset }}
            >
              {shouldShowBrandLogo ? (
                <img
                  alt=""
                  className="h-full w-full object-contain"
                  onError={() => setFailedBrandLogo(brandLogo)}
                  src={brandLogo}
                />
              ) : (
                <span className="grid h-full w-full place-items-center rounded-md bg-indigo-50 text-brand">
                  <IconApi aria-hidden="true" size={19} stroke={1.8} />
                </span>
              )}
            </span>
            <div
              className={`absolute left-12 right-3 top-1/2 min-w-0 -translate-y-1/2 overflow-hidden whitespace-nowrap transition-[max-width,opacity] duration-200 ease-out motion-reduce:transition-none ${compactViewport || sidebarCollapsed ? 'max-w-0 opacity-0' : 'max-w-48 opacity-100'}`}
            >
              <p className="truncate text-[13px] font-semibold text-ink">{brandTitle}</p>
            </div>
          </div>
          <button
            aria-label={visibleSidebarCollapsed ? '展开侧边栏' : '折叠侧边栏'}
            aria-pressed={visibleSidebarCollapsed}
            className={`workspace-header-sidebar-toggle-button ${sidebarResizing ? 'transition-none' : ''}`}
            onClick={() => setSidebarCollapsedState(!visibleSidebarCollapsed)}
            style={{
              left: 'calc(var(--workspace-sidebar-preview, var(--workspace-sidebar-width)) - 12px)',
            }}
            title={visibleSidebarCollapsed ? '展开侧边栏' : '折叠侧边栏'}
            type="button"
          >
            {visibleSidebarCollapsed ? (
              <IconChevronRight aria-hidden="true" size={14} stroke={2} />
            ) : (
              <IconChevronLeft aria-hidden="true" size={14} stroke={2} />
            )}
          </button>
          <div className="workspace-topbar">
            <div className="workspace-tabs-shell min-w-0 flex-1">
              <div
                className={`workspace-tabs ${workspaceTabDrag ? 'workspace-tabs-dragging' : ''}`}
                ref={workspaceTabsRef}
                role="tablist"
              >
                {workspaceTabs.map((tab) => (
                  <div
                    aria-selected={tab.id === currentTab?.id}
                    className={`workspace-tab ${tab.id === currentTab?.id ? 'workspace-tab-active' : ''} ${workspaceTabDrag?.tabId === tab.id ? 'workspace-tab-dragging' : ''}`}
                    data-workspace-tab-id={tab.id}
                    draggable
                    key={tab.id}
                    onAuxClick={(event) => {
                      if (event.button !== 1 || !userPreferences.middleClickCloseEnabled) return;
                      event.preventDefault();
                      setTabContextMenu(undefined);
                      closeWorkspaceTab(tab.id);
                    }}
                    onClick={() => {
                      setTabContextMenu(undefined);
                      window.location.hash = tab.route;
                      const tabList = workspaceTabsRef.current;
                      const tabEl = workspaceTabElementRefs.current.get(tab.id);
                      if (tabList && tabEl) {
                        tabList.scrollTo({
                          behavior: globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')
                            .matches
                            ? 'auto'
                            : 'smooth',
                          left: Math.max(
                            0,
                            tabEl.offsetLeft - (tabList.clientWidth - tabEl.clientWidth) / 2,
                          ),
                        });
                      }
                    }}
                    onDragEnd={finishWorkspaceTabDrag}
                    onDragStart={(event) => startWorkspaceTabDrag(event, tab)}
                    onContextMenu={(event) => {
                      event.preventDefault();
                      openWorkspaceTabMenu(tab, event.nativeEvent);
                    }}
                    onMouseDown={(event) => {
                      if (event.button === 1 && userPreferences.middleClickCloseEnabled) {
                        event.preventDefault();
                      }
                    }}
                    ref={(element) => {
                      if (element) workspaceTabElementRefs.current.set(tab.id, element);
                      else workspaceTabElementRefs.current.delete(tab.id);
                    }}
                    role="tab"
                  >
                    <button className="workspace-tab-content" type="button">
                      {tab.home && <IconHome2 aria-hidden="true" size={14} stroke={1.8} />}
                      {!tab.method && tab.id === 'settings:auth' && (
                        <IconShieldLock aria-hidden="true" size={14} stroke={1.8} />
                      )}
                      {!tab.method && tab.id === 'settings:config' && (
                        <IconAdjustments aria-hidden="true" size={14} stroke={1.8} />
                      )}
                      {!tab.method && tab.id === 'export' && (
                        <IconDownload aria-hidden="true" size={14} stroke={1.8} />
                      )}
                      {!tab.method && tab.id.startsWith('model:') && (
                        <IconCube aria-hidden="true" size={14} stroke={1.8} />
                      )}
                      {!tab.method && tab.id.startsWith('markdown:') && (
                        <IconFileText aria-hidden="true" size={14} stroke={1.8} />
                      )}

                      {tab.method && (
                        <HttpMethodBadge
                          active={tab.id === currentTab?.id}
                          location="tab"
                          method={tab.method}
                        />
                      )}
                      <span className="workspace-tab-label" title={tab.label}>
                        {tab.label}
                      </span>
                    </button>
                    {tab.pinned && (
                      <IconPinFilled aria-label="已固定" className="workspace-tab-pin" size={12} />
                    )}
                    {tab.closable && !tab.pinned && (
                      <button
                        aria-label={`关闭 ${tab.label}`}
                        className="workspace-tab-close"
                        draggable={false}
                        onClick={(event) => {
                          event.stopPropagation();
                          setTabContextMenu(undefined);
                          closeWorkspaceTab(tab.id);
                        }}
                        onDragStart={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                        }}
                        type="button"
                      >
                        <IconX aria-hidden="true" size={14} stroke={2} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="workspace-header-tools">
              {isAggregation && services.length > 0 && (
                <div className="hidden items-center gap-2 xl:flex">
                  <span className="sr-only">当前服务</span>
                  <SelectMenu
                    ariaLabel="当前服务"
                    className="workspace-service-select"
                    disabled={loading}
                    onChange={(serviceUrl) => {
                      const service = services.find((item) => item.url === serviceUrl);
                      if (service) {
                        void selectService(service, {
                          docPath: gatewayDocument?.['x-nextdoc4j-aggregation']?.docPath,
                          serviceSwaggerConfigEnabled:
                            gatewayDocument?.['x-nextdoc4j-aggregation']
                              ?.serviceSwaggerConfigEnabled === true,
                        });
                      }
                    }}
                    options={services.map((service) => ({
                      disabled: service.disabled,
                      label: `${service.name}${service.disabled ? '（不可用）' : ''}`,
                      value: service.url,
                    }))}
                    triggerClassName="h-8"
                    value={activeService?.url || ''}
                  />
                </div>
              )}
              <button
                className="workspace-search-trigger"
                type="button"
                onClick={() => setSearchOpen(true)}
                aria-label="全局搜索"
                aria-keyshortcuts="Meta+K Control+K"
              >
                <IconSearch size={14} /> <span>搜索</span>
                <kbd>{/Mac|iPhone|iPad/.test(navigator.platform) ? '⌘K' : 'Ctrl K'}</kbd>
              </button>
              <div className="workspace-theme-control" ref={themeMenuRef}>
                <button
                  aria-controls="workspace-theme-menu"
                  aria-expanded={themeMenuOpen}
                  aria-haspopup="menu"
                  aria-label={`主题设置，当前${themePreferenceLabel}`}
                  className={`workspace-header-action ${themeMenuOpen ? 'workspace-header-action-active' : ''}`}
                  onClick={() => setThemeMenuOpen((current) => !current)}
                  title={`主题：${themePreferenceLabel}`}
                  type="button"
                >
                  <span aria-hidden="true" className="workspace-theme-icon">
                    <IconSun data-theme-icon="light" size={17} stroke={1.8} />
                    <IconMoon data-theme-icon="dark" size={17} stroke={1.8} />
                    <IconDeviceDesktop data-theme-icon="system" size={17} stroke={1.8} />
                  </span>
                </button>
                {themeMenuOpen && (
                  <div
                    aria-label="主题模式"
                    className="workspace-theme-menu"
                    id="workspace-theme-menu"
                    role="menu"
                  >
                    <button
                      aria-checked={themePreference === 'light'}
                      className={`workspace-theme-option ${themePreference === 'light' ? 'workspace-theme-option-active' : ''}`}
                      onClick={() => {
                        changeUserPreferences({ ...userPreferences, theme: 'light' }, true);
                      }}
                      role="menuitemradio"
                      type="button"
                    >
                      <IconSun aria-hidden="true" size={16} stroke={1.8} />
                      <span>浅色模式</span>
                      {themePreference === 'light' && (
                        <IconCheck
                          aria-hidden="true"
                          className="workspace-theme-option-check"
                          size={15}
                          stroke={2}
                        />
                      )}
                    </button>
                    <button
                      aria-checked={themePreference === 'dark'}
                      className={`workspace-theme-option ${themePreference === 'dark' ? 'workspace-theme-option-active' : ''}`}
                      onClick={() => {
                        changeUserPreferences({ ...userPreferences, theme: 'dark' }, true);
                      }}
                      role="menuitemradio"
                      type="button"
                    >
                      <IconMoon aria-hidden="true" size={16} stroke={1.8} />
                      <span>深色模式</span>
                      {themePreference === 'dark' && (
                        <IconCheck
                          aria-hidden="true"
                          className="workspace-theme-option-check"
                          size={15}
                          stroke={2}
                        />
                      )}
                    </button>
                    <button
                      aria-checked={themePreference === 'system'}
                      className={`workspace-theme-option ${themePreference === 'system' ? 'workspace-theme-option-active' : ''}`}
                      onClick={() => {
                        changeUserPreferences({ ...userPreferences, theme: 'system' }, true);
                      }}
                      role="menuitemradio"
                      type="button"
                    >
                      <IconDeviceDesktop aria-hidden="true" size={16} stroke={1.8} />
                      <span>跟随系统</span>
                      {themePreference === 'system' && (
                        <IconCheck
                          aria-hidden="true"
                          className="workspace-theme-option-check"
                          size={15}
                          stroke={2}
                        />
                      )}
                    </button>
                  </div>
                )}
              </div>
              <button
                aria-label="偏好设置"
                className={`workspace-header-action ${preferencesDrawerOpen ? 'workspace-header-action-active' : ''}`}
                onClick={() => {
                  setThemeMenuOpen(false);
                  setPreferencesDrawerOpen(true);
                }}
                title="偏好设置"
                type="button"
              >
                <IconSettings aria-hidden="true" size={17} stroke={1.8} />
              </button>
            </div>
          </div>
          {tabContextMenu && contextMenuTab && (
            <div
              aria-label={`${contextMenuTab.label} 标签操作`}
              className="workspace-tab-context-menu"
              ref={tabContextMenuRef}
              role="menu"
              style={{ left: tabContextMenu.left, top: tabContextMenu.top }}
            >
              <button
                disabled={!canCloseContextMenuTab}
                onClick={() => {
                  closeWorkspaceTab(contextMenuTab.id);
                  setTabContextMenu(undefined);
                }}
                role="menuitem"
                type="button"
              >
                <IconX aria-hidden="true" size={16} stroke={1.8} />
                <span>关闭</span>
              </button>
              <button
                disabled={Boolean(contextMenuTab.home)}
                onClick={() => {
                  toggleWorkspaceTabPin(contextMenuTab.id);
                  setTabContextMenu(undefined);
                }}
                role="menuitemcheckbox"
                type="button"
              >
                {contextMenuTab.pinned ? (
                  <IconPinFilled aria-hidden="true" size={16} stroke={1.8} />
                ) : (
                  <IconPin aria-hidden="true" size={16} stroke={1.8} />
                )}
                <span>{contextMenuTab.pinned ? '取消固定' : '固定'}</span>
              </button>
              <button
                onClick={() => {
                  toggleWorkspaceFullscreen();
                  setTabContextMenu(undefined);
                }}
                role="menuitem"
                type="button"
              >
                {workspaceFullscreen ? (
                  <IconArrowsMinimize aria-hidden="true" size={16} stroke={1.8} />
                ) : (
                  <IconArrowsMaximize aria-hidden="true" size={16} stroke={1.8} />
                )}
                <span>{workspaceFullscreen ? '退出最大化' : '最大化'}</span>
              </button>
              <button onClick={reloadWorkspace} role="menuitem" type="button">
                <IconRefresh aria-hidden="true" size={16} stroke={1.8} />
                <span>重新加载</span>
              </button>
              <button
                onClick={() => {
                  openWorkspaceTabInNewWindow(contextMenuTab);
                  setTabContextMenu(undefined);
                }}
                role="menuitem"
                type="button"
              >
                <IconExternalLink aria-hidden="true" size={16} stroke={1.8} />
                <span>在新窗口打开</span>
              </button>
              <div aria-hidden="true" className="workspace-tab-context-divider" />
              <button
                disabled={!canCloseTabsLeft}
                onClick={() => {
                  closeWorkspaceTabs(
                    workspaceTabs.slice(0, contextMenuTabIndex).map((tab) => tab.id),
                  );
                  setTabContextMenu(undefined);
                }}
                role="menuitem"
                type="button"
              >
                <IconArrowBarLeft aria-hidden="true" size={16} stroke={1.8} />
                <span>关闭左侧标签页</span>
              </button>
              <button
                disabled={!canCloseTabsRight}
                onClick={() => {
                  closeWorkspaceTabs(
                    workspaceTabs.slice(contextMenuTabIndex + 1).map((tab) => tab.id),
                  );
                  setTabContextMenu(undefined);
                }}
                role="menuitem"
                type="button"
              >
                <IconArrowBarRight aria-hidden="true" size={16} stroke={1.8} />
                <span>关闭右侧标签页</span>
              </button>
              <div aria-hidden="true" className="workspace-tab-context-divider" />
              <button
                disabled={!canCloseOtherTabs}
                onClick={() => {
                  closeWorkspaceTabs(
                    workspaceTabs
                      .filter((tab) => tab.id !== contextMenuTab.id)
                      .map((tab) => tab.id),
                  );
                  setTabContextMenu(undefined);
                }}
                role="menuitem"
                type="button"
              >
                <IconArrowsLeftRight aria-hidden="true" size={16} stroke={1.8} />
                <span>关闭其它标签页</span>
              </button>
              <button
                disabled={!canCloseAnyTabs}
                onClick={() => {
                  closeWorkspaceTabs(workspaceTabs.map((tab) => tab.id));
                  setTabContextMenu(undefined);
                }}
                role="menuitem"
                type="button"
              >
                <IconArrowsLeftRight aria-hidden="true" size={16} stroke={1.8} />
                <span>关闭全部标签页</span>
              </button>
            </div>
          )}
        </header>
        <div className="workspace-body min-h-0 flex flex-1">
          <Sidebar
            collapsed={visibleSidebarCollapsed}
            groupOverviewEnabled={groupOverviewEnabled}
            hasSecuritySchemes={securitySchemes.length > 0}
            maxWidth={sidebarMaxWidth}
            markdownGroups={markdownGroups}
            navigationExpansion={userPreferences.navigationExpansion}
            onExpandForInitialSelection={expandSidebarForInitialSelection}
            onNavigate={navigate}
            onResizeChange={setSidebarResizing}
            onSelectSettings={selectSettingsSection}
            onSelectGroup={selectOperationGroup}
            onSelectMarkdown={selectMarkdownDocument}
            onSelect={selectOperation}
            onSelectModel={selectModel}
            onWidthChange={setSidebarWidth}
            selectedKey={
              selectedOperation ? getDocumentationOperationKey(selectedOperation) : undefined
            }
            selectedGroup={currentView === 'docs' ? hashState.group : undefined}
            selectedMarkdown={selectedMarkdownDocument}
            selectedModelName={hashState.modelName}
            selectedSourceGroupId={hashState.sourceGroupId}
            settingsSection={settingsSection}
            sources={documentationSources}
            minWidth={sidebarMinWidth}
            view={currentView}
            width={sidebarWidth}
          />
          {compactViewport && compactSidebarOpen && (
            <button
              aria-label="关闭侧边栏"
              className="workspace-sidebar-backdrop"
              onClick={() => setCompactSidebarOpen(false)}
              type="button"
            />
          )}
          <div
            className={`workspace-content-shell workspace-content-${userPreferences.contentWidth}`}
          >
            {userPreferences.watermarkEnabled && (
              <div aria-hidden="true" className="workspace-watermark">
                {Array.from({ length: 16 }, (_, index) => (
                  <span key={index}>{brandTitle}</span>
                ))}
              </div>
            )}
            <main
              className={`workspace-content-main workspace-scrollbar ${playgroundOpen ? 'overflow-hidden' : 'overflow-y-auto'}`}
              onScroll={playgroundOpen ? undefined : handleContentScroll}
              ref={contentRef}
            >
              {persistenceError && (
                <div role="alert" className="m-4 rounded-xl border border-amber-200 p-4">
                  {persistenceError}
                  <button
                    type="button"
                    onClick={() => void retryPersistence().catch(reportPersistenceFailure)}
                  >
                    重试保存
                  </button>
                </div>
              )}
              {error && (
                <div className="m-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  {error}
                </div>
              )}
              {groupDocumentErrors.length > 0 && (
                <div className="mx-4 mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  有 {groupDocumentErrors.length} 个 SpringDoc 分组未加载：
                  {groupDocumentErrors.map((item) => item.name).join('、')}。主文档仍可正常使用。
                </div>
              )}
              <ContentErrorBoundary resetKeys={[hashState, document, activeDocumentationDocument]}>
                <Suspense
                  fallback={
                    <PageLoadingIndicator
                      brandLogo={brandLogo}
                      brandTitle={brandTitle}
                      hasCustomTitle={resolvedBrand.hasCustomTitle}
                    />
                  }
                >
                  {playgroundOpen &&
                  selectedOperation &&
                  !operationStorageReady &&
                  preparedIdentity !== persistentOperationKey ? (
                    <PageLoadingIndicator
                      brandLogo={brandLogo}
                      brandTitle={brandTitle}
                      hasCustomTitle={resolvedBrand.hasCustomTitle}
                    />
                  ) : playgroundOpen && selectedOperation && playgroundDocument ? (
                    <Playground
                      key={`${getWorkspaceOperationKey(selectedOperation)}:${storageScopeToken}`}
                      debugCacheEnabled={debugCacheEnabled}
                      cacheRevision={debugCacheRevision}
                      document={playgroundDocument}
                      previousDocument={
                        previousWorkspaceRef.current?.activeService?.url === activeService?.url
                          ? (previousWorkspaceRef.current?.sourceGroupDocuments.find(
                              (source) => source.url === activeDocumentationSource?.documentUrl,
                            )?.document ?? previousWorkspaceRef.current?.mainDocument)
                          : undefined
                      }
                      editableGlobalHeaders={globalHeaders}
                      editableGlobalQueryParams={globalQueryParams}
                      globalHeaders={effectiveGlobalHeaders}
                      globalQueryParams={effectiveGlobalQueryParams}
                      onGlobalHeadersChange={setGlobalHeaders}
                      onGlobalQueryParamsChange={setGlobalQueryParams}
                      onClose={() => {
                        window.location.hash = createHashRoute({
                          ...hashState,
                          debug: undefined,
                          debugTab: undefined,
                          debugBody: undefined,
                        });
                      }}
                      debugTab={hashState.debugTab}
                      debugTabExplicit={hashState.debugTabExplicit}
                      debugBody={hashState.debugBody}
                      onDebugRouteChange={updateDebugRoute}
                      onSecurityValuesChange={(values) =>
                        setAuthPreferences((current) => ({ ...current, values }))
                      }
                      operation={selectedOperation}
                      storageScope={storageScopeToken}
                      requestPrefix={activeRequestPrefix}
                      requestVariants={playgroundVariants}
                      securityValues={authPreferences.values}
                    />
                  ) : currentView === 'models' ? (
                    <ModelsPage
                      document={activeDocumentationDocument ?? document}
                      selectedName={hashState.modelName}
                    />
                  ) : currentView === 'export' ? (
                    <ExportPage
                      aggregationServices={isAggregation ? services : emptyAggregationServices}
                      document={document}
                      key={activeService?.url || 'single-app'}
                      onLoadAggregationDocuments={
                        isAggregation ? loadAggregationExportDocuments : undefined
                      }
                      documentDescription={apiDocsDocument?.info?.description || ''}
                      documentTitle={brandTitle}
                      serviceDocumentUrl={activeService?.url}
                      sources={documentationSources}
                    />
                  ) : currentView === 'markdown' ? (
                    <MarkdownReader document={selectedMarkdownDocument} />
                  ) : currentView === 'settings' ? (
                    <ManagementPage
                      configurationServiceUrl={activeService?.url}
                      configurationServices={configurationServices}
                      globalDefaultHeaders={globalDefaultHeaders}
                      globalDefaultQueryParams={globalDefaultQueryParams}
                      globalHeaders={globalHeaders}
                      globalQueryParams={globalQueryParams}
                      isAggregation={isAggregation}
                      onConfigurationServiceChange={selectConfigurationService}
                      onGlobalHeadersChange={setGlobalHeaders}
                      onGlobalQueryParamsChange={setGlobalQueryParams}
                      onGlobalDefaultHeadersChange={setGlobalDefaultHeaders}
                      onGlobalDefaultQueryParamsChange={setGlobalDefaultQueryParams}
                      onSecurityValuesChange={(values) =>
                        setAuthPreferences((current) => ({ ...current, values }))
                      }
                      section={settingsSection}
                      securitySchemes={securitySchemes}
                      securityValues={authPreferences.values}
                    />
                  ) : selectedOperation ? (
                    <OperationDetail
                      storageReady={
                        operationStorageReady || preparedIdentity === persistentOperationKey
                      }
                      storageDocumentUrl={
                        activeDocumentationSource?.documentUrl || gatewayDocumentUrl
                      }
                      document={activeDocumentationDocument ?? document}
                      onOpenPlayground={openPlayground}
                      operation={selectedOperation}
                      storageScope={storageScopeToken}
                      requestPrefix={activeRequestPrefix}
                    />
                  ) : currentView === 'docs' && !hashState.sourceGroupId && !hashState.group ? (
                    <HomePage
                      activeService={activeService}
                      document={apiDocsDocument ?? document}
                      statisticsDocument={playgroundDocument ?? document}
                      isAggregation={isAggregation}
                      markdownCount={markdownGroups.reduce(
                        (total, [, markdownDocuments]) => total + markdownDocuments.length,
                        0,
                      )}
                      onNavigate={navigate}
                      onOpenMarkdown={() => {
                        const firstMarkdownDocument = markdownGroups[0]?.[1][0];
                        if (firstMarkdownDocument) selectMarkdownDocument(firstMarkdownDocument);
                      }}
                      onSelectService={(service) => {
                        void selectService(service, {
                          docPath: gatewayDocument?.['x-nextdoc4j-aggregation']?.docPath,
                          serviceSwaggerConfigEnabled:
                            gatewayDocument?.['x-nextdoc4j-aggregation']
                              ?.serviceSwaggerConfigEnabled === true,
                        });
                      }}
                      onSelectSettings={selectSettingsSection}
                      operations={overviewOperations}
                      services={services}
                    />
                  ) : (
                    <Overview
                      document={activeDocumentationDocument ?? document}
                      onSelect={selectOperation}
                      operations={overviewOperations}
                      title={hashState.group || activeDocumentationSource?.name}
                    />
                  )}
                </Suspense>
              </ContentErrorBoundary>
            </main>
            {!playgroundOpen &&
              ((currentView === 'docs' && selectedOperation) ||
                currentView === 'models' ||
                currentView === 'markdown') && (
                <ScrollProgress key={currentTab?.id} containerRef={contentRef} />
              )}
            {brandFooterText && userPreferences.copyrightEnabled && (
              <footer className="workspace-copyright">
                <CopyrightText value={brandFooterText} />
              </footer>
            )}
          </div>
        </div>
      </div>
      <PreferencesDrawer
        allDebugCacheEnabled={allDebugCacheEnabled}
        allGroupOverviewEnabled={allGroupOverviewEnabled}
        brandFooterText={brandFooterText}
        configurationServiceUrl={activeService?.url}
        configurationServices={configurationServices}
        debugCacheEnabled={debugCacheEnabled}
        getAllDebugDraftCount={getAllDebugDraftCount}
        getDebugDraftCount={getActiveDebugDraftCount}
        groupOverviewEnabled={groupOverviewEnabled}
        isAggregation={isAggregation}
        onAllDebugCacheEnabledChange={updateAllDebugCacheEnabled}
        onAllGroupOverviewEnabledChange={(enabled) => {
          updateAllGroupOverviewEnabled(enabled);
          if (!enabled && hashState.group && !selectedOperation) {
            navigate('docs', hashState.sourceGroupId);
          }
        }}
        onChange={changeUserPreferences}
        onClearAllDebugDrafts={clearAllDebugDrafts}
        onClearDebugDrafts={clearActiveDebugDrafts}
        onClose={() => setPreferencesDrawerOpen(false)}
        onDebugCacheEnabledChange={setDebugCacheEnabled}
        onGroupOverviewEnabledChange={(enabled) => {
          setGroupOverviewEnabled(enabled);
          if (!enabled && hashState.group && !selectedOperation) {
            navigate('docs', hashState.sourceGroupId);
          }
        }}
        onReset={restoreDefaultPreferences}
        open={preferencesDrawerOpen}
        operationGroupCount={operationGroupCount}
        preferences={userPreferences}
        unavailableServiceCount={unavailableServiceCount}
      />
    </div>
  );
}

function LoadingScreen({
  brandLogo,
  brandTitle,
  hasCustomTitle,
}: {
  brandLogo?: string;
  brandTitle?: string;
  hasCustomTitle?: boolean;
}) {
  return (
    <div className="workspace-loading-screen grid min-h-screen place-items-center">
      <WorkspaceLoading
        mode="screen"
        logo={brandLogo}
        title={brandTitle}
        hasCustomTitle={hasCustomTitle}
      />
    </div>
  );
}

/**
 * Shows a compact placeholder while a route-level workspace page is loaded on demand.
 *
 * @returns A page-area loading indicator that preserves the surrounding workspace layout.
 */
function PageLoadingIndicator({
  brandLogo,
  brandTitle,
  hasCustomTitle,
}: {
  brandLogo?: string;
  brandTitle?: string;
  hasCustomTitle?: boolean;
}) {
  return (
    <div className="grid min-h-full place-items-center p-8">
      <WorkspaceLoading
        mode="page"
        logo={brandLogo}
        title={brandTitle}
        hasCustomTitle={hasCustomTitle}
        statusText="正在加载页面"
      />
    </div>
  );
}

function ErrorScreen({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="grid min-h-screen place-items-center bg-canvas p-5">
      <section className="panel max-w-md p-7 text-center">
        <p className="text-lg font-semibold">无法打开 API 文档</p>
        <p className="mt-3 text-sm leading-6 text-muted">{error}</p>
        <button className="button-primary mt-6" onClick={onRetry} type="button">
          重新加载
        </button>
      </section>
    </div>
  );
}
