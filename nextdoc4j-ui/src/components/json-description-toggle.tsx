import { IconMessage2 } from '@tabler/icons-react';
import { Tooltip } from './tooltip';

/** Toggles schema annotations without altering JSON source or folded nodes.
 * @param props Current visibility and its owner callback.
 * @returns An icon-only control with an action tooltip and accessible state.
 */
export function JsonDescriptionToggle({
  visible,
  onChange,
  disabled = false,
}: {
  visible: boolean;
  disabled?: boolean;
  onChange: (visible: boolean) => void;
}) {
  const label = visible ? '隐藏描述' : '显示描述';
  return (
    <Tooltip content={label}>
      <button
        type="button"
        disabled={disabled}
        className="json-description-toggle"
        aria-label={label}
        aria-pressed={visible}
        onClick={() => onChange(!visible)}
      >
        <IconMessage2 size={18} stroke={1.7} aria-hidden="true" />
      </button>
    </Tooltip>
  );
}
