'use client';

// Adapts Rare UI Toast Tabs' keyed content transitions, with measured height so text never scales.
// https://github.com/Codewithswappy/RareUI/blob/main/components/rareui/ToastTabs/ToastTabs.tsx
// Copyright (c) 2026 Swami Malode. See ./LICENSE.
import {
  AnimatePresence,
  motion,
  useIsPresent,
  useReducedMotion,
} from 'framer-motion';
import {
  forwardRef,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { tabSpring } from './animated-tabs';

export function AnimatedHeight({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  const content = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number>();
  const reducedMotion = useReducedMotion();

  useLayoutEffect(() => {
    const element = content.current;
    if (!element) return;
    const measure = () => setHeight(element.offsetHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <motion.div
      className={`rare-size ${className}`}
      initial={false}
      animate={{ height: height ?? 'auto' }}
      transition={reducedMotion ? { duration: 0 } : tabSpring}
    >
      <div ref={content} className="rare-size-content">
        {children}
      </div>
    </motion.div>
  );
}

const ContentFrame = forwardRef<
  HTMLDivElement,
  { children: ReactNode; className: string }
>(function ContentFrame({ children, className }, ref) {
  const present = useIsPresent();
  const reducedMotion = useReducedMotion();
  return (
    <motion.div
      ref={ref}
      className={className}
      inert={!present}
      aria-hidden={present ? undefined : true}
      initial={{ opacity: 0, y: reducedMotion ? 0 : 8 }}
      animate={{ opacity: 1, y: 0, pointerEvents: 'auto' }}
      exit={{ opacity: 0, y: reducedMotion ? 0 : -6, pointerEvents: 'none' }}
      transition={{
        duration: reducedMotion ? 0 : 0.24,
        ease: [0.2, 0.8, 0.2, 1],
      }}
    >
      {children}
    </motion.div>
  );
});

export function AnimatedContent({
  children,
  transitionKey,
  className = '',
  contentClassName = '',
  resize = true,
  id,
}: {
  children: ReactNode;
  transitionKey: string;
  className?: string;
  contentClassName?: string;
  resize?: boolean;
  id?: string;
}) {
  const content = (
    <div id={id} className={`rare-content ${className}`}>
      <AnimatePresence initial={false} mode="popLayout">
        <ContentFrame
          key={transitionKey}
          className={`rare-content-frame ${contentClassName}`}
        >
          {children}
        </ContentFrame>
      </AnimatePresence>
    </div>
  );
  return resize ? <AnimatedHeight>{content}</AnimatedHeight> : content;
}
