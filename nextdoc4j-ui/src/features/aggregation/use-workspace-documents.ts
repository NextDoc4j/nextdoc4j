import type { Dispatch, RefObject, SetStateAction } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getRouteKey, parseHashRoute, type HashRouteState } from '../../lib/hash-route';
import type { OpenApiDocument, ServiceDefinition, SwaggerConfig } from '../../types/openapi';
import { resolveBrandMetadata, writeStoredBrand, type BrandMetadata } from '../brand/brand';
import { createDocumentationSources } from '../documentation/workspace';
import type { GlobalHeader } from '../playground/types';
import { type UserPreferences } from '../preferences/storage';
import { writePersistedWorkspace } from '../preferences/workspace';
import { type AuthPreferences } from '../security/storage';
import {
  applicationLocalStorage,
  applicationSessionStorage,
} from '../workspace/storage/browser-storage';
import { registerWorkspaceServices, scopeForService } from '../workspace/storage/identity';
import { migrateServiceStorage, migrateWorkspaceStorage } from '../workspace/storage/migration';
import {
  flushPending,
  prepareWorkspace,
  reportPersistenceFailure,
} from '../workspace/storage/repository';
import {
  readSessionActiveServiceUrl,
  writeSessionActiveServiceUrl,
  writeSessionWorkspaceHash,
  writeSessionWorkspaceScroll,
} from '../workspace/storage/session';
import { readWorkspaceScopeSettings } from '../workspace/storage/settings';
import { type WorkspaceTab } from '../workspace/tabs';
import type { OpenApiCacheStore } from './cache/database';
import type { OpenApiResourceLoader } from './cache/revalidate';
import {
  clearLegacyWorkspaceDocument,
  restoreOpenApiWorkspace,
  saveOpenApiWorkspace,
  type CachedOpenApiWorkspace,
} from './cache/workspace';
import type { ServiceDocumentRepository } from './service-document-repository';
import {
  type ServiceGroupDocument,
  type ServiceGroupDocumentError,
  type ServiceWorkspaceLoadOptions,
} from './service-document-repository';
import {
  isAggregationEnabled,
  markServiceUnavailable,
  probeServices,
  selectAvailableService,
  sortServices,
  toServiceDefinitions,
} from './service-manager';
import type { SingleDocumentRepository } from './single-document-repository';
import { resolveServiceDocumentPrefix } from './url';

interface Inputs {
  serviceDocumentRepository: RefObject<ServiceDocumentRepository>;
  singleDocumentRepository: RefObject<SingleDocumentRepository>;
  servicesRef: RefObject<ServiceDefinition[]>;
  setSettingsServiceDocumentUrl: Dispatch<SetStateAction<string | undefined>>;
  setAuthPreferences: Dispatch<SetStateAction<AuthPreferences>>;
  getStoredAuthPreferences: (serviceDocumentUrl?: string) => AuthPreferences;
  setGlobalHeaders: Dispatch<SetStateAction<GlobalHeader[]>>;
  setGlobalQueryParams: Dispatch<SetStateAction<GlobalHeader[]>>;
  setDebugCacheEnabled: Dispatch<SetStateAction<boolean>>;
  setGroupOverviewEnabled: Dispatch<SetStateAction<boolean>>;
  activeServiceRef: RefObject<ServiceDefinition | null>;
  setBrandSnapshot: Dispatch<SetStateAction<BrandMetadata>>;
  openApiResourceLoader: RefObject<OpenApiResourceLoader>;
  contentRef: RefObject<HTMLElement | null>;
  userPreferencesRef: RefObject<UserPreferences>;
  workspaceTabsOrderRef: RefObject<WorkspaceTab[]>;
  serviceSwitchController: RefObject<AbortController | null>;
  createHashRoute: (route: HashRouteState) => string;
  getRestoredWorkspaceHash: (serviceDocumentUrl?: string) => string;
  openApiCacheStore: RefObject<OpenApiCacheStore>;
  initialServiceUrl: string | undefined;
  gatewayDocumentUrl: '/v3/api-docs';
  gatewayConfigUrl: '/v3/api-docs/swagger-config';
  replaceWithHome: () => void;
}
/** Owns WorkspaceDocuments state and lifecycle for its caller.
 * @param input Explicit domain inputs and callbacks.
 * @returns Derived state and operations consumed by the composing view.
 */
export function useWorkspaceDocuments({
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
}: Inputs) {
  const [gatewayDocument, setGatewayDocument] = useState<OpenApiDocument>();
  const [gatewayConfig, setGatewayConfig] = useState<SwaggerConfig>();
  const [document, setDocument] = useState<OpenApiDocument>();
  const [mainDocument, setMainDocument] = useState<OpenApiDocument>();
  const [sourceGroupDocuments, setSourceGroupDocuments] = useState<ServiceGroupDocument[]>([]);
  const [services, setServices] = useState<ServiceDefinition[]>([]);
  const [activeService, setActiveService] = useState<ServiceDefinition>();
  const [loading, setLoading] = useState(true);
  const [workspaceCacheReady, setWorkspaceCacheReady] = useState(false);
  const previousWorkspaceRef = useRef<CachedOpenApiWorkspace | undefined>(undefined);
  const [error, setError] = useState('');
  const [groupDocumentErrors, setGroupDocumentErrors] = useState<ServiceGroupDocumentError[]>([]);

  /** Reloads the workspace after invalidating runtime document caches.
   * @param None; uses the owned repositories.
   * @returns Nothing; requests a browser reload.
   */
  const reloadWorkspace = useCallback(() => {
    serviceDocumentRepository.current.clear();
    singleDocumentRepository.current.clear();
    globalThis.location.reload();
  }, [serviceDocumentRepository, singleDocumentRepository]);

  /** Updates registered service identities and their visible list together.
   * @param nextServices Complete discovered service list.
   * @returns Nothing; stores consistent service metadata.
   */
  const replaceServices = useCallback(
    (nextServices: ServiceDefinition[]) => {
      registerWorkspaceServices(nextServices);
      servicesRef.current = nextServices;
      setServices(nextServices);
    },
    [servicesRef],
  );

  /**
   * Loads client-side preferences belonging only to the selected service namespace.
   *
   * @param serviceDocumentUrl Selected OpenAPI document URL; undefined represents single-app mode.
   * @returns Nothing.
   */
  const loadServiceScopedPreferences = useCallback(
    (serviceDocumentUrl?: string) => {
      const settings = readWorkspaceScopeSettings(applicationLocalStorage, serviceDocumentUrl);
      setSettingsServiceDocumentUrl(serviceDocumentUrl);
      setAuthPreferences(getStoredAuthPreferences(serviceDocumentUrl));
      setGlobalHeaders(settings.headers);
      setGlobalQueryParams(settings.queryParams);
      setDebugCacheEnabled(settings.debugDraftEnabled);
      setGroupOverviewEnabled(settings.groupOverviewEnabled);
    },
    [
      getStoredAuthPreferences,
      setAuthPreferences,
      setDebugCacheEnabled,
      setGlobalHeaders,
      setGlobalQueryParams,
      setGroupOverviewEnabled,
      setSettingsServiceDocumentUrl,
    ],
  );

  /**
   * Commits one complete cached or revalidated OpenAPI workspace in a single render batch.
   *
   * @param workspace Fully assembled gateway, service, and group-document state.
   * @returns Nothing; replaces workspace state and restores the selected service preferences.
   */
  const applyOpenApiWorkspace = useCallback(
    (workspace: CachedOpenApiWorkspace) => {
      setGatewayDocument(workspace.gatewayDocument);
      setGatewayConfig(workspace.gatewayConfig);
      setDocument(workspace.document);
      setMainDocument(workspace.mainDocument);
      setSourceGroupDocuments(workspace.sourceGroupDocuments);
      setGroupDocumentErrors(workspace.groupDocumentErrors);
      replaceServices(workspace.services);
      activeServiceRef.current = workspace.activeService ?? null;
      setActiveService(workspace.activeService);
      loadServiceScopedPreferences(workspace.activeService?.url);
      try {
        writeSessionActiveServiceUrl(
          applicationSessionStorage,
          applicationLocalStorage,
          workspace.activeService?.url,
        );
      } catch {
        // The active service remains selected when browser session storage is unavailable.
      }
      setWorkspaceCacheReady(true);
    },
    [activeServiceRef, loadServiceScopedPreferences, replaceServices],
  );

  /** Loads the selected service document through the shared repository.
   * @param service Selected gateway service.
   * @param signal Optional request cancellation signal.
   * @returns Loaded OpenAPI document.
   */
  const getServiceDocument = useCallback(
    async (service: ServiceDefinition, signal?: AbortSignal) => {
      return serviceDocumentRepository.current.getServiceDocument(service, signal);
    },
    [serviceDocumentRepository],
  );

  /** Loads and applies one service workspace while isolating failures.
   * @param service Requested service definition.
   * @param signal Optional cancellation signal.
   * @param workspaceOptions Group-document loading options.
   * @returns Whether the service was loaded successfully.
   */
  const loadService = useCallback(
    async (
      service: ServiceDefinition,
      signal?: AbortSignal,
      workspaceOptions: ServiceWorkspaceLoadOptions = {},
    ) => {
      setError('');
      setLoading(true);
      setWorkspaceCacheReady(false);
      setGroupDocumentErrors([]);
      if (service.name) {
        setBrandSnapshot((prev) => ({
          ...prev,
          title: service.name,
        }));
      }
      const previouslyStaleUrls = new Set(openApiResourceLoader.current.getStaleUrls());
      try {
        void flushPending().catch(reportPersistenceFailure);
        await migrateWorkspaceStorage(scopeForService(service.url), service.url);
        await prepareWorkspace(scopeForService(service.url)).catch(reportPersistenceFailure);
        const workspace = await serviceDocumentRepository.current.loadWorkspace(service, {
          ...workspaceOptions,
          signal,
        });
        if (signal?.aborted) return false;
        await migrateServiceStorage(
          scopeForService(service.url),
          resolveServiceDocumentPrefix(service.url, workspaceOptions.docPath),
          createDocumentationSources(workspace.mainDocument, workspace.groupDocuments, service.url),
        );
        if (signal?.aborted) return false;

        const nextServices = servicesRef.current.map((item) =>
          item.url === service.url
            ? { ...item, disabled: false, reason: '', status: 'UP' as const }
            : item,
        );
        replaceServices(nextServices);
        loadServiceScopedPreferences(service.url);
        setDocument(workspace.document);
        setMainDocument(workspace.mainDocument);
        setSourceGroupDocuments(workspace.groupDocuments);
        setGroupDocumentErrors(workspace.errors);
        const serviceBrand = resolveBrandMetadata(workspace.document, {
          fallbackTitle: service.name,
        });
        setBrandSnapshot(serviceBrand);
        const selectedService = nextServices.find((item) => item.url === service.url) ?? service;
        activeServiceRef.current = selectedService;
        setActiveService(selectedService);
        writeSessionActiveServiceUrl(
          applicationSessionStorage,
          applicationLocalStorage,
          service.url,
        );
        setWorkspaceCacheReady(true);
        const newlyStaleUrls = openApiResourceLoader.current
          .getStaleUrls()
          .filter((url) => !previouslyStaleUrls.has(url));
        if (newlyStaleUrls.length > 0) {
          setError(`部分接口文档刷新失败，当前使用上一次缓存：${newlyStaleUrls.join('、')}`);
        }
        return true;
      } catch (reason) {
        if (signal?.aborted || (reason instanceof DOMException && reason.name === 'AbortError')) {
          return false;
        }
        const errorMessage = reason instanceof Error ? reason.message : '服务文档加载失败';
        replaceServices(markServiceUnavailable(servicesRef.current, service.url, errorMessage));
        setError(errorMessage);
        return false;
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [
      activeServiceRef,
      loadServiceScopedPreferences,
      openApiResourceLoader,
      replaceServices,
      serviceDocumentRepository,
      servicesRef,
      setBrandSnapshot,
    ],
  );

  /**
   * Loads one aggregation service and optionally keeps the user on the global configuration page.
   *
   * @param service Aggregation service selected for loading.
   * @param workspaceOptions Gateway document loading options for the selected service.
   * @param preserveSettings Whether a configuration-scope change should retain the settings route.
   * @returns Nothing; updates the active service or falls back to another available service.
   */
  const selectService = useCallback(
    async (
      service: ServiceDefinition,
      workspaceOptions: ServiceWorkspaceLoadOptions,
      preserveSettings = false,
    ) => {
      if (service.disabled) return;
      try {
        if (contentRef.current) {
          writeSessionWorkspaceScroll(
            applicationSessionStorage,
            applicationLocalStorage,
            window.location.hash,
            contentRef.current.scrollTop,
            activeServiceRef.current?.url,
          );
        }
        writeSessionWorkspaceHash(
          applicationSessionStorage,
          applicationLocalStorage,
          window.location.hash,
          activeServiceRef.current?.url,
        );
        if (userPreferencesRef.current.restoreTabsEnabled) {
          writePersistedWorkspace(
            applicationLocalStorage,
            { activeRoute: window.location.hash, tabs: workspaceTabsOrderRef.current },
            activeServiceRef.current?.url,
          );
        }
      } catch {
        // Route restoration is optional when browser storage is unavailable.
      }
      serviceSwitchController.current?.abort();
      const controller = new AbortController();
      serviceSwitchController.current = controller;
      if (await loadService(service, controller.signal, workspaceOptions)) {
        const targetHash = preserveSettings
          ? createHashRoute({ settingsSection: 'config', view: 'settings' })
          : createHashRoute({
              ...parseHashRoute(getRestoredWorkspaceHash(service.url)),
              serviceId: getRouteKey(service, servicesRef.current),
            });
        window.location.hash = targetHash;
        return;
      }

      const fallback = selectAvailableService(servicesRef.current);
      if (fallback && fallback.url !== service.url) {
        if (await loadService(fallback, controller.signal, workspaceOptions)) {
          setError(`${service.name} 不可用，已切换到 ${fallback.name}`);
          window.location.hash = preserveSettings
            ? createHashRoute({ settingsSection: 'config', view: 'settings' })
            : createHashRoute({
                ...parseHashRoute(getRestoredWorkspaceHash(fallback.url)),
                serviceId: getRouteKey(fallback, servicesRef.current),
              });
        }
      }
    },
    [
      activeServiceRef,
      contentRef,
      createHashRoute,
      getRestoredWorkspaceHash,
      loadService,
      serviceSwitchController,
      servicesRef,
      userPreferencesRef,
      workspaceTabsOrderRef,
    ],
  );

  useEffect(() => {
    const controller = new AbortController();
    /** Restores cached workspace state and revalidates its remote documents.
     * @param None; uses the initialization controller and workspace preferences.
     * @returns Completion after applying a fresh workspace or a visible failure.
     */
    const load = async () => {
      openApiResourceLoader.current.clearStaleUrls();
      openApiResourceLoader.current.clearChangedUrls();
      setLoading(true);
      setWorkspaceCacheReady(false);
      setError('');
      try {
        const cachedWorkspace = await restoreOpenApiWorkspace(
          openApiCacheStore.current,
          openApiResourceLoader.current,
          initialServiceUrl,
        );
        if (controller.signal.aborted) return;
        // Keep old definitions only for draft reconciliation, never publish them before validation.
        previousWorkspaceRef.current = cachedWorkspace;
        openApiResourceLoader.current.clearChangedUrls();
        const [nextDocument, config] = await Promise.all([
          singleDocumentRepository.current.getDocument(gatewayDocumentUrl),
          singleDocumentRepository.current
            .getSwaggerConfig(gatewayConfigUrl)
            .catch(() => undefined),
        ]);
        if (controller.signal.aborted) return;
        const fetchedBrand = resolveBrandMetadata(nextDocument);
        setBrandSnapshot(fetchedBrand);
        writeStoredBrand(fetchedBrand, applicationLocalStorage);
        const nextServices = config?.urls ?? [];
        const aggregationExtension = nextDocument['x-nextdoc4j-aggregation'];
        let nextWorkspace: CachedOpenApiWorkspace;
        let workspaceError = '';
        if (isAggregationEnabled(nextDocument)) {
          const discoveredServices = sortServices(nextServices).map((service) => ({
            ...service,
            status: service.disabled ? ('DOWN' as const) : ('UNKNOWN' as const),
          }));
          const linkedServiceId = parseHashRoute(window.location.hash).serviceId;
          const linkedService = discoveredServices.find(
            (service) => getRouteKey(service, discoveredServices) === linkedServiceId,
          );
          if (linkedService && linkedService.url !== cachedWorkspace?.activeService?.url) {
            previousWorkspaceRef.current = await restoreOpenApiWorkspace(
              openApiCacheStore.current,
              openApiResourceLoader.current,
              linkedService.url,
            );
            if (controller.signal.aborted) return;
          }
          const probedServices = await probeServices(discoveredServices, (service) =>
            getServiceDocument(service, controller.signal),
          );
          if (controller.signal.aborted) return;
          const visibleServices = toServiceDefinitions(probedServices);
          registerWorkspaceServices(visibleServices);
          const requestedServiceId = parseHashRoute(window.location.hash).serviceId;
          const requestedService = requestedServiceId
            ? visibleServices.find(
                (service) => getRouteKey(service, visibleServices) === requestedServiceId,
              )
            : undefined;
          if (requestedServiceId && (!requestedService || requestedService.disabled)) {
            replaceWithHome();
          }
          const preferredService =
            (requestedService && !requestedService.disabled ? requestedService : undefined) ??
            selectAvailableService(
              visibleServices,
              readSessionActiveServiceUrl(applicationSessionStorage, applicationLocalStorage),
            );
          if (preferredService) {
            const serviceWorkspace = await serviceDocumentRepository.current.loadWorkspace(
              preferredService,
              {
                docPath: aggregationExtension?.docPath,
                serviceSwaggerConfigEnabled:
                  aggregationExtension?.serviceSwaggerConfigEnabled === true,
                signal: controller.signal,
              },
            );
            if (controller.signal.aborted) return;
            nextWorkspace = {
              activeService:
                visibleServices.find((service) => service.url === preferredService.url) ??
                preferredService,
              document: serviceWorkspace.document,
              gatewayConfig: config,
              gatewayDocument: nextDocument,
              groupDocumentErrors: serviceWorkspace.errors,
              mainDocument: serviceWorkspace.mainDocument,
              services: visibleServices,
              sourceGroupDocuments: serviceWorkspace.groupDocuments,
            };
          } else {
            nextWorkspace = {
              document: nextDocument,
              gatewayConfig: config,
              gatewayDocument: nextDocument,
              groupDocumentErrors: [],
              mainDocument: nextDocument,
              services: visibleServices,
              sourceGroupDocuments: [],
            };
            workspaceError =
              nextServices.length > 0
                ? '当前没有可用的聚合服务，请检查服务状态后刷新文档。'
                : '网关没有返回可用的聚合服务配置。';
          }
        } else {
          const singleWorkspace = await singleDocumentRepository.current.loadWorkspace(
            nextDocument,
            config,
            controller.signal,
          );
          if (controller.signal.aborted) return;
          nextWorkspace = {
            document: singleWorkspace.document,
            gatewayConfig: config,
            gatewayDocument: nextDocument,
            groupDocumentErrors: singleWorkspace.errors,
            mainDocument: singleWorkspace.mainDocument,
            services: nextServices,
            sourceGroupDocuments: singleWorkspace.groupDocuments,
          };
        }

        await migrateServiceStorage(
          scopeForService(nextWorkspace.activeService?.url),
          nextWorkspace.activeService
            ? resolveServiceDocumentPrefix(
                nextWorkspace.activeService.url,
                aggregationExtension?.docPath,
              )
            : '',
          createDocumentationSources(
            nextWorkspace.mainDocument,
            nextWorkspace.sourceGroupDocuments,
            nextWorkspace.activeService?.url ?? config?.configUrl ?? gatewayConfigUrl,
          ),
        );
        await migrateWorkspaceStorage(
          scopeForService(nextWorkspace.activeService?.url),
          nextWorkspace.activeService?.url,
        );
        await prepareWorkspace(scopeForService(nextWorkspace.activeService?.url)).catch(
          reportPersistenceFailure,
        );
        if (controller.signal.aborted) return;
        applyOpenApiWorkspace(nextWorkspace);
        if (
          !window.location.hash ||
          window.location.hash === '#' ||
          window.location.hash === '#/'
        ) {
          window.location.hash = createHashRoute(
            parseHashRoute(getRestoredWorkspaceHash(activeServiceRef.current?.url)),
          );
        }
        const staleUrls = openApiResourceLoader.current.getStaleUrls();
        if (staleUrls.length > 0) {
          setError(`部分接口文档刷新失败，当前使用上一次缓存：${staleUrls.join('、')}`);
        } else if (workspaceError) {
          setError(workspaceError);
        }
        if (staleUrls.length === 0) {
          void openApiResourceLoader.current.cleanup();
        }
      } catch (reason) {
        if (!(reason instanceof DOMException && reason.name === 'AbortError'))
          setError(reason instanceof Error ? reason.message : '无法加载 OpenAPI 文档');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [
    activeServiceRef,
    applyOpenApiWorkspace,
    createHashRoute,
    gatewayConfigUrl,
    gatewayDocumentUrl,
    getRestoredWorkspaceHash,
    getServiceDocument,
    initialServiceUrl,
    openApiCacheStore,
    openApiResourceLoader,
    replaceWithHome,
    serviceDocumentRepository,
    setBrandSnapshot,
    singleDocumentRepository,
  ]);

  useEffect(() => {
    if (!workspaceCacheReady || !document || !gatewayDocument || !mainDocument) return;
    void saveOpenApiWorkspace(openApiCacheStore.current, {
      activeService,
      document,
      gatewayConfig,
      gatewayConfigUrl,
      gatewayDocument,
      gatewayDocumentUrl,
      groupDocumentErrors,
      mainDocument,
      mainDocumentUrl: activeService?.url ?? gatewayDocumentUrl,
      services,
      sourceGroupDocuments,
    }).then(() => clearLegacyWorkspaceDocument(applicationSessionStorage));
  }, [
    activeService,
    document,
    gatewayConfig,
    gatewayConfigUrl,
    gatewayDocument,
    gatewayDocumentUrl,
    groupDocumentErrors,
    mainDocument,
    openApiCacheStore,
    services,
    sourceGroupDocuments,
    workspaceCacheReady,
  ]);

  return {
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
  };
}
