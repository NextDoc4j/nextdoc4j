import type { Dispatch, RefObject, SetStateAction } from 'react';
import { useEffect, useMemo } from 'react';
import {
  getOperationRoute,
  parseHashRoute,
  parseValidHashRoute,
  createHashRoute as serializeHashRoute,
  type AppView,
  type HashRouteState,
} from '../../lib/hash-route';
import type { ApiOperation, OpenApiDocument, ServiceDefinition } from '../../types/openapi';
import { createServiceScope } from '../aggregation/scope';
import type { MarkdownDocument } from '../documentation/markdown';
import type { DocumentationSource } from '../documentation/workspace';
import {
  allOperationsSourceId,
  findDocumentationOperation,
  getWorkspaceOperationKey,
} from '../documentation/workspace';
import type { ManagementSection } from '../management/management-page';
import { type UserPreferences } from '../preferences/storage';
import { readPersistedWorkspace, writePersistedWorkspace } from '../preferences/workspace';
import { applicationLocalStorage, applicationSessionStorage } from './storage/browser-storage';
import { readSessionWorkspaceTabs, writeSessionWorkspaceTabs } from './storage/session';
import type { WorkspaceTabDragState } from './tabs';
import { orderWorkspaceTabs, type WorkspaceTab } from './tabs';

interface Inputs {
  routeMatchesActiveService: boolean;
  currentView: AppView;
  selectedOperation: ApiOperation | undefined;
  activeDocumentationSource: DocumentationSource | undefined;
  gatewayDocumentUrl: '/v3/api-docs';
  createHashRoute: (route: HashRouteState) => string;
  hashState: HashRouteState;
  activeDocumentationDocument: OpenApiDocument | undefined;
  selectedMarkdownDocument: MarkdownDocument | undefined;
  settingsSection: ManagementSection;
  activeService: ServiceDefinition | undefined;
  document: OpenApiDocument | undefined;
  userPreferencesRef: RefObject<UserPreferences>;
  documentationSources: DocumentationSource[];
  setWorkspaceTabs: Dispatch<SetStateAction<WorkspaceTab[]>>;
  setHydratedWorkspaceTabsStorageKey: Dispatch<SetStateAction<string | undefined>>;
  loading: boolean;
  hydratedWorkspaceTabsStorageKey: string | undefined;
  workspaceTabs: WorkspaceTab[];
  userPreferences: UserPreferences;
  workspaceTabsOrderRef: RefObject<WorkspaceTab[]>;
  workspaceTabsScopeRef: RefObject<string | undefined>;
  storageScopeToken: string;
  workspaceTabDragRef: RefObject<WorkspaceTabDragState | undefined>;
  workspaceTabsRef: RefObject<HTMLDivElement | null>;
  workspaceTabElementRefs: RefObject<Map<string, HTMLDivElement>>;
}
/** Owns WorkspaceTabs state and lifecycle for its caller.
 * @param input Explicit domain inputs and callbacks.
 * @returns Derived state and operations consumed by the composing view.
 */
export function useWorkspaceTabs({
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
}: Inputs) {
  const currentTab = useMemo<WorkspaceTab | undefined>(() => {
    if (!routeMatchesActiveService) return undefined;
    if (currentView === 'docs') {
      if (selectedOperation) {
        return {
          closable: true,
          id: `operation:${getWorkspaceOperationKey(selectedOperation)}`,
          label: selectedOperation.summary || selectedOperation.path,
          method: selectedOperation.method,
          operation: {
            method: selectedOperation.method,
            path: selectedOperation.path,
            documentUrl: activeDocumentationSource?.documentUrl || gatewayDocumentUrl,
          },
          route: createHashRoute({
            debug: hashState.debug,
            group: selectedOperation.group,
            ...getOperationRoute(selectedOperation, activeDocumentationDocument!),
            sourceGroupId: selectedOperation.sourceGroupId,
            view: 'docs',
          }),
        };
      }
      return hashState.sourceGroupId
        ? undefined
        : {
            closable: false,
            home: true,
            id: 'home',
            label: '主页',
            route: createHashRoute({ view: 'docs' }),
          };
    }
    if (currentView === 'models') {
      if (!hashState.modelName) return undefined;
      return {
        closable: true,
        id: `model:${hashState.sourceGroupId || allOperationsSourceId}:${hashState.modelName || ''}`,
        label: hashState.modelName || activeDocumentationSource?.name || '全部实体',
        route: createHashRoute({
          modelName: hashState.modelName,
          sourceGroupId: hashState.sourceGroupId,
          view: 'models',
        }),
      };
    }
    if (currentView === 'markdown') {
      return {
        closable: true,
        id: `markdown:${hashState.group || ''}:${hashState.markdownName || ''}`,
        label: selectedMarkdownDocument?.displayName || '其他文档',
        route: createHashRoute({
          group: hashState.group,
          markdownName: hashState.markdownName,
          view: 'markdown',
        }),
      };
    }
    return {
      closable: true,
      id: currentView === 'settings' ? `settings:${settingsSection}` : currentView,
      label:
        currentView === 'export'
          ? '文档下载'
          : settingsSection === 'auth'
            ? '全局认证'
            : '全局参数',
      route: createHashRoute({
        ...(currentView === 'settings' ? { settingsSection } : {}),
        view: currentView,
      }),
    };
  }, [
    routeMatchesActiveService,
    currentView,
    settingsSection,
    createHashRoute,
    selectedOperation,
    hashState.sourceGroupId,
    hashState.debug,
    hashState.modelName,
    hashState.group,
    hashState.markdownName,
    activeDocumentationSource?.documentUrl,
    activeDocumentationSource?.name,
    gatewayDocumentUrl,
    activeDocumentationDocument,
    selectedMarkdownDocument?.displayName,
  ]);
  const pendingModelTabId =
    currentView === 'models' && hashState.modelName
      ? `model:${hashState.sourceGroupId || allOperationsSourceId}:`
      : undefined;
  const workspaceTabsStorageKey = useMemo(
    () => createServiceScope(activeService?.url),
    [activeService?.url],
  );

  useEffect(() => {
    if (!document) return;
    const persistedTabs = userPreferencesRef.current.restoreTabsEnabled
      ? readPersistedWorkspace(applicationLocalStorage, activeService?.url).tabs
      : [];
    const sessionTabs = userPreferencesRef.current.restoreTabsEnabled
      ? readSessionWorkspaceTabs(
          applicationSessionStorage,
          applicationLocalStorage,
          activeService?.url,
        )
      : [];
    const restoredTabs = sessionTabs.length > 0 ? sessionTabs : persistedTabs;
    const uniqueTabs = new Map<string, WorkspaceTab>();
    for (const storedTab of restoredTabs) {
      let tab = storedTab;
      if (tab.operation) {
        const source =
          documentationSources.find((item) => item.documentUrl === tab.operation!.documentUrl) ??
          documentationSources.find((item) =>
            item.operations.some(
              (operation) =>
                operation.method === tab.operation!.method &&
                operation.path === tab.operation!.path,
            ),
          );
        const operation = source?.operations.find(
          (item) => item.method === tab.operation!.method && item.path === tab.operation!.path,
        );
        if (source && operation)
          tab = {
            ...tab,
            route: createHashRoute({
              view: 'docs',
              sourceGroupId: source.id,
              ...getOperationRoute(operation, source.document),
              debug: parseHashRoute(tab.route).debug,
            }),
            label: operation.summary || operation.path,
          };
      }
      const route = parseValidHashRoute(tab.route);
      if (!route) continue;
      tab = { ...tab, route: serializeHashRoute(route) };
      const operation = findDocumentationOperation(
        documentationSources,
        route.sourceGroupId,
        route.operationId,
        route.operationPath,
        route.operationMethod,
      );
      const id = operation ? `operation:${getWorkspaceOperationKey(operation)}` : tab.id;
      const existing = uniqueTabs.get(id);
      const preferred = !existing || tab.route === window.location.hash ? tab : existing;
      uniqueTabs.set(id, {
        ...preferred,
        id,
        pinned: Boolean(existing?.pinned || tab.pinned),
      });
    }
    setWorkspaceTabs(orderWorkspaceTabs([...uniqueTabs.values()]));
    setHydratedWorkspaceTabsStorageKey(workspaceTabsStorageKey);
  }, [
    activeService?.url,
    createHashRoute,
    document,
    documentationSources,
    setHydratedWorkspaceTabsStorageKey,
    setWorkspaceTabs,
    userPreferencesRef,
    workspaceTabsStorageKey,
  ]);

  useEffect(() => {
    if (
      !document ||
      loading ||
      !routeMatchesActiveService ||
      hydratedWorkspaceTabsStorageKey !== workspaceTabsStorageKey
    )
      return;
    try {
      writeSessionWorkspaceTabs(
        applicationSessionStorage,
        applicationLocalStorage,
        workspaceTabs,
        activeService?.url,
      );
      if (userPreferences.restoreTabsEnabled) {
        writePersistedWorkspace(
          applicationLocalStorage,
          { activeRoute: window.location.hash || '#/home', tabs: workspaceTabs },
          activeService?.url,
        );
      }
    } catch {
      // Workspace tabs remain available for the current page when storage is unavailable.
    }
  }, [
    activeService?.url,
    document,
    hydratedWorkspaceTabsStorageKey,
    workspaceTabs,
    workspaceTabsStorageKey,
    userPreferences.restoreTabsEnabled,
    loading,
    routeMatchesActiveService,
  ]);

  useEffect(() => {
    if (!document || !currentTab || hydratedWorkspaceTabsStorageKey !== workspaceTabsStorageKey)
      return;
    setWorkspaceTabs((current) => {
      const nextTabs = pendingModelTabId
        ? current.filter((tab) => tab.id !== pendingModelTabId)
        : current;
      const existing = nextTabs.find((tab) => tab.id === currentTab.id);
      if (existing) {
        if (existing.label === currentTab.label && existing.route === currentTab.route)
          return nextTabs;
        return orderWorkspaceTabs(
          nextTabs.map((tab) =>
            tab.id === currentTab.id ? { ...currentTab, pinned: tab.pinned } : tab,
          ),
        );
      }
      return orderWorkspaceTabs([...nextTabs, currentTab]);
    });
  }, [
    currentTab,
    document,
    hydratedWorkspaceTabsStorageKey,
    pendingModelTabId,
    setWorkspaceTabs,
    workspaceTabsStorageKey,
  ]);

  useEffect(() => {
    workspaceTabsOrderRef.current = workspaceTabs;
    if (hydratedWorkspaceTabsStorageKey === workspaceTabsStorageKey) {
      workspaceTabsScopeRef.current = storageScopeToken;
    }
  }, [
    workspaceTabs,
    hydratedWorkspaceTabsStorageKey,
    workspaceTabsStorageKey,
    storageScopeToken,
    workspaceTabsOrderRef,
    workspaceTabsScopeRef,
  ]);

  useEffect(() => {
    if (!currentTab || workspaceTabDragRef.current) return;
    const tabList = workspaceTabsRef.current;
    const tab = workspaceTabElementRefs.current.get(currentTab.id);
    if (!tabList || !tab) return;
    tabList.scrollTo({
      behavior: globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches
        ? 'auto'
        : 'smooth',
      left: Math.max(0, tab.offsetLeft - (tabList.clientWidth - tab.clientWidth) / 2),
    });
  }, [currentTab, workspaceTabs, workspaceTabDragRef, workspaceTabsRef, workspaceTabElementRefs]);

  /**
   * Closes one or more ordinary workspace tabs and navigates away when the current tab is removed.
   *
   * @param tabIds Stable identifiers of tabs requested for closing.
   * @returns Nothing; fixed and non-closable tabs remain open.
   */
  const closeWorkspaceTabs = (tabIds: string[]) => {
    const requestedIds = new Set(tabIds);
    const currentIndex = currentTab
      ? workspaceTabs.findIndex((tab) => tab.id === currentTab.id)
      : -1;
    const closesCurrent = Boolean(
      currentTab &&
      requestedIds.has(currentTab.id) &&
      workspaceTabs.find((tab) => tab.id === currentTab.id)?.closable &&
      !workspaceTabs.find((tab) => tab.id === currentTab.id)?.pinned,
    );
    const closesAllTabs =
      requestedIds.size === workspaceTabs.length &&
      workspaceTabs.every((tab) => requestedIds.has(tab.id));
    const nextTabs = closesAllTabs
      ? [
          {
            closable: false,
            home: true,
            id: 'home',
            label: '主页',
            route: createHashRoute({ view: 'docs' }),
          },
        ]
      : workspaceTabs.filter((tab) => !requestedIds.has(tab.id) || !tab.closable || tab.pinned);
    setWorkspaceTabs(nextTabs);
    if (!closesCurrent) return;
    const fallback = nextTabs[currentIndex] ??
      nextTabs[currentIndex - 1] ?? {
        route: createHashRoute({ view: 'docs' }),
      };
    window.location.hash = fallback.route;
  };

  /**
   * Closes one ordinary workspace tab and returns to an adjacent destination when needed.
   *
   * @param tabId Stable identifier of the tab to close.
   * @returns Nothing; delegates range handling to the protected tab closer.
   */
  const closeWorkspaceTab = (tabId: string) => closeWorkspaceTabs([tabId]);

  /**
   * Toggles whether one workspace tab remains fixed at the beginning of the tab strip.
   *
   * @param tabId Stable identifier of the tab to update.
   * @returns Nothing; reorders the persisted tab list after the fixed-state change.
   */
  const toggleWorkspaceTabPin = (tabId: string) => {
    setWorkspaceTabs((current) =>
      orderWorkspaceTabs(
        current.map((tab) => (tab.id === tabId ? { ...tab, pinned: !tab.pinned } : tab)),
      ),
    );
  };

  return { currentTab, closeWorkspaceTab, toggleWorkspaceTabPin, closeWorkspaceTabs };
}
