import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNotification } from '../lib/notifications';
import { formatJsonNodePath, type JsonNodeSelection } from './json-node-controls';
/** Presents node value, key/value and path copy actions without changing editor state.
 * @param props Selected source snapshot and dismiss callback.
 * @returns A dialog-aware floating menu, or nothing when closed.
 */
export function JsonNodeCopyMenu({
  selection,
  onClose,
}: {
  selection: JsonNodeSelection | null;
  onClose: () => void;
}) {
  const menu = useRef<HTMLDivElement>(null);
  const notify = useNotification();
  useEffect(() => {
    if (!selection) return;
    menu.current?.querySelector<HTMLButtonElement>('button')?.focus();
    /** Dismisses the menu on outside press without stealing the new target's focus.
     * @param event Pointer event from the document.
     * @returns Nothing.
     */
    const outside = (event: PointerEvent) => {
      if (
        !menu.current?.contains(event.target as Node) &&
        !selection.anchor.contains(event.target as Node)
      )
        onClose();
    };
    document.addEventListener('pointerdown', outside);
    window.addEventListener('resize', onClose);
    window.addEventListener('scroll', onClose, true);
    return () => {
      document.removeEventListener('pointerdown', outside);
      window.removeEventListener('resize', onClose);
      window.removeEventListener('scroll', onClose, true);
    };
  }, [selection, onClose]);
  if (!selection) return null;
  const path = formatJsonNodePath(selection.path);
  const key = selection.path.at(-1);
  const rect = selection.anchor.getBoundingClientRect();
  /** Copies valid JSON or a path, reporting failure without claiming success.
   * @param pair Whether to wrap the value in its property name.
   * @param pathOnly Whether to copy just the JSONPath.
   * @returns Completion after clipboard write or visible feedback.
   */
  const copy = async (pair = false, pathOnly = false) => {
    try {
      // Validate without round-tripping values: int64 literals must retain their original digits.
      if (!pathOnly) JSON.parse(selection.source);
      const text = pathOnly
        ? path
        : pair
          ? `{\n  ${JSON.stringify(String(key))}: ${selection.source}\n}`
          : selection.source;
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
      else {
        const input = document.createElement('textarea');
        input.value = text;
        input.style.cssText = 'position:fixed;opacity:0';
        (selection.anchor.closest('dialog') ?? document.body).append(input);
        try {
          input.select();
          if (!document.execCommand('copy')) throw new Error('copy');
        } finally {
          input.remove();
        }
      }
      notify('已复制');
      selection.anchor.focus();
      onClose();
    } catch {
      notify('复制失败，请确认 JSON 格式和剪贴板权限');
    }
  };
  return createPortal(
    <div
      className="json-node-copy-menu"
      role="menu"
      aria-label={`复制 ${path}`}
      ref={menu}
      style={{
        left: Math.max(8, Math.min(rect.right - 220, innerWidth - 228)),
        top: Math.max(8, Math.min(rect.bottom + 6, innerHeight - 160)),
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          selection.anchor.focus();
          onClose();
        }
        if (event.key === 'Tab') onClose();
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault();
          const buttons = [...menu.current!.querySelectorAll('button')];
          const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
          buttons[
            (index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length
          ].focus();
        }
      }}
    >
      <div className="json-node-copy-menu__path">{path}</div>
      <button role="menuitem" onClick={() => void copy()}>
        {selection.path.length ? '复制节点值' : '复制完整 JSON'}
      </button>
      {typeof key === 'string' && (
        <button role="menuitem" onClick={() => void copy(true)}>
          复制键值对
        </button>
      )}
      <button role="menuitem" onClick={() => void copy(false, true)}>
        复制路径
      </button>
    </div>,
    selection.anchor.closest('dialog') ?? document.body,
  );
}
