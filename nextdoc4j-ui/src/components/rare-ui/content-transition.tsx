// Borrows Rare UI family-drawer content transitions. Copyright (c) 2026 Swami Malode.
// MIT + Commons Clause + Attribution; see ./LICENSE.
import { useLayoutEffect, useRef, type ComponentProps, type RefObject } from 'react';
import { useReducedMotion } from './use-reduced-motion';
import { UI_MOTION } from './motion-timing';

/** Animates a changed panel without remounting its form controls. */
export function ContentTransition({
  transitionKey,
  as: Tag = 'div',
  containerRef,
  ...props
}: ComponentProps<'div'> & {
  transitionKey: string;
  as?: 'div' | 'section';
  containerRef?: RefObject<HTMLDivElement | null>;
}) {
  const localRef = useRef<HTMLDivElement>(null);
  const ref = containerRef ?? localRef;
  const previous = useRef(transitionKey);
  const reduced = useReducedMotion();
  useLayoutEffect(() => {
    const changed = previous.current !== transitionKey;
    previous.current = transitionKey;
    if (!changed || reduced) return;
    const animation = ref.current?.animate?.(
      [
        { opacity: 0.35, transform: 'translateY(4px)' },
        { opacity: 1, transform: 'translateY(0)' },
      ],
      { duration: UI_MOTION.collapse, easing: UI_MOTION.easing },
    );
    return () => animation?.cancel();
  }, [transitionKey, reduced, ref]);
  return <Tag {...props} ref={ref} />;
}
