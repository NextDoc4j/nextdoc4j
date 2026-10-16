import { scopeForService } from '../workspace/storage/identity';
import { readWorkspace, writeWorkspace } from '../workspace/storage/repository';
import { readStoredEnvelope, writeStoredEnvelope } from '../../lib/storage/envelope';
import { createScopedStorageKey } from '../aggregation/scope';
import { isWorkspaceTab, orderWorkspaceTabs, type WorkspaceTab } from '../workspace/tabs';

interface PersistedWorkspace {
  activeRoute?: string;
  tabs: WorkspaceTab[];
}

const persistedWorkspaceStorageBaseKey = 'nextdoc4j:preferences:workspace';
const persistedWorkspaceSchemaVersion = 1;

/**
 * Validates one cross-session workspace restoration record.
 *
 * @param value Unknown data read from browser local storage.
 * @returns True when the route and every stored tab have supported shapes.
 */
const isPersistedWorkspace = (value: unknown): value is PersistedWorkspace => {
  if (!value || typeof value !== 'object') return false;
  const workspace = value as Partial<PersistedWorkspace>;
  return (
    (workspace.activeRoute === undefined ||
      (typeof workspace.activeRoute === 'string' && workspace.activeRoute.startsWith('#/'))) &&
    Array.isArray(workspace.tabs) &&
    workspace.tabs.every(isWorkspaceTab)
  );
};

/**
 * Reads the persisted workspace belonging to one single-app or service scope.
 *
 * @param storage Browser local storage containing restorable workspaces.
 * @param serviceDocumentUrl Selected service URL, omitted for single-app mode.
 * @returns Valid route and ordered tabs, or an empty workspace.
 */
export const readLegacyPersistedWorkspace = (
  storage: Pick<Storage, 'getItem' | 'removeItem' | 'setItem'>,
  serviceDocumentUrl?: string,
): PersistedWorkspace =>
  readStoredEnvelope(
    storage,
    createScopedStorageKey(persistedWorkspaceStorageBaseKey, serviceDocumentUrl),
    {
      schemaVersion: persistedWorkspaceSchemaVersion,
      validate: isPersistedWorkspace,
    },
  ) ?? { tabs: [] };

/**
 * Persists the route and tabs needed to restore one document workspace later.
 *
 * @param storage Browser local storage receiving the workspace record.
 * @param workspace Current route and ordered workspace tabs.
 * @param serviceDocumentUrl Selected service URL, omitted for single-app mode.
 * @returns True when browser storage changed, otherwise false.
 */
export const writeLegacyPersistedWorkspace = (
  storage: Pick<Storage, 'getItem' | 'setItem'>,
  workspace: PersistedWorkspace,
  serviceDocumentUrl?: string,
) =>
  writeStoredEnvelope(
    storage,
    createScopedStorageKey(persistedWorkspaceStorageBaseKey, serviceDocumentUrl),
    { ...workspace, tabs: orderWorkspaceTabs(workspace.tabs) },
    persistedWorkspaceSchemaVersion,
  );

/**
 * Removes every cross-session workspace when tab restoration is disabled.
 *
 * @param storage Browser local storage containing scoped workspace records.
 * @returns Number of persisted workspaces removed.
 */
export const clearLegacyPersistedWorkspaces = (
  storage: Pick<Storage, 'key' | 'length' | 'removeItem'>,
) => {
  const prefix = `${persistedWorkspaceStorageBaseKey}:`;
  const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index)).filter(
    (key): key is string => Boolean(key?.startsWith(prefix)),
  );
  keys.forEach((key) => storage.removeItem(key));
  return keys.length;
};

/** Reads the hydrated IndexedDB workspace, preserving the existing component boundary.
 * @param storage Browser storage used only by legacy migration, not by new reads.
 * @param serviceDocumentUrl Selected service document URL.
 * @returns Workspace snapshot or an empty first-visit workspace.
 */
export const readPersistedWorkspace = (
  _storage: Pick<Storage, 'getItem'>,
  serviceDocumentUrl?: string,
): PersistedWorkspace => readWorkspace(scopeForService(serviceDocumentUrl)) ?? { tabs: [] };
/** Writes service tabs to IndexedDB instead of a LocalStorage snapshot.
 * @param storage Retained call-site argument; new data is written to IndexedDB.
 * @param workspace Ordered workspace snapshot.
 * @param serviceDocumentUrl Selected service URL.
 * @returns True after enqueueing the new snapshot.
 */
export const writePersistedWorkspace = (
  _storage: Pick<Storage, 'getItem' | 'setItem'>,
  workspace: PersistedWorkspace,
  serviceDocumentUrl?: string,
) => {
  writeWorkspace(scopeForService(serviceDocumentUrl), {
    ...workspace,
    tabs: orderWorkspaceTabs(workspace.tabs),
  });
  return true;
};
/** Stops automatic restoration without deleting interface state or user drafts.
 * @param storage Existing preference call-site storage argument.
 * @returns Zero; restoration is controlled by the preference, not destructive clearing.
 */
export const clearPersistedWorkspaces = (
  _storage: Pick<Storage, 'key' | 'length' | 'removeItem'>,
) => {
  void _storage;
  return 0;
};
