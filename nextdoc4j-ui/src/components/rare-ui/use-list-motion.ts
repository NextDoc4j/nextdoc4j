import { useLayoutEffect, useRef, type RefObject } from 'react';
import { useReducedMotion } from './use-reduced-motion';
import { UI_MOTION } from './motion-timing';

/** Borrows Task List's positional transitions while preserving native table structure and order. */
export function useListMotion(
  ref: RefObject<HTMLElement | null>,
  selector: string,
  orderKey: string,
) {
  const previous = useRef<Map<string, number> | null>(null);
  const animations = useRef(new Map<HTMLElement, Animation>());
  const reduced = useReducedMotion();
  useLayoutEffect(() => {
    const items = ref.current?.querySelectorAll<HTMLElement>(selector);
    if (!items) return;
    const next = new Map<string, number>();
    for (const item of items) {
      const id = item.dataset.motionRow!;
      const top = item.offsetTop;
      next.set(id, top);
      const before = previous.current?.get(id);
      if (reduced) animations.current.get(item)?.cancel();
      else if (previous.current && item.animate && (before === undefined || before !== top)) {
        animations.current.get(item)?.cancel();
        const animation = item.animate(
          before === undefined
            ? [
                { opacity: 0, transform: 'translateY(4px)' },
                { opacity: getComputedStyle(item).opacity, transform: 'translateY(0)' },
              ]
            : [{ transform: `translateY(${before - top}px)` }, { transform: 'translateY(0)' }],
          { duration: UI_MOTION.move, easing: UI_MOTION.easing },
        );
        animations.current.set(item, animation);
        animation.onfinish = () => {
          if (animations.current.get(item) === animation) animations.current.delete(item);
          ref.current?.dispatchEvent(new Event('rare-layout-change'));
        };
      }
    }
    for (const [item, animation] of animations.current)
      if (!item.isConnected) {
        animation.cancel();
        animations.current.delete(item);
      }
    previous.current = next;
  }, [ref, selector, orderKey, reduced]);
  useLayoutEffect(() => {
    const running = animations.current;
    return () => {
      for (const animation of running.values()) animation.cancel();
    };
  }, []);
}
