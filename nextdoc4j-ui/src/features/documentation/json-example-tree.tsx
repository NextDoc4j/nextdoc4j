import { getSchemaType } from '../openapi/schema';
import { useNotification } from '../../lib/notifications';
import { Input } from '../../components/input';
import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { IconChevronRight, IconCopy, IconSearch, IconX } from '@tabler/icons-react';

import { MarkdownContent } from './markdown-content';
import { getSchemaEnumItems } from '../openapi/schema';
import { stringifyJsonExample, type JsonExampleNode } from './json-example-model';

/** Collects nodes in reading order for keyboard navigation.
 * @param node Root of a JSON subtree.
 * @returns Nodes in document order, including collapsed descendants needed for focus navigation.
 */
function allNodes(node: JsonExampleNode): JsonExampleNode[] {
  return [node, ...node.children.flatMap(allNodes)];
}

/** Flattens only visible rows while keeping closing punctuation separate from tree items.
 * @param node Root node to render.
 * @param collapsed Set of collapsed collection identifiers.
 * @returns JSON rows in reading order.
 */
function visibleRows(
  node: JsonExampleNode,
  collapsed: Set<string>,
): Array<{ node: JsonExampleNode; closing: boolean }> {
  const result = [{ node, closing: false }];
  if (node.complex && node.children.length && !collapsed.has(node.id))
    result.push(...node.children.flatMap((child) => visibleRows(child, collapsed)), {
      node,
      closing: true,
    });
  return result;
}

/** Copies exact JSON text with a fallback for non-secure document hosts.
 * @param text Complete text to copy.
 * @returns Whether the browser accepted the clipboard operation.
 */
async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const previous = document.activeElement,
      textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.cssText = 'position:fixed;left:-9999px;top:0';
    document.body.append(textarea);
    textarea.select();
    try {
      return document.execCommand('copy');
    } catch {
      return false;
    } finally {
      textarea.remove();
      if (previous instanceof HTMLElement) previous.focus({ preventScroll: true });
    }
  }
}

/** Copies JSON and publishes feedback through the global notification center.
 * @param props Complete JSON text, accessible label and optional styling.
 * @returns A theme-aware copy button with success/failure feedback.
 */
export function JsonExampleCopy({
  text,
  label,
  className = '',
}: {
  text: string;
  label: string;
  className?: string;
}) {
  const setFeedback = useNotification();
  return (
    <span className={`operation-json__copy-anchor ${className}`}>
      <button
        type="button"
        className="operation-json__copy"
        title={label}
        aria-label={label}
        onClick={async (event) => {
          event.stopPropagation();
          setFeedback((await copyText(text)) ? '已复制' : '复制失败');
        }}
      >
        <IconCopy size={14} stroke={1.7} aria-hidden="true" />
      </button>
    </span>
  );
}

/** Matches numeric/string enum equivalents for annotations without changing JSON values.
 * @param expected Declared enum value.
 * @param actual Value present in the JSON example.
 * @returns Whether this enum describes the current value.
 */
function matchesEnum(expected: string | number, actual: unknown): boolean {
  return (
    Object.is(expected, actual) ||
    ((typeof actual === 'string' || typeof actual === 'number') &&
      String(expected) === String(actual))
  );
}

/** Shows short enums inline and long enums in a readable, searchable floating list.
 * @param props Node whose enum metadata is being inspected.
 * @returns Current enum meaning and either a small list or a count-triggered detail panel.
 */
function EnumMetadata({ node }: { node: JsonExampleNode }) {
  const enums = getSchemaEnumItems(node.schema);
  const [open, setOpen] = useState(false),
    [query, setQuery] = useState('');
  const [position, setPosition] = useState<CSSProperties>();
  const triggerRef = useRef<HTMLButtonElement>(null),
    panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const current = enums.find((item) => matchesEnum(item.value, node.value));
  const filtered = enums.filter((item) =>
    `${item.value} ${item.description || ''}`.toLowerCase().includes(query.trim().toLowerCase()),
  );
  /** Closes the read-only enum panel and restores focus to its trigger.
   * @param None.
   * @returns Nothing; leaves the example value unchanged.
   */
  const close = () => {
    setOpen(false);
    setQuery('');
    triggerRef.current?.focus({ preventScroll: true });
  };
  useLayoutEffect(() => {
    if (!open) return;
    /** Positions the panel within the viewport even inside a scrolling side column.
     * @param None; reads the enum trigger bounds.
     * @returns Nothing; updates the floating panel geometry.
     */
    const place = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = Math.min(300, window.innerWidth - 32);
      const below = window.innerHeight - rect.bottom - 16,
        above = rect.top - 16;
      const upwards = below < 280 && above > below;
      setPosition({
        width,
        left: Math.max(16, Math.min(rect.right - width, window.innerWidth - width - 16)),
        top: upwards ? rect.top - 7 : rect.bottom + 7,
        maxHeight: Math.max(120, Math.min(360, upwards ? above : below)),
        transform: upwards ? 'translateY(-100%)' : undefined,
      });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open]);
  useEffect(() => {
    if (!open) return;
    /** Dismisses the panel only when the pointer leaves its interaction area.
     * @param event Document-level pointer event.
     * @returns Nothing; clicks inside the panel remain available for reading and search.
     */
    const outside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!panelRef.current?.contains(target) && !triggerRef.current?.contains(target)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);
  const positioned = position !== undefined;
  useEffect(() => {
    if (open && positioned)
      (
        panelRef.current?.querySelector<HTMLElement>('input') ||
        panelRef.current?.querySelector<HTMLElement>('button')
      )?.focus({ preventScroll: true });
  }, [open, positioned]);
  if (!enums.length) return null;
  return (
    <div className="operation-json__enums" aria-label="枚举定义">
      {enums.length <= 3 ? (
        enums.map((item, index) => (
          <span className={matchesEnum(item.value, node.value) ? 'is-matched' : ''} key={index}>
            <code>{String(item.value)}</code>
            {item.description && <>-{item.description}</>}
          </span>
        ))
      ) : (
        <>
          {current && (
            <span className="is-matched">
              <code>{String(current.value)}</code>
              {current.description && <>-{current.description}</>}
            </span>
          )}
          <button
            ref={triggerRef}
            type="button"
            className="operation-json__enum-trigger"
            aria-label={`查看 ${node.path} 的全部 ${enums.length} 项枚举`}
            aria-haspopup="dialog"
            aria-expanded={open}
            aria-controls={open ? panelId : undefined}
            onClick={() => {
              setOpen((value) => !value);
              setQuery('');
            }}
          >
            共 {enums.length} 项
          </button>
          {open &&
            position &&
            createPortal(
              <div
                className="operation-json__enum-panel"
                style={position}
                ref={panelRef}
                id={panelId}
                role="dialog"
                aria-label={`${node.path} 的枚举定义`}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') {
                    event.stopPropagation();
                    close();
                  }
                }}
              >
                <header>
                  <span>
                    枚举值 <small>{enums.length} 项</small>
                  </span>
                  <button type="button" aria-label="关闭枚举列表" onClick={close}>
                    <IconX size={14} />
                  </button>
                </header>
                {enums.length > 8 && (
                  <label className="operation-json__enum-search ui-input-shell">
                    <IconSearch size={13} />
                    <Input
                      variant="embedded"
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="查找枚举值或说明"
                      aria-label="查找枚举值或说明"
                    />
                  </label>
                )}
                <div className="operation-json__enum-list">
                  {filtered.length ? (
                    filtered.map((item, index) => (
                      <div
                        className={`operation-json__enum-row${matchesEnum(item.value, node.value) ? ' is-current' : ''}`}
                        key={index}
                      >
                        <code>{String(item.value)}</code>
                        <span>{item.description}</span>
                        {matchesEnum(item.value, node.value) && <small>当前</small>}
                      </div>
                    ))
                  ) : (
                    <p className="operation-json__enum-empty">未找到匹配的枚举</p>
                  )}
                </div>
              </div>,
              document.body,
            )}
        </>
      )}
    </div>
  );
}

/** Shows schema descriptions and enum meanings beside the JSON value.
 * @param props Displayed JSON node.
 * @returns Annotations with a compact entry point when the enum list is long.
 */
function Annotation({ node }: { node: JsonExampleNode }) {
  const description = node.depth === 0 ? undefined : node.schema.description;
  if (!description && !getSchemaEnumItems(node.schema).length) return null;
  return (
    <div className="operation-json__annotation">
      {description && (
        <div className="operation-json__description">
          <MarkdownContent content={description} />
        </div>
      )}
      <EnumMetadata node={node} />
    </div>
  );
}

/** Draws each ancestor guide through the current row and terminates a scope at its own closing bracket.
 * @param props Current node, ancestor lookup, opening/closing state and highlighted scope.
 * @returns Continuous vertical guides and a single elbow pointing to the corresponding closing bracket.
 */
function ScopeGuides({
  node,
  nodes,
  closing,
  expanded,
  paired,
}: {
  node: JsonExampleNode;
  nodes: Map<string, JsonExampleNode>;
  closing: boolean;
  expanded: boolean;
  paired: string | null;
}) {
  const parents: JsonExampleNode[] = [];
  let parent = node.parent;
  while (parent !== null) {
    const item = nodes.get(parent);
    if (!item) break;
    parents.push(item);
    parent = item.parent;
  }
  return (
    <div className="operation-json__guides" aria-hidden="true">
      {parents.map((item) => (
        <i
          className={paired === item.id ? 'is-paired' : ''}
          key={item.id}
          style={{ left: 8 + item.depth * 12 }}
        />
      ))}
      {closing ? (
        <i
          className={`operation-json__guide-end${paired === node.id ? ' is-paired' : ''}`}
          style={{ left: 8 + node.depth * 12 }}
        />
      ) : (
        expanded &&
        node.children.length > 0 && (
          <i
            className={`operation-json__guide-start${paired === node.id ? ' is-paired' : ''}`}
            style={{ left: 8 + node.depth * 12 }}
          />
        )
      )}
    </div>
  );
}

/** Displays a quiet directory-like JSON tree with actions embedded in its text.
 * @param props Tree, optional annotations/counts, value editor, external fold action and disclosure reset identity.
 * @returns JSON rows with collection-only copy controls, paired bracket guides and local disclosure arrows.
 */
export function JsonExampleTree({
  tree,
  renderValue,
  resetKey,
  showAnnotations = true,
  showCounts = true,
  fold,
}: {
  tree: JsonExampleNode;
  showAnnotations?: boolean;
  showCounts?: boolean;
  fold?: { collapsed: boolean; revision: number };
  renderValue?: (node: JsonExampleNode) => ReactNode;
  resetKey?: string;
}) {
  const [collapsed, setCollapsed] = useState(new Set<string>()),
    [longOpen, setLongOpen] = useState(new Set<string>());
  const [active, setActive] = useState('');
  const [paired, setPaired] = useState<string | null>(null);
  const rowRefs = useRef(new Map<string, HTMLDivElement>());
  const all = useMemo(() => allNodes(tree), [tree]),
    rows = visibleRows(tree, collapsed),
    interactive = rows.filter((row) => !row.closing);
  const nodes = useMemo(() => new Map(all.map((node) => [node.id, node])), [all]);
  const treeId = useId();
  const treeIdentity = resetKey ?? tree;
  useEffect(() => {
    setCollapsed(new Set());
    setLongOpen(new Set());
    setActive('');
    setPaired(null);
  }, [treeIdentity]);
  useEffect(() => {
    if (fold)
      setCollapsed(
        new Set(fold.collapsed ? all.filter((node) => node.complex).map((node) => node.id) : []),
      );
  }, [all, fold]);
  /** Toggles one container while retaining all other branch states.
   * @param node Collection to expand or collapse.
   * @returns Nothing; updates only this node and keyboard focus state.
   */
  const toggle = (node: JsonExampleNode) => {
    setActive(node.id);
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(node.id)) next.delete(node.id);
      else next.add(node.id);
      return next;
    });
  };
  /** Navigates to a node and opens only the ancestors needed to reveal it.
   * @param node Target reached through keyboard navigation.
   * @returns Nothing; moves focus to the revealed JSON row.
   */
  const reveal = (node: JsonExampleNode) => {
    setCollapsed((current) => {
      const next = new Set(current);
      let parent = node.parent;
      while (parent !== null) {
        next.delete(parent);
        parent = all.find((item) => item.id === parent)?.parent ?? null;
      }
      return next;
    });
    setActive(node.id);
    requestAnimationFrame(() => {
      const row = rowRefs.current.get(node.id);
      row?.scrollIntoView({ block: 'nearest' });
      row?.focus({ preventScroll: true });
    });
  };
  return (
    <>
      <div className="operation-json__tree-scroll">
        <div className="operation-json__tree" role="tree" aria-label="JSON 示例目录树" id={treeId}>
          {rows.map(({ node, closing }) => {
            const open = !collapsed.has(node.id),
              isLong = typeof node.value === 'string' && node.value.length > 60;
            const hasMeta =
              showAnnotations &&
              ((node.depth > 0 && Boolean(node.schema.description)) ||
                getSchemaEnumItems(node.schema).length > 0);
            const indent = node.depth * 12;
            const punctuation = node.array ? ['[', ']'] : ['{', '}'];
            const comma = node.index < node.siblings - 1 ? ',' : '';
            if (closing)
              return (
                <div
                  key={`${node.id}:close`}
                  className={`operation-json__closing${paired === node.id ? ' is-paired' : ''}`}
                  aria-hidden="true"
                  onMouseEnter={() => setPaired(node.id)}
                  onMouseLeave={() => setPaired(null)}
                >
                  <ScopeGuides node={node} nodes={nodes} closing expanded paired={paired} />
                  <span
                    className="operation-json__end-bracket"
                    style={{ paddingLeft: indent + 15 }}
                  >
                    {punctuation[1]}
                    {comma}
                  </span>
                </div>
              );
            const type =
              node.value === null
                ? 'null'
                : typeof node.value === 'number'
                  ? getSchemaType(node.schema) !== 'number' && Number.isInteger(node.value)
                    ? 'integer'
                    : 'number'
                  : typeof node.value;
            const displayedValue =
              isLong && !longOpen.has(node.id)
                ? `${JSON.stringify(String(node.value).slice(0, 36)).slice(0, -1)}…"`
                : JSON.stringify(node.value);
            return (
              <div
                key={node.id}
                ref={(element) => {
                  if (element) rowRefs.current.set(node.id, element);
                  else rowRefs.current.delete(node.id);
                }}
                className={`operation-json__node${node.complex ? ' is-branch' : ''}${hasMeta ? ' has-annotation' : ''}${active === node.id ? ' is-selected' : ''}${paired === node.id ? ' is-paired' : ''}`}
                style={{ '--node-indent': `${indent}px` } as CSSProperties}
                onMouseEnter={() => setPaired(node.complex ? node.id : node.parent)}
                onMouseLeave={() => setPaired(null)}
                onFocus={(event) => {
                  if (event.currentTarget === event.target)
                    setPaired(node.complex ? node.id : node.parent);
                }}
                onBlur={() => setPaired(null)}
                role="treeitem"
                aria-level={node.depth + 1}
                aria-expanded={node.complex && node.children.length ? open : undefined}
                aria-posinset={node.index + 1}
                aria-setsize={node.siblings}
                aria-selected={active === node.id}
                tabIndex={active === node.id ? 0 : -1}
                onClick={(event) => {
                  setActive(node.id);
                  if (event.target === event.currentTarget)
                    event.currentTarget.focus({ preventScroll: true });
                }}
                onKeyDown={(event) => {
                  if (event.target !== event.currentTarget) return;
                  const index = interactive.findIndex((row) => row.node.id === node.id);
                  if (event.key === 'ArrowDown') {
                    event.preventDefault();
                    reveal(interactive[Math.min(index + 1, interactive.length - 1)].node);
                  } else if (event.key === 'ArrowUp') {
                    event.preventDefault();
                    reveal(interactive[Math.max(0, index - 1)].node);
                  } else if (event.key === 'ArrowRight' && node.children.length) {
                    event.preventDefault();
                    if (!open) toggle(node);
                    else reveal(node.children[0]);
                  } else if (event.key === 'ArrowLeft') {
                    event.preventDefault();
                    if (node.children.length && open) toggle(node);
                    else {
                      const parent = all.find((item) => item.id === node.parent);
                      if (parent) reveal(parent);
                    }
                  } else if (event.key === 'Home') {
                    event.preventDefault();
                    reveal(tree);
                  } else if (event.key === 'End') {
                    event.preventDefault();
                    reveal(interactive[interactive.length - 1].node);
                  }
                }}
              >
                <ScopeGuides
                  node={node}
                  nodes={nodes}
                  closing={false}
                  expanded={node.complex && open}
                  paired={paired}
                />
                <div className="operation-json__code">
                  <span className="operation-json__disclosure-slot">
                    {node.complex && node.children.length > 0 && (
                      <button
                        type="button"
                        tabIndex={-1}
                        aria-label={`${open ? '收起' : '展开'} ${node.path}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          toggle(node);
                        }}
                      >
                        <IconChevronRight className={open ? 'is-open' : ''} size={11} />
                      </button>
                    )}
                  </span>
                  <span className="operation-json__expression">
                    {node.key !== null && (
                      <>
                        <span
                          className={
                            typeof node.key === 'number'
                              ? 'operation-json__index'
                              : 'operation-json__key'
                          }
                        >
                          {typeof node.key === 'number'
                            ? `[${node.key}]`
                            : JSON.stringify(node.key)}
                        </span>
                        <span className="operation-json__punctuation">
                          {typeof node.key === 'number' ? ' ' : ': '}
                        </span>
                      </>
                    )}
                    {node.complex ? (
                      <>
                        <span className="operation-json__bracket">
                          {punctuation[0]}
                          {!open && node.children.length > 0 && (
                            <span className="operation-json__ellipsis"> … </span>
                          )}
                          {(!open || node.children.length === 0) && punctuation[1]}
                        </span>
                        {(!open || node.children.length === 0) && (
                          <span className="operation-json__punctuation">{comma}</span>
                        )}
                        {showCounts && (
                          <span className="operation-json__count">
                            {node.children.length}{' '}
                            {node.children.length === 1 ? 'entry' : 'entries'}
                          </span>
                        )}
                        {node.key !== null && (
                          <JsonExampleCopy
                            className="operation-json__node-copy"
                            text={stringifyJsonExample(node.value)}
                            label={`复制 ${node.path} 为独立 JSON`}
                          />
                        )}
                      </>
                    ) : (
                      <>
                        {renderValue ? (
                          renderValue(node)
                        ) : (
                          <span className={`operation-json__value is-${type}`}>
                            {displayedValue}
                          </span>
                        )}
                        <span className="operation-json__punctuation">{comma}</span>
                        {isLong && !renderValue && (
                          <button
                            type="button"
                            className="operation-json__string-toggle"
                            onClick={(event) => {
                              event.stopPropagation();
                              setLongOpen((current) => {
                                const next = new Set(current);
                                if (next.has(node.id)) next.delete(node.id);
                                else next.add(node.id);
                                return next;
                              });
                            }}
                          >
                            {longOpen.has(node.id) ? '收起' : '展开'}
                          </button>
                        )}
                      </>
                    )}
                  </span>
                </div>
                {hasMeta && <Annotation node={node} />}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
