import { useTabIndicators } from './use-tab-indicators';
import { type CSSProperties, type KeyboardEvent, type ReactNode, useRef } from 'react';

export interface SegmentedControlProps<Value extends string> {
  ariaLabel: string;
  autoWidth?: boolean;
  className?: string;
  mode?: 'selection' | 'tabs';
  orientation?: 'horizontal' | 'vertical';
  onChange: (value: Value) => void;
  options: Array<{
    disabled?: boolean;
    icon?: ReactNode;
    label: ReactNode;
    title?: string;
    value: Value;
  }>;
  style?: CSSProperties;
  value: Value;
}

/**
 * Renders the shared animated slider used for compact tabs and exclusive choices.
 *
 * @param props Accessible label, auto-width mode, visual mode, orientation, options, value and change callback.
 * @returns A segmented control with an animated slider sized to its option count or active item.
 */
export function SegmentedControl<Value extends string>({
  ariaLabel,
  autoWidth = false,
  className = '',
  mode = 'selection',
  orientation = 'horizontal',
  onChange,
  options,
  style,
  value,
}: SegmentedControlProps<Value>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  useTabIndicators(containerRef, ':scope > button', ':scope > .workspace-segmented__active');

  const positionClass =
    selectedIndex === 1
      ? 'workspace-segmented--second'
      : selectedIndex === 2
        ? 'workspace-segmented--third'
        : '';
  const classes = [
    'workspace-segmented',
    orientation === 'vertical' ? 'workspace-segmented--vertical' : '',
    autoWidth ? 'workspace-segmented--auto-width' : '',
    !autoWidth && options.length === 3 ? 'workspace-segmented--three' : '',
    !autoWidth ? positionClass : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  /**
   * Moves selection and focus through vertical options using navigation keys.
   * @param event Keyboard event from the selected option.
   * @returns Nothing; updates selection and focus when a supported key is pressed.
   */
  const handleVerticalKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!options.length) return;
    let nextIndex = selectedIndex;
    if (event.key === 'ArrowDown') nextIndex = (selectedIndex + 1) % options.length;
    else if (event.key === 'ArrowUp') {
      nextIndex = (selectedIndex - 1 + options.length) % options.length;
    } else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = options.length - 1;
    else return;
    event.preventDefault();
    onChange(options[nextIndex].value);
    event.currentTarget.querySelectorAll('button')[nextIndex]?.focus();
  };

  const inlineStyle: CSSProperties = {
    '--workspace-segment-count': Math.max(1, options.length),
    '--workspace-segment-index': selectedIndex,
    ...style,
  } as CSSProperties;

  return (
    <div
      ref={containerRef}
      aria-label={ariaLabel}
      aria-orientation={orientation}
      className={classes}
      onKeyDown={orientation === 'vertical' ? handleVerticalKeyDown : undefined}
      role={mode === 'tabs' ? 'tablist' : 'radiogroup'}
      style={inlineStyle}
    >
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <button
            {...(mode === 'tabs'
              ? { 'aria-selected': selected, role: 'tab' }
              : { 'aria-checked': selected, role: 'radio' })}
            disabled={option.disabled}
            className={selected ? 'workspace-segmented__active' : ''}
            key={option.value}
            onClick={() => onChange(option.value)}
            tabIndex={orientation === 'vertical' ? (selected ? 0 : -1) : undefined}
            title={option.title}
            type="button"
          >
            {option.icon}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
