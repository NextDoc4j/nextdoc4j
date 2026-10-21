'use client';

// Adapted from Rare UI Animated Tabs: https://github.com/Codewithswappy/RareUI/blob/main/components/rareui/AnimatedTab/AnimatedTab.tsx
// Copyright (c) 2026 Swami Malode. See ./LICENSE.
import {
  AnimatePresence,
  LayoutGroup,
  motion,
  useReducedMotion,
} from 'framer-motion';
import { useId, useState, type ReactNode } from 'react';

export const tabSpring = {
  type: 'spring',
  stiffness: 320,
  damping: 32,
  mass: 0.9,
} as const;

export function AnimatedTabs<T extends string>({
  items,
  value,
  onChange,
  label,
  controls,
  className = '',
  itemClassName = '',
}: {
  items: readonly { id: T; label: ReactNode }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  controls?: string;
  className?: string;
  itemClassName?: string;
}) {
  const id = useId();
  const reducedMotion = useReducedMotion();
  const [hovered, setHovered] = useState<T | null>(null);

  return (
    <LayoutGroup id={id}>
      <div
        className={`rare-tabs ${className}`}
        role="group"
        aria-label={label}
        onPointerLeave={() => setHovered(null)}
      >
        {items.map((item) => (
          <motion.button
            key={item.id}
            type="button"
            className={itemClassName}
            aria-pressed={value === item.id}
            aria-controls={controls}
            onClick={() => onChange(item.id)}
            onPointerEnter={(event) => {
              if (event.pointerType !== 'touch') setHovered(item.id);
            }}
            whileTap={reducedMotion ? undefined : { scale: 0.96 }}
          >
            {value === item.id && (
              <motion.span
                className="rare-tab-active"
                layoutId="active-pill"
                transition={reducedMotion ? { duration: 0 } : tabSpring}
                aria-hidden="true"
              />
            )}
            <AnimatePresence>
              {hovered === item.id && value !== item.id && (
                <motion.span
                  className="rare-tab-hover"
                  layoutId="hover-pill"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: reducedMotion ? 0 : 0.15 }}
                  aria-hidden="true"
                />
              )}
            </AnimatePresence>
            <span className="rare-tab-label">{item.label}</span>
          </motion.button>
        ))}
      </div>
    </LayoutGroup>
  );
}
