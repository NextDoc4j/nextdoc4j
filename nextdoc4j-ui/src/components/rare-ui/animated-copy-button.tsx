// Adapted from Rare UI code-block (https://rareui.com), copyright (c) 2026 Swami Malode.
// MIT + Commons Clause + Attribution; see ./LICENSE.
import { IconCopy } from '@tabler/icons-react';
import { AnimatePresence, motion, type HTMLMotionProps } from 'motion/react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { copyText } from '../../lib/clipboard';
import { notify } from '../../lib/notifications';
import { useReducedMotion } from './use-reduced-motion';

/** Shows a check only after a real clipboard operation succeeds. */
export function AnimatedCopyButton({
  text,
  onCopy,
  successMessage,
  copiedLabel,
  children,
  icon,
  className = '',
  disabled,
  errorMessage = '复制失败，请手动选择内容复制',
  ...props
}: Omit<HTMLMotionProps<'button'>, 'onClick' | 'children'> & {
  children?: ReactNode;
  text?: string;
  onCopy?: () => Promise<boolean | void> | boolean | void;
  successMessage?: string;
  errorMessage?: string;
  copiedLabel?: string;
  icon?: ReactNode;
}) {
  const [copied, setCopied] = useState(false);
  const [pending, setPending] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const running = useRef(false);
  const generation = useRef(0);
  const reduced = useReducedMotion();
  useEffect(() => {
    generation.current += 1;
    setCopied(false);
    return () => clearTimeout(timer.current);
  }, [text]);
  const copy = async () => {
    if (running.current) return;
    running.current = true;
    const request = generation.current;
    clearTimeout(timer.current);
    setCopied(false);
    setPending(true);
    try {
      const result = onCopy ? await onCopy() : await copyText(text ?? '', ref.current);
      if (result === false) return;
      if (!ref.current?.isConnected || request !== generation.current) return;
      setCopied(true);
      if (successMessage) notify(successMessage);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1800);
    } catch {
      notify(errorMessage);
    } finally {
      running.current = false;
      if (ref.current?.isConnected) setPending(false);
    }
  };
  return (
    <motion.button
      {...props}
      type="button"
      ref={ref}
      aria-label={copied && copiedLabel ? copiedLabel : props['aria-label']}
      aria-busy={pending || undefined}
      disabled={disabled || pending}
      data-copied={copied || undefined}
      className={`rare-copy-button ${copied ? 'is-copied' : ''} ${className}`}
      onClick={() => void copy()}
      whileTap={reduced ? undefined : { scale: 0.97 }}
      transition={{ duration: reduced ? 0 : 0.12 }}
    >
      {children && <span className="rare-copy-label">{children}</span>}
      <span className="rare-copy-icon" aria-hidden="true">
        <AnimatePresence initial={false}>
          <motion.span
            key={copied ? 'check' : 'copy'}
            initial={reduced ? false : { opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.5 }}
            transition={{ duration: reduced ? 0 : 0.16 }}
          >
            {copied ? (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <motion.path
                  d="M4 12.5l5 5L20 6.5"
                  initial={reduced ? false : { pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: reduced ? 0 : 0.2 }}
                />
              </svg>
            ) : (
              (icon ?? <IconCopy size={14} />)
            )}
          </motion.span>
        </AnimatePresence>
      </span>
      <span className="sr-only" role="status">
        {copied ? '已复制' : ''}
      </span>
    </motion.button>
  );
}
