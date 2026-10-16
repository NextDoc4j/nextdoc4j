interface SwitchControlProps {
  checked: boolean;
  className?: string;
  disabled?: boolean;
  label: string;
  onChange: (checked: boolean) => void;
  showState?: boolean;
}

/**
 * Renders the shared animated boolean switch used by workspace preference rows.
 *
 * @param props Current state, accessible label, disabled state, appearance class, and callback.
 * @returns A keyboard-accessible switch with an optional visible state label.
 */
export function SwitchControl({
  checked,
  className = '',
  disabled = false,
  label,
  onChange,
  showState = true,
}: SwitchControlProps) {
  return (
    <span className={`workspace-switch-control ${className}`.trim()}>
      {showState && <span>{checked ? '开启' : '关闭'}</span>}
      <button
        aria-checked={checked}
        aria-label={label}
        className={`workspace-switch ${checked ? 'workspace-switch--checked' : ''}`}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        role="switch"
        type="button"
      />
    </span>
  );
}
