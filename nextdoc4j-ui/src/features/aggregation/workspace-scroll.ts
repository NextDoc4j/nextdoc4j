import { createScopedStorageKey } from './scope';
import { normalizeWorkspaceHash } from './workspace-route';

const workspaceScrollStorageKey = 'nextdoc4j:workspace-scroll';

const createScrollStorageKey = (hash: string, serviceDocumentUrl?: string) => {
  const normalizedHash = normalizeWorkspaceHash(hash);
  if (!normalizedHash) return undefined;
  return `${createScopedStorageKey(workspaceScrollStorageKey, serviceDocumentUrl)}:${encodeURIComponent(normalizedHash)}`;
};

/**
 * Reads a non-negative scroll position for one service and fixed Hash route.
 *
 * @param storage Browser storage implementation.
 * @param hash Current fixed application Hash.
 * @param serviceDocumentUrl Selected service URL; omitted for single-app mode.
 * @returns Saved pixel offset, or zero for missing and invalid values.
 */
export const readWorkspaceScroll = (
  storage: Pick<Storage, 'getItem'>,
  hash: string,
  serviceDocumentUrl?: string,
) => {
  const key = createScrollStorageKey(hash, serviceDocumentUrl);
  if (!key) return 0;
  const value = Number(storage.getItem(key));
  return Number.isFinite(value) && value > 0 ? value : 0;
};

/**
 * Stores a content scroll position for one service and fixed Hash route.
 *
 * @param storage Browser storage implementation.
 * @param hash Current fixed application Hash.
 * @param scrollTop Non-negative content offset in pixels.
 * @param serviceDocumentUrl Selected service URL; omitted for single-app mode.
 * @returns True when the route was valid and the position was stored.
 */
export const writeWorkspaceScroll = (
  storage: Pick<Storage, 'setItem'>,
  hash: string,
  scrollTop: number,
  serviceDocumentUrl?: string,
) => {
  const key = createScrollStorageKey(hash, serviceDocumentUrl);
  if (!key) return false;
  storage.setItem(key, String(Math.max(0, Math.round(scrollTop))));
  return true;
};
