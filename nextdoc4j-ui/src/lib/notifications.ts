import { useCallback, useId } from 'react';
import { createId } from './id';

export interface Notification {
  id: string;
  message: string;
  tone: 'success' | 'error' | 'info';
  duration: number;
  revision: number;
}
let notifications: Notification[] = [];
const listeners = new Set<() => void>();

/** Publishes the current notification list to the global host.
 * @param None; uses the registered subscribers.
 * @returns Nothing after notifying each subscriber.
 */
function publish(): void {
  listeners.forEach((listener) => listener());
}

/** Subscribes the global host to feedback updates.
 * @param listener External-store update callback.
 * @returns A cleanup callback that unregisters the host.
 */
export function subscribeNotifications(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Returns the stable notification snapshot for React.
 * @param None; reads the in-memory queue.
 * @returns The current list, never persisted to browser storage.
 */
export function getNotifications(): Notification[] {
  return notifications;
}

/** Removes a notification after its exit animation finishes.
 * @param id Notification identity.
 * @returns Nothing after updating the shared queue.
 */
export function removeNotification(id: string): void {
  notifications = notifications.filter((item) => item.id !== id);
  publish();
}

/** Displays or replaces feedback from a specific operation control.
 * @param message Exact user-facing feedback; blank input does not dismiss visible feedback.
 * @param id Stable owner identity, so progress is replaced by its eventual result.
 * @returns Nothing; starts a fresh display cycle even when the message text is unchanged.
 */
export function notify(message: string, id: string = createId()): void {
  if (!message.trim()) return;
  const tone = /失败|有误|无效|无法|错误|超时/u.test(message)
    ? 'error'
    : /已复制|已下载|已恢复|已清理|已格式化|成功/u.test(message)
      ? 'success'
      : 'info';
  const previous = notifications.find((item) => item.id === id);
  const item: Notification = {
    id,
    message,
    tone,
    duration: /^正在.*[.…]$/u.test(message) ? 0 : 3000,
    revision: (previous?.revision ?? 0) + 1,
  };
  notifications = [...notifications.filter((entry) => entry.id !== id), item];
  publish();
}

/** Gives one action source a stable notification publisher.
 * @param None; React provides the source identity.
 * @returns A callback usable from copy, export, validation and reset handlers.
 */
export function useNotification(): (message: string) => void {
  const id = useId();
  return useCallback((message: string) => notify(message, id), [id]);
}
