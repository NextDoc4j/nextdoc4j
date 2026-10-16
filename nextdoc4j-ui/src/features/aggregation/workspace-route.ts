import { createHashRoute, parseHashRoute } from '../../lib/hash-route';
import { createScopedStorageKey } from './scope';

const workspaceRouteStorageKey = 'nextdoc4j:last-workspace-route';

/**
 * Validates and canonicalizes a fixed application Hash before persistence.
 *
 * @param hash Browser location Hash to validate.
 * @returns Canonical Hash, or undefined for empty and non-application values.
 */
export const normalizeWorkspaceHash = (hash: string) => {
  if (!hash || !hash.startsWith('#/')) return undefined;
  return createHashRoute(parseHashRoute(hash));
};

/**
 * Reads the most recent fixed Hash route for a single app or aggregation service.
 *
 * @param storage Browser storage implementation.
 * @param serviceDocumentUrl Selected service document URL; omitted for single-app mode.
 * @returns Valid canonical Hash, or undefined when no restorable state exists.
 */
export const readWorkspaceHash = (storage: Pick<Storage, 'getItem'>, serviceDocumentUrl?: string) =>
  normalizeWorkspaceHash(
    storage.getItem(createScopedStorageKey(workspaceRouteStorageKey, serviceDocumentUrl)) || '',
  );

/**
 * Stores the current fixed Hash route in a service-isolated namespace.
 *
 * @param storage Browser storage implementation.
 * @param hash Current browser location Hash.
 * @param serviceDocumentUrl Selected service document URL; omitted for single-app mode.
 * @returns True when a valid application route was stored.
 */
export const writeWorkspaceHash = (
  storage: Pick<Storage, 'setItem'>,
  hash: string,
  serviceDocumentUrl?: string,
) => {
  const normalizedHash = normalizeWorkspaceHash(hash);
  if (!normalizedHash) return false;
  storage.setItem(
    createScopedStorageKey(workspaceRouteStorageKey, serviceDocumentUrl),
    normalizedHash,
  );
  return true;
};
