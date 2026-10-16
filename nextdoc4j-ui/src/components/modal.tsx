import { useId, useLayoutEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { IconX } from '@tabler/icons-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  size?: 'small' | 'medium' | 'large' | 'wide';
  placement?: 'center' | 'drawer';
  mobileSheet?: boolean;
  busy?: boolean;
}

let openModalCount = 0;
let previousOverflow = '';

function lockScroll() {
  if (openModalCount++ === 0) {
    previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
  }
}

function unlockScroll() {
  if (--openModalCount === 0) {
    document.documentElement.style.overflow = previousOverflow;
  }
}

/**
 * Provides shared modal chrome, native focus containment and controlled dismissal.
 * @param props Visibility, heading, content, actions and optional size or drawer placement.
 * @returns An accessible dialog; native modal behavior restores focus when it closes.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  actions,
  footer,
  children,
  className = '',
  bodyClassName = '',
  size = 'medium',
  placement = 'center',
  mobileSheet = false,
  busy = false,
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const backdropPressed = useRef(false);
  const [isClosing, setIsClosing] = useState(false);
  const isOpenRef = useRef(false);
  const previousFocusRef = useRef<Element | null>(null);
  const closeTimerRef = useRef<number | undefined>(undefined);
  const titleId = useId();
  const descriptionId = useId();

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      if (closeTimerRef.current !== undefined) {
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = undefined;
      }
      setIsClosing(false);
      if (!isOpenRef.current) {
        previousFocusRef.current = document.activeElement;
        dialog.showModal();
        isOpenRef.current = true;
        lockScroll();
      }
    } else if (isOpenRef.current && !isClosing) {
      setIsClosing(true);
      const reduceMotion =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const duration = reduceMotion ? 0 : placement === 'drawer' ? 200 : 160;

      closeTimerRef.current = window.setTimeout(() => {
        closeTimerRef.current = undefined;
        setIsClosing(false);
        isOpenRef.current = false;
        if (dialog.open) {
          dialog.close();
        }
        unlockScroll();
        if (
          previousFocusRef.current instanceof HTMLElement &&
          previousFocusRef.current.isConnected
        ) {
          previousFocusRef.current.focus({ preventScroll: true });
        }
      }, duration);
    }
  }, [open, placement, isClosing]);

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    return () => {
      if (closeTimerRef.current !== undefined) {
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = undefined;
      }
      if (isOpenRef.current) {
        isOpenRef.current = false;
        if (dialog?.open) {
          dialog.close();
        }
        unlockScroll();
      }
    };
  }, []);

  /**
   * Distinguishes a backdrop press from clicks on empty dialog padding.
   * @param event Pointer coordinates and the owning dialog element.
   * @returns Whether the pointer is outside the visible dialog bounds.
   */
  const isBackdrop = (event: PointerEvent<HTMLDialogElement>) => {
    if (event.target !== event.currentTarget) return false;
    const bounds = event.currentTarget.getBoundingClientRect();
    return (
      event.clientX < bounds.left ||
      event.clientX > bounds.right ||
      event.clientY < bounds.top ||
      event.clientY > bounds.bottom
    );
  };

  const handleClose = () => {
    if (!busy && !isClosing) onClose();
  };

  return (
    <dialog
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      aria-modal="true"
      aria-busy={busy || undefined}
      className={`ui-modal ui-modal--${size} ui-modal--${placement}${isClosing ? ' is-closing' : ''}${mobileSheet ? ' ui-modal--mobile-sheet' : ''} ${className}`.trim()}
      ref={dialogRef}
      onKeyDown={(event) => event.stopPropagation()}
      onCancel={(event) => {
        event.preventDefault();
        event.stopPropagation();
        handleClose();
      }}
      onPointerDown={(event) => {
        backdropPressed.current = isBackdrop(event);
      }}
      onPointerUp={(event) => {
        if (backdropPressed.current && isBackdrop(event)) handleClose();
        backdropPressed.current = false;
      }}
      onPointerCancel={() => {
        backdropPressed.current = false;
      }}
    >
      <header className="ui-modal__header">
        <div className="ui-modal__heading">
          <h2 id={titleId}>{title}</h2>
          {description && <p id={descriptionId}>{description}</p>}
        </div>
        <div className="ui-modal__actions">
          {actions}
          <button
            aria-label="关闭弹窗"
            className="ui-modal__close"
            disabled={busy}
            onClick={handleClose}
            title="关闭"
            type="button"
          >
            <IconX aria-hidden="true" size={17} stroke={1.8} />
          </button>
        </div>
      </header>
      <div className={`ui-modal__body ${bodyClassName}`.trim()}>{children}</div>
      {footer && <footer className="ui-modal__footer">{footer}</footer>}
    </dialog>
  );
}
