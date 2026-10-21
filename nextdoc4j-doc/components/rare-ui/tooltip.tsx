'use client';

// Adapts Rare UI Family Drawer's short content transition for a portaled tooltip.
// Copyright (c) 2026 Swami Malode. MIT + Commons Clause + Attribution; see ./LICENSE.
import {
  cloneElement,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentProps,
  type ReactElement,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

export function Tooltip({ children, content }: {
  children: ReactElement<ComponentProps<'a'>>;
  content: ReactNode;
}) {
  const id = useId();
  const anchor = useRef<HTMLSpanElement>(null);
  const popup = useRef<HTMLSpanElement>(null);
  const [position, setPosition] = useState<{ left: number; top: number; below: boolean }>();
  const [open, setOpen] = useState(false);
  const mounted = position !== undefined;

  const show = () => {
    const rect = anchor.current?.getBoundingClientRect();
    if (!rect) return;
    const below = rect.top < 64;
    setPosition({
      left: Math.max(80, Math.min(rect.left + rect.width / 2, window.innerWidth - 80)),
      top: below ? rect.bottom + 8 : rect.top - 8,
      below,
    });
    setOpen(true);
  };

  useEffect(() => {
    if (!mounted) return;
    const dismiss = () => setOpen(false);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') dismiss();
    };
    window.addEventListener('scroll', dismiss, true);
    window.addEventListener('resize', dismiss);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('scroll', dismiss, true);
      window.removeEventListener('resize', dismiss);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [mounted]);

  useLayoutEffect(() => {
    if (!mounted) return;
    const animation = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? undefined
      : popup.current?.animate(
          open
            ? [{ opacity: 0, transform: 'translateY(4px)' }, { opacity: 1, transform: 'translateY(0)' }]
            : [{ opacity: 1, transform: 'translateY(0)' }, { opacity: 0, transform: 'translateY(4px)' }],
          { duration: open ? 180 : 120, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)', fill: 'both' },
        );
    if (!open) {
      if (animation) animation.onfinish = () => setPosition(undefined);
      else setPosition(undefined);
    }
    return () => animation?.cancel();
  }, [mounted, open]);

  return (
    <span
      ref={anchor}
      className="nd-tooltip-trigger"
      onPointerEnter={(event) => {
        if (event.pointerType !== 'touch') show();
      }}
      onPointerLeave={() => setOpen(false)}
      onFocus={show}
      onBlur={() => setOpen(false)}
      onClick={() => setOpen(false)}
    >
      {cloneElement(children, {
        'aria-describedby': [children.props['aria-describedby'], open ? id : undefined].filter(Boolean).join(' ') || undefined,
      })}
      {position && createPortal(
        <span
          className="nd-tooltip-positioner"
          style={{ left: position.left, top: position.top, transform: position.below ? undefined : 'translateY(-100%)' }}
        >
          <span ref={popup} id={id} role="tooltip" className="nd-tooltip-content">{content}</span>
        </span>,
        document.body,
      )}
    </span>
  );
}
