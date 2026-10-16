// Adapted from Rare UI (https://rareui.com), copyright (c) 2026 Swami Malode.
// MIT + Commons Clause + Attribution; see ./LICENSE.
import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { IconCheck, IconX } from '@tabler/icons-react';
import { useReducedMotion } from './use-reduced-motion';

interface DeleteButtonProps {
  label: string;
  description?: string;
  className?: string;
  compact?: boolean;
  disabled?: boolean;
  onConfirm: () => void | Promise<void>;
}

export function DeleteButton({
  label,
  description = '确认后将移除这些内容。',
  className = '',
  compact = false,
  disabled = false,
  onConfirm,
}: DeleteButtonProps) {
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<'idle' | 'pending' | 'done' | 'error'>('idle');
  const [position, setPosition] = useState({ top: 0, left: 0, arrowLeft: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const pendingRef = useRef(false);
  const mountedRef = useRef(true);
  const titleId = useId();
  const descriptionId = useId();
  const portalTarget = triggerRef.current?.closest('dialog') ?? document.body;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (disabled && !pendingRef.current) setOpen(false);
  }, [disabled]);

  useEffect(() => {
    if (status !== 'done') return;
    const timer = window.setTimeout(() => setStatus('idle'), 1400);
    return () => window.clearTimeout(timer);
  }, [status]);

  useLayoutEffect(() => {
    if (!open) return;
    const update = () => {
      const bounds = triggerRef.current?.getBoundingClientRect();
      if (!bounds) return;
      const height = panelRef.current?.offsetHeight ?? (compact ? 44 : 140);
      const width = Math.min(compact ? 84 : 280, window.innerWidth - 24);
      const left = Math.max(
        12,
        Math.min(window.innerWidth - width - 12, bounds.left + (bounds.width - width) / 2),
      );
      setPosition({
        left,
        top: Math.max(12, bounds.top - height - 8),
        arrowLeft: Math.max(14, Math.min(width - 14, bounds.left + bounds.width / 2 - left)),
      });
    };
    update();
    confirmRef.current?.focus();
    window.addEventListener('resize', update);
    document.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      document.removeEventListener('scroll', update, true);
    };
  }, [open, compact, status]);

  const cancel = () => {
    if (pendingRef.current) return;
    setOpen(false);
    triggerRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    const dismiss = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        !pendingRef.current &&
        !panelRef.current?.contains(target) &&
        !triggerRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [open]);

  const confirm = async () => {
    if (disabled || pendingRef.current) return;
    pendingRef.current = true;
    setStatus('pending');
    try {
      await onConfirm();
      if (mountedRef.current) {
        setStatus('done');
        setOpen(false);
        triggerRef.current?.focus();
      }
    } catch {
      if (mountedRef.current) setStatus('error');
    } finally {
      pendingRef.current = false;
    }
  };

  return (
    <span className="rare-delete" onClick={(event) => event.stopPropagation()}>
      <button
        ref={triggerRef}
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={`rare-delete-trigger ${compact ? 'is-compact' : ''} ${className}`}
        disabled={disabled || status === 'pending'}
        title={label}
        type="button"
        onClick={() => {
          setStatus('idle');
          setOpen((previous) => !previous);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && open) {
            event.stopPropagation();
            cancel();
          }
        }}
      >
        <motion.svg
          aria-hidden="true"
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {status === 'done' ? (
            <path d="M4 12.5 9.5 18 20 7" />
          ) : (
            <>
              <path d="M5 6v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6M10 10v6M14 10v6" />
              <motion.g
                style={{ transformBox: 'view-box', transformOrigin: '3px 6px' }}
                animate={{
                  rotate: open && !reduced ? -26 : 0,
                  y: open && !reduced ? -1 : 0,
                }}
                transition={
                  reduced
                    ? { duration: 0 }
                    : { type: 'spring', stiffness: 480, damping: 30, mass: 0.45 }
                }
              >
                <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </motion.g>
            </>
          )}
        </motion.svg>
        {!compact && <span>{status === 'pending' ? '处理中…' : label}</span>}
      </button>
      <span className="sr-only" role="status">
        {status === 'done' ? '操作已完成' : ''}
      </span>
      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              ref={panelRef}
              role="dialog"
              aria-labelledby={titleId}
              aria-describedby={descriptionId}
              aria-busy={status === 'pending'}
              className={`rare-delete-confirm ${compact ? 'is-compact' : ''}`}
              style={
                {
                  top: position.top,
                  left: position.left,
                  '--rare-delete-arrow-left': `${position.arrowLeft}px`,
                } as CSSProperties
              }
              initial={reduced ? false : { opacity: 0, y: 8, scale: 0.88 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: reduced ? 0 : 5, scale: reduced ? 1 : 0.92 }}
              transition={{ duration: reduced ? 0 : 0.18, ease: [0.22, 1, 0.36, 1] }}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  event.preventDefault();
                  event.stopPropagation();
                  cancel();
                }
              }}
            >
              <strong className={compact ? 'sr-only' : undefined} id={titleId}>
                确认{label}？
              </strong>
              <p className={compact ? 'sr-only' : undefined} id={descriptionId}>
                {description}
              </p>
              {status === 'error' && (
                <p className={`rare-delete-error ${compact ? 'sr-only' : ''}`} role="alert">
                  操作失败，请重试。
                </p>
              )}
              <div className="rare-delete-confirm-actions">
                <button
                  ref={confirmRef}
                  className={`is-danger ${status === 'pending' ? 'is-pending' : ''} ${status === 'error' ? 'has-error' : ''}`}
                  aria-label="确认删除"
                  title={status === 'error' ? '删除失败，点击重试' : '确认删除'}
                  type="button"
                  disabled={disabled || status === 'pending'}
                  onClick={() => void confirm()}
                >
                  {compact ? (
                    <IconCheck aria-hidden="true" size={17} stroke={2} />
                  ) : status === 'pending' ? (
                    '处理中…'
                  ) : (
                    '确认'
                  )}
                </button>
                <button
                  aria-label="取消删除"
                  title="取消"
                  type="button"
                  disabled={status === 'pending'}
                  onClick={cancel}
                >
                  {compact ? <IconX aria-hidden="true" size={17} stroke={2} /> : '取消'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        portalTarget,
      )}
    </span>
  );
}
