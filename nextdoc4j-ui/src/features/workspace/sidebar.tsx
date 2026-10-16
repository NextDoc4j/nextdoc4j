import { useMovingHighlight } from '../../components/rare-ui/use-moving-highlight';
import { HttpMethodBadge } from '../../components/rare-ui/http-method-badge';
import {
  BranchFolderIcon,
  AnimatedCollapse,
  VirtualMenuList,
  AccordionBranchRow,
  MenuLeaf,
  CompactMenu,
} from './sidebar-navigation';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';

import {
  IconAdjustments,
  IconBook2,
  IconCode,
  IconCube,
  IconFileText,
  IconHome2,
  IconShieldLock,
  IconDownload,
} from '@tabler/icons-react';
import type { AppView } from '../../lib/hash-route';
import type { MarkdownDocument } from '../documentation/markdown';
import { getDocumentationOperationKey, type DocumentationSource } from '../documentation/workspace';
import type { NavigationExpansionPreference } from '../preferences/storage';
import type { ApiOperation } from '../../types/openapi';

interface SidebarProps {
  collapsed: boolean;
  groupOverviewEnabled: boolean;
  hasSecuritySchemes: boolean;
  maxWidth: number;
  markdownGroups: Array<[string, MarkdownDocument[]]>;
  minWidth: number;
  navigationExpansion: NavigationExpansionPreference;
  onExpandForInitialSelection: () => void;
  onNavigate: (view: AppView, sourceGroupId?: string) => void;
  onResizeChange: (resizing: boolean) => void;
  onSelectSettings: (section: SettingsSection) => void;
  onSelectGroup: (group: string, sourceGroupId?: string) => void;
  onSelect: (operation: ApiOperation) => void;
  onSelectMarkdown: (document: MarkdownDocument) => void;
  onSelectModel: (modelName: string, sourceGroupId?: string) => void;
  onWidthChange: (width: number) => void;
  selectedKey?: string;
  selectedGroup?: string;
  selectedMarkdown?: MarkdownDocument;
  selectedModelName?: string;
  selectedSourceGroupId?: string;
  settingsSection: SettingsSection;
  sources: DocumentationSource[];
  view: AppView;
  width: number;
}

type SettingsSection = 'auth' | 'config';

interface SelectedOperationLocation {
  sourceBranchId: string;
  tagBranchId: string;
}

interface SelectedModelLocation {
  itemId: string;
  sourceBranchId: string;
}

interface SelectedMarkdownLocation {
  groupBranchId: string;
  itemId: string;
}

type FlyoutMenu = 'api' | 'management' | 'models' | 'other';
type OpenBranches = Record<string, string[] | undefined>;

const allSourceId = 'all';
const collapseAnimationDuration = 180;
const menuRowHeight = 36;

/**
 * Displays a resizeable accordion sidebar with compact floating navigation.
 *
 * @param props Route state, navigation callbacks, source documents and sidebar layout state.
 * @returns Primary navigation with lazy branches following the selected expansion preference.
 */
export function Sidebar({
  collapsed,
  groupOverviewEnabled,
  hasSecuritySchemes,
  maxWidth,
  markdownGroups,
  minWidth,
  navigationExpansion,
  onExpandForInitialSelection,
  onNavigate,
  onResizeChange,
  onSelectSettings,
  onSelectGroup,
  onSelect,
  onSelectMarkdown,
  onSelectModel,
  onWidthChange,
  selectedKey,
  selectedGroup,
  selectedMarkdown,
  selectedModelName,
  selectedSourceGroupId,
  settingsSection,
  sources,
  view,
  width,
}: SidebarProps) {
  const [openRoots, setOpenRoots] = useState<FlyoutMenu[]>([]);
  const [openBranches, setOpenBranches] = useState<OpenBranches>({});
  const [activeFlyout, setActiveFlyout] = useState<FlyoutMenu>();
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLElement | null>(null);
  const expandedNavRef = useRef<HTMLElement | null>(null);
  const collapsedNavRef = useRef<HTMLElement | null>(null);
  useMovingHighlight(
    expandedNavRef,
    '.workspace-menu-leaf, .workspace-menu-operation, .workspace-menu-branch',
    '.workspace-menu-leaf-active, .workspace-menu-operation-active, .workspace-menu-branch-active',
    true,
    undefined,
    sidebarRef,
  );
  useMovingHighlight(
    collapsedNavRef,
    '.workspace-collapsed-nav-item',
    '.workspace-collapsed-nav-item-active, .workspace-collapsed-nav-item-text-active',
    true,
    undefined,
    sidebarRef,
  );
  const operationElementRefs = useRef(new Map<string, HTMLButtonElement>());
  const modelElementRefs = useRef(new Map<string, HTMLButtonElement>());
  const markdownElementRefs = useRef(new Map<string, HTMLButtonElement>());
  const resizeFrameRef = useRef<number | undefined>(undefined);
  const resizeStopRef = useRef<(() => void) | undefined>(undefined);
  const operationRestoreTimerRef = useRef<ReturnType<typeof globalThis.setTimeout> | undefined>(
    undefined,
  );
  const modelRestoreTimerRef = useRef<ReturnType<typeof globalThis.setTimeout> | undefined>(
    undefined,
  );
  const markdownRestoreTimerRef = useRef<ReturnType<typeof globalThis.setTimeout> | undefined>(
    undefined,
  );
  const hasRestoredInitialOperationRef = useRef(false);
  const hasRestoredInitialModelRef = useRef(false);
  const hasRestoredInitialMarkdownRef = useRef(false);
  const initialOperationScrollPendingRef = useRef(true);
  const initialOperationKeyRef = useRef(selectedKey);
  const initialModelItemIdRef = useRef(
    view === 'models' && selectedModelName
      ? `model:${selectedSourceGroupId || allSourceId}:${selectedModelName}`
      : undefined,
  );
  const initialMarkdownItemIdRef = useRef(
    view === 'markdown' && selectedMarkdown
      ? `markdown:${selectedMarkdown.group}:${selectedMarkdown.displayName}`
      : undefined,
  );
  const sourceGroups = useMemo(
    () => sources.filter((source) => source.id !== allSourceId),
    [sources],
  );
  const allSource = useMemo(() => sources.find((source) => source.id === allSourceId), [sources]);
  const modelNamesBySource = useMemo(
    () =>
      new Map(
        sources.map((source) => [
          source.id,
          Object.keys(source.document.components?.schemas ?? {}).sort((left, right) =>
            left.localeCompare(right, 'zh-CN'),
          ),
        ]),
      ),
    [sources],
  );
  const isHomeActive = view === 'docs' && !selectedGroup && !selectedKey && !selectedSourceGroupId;
  const isAllApiActive =
    view === 'docs' &&
    (selectedSourceGroupId === allSourceId || (!selectedSourceGroupId && Boolean(selectedGroup)));
  const isManagementActive = view === 'settings' || view === 'export';
  const isApiActive =
    view === 'docs' &&
    (Boolean(selectedGroup) || Boolean(selectedKey) || Boolean(selectedSourceGroupId));
  const isModelsActive = view === 'models';
  const isOtherDocumentsActive = view === 'markdown';
  const selectedOperationLocation = useMemo<SelectedOperationLocation | undefined>(() => {
    if (!selectedKey) return undefined;
    const source = sources.find((item) => item.id === (selectedSourceGroupId || allSourceId));
    if (!source) return undefined;
    const tag = source.groups.find(([, operations]) =>
      operations.some((operation) => getDocumentationOperationKey(operation) === selectedKey),
    )?.[0];
    if (!tag) return undefined;
    const sourceBranchId =
      source.id === allSourceId ? 'all' : `source:${encodeURIComponent(source.id)}`;
    return {
      sourceBranchId,
      tagBranchId: `tag:${encodeURIComponent(tag)}`,
    };
  }, [selectedKey, selectedSourceGroupId, sources]);
  const selectedModelLocation = useMemo<SelectedModelLocation | undefined>(() => {
    if (view !== 'models' || !selectedModelName) return undefined;
    const source = sources.find((item) => item.id === (selectedSourceGroupId || allSourceId));
    if (!source?.document.components?.schemas?.[selectedModelName]) return undefined;
    const sourceBranchId =
      source.id === allSourceId ? 'all' : `source:${encodeURIComponent(source.id)}`;
    return {
      itemId: `model:${source.id}:${selectedModelName}`,
      sourceBranchId,
    };
  }, [selectedModelName, selectedSourceGroupId, sources, view]);
  const selectedMarkdownLocation = useMemo<SelectedMarkdownLocation | undefined>(() => {
    if (view !== 'markdown' || !selectedMarkdown) return undefined;
    const group = markdownGroups.find(([name]) => name === selectedMarkdown.group);
    if (!group?.[1].some((item) => item.displayName === selectedMarkdown.displayName))
      return undefined;
    return {
      groupBranchId: `group:${encodeURIComponent(selectedMarkdown.group)}`,
      itemId: `markdown:${selectedMarkdown.group}:${selectedMarkdown.displayName}`,
    };
  }, [markdownGroups, selectedMarkdown, view]);

  useEffect(
    () => () => {
      resizeStopRef.current?.();
      if (operationRestoreTimerRef.current !== undefined) {
        globalThis.clearTimeout(operationRestoreTimerRef.current);
      }
      if (modelRestoreTimerRef.current !== undefined) {
        globalThis.clearTimeout(modelRestoreTimerRef.current);
      }
      if (markdownRestoreTimerRef.current !== undefined) {
        globalThis.clearTimeout(markdownRestoreTimerRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (!collapsed || !activeFlyout) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !sidebarRef.current?.contains(event.target)) {
        setActiveFlyout(undefined);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setActiveFlyout(undefined);
    };
    globalThis.document.addEventListener('pointerdown', handlePointerDown);
    globalThis.document.addEventListener('keydown', handleKeyDown);
    return () => {
      globalThis.document.removeEventListener('pointerdown', handlePointerDown);
      globalThis.document.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeFlyout, collapsed]);

  useEffect(() => {
    if (!collapsed && activeFlyout) setActiveFlyout(undefined);
  }, [activeFlyout, collapsed]);

  /**
   * Checks whether a child branch is the one open for its immediate accordion parent.
   *
   * @param parentId Stable parent branch identifier.
   * @param branchId Child branch identifier.
   * @returns True when that child is the open sibling, otherwise false.
   */
  const isBranchOpen = (parentId: string, branchId: string) =>
    openBranches[parentId]?.includes(branchId) ?? false;

  /**
   * Toggles one branch while applying the selected free or single-group expansion behavior.
   *
   * @param parentId Stable parent branch identifier.
   * @param branchId Child branch identifier that should toggle.
   * @returns Nothing.
   */
  const toggleBranch = (parentId: string, branchId: string) => {
    setOpenBranches((current) => {
      const next = { ...current };
      const childPath = `${parentId}/${branchId}`;
      const siblings = current[parentId] ?? [];
      const closing = siblings.includes(branchId);
      const nextSiblings = closing
        ? siblings.filter((item) => item !== branchId)
        : navigationExpansion === 'accordion'
          ? [branchId]
          : [...siblings, branchId];
      if (nextSiblings.length > 0) next[parentId] = nextSiblings;
      else delete next[parentId];
      if (closing || navigationExpansion === 'accordion') {
        Object.keys(next).forEach((key) => {
          if (
            key.startsWith(`${childPath}/`) ||
            (navigationExpansion === 'accordion' && key.startsWith(`${parentId}/`))
          ) {
            delete next[key];
          }
        });
      }
      return next;
    });
  };

  /**
   * Toggles one primary branch while respecting free or single-group expansion behavior.
   *
   * @param root Primary branch requested by the user.
   * @returns Nothing; updates primary branches and resets nested state only in single-group mode.
   */
  const toggleRoot = (root: FlyoutMenu) => {
    setOpenRoots((current) => {
      if (current.includes(root)) return current.filter((item) => item !== root);
      return navigationExpansion === 'accordion' ? [root] : [...current, root];
    });
    if (navigationExpansion === 'accordion') setOpenBranches({});
  };

  /**
   * Opens or closes a compact-sidebar primary menu card.
   *
   * @param menu Primary navigation section represented by the flyout.
   * @returns Nothing.
   */
  const toggleFlyout = (menu: FlyoutMenu) =>
    setActiveFlyout((current) => (current === menu ? undefined : menu));

  /**
   * Closes the compact-sidebar primary menu card.
   *
   * @returns Nothing.
   */
  const closeFlyout = () => setActiveFlyout(undefined);

  /**
   * Reveals a sidebar leaf inside the expanded navigation scroll container.
   *
   * @param target Rendered API, entity or Markdown menu leaf to reveal.
   * @param behavior Browser scroll behavior used for route restoration or interactive selection.
   * @param onlyIfNeeded Keeps an already visible API in place during operation switching.
   * @returns Nothing; does nothing until the selected leaf has been mounted.
   */
  const scrollToSidebarItem = useCallback(
    (target: HTMLButtonElement | undefined, behavior: ScrollBehavior, onlyIfNeeded = false) => {
      const navigation = expandedNavRef.current;
      if (!navigation || !target) return;
      const targetBounds = target.getBoundingClientRect();
      const navigationBounds = navigation.getBoundingClientRect();
      if (
        onlyIfNeeded &&
        targetBounds.top >= navigationBounds.top + 8 &&
        targetBounds.bottom <= navigationBounds.top + navigation.clientHeight - 8
      ) {
        return;
      }
      const targetTop = targetBounds.top - navigationBounds.top + navigation.scrollTop;
      const respectsReducedMotion = globalThis.matchMedia?.(
        '(prefers-reduced-motion: reduce)',
      ).matches;
      navigation.scrollTo({
        behavior: respectsReducedMotion ? 'auto' : behavior,
        top: Math.max(0, targetTop - navigation.clientHeight / 2 + target.offsetHeight / 2),
      });
    },
    [],
  );

  /**
   * Reveals an offscreen route-selected operation without moving an already visible row.
   *
   * @param behavior Browser scroll behavior used for route restoration or interactive selection.
   * @returns Nothing; delegates to the shared sidebar-leaf restoration helper.
   */
  const scrollToSelectedOperation = useCallback(
    (behavior: ScrollBehavior) => {
      if (!selectedKey) return;
      scrollToSidebarItem(operationElementRefs.current.get(selectedKey), behavior, true);
    },
    [scrollToSidebarItem, selectedKey],
  );

  /**
   * Ensures a route-selected primary menu is open without collapsing unrelated free-mode menus.
   *
   * @param root Primary navigation branch containing the current route.
   * @returns Nothing; updates the open primary branch list when needed.
   */
  const ensureRootOpen = useCallback(
    (root: FlyoutMenu) => {
      setOpenRoots((current) =>
        current.includes(root)
          ? current
          : navigationExpansion === 'accordion'
            ? [root]
            : [...current, root],
      );
    },
    [navigationExpansion],
  );

  /**
   * Restores route-selected nested branches while preserving other free-mode expansion state.
   *
   * @param branches Parent identifiers mapped to the branch path that must be visible.
   * @returns Nothing; replaces or merges nested branch state according to the preference.
   */
  const ensureBranchesOpen = useCallback(
    (branches: Record<string, string[]>) => {
      setOpenBranches((current) => {
        if (navigationExpansion === 'accordion') {
          const unchanged =
            Object.keys(current).length === Object.keys(branches).length &&
            Object.entries(branches).every(
              ([parentId, branchIds]) =>
                current[parentId]?.length === branchIds.length &&
                branchIds.every((branchId, index) => current[parentId]?.[index] === branchId),
            );
          return unchanged ? current : branches;
        }
        let next = current;
        Object.entries(branches).forEach(([parentId, branchIds]) => {
          const existing = current[parentId] ?? [];
          if (branchIds.every((branchId) => existing.includes(branchId))) return;
          if (next === current) next = { ...current };
          next[parentId] = [...new Set([...existing, ...branchIds])];
        });
        return next;
      });
    },
    [navigationExpansion],
  );

  useEffect(() => {
    if (!selectedOperationLocation || !selectedKey) return;
    if (!hasRestoredInitialOperationRef.current) {
      hasRestoredInitialOperationRef.current = true;
      if (collapsed && initialOperationKeyRef.current === selectedKey) {
        onExpandForInitialSelection();
        return;
      }
    }
    if (collapsed) return;
    const behavior: ScrollBehavior =
      initialOperationScrollPendingRef.current && initialOperationKeyRef.current === selectedKey
        ? 'auto'
        : 'smooth';
    ensureRootOpen('api');
    ensureBranchesOpen({
      api: [selectedOperationLocation.sourceBranchId],
      [`api/${selectedOperationLocation.sourceBranchId}`]: [selectedOperationLocation.tagBranchId],
    });
    const frame = globalThis.requestAnimationFrame(() => {
      const restore = () => {
        operationRestoreTimerRef.current = undefined;
        initialOperationScrollPendingRef.current = false;
        scrollToSelectedOperation(behavior);
      };
      const target = operationElementRefs.current.get(selectedKey);
      if (
        target &&
        !target.closest('.workspace-menu-collapse:not(.workspace-menu-collapse-open), [inert]')
      ) {
        restore();
      } else {
        // Lazy branches need time to mount and finish expanding before measuring their rows.
        operationRestoreTimerRef.current = globalThis.setTimeout(
          restore,
          collapseAnimationDuration + 80,
        );
      }
    });
    return () => {
      globalThis.cancelAnimationFrame(frame);
      if (operationRestoreTimerRef.current !== undefined) {
        globalThis.clearTimeout(operationRestoreTimerRef.current);
        operationRestoreTimerRef.current = undefined;
      }
    };
  }, [
    collapsed,
    ensureBranchesOpen,
    ensureRootOpen,
    onExpandForInitialSelection,
    selectedKey,
    selectedOperationLocation,
    scrollToSelectedOperation,
  ]);

  useEffect(() => {
    if (!selectedModelLocation) return;
    if (!hasRestoredInitialModelRef.current) {
      hasRestoredInitialModelRef.current = true;
      if (collapsed && initialModelItemIdRef.current === selectedModelLocation.itemId) {
        onExpandForInitialSelection();
        return;
      }
    }
    if (collapsed) {
      return;
    }
    ensureRootOpen('models');
    ensureBranchesOpen({ models: [selectedModelLocation.sourceBranchId] });
    const frame = globalThis.requestAnimationFrame(() => {
      modelRestoreTimerRef.current = globalThis.setTimeout(() => {
        modelRestoreTimerRef.current = undefined;
        scrollToSidebarItem(
          modelElementRefs.current.get(selectedModelLocation.itemId),
          initialModelItemIdRef.current === selectedModelLocation.itemId ? 'auto' : 'smooth',
        );
      }, collapseAnimationDuration + 80);
    });
    return () => {
      globalThis.cancelAnimationFrame(frame);
      if (modelRestoreTimerRef.current !== undefined) {
        globalThis.clearTimeout(modelRestoreTimerRef.current);
        modelRestoreTimerRef.current = undefined;
      }
    };
  }, [
    collapsed,
    ensureBranchesOpen,
    ensureRootOpen,
    onExpandForInitialSelection,
    scrollToSidebarItem,
    selectedModelLocation,
  ]);

  useEffect(() => {
    if (!selectedMarkdownLocation) return;
    if (!hasRestoredInitialMarkdownRef.current) {
      hasRestoredInitialMarkdownRef.current = true;
      if (collapsed && initialMarkdownItemIdRef.current === selectedMarkdownLocation.itemId) {
        onExpandForInitialSelection();
        return;
      }
    }
    if (collapsed) {
      return;
    }
    ensureRootOpen('other');
    ensureBranchesOpen({ other: [selectedMarkdownLocation.groupBranchId] });
    const frame = globalThis.requestAnimationFrame(() => {
      markdownRestoreTimerRef.current = globalThis.setTimeout(() => {
        markdownRestoreTimerRef.current = undefined;
        scrollToSidebarItem(
          markdownElementRefs.current.get(selectedMarkdownLocation.itemId),
          initialMarkdownItemIdRef.current === selectedMarkdownLocation.itemId ? 'auto' : 'smooth',
        );
      }, collapseAnimationDuration + 80);
    });
    return () => {
      globalThis.cancelAnimationFrame(frame);
      if (markdownRestoreTimerRef.current !== undefined) {
        globalThis.clearTimeout(markdownRestoreTimerRef.current);
        markdownRestoreTimerRef.current = undefined;
      }
    };
  }, [
    collapsed,
    ensureBranchesOpen,
    ensureRootOpen,
    onExpandForInitialSelection,
    scrollToSidebarItem,
    selectedMarkdownLocation,
  ]);

  useEffect(() => {
    if (collapsed || (!isHomeActive && !isManagementActive)) return;
    if (isManagementActive) {
      ensureRootOpen('management');
      if (navigationExpansion === 'accordion') setOpenBranches({});
    }
    // Management leaves mount during the same collapse animation used by API/model branches.
    let timer: ReturnType<typeof globalThis.setTimeout> | undefined;
    const frame = globalThis.requestAnimationFrame(() => {
      timer = globalThis.setTimeout(
        () => {
          const selector = isHomeActive
            ? '.workspace-menu-leaf-primary.workspace-menu-leaf-active'
            : '.workspace-menu-leaf-management.workspace-menu-leaf-active';
          scrollToSidebarItem(
            expandedNavRef.current?.querySelector<HTMLButtonElement>(selector) ?? undefined,
            'smooth',
          );
        },
        isManagementActive ? collapseAnimationDuration + 80 : 0,
      );
    });
    return () => {
      globalThis.cancelAnimationFrame(frame);
      if (timer !== undefined) globalThis.clearTimeout(timer);
    };
  }, [
    collapsed,
    ensureRootOpen,
    isHomeActive,
    isManagementActive,
    navigationExpansion,
    scrollToSidebarItem,
    settingsSection,
    view,
  ]);

  useEffect(() => {
    if (navigationExpansion !== 'accordion') return;
    setOpenRoots((current) => current.slice(0, 1));
    setOpenBranches((current) =>
      Object.fromEntries(
        Object.entries(current).flatMap(([parentId, branchIds]) =>
          branchIds?.[0] ? [[parentId, [branchIds[0]]]] : [],
        ),
      ),
    );
  }, [navigationExpansion]);

  useEffect(() => {
    if (!collapsed) return;
    setOpenRoots([]);
    setOpenBranches({});
    setActiveFlyout(undefined);
  }, [collapsed]);

  /**
   * Starts a pointer-driven sidebar resize session with request-animation-frame throttling.
   *
   * @param event Pointer event raised by the sidebar resize handle.
   * @returns Nothing.
   */
  const startResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (collapsed || event.button !== 0 || !event.isPrimary) return;
    event.preventDefault();
    resizeStopRef.current?.();
    const workspace = sidebarRef.current?.closest<HTMLElement>('[data-workspace-root]');
    if (!workspace) return;
    const startX = event.clientX;
    const startWidth = width;
    let pendingWidth = width;
    const previousCursor = globalThis.document.body.style.cursor;
    const previousUserSelect = globalThis.document.body.style.userSelect;
    setIsResizing(true);
    onResizeChange(true);
    globalThis.document.body.style.cursor = 'col-resize';
    globalThis.document.body.style.userSelect = 'none';

    /**
     * Applies the latest constrained width at most once in each animation frame.
     *
     * @param moveEvent Native pointer event containing the current horizontal position.
     * @returns Nothing.
     */
    const handlePointerMove = (moveEvent: PointerEvent) => {
      pendingWidth = Math.min(
        maxWidth,
        Math.max(minWidth, Math.round(startWidth + moveEvent.clientX - startX)),
      );
      if (resizeFrameRef.current !== undefined) return;
      resizeFrameRef.current = globalThis.requestAnimationFrame(() => {
        resizeFrameRef.current = undefined;
        workspace.style.setProperty('--workspace-sidebar-preview', `${pendingWidth}px`);
      });
    };

    /**
     * Ends the resize session and restores document-level cursor and selection styles.
     *
     * @param None; commits the last constrained width and clears the preview.
     * @returns Nothing.
     */
    const stopResize = () => {
      globalThis.document.removeEventListener('pointermove', handlePointerMove);
      globalThis.document.removeEventListener('pointerup', stopResize);
      globalThis.document.removeEventListener('pointercancel', stopResize);
      globalThis.removeEventListener('blur', stopResize);
      if (resizeFrameRef.current !== undefined) {
        globalThis.cancelAnimationFrame(resizeFrameRef.current);
        resizeFrameRef.current = undefined;
      }
      onWidthChange(pendingWidth);
      workspace.style.removeProperty('--workspace-sidebar-preview');
      globalThis.document.body.style.cursor = previousCursor;
      globalThis.document.body.style.userSelect = previousUserSelect;
      resizeStopRef.current = undefined;
      setIsResizing(false);
      onResizeChange(false);
    };
    resizeStopRef.current = stopResize;
    globalThis.document.addEventListener('pointermove', handlePointerMove);
    globalThis.document.addEventListener('pointerup', stopResize, { once: true });
    globalThis.document.addEventListener('pointercancel', stopResize, { once: true });
    globalThis.addEventListener('blur', stopResize, { once: true });
  };

  /**
   * Checks whether a SpringDoc source is represented by the current fixed Hash route.
   *
   * @param sourceId Documentation source identifier being rendered.
   * @returns True when the source matches the route, otherwise false.
   */
  const isSourceSelected = (sourceId: string) =>
    (selectedSourceGroupId || allSourceId) === sourceId;

  /**
   * Renders one leaf button that navigates to an API operation.
   *
   * @param operation Operation to display and select.
   * @returns Method-tagged operation navigation button.
   */
  const renderOperationLeaf = (operation: ApiOperation, index: number) => {
    const operationKey = getDocumentationOperationKey(operation);
    return (
      <button
        className={`workspace-menu-operation ${selectedKey === operationKey ? 'workspace-menu-operation-active' : ''}`}
        key={operationKey}
        onClick={() => {
          closeFlyout();
          if (view === 'docs' && selectedKey === operationKey) return;
          onSelect(operation);
        }}
        ref={(element) => {
          if (element) operationElementRefs.current.set(operationKey, element);
          else operationElementRefs.current.delete(operationKey);
        }}
        style={{
          height: menuRowHeight,
          top: index * menuRowHeight,
        }}
        type="button"
      >
        <HttpMethodBadge
          active={selectedKey === operationKey}
          location="sidebar"
          method={operation.method}
        />
        <span className="min-w-0 flex-1 truncate">{operation.summary || operation.path}</span>
      </button>
    );
  };

  /**
   * Renders tag branches and lazy operation lists for one OpenAPI documentation source.
   *
   * @param source OpenAPI source whose Tag groups are displayed.
   * @param parentId Branch path that owns Tag accordion state.
   * @returns Tag accordion entries with operation leaf buttons.
   */
  const renderOperationGroups = (source: DocumentationSource, parentId: string) => (
    <div className="workspace-menu-panel workspace-menu-panel-deep">
      {source.groups.map(([tag, operations]) => {
        const branchId = `tag:${encodeURIComponent(tag)}`;
        const open = isBranchOpen(parentId, branchId);
        const sourceBranchId =
          source.id === allSourceId ? 'all' : `source:${encodeURIComponent(source.id)}`;
        const active =
          (view === 'docs' && selectedGroup === tag && isSourceSelected(source.id)) ||
          (selectedOperationLocation?.sourceBranchId === sourceBranchId &&
            selectedOperationLocation.tagBranchId === branchId);
        return (
          <section key={tag}>
            <AccordionBranchRow
              active={active}
              activeStyle="text"
              className="workspace-menu-branch-tertiary"
              count={operations.length}
              icon={<BranchFolderIcon open={open} />}
              label={tag}
              onSelect={() => {
                toggleBranch(parentId, branchId);
                if (!groupOverviewEnabled) return;
                closeFlyout();
                onSelectGroup(tag, source.id === allSourceId ? undefined : source.id);
              }}
              onToggle={() => toggleBranch(parentId, branchId)}
              open={open}
            />
            <AnimatedCollapse
              open={open}
              renderContent={() => (
                <div className="workspace-menu-panel workspace-menu-panel-operation-leaf">
                  <VirtualMenuList
                    items={operations}
                    renderItem={renderOperationLeaf}
                    selectedIndex={operations.findIndex(
                      (operation) => getDocumentationOperationKey(operation) === selectedKey,
                    )}
                  />
                </div>
              )}
            />
          </section>
        );
      })}
    </div>
  );

  /**
   * Renders document-management destinations under the matching primary accordion branch.
   *
   * @returns Secondary document-management navigation entries.
   */
  const renderManagementItems = () => (
    <div className="workspace-menu-panel workspace-menu-panel-management">
      {hasSecuritySchemes && (
        <MenuLeaf
          active={view === 'settings' && settingsSection === 'auth'}
          className="workspace-menu-leaf-management"
          icon={<IconShieldLock aria-hidden="true" size={16} stroke={1.8} />}
          label="全局认证"
          onClick={() => {
            closeFlyout();
            onSelectSettings('auth');
          }}
        />
      )}
      <MenuLeaf
        active={view === 'settings' && settingsSection === 'config'}
        className="workspace-menu-leaf-management"
        icon={<IconAdjustments aria-hidden="true" size={16} stroke={1.8} />}
        label="全局参数"
        onClick={() => {
          closeFlyout();
          onSelectSettings('config');
        }}
      />
      <MenuLeaf
        active={view === 'export'}
        className="workspace-menu-leaf-management"
        icon={<IconDownload aria-hidden="true" size={16} stroke={1.8} />}
        label="文档下载"
        onClick={() => {
          closeFlyout();
          onNavigate('export');
        }}
      />
    </div>
  );

  /**
   * Renders all-interface and source-group interface accordion branches.
   *
   * @returns API navigation where the all-document source appears before SpringDoc groups.
   */
  const renderApiItems = () => {
    const parentId = 'api';
    const allBranchId = 'all';
    const allOpen = isBranchOpen(parentId, allBranchId);
    return (
      <div className="workspace-menu-panel">
        {allSource ? (
          <section>
            <AccordionBranchRow
              active={isAllApiActive}
              activeStyle="text"
              className="workspace-menu-branch-secondary"
              count={allSource.operations.length}
              icon={<BranchFolderIcon open={allOpen} />}
              label="全部接口"
              onSelect={() => {
                toggleBranch(parentId, allBranchId);
                if (!groupOverviewEnabled) return;
                closeFlyout();
                onNavigate('docs', allSourceId);
              }}
              onToggle={() => toggleBranch(parentId, allBranchId)}
              open={allOpen}
            />
            <AnimatedCollapse
              open={allOpen}
              renderContent={() => renderOperationGroups(allSource, `${parentId}/${allBranchId}`)}
            />
          </section>
        ) : (
          <p className="workspace-menu-empty">暂无接口文档</p>
        )}
        {sourceGroups.map((source, index) => {
          const branchId = `source:${encodeURIComponent(source.id)}`;
          const open = isBranchOpen(parentId, branchId);
          const active = view === 'docs' && isSourceSelected(source.id);
          return (
            <section className={index === 0 ? 'workspace-menu-source-start' : ''} key={source.id}>
              <AccordionBranchRow
                active={active}
                activeStyle="text"
                className="workspace-menu-branch-secondary"
                count={source.operations.length}
                icon={<BranchFolderIcon open={open} />}
                label={source.name}
                onSelect={() => {
                  toggleBranch(parentId, branchId);
                  if (!groupOverviewEnabled) return;
                  closeFlyout();
                  onNavigate('docs', source.id);
                }}
                onToggle={() => toggleBranch(parentId, branchId)}
                open={open}
              />
              <AnimatedCollapse
                open={open}
                renderContent={() => renderOperationGroups(source, `${parentId}/${branchId}`)}
              />
            </section>
          );
        })}
      </div>
    );
  };

  /**
   * Renders schema leaf buttons for one all-document or source-group model branch.
   *
   * @param source OpenAPI source that owns the displayed schema definitions.
   * @param sourceGroupId Source route identifier; omitted for all-document models.
   * @returns Schema selection buttons for the requested source.
   */
  const renderModelLeaves = (source: DocumentationSource, sourceGroupId?: string) => {
    const names = modelNamesBySource.get(source.id) ?? [];
    if (names.length === 0) return <p className="workspace-menu-empty">暂无实体</p>;
    const sourceSelected =
      view === 'models' && (selectedSourceGroupId || allSourceId) === source.id;
    return (
      <div className="workspace-menu-panel workspace-menu-panel-leaf">
        <VirtualMenuList
          items={names}
          renderItem={(name, index) => {
            const itemId = `model:${source.id}:${name}`;
            return (
              <div
                className="workspace-menu-virtual-row"
                key={name}
                style={{ height: menuRowHeight, top: index * menuRowHeight }}
              >
                <MenuLeaf
                  active={sourceSelected && selectedModelName === name}
                  elementRef={(element) => {
                    if (element) modelElementRefs.current.set(itemId, element);
                    else modelElementRefs.current.delete(itemId);
                  }}
                  icon={<IconCube aria-hidden="true" size={15} stroke={1.8} />}
                  label={name}
                  onClick={() => {
                    closeFlyout();
                    onSelectModel(name, sourceGroupId);
                  }}
                />
              </div>
            );
          }}
          selectedIndex={sourceSelected ? names.indexOf(selectedModelName ?? '') : -1}
        />
      </div>
    );
  };

  /**
   * Renders all-entity and source-group entity accordion branches.
   *
   * @returns Model navigation where all-document schemas appear before SpringDoc group schemas.
   */
  const renderModelItems = () => {
    const parentId = 'models';
    const allBranchId = 'all';
    const allOpen = isBranchOpen(parentId, allBranchId);
    const allModelCount = modelNamesBySource.get(allSourceId)?.length ?? 0;
    return (
      <div className="workspace-menu-panel">
        {allSource ? (
          <section>
            <AccordionBranchRow
              active={view === 'models' && !selectedSourceGroupId}
              activeStyle="text"
              className="workspace-menu-branch-secondary"
              count={allModelCount}
              icon={<BranchFolderIcon open={allOpen} />}
              label="全部实体"
              onSelect={() => toggleBranch(parentId, allBranchId)}
              onToggle={() => toggleBranch(parentId, allBranchId)}
              open={allOpen}
            />
            <AnimatedCollapse open={allOpen} renderContent={() => renderModelLeaves(allSource)} />
          </section>
        ) : (
          <p className="workspace-menu-empty">暂无实体</p>
        )}
        {sourceGroups.map((source, index) => {
          const branchId = `source:${encodeURIComponent(source.id)}`;
          const open = isBranchOpen(parentId, branchId);
          const count = modelNamesBySource.get(source.id)?.length ?? 0;
          const active = view === 'models' && isSourceSelected(source.id);
          return (
            <section className={index === 0 ? 'workspace-menu-source-start' : ''} key={source.id}>
              <AccordionBranchRow
                active={active}
                activeStyle="text"
                className="workspace-menu-branch-secondary"
                count={count}
                icon={<BranchFolderIcon open={open} />}
                label={source.name}
                onSelect={() => toggleBranch(parentId, branchId)}
                onToggle={() => toggleBranch(parentId, branchId)}
                open={open}
              />
              <AnimatedCollapse
                open={open}
                renderContent={() => renderModelLeaves(source, source.id)}
              />
            </section>
          );
        })}
      </div>
    );
  };

  /**
   * Renders extension-provided Markdown groups with mutually exclusive document lists.
   *
   * @returns Supplementary document groups and their nested document entries.
   */
  const renderOtherDocumentItems = () => {
    const parentId = 'other';
    if (markdownGroups.length === 0) return <p className="workspace-menu-empty">暂无扩展文档</p>;
    return (
      <div className="workspace-menu-panel">
        {markdownGroups.map(([group, documents]) => {
          const branchId = `group:${encodeURIComponent(group)}`;
          const open = isBranchOpen(parentId, branchId);
          const active = selectedMarkdown?.group === group;
          return (
            <section key={group}>
              <AccordionBranchRow
                active={active}
                activeStyle="text"
                className="workspace-menu-branch-secondary"
                count={documents.length}
                icon={<BranchFolderIcon open={open} />}
                label={group}
                onToggle={() => toggleBranch(parentId, branchId)}
                open={open}
              />
              <AnimatedCollapse
                open={open}
                renderContent={() => (
                  <div className="workspace-menu-panel workspace-menu-panel-leaf">
                    <VirtualMenuList
                      items={documents}
                      renderItem={(markdownDocument, index) => {
                        const itemId = `markdown:${group}:${markdownDocument.displayName}`;
                        return (
                          <div
                            className="workspace-menu-virtual-row"
                            key={itemId}
                            style={{ height: menuRowHeight, top: index * menuRowHeight }}
                          >
                            <MenuLeaf
                              active={
                                selectedMarkdown?.group === group &&
                                selectedMarkdown.displayName === markdownDocument.displayName
                              }
                              elementRef={(element) => {
                                if (element) markdownElementRefs.current.set(itemId, element);
                                else markdownElementRefs.current.delete(itemId);
                              }}
                              icon={<IconFileText aria-hidden="true" size={15} stroke={1.8} />}
                              label={markdownDocument.displayName}
                              onClick={() => {
                                closeFlyout();
                                onSelectMarkdown(markdownDocument);
                              }}
                            />
                          </div>
                        );
                      }}
                      selectedIndex={documents.findIndex(
                        (document) =>
                          selectedMarkdown?.group === group &&
                          selectedMarkdown.displayName === document.displayName,
                      )}
                    />
                  </div>
                )}
              />
            </section>
          );
        })}
      </div>
    );
  };

  const managementOpen = openRoots.includes('management');
  const apiOpen = openRoots.includes('api');
  const modelsOpen = openRoots.includes('models');
  const otherOpen = openRoots.includes('other');

  return (
    <aside
      className={`workspace-sidebar flex h-full min-h-0 shrink-0 flex-col border-r border-line bg-white ${collapsed ? 'workspace-sidebar-collapsed' : 'workspace-sidebar-expanded'} ${isResizing ? 'workspace-sidebar-resizing' : ''}`}
      ref={sidebarRef}
      style={{
        width: collapsed
          ? undefined
          : 'var(--workspace-sidebar-preview, var(--workspace-sidebar-width))',
      }}
    >
      {!collapsed && (
        <div
          aria-label="拖拽调整侧边栏宽度"
          aria-orientation="vertical"
          aria-valuemax={maxWidth}
          aria-valuemin={minWidth}
          aria-valuenow={width}
          className="workspace-sidebar-resize-handle"
          onPointerDown={startResize}
          role="separator"
        />
      )}

      <nav
        aria-hidden={collapsed}
        className={`workspace-sidebar-nav-layer workspace-sidebar-expanded-nav workspace-sidebar-scroll rare-moving-menu ${collapsed ? 'workspace-sidebar-nav-hidden' : 'workspace-sidebar-nav-visible'}`}
        inert={collapsed}
        ref={expandedNavRef}
      >
        <MenuLeaf
          active={isHomeActive}
          className="workspace-menu-leaf-primary"
          icon={<IconHome2 aria-hidden="true" size={17} stroke={1.8} />}
          label="主页"
          onClick={() => onNavigate('docs')}
        />

        <section className="mt-1">
          <AccordionBranchRow
            active={isManagementActive}
            activeStyle="text"
            className="workspace-menu-branch-primary"
            icon={<BranchFolderIcon open={managementOpen} size={17} />}
            label="文档管理"
            onToggle={() => toggleRoot('management')}
            open={managementOpen}
          />
          <AnimatedCollapse open={managementOpen} renderContent={renderManagementItems} />
        </section>

        <section className="mt-1">
          <AccordionBranchRow
            active={isApiActive}
            activeStyle="text"
            className="workspace-menu-branch-primary"
            icon={<IconCode aria-hidden="true" size={17} stroke={1.8} />}
            label="接口文档"
            onToggle={() => toggleRoot('api')}
            open={apiOpen}
          />
          <AnimatedCollapse open={apiOpen} renderContent={renderApiItems} />
        </section>

        <section className="mt-1">
          <AccordionBranchRow
            active={isModelsActive}
            activeStyle="text"
            className="workspace-menu-branch-primary"
            icon={<IconCube aria-hidden="true" size={17} stroke={1.8} />}
            label="实体模型"
            onToggle={() => toggleRoot('models')}
            open={modelsOpen}
          />
          <AnimatedCollapse open={modelsOpen} renderContent={renderModelItems} />
        </section>

        {markdownGroups.length > 0 && (
          <section className="mt-1">
            <AccordionBranchRow
              active={isOtherDocumentsActive}
              activeStyle="text"
              className="workspace-menu-branch-primary"
              icon={<IconBook2 aria-hidden="true" size={17} stroke={1.8} />}
              label="其他文档"
              onToggle={() => toggleRoot('other')}
              open={otherOpen}
            />
            <AnimatedCollapse open={otherOpen} renderContent={renderOtherDocumentItems} />
          </section>
        )}
      </nav>

      <nav
        ref={collapsedNavRef}
        aria-hidden={!collapsed}
        className={`workspace-sidebar-nav-layer workspace-sidebar-collapsed-nav rare-moving-menu ${collapsed ? 'workspace-sidebar-nav-visible' : 'workspace-sidebar-nav-hidden'}`}
        inert={!collapsed}
      >
        <button
          aria-label="主页"
          className={`workspace-collapsed-nav-item ${isHomeActive ? 'workspace-collapsed-nav-item-active' : ''}`}
          onClick={() => {
            closeFlyout();
            onNavigate('docs');
          }}
          title="主页"
          type="button"
        >
          <IconHome2 aria-hidden="true" size={19} stroke={1.8} />
        </button>

        <CompactMenu
          active={isManagementActive}
          activeStyle="text"
          icon={<BranchFolderIcon open={activeFlyout === 'management'} size={19} />}
          label="文档管理"
          onClose={closeFlyout}
          onToggle={() => toggleFlyout('management')}
          open={activeFlyout === 'management'}
          renderContent={renderManagementItems}
        />
        <CompactMenu
          active={isApiActive}
          activeStyle="text"
          icon={<IconCode aria-hidden="true" size={19} stroke={1.8} />}
          label="接口文档"
          onClose={closeFlyout}
          onToggle={() => toggleFlyout('api')}
          open={activeFlyout === 'api'}
          renderContent={renderApiItems}
        />
        <CompactMenu
          active={isModelsActive}
          activeStyle="text"
          icon={<IconCube aria-hidden="true" size={19} stroke={1.8} />}
          label="实体模型"
          onClose={closeFlyout}
          onToggle={() => toggleFlyout('models')}
          open={activeFlyout === 'models'}
          renderContent={renderModelItems}
        />
        {markdownGroups.length > 0 && (
          <CompactMenu
            active={isOtherDocumentsActive}
            activeStyle="text"
            icon={<IconBook2 aria-hidden="true" size={19} stroke={1.8} />}
            label="其他文档"
            onClose={closeFlyout}
            onToggle={() => toggleFlyout('other')}
            open={activeFlyout === 'other'}
            renderContent={renderOtherDocumentItems}
          />
        )}
      </nav>
    </aside>
  );
}
