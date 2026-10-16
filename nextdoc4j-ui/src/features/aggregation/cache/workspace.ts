import type { OpenApiDocument, ServiceDefinition, SwaggerConfig } from '../../../types/openapi';
import { createServiceScope } from '../scope';
import {
  mergeServiceDocuments,
  type ServiceGroupDocument,
  type ServiceGroupDocumentError,
} from '../service-document-repository';
import type { OpenApiCacheStore, OpenApiWorkspaceManifest } from './database';
import {
  openApiCacheSchemaVersion,
  openApiParserVersion,
  type OpenApiResourceLoader,
} from './revalidate';

export interface CachedOpenApiWorkspace {
  activeService?: ServiceDefinition;
  document: OpenApiDocument;
  gatewayConfig?: SwaggerConfig;
  gatewayDocument: OpenApiDocument;
  groupDocumentErrors: ServiceGroupDocumentError[];
  mainDocument: OpenApiDocument;
  services: ServiceDefinition[];
  sourceGroupDocuments: ServiceGroupDocument[];
}

export interface SaveOpenApiWorkspaceInput extends CachedOpenApiWorkspace {
  gatewayConfigUrl?: string;
  gatewayDocumentUrl: string;
  mainDocumentUrl: string;
}

/**
 * Validates the minimum OpenAPI document fields needed to rebuild a cached workspace.
 *
 * @param value Unknown cached resource data.
 * @returns True when the value is an OpenAPI document object.
 */
const isOpenApiDocument = (value: unknown): value is OpenApiDocument => {
  if (!value || typeof value !== 'object') return false;
  const document = value as Partial<OpenApiDocument>;
  return (
    typeof document.openapi === 'string' &&
    Boolean(document.info && typeof document.info === 'object') &&
    Boolean(document.paths && typeof document.paths === 'object')
  );
};

/**
 * Validates the optional Swagger Config structure used to restore service definitions.
 *
 * @param value Unknown cached resource data.
 * @returns True when the value has a supported optional URL list.
 */
const isSwaggerConfig = (value: unknown): value is SwaggerConfig => {
  if (!value || typeof value !== 'object') return false;
  const config = value as Partial<SwaggerConfig>;
  return config.urls === undefined || Array.isArray(config.urls);
};

/**
 * Checks whether a workspace manifest belongs to the current cache and parser formats.
 *
 * @param manifest Persisted workspace manifest candidate.
 * @returns True when the manifest is compatible with the current application.
 */
const isUsableManifest = (
  manifest: OpenApiWorkspaceManifest | undefined,
): manifest is OpenApiWorkspaceManifest =>
  Boolean(
    manifest &&
    manifest.schemaVersion === openApiCacheSchemaVersion &&
    manifest.parserVersion === openApiParserVersion,
  );

/**
 * Restores the last complete workspace from URL-level document records.
 *
 * @param store Persistent OpenAPI cache store containing the workspace manifest.
 * @param loader Resource loader used to read compatible cached document data.
 * @param serviceDocumentUrl Previously active service URL, omitted for single-app mode.
 * @returns Complete cached workspace, or undefined when any required record is unavailable.
 */
export const restoreOpenApiWorkspace = async (
  store: OpenApiCacheStore,
  loader: OpenApiResourceLoader,
  serviceDocumentUrl?: string,
): Promise<CachedOpenApiWorkspace | undefined> => {
  try {
    const manifest = await store.getManifest(createServiceScope(serviceDocumentUrl));
    if (!isUsableManifest(manifest)) return undefined;
    const [gatewayDocument, gatewayConfig, mainDocument, ...groupDocuments] = await Promise.all([
      loader.readCached<OpenApiDocument>(manifest.gatewayDocumentUrl),
      manifest.gatewayConfigUrl
        ? loader.readCached<SwaggerConfig>(manifest.gatewayConfigUrl)
        : Promise.resolve(undefined),
      loader.readCached<OpenApiDocument>(manifest.mainDocumentUrl),
      ...manifest.groupDocuments.map((group) => loader.readCached<OpenApiDocument>(group.url)),
    ]);
    if (
      !isOpenApiDocument(gatewayDocument) ||
      !isOpenApiDocument(mainDocument) ||
      (Boolean(manifest.gatewayConfigUrl) && !isSwaggerConfig(gatewayConfig)) ||
      (gatewayConfig !== undefined && !isSwaggerConfig(gatewayConfig)) ||
      groupDocuments.some((document) => !isOpenApiDocument(document))
    ) {
      return undefined;
    }
    const sourceGroupDocuments = manifest.groupDocuments.map((group, index) => ({
      ...group,
      document: groupDocuments[index]!,
    }));
    return {
      activeService: manifest.activeService,
      document: mergeServiceDocuments(mainDocument, sourceGroupDocuments),
      gatewayConfig,
      gatewayDocument,
      groupDocumentErrors: [],
      mainDocument,
      services: manifest.services,
      sourceGroupDocuments,
    };
  } catch {
    return undefined;
  }
};

/**
 * Persists the URL composition of one fully loaded workspace without duplicating document bodies.
 *
 * @param store Persistent OpenAPI cache store receiving the manifest.
 * @param workspace Complete current workspace and source endpoint URLs.
 * @returns True when the manifest changed, otherwise false.
 */
export const saveOpenApiWorkspace = async (
  store: OpenApiCacheStore,
  workspace: SaveOpenApiWorkspaceInput,
) => {
  const scope = createServiceScope(workspace.activeService?.url);
  const manifestData = {
    activeService: workspace.activeService,
    gatewayConfigUrl: workspace.gatewayConfig ? workspace.gatewayConfigUrl : undefined,
    gatewayDocumentUrl: workspace.gatewayDocumentUrl,
    groupDocuments: workspace.sourceGroupDocuments.map(({ id, name, url }) => ({ id, name, url })),
    mainDocumentUrl: workspace.mainDocumentUrl,
    parserVersion: openApiParserVersion,
    schemaVersion: openApiCacheSchemaVersion,
    scope,
    services: workspace.services,
  };
  try {
    const current = await store.getManifest(scope);
    if (current && current.schemaVersion > openApiCacheSchemaVersion) return false;
    if (
      current &&
      JSON.stringify({ ...current, updatedAt: undefined }) === JSON.stringify(manifestData)
    ) {
      return false;
    }
    await store.putManifest({ ...manifestData, updatedAt: Date.now() });
    return true;
  } catch {
    return false;
  }
};

/**
 * Removes the superseded whole-workspace session snapshot after IndexedDB persistence succeeds.
 *
 * @param storage Browser session storage containing the previous v1 snapshot.
 * @returns Nothing; inaccessible storage does not affect the current workspace.
 */
export const clearLegacyWorkspaceDocument = (storage: Pick<Storage, 'removeItem'>) => {
  try {
    storage.removeItem('nextdoc4j:workspace-document:v1');
  } catch {
    // The legacy value is harmless when browser storage cannot be changed.
  }
};
