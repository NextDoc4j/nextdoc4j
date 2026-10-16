import { IconCheck, IconCopy, IconX } from '@tabler/icons-react';
import {
  forwardRef,
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from 'react';

import { copyText } from '../../lib/clipboard';
import { useNotification } from '../../lib/notifications';

export type HeroCopyStatus = 'idle' | 'success' | 'error';

interface HeroCopyButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'onClick' | 'type' | 'children'
> {
  children?: ReactNode;
  copiedMessage?: string;
  icon?: ReactNode;
  onCopyResult?: (status: Exclude<HeroCopyStatus, 'idle'>) => void;
  status?: HeroCopyStatus;
  text: string;
}

/**
 * Copies one value while keeping the compact copy/check transition used by the operation hero.
 *
 * @param props Button content, clipboard value and optional feedback message.
 * @returns A native button that exposes a temporary copied state.
 */
export const HeroCopyButton = forwardRef<HTMLButtonElement, HeroCopyButtonProps>(
  function HeroCopyButton(
    { children, className = '', copiedMessage, icon, onCopyResult, status, text, ...props },
    ref,
  ) {
    const [copied, setCopied] = useState(false);
    const [pending, setPending] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const notify = useNotification();

    useEffect(() => {
      setCopied(false);
      clearTimeout(timerRef.current);
    }, [text]);
    useEffect(() => () => clearTimeout(timerRef.current), []);

    const handleCopy = async () => {
      if (pending) return;
      setPending(true);
      try {
        await copyText(text, buttonRef.current);
        setCopied(true);
        onCopyResult?.('success');
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setCopied(false), 1600);
      } catch {
        onCopyResult?.('error');
        notify('复制失败，请手动选择内容复制');
      } finally {
        setPending(false);
      }
    };

    return (
      <button
        {...props}
        aria-busy={pending || undefined}
        aria-label={copied && copiedMessage ? copiedMessage : props['aria-label']}
        className={`${className}${(status ?? (copied ? 'success' : 'idle')) === 'success' ? ' is-copied' : ''}${status === 'error' ? ' is-copy-error' : ''}`}
        data-copied={copied || undefined}
        disabled={props.disabled}
        onClick={() => void handleCopy()}
        ref={(node) => {
          buttonRef.current = node;
          if (typeof ref === 'function') ref(node);
          else if (ref) ref.current = node;
        }}
        type="button"
      >
        {children}
        <span className="rare-icon-swap" aria-hidden="true">
          {status === 'error' ? (
            <IconX className="icon-error" size={14} stroke={2.1} />
          ) : (
            (icon ?? <IconCopy className="icon-default" size={14} stroke={1.9} />)
          )}
          <IconCheck className="icon-check" size={14} stroke={2.4} />
        </span>
        <span className="sr-only" role="status">
          {copied ? '已复制' : ''}
        </span>
      </button>
    );
  },
);

HeroCopyButton.displayName = 'HeroCopyButton';
