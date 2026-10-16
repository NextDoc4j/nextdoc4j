import { IconCheck, IconChevronDown, IconSearch, IconX } from '@tabler/icons-react';
import { createPortal } from 'react-dom';
import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Input } from './input';
import { useMovingHighlight } from './rare-ui/use-moving-highlight';

export interface SelectMenuOption {
  description?: string;
  disabled?: boolean;
  label: string;
  tag?: string;
  tagColor?: string;
  value: string;
}

interface SelectMenuProps {
  ariaLabel: string;
  className?: string;
  clearable?: boolean;
  disabled?: boolean;
  editable?: boolean;
  id?: string;
  menuClassName?: string;
  onChange: (value: string) => void;
  options: SelectMenuOption[];
  placeholder?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  selectedLabel?: string;
  triggerClassName?: string;
  value: string;
}

interface MenuPosition {
  left: number;
  maxHeight: number;
  top?: number;
  bottom?: number;
  width: number;
}

const menuGap = 6;
const menuMaxHeight = 248;
const viewportPadding = 8;
const optionHeight = 30;
const overscan = 4;

/**
 * Measures a floating menu width from its visible option labels and viewport constraints.
 *
 * @param options Options whose labels need to remain fully visible in the menu.
 * @param triggerWidth Width of the compact trigger that anchors the menu.
 * @param searchable Whether the menu includes an interface search field.
 * @returns A menu width that fits its longest label without exceeding the viewport.
 */
const getMenuWidth = (options: SelectMenuOption[], triggerWidth: number, searchable = false) => {
  let context: CanvasRenderingContext2D | null = null;
  try {
    context = document.createElement('canvas').getContext('2d');
  } catch {
    context = null;
  }
  const minWidth = searchable ? 240 : 140;
  if (!context) {
    return Math.min(
      searchable
        ? Math.max(minWidth, Math.min(triggerWidth, 420))
        : Math.max(minWidth, triggerWidth),
      window.innerWidth - viewportPadding * 2,
    );
  }
  context.font = '12px Inter, ui-sans-serif, system-ui, sans-serif';
  const longestLabelWidth = Math.max(
    0,
    ...options.map(
      (option) =>
        context.measureText(
          `${option.tag ? `${option.tag} ` : ''}${option.label}${option.description ? `  ${option.description}` : ''}`,
        ).width,
    ),
  );
  const contentWidth = Math.ceil(longestLabelWidth + 56);
  const desiredWidth = searchable
    ? Math.max(minWidth, contentWidth)
    : Math.max(minWidth, triggerWidth, contentWidth);
  return Math.min(desiredWidth, window.innerWidth - viewportPadding * 2);
};

/**
 * Finds the next enabled option while wrapping at either end of the list.
 *
 * @param options Available options in visual order.
 * @param currentValue Value from which navigation should continue.
 * @param direction Navigation direction represented by one or negative one.
 * @returns The next enabled option, or undefined when every option is disabled.
 */
const findNextEnabledOption = (
  options: SelectMenuOption[],
  currentValue: string,
  direction: 1 | -1,
) => {
  const currentIndex = options.findIndex((option) => option.value === currentValue);
  if (currentIndex < 0) {
    return direction === 1
      ? options.find((option) => !option.disabled)
      : [...options].reverse().find((option) => !option.disabled);
  }
  for (let offset = 1; offset <= options.length; offset += 1) {
    const index = (currentIndex + direction * offset + options.length) % options.length;
    if (!options[index]?.disabled) return options[index];
  }
  return undefined;
};

/**
 * Matches editable or searchable select options against case-insensitive fragments of the entered text.
 * @param options Complete option list.
 * @param query Current filter text, separate from the committed value shown on initial focus.
 * @returns Matching presets; an empty query returns every option.
 */
function filterOptions(options: SelectMenuOption[], query: string): SelectMenuOption[] {
  const fragments = query.trim().toLowerCase().split(/\s+/u).filter(Boolean);
  return fragments.length
    ? options.filter((option) =>
        fragments.every((fragment) =>
          `${option.label} ${option.value} ${option.tag ?? ''} ${option.description ?? ''}`
            .toLowerCase()
            .includes(fragment),
        ),
      )
    : options;
}

/**
 * Renders a themed, keyboard-accessible select menu without browser-native option styling.
 *
 * @param props Current value, option data, appearance hooks and selection callback.
 * @returns A trigger button and a viewport-aware floating option menu.
 */
export function SelectMenu({
  ariaLabel,
  className,
  clearable = false,
  disabled = false,
  editable = false,
  id,
  menuClassName,
  onChange,
  options,
  placeholder,
  searchable = false,
  searchPlaceholder,
  selectedLabel,
  triggerClassName,
  value,
}: SelectMenuProps) {
  const generatedId = useId();
  const controlId = id ?? `select-menu-${generatedId.replaceAll(':', '')}`;
  const listboxId = `${controlId}-listbox`;
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const optionsRef = useRef<HTMLDivElement>(null);
  const focusFrame = useRef<number | undefined>(undefined);
  useEffect(
    () => () => {
      if (focusFrame.current !== undefined) cancelAnimationFrame(focusFrame.current);
    },
    [],
  );
  const [scrollTop, setScrollTop] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const visibleOptions = useMemo(
    () =>
      editable
        ? filterOptions(options, query)
        : searchable
          ? filterOptions(options, searchQuery)
          : options,
    [editable, options, query, searchable, searchQuery],
  );
  const [focusedValue, setFocusedValue] = useState(value);
  const [menuPosition, setMenuPosition] = useState<MenuPosition>();
  const selectedOption = options.find((option) => option.value === value);
  const optionIds = useMemo(
    () =>
      new Map(
        options.map((option) => [option.value, `${listboxId}-${encodeURIComponent(option.value)}`]),
      ),
    [listboxId, options],
  );
  const virtual = searchable && visibleOptions.length > 100;
  const listHeight = Math.max(30, (menuPosition?.maxHeight ?? menuMaxHeight) - 46);
  const firstVisible = Math.max(
    0,
    Math.min(Math.floor(scrollTop / optionHeight), visibleOptions.length - 1),
  );
  const startIndex = virtual ? Math.max(0, firstVisible - overscan) : 0;
  const endIndex = virtual
    ? Math.min(
        visibleOptions.length,
        firstVisible + Math.ceil(listHeight / optionHeight) + overscan,
      )
    : visibleOptions.length;
  const renderedOptions = virtual ? visibleOptions.slice(startIndex, endIndex) : visibleOptions;
  const activeOptionId = renderedOptions.some((option) => option.value === focusedValue)
    ? optionIds.get(focusedValue)
    : undefined;
  const measuredWidth = useMemo(() => {
    if (!isOpen) return 0;
    const trigger = editable ? rootRef.current : triggerRef.current;
    return getMenuWidth(options, trigger?.getBoundingClientRect().width ?? 0, searchable);
  }, [editable, isOpen, options, searchable]);

  const positioned = menuPosition !== undefined;
  useMovingHighlight(
    optionsRef,
    '[role="option"]:not(:disabled)',
    '[role="option"].is-selected',
    isOpen && positioned,
    '[role="option"].is-focused',
  );
  useLayoutEffect(() => {
    if (!isOpen || !positioned || !virtual || !optionsRef.current) return;
    const index = visibleOptions.findIndex((option) => option.value === focusedValue);
    if (index < 0) return;
    const viewport = optionsRef.current;
    const top = index * optionHeight;
    if (top < viewport.scrollTop) viewport.scrollTop = top;
    else if (top + optionHeight > viewport.scrollTop + listHeight)
      viewport.scrollTop = top + optionHeight - listHeight;
    setScrollTop(viewport.scrollTop);
  }, [focusedValue, isOpen, listHeight, virtual, visibleOptions, positioned]);

  useEffect(() => {
    if (!isOpen || !searchable) return;
    setFocusedValue((current) =>
      visibleOptions.some((option) => option.value === current && !option.disabled)
        ? current
        : ((
            visibleOptions.find((option) => option.value === value && !option.disabled) ??
            visibleOptions.find((option) => !option.disabled)
          )?.value ?? ''),
    );
  }, [isOpen, searchable, value, visibleOptions]);

  /** Positions the menu inside the viewport without remeasuring option labels.
   * @param None; reads the trigger bounds and cached content width.
   * @returns Nothing; updates viewport-relative menu geometry.
   */
  const updateMenuPosition = useCallback(() => {
    const trigger = editable ? rootRef.current : triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const width = Math.min(measuredWidth, window.innerWidth - viewportPadding * 2);
    const left = Math.min(
      Math.max(viewportPadding, rect.left),
      window.innerWidth - width - viewportPadding,
    );
    const spaceBelow = window.innerHeight - rect.bottom - menuGap - viewportPadding;
    const spaceAbove = rect.top - menuGap - viewportPadding;
    const showAbove = spaceBelow < 140 && spaceAbove > spaceBelow;
    const maxHeight = Math.max(100, Math.min(menuMaxHeight, showAbove ? spaceAbove : spaceBelow));

    setMenuPosition({
      left,
      maxHeight,
      top: showAbove ? undefined : rect.bottom + menuGap,
      bottom: showAbove ? window.innerHeight - rect.top + menuGap : undefined,
      width,
    });
  }, [editable, measuredWidth]);

  /** Opens the menu and restores the selected or first available option.
   * @param None; reads current selection and option data.
   * @returns Nothing; initializes search and focus state.
   */
  const openMenu = useCallback(() => {
    const firstEnabledOption = options.find((option) => !option.disabled);
    setFocusedValue(
      !selectedOption || selectedOption.disabled ? (firstEnabledOption?.value ?? '') : value,
    );
    if (editable) setQuery('');
    if (searchable) setSearchQuery('');
    setScrollTop(0);
    setIsOpen(true);
    if (editable) inputRef.current?.focus();
  }, [editable, options, searchable, selectedOption, value]);

  useEffect(() => {
    if (isOpen && searchable && !editable) {
      const frame = requestAnimationFrame(() => searchInputRef.current?.focus());
      return () => cancelAnimationFrame(frame);
    }
  }, [editable, isOpen, searchable]);

  /**
   * Commits an enabled option and restores focus to the trigger.
   *
   * @param option Option selected by pointer or keyboard input.
   * @returns Nothing; updates the selected value and dismisses the menu.
   */
  const selectOption = useCallback(
    (option: SelectMenuOption) => {
      if (option.disabled) return;
      onChange(option.value);
      setIsOpen(false);
      setSearchQuery('');
      if (focusFrame.current !== undefined) cancelAnimationFrame(focusFrame.current);
      const focusOwner = document.activeElement;
      focusFrame.current = window.requestAnimationFrame(() => {
        // Do not steal focus if the user has already moved to another field.
        if (document.activeElement === focusOwner || document.activeElement === document.body)
          (editable ? inputRef.current : triggerRef.current)?.focus();
      });
    },
    [editable, onChange],
  );

  /**
   * Moves keyboard focus between available options.
   *
   * @param direction Navigation direction represented by one or negative one.
   * @returns Nothing; updates the focused option when an enabled target exists.
   */
  const moveFocus = useCallback(
    (direction: 1 | -1) => {
      const nextOption = findNextEnabledOption(visibleOptions, focusedValue || value, direction);
      if (nextOption) setFocusedValue(nextOption.value);
    },
    [focusedValue, visibleOptions, value],
  );

  /**
   * Handles menu navigation keys for both the trigger and focused option buttons.
   *
   * @param event Keyboard event raised by the select trigger or option list.
   * @returns Nothing; opens, navigates, selects or dismisses the menu when applicable.
   */
  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement | HTMLDivElement | HTMLInputElement>,
  ) => {
    if (disabled || event.nativeEvent.isComposing) return;
    if (editable && event.target instanceof HTMLInputElement) {
      if (event.key === 'Tab') {
        setIsOpen(false);
        return;
      }
      if (!['ArrowDown', 'ArrowUp', 'Escape', 'Enter'].includes(event.key)) return;
      if (event.key === 'Enter' && !isOpen) return;
      if (
        event.key === 'Enter' &&
        !visibleOptions.some((option) => option.value === focusedValue)
      ) {
        event.preventDefault();
        setIsOpen(false);
        return;
      }
    }

    if (event.key === 'Tab') {
      setIsOpen(false);
      return;
    }
    if (event.key === 'Escape') {
      if (isOpen) {
        event.preventDefault();
        setIsOpen(false);
        (editable ? inputRef.current : triggerRef.current)?.focus();
      }
      return;
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!isOpen) openMenu();
      moveFocus(event.key === 'ArrowDown' ? 1 : -1);
      return;
    }

    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      if (!isOpen) openMenu();
      const candidates = visibleOptions.filter((option) => !option.disabled);
      const option = event.key === 'Home' ? candidates[0] : candidates.at(-1);
      if (option) setFocusedValue(option.value);
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (!isOpen) {
        openMenu();
        return;
      }
      const option = visibleOptions.find((item) => item.value === focusedValue);
      if (option) selectOption(option);
    }
  };

  useEffect(() => {
    if (!disabled) return;
    setIsOpen(false);
  }, [disabled]);

  useEffect(() => {
    if (!isOpen) return;
    /** Closes the menu after a pointer press outside its trigger and popup.
     * @param event Document pointer event.
     * @returns Nothing; closes the menu for outside presses.
     */
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setIsOpen(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [isOpen]);

  useLayoutEffect(() => {
    if (!isOpen) return;
    updateMenuPosition();
    let frame: number | undefined;
    /** Batches viewport geometry updates without remeasuring option text.
     * @param None.
     * @returns Nothing; schedules at most one frame.
     */
    const handleViewportChange = () => {
      frame ??= requestAnimationFrame(() => {
        frame = undefined;
        updateMenuPosition();
      });
    };
    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);
    return () => {
      if (frame !== undefined) cancelAnimationFrame(frame);
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
    };
  }, [isOpen, updateMenuPosition]);

  useLayoutEffect(() => {
    if (!isOpen || editable || searchable) return;
    const frame = window.requestAnimationFrame(() => {
      menuRef.current
        ?.querySelector<HTMLButtonElement>(`[data-select-value="${CSS.escape(focusedValue)}"]`)
        ?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [editable, focusedValue, isOpen, searchable]);

  useEffect(() => {
    if (!isOpen || !searchable || virtual) return;
    const optionEl = menuRef.current?.querySelector<HTMLButtonElement>(
      `[data-select-value="${CSS.escape(focusedValue)}"]`,
    );
    optionEl?.scrollIntoView({ block: 'nearest' });
  }, [focusedValue, isOpen, searchable, virtual]);

  return (
    <div
      className={[
        'select-menu',
        editable ? 'select-menu--editable' : '',
        isOpen ? 'is-open' : '',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
      ref={rootRef}
    >
      {editable ? (
        <div
          aria-disabled={disabled || undefined}
          className={`select-menu__trigger ${triggerClassName ?? ''}`.trim()}
        >
          <Input
            aria-activedescendant={isOpen ? activeOptionId : undefined}
            aria-autocomplete="list"
            aria-controls={isOpen ? listboxId : undefined}
            aria-expanded={isOpen}
            aria-label={ariaLabel}
            autoComplete="off"
            className="select-menu__input"
            disabled={disabled}
            id={controlId}
            onChange={(event) => {
              const next = event.target.value;
              onChange(next);
              setQuery(next);
              setFocusedValue(
                filterOptions(options, next).find((option) => !option.disabled)?.value ?? '',
              );
              setIsOpen(true);
            }}
            onFocus={openMenu}
            onClick={() => {
              if (!isOpen) openMenu();
            }}
            onBlur={(event) => {
              const target = event.relatedTarget;
              if (
                target instanceof Node &&
                (rootRef.current?.contains(target) || menuRef.current?.contains(target))
              )
                return;
              setIsOpen(false);
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            ref={inputRef}
            role="combobox"
            value={value}
            variant="embedded"
          />
          {clearable && value && (
            <button
              aria-label={`清空${ariaLabel}`}
              className="select-menu__clear"
              disabled={disabled}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onChange('');
                setQuery('');
                setFocusedValue(options.find((option) => !option.disabled)?.value ?? '');
                setIsOpen(true);
                inputRef.current?.focus();
              }}
              type="button"
            >
              <IconX aria-hidden="true" size={12} />
            </button>
          )}
        </div>
      ) : (
        <button
          aria-controls={isOpen ? listboxId : undefined}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-label={ariaLabel}
          className={`select-menu__trigger ${triggerClassName ?? ''}`.trim()}
          disabled={disabled}
          id={controlId}
          onClick={() => (isOpen ? setIsOpen(false) : openMenu())}
          onKeyDown={handleKeyDown}
          ref={triggerRef}
          type="button"
        >
          <span className="select-menu__value">
            {selectedOption?.tag && !selectedLabel && (
              <span className={`select-menu__tag ${selectedOption.tagColor ?? ''}`}>
                {selectedOption.tag}
              </span>
            )}
            <span className="select-menu__label-text">
              {selectedLabel ?? selectedOption?.label ?? placeholder ?? '请选择'}
            </span>
            {selectedOption?.description && !selectedLabel && (
              <span className="select-menu__value-desc">{selectedOption.description}</span>
            )}
          </span>
          <IconChevronDown
            aria-hidden="true"
            className="select-menu__chevron"
            size={15}
            stroke={1.8}
          />
        </button>
      )}
      {isOpen &&
        menuPosition &&
        createPortal(
          <div
            aria-labelledby={controlId}
            className={`select-menu__menu ${searchable ? 'select-menu__menu--searchable' : ''} ${menuClassName ?? ''}`.trim()}
            id={searchable ? undefined : listboxId}
            onKeyDown={handleKeyDown}
            ref={menuRef}
            role={searchable ? undefined : 'listbox'}
            style={menuPosition}
          >
            {searchable && (
              <div className="select-menu__search" onClick={(event) => event.stopPropagation()}>
                <IconSearch
                  aria-hidden="true"
                  className="select-menu__search-icon"
                  size={13}
                  stroke={1.8}
                />
                <input
                  aria-label={`搜索${ariaLabel}`}
                  role="combobox"
                  aria-autocomplete="list"
                  aria-expanded={isOpen}
                  aria-controls={listboxId}
                  aria-activedescendant={activeOptionId}
                  className="select-menu__search-input"
                  onChange={(event) => {
                    const next = event.target.value;
                    setSearchQuery(next);
                    setFocusedValue(
                      filterOptions(options, next).find((option) => !option.disabled)?.value ?? '',
                    );
                  }}
                  onKeyDown={(event) => {
                    event.stopPropagation();
                    if (event.nativeEvent.isComposing || event.keyCode === 229) return;
                    if (event.key === 'Tab') {
                      triggerRef.current?.focus();
                      setIsOpen(false);
                    } else if (event.key === 'Escape') {
                      event.preventDefault();
                      setIsOpen(false);
                      triggerRef.current?.focus();
                    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                      event.preventDefault();
                      moveFocus(event.key === 'ArrowDown' ? 1 : -1);
                    } else if (event.key === 'Home' || event.key === 'End') {
                      event.preventDefault();
                      const candidates = visibleOptions.filter((option) => !option.disabled);
                      setFocusedValue(
                        (event.key === 'Home' ? candidates[0] : candidates.at(-1))?.value ?? '',
                      );
                    } else if (event.key === 'Enter') {
                      event.preventDefault();
                      const option = visibleOptions.find((item) => item.value === focusedValue);
                      if (option) selectOption(option);
                    }
                  }}
                  placeholder={searchPlaceholder ?? '搜索...'}
                  ref={searchInputRef}
                  value={searchQuery}
                />
                {searchQuery && (
                  <button
                    aria-label="清空搜索"
                    className="select-menu__search-clear"
                    onClick={() => {
                      setSearchQuery('');
                      setFocusedValue(
                        (
                          options.find((option) => option.value === value && !option.disabled) ??
                          options.find((option) => !option.disabled)
                        )?.value ?? '',
                      );
                      searchInputRef.current?.focus();
                    }}
                    type="button"
                  >
                    <IconX aria-hidden="true" size={12} stroke={1.8} />
                  </button>
                )}
              </div>
            )}
            <div
              className={`select-menu__options-wrap rare-moving-menu rare-moving-options ${virtual ? 'select-menu__options-wrap--virtual' : ''}`}
              id={searchable ? listboxId : undefined}
              role={searchable ? 'listbox' : undefined}
              aria-label={searchable ? ariaLabel : undefined}
              ref={optionsRef}
              onScroll={
                virtual ? (event) => setScrollTop(event.currentTarget.scrollTop) : undefined
              }
              style={virtual ? { height: listHeight, flex: 'none' } : undefined}
            >
              {virtual && <div role="presentation" style={{ height: startIndex * optionHeight }} />}
              {renderedOptions.map((option, index) => {
                const selected = option.value === value;
                return (
                  <button
                    aria-selected={selected}
                    className={`select-menu__option ${selected ? 'is-selected' : ''}${(editable || searchable) && option.value === focusedValue ? ' is-focused' : ''}`.trim()}
                    data-select-value={option.value}
                    disabled={option.disabled}
                    id={optionIds.get(option.value)}
                    aria-posinset={startIndex + index + 1}
                    aria-setsize={visibleOptions.length}
                    title={`${option.tag ?? ''} ${option.label} ${option.description ?? ''}`.trim()}
                    key={option.value}
                    onMouseDown={editable ? (event) => event.preventDefault() : undefined}
                    onClick={() => selectOption(option)}
                    role="option"
                    tabIndex={!editable && !searchable && option.value === focusedValue ? 0 : -1}
                    type="button"
                  >
                    <span className="select-menu__option-content">
                      {option.tag && (
                        <span className={`select-menu__tag ${option.tagColor ?? ''}`}>
                          {option.tag}
                        </span>
                      )}
                      <span className="select-menu__option-label">{option.label}</span>
                      {option.description && (
                        <span className="select-menu__option-desc">{option.description}</span>
                      )}
                    </span>
                    {selected && <IconCheck aria-hidden="true" size={14} stroke={2} />}
                  </button>
                );
              })}
              {virtual && (
                <div
                  role="presentation"
                  style={{ height: (visibleOptions.length - endIndex) * optionHeight }}
                />
              )}
              {!visibleOptions.length && (
                <p className="select-menu__empty">
                  {editable ? '无匹配项，可使用当前输入' : '无匹配结果'}
                </p>
              )}
            </div>
          </div>,
          rootRef.current?.closest('dialog') ?? document.body,
        )}
    </div>
  );
}
