// Adapted from Rare UI (https://rareui.com), copyright (c) 2026 Swami Malode.
// MIT + Commons Clause + Attribution; see ./LICENSE.
import { useId, useLayoutEffect, useState, type RefObject } from 'react';
import { motion, useMotionValue, useSpring } from 'motion/react';
import { IconArrowUp } from '@tabler/icons-react';
import { useReducedMotion } from './use-reduced-motion';

const SIZE_SPRING = { type: 'spring', bounce: 0.16, duration: 0.5 } as const;

/** A shared reading-progress pill that scrolls the owning workspace back to the top. */
export function ScrollProgress({ containerRef }: { containerRef: RefObject<HTMLElement | null> }) {
  const reduced = useReducedMotion();
  const labelId = useId();
  const [percentage, setPercentage] = useState(0);
  const scrollProgress = useMotionValue(0);
  const progress = useSpring(scrollProgress, { stiffness: 120, damping: 30, mass: 0.3 });

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let frame: number | undefined;
    const observed = new Set<Element>();
    const update = () => {
      const range = Math.max(0, container.scrollHeight - container.clientHeight);
      // A page that fits in the viewport is already fully visible.
      const value = range > 0 ? Math.min(1, Math.max(0, container.scrollTop / range)) : 1;
      scrollProgress.set(value);
      setPercentage(Math.round(value * 100));
    };
    const schedule = () => {
      frame ??= requestAnimationFrame(() => {
        frame = undefined;
        update();
      });
    };
    const resize = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(schedule);
    const reconcile = () => {
      const children = new Set(container.children);
      for (const child of observed)
        if (!children.has(child)) {
          resize?.unobserve(child);
          observed.delete(child);
        }
      for (const child of children)
        if (!observed.has(child)) {
          resize?.observe(child);
          observed.add(child);
        }
      schedule();
    };
    const mutations = new MutationObserver(reconcile);
    mutations.observe(container, { childList: true, subtree: true });
    resize?.observe(container);
    reconcile();
    update();
    container.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      if (frame !== undefined) cancelAnimationFrame(frame);
      mutations.disconnect();
      resize?.disconnect();
      container.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, [containerRef, scrollProgress]);

  return (
    <motion.button
      data-slot="scroll-progress"
      aria-label="回到顶部"
      aria-describedby={labelId}
      title={`阅读进度 ${percentage}%，点击回到顶部`}
      className="rare-scroll-progress"
      type="button"
      onClick={() =>
        containerRef.current?.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' })
      }
      whileHover={reduced ? undefined : { y: -2 }}
      whileTap={reduced ? undefined : { scale: 0.96 }}
      transition={reduced ? { duration: 0 } : SIZE_SPRING}
    >
      <span className="rare-scroll-progress-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" className="rare-scroll-progress-ring">
          <circle
            cx="12"
            cy="12"
            r="10"
            fill="none"
            strokeWidth="2"
            className="rare-scroll-progress-track"
          />
          <motion.circle
            cx="12"
            cy="12"
            r="10"
            fill="none"
            strokeWidth="2"
            strokeLinecap="round"
            className="rare-scroll-progress-fill"
            style={{ pathLength: reduced ? scrollProgress : progress }}
          />
        </svg>
        <IconArrowUp size={13} stroke={1.8} />
      </span>
      <span id={labelId} className="rare-scroll-progress-label">
        {percentage}%
      </span>
    </motion.button>
  );
}
