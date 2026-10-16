const defaultScope = 'single-app';

/**
 * Creates a stable client-side namespace for one selected service.
 *
 * @param serviceDocumentUrl Selected service OpenAPI document URL.
 * @returns URL-safe service namespace, or the single-application namespace.
 */
export const createServiceScope = (serviceDocumentUrl?: string) =>
  serviceDocumentUrl ? `service:${encodeURIComponent(serviceDocumentUrl)}` : defaultScope;

/**
 * Appends a service namespace to a browser storage key.
 *
 * @param baseKey Unscoped storage key for a feature.
 * @param serviceDocumentUrl Selected service OpenAPI document URL.
 * @returns Key isolated from values belonging to other services.
 */
export const createScopedStorageKey = (baseKey: string, serviceDocumentUrl?: string) =>
  `${baseKey}:${createServiceScope(serviceDocumentUrl)}`;
