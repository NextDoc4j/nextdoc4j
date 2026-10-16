import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { IconCheck, IconInfoCircle, IconAlertCircle, IconX } from '@tabler/icons-react';
import {
  getNotifications,
  removeNotification,
  subscribeNotifications,
  type Notification,
} from '../lib/notifications';

/** Renders one timed notice with pause-on-hover/focus and an animated close action.
 * @param props Notification data, including restart revision and auto-dismiss duration.
 * @returns A status card that leaves the queue only after sliding out.
 */
function NotificationCard({ item }: { item: Notification }) {
  const [closing, setClosing] = useState(false);
  const [paused, setPaused] = useState(false);
  const remaining = useRef(item.duration);
  const pointerInside = useRef(false);
  const focusInside = useRef(false);
  const Icon =
    item.tone === 'success' ? IconCheck : item.tone === 'error' ? IconAlertCircle : IconInfoCircle;

  useEffect(() => {
    if (paused || closing || !item.duration) return;
    const started = performance.now();
    const timer = window.setTimeout(() => setClosing(true), remaining.current);
    return () => {
      window.clearTimeout(timer);
      remaining.current = Math.max(0, remaining.current - (performance.now() - started));
    };
  }, [closing, item.duration, paused]);
  useEffect(() => {
    if (!closing) return;
    const timer = window.setTimeout(() => removeNotification(item.id), 240);
    return () => window.clearTimeout(timer);
  }, [closing, item.id]);

  return (
    <div
      className={`global-notice global-notice--${item.tone}${closing ? ' is-closing' : ''}`}
      role={item.tone === 'error' ? 'alert' : 'status'}
      aria-atomic="true"
      onMouseEnter={() => {
        pointerInside.current = true;
        setPaused(true);
      }}
      onMouseLeave={() => {
        pointerInside.current = false;
        setPaused(focusInside.current);
      }}
      onFocus={() => {
        focusInside.current = true;
        setPaused(true);
      }}
      onBlur={(event) => {
        if (event.currentTarget.contains(event.relatedTarget)) return;
        focusInside.current = false;
        setPaused(pointerInside.current);
      }}
    >
      <Icon className="global-notice__icon" aria-hidden="true" size={18} stroke={1.8} />
      <p>{item.message}</p>
      <button
        className="global-notice__close"
        aria-label="关闭通知"
        onClick={() => setClosing(true)}
        type="button"
      >
        <IconX aria-hidden="true" size={15} />
      </button>
    </div>
  );
}

/** Hosts all operation feedback at the top right, including while a native dialog is open.
 * @param None; subscribes to the shared notification store.
 * @returns A portaled stack above the current modal with no duplicate page-level feedback.
 */
export function NotificationCenter() {
  const notices = useSyncExternalStore(subscribeNotifications, getNotifications, getNotifications);
  const [target, setTarget] = useState<HTMLElement>(() => document.body);
  const hostRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    /** Keeps notices inside the active modal so hover and close remain interactive.
     * @param None; reads open native dialogs in the current document.
     * @returns Nothing; updates the notification portal target.
     */
    const sync = () => {
      const dialogs = [...document.querySelectorAll<HTMLDialogElement>('dialog[open]')];
      setTarget(dialogs.at(-1) ?? document.body);
    };
    sync();
    const observer = new MutationObserver((records) => {
      if (
        records.some(
          (record) =>
            record.type === 'attributes' ||
            [...record.addedNodes, ...record.removedNodes].some(
              (node) =>
                node instanceof Element &&
                (node.matches('dialog') || Boolean(node.querySelector('dialog'))),
            ),
        )
      )
        sync();
    });
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['open'],
    });
    return () => observer.disconnect();
  }, []);
  useLayoutEffect(() => {
    const host = hostRef.current;
    if (notices.length && host?.showPopover && !host.matches(':popover-open')) host.showPopover();
  }, [notices.length, target]);
  if (!notices.length) return null;
  return createPortal(
    <div
      className="global-notification-center"
      popover="manual"
      ref={hostRef}
      aria-label="操作通知"
    >
      {notices.map((item) => (
        <NotificationCard item={item} key={`${item.id}:${item.revision}`} />
      ))}
    </div>,
    target,
  );
}
