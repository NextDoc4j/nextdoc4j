import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { IconChevronRight, IconFolder, IconFolderOpen, IconX } from '@tabler/icons-react';
import { useMovingHighlight } from '../../components/rare-ui/use-moving-highlight';
import { UI_MOTION } from '../../components/rare-ui/motion-timing';

interface AnimatedCollapseProps {
  open: boolean;
  renderContent: () => ReactNode;
}

interface BranchFolderIconProps {
  open: boolean;
  size?: number;
}

interface VirtualMenuListProps<Item> {
  items: Item[];
  renderItem: (item: Item, index: number) => ReactNode;
  selectedIndex: number;
}

interface AccordionBranchRowProps {
  active?: boolean;
  activeStyle?: 'fill' | 'text';
  className?: string;
  count?: number;
  icon?: ReactNode;
  label: string;
  onSelect?: () => void;
  onToggle: () => void;
  open: boolean;
}

interface MenuLeafProps {
  active?: boolean;
  className?: string;
  elementRef?: (element: HTMLButtonElement | null) => void;
  icon?: ReactNode;
  label: string;
  onClick: () => void;
}

interface CompactMenuProps {
  active: boolean;
  activeStyle?: 'fill' | 'text';
  icon: ReactNode;
  label: string;
  onClose: () => void;
  onToggle: () => void;
  open: boolean;
  renderContent: () => ReactNode;
}

const collapseAnimationDuration = UI_MOTION.collapse;
const menuRowHeight = 36;
const menuListOverscan = 8;

/**
 * Displays a closed or open folder icon that follows one accordion branch state.
 *
 * @param props Branch open state and optional icon size.
 * @returns Folder icon matching the current branch state.
 */
export function BranchFolderIcon({ open, size = 16 }: BranchFolderIconProps) {
  return (
    <span
      aria-hidden="true"
      className="workspace-branch-folder"
      data-open={open}
      style={{ width: size, height: size }}
    >
      <IconFolder className="workspace-branch-folder__closed" size={size} stroke={1.8} />
      <IconFolderOpen className="workspace-branch-folder__open" size={size} stroke={1.8} />
    </span>
  );
}

/**
 * Animates one lazy-rendered tree branch while retaining its content briefly for closing motion.
 *
 * @param props Branch visibility and a deferred renderer for potentially large child collections.
 * @returns A height-animated branch panel, or null after its closing animation completes.
 */
export function AnimatedCollapse({ open, renderContent }: AnimatedCollapseProps) {
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let mountFrame: number | undefined;
    let openFrame: number | undefined;
    let timeout: ReturnType<typeof globalThis.setTimeout> | undefined;
    const reduceMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (open) {
      setMounted(true);
      if (reduceMotion) setVisible(true);
      else {
        setVisible(false);
        mountFrame = globalThis.requestAnimationFrame(() => {
          openFrame = globalThis.requestAnimationFrame(() => setVisible(true));
        });
      }
    } else {
      setVisible(false);
      if (reduceMotion) setMounted(false);
      else timeout = globalThis.setTimeout(() => setMounted(false), collapseAnimationDuration);
    }
    return () => {
      if (mountFrame !== undefined) globalThis.cancelAnimationFrame(mountFrame);
      if (openFrame !== undefined) globalThis.cancelAnimationFrame(openFrame);
      if (timeout !== undefined) globalThis.clearTimeout(timeout);
    };
  }, [open]);

  if (!mounted) return null;

  return (
    <div
      aria-hidden={!open}
      className={`workspace-menu-collapse ${visible ? 'workspace-menu-collapse-open' : ''}`}
      inert={!open}
    >
      <div className="workspace-menu-collapse-content">{renderContent()}</div>
    </div>
  );
}

/**
 * Renders only menu rows near the visible sidebar range while retaining full scroll geometry.
 *
 * @param props Ordered items, current selection and row renderer.
 * @returns A fixed-height virtual list whose DOM size stays bounded for large menu collections.
 */
export function VirtualMenuList<Item>({
  items,
  renderItem,
  selectedIndex,
}: VirtualMenuListProps<Item>) {
  const listRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<number | undefined>(undefined);
  const [range, setRange] = useState(() => ({
    end: Math.min(items.length, menuListOverscan * 3),
    start: 0,
  }));

  useLayoutEffect(() => {
    const list = listRef.current;
    const viewport = list?.closest<HTMLElement>(
      '.workspace-sidebar-scroll, .workspace-sidebar-flyout',
    );
    if (!list || !viewport) return;

    /**
     * Calculates the menu rows intersecting the sidebar viewport plus a small buffer.
     *
     * @param None; reads the current component state and DOM references.
     * @returns Nothing; updates the rendered index range only when its bounds change.
     */
    const updateRange = () => {
      frameRef.current = undefined;
      const listBounds = list.getBoundingClientRect();
      const viewportBounds = viewport.getBoundingClientRect();
      const visibleTop = Math.max(0, viewportBounds.top - listBounds.top);
      const visibleBottom = Math.min(listBounds.height, viewportBounds.bottom - listBounds.top);
      const start = Math.min(
        items.length,
        Math.max(0, Math.floor(visibleTop / menuRowHeight) - menuListOverscan),
      );
      const end = Math.min(
        items.length,
        Math.max(start + 1, Math.ceil(visibleBottom / menuRowHeight) + menuListOverscan),
      );
      setRange((current) =>
        current.start === start && current.end === end ? current : { end, start },
      );
    };

    /**
     * Coalesces scroll and resize events into one visible-range calculation per animation frame.
     *
     * @param None; reads the current component state and DOM references.
     * @returns Nothing; skips scheduling while a range update is already pending.
     */
    const scheduleRangeUpdate = () => {
      if (frameRef.current !== undefined) return;
      frameRef.current = globalThis.requestAnimationFrame(updateRange);
    };

    updateRange();
    viewport.addEventListener('scroll', scheduleRangeUpdate, { passive: true });
    globalThis.addEventListener('resize', scheduleRangeUpdate);
    const resizeObserver =
      typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(scheduleRangeUpdate);
    resizeObserver?.observe(viewport);
    const settleTimer = globalThis.setTimeout(scheduleRangeUpdate, collapseAnimationDuration + 24);
    return () => {
      viewport.removeEventListener('scroll', scheduleRangeUpdate);
      globalThis.removeEventListener('resize', scheduleRangeUpdate);
      resizeObserver?.disconnect();
      globalThis.clearTimeout(settleTimer);
      if (frameRef.current !== undefined) globalThis.cancelAnimationFrame(frameRef.current);
    };
  }, [items.length]);

  const indexes = useMemo(() => {
    const safeStart = Math.min(range.start, items.length);
    const safeEnd = Math.min(range.end, items.length);
    const visibleIndexes = Array.from(
      { length: Math.max(0, safeEnd - safeStart) },
      (_, offset) => safeStart + offset,
    );
    if (selectedIndex >= 0 && !visibleIndexes.includes(selectedIndex)) {
      visibleIndexes.push(selectedIndex);
      visibleIndexes.sort((left, right) => left - right);
    }
    return visibleIndexes;
  }, [items.length, range.end, range.start, selectedIndex]);

  return (
    <div
      className="workspace-menu-virtual-list"
      ref={listRef}
      style={{ height: items.length * menuRowHeight }}
    >
      {indexes.map((index) => renderItem(items[index]!, index))}
    </div>
  );
}

/**
 * Renders a consistent branch row with a leading disclosure control.
 *
 * @param props Branch label, optional navigation selection action and toggle state.
 * @returns A menu row whose text and disclosure actions remain independently accessible.
 */
export function AccordionBranchRow({
  active = false,
  activeStyle = 'fill',
  className = '',
  count,
  icon,
  label,
  onSelect,
  onToggle,
  open,
}: AccordionBranchRowProps) {
  const select = onSelect ?? onToggle;
  const activeClass = active
    ? activeStyle === 'text'
      ? 'workspace-menu-branch-text-active'
      : 'workspace-menu-branch-active'
    : '';
  return (
    <div
      className={`workspace-menu-branch ${activeClass} ${open ? 'workspace-menu-branch-open' : ''} ${className}`}
    >
      <button
        aria-expanded={open}
        aria-label={`${open ? '收起' : '展开'} ${label}`}
        className="workspace-menu-branch-toggle"
        onClick={onToggle}
        type="button"
      >
        <IconChevronRight
          aria-hidden="true"
          className="workspace-menu-branch-chevron"
          size={15}
          stroke={1.8}
        />
      </button>
      <button className="workspace-menu-branch-label" onClick={select} type="button">
        {icon && <span className="workspace-menu-branch-icon">{icon}</span>}
        <span className="workspace-menu-branch-name">{label}</span>
        {count !== undefined && <span className="workspace-menu-branch-count">{count}</span>}
      </button>
    </div>
  );
}

/**
 * Renders a non-expandable menu destination using the same typography as menu branches.
 *
 * @param props Destination label, optional icon, active state and click callback.
 * @returns A consistent leaf menu button.
 */
export function MenuLeaf({
  active = false,
  className = '',
  elementRef,
  icon,
  label,
  onClick,
}: MenuLeafProps) {
  return (
    <button
      className={`workspace-menu-leaf ${active ? 'workspace-menu-leaf-active' : ''} ${className}`}
      onClick={onClick}
      ref={elementRef}
      type="button"
    >
      {icon && <span className="workspace-menu-branch-icon">{icon}</span>}
      <span className="min-w-0 flex-1 truncate">{label}</span>
    </button>
  );
}

/**
 * Renders one primary icon button and its compact-sidebar floating menu card.
 *
 * @param props Primary menu identity, active state and deferred flyout content renderer.
 * @returns Icon-only navigation and its conditional floating card.
 */
export function CompactMenu({
  active,
  activeStyle = 'fill',
  icon,
  label,
  onClose,
  onToggle,
  open,
  renderContent,
}: CompactMenuProps) {
  const flyoutRef = useRef<HTMLDivElement | null>(null);
  useMovingHighlight(
    flyoutRef,
    '.workspace-menu-leaf, .workspace-menu-operation, .workspace-menu-branch',
    '.workspace-menu-leaf-active, .workspace-menu-operation-active, .workspace-menu-branch-active',
    open,
    undefined,
    flyoutRef,
  );
  const activeClass = active
    ? activeStyle === 'text'
      ? 'workspace-collapsed-nav-item-text-active'
      : 'workspace-collapsed-nav-item-active'
    : '';
  return (
    <section className="workspace-collapsed-menu">
      <button
        aria-expanded={open}
        aria-label={label}
        className={`workspace-collapsed-nav-item ${open ? 'workspace-collapsed-nav-item-active' : activeClass}`}
        onClick={onToggle}
        title={label}
        type="button"
      >
        {icon}
      </button>
      {open && (
        <div
          ref={flyoutRef}
          aria-label={`${label}菜单`}
          className="workspace-sidebar-flyout rare-moving-menu"
          role="dialog"
        >
          <div className="workspace-sidebar-flyout-header">
            <p>{label}</p>
            <button
              aria-label={`关闭${label}菜单`}
              className="workspace-sidebar-flyout-close"
              onClick={onClose}
              type="button"
            >
              <IconX aria-hidden="true" size={15} stroke={1.8} />
            </button>
          </div>
          {renderContent()}
        </div>
      )}
    </section>
  );
}
