import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  autoFlip?: boolean;
  anchor?: HTMLElement | null;
  children: ReactNode;
  className?: string;
  content: ReactNode;
  tooltipClassName?: string;
  disabled?: boolean;
  open?: boolean;
  placement?: 'bottom' | 'top';
}

/**
 * Displays a reusable viewport-aware tooltip with animated entry and delayed exit.
 *
 * @param props Trigger, content, optional surface styling, placement and automatic-flip preference.
 * @returns The original trigger and a portaled tooltip that supports hover, focus and Escape.
 */
export function Tooltip({
  autoFlip = true,
  anchor,
  children,
  className = '',
  content,
  tooltipClassName = '',
  disabled = false,
  open,
  placement = 'top',
}: TooltipProps) {
  const anchorRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLSpanElement>(null);
  const [resolvedPlacement, setResolvedPlacement] = useState(placement);
  const closeTimerRef = useRef<number | undefined>(undefined);
  const tooltipId = useId();
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState<{ left: number; top: number }>();

  /**
   * Mounts the tooltip before enabling its visible transition class.
   *
   * @returns Nothing; schedules the visible state for the next animation frame.
   */
  const show = useCallback(() => {
    if (disabled) return;
    window.clearTimeout(closeTimerRef.current);
    setMounted(true);
    requestAnimationFrame(() => setVisible(true));
  }, [disabled]);

  useEffect(() => {
    if (!disabled) return;
    setMounted(false);
    setVisible(false);
  }, [disabled]);

  /**
   * Starts the exit transition and removes the tooltip after it finishes.
   *
   * @returns Nothing; retains the portaled element during its fade-out animation.
   */
  const hide = useCallback(() => {
    setVisible(false);
    window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = window.setTimeout(() => {
      setMounted(false);
      setPosition(undefined);
    }, 220);
  }, []);

  useEffect(() => {
    if (open === undefined) return;
    if (open && !disabled) show();
    else hide();
  }, [disabled, hide, open, show]);

  const positioned = Boolean(position);
  useLayoutEffect(() => {
    const element = anchor ?? anchorRef.current;
    if (!mounted || !element || open === false) return;
    const rect = element.getBoundingClientRect();
    const width = tooltipRef.current?.offsetWidth ?? 0;
    const height = tooltipRef.current?.offsetHeight ?? 0;
    const availableAbove = rect.top - 16;
    const availableBelow = window.innerHeight - rect.bottom - 16;
    const nextPlacement =
      autoFlip && placement === 'top' && height > availableAbove && availableBelow > availableAbove
        ? 'bottom'
        : autoFlip &&
            placement === 'bottom' &&
            height > availableBelow &&
            availableAbove > availableBelow
          ? 'top'
          : placement;
    setResolvedPlacement(nextPlacement);
    const preferredTop = nextPlacement === 'top' ? rect.top - 8 : rect.bottom + 8;
    setPosition({
      left: Math.max(
        12 + width / 2,
        Math.min(rect.left + rect.width / 2, window.innerWidth - 12 - width / 2),
      ),
      top: preferredTop,
    });
  }, [anchor, autoFlip, content, mounted, open, placement, tooltipClassName, positioned]);

  useEffect(() => {
    if (!mounted) return;

    /**
     * Dismisses the tooltip when viewport movement invalidates its anchored position.
     *
     * @returns Nothing; runs the same animated hide path as pointer exit.
     */
    const dismiss = () => hide();
    window.addEventListener('resize', dismiss);
    window.addEventListener('scroll', dismiss, true);
    return () => {
      window.removeEventListener('resize', dismiss);
      window.removeEventListener('scroll', dismiss, true);
    };
  }, [hide, mounted]);

  useEffect(
    () => () => {
      window.clearTimeout(closeTimerRef.current);
    },
    [],
  );

  return (
    <span
      aria-describedby={mounted ? tooltipId : undefined}
      className={`global-tooltip-anchor ${className}`.trim()}
      onBlur={open === undefined ? hide : undefined}
      onFocus={open === undefined ? show : undefined}
      onKeyDown={(event) => {
        if (event.key === 'Escape') hide();
      }}
      onMouseEnter={open === undefined ? show : undefined}
      onMouseLeave={open === undefined ? hide : undefined}
      ref={anchorRef}
    >
      {children}
      {mounted &&
        position &&
        createPortal(
          <span
            className={`global-tooltip global-tooltip--${resolvedPlacement}${visible ? ' is-visible' : ''} ${tooltipClassName}`.trim()}
            ref={tooltipRef}
            id={tooltipId}
            role="tooltip"
            style={position}
          >
            {content}
          </span>,
          (anchor ?? anchorRef.current)?.closest('dialog') ?? globalThis.document.body,
        )}
    </span>
  );
}
