import { useEffect, useRef, useState } from 'react';
import type { WorkspaceTab, WorkspaceTabContextMenu } from './tabs';

/** Owns tab-menu positioning, dismissal and browser window commands independently from document loading.
 * @param None.
 * @returns Menu state, anchor and commands used by the workspace tab strip.
 */
export function useWorkspaceTabMenu() {
  const [tabContextMenu, setTabContextMenu] = useState<WorkspaceTabContextMenu>();
  const [workspaceFullscreen, setWorkspaceFullscreen] = useState(() =>
    Boolean(globalThis.document.fullscreenElement),
  );
  const tabContextMenuRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const syncFullscreen = () =>
      setWorkspaceFullscreen(Boolean(globalThis.document.fullscreenElement));
    globalThis.document.addEventListener('fullscreenchange', syncFullscreen);
    return () => globalThis.document.removeEventListener('fullscreenchange', syncFullscreen);
  }, []);
  useEffect(() => {
    if (!tabContextMenu) return;
    const closeOnOutsidePress = (event: PointerEvent) => {
      if (event.target instanceof Node && !tabContextMenuRef.current?.contains(event.target)) {
        setTabContextMenu(undefined);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setTabContextMenu(undefined);
    };
    const closeOnResize = () => setTabContextMenu(undefined);
    globalThis.document.addEventListener('pointerdown', closeOnOutsidePress);
    globalThis.document.addEventListener('keydown', closeOnEscape);
    globalThis.addEventListener('resize', closeOnResize);
    return () => {
      globalThis.document.removeEventListener('pointerdown', closeOnOutsidePress);
      globalThis.document.removeEventListener('keydown', closeOnEscape);
      globalThis.removeEventListener('resize', closeOnResize);
    };
  }, [tabContextMenu]); /**
   * Opens the tab action menu at one pointer or tab-anchor position while keeping it on screen.
   *
   * @param tab Tab whose actions should be shown.
   * @param anchor Element rectangle or pointer coordinates used to position the menu.
   * @returns Nothing; replaces any previous tab action menu.
   */
  const openWorkspaceTabMenu = (
    tab: WorkspaceTab,
    anchor: HTMLElement | { clientX: number; clientY: number },
  ) => {
    const point =
      anchor instanceof HTMLElement
        ? {
            clientX: anchor.getBoundingClientRect().left,
            clientY: anchor.getBoundingClientRect().bottom + 6,
          }
        : anchor;
    setTabContextMenu({
      left: Math.max(8, Math.min(point.clientX, globalThis.innerWidth - 208)),
      tabId: tab.id,
      top: Math.max(8, Math.min(point.clientY, globalThis.innerHeight - 304)),
    });
  };

  /**
   * Opens one workspace tab route in a separate browser window.
   *
   * @param tab Tab route to open in the new browser window.
   * @returns Nothing; uses the current origin and the tab's hash route.
   */
  const openWorkspaceTabInNewWindow = (tab: WorkspaceTab) => {
    const url = new URL(globalThis.location.href);
    url.hash = tab.route;
    const nextWindow = globalThis.open(url.toString(), '_blank', 'noopener,noreferrer');
    if (nextWindow) nextWindow.opener = null;
  };

  /**
   * Toggles browser fullscreen for the workspace action menu's maximize command.
   *
   * @param None; reads the current component state and DOM references.
   * @returns Nothing; leaves the workspace unchanged if fullscreen is unavailable or rejected.
   */
  const toggleWorkspaceFullscreen = () => {
    const action = workspaceFullscreen
      ? globalThis.document.exitFullscreen()
      : globalThis.document.documentElement.requestFullscreen();
    void action.catch(() => undefined);
  };

  return {
    tabContextMenu,
    setTabContextMenu,
    tabContextMenuRef,
    workspaceFullscreen,
    openWorkspaceTabMenu,
    openWorkspaceTabInNewWindow,
    toggleWorkspaceFullscreen,
  };
}
