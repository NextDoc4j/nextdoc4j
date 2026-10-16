// Adapted from Rare UI task-list and hook-sidebar (https://rareui.com).
// Copyright (c) 2026 Swami Malode; MIT + Commons Clause + Attribution; see ./LICENSE.
import { motion } from 'motion/react';
import { memo } from 'react';
import { methodColor } from '../../features/openapi/utils';
import { useReducedMotion } from './use-reduced-motion';

interface HttpMethodBadgeProps {
  active: boolean;
  method: string;
  location: 'sidebar' | 'tab';
}

/** Keeps method text stationary while a separate semantic fill follows selection. */
export const HttpMethodBadge = memo(function HttpMethodBadge({
  active,
  method,
  location,
}: HttpMethodBadgeProps) {
  const reduced = useReducedMotion();
  const label =
    location === 'sidebar' && method.toLowerCase() !== 'post' ? method.slice(0, 3) : method;
  return (
    <span
      className={`rare-http-method-badge ${location === 'sidebar' ? 'workspace-menu-operation-method' : 'workspace-tab-method'} ${methodColor(method)}`}
      title={method.toUpperCase()}
    >
      <motion.span
        aria-hidden="true"
        className="rare-http-method-badge__fill"
        initial={false}
        animate={{ opacity: active ? 1 : 0, scale: active || reduced ? 1 : 0.94 }}
        transition={
          reduced
            ? { duration: 0 }
            : {
                opacity: { duration: 0.14 },
                scale: { type: 'spring', stiffness: 420, damping: 34, mass: 0.7 },
              }
        }
      />
      <span className="rare-http-method-badge__label">{label}</span>
    </span>
  );
});
