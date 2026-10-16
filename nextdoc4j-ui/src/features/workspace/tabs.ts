import { createScopedStorageKey } from '../aggregation/scope';

export const workspaceTabsStorageBaseKey = 'nextdoc4j:workspace-tabs';
export const workspaceTabDragDirectionThreshold = 8;

export interface WorkspaceTab {
  closable: boolean;
  home?: boolean;
  id: string;
  label: string;
  method?: string;
  pinned?: boolean;
  route: string;
  operation?: { method: string; path: string; documentUrl: string };
}

export interface WorkspaceTabContextMenu {
  left: number;
  tabId: string;
  top: number;
}

export type WorkspaceTabDropPlacement = 'after' | 'before';
export type WorkspaceTabDragDirection = 'left' | 'right';

export interface WorkspaceTabDragState {
  direction?: WorkspaceTabDragDirection;
  directionAnchorX: number;
  pinned: boolean;
  placement?: WorkspaceTabDropPlacement;
  tabId: string;
  targetId?: string;
}

/**
 * Validates one deserialized workspace tab before it is restored into the active document scope.
 *
 * @param value Unknown browser-storage value to validate.
 * @returns True when the value contains a safe workspace-tab shape, otherwise false.
 */
export const isWorkspaceTab = (value: unknown): value is WorkspaceTab => {
  if (!value || typeof value !== 'object') return false;
  const tab = value as Partial<WorkspaceTab>;
  return (
    typeof tab.closable === 'boolean' &&
    typeof tab.id === 'string' &&
    typeof tab.label === 'string' &&
    typeof tab.route === 'string' &&
    tab.route.startsWith('#/') &&
    (tab.home === undefined || typeof tab.home === 'boolean') &&
    (tab.method === undefined || typeof tab.method === 'string') &&
    (tab.pinned === undefined || typeof tab.pinned === 'boolean')
  );
};

/**
 * Keeps fixed workspace tabs before ordinary tabs without mutating the stored tab list.
 *
 * @param tabs Workspace tabs in their current display order.
 * @returns Fixed tabs followed by ordinary tabs, preserving relative order within each group.
 */
export const orderWorkspaceTabs = (tabs: WorkspaceTab[]) => [
  ...tabs.filter((tab) => tab.pinned),
  ...tabs.filter((tab) => !tab.pinned),
];

/**
 * Moves one workspace tab beside another while preserving the fixed and ordinary tab groups.
 *
 * @param tabs Workspace tabs in their current display order.
 * @param draggedTabId Stable identifier of the tab being moved.
 * @param targetTabId Stable identifier of the tab under the drag pointer.
 * @param placement Whether the dragged tab should be inserted before or after the target.
 * @returns Reordered tabs, or the original array when the requested move has no visible effect.
 */
export const moveWorkspaceTab = (
  tabs: WorkspaceTab[],
  draggedTabId: string,
  targetTabId: string,
  placement: WorkspaceTabDropPlacement,
) => {
  const draggedIndex = tabs.findIndex((tab) => tab.id === draggedTabId);
  const targetIndex = tabs.findIndex((tab) => tab.id === targetTabId);
  const draggedTab = tabs[draggedIndex];
  const targetTab = tabs[targetIndex];
  if (
    !draggedTab ||
    !targetTab ||
    draggedTab.id === targetTab.id ||
    Boolean(draggedTab.pinned) !== Boolean(targetTab.pinned)
  ) {
    return tabs;
  }

  const nextTabs = tabs.filter((tab) => tab.id !== draggedTab.id);
  const targetIndexAfterRemoval = targetIndex > draggedIndex ? targetIndex - 1 : targetIndex;
  const insertionIndex =
    placement === 'after' ? targetIndexAfterRemoval + 1 : targetIndexAfterRemoval;
  nextTabs.splice(insertionIndex, 0, draggedTab);
  return nextTabs.every((tab, index) => tab.id === tabs[index]?.id) ? tabs : nextTabs;
};

/**
 * Reads valid, deduplicated workspace tabs for one service scope from browser storage.
 *
 * @param storage Browser storage used to restore tabs.
 * @param serviceDocumentUrl Active service OpenAPI URL; omitted in single-document mode.
 * @returns Persisted tabs in display order, or an empty list for inaccessible or malformed storage.
 */
export const readWorkspaceTabs = (
  storage: Pick<Storage, 'getItem'>,
  serviceDocumentUrl?: string,
): WorkspaceTab[] => {
  try {
    const storageKey = createScopedStorageKey(workspaceTabsStorageBaseKey, serviceDocumentUrl);
    const value = JSON.parse(storage.getItem(storageKey) || '[]');
    if (!Array.isArray(value)) return [];
    const seen = new Set<string>();
    return orderWorkspaceTabs(
      value.filter(isWorkspaceTab).filter((tab) => {
        if (
          tab.id === 'settings' ||
          tab.id.startsWith('overview:') ||
          /^model:[^:]+:$/u.test(tab.id)
        ) {
          return false;
        }
        if (seen.has(tab.id)) return false;
        seen.add(tab.id);
        return true;
      }),
    );
  } catch {
    return [];
  }
};
