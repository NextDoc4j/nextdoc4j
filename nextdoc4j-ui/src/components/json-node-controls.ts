import { foldEffect, foldedRanges, syntaxTree, unfoldEffect } from '@codemirror/language';
import {
  Decoration,
  EditorView,
  ViewPlugin,
  WidgetType,
  type DecorationSet,
  type ViewUpdate,
} from '@codemirror/view';

export interface JsonNodeSelection {
  source: string;
  path: Array<string | number>;
  anchor: HTMLButtonElement;
}
const valueNames = new Set(['Object', 'Array', 'String', 'Number', 'True', 'False', 'Null']);
// Tabler IconCopy outline (MIT), matching the application's icon set.
const copyIcon =
  '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 9.667a2.667 2.667 0 0 1 2.667 -2.667h8.666a2.667 2.667 0 0 1 2.667 2.667v8.666a2.667 2.667 0 0 1 -2.667 2.667h-8.666a2.667 2.667 0 0 1 -2.667 -2.667l0 -8.666"/><path d="M4.012 16.737a2.005 2.005 0 0 1 -1.012 -1.737v-10c0 -1.1 .9 -2 2 -2h10c.75 0 1.158 .385 1.5 1"/></svg>';

/** Counts direct children using the syntax tree, never schema depth or descendants. */
class EntriesWidget extends WidgetType {
  /** Creates a non-editable count decoration.
   * @param count Direct property or array-element count.
   * @returns A count widget without source text changes.
   */
  constructor(readonly count: number) {
    super();
  }
  /** Creates the muted count after an opening bracket.
   * @param None.
   * @returns A presentation-only count element.
   */
  toDOM() {
    const span = document.createElement('span');
    span.className = 'cm-json-count';
    span.textContent = `${this.count} ${this.count === 1 ? 'entry' : 'entries'}`;
    span.setAttribute('aria-hidden', 'true');
    return span;
  }
  /** Reuses count DOM when its direct children have not changed.
   * @param other Incoming count widget.
   * @returns Whether both counters match.
   */
  eq(other: EntriesWidget) {
    return this.count === other.count;
  }
}

/** Provides copy actions anchored inside a JSON node's source row. */
class NodeCopyWidget extends WidgetType {
  /** Captures the node offsets and path without eagerly copying its source.
   * @param from Start of the JSON value.
   * @param to End of the complete JSON value, including folded descendants.
   * @param path Structural path from the root.
   * @param open Opens the owning editor's copy menu.
   * @param inline Whether multiple source nodes share the same physical line.
   * @returns A node action widget.
   */
  constructor(
    readonly from: number,
    readonly to: number,
    readonly path: Array<string | number>,
    readonly open: (selection: JsonNodeSelection) => void,
    readonly inline: boolean,
  ) {
    super();
  }
  /** Creates a keyboard-accessible button without making it part of editable text.
   * @param view Editor providing the current complete node source.
   * @returns Zero-width anchor containing the copy button.
   */
  toDOM(view: EditorView) {
    const span = document.createElement('span');
    span.className = `cm-json-copy-anchor${this.inline ? ' is-inline' : ''}`;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'cm-json-node-copy';
    button.innerHTML = copyIcon;
    button.setAttribute('aria-label', `复制 ${formatJsonNodePath(this.path)}`);
    button.setAttribute('aria-haspopup', 'menu');
    button.onmousedown = (event) => event.preventDefault();
    button.onclick = (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.open({
        source: view.state.doc.sliceString(this.from, this.to),
        path: this.path,
        anchor: button,
      });
    };
    span.append(button);
    return span;
  }
  /** Reuses DOM only while the captured source range and path remain valid.
   * @param other Incoming node action.
   * @returns Whether its identity matches this widget.
   */
  eq(other: NodeCopyWidget) {
    return (
      this.inline === other.inline &&
      this.from === other.from &&
      this.to === other.to &&
      JSON.stringify(this.path) === JSON.stringify(other.path)
    );
  }
  /** Keeps copy interactions outside editor cursor and selection handling.
   * @param None.
   * @returns True for widget-owned events.
   */
  ignoreEvent() {
    return true;
  }
}

/** Formats an unambiguous JSONPath, including keys containing dots or quotes.
 * @param path Structural property names and array indices.
 * @returns Root-prefixed JSONPath.
 */
export function formatJsonNodePath(path: Array<string | number>): string {
  return (
    '$' +
    path
      .map((key) =>
        typeof key === 'number'
          ? `[${key}]`
          : /^[A-Za-z_$][\w$]*$/.test(key)
            ? `.${key}`
            : `[${JSON.stringify(key)}]`,
      )
      .join('')
  );
}

/** Adds viewport-only counts and copy actions while preserving the editor document.
 * @param open Opens the React copy menu.
 * @returns A CodeMirror viewport decoration extension.
 */
export function jsonNodeControls(open: (selection: JsonNodeSelection) => void) {
  /** Builds widgets only for visible node starts, excluding folded descendants.
   * @param view Current JSON editor.
   * @returns Sorted presentation decorations.
   */
  const build = (view: EditorView): DecorationSet => {
    const tree = syntaxTree(view.state);
    if (tree.topNode.name !== 'JsonText') return Decoration.none;
    const decorations: ReturnType<Decoration['range']>[] = [];
    const visited = new Set<number>();
    const nodes: Array<{ from: number; to: number; path: Array<string | number>; line: number }> =
      [];
    const perLine = new Map<number, number>();
    const folds: Array<{ from: number; to: number }> = [];
    foldedRanges(view.state).between(0, view.state.doc.length, (from, to) => {
      folds.push({ from, to });
    });
    for (const range of view.visibleRanges)
      tree.iterate({
        from: range.from,
        to: range.to,
        enter(node) {
          if (
            !valueNames.has(node.name) ||
            visited.has(node.from) ||
            node.from < range.from ||
            folds.some((fold) => node.from >= fold.from && node.from < fold.to)
          )
            return;
          visited.add(node.from);
          const path: Array<string | number> = [];
          // Walk this exact value node; resolving the opening offset may enter its first child.
          for (
            let current: typeof node.node | null = node.node;
            current;
            current = current.parent
          ) {
            if (current.name === 'Property') {
              const key = current.getChild('PropertyName');
              if (!key) return;
              try {
                path.unshift(JSON.parse(view.state.doc.sliceString(key.from, key.to)));
              } catch {
                return;
              }
            } else if (current.parent?.name === 'Array') {
              let index = 0;
              for (let sibling = current.prevSibling; sibling; sibling = sibling.prevSibling)
                if (valueNames.has(sibling.name)) index++;
              path.unshift(index);
            }
          }
          if (node.name === 'Object' || node.name === 'Array') {
            let count = 0;
            for (let child = node.node.firstChild; child; child = child.nextSibling)
              if (node.name === 'Object' ? child.name === 'Property' : valueNames.has(child.name))
                count++;
            decorations.push(
              Decoration.widget({ widget: new EntriesWidget(count), side: -1 }).range(
                node.from + 1,
              ),
            );
          }
          const line = view.state.doc.lineAt(node.from).number;
          perLine.set(line, (perLine.get(line) ?? 0) + 1);
          nodes.push({ from: node.from, to: node.to, path, line });
        },
      });
    for (const node of nodes)
      decorations.push(
        Decoration.widget({
          widget: new NodeCopyWidget(
            node.from,
            node.to,
            node.path,
            open,
            (perLine.get(node.line) ?? 0) > 1,
          ),
          side: -2,
        }).range(node.from),
      );
    return Decoration.set(decorations, true);
  };
  return ViewPlugin.define(
    (view) => ({
      decorations: build(view),
      /** Refreshes actions after source, viewport or folding changes.
       * @param update Editor update.
       * @returns Nothing; replaces visible decorations.
       */
      update(update: ViewUpdate) {
        if (
          update.docChanged ||
          update.viewportChanged ||
          syntaxTree(update.state) !== syntaxTree(update.startState) ||
          update.transactions.some((tr) =>
            tr.effects.some((effect) => effect.is(foldEffect) || effect.is(unfoldEffect)),
          )
        )
          this.decorations = build(update.view);
      },
    }),
    { decorations: (plugin) => plugin.decorations },
  );
}
