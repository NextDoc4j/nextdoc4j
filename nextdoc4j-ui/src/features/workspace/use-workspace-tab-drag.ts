import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
  type RefObject,
  type DragEvent,
} from 'react';
import {
  moveWorkspaceTab,
  workspaceTabDragDirectionThreshold,
  type WorkspaceTab,
  type WorkspaceTabContextMenu,
  type WorkspaceTabDragState,
  type WorkspaceTabDropPlacement,
} from './tabs';

interface WorkspaceTabDragOptions {
  workspaceTabs: WorkspaceTab[];
  setWorkspaceTabs: Dispatch<SetStateAction<WorkspaceTab[]>>;
  workspaceTabsOrderRef: RefObject<WorkspaceTab[]>;
  workspaceTabsRef: RefObject<HTMLDivElement | null>;
  workspaceTabElementRefs: RefObject<Map<string, HTMLDivElement>>;
  setTabContextMenu: Dispatch<SetStateAction<WorkspaceTabContextMenu | undefined>>;
  resetKey: unknown;
}

/** Owns native tab drag, directional reordering, FLIP animation and edge scrolling as one interaction.
 * @param options Controlled tabs, DOM anchors, current ordering and workspace lifecycle identity.
 * @returns Drag state and start/finish commands, without owning routing or persistence.
 */
export function useWorkspaceTabDrag({
  workspaceTabs,
  setWorkspaceTabs,
  workspaceTabsOrderRef,
  workspaceTabsRef,
  workspaceTabElementRefs,
  setTabContextMenu,
  resetKey,
}: WorkspaceTabDragOptions) {
  const [workspaceTabDrag, setWorkspaceTabDrag] = useState<WorkspaceTabDragState>();
  const workspaceTabDragRef = useRef<WorkspaceTabDragState | undefined>(undefined);
  const workspaceTabPositionSnapshotRef = useRef<Map<string, number> | undefined>(undefined);
  const workspaceTabAnimationFrameRef = useRef<number | null>(null);
  const workspaceTabAnimationTimerRef = useRef<ReturnType<typeof globalThis.setTimeout> | null>(
    null,
  );
  const workspaceTabAnimatedElementsRef = useRef<HTMLDivElement[]>([]);
  const workspaceTabAutoScrollFrameRef = useRef<number | null>(null);
  const workspaceTabAutoScrollBoundsRef = useRef<DOMRect | undefined>(undefined);
  const workspaceTabAutoScrollVelocityRef = useRef(0);
  const workspaceTabDragHandlersRef = useRef<
    | {
        finish: () => void;
        reorder: (clientX: number, targetTab: WorkspaceTab) => void;
        updateAutoScroll: (clientX: number) => void;
      }
    | undefined
  >(undefined);
  useLayoutEffect(() => {
    const previousPositions = workspaceTabPositionSnapshotRef.current;
    if (!previousPositions) return;
    workspaceTabPositionSnapshotRef.current = undefined;

    const tabList = workspaceTabsRef.current;
    if (!tabList) return;
    if (workspaceTabAnimationFrameRef.current !== null) {
      globalThis.cancelAnimationFrame(workspaceTabAnimationFrameRef.current);
      workspaceTabAnimationFrameRef.current = null;
    }
    if (workspaceTabAnimationTimerRef.current !== null) {
      globalThis.clearTimeout(workspaceTabAnimationTimerRef.current);
      workspaceTabAnimationTimerRef.current = null;
    }
    workspaceTabAnimatedElementsRef.current.forEach((element) => {
      element.style.removeProperty('transform');
      element.style.removeProperty('transition');
      element.style.removeProperty('will-change');
    });
    workspaceTabAnimatedElementsRef.current = [];
    if (globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    const candidates = [...previousPositions.entries()]
      .filter(([tabId]) => tabId !== workspaceTabDragRef.current?.tabId)
      .flatMap(([tabId, previousLeft]) => {
        const element = workspaceTabElementRefs.current.get(tabId);
        return element ? [{ element, previousLeft }] : [];
      });
    candidates.forEach(({ element }) => {
      element.style.transition = 'none';
      element.style.transform = 'none';
    });
    void tabList.offsetWidth;

    const measurements = candidates.map(({ element, previousLeft }) => ({
      element,
      offset: previousLeft - (element.getBoundingClientRect().left + tabList.scrollLeft),
    }));
    const animations = measurements.flatMap(({ element, offset }) => {
      if (Math.abs(offset) < 0.5) return [];
      element.style.setProperty('transform', `translate3d(${offset}px, 0, 0)`, 'important');
      element.style.willChange = 'transform';
      return [element];
    });
    const animatedElements = new Set(animations);
    candidates
      .filter(({ element }) => !animatedElements.has(element))
      .forEach(({ element }) => {
        element.style.removeProperty('transform');
        element.style.removeProperty('transition');
      });
    if (animations.length === 0) return;

    void tabList.offsetWidth;
    workspaceTabAnimatedElementsRef.current = animations;
    workspaceTabAnimationFrameRef.current = globalThis.requestAnimationFrame(() => {
      workspaceTabAnimationFrameRef.current = null;
      animations.forEach((element) => {
        element.style.setProperty(
          'transition',
          'transform 200ms cubic-bezier(0.2, 0, 0, 1)',
          'important',
        );
        element.style.setProperty('transform', 'translate3d(0, 0, 0)', 'important');
      });
      workspaceTabAnimationTimerRef.current = globalThis.setTimeout(() => {
        animations.forEach((element) => {
          element.style.removeProperty('transition');
          element.style.removeProperty('transform');
          element.style.removeProperty('will-change');
        });
        workspaceTabAnimatedElementsRef.current = [];
        workspaceTabAnimationTimerRef.current = null;
      }, 240);
    });
  }, [workspaceTabs, workspaceTabElementRefs, workspaceTabsRef]);

  useEffect(
    () => () => {
      if (workspaceTabAnimationFrameRef.current !== null) {
        globalThis.cancelAnimationFrame(workspaceTabAnimationFrameRef.current);
      }
      if (workspaceTabAnimationTimerRef.current !== null) {
        globalThis.clearTimeout(workspaceTabAnimationTimerRef.current);
      }
      if (workspaceTabAutoScrollFrameRef.current !== null) {
        globalThis.cancelAnimationFrame(workspaceTabAutoScrollFrameRef.current);
      }
    },
    [],
  );

  /**
   * Captures visible positions for the tabs displaced by one drag reorder so they can use a FLIP transition.
   *
   * @param draggedTabId Stable identifier of the tab being moved.
   * @param targetTabId Stable identifier of the tab currently receiving the move.
   * @returns Nothing; stores current content-relative positions for the next layout effect.
   */
  const captureWorkspaceTabPositions = (draggedTabId: string, targetTabId: string) => {
    const tabList = workspaceTabsRef.current;
    if (!tabList) return;

    const currentTabs = workspaceTabsOrderRef.current;
    const draggedIndex = currentTabs.findIndex((tab) => tab.id === draggedTabId);
    const targetIndex = currentTabs.findIndex((tab) => tab.id === targetTabId);
    if (draggedIndex === -1 || targetIndex === -1) return;

    const positions = new Map<string, number>();
    currentTabs.forEach((tab) => {
      const element = workspaceTabElementRefs.current.get(tab.id);
      if (!element) return;
      const bounds = element.getBoundingClientRect();
      positions.set(tab.id, bounds.left + tabList.scrollLeft);
    });
    workspaceTabPositionSnapshotRef.current = positions;
  };

  /**
   * Stops request-animation-frame scrolling used while a dragged tab reaches a tab-strip edge.
   *
   * @param None; reads the current component state and DOM references.
   * @returns Nothing; clears the pending frame and resets the scrolling velocity.
   */
  const stopWorkspaceTabAutoScroll = () => {
    workspaceTabAutoScrollVelocityRef.current = 0;
    if (workspaceTabAutoScrollFrameRef.current === null) return;
    globalThis.cancelAnimationFrame(workspaceTabAutoScrollFrameRef.current);
    workspaceTabAutoScrollFrameRef.current = null;
  };

  /**
   * Updates smooth horizontal tab-strip scrolling from a drag pointer position near either edge.
   *
   * @param clientX Horizontal viewport coordinate of the active drag pointer.
   * @returns Nothing; starts at most one animation frame loop for the active drag.
   */
  const updateWorkspaceTabAutoScroll = (clientX: number) => {
    const tabList = workspaceTabsRef.current;
    if (!tabList) {
      stopWorkspaceTabAutoScroll();
      return;
    }

    const bounds = workspaceTabAutoScrollBoundsRef.current ?? tabList.getBoundingClientRect();
    const edgeSize = Math.max(1, Math.min(56, bounds.width / 3));
    const leftDistance = Math.max(0, Math.min(1, (clientX - bounds.left) / edgeSize));
    const rightDistance = Math.max(0, Math.min(1, (bounds.right - clientX) / edgeSize));
    const velocity =
      clientX < bounds.left + edgeSize
        ? -Math.ceil((1 - leftDistance) * 16)
        : clientX > bounds.right - edgeSize
          ? Math.ceil((1 - rightDistance) * 16)
          : 0;
    if (velocity === 0) {
      stopWorkspaceTabAutoScroll();
      return;
    }

    workspaceTabAutoScrollVelocityRef.current = velocity;
    if (workspaceTabAutoScrollFrameRef.current !== null) return;
    /** Advances one edge-scroll frame without scheduling parallel loops.
     * @param None; reads the latest velocity and strip element.
     * @returns Nothing; schedules another frame only while the strip can move.
     */
    const scroll = () => {
      const activeTabList = workspaceTabsRef.current;
      const activeVelocity = workspaceTabAutoScrollVelocityRef.current;
      if (!activeTabList || activeVelocity === 0) {
        workspaceTabAutoScrollFrameRef.current = null;
        return;
      }
      const previousLeft = activeTabList.scrollLeft;
      activeTabList.scrollLeft += activeVelocity;
      if (activeTabList.scrollLeft === previousLeft) {
        workspaceTabAutoScrollFrameRef.current = null;
        return;
      }
      workspaceTabAutoScrollFrameRef.current = globalThis.requestAnimationFrame(scroll);
    };
    workspaceTabAutoScrollFrameRef.current = globalThis.requestAnimationFrame(scroll);
  };

  /**
   * Starts one native tab drag and records the fixed-tab group that may receive the dragged tab.
   *
   * @param event Native-backed React drag event for the tab container.
   * @param tab Tab that should be moved.
   * @returns Nothing; records the drag state and configures the browser move operation.
   */
  const startWorkspaceTabDrag = (event: DragEvent<HTMLDivElement>, tab: WorkspaceTab) => {
    const nextDragState: WorkspaceTabDragState = {
      directionAnchorX: event.clientX,
      pinned: Boolean(tab.pinned),
      tabId: tab.id,
    };
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', tab.id);
    workspaceTabAutoScrollBoundsRef.current = workspaceTabsRef.current?.getBoundingClientRect();
    workspaceTabsOrderRef.current = workspaceTabs;
    workspaceTabDragRef.current = nextDragState;
    setWorkspaceTabDrag(nextDragState);
    setTabContextMenu(undefined);
  };

  /**
   * Reorders tabs as soon as a drag reaches an eligible target tab while preserving drag direction.
   *
   * @param clientX Horizontal viewport coordinate of the active drag pointer.
   * @param targetTab Tab currently under the drag pointer.
   * @returns Nothing; moves toward the target immediately without allowing a reordered pair to oscillate.
   */
  const reorderWorkspaceTabFromDrag = (clientX: number, targetTab: WorkspaceTab) => {
    const dragState = workspaceTabDragRef.current;
    if (!dragState) return;

    const distanceFromDirectionAnchor = clientX - dragState.directionAnchorX;
    const hasDirectionalMovement =
      Math.abs(distanceFromDirectionAnchor) >= workspaceTabDragDirectionThreshold;
    const direction = hasDirectionalMovement
      ? distanceFromDirectionAnchor < 0
        ? 'left'
        : 'right'
      : dragState.direction;
    const directionalDragState = hasDirectionalMovement
      ? { ...dragState, direction, directionAnchorX: clientX }
      : dragState;
    workspaceTabDragRef.current = directionalDragState;
    if (
      directionalDragState.tabId === targetTab.id ||
      directionalDragState.pinned !== Boolean(targetTab.pinned)
    ) {
      return;
    }

    const currentTabs = workspaceTabsOrderRef.current;
    const draggedIndex = currentTabs.findIndex((tab) => tab.id === directionalDragState.tabId);
    const targetIndex = currentTabs.findIndex((tab) => tab.id === targetTab.id);
    if (draggedIndex === -1 || targetIndex === -1) return;

    // Check target midpoint to ensure smooth, natural hysteresis without premature flipping
    const targetElement = workspaceTabElementRefs.current.get(targetTab.id);
    if (targetElement) {
      const targetBounds = targetElement.getBoundingClientRect();
      const targetMidX = targetBounds.left + targetBounds.width / 2;
      if (draggedIndex < targetIndex && clientX < targetMidX) return;
      if (draggedIndex > targetIndex && clientX > targetMidX) return;
    }

    const placement: WorkspaceTabDropPlacement =
      directionalDragState.direction === 'left'
        ? 'before'
        : directionalDragState.direction === 'right'
          ? 'after'
          : targetIndex < draggedIndex
            ? 'before'
            : 'after';
    if (
      directionalDragState.targetId === targetTab.id &&
      directionalDragState.placement === placement
    ) {
      return;
    }

    const nextDragState = { ...directionalDragState, placement, targetId: targetTab.id };
    workspaceTabDragRef.current = nextDragState;

    const nextTabs = moveWorkspaceTab(
      workspaceTabsOrderRef.current,
      directionalDragState.tabId,
      targetTab.id,
      placement,
    );
    if (nextTabs === workspaceTabsOrderRef.current) return;

    captureWorkspaceTabPositions(directionalDragState.tabId, targetTab.id);
    workspaceTabsOrderRef.current = nextTabs;
    setWorkspaceTabs(nextTabs);
  };

  /**
   * Finishes a native tab drag after a drop or cancellation.
   *
   * @param None; reads the current component state and DOM references.
   * @returns Nothing; clears drag visuals and any edge-scrolling animation frame.
   */
  const finishWorkspaceTabDrag = () => {
    stopWorkspaceTabAutoScroll();
    workspaceTabAutoScrollBoundsRef.current = undefined;
    workspaceTabDragRef.current = undefined;
    setWorkspaceTabDrag(undefined);
  };

  useLayoutEffect(() => {
    workspaceTabDragHandlersRef.current = {
      finish: finishWorkspaceTabDrag,
      reorder: reorderWorkspaceTabFromDrag,
      updateAutoScroll: updateWorkspaceTabAutoScroll,
    };
  });

  /**
   * Keeps native drag listeners on the tab strip so nested tab controls receive the same drop logic.
   *
   * @param None; reads the current component state and DOM references.
   * @returns Nothing; registers capture listeners once and removes them when the strip unmounts.
   */
  useEffect(() => {
    const tabList = workspaceTabsRef.current;
    if (!tabList) return;
    /** Routes native drag events from nested controls to the current drag handlers.
     * @param event Native drag event and current pointer coordinates.
     * @returns Nothing; forwards target reorder and edge-scroll intent.
     */
    const handleDragPointer = (event: globalThis.DragEvent) => {
      const dragState = workspaceTabDragRef.current;
      const handlers = workspaceTabDragHandlersRef.current;
      if (!dragState || !handlers) return;

      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
      const targetElement =
        event.target instanceof Element
          ? event.target.closest<HTMLElement>('[data-workspace-tab-id]')
          : null;
      const targetTabId = targetElement?.dataset.workspaceTabId;
      const targetTab = targetTabId
        ? workspaceTabsOrderRef.current.find((tab) => tab.id === targetTabId)
        : undefined;
      if (targetTab) handlers.reorder(event.clientX, targetTab);
      handlers.updateAutoScroll(event.clientX);
    };
    /** Ends an active drag after a drop or native cancellation.
     * @param event Native drag completion event.
     * @returns Nothing; clears active drag and scrolling state.
     */
    const finishDrag = (event: globalThis.DragEvent) => {
      if (!workspaceTabDragRef.current) return;
      event.preventDefault();
      workspaceTabDragHandlersRef.current?.finish();
    };

    tabList.addEventListener('dragenter', handleDragPointer, true);
    tabList.addEventListener('dragover', handleDragPointer, true);
    tabList.addEventListener('drop', finishDrag, true);
    tabList.addEventListener('dragend', finishDrag, true);
    return () => {
      tabList.removeEventListener('dragenter', handleDragPointer, true);
      tabList.removeEventListener('dragover', handleDragPointer, true);
      tabList.removeEventListener('drop', finishDrag, true);
      tabList.removeEventListener('dragend', finishDrag, true);
      workspaceTabDragHandlersRef.current?.finish();
    };
  }, [resetKey, workspaceTabsOrderRef, workspaceTabsRef]);

  return { workspaceTabDrag, workspaceTabDragRef, startWorkspaceTabDrag, finishWorkspaceTabDrag };
}
