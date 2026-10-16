// Adapted from Rare UI task-list (https://rareui.com), copyright (c) 2026 Swami Malode.
// MIT + Commons Clause + Attribution; see ./LICENSE.
import { motion } from 'motion/react';
import type { ComponentProps } from 'react';
import { useReducedMotion } from './use-reduced-motion';

/** Draws selection feedback without task completion or automatic sorting. */
export function AnimatedCheck({ checked }: { checked: boolean }) {
  const reduced = useReducedMotion();
  return (
    <motion.svg
      aria-hidden="true"
      className="rare-check"
      viewBox="0 0 24 24"
      initial={false}
      animate={{ scale: checked && !reduced ? [1, 1.12, 1] : 1 }}
      transition={{ duration: reduced ? 0 : 0.22 }}
    >
      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <motion.circle
        cx="12"
        cy="12"
        r="11"
        fill="currentColor"
        initial={false}
        animate={{ scale: checked ? 1 : 0 }}
        style={{ transformOrigin: '12px 12px' }}
        transition={{ duration: reduced ? 0 : 0.16 }}
      />
      <motion.path
        d="M7.4 12.4 10.6 15.5 16.6 8.9"
        fill="none"
        stroke="var(--rare-check-ink, #fff)"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={false}
        animate={{ pathLength: checked ? 1 : 0, opacity: checked ? 1 : 0 }}
        transition={{ duration: reduced ? 0 : 0.18 }}
      />
    </motion.svg>
  );
}

/** Keeps native checkbox focus, keyboard, label and form behavior under the animated mark. */
export function AnimatedCheckbox({
  className = '',
  checked,
  ...props
}: Omit<ComponentProps<'input'>, 'type'> & { checked: boolean }) {
  return (
    <span className={`rare-checkbox ${className}`}>
      <input {...props} checked={checked} type="checkbox" />
      <AnimatedCheck checked={checked} />
    </span>
  );
}
