import { useNotification } from '../lib/notifications';
import { jsonNodeControls, type JsonNodeSelection } from './json-node-controls';
import { JsonNodeCopyMenu } from './json-node-copy-menu';
import { createEditorLayoutMotion } from './rare-ui/editor-layout-motion';
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Annotation,
  Compartment,
  EditorState,
  RangeSetBuilder,
  StateEffect,
  StateField,
} from '@codemirror/state';
import {
  Decoration,
  EditorView,
  drawSelection,
  keymap,
  layer,
  lineNumbers,
  RectangleMarker,
  ViewPlugin,
  WidgetType,
  type DecorationSet,
  type ViewUpdate,
} from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import {
  HighlightStyle,
  bracketMatching,
  codeFolding,
  ensureSyntaxTree,
  foldEffect,
  foldKeymap,
  foldable,
  foldedRanges,
  foldAll,
  unfoldAll,
  syntaxHighlighting,
  syntaxTree,
  unfoldEffect,
} from '@codemirror/language';
import { json } from '@codemirror/lang-json';
import { xml } from '@codemirror/lang-xml';
import { tags } from '@lezer/highlight';
import {
  autocompletion,
  completionKeymap,
  startCompletion,
  type CompletionContext,
} from '@codemirror/autocomplete';
import {
  detectBase64Image,
  isPossibleBase64Prefix,
  scanImagesFromResponse,
  type Base64ImageInfo,
} from '../utils/base64-image';
import { ImagePreviewDialog } from './image-preview-dialog';

export type CodeEditorLanguage = 'json' | 'text' | 'xml';

export interface CodeEditorEnumItem {
  value: number | string;
  description?: string;
}

export interface CodeEditorFieldMeta {
  type?: string;
  description?: string;
  required?: boolean;
  enums?: CodeEditorEnumItem[];
}

export interface CodeEditorProps {
  readOnly?: boolean;
  fold?: { collapsed: boolean; revision: number };
  ariaLabel?: string;
  autoFocus?: boolean;
  lineNumbers?: boolean;
  showAnnotations?: boolean;
  hoverTooltip?: boolean;
  truncateLongStrings?: boolean;
  defaultExpandLongStrings?: boolean;
  getFieldDescription?: (path: Array<string | number>, source: string) => string;
  getFieldOptions?: (path: Array<string | number>, source: string) => CodeEditorEnumItem[];
  getFieldMeta?: (path: Array<string | number>, source: string) => CodeEditorFieldMeta | undefined;
  language: CodeEditorLanguage;
  onChange?: (value: string) => void;
  onPreviewImage?: (image: Base64ImageInfo) => void;
  value: string;
}

const externalChange = Annotation.define<boolean>();
const editorLayoutChange = Annotation.define<boolean>();

const sourceHighlight = HighlightStyle.define([
  { tag: tags.propertyName, class: 'cm-token-key source-editor__key' },
  { tag: tags.string, class: 'cm-token-string source-editor__string' },
  { tag: tags.number, class: 'cm-token-number source-editor__number' },
  { tag: tags.bool, class: 'cm-token-boolean source-editor__boolean' },
  { tag: tags.null, class: 'cm-token-null source-editor__null' },
  { tag: [tags.tagName, tags.angleBracket], class: 'cm-token-boolean source-editor__boolean' },
  { tag: tags.attributeName, class: 'cm-token-key source-editor__key' },
  { tag: [tags.comment, tags.meta], class: 'source-editor__comment' },
  { tag: tags.bracket, class: 'cm-token-bracket' },
  { tag: tags.separator, class: 'cm-token-punctuation source-editor__punctuation' },
]);

// 1. Paired Scope & Continuous Solid Guides with Elbow Hooks (└─)
interface PairedScope {
  openBracketPos: number;
  closeBracketPos: number;
  column: number;
  startLine: number;
  endLine: number;
}

const setPairedScope = StateEffect.define<PairedScope | null>();
const setHoveredLine = StateEffect.define<number | null>();

const pairedScopeField = StateField.define<PairedScope | null>({
  create() {
    return null;
  },
  update(value, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setPairedScope)) return effect.value;
    }
    return value;
  },
});

const hoveredLineField = StateField.define<number | null>({
  create() {
    return null;
  },
  update(value, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setHoveredLine)) return effect.value;
    }
    return tr.docChanged ? null : value;
  },
});

/** Positions one shared hover background in CodeMirror's document coordinates. */
const jsonHoverBackground = layer({
  above: false,
  class: 'cm-json-hover-layer',
  update(update) {
    return (
      update.docChanged ||
      update.viewportChanged ||
      update.startState.field(hoveredLineField, false) !==
        update.state.field(hoveredLineField, false)
    );
  },
  markers(view) {
    if (syntaxTree(view.state).topNode.name !== 'JsonText') return [];
    const number = view.state.field(hoveredLineField, false);
    if (!number || number > view.state.doc.lines) return [];
    const line = view.state.doc.line(number);
    if (!view.visibleRanges.some((range) => line.from >= range.from && line.from <= range.to))
      return [];
    const block = view.lineBlockAt(line.from);
    const content = view.contentDOM.getBoundingClientRect();
    const scroller = view.scrollDOM.getBoundingClientRect();
    return [
      new RectangleMarker(
        'cm-json-hover-background',
        content.left - scroller.left + view.scrollDOM.scrollLeft * view.scaleX,
        view.documentTop +
          block.top * view.scaleY -
          scroller.top +
          view.scrollDOM.scrollTop * view.scaleY,
        content.width,
        block.height * view.scaleY,
      ),
    ];
  },
});

// Annotation and copy widgets may suppress CodeMirror's normal mouse handlers.
// Observe the row without consuming events so their controls retain native behavior.
const jsonHoverTracking = ViewPlugin.define((view) => {
  const move = (event: MouseEvent) => {
    if (syntaxTree(view.state).topNode.name !== 'JsonText') return;
    const row = event.target instanceof Element ? event.target.closest('.cm-line') : null;
    if (!row || !view.contentDOM.contains(row)) return;
    const number = view.state.doc.lineAt(view.posAtDOM(row)).number;
    if (view.state.field(hoveredLineField) !== number)
      view.dispatch({ effects: setHoveredLine.of(number) });
  };
  const leave = () => {
    if (view.state.field(hoveredLineField) !== null)
      view.dispatch({ effects: setHoveredLine.of(null) });
  };
  view.contentDOM.addEventListener('mousemove', move, { capture: true, passive: true });
  view.contentDOM.addEventListener('mouseleave', leave);
  return {
    destroy() {
      view.contentDOM.removeEventListener('mousemove', move, true);
      view.contentDOM.removeEventListener('mouseleave', leave);
    },
  };
});

const guideMarkCache = new Map<string, Decoration>();

function getIndentGuideMark(col: number, isElbow: boolean, isPaired: boolean): Decoration {
  const key = `${col}_${isElbow ? 1 : 0}_${isPaired ? 1 : 0}`;
  let mark = guideMarkCache.get(key);
  if (!mark) {
    let className = 'cm-indent-guide';
    if (isElbow) className += ' is-elbow';
    if (isPaired) className += ' is-paired';
    mark = Decoration.mark({
      class: className,
      attributes: { style: `--cm-guide-col: ${col}` },
    });
    guideMarkCache.set(key, mark);
  }
  return mark;
}

const pairedBracketMark = Decoration.mark({ class: 'cm-bracket-paired' });

class ElbowWidget extends WidgetType {
  constructor(
    readonly col: number,
    readonly isPaired: boolean,
  ) {
    super();
  }

  toDOM() {
    const span = document.createElement('span');
    span.className = `cm-indent-guide is-elbow${this.isPaired ? ' is-paired' : ''}`;
    span.style.setProperty('--cm-guide-col', String(this.col));
    span.style.display = 'inline-block';
    span.style.width = '0';
    span.style.verticalAlign = 'baseline';
    span.style.pointerEvents = 'none';
    return span;
  }

  eq(other: ElbowWidget) {
    return this.col === other.col && this.isPaired === other.isPaired;
  }

  ignoreEvent() {
    return true;
  }
}

class StartGuideWidget extends WidgetType {
  constructor(
    readonly col: number,
    readonly isPaired: boolean,
  ) {
    super();
  }

  toDOM() {
    const span = document.createElement('span');
    span.className = `cm-indent-guide is-start${this.isPaired ? ' is-paired' : ''}`;
    span.style.setProperty('--cm-guide-col', String(this.col));
    span.style.display = 'inline-block';
    span.style.width = '0';
    span.style.verticalAlign = 'baseline';
    span.style.pointerEvents = 'none';
    return span;
  }

  eq(other: StartGuideWidget) {
    return this.col === other.col && this.isPaired === other.isPaired;
  }

  ignoreEvent() {
    return true;
  }
}

/**
 * Resolves the exact paired scope based on mouse position and column depth.
 * If mouse is in indentation whitespace, maps the hovered column to that level's ancestor scope.
 */
function findPairedScopeAtCoords(
  view: EditorView,
  clientX: number,
  clientY: number,
): PairedScope | null {
  const pos = view.posAtCoords({ x: clientX, y: clientY });
  if (pos === null) return null;

  const state = view.state;
  const tree = syntaxTree(state);
  if (tree.topNode.name !== 'JsonText') return null;

  const line = state.doc.lineAt(pos);
  const indentation = line.text.match(/^[ \t]*/u)?.[0] ?? '';
  const indentLength = indentation.length;
  const isInsideIndentation = pos < line.from + indentLength;

  // Collect all enclosing Object / Array scopes from root to innermost
  const scopes: Array<{
    openBracketPos: number;
    closeBracketPos: number;
    column: number;
    startLine: number;
    endLine: number;
  }> = [];

  let curr: ReturnType<typeof tree.resolveInner> | null = tree.resolveInner(pos, -1);
  while (curr) {
    if (curr.name === 'Object' || curr.name === 'Array') {
      const sLine = state.doc.lineAt(curr.from);
      const closeBracketPos = Math.max(curr.from, curr.to - 1);
      const eLine = state.doc.lineAt(closeBracketPos);
      if (eLine.number > sLine.number) {
        const foldRange = foldable(state, sLine.from, sLine.to);
        let isFolded = false;
        if (foldRange) {
          foldedRanges(state).between(foldRange.from, foldRange.to, (from, to) => {
            if (from === foldRange.from && to === foldRange.to) {
              isFolded = true;
              return false;
            }
          });
        }
        if (!isFolded) {
          const sIndent = sLine.text.match(/^[ \t]*/u)?.[0] ?? '';
          const sCol = sIndent.replaceAll('\t', '  ').length;
          scopes.unshift({
            openBracketPos: curr.from,
            closeBracketPos,
            column: sCol + 2,
            startLine: sLine.number,
            endLine: eLine.number,
          });
        }
      }
    }
    curr = curr.parent;
  }

  if (scopes.length === 0) return null;

  if (isInsideIndentation) {
    const charOffset = pos - line.from;
    const hoveredCol = Math.max(2, Math.floor((charOffset + 1) / 2) * 2);

    const matchedScope =
      scopes.find((s) => s.column === hoveredCol) ||
      [...scopes].reverse().find((s) => s.column <= hoveredCol) ||
      scopes[0];

    return matchedScope;
  }

  // On text, highlight innermost scope
  return scopes[scopes.length - 1];
}

/**
 * Builds continuous 1px solid vertical guides with ELBOW HOOKS (└─) on closing bracket lines.
 */
function createIndentGuidePlugin() {
  function buildGuides(view: EditorView): DecorationSet {
    const builder = new RangeSetBuilder<Decoration>();
    const paired = view.state.field(pairedScopeField);
    const hoveredLineNo = view.state.field(hoveredLineField);
    const tree = syntaxTree(view.state);
    let lastLineNumber = -1;

    // Collect all scopes that terminate in the visible range to identify elbow lines
    const scopeEndingBrackets = new Map<number, Array<{ col: number; bracketPos: number }>>();
    if (tree.topNode.name === 'JsonText') {
      tree.iterate({
        enter(node) {
          if (node.name === 'Object' || node.name === 'Array') {
            const sLine = view.state.doc.lineAt(node.from);
            const closeBracketPos = Math.max(node.from, node.to - 1);
            const eLine = view.state.doc.lineAt(closeBracketPos);
            if (eLine.number > sLine.number) {
              const foldRange = foldable(view.state, sLine.from, sLine.to);
              let isFolded = false;
              if (foldRange) {
                foldedRanges(view.state).between(foldRange.from, foldRange.to, (from, to) => {
                  if (from === foldRange.from && to === foldRange.to) {
                    isFolded = true;
                    return false;
                  }
                });
              }
              if (isFolded) {
                return;
              }

              const sIndent = sLine.text.match(/^[ \t]*/u)?.[0] ?? '';
              const col = sIndent.replaceAll('\t', '  ').length + 2;
              let list = scopeEndingBrackets.get(eLine.number);
              if (!list) {
                list = [];
                scopeEndingBrackets.set(eLine.number, list);
              }
              list.push({ col, bracketPos: closeBracketPos });
            }
          }
        },
      });
    }

    for (const range of view.visibleRanges) {
      let line = view.state.doc.lineAt(range.from);
      while (true) {
        if (line.number > lastLineNumber) {
          lastLineNumber = line.number;

          const indentation = line.text.match(/^[ \t]*/u)?.[0] ?? '';
          const columns = indentation.replaceAll('\t', '  ').length;

          const isFoldableLine = Boolean(foldable(view.state, line.from, line.to));

          // Add line decoration for wrapped line hanging indent & hover highlight
          const lineClasses: string[] = [];
          if (hoveredLineNo === line.number) {
            lineClasses.push('cm-active-hover-line');
          }
          if (columns > 0) {
            lineClasses.push('cm-wrapped-indent');
          }
          if (isFoldableLine) {
            lineClasses.push('cm-foldable-line');
          }
          const lineAttrs: Record<string, string> = {};
          if (columns > 0) {
            lineAttrs.style = `--cm-indent-cols: ${columns}`;
          }

          if (lineClasses.length > 0 || Object.keys(lineAttrs).length > 0) {
            builder.add(
              line.from,
              line.from,
              Decoration.line({
                class: lineClasses.length > 0 ? lineClasses.join(' ') : undefined,
                attributes: Object.keys(lineAttrs).length > 0 ? lineAttrs : undefined,
              }),
            );
          }

          let lastOffset = -1;
          const endings = scopeEndingBrackets.get(line.number);

          // 1. Straight vertical lines through indentation spaces
          for (let col = 2; col <= columns; col += 2) {
            if (endings && endings.some((e) => e.col === col)) {
              continue;
            }
            const offset = Math.min(col - 1, indentation.length - 1);
            if (offset >= 0 && offset !== lastOffset && line.from + offset < line.to) {
              lastOffset = offset;
              const isScopePaired = Boolean(
                paired &&
                line.number > paired.startLine &&
                line.number <= paired.endLine &&
                col === paired.column,
              );

              const mark = getIndentGuideMark(col, false, isScopePaired);
              builder.add(line.from + offset, line.from + offset + 1, mark);
            }
          }

          // 2. Elbow hooks (└─) on closing brackets (always renders regardless of leading spaces)
          if (endings) {
            endings.sort((a, b) => a.bracketPos - b.bracketPos);
            for (const ending of endings) {
              if (
                ending.bracketPos >= line.from + (lastOffset + 1) &&
                ending.bracketPos < line.to
              ) {
                const isScopePaired = Boolean(
                  paired &&
                  line.number > paired.startLine &&
                  line.number <= paired.endLine &&
                  ending.col === paired.column,
                );
                builder.add(
                  ending.bracketPos,
                  ending.bracketPos,
                  Decoration.widget({
                    side: -1,
                    widget: new ElbowWidget(ending.col, isScopePaired),
                  }),
                );
              }
            }
          }

          // 3. Start guide (child vertical guide starting from opening line down through any wrapped annotations)
          const foldRange = foldable(view.state, line.from, line.to);
          if (foldRange) {
            let isFolded = false;
            foldedRanges(view.state).between(foldRange.from, foldRange.to, (from, to) => {
              if (from === foldRange.from && to === foldRange.to) {
                isFolded = true;
                return false;
              }
            });
            if (!isFolded) {
              const openBracketPos = foldRange.from - 1;
              if (openBracketPos >= line.from + (lastOffset + 1) && openBracketPos < line.to) {
                const childCol = columns + 2;
                const isChildPaired = Boolean(paired && paired.openBracketPos === openBracketPos);
                builder.add(
                  openBracketPos,
                  openBracketPos,
                  Decoration.widget({
                    side: -1,
                    widget: new StartGuideWidget(childCol, isChildPaired),
                  }),
                );
              }
            }
          }

          // Bracket highlight on opening line
          if (
            paired &&
            line.number === paired.startLine &&
            paired.openBracketPos >= line.from &&
            paired.openBracketPos < line.to &&
            paired.openBracketPos >= line.from + (lastOffset + 1)
          ) {
            builder.add(paired.openBracketPos, paired.openBracketPos + 1, pairedBracketMark);
          }

          // Bracket highlight on closing line
          if (
            paired &&
            line.number === paired.endLine &&
            paired.closeBracketPos >= line.from &&
            paired.closeBracketPos < line.to &&
            paired.closeBracketPos >= line.from + (lastOffset + 1)
          ) {
            builder.add(paired.closeBracketPos, paired.closeBracketPos + 1, pairedBracketMark);
          }
        }
        if (line.to >= range.to) break;
        line = view.state.doc.lineAt(line.to + 1);
      }
    }
    return builder.finish();
  }

  return ViewPlugin.define(
    (view) => {
      let decorations = buildGuides(view);
      return {
        get decorations() {
          return decorations;
        },
        update(update: ViewUpdate) {
          if (
            update.docChanged ||
            update.viewportChanged ||
            syntaxTree(update.state) !== syntaxTree(update.startState) ||
            update.transactions.some(
              (tr) =>
                tr.effects.some((e) => e.is(setPairedScope)) ||
                tr.effects.some((e) => e.is(setHoveredLine)) ||
                tr.effects.some((e) => e.is(foldEffect)) ||
                tr.effects.some((e) => e.is(unfoldEffect)) ||
                tr.effects.some((e) => e.is(toggleExpandLongString)),
            )
          ) {
            decorations = buildGuides(update.view);
          }
        },
      };
    },
    { decorations: (v) => v.decorations },
  );
}

// 2. Inline Fold Button - Positioned in front of field name or bracket via zero-width anchor
class InlineFoldWidget extends WidgetType {
  constructor(
    readonly isFolded: boolean,
    readonly range: { from: number; to: number },
  ) {
    super();
  }

  toDOM(view: EditorView) {
    const anchor = document.createElement('span');
    anchor.className = 'cm-inline-fold-anchor';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.innerHTML = `<svg viewBox="0 0 16 16" width="11" height="11" stroke="currentColor" stroke-width="1.7" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 3 5 5-5 5"/></svg>`;

    anchor.appendChild(btn);
    this.updateDOM(anchor, view);
    return anchor;
  }

  // Reuse the button so CSS can rotate its arrow and keyboard focus survives folding.
  updateDOM(anchor: HTMLElement, view: EditorView) {
    const btn = anchor.querySelector('button')!;
    btn.className = `cm-inline-fold-btn ${this.isFolded ? 'is-closed' : 'is-open'}`;
    btn.setAttribute('aria-label', this.isFolded ? '展开此层' : '折叠此层');
    btn.setAttribute('aria-expanded', String(!this.isFolded));
    btn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (this.isFolded) {
        view.dispatch({ effects: unfoldEffect.of(this.range) });
      } else {
        view.dispatch({ effects: foldEffect.of(this.range) });
      }
    };

    return true;
  }

  eq(other: InlineFoldWidget) {
    return (
      this.isFolded === other.isFolded &&
      this.range.from === other.range.from &&
      this.range.to === other.range.to
    );
  }

  ignoreEvent() {
    return true;
  }
}

function createInlineFoldPlugin() {
  function buildFoldDecorations(view: EditorView): DecorationSet {
    ensureSyntaxTree(view.state, view.state.doc.length, 250);
    const builder = new RangeSetBuilder<Decoration>();
    let lastLineNumber = -1;

    for (const range of view.visibleRanges) {
      let line = view.state.doc.lineAt(range.from);
      while (true) {
        if (line.number > lastLineNumber) {
          lastLineNumber = line.number;
          const foldRange = foldable(view.state, line.from, line.to);
          if (foldRange) {
            let isFolded = false;
            foldedRanges(view.state).between(foldRange.from, foldRange.to, (from, to) => {
              if (from === foldRange.from && to === foldRange.to) {
                isFolded = true;
                return false;
              }
            });

            // Target the opening bracket { or [ of this foldable structure
            let bracketPos = foldRange.from - 1;
            const targetChar = view.state.doc.sliceString(bracketPos, bracketPos + 1);
            if (targetChar !== '{' && targetChar !== '[') {
              // If not immediately at foldRange.from - 1, scan backward within this line
              let found = -1;
              for (let p = foldRange.from - 1; p >= line.from; p--) {
                const c = view.state.doc.sliceString(p, p + 1);
                if (c === '{' || c === '[') {
                  const nodeName = syntaxTree(view.state).resolve(p, 1).name;
                  if (nodeName !== 'String' && nodeName !== 'PropertyName') {
                    found = p;
                    break;
                  }
                }
              }
              if (found >= 0) bracketPos = found;
            }

            // For object properties (e.g. "data": { or "list": [), place fold button before the property name
            // so the chevron appears in the indent space in front of the field name (> "data": {})
            let targetPos = bracketPos;
            const tree = syntaxTree(view.state);
            const bracketNode = tree.resolveInner(bracketPos, 1);
            let curr: typeof bracketNode | null = bracketNode;
            while (curr && curr.from >= line.from) {
              if (curr.name === 'Property') {
                const propName = curr.getChild('PropertyName');
                if (propName && propName.from >= line.from) {
                  targetPos = propName.from;
                  break;
                }
                targetPos = curr.from;
                break;
              }
              curr = curr.parent;
            }

            builder.add(
              targetPos,
              targetPos,
              Decoration.widget({
                side: -1,
                widget: new InlineFoldWidget(isFolded, foldRange),
              }),
            );
          }
        }
        if (line.to >= range.to) break;
        line = view.state.doc.lineAt(line.to + 1);
      }
    }
    return builder.finish();
  }

  return ViewPlugin.define(
    (view) => {
      let decorations = buildFoldDecorations(view);
      return {
        get decorations() {
          return decorations;
        },
        update(update: ViewUpdate) {
          if (
            update.docChanged ||
            update.viewportChanged ||
            syntaxTree(update.state) !== syntaxTree(update.startState) ||
            update.transactions.some((tr) =>
              tr.effects.some(
                (e) => e.is(foldEffect) || e.is(unfoldEffect) || e.is(toggleExpandLongString),
              ),
            )
          ) {
            decorations = buildFoldDecorations(update.view);
          }
        },
      };
    },
    { decorations: (v) => v.decorations },
  );
}

// 3. Long String Truncation & Interactive Toggle
const toggleExpandLongString = StateEffect.define<number>();

const expandedStringsField = StateField.define<Set<number>>({
  create() {
    return new Set<number>();
  },
  update(value, tr) {
    if (tr.annotation(externalChange)) {
      return new Set<number>();
    }
    let next = value;
    if (tr.docChanged) {
      let replacedWholeDoc = false;
      tr.changes.iterChanges((fromA, toA) => {
        if (fromA === 0 && toA >= tr.startState.doc.length) {
          replacedWholeDoc = true;
        }
      });
      if (replacedWholeDoc) {
        return new Set<number>();
      }
      next = new Set<number>();
      for (const pos of value) {
        next.add(tr.changes.mapPos(pos));
      }
    }
    for (const effect of tr.effects) {
      if (effect.is(toggleExpandLongString)) {
        if (next === value) next = new Set(value);
        if (next.has(effect.value)) {
          next.delete(effect.value);
        } else {
          next.add(effect.value);
        }
      }
    }
    return next;
  },
});

let activeHoverCard: HTMLDivElement | null = null;
let hoverCleanup: (() => void) | null = null;

function hideBase64HoverCard() {
  if (hoverCleanup) {
    hoverCleanup();
    hoverCleanup = null;
  }
  if (activeHoverCard) {
    activeHoverCard.remove();
    activeHoverCard = null;
  }
}

function showBase64HoverCard(anchor: HTMLElement, info: Base64ImageInfo) {
  hideBase64HoverCard();

  const card = document.createElement('div');
  card.className = 'cm-base64-hover-card';

  const viewContainer = document.createElement('div');
  viewContainer.className = 'cm-base64-hover-card__preview';

  const img = document.createElement('img');
  img.src = info.dataUrl;
  img.alt = 'Base64 Preview';

  viewContainer.appendChild(img);
  card.appendChild(viewContainer);

  const footer = document.createElement('div');
  footer.className = 'cm-base64-hover-card__footer';

  const formatTag = document.createElement('span');
  formatTag.className = 'cm-base64-hover-card__tag';
  formatTag.textContent = info.format;
  footer.appendChild(formatTag);

  const metaTag = document.createElement('span');
  metaTag.className = 'cm-base64-hover-card__meta';
  const sizeStr =
    info.approxBytes < 1024
      ? `${info.approxBytes} B`
      : `${(info.approxBytes / 1024).toFixed(1)} KB`;
  metaTag.textContent = sizeStr;
  footer.appendChild(metaTag);

  const hint = document.createElement('span');
  hint.className = 'cm-base64-hover-card__hint';
  hint.textContent = '点击查看大图';
  footer.appendChild(hint);

  document.body.appendChild(card);
  activeHoverCard = card;

  const updatePosition = () => {
    if (!anchor.isConnected || !activeHoverCard) {
      hideBase64HoverCard();
      return;
    }
    const rect = anchor.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();

    let top: number;
    if (rect.top - cardRect.height - 8 > 0) {
      top = rect.top - cardRect.height - 8;
    } else {
      top = rect.bottom + 8;
    }

    let left = rect.left + rect.width / 2 - cardRect.width / 2;
    if (left + cardRect.width > window.innerWidth - 12) {
      left = window.innerWidth - cardRect.width - 12;
    }
    if (left < 12) {
      left = 12;
    }

    card.style.top = `${Math.round(top)}px`;
    card.style.left = `${Math.round(left)}px`;
  };

  updatePosition();
  img.onload = () => {
    updatePosition();
  };

  const onScrollOrResize = () => hideBase64HoverCard();
  window.addEventListener('scroll', onScrollOrResize, { passive: true, capture: true });
  window.addEventListener('resize', onScrollOrResize, { passive: true });

  hoverCleanup = () => {
    window.removeEventListener('scroll', onScrollOrResize, true);
    window.removeEventListener('resize', onScrollOrResize);
  };
}

function createBase64Chip(
  view: EditorView,
  imageInfo: Base64ImageInfo,
  onPreview?: (image: Base64ImageInfo) => void,
): HTMLElement {
  const chip = document.createElement('button');
  chip.type = 'button';
  chip.className = 'cm-base64-chip';
  chip.title = `点击查看图片 (${imageInfo.format})`;
  chip.setAttribute('aria-label', `查看图片 (${imageInfo.format})`);
  chip.innerHTML = `
    <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  `;

  chip.onmouseenter = () => {
    showBase64HoverCard(chip, imageInfo);
  };
  chip.onmouseleave = () => {
    hideBase64HoverCard();
  };

  chip.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    hideBase64HoverCard();
    if (onPreview) {
      onPreview(imageInfo);
    } else {
      view.dom.dispatchEvent(
        new CustomEvent('preview-base64-image', {
          bubbles: true,
          detail: imageInfo,
        }),
      );
    }
  };

  return chip;
}

class LongStringStartToggleWidget extends WidgetType {
  constructor(
    readonly strPos: number,
    readonly rawLength: number,
    readonly imageInfo?: Base64ImageInfo,
    readonly onPreview?: (image: Base64ImageInfo) => void,
  ) {
    super();
  }

  toDOM(view: EditorView) {
    const wrap = document.createElement('span');
    wrap.className = 'cm-long-string-box';

    if (this.imageInfo) {
      wrap.appendChild(createBase64Chip(view, this.imageInfo, this.onPreview));
    }

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'cm-long-string-toggle is-expanded';
    btn.setAttribute('aria-label', '收起长文本');
    btn.setAttribute('title', `收起长文本 (${this.rawLength} 字符)`);
    btn.innerHTML = `<svg viewBox="0 0 24 24" width="11" height="11" stroke="currentColor" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 6 15 12 9 18"></polyline></svg>`;

    btn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      view.dispatch({ effects: toggleExpandLongString.of(this.strPos) });
    };
    wrap.appendChild(btn);
    return wrap;
  }

  eq(other: LongStringStartToggleWidget) {
    return (
      this.strPos === other.strPos &&
      this.rawLength === other.rawLength &&
      this.imageInfo?.dataUrl === other.imageInfo?.dataUrl
    );
  }

  ignoreEvent() {
    return true;
  }
}

class LongStringEndToggleWidget extends WidgetType {
  constructor(
    readonly strPos: number,
    readonly rawLength: number,
  ) {
    super();
  }

  toDOM(view: EditorView) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'cm-long-string-toggle is-expanded';
    btn.setAttribute('aria-label', '收起长文本');
    btn.setAttribute('title', `收起长文本 (${this.rawLength} 字符)`);
    btn.innerHTML = `<svg viewBox="0 0 24 24" width="11" height="11" stroke="currentColor" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 6 15 12 9 18"></polyline></svg>`;

    btn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      view.dispatch({ effects: toggleExpandLongString.of(this.strPos) });
    };
    return btn;
  }

  eq(other: LongStringEndToggleWidget) {
    return this.strPos === other.strPos && this.rawLength === other.rawLength;
  }

  ignoreEvent() {
    return true;
  }
}

class TruncatedStringBoxWidget extends WidgetType {
  constructor(
    readonly previewText: string,
    readonly strPos: number,
    readonly rawLength: number,
    readonly hasComma: boolean,
    readonly imageInfo?: Base64ImageInfo,
    readonly onPreview?: (image: Base64ImageInfo) => void,
  ) {
    super();
  }

  toDOM(view: EditorView) {
    const wrap = document.createElement('span');
    wrap.className = 'cm-long-string-box';

    if (this.imageInfo) {
      wrap.appendChild(createBase64Chip(view, this.imageInfo, this.onPreview));
    }

    const textSpan = document.createElement('span');
    textSpan.className = 'cm-long-string-truncated';
    textSpan.textContent = this.hasComma ? `${this.previewText},` : this.previewText;
    textSpan.title = this.imageInfo ? '长字符串已折叠，点击展开' : '长字符串已折叠，点击展开';
    textSpan.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      view.dispatch({ effects: toggleExpandLongString.of(this.strPos) });
    };

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'cm-long-string-toggle is-collapsed';
    btn.setAttribute('aria-label', '展开长文本');
    btn.setAttribute('title', `展开长文本 (${this.rawLength} 字符)`);
    btn.innerHTML = `<svg viewBox="0 0 24 24" width="11" height="11" stroke="currentColor" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 6 15 12 9 18"></polyline></svg>`;
    btn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      view.dispatch({ effects: toggleExpandLongString.of(this.strPos) });
    };

    wrap.appendChild(textSpan);
    wrap.appendChild(btn);
    return wrap;
  }

  eq(other: TruncatedStringBoxWidget) {
    return (
      this.previewText === other.previewText &&
      this.strPos === other.strPos &&
      this.rawLength === other.rawLength &&
      this.hasComma === other.hasComma &&
      this.imageInfo?.dataUrl === other.imageInfo?.dataUrl
    );
  }

  ignoreEvent() {
    return true;
  }
}

function createLongStringPlugin(
  shouldTruncate: () => boolean,
  shouldDefaultExpand: () => boolean,
  getOnPreviewImage?: () => ((image: Base64ImageInfo) => void) | undefined,
) {
  const imageCache = new Map<string, Base64ImageInfo | null>();

  function buildLongStringDecorations(view: EditorView): DecorationSet {
    if (!shouldTruncate()) return Decoration.none;
    const maxVisibleTo = view.visibleRanges.reduce((max, r) => Math.max(max, r.to), 0);
    ensureSyntaxTree(view.state, Math.min(view.state.doc.length, maxVisibleTo + 50000), 100);
    const tree = syntaxTree(view.state);
    if (tree.topNode.name !== 'JsonText') return Decoration.none;

    const builder = new RangeSetBuilder<Decoration>();
    const toggledSet = view.state.field(expandedStringsField);
    const defaultExpanded = shouldDefaultExpand();
    const visited = new Set<number>();
    let lastAddedFrom = -1;

    for (const { from, to } of view.visibleRanges) {
      tree.iterate({
        from,
        to,
        enter(node) {
          if (node.name === 'String') {
            if (visited.has(node.from)) return;
            visited.add(node.from);

            // Defensively guarantee monotonic increasing order for RangeSetBuilder
            if (node.from < lastAddedFrom) return;

            // Skip PropertyName
            if (node.node.parent?.name === 'Property') {
              const propName = node.node.parent.getChild('PropertyName');
              if (propName && propName.from === node.from) return;
            }

            const rawLen = node.to - node.from;
            if (rawLen > 45) {
              // Fast prefix and suffix check
              const head = view.state.doc.sliceString(
                node.from,
                Math.min(node.to, node.from + 120),
              );
              const tail = view.state.doc.sliceString(Math.max(node.from, node.to - 30), node.to);

              let keyPath = 'image';
              if (node.node.parent?.name === 'Property') {
                const propName = node.node.parent.getChild('PropertyName');
                if (propName) {
                  keyPath = view.state.doc
                    .sliceString(propName.from, propName.to)
                    .replace(/^"|"$/g, '');
                }
              }

              // Content-aware cache key incorporating position, length, and head/tail digests
              const cacheKey = `${node.from}:${rawLen}:${head.slice(0, 40)}:${tail}`;
              let imageInfo: Base64ImageInfo | undefined;
              if (imageCache.has(cacheKey)) {
                imageInfo = imageCache.get(cacheKey) ?? undefined;
              } else {
                if (isPossibleBase64Prefix(head)) {
                  const fullRaw = view.state.doc.sliceString(node.from, node.to);
                  const unquoted =
                    fullRaw.startsWith('"') && fullRaw.endsWith('"')
                      ? fullRaw.slice(1, -1)
                      : fullRaw;
                  imageInfo = detectBase64Image(unquoted, keyPath) ?? undefined;
                  if (imageCache.size > 1000) imageCache.clear();
                  imageCache.set(cacheKey, imageInfo ?? null);
                } else {
                  if (imageCache.size > 1000) imageCache.clear();
                  imageCache.set(cacheKey, null);
                }
              }

              const isToggled = toggledSet.has(node.from);
              // Base64 images default to collapsed to prevent lag
              const isExpanded = imageInfo ? isToggled : defaultExpanded ? !isToggled : isToggled;

              const hasComma = view.state.doc.sliceString(node.to, node.to + 1) === ',';
              const togglePos = hasComma ? node.to + 1 : node.to;

              if (!isExpanded) {
                const prefix = head.slice(0, 10);
                const suffix = tail.slice(-4);
                const preview = `${prefix}...${suffix}`;

                builder.add(
                  node.from,
                  togglePos,
                  Decoration.replace({
                    widget: new TruncatedStringBoxWidget(
                      preview,
                      node.from,
                      rawLen,
                      hasComma,
                      imageInfo,
                      getOnPreviewImage?.(),
                    ),
                  }),
                );
                lastAddedFrom = node.from;
              } else {
                // At start of string: render image chip (if image) and collapse button
                builder.add(
                  node.from,
                  node.from,
                  Decoration.widget({
                    side: -1,
                    widget: new LongStringStartToggleWidget(
                      node.from,
                      rawLen,
                      imageInfo,
                      getOnPreviewImage?.(),
                    ),
                  }),
                );
                lastAddedFrom = node.from;

                // At end of string: render ONLY collapse button (no duplicate image icon)
                builder.add(
                  togglePos,
                  togglePos,
                  Decoration.widget({
                    side: 1,
                    widget: new LongStringEndToggleWidget(node.from, rawLen),
                  }),
                );
                lastAddedFrom = togglePos;
              }
            }
          }
        },
      });
    }

    return builder.finish();
  }

  return ViewPlugin.define(
    (view) => {
      let decorations = buildLongStringDecorations(view);
      return {
        get decorations() {
          return decorations;
        },
        update(update: ViewUpdate) {
          if (update.docChanged) {
            imageCache.clear();
          }
          if (
            update.docChanged ||
            update.viewportChanged ||
            syntaxTree(update.state) !== syntaxTree(update.startState) ||
            update.transactions.some((tr) => tr.effects.some((e) => e.is(toggleExpandLongString)))
          ) {
            decorations = buildLongStringDecorations(update.view);
          }
        },
      };
    },
    { decorations: (v) => v.decorations },
  );
}

// 4. Resolve Field Path from CodeMirror AST
function getJsonFieldPath(
  state: EditorState,
  position: number,
  bias: -1 | 1 = -1,
): Array<string | number> | undefined {
  const tree = syntaxTree(state);
  if (tree.topNode.name !== 'JsonText') return undefined;
  const field = tree.resolveInner(position, bias);
  const path: Array<string | number> = [];
  const valueNodes = new Set(['Object', 'Array', 'String', 'Number', 'True', 'False', 'Null']);

  for (let node: typeof field | null = field; node; node = node.parent) {
    if (node.name === 'Property') {
      const key = node.getChild('PropertyName');
      if (!key) return undefined;
      try {
        path.unshift(JSON.parse(state.doc.sliceString(key.from, key.to)) as string);
      } catch {
        return undefined;
      }
    } else if (node.parent?.name === 'Array') {
      let index = 0;
      for (let sibling = node.prevSibling; sibling; sibling = sibling.prevSibling) {
        if (valueNodes.has(sibling.name)) index += 1;
      }
      path.unshift(index);
    }
  }
  return path;
}

function getNestedValue(root: unknown, path: Array<string | number>): unknown {
  let curr = root;
  for (const key of path) {
    if (curr == null || typeof curr !== 'object') return undefined;
    curr = (curr as Record<string | number, unknown>)[key];
  }
  return curr;
}

/** Inline trigger for the existing JSON enum completion menu. */
class EnumPickerWidget extends WidgetType {
  /**
   * Creates a trigger anchored after a JSON value.
   * @param position End offset of the value to replace.
   * @returns A widget that leaves the JSON source unchanged.
   */
  constructor(readonly position: number) {
    super();
  }

  /**
   * Creates the dropdown button and opens completion at its value.
   * @param view Editor owning the value and completion history.
   * @returns An accessible inline dropdown button.
   */
  toDOM(view: EditorView) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'cm-enum-picker';
    button.title = '选择枚举值';
    button.setAttribute('aria-label', '选择枚举值');
    button.setAttribute('aria-haspopup', 'listbox');
    button.innerHTML =
      '<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>';
    button.onmousedown = (event) => event.preventDefault();
    button.onclick = (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (view.state.readOnly) return;
      view.dispatch({ selection: { anchor: this.position } });
      view.focus();
      startCompletion(view);
    };
    return button;
  }
}

/**
 * Adds dropdown triggers only to visible editable JSON values with enum choices.
 * @param getOptions Resolves enum choices for a source field path.
 * @returns A viewport decoration plugin; no source text is inserted.
 */
function createEnumPickerPlugin(getOptions: NonNullable<CodeEditorProps['getFieldOptions']>) {
  /**
   * Builds inline triggers for the current viewport.
   * @param view Editor providing syntax nodes, visible ranges and source text.
   * @returns Ordered enum trigger decorations, or none for non-editable JSON.
   */
  const build = (view: EditorView): DecorationSet => {
    const tree = syntaxTree(view.state);
    if (view.state.readOnly || tree.topNode.name !== 'JsonText') return Decoration.none;
    const source = view.state.doc.toString();
    const decorations: Array<ReturnType<Decoration['range']>> = [];
    const positions = new Set<number>();
    for (const range of view.visibleRanges) {
      tree.iterate({
        from: range.from,
        to: range.to,
        enter(node) {
          if (!['String', 'Number', 'True', 'False', 'Null'].includes(node.name)) return;
          if (positions.has(node.to)) return;
          const path = getJsonFieldPath(view.state, node.from + 1);
          if (!path || !getOptions(path, source).length) return;
          positions.add(node.to);
          decorations.push(
            Decoration.widget({ widget: new EnumPickerWidget(node.to), side: 1 }).range(node.to),
          );
        },
      });
    }
    return Decoration.set(decorations, true);
  };
  return ViewPlugin.define(
    (view) => ({
      decorations: build(view),
      /**
       * Refreshes triggers when visible JSON values or editability change.
       * @param update Editor transaction and viewport changes.
       * @returns Nothing; updates the plugin's decorations in place.
       */
      update(update: ViewUpdate) {
        if (
          update.docChanged ||
          update.viewportChanged ||
          update.state.readOnly !== update.startState.readOnly ||
          syntaxTree(update.state) !== syntaxTree(update.startState)
        )
          this.decorations = build(update.view);
      },
    }),
    { decorations: (plugin) => plugin.decorations },
  );
}

// 5. Description & Enum Metadata Annotations
class DescWidget extends WidgetType {
  /** Captures non-editable schema annotations for one field.
   * @param text Field description.
   * @param typeName Declared or inferred JSON type.
   * @param enums Available values, if any.
   * @param onOpenEnum Opens the existing enum definition popover.
   * @returns An annotation widget that never modifies source text.
   */
  constructor(
    readonly text: string,
    readonly typeName: string,
    readonly enums: CodeEditorEnumItem[] | undefined,
    readonly onOpenEnum: (enums: CodeEditorEnumItem[], anchorEl: HTMLElement) => void,
  ) {
    super();
  }

  /** Renders a plain comment with an optional enum arrow.
   * @param None.
   * @returns Inline annotation DOM supporting natural wrapping.
   */
  toDOM() {
    const span = document.createElement('span');
    span.className = 'cm-inline-desc';
    span.append(document.createTextNode(' // '));
    span.style.textIndent = '0';
    if (this.text && this.text.trim()) {
      span.setAttribute('title', this.text.trim());
    }

    if (this.typeName) {
      const typeEl = document.createElement('span');
      typeEl.className = 'cm-inline-desc-type';
      typeEl.dataset.type = this.typeName;
      typeEl.textContent = this.typeName;
      span.appendChild(typeEl);
      span.append(document.createTextNode(' '));
    }

    const showText = Boolean(
      this.text &&
      this.text.trim() &&
      (!this.typeName || this.text.trim().toLowerCase() !== this.typeName.trim().toLowerCase()),
    );

    if (showText) {
      const textEl = document.createElement('span');
      textEl.className = 'cm-inline-desc-text';
      textEl.textContent = this.text.trim();
      textEl.setAttribute('title', this.text.trim());
      span.appendChild(textEl);
    }

    if (this.enums && this.enums.length > 0) {
      const enumBtn = document.createElement('button');
      enumBtn.type = 'button';
      enumBtn.className = 'cm-enum-trigger-btn';
      enumBtn.setAttribute('aria-label', '查看可选值');
      enumBtn.setAttribute('aria-haspopup', 'dialog');
      enumBtn.innerHTML =
        '<svg viewBox="0 0 16 16" width="10" height="10" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="m4 6 4 4 4-4"/></svg>';
      enumBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.onOpenEnum(this.enums!, enumBtn);
      };
      span.appendChild(enumBtn);
    }

    return span;
  }

  /** Reuses unchanged annotation DOM.
   * @param other Incoming description widget.
   * @returns Whether its metadata is unchanged.
   */
  eq(other: DescWidget) {
    return (
      this.text === other.text &&
      this.typeName === other.typeName &&
      this.enums === other.enums &&
      this.onOpenEnum === other.onOpenEnum
    );
  }

  /** Leaves annotation interactions outside editable JSON.
   * @param None.
   * @returns True for widget-owned events.
   */
  ignoreEvent() {
    return true;
  }
}

function createDescriptionPlugin(
  getMeta:
    ((path: Array<string | number>, source: string) => CodeEditorFieldMeta | undefined) | undefined,
  getDescription: ((path: Array<string | number>, source: string) => string) | undefined,
  onOpenEnumModal: (info: {
    fieldName: string;
    path: string;
    enums: CodeEditorEnumItem[];
    currentValue?: unknown;
    anchorRect: DOMRect;
  }) => void,
) {
  let lastDocStr = '';
  let lastParsed: unknown = undefined;

  function getParsed(docStr: string) {
    if (docStr === lastDocStr) return lastParsed;
    lastDocStr = docStr;
    try {
      lastParsed = JSON.parse(docStr);
    } catch {
      lastParsed = undefined;
    }
    return lastParsed;
  }

  function buildDescDecorations(view: EditorView): DecorationSet {
    if (!getMeta && !getDescription) return Decoration.none;
    const builder = new RangeSetBuilder<Decoration>();
    const tree = syntaxTree(view.state);
    if (tree.topNode.name !== 'JsonText') return Decoration.none;

    const docStr = view.state.doc.toString();
    const parsed = getParsed(docStr);

    let lastPos = -1;

    for (const range of view.visibleRanges) {
      let skipUntilPos = -1;
      tree.iterate({
        from: range.from,
        to: range.to,
        enter(node) {
          if (skipUntilPos >= 0 && node.to <= skipUntilPos) {
            return false;
          }
          if (node.name === 'Property') {
            const keyNode = node.node.getChild('PropertyName');
            if (!keyNode) return;
            const path = getJsonFieldPath(view.state, keyNode.from + 1, 1);
            if (!path || path.length === 0) return;

            const meta = getMeta ? getMeta(path, docStr) : undefined;
            const desc = meta?.description || (getDescription ? getDescription(path, docStr) : '');
            if (!desc && !meta) return;

            const line = view.state.doc.lineAt(keyNode.from);
            let targetPos = line.to;

            const foldRange = foldable(view.state, line.from, line.to);
            let isFolded = false;
            if (foldRange) {
              foldedRanges(view.state).between(foldRange.from, foldRange.to, (from, to) => {
                if (from === foldRange.from && to === foldRange.to) {
                  isFolded = true;
                  return false;
                }
              });
              if (isFolded) {
                const docLen = view.state.doc.length;
                let closePos = foldRange.to;
                if (closePos < docLen) {
                  const ch = view.state.doc.sliceString(closePos, closePos + 1);
                  if (ch === '}' || ch === ']') {
                    closePos += 1;
                  }
                }
                if (
                  closePos < docLen &&
                  view.state.doc.sliceString(closePos, closePos + 1) === ','
                ) {
                  closePos += 1;
                }
                targetPos = closePos;
                skipUntilPos = closePos;
              }
            }

            if (targetPos > lastPos) {
              lastPos = targetPos;
              const fieldName = String(path[path.length - 1]);
              const keyPath = path.join('.');
              const currentValue = getNestedValue(parsed, path);

              builder.add(
                targetPos,
                targetPos,
                Decoration.widget({
                  side: 1,
                  widget: new DescWidget(desc, meta?.type || '', meta?.enums, (enums, anchorEl) =>
                    onOpenEnumModal({
                      fieldName,
                      path: keyPath,
                      enums,
                      currentValue,
                      anchorRect: anchorEl.getBoundingClientRect(),
                    }),
                  ),
                }),
              );
            }

            if (isFolded) {
              return false;
            }
          }
        },
      });
    }

    return builder.finish();
  }

  return ViewPlugin.define(
    (view) => {
      let decorations = buildDescDecorations(view);
      return {
        get decorations() {
          return decorations;
        },
        update(update: ViewUpdate) {
          if (
            update.docChanged ||
            update.viewportChanged ||
            syntaxTree(update.state) !== syntaxTree(update.startState) ||
            update.transactions.some((tr) =>
              tr.effects.some(
                (e) => e.is(foldEffect) || e.is(unfoldEffect) || e.is(toggleExpandLongString),
              ),
            )
          ) {
            decorations = buildDescDecorations(update.view);
          }
        },
      };
    },
    { decorations: (v) => v.decorations },
  );
}

/**
 * Detects structured raw content without requiring incomplete editor text to parse successfully.
 */
function getSourceLanguage(value: string, language: CodeEditorLanguage): CodeEditorLanguage {
  if (language !== 'text') return language;
  if (/^\s*</u.test(value)) return 'xml';
  return /^\s*(?:[[{"\d-]|true\b|false\b|null\b)/u.test(value) ? 'json' : 'text';
}

interface ActiveEnumDialog {
  fieldName: string;
  path: string;
  enums: CodeEditorEnumItem[];
  currentValue?: unknown;
  anchorRect: DOMRect;
}

interface HoverTooltipInfo {
  name: string;
  path: string;
  type: string;
  description: string;
  required?: boolean;
  enums?: CodeEditorEnumItem[];
  currentValue?: unknown;
  x: number;
  y: number;
}

/**
 * Anchored Enum Popover (positioned directly next to the trigger button)
 */
function EnumPopover({
  dialog,
  onClose,
}: {
  dialog: ActiveEnumDialog | null;
  onClose: () => void;
}) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const notify = useNotification();

  useEffect(() => {
    if (!dialog) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    const handleScrollOrResize = (event: Event) => {
      if (popoverRef.current && popoverRef.current.contains(event.target as Node)) return;
      onClose();
    };

    window.addEventListener('pointerdown', handlePointerDown, true);
    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize, true);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown, true);
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize, true);
    };
  }, [dialog, onClose]);

  const [coords, setCoords] = useState<{ top: number; left: number; maxHeight: number }>({
    top: -9999,
    left: -9999,
    maxHeight: 280,
  });

  useLayoutEffect(() => {
    if (!dialog || !popoverRef.current) return;

    const { anchorRect } = dialog;
    const el = popoverRef.current;
    const actualWidth = el.offsetWidth || 220;
    const actualHeight = el.offsetHeight || 160;

    let left = anchorRect.left;
    if (left + actualWidth > window.innerWidth - 12) {
      left = Math.max(12, window.innerWidth - actualWidth - 12);
    }
    left = Math.max(12, left);

    const spaceBelow = window.innerHeight - anchorRect.bottom - 12;
    const spaceAbove = anchorRect.top - 12;
    const showAbove = spaceBelow < actualHeight && spaceAbove > spaceBelow;

    let top: number;
    let maxH: number;

    if (showAbove) {
      maxH = Math.max(120, spaceAbove - 6);
      const renderHeight = Math.min(actualHeight, maxH);
      top = Math.max(12, anchorRect.top - renderHeight - 6);
    } else {
      maxH = Math.max(120, spaceBelow);
      const renderHeight = Math.min(actualHeight, maxH);
      top = anchorRect.bottom + 6;
      if (top + renderHeight > window.innerHeight - 12) {
        top = Math.max(12, window.innerHeight - renderHeight - 12);
      }
    }

    setCoords({
      top: Math.round(top),
      left: Math.round(left),
      maxHeight: Math.round(maxH),
    });
  }, [dialog]);

  if (!dialog) return null;

  const style: React.CSSProperties = {
    top: `${coords.top}px`,
    left: `${coords.left}px`,
    maxHeight: `${coords.maxHeight}px`,
    visibility: coords.top === -9999 ? 'hidden' : 'visible',
  };

  return createPortal(
    <div
      ref={popoverRef}
      className="cm-enum-popover"
      style={style}
      role="dialog"
      aria-label={`${dialog.fieldName} 枚举定义`}
    >
      <header className="cm-enum-popover__header">
        <div className="cm-enum-popover__title">
          <span className="cm-enum-popover__name" title={dialog.fieldName}>
            {dialog.fieldName}
          </span>
        </div>
        <button
          type="button"
          className="cm-enum-popover__close"
          onClick={onClose}
          aria-label="关闭枚举列表"
        >
          ✕
        </button>
      </header>

      {dialog.path && (
        <div className="cm-enum-popover__path" title={dialog.path}>
          路径: <code>{dialog.path}</code>
        </div>
      )}

      <div className="cm-enum-popover__list">
        {dialog.enums.map((item, idx) => {
          const isCur =
            dialog.currentValue !== undefined && String(item.value) === String(dialog.currentValue);
          return (
            <div key={idx} className="cm-enum-popover__item">
              <div className="cm-enum-popover__item-val-box">
                <button
                  type="button"
                  className="cm-enum-popover__item-label"
                  onClick={async () => {
                    try {
                      const text = JSON.stringify(item.value);
                      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
                      else {
                        const textarea = document.createElement('textarea');
                        textarea.value = text;
                        textarea.style.cssText = 'position:fixed;opacity:0';
                        (popoverRef.current?.closest('dialog') ?? document.body).append(textarea);
                        try {
                          textarea.select();
                          if (!document.execCommand('copy')) throw new Error('copy');
                        } finally {
                          textarea.remove();
                        }
                      }
                      notify('枚举值已复制');
                      onClose();
                    } catch {
                      notify('复制失败，请手动复制');
                    }
                  }}
                  title={
                    item.description
                      ? `${String(item.value)} - ${item.description}`
                      : String(item.value)
                  }
                >
                  <code className="cm-enum-popover__item-code">{String(item.value)}</code>
                  {item.description ? ` - ${item.description}` : ''}
                </button>
                {isCur && <span className="cm-enum-popover__item-tag">当前值</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>,
    document.body,
  );
}

/**
 * Floating Tooltip for JSON field hovering
 */
function FloatingTooltip({ info }: { info: HoverTooltipInfo | null }) {
  if (!info) return null;

  const style: React.CSSProperties = {
    left: `${Math.min(window.innerWidth - 400, Math.max(16, info.x + 14))}px`,
    top: `${info.y + 18}px`,
  };

  return (
    <div className="source-editor-field-tooltip" style={style}>
      <div className="source-editor-field-tooltip__header">
        <div className="source-editor-field-tooltip__title">{info.name}</div>
        <div className="source-editor-field-tooltip__badges">
          <span className="source-editor-field-tooltip__type schema-type" data-type={info.type}>
            {info.type}
          </span>
          {info.required !== undefined && (
            <span
              className={
                info.required
                  ? 'source-editor-field-tooltip__required'
                  : 'source-editor-field-tooltip__optional'
              }
            >
              {info.required ? '必填' : '可选'}
            </span>
          )}
        </div>
      </div>
      {info.description && (
        <div className="source-editor-field-tooltip__desc">{info.description}</div>
      )}
      {info.enums && info.enums.length > 0 && (
        <div className="source-editor-field-tooltip__enums">
          <div className="source-editor-field-tooltip__enums-title">
            枚举定义 ({info.enums.length} 项):
          </div>
          {info.enums.slice(0, 4).map((item, idx) => {
            const isCur =
              info.currentValue !== undefined && String(item.value) === String(info.currentValue);
            return (
              <div
                key={idx}
                className={`source-editor-field-tooltip__enum-row ${isCur ? 'is-current' : ''}`}
              >
                <code>{String(item.value)}</code>
                {item.description && <span>- {item.description}</span>}
              </div>
            );
          })}
          {info.enums.length > 4 && (
            <div style={{ color: 'var(--cm-desc-text)', fontSize: '10.5px', marginTop: '2px' }}>
              ...共 {info.enums.length} 项 (行末提供完整枚举弹窗)
            </div>
          )}
        </div>
      )}
      <div className="source-editor-field-tooltip__extra">
        路径: <code>{info.path}</code>
      </div>
    </div>
  );
}

/**
 * Unified Modern CodeEditor with continuous tree-branch guides, elbow hooks (└─),
 * inline fold chevron buttons, long string truncation, and rich enum metadata.
 */
export function CodeEditor(props: CodeEditorProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const propsRef = useRef(props);
  const syntaxRef = useRef(new Compartment());
  const attributesRef = useRef(new Compartment());
  const accessRef = useRef(new Compartment());
  const annotationsRef = useRef(new Compartment());
  const annotationVisibilityRef = useRef(props.showAnnotations);
  const enumPickerRef = useRef(new Compartment());
  const lineNumbersRef = useRef(new Compartment());
  const [copySelection, setCopySelection] = useState<JsonNodeSelection | null>(null);
  const closeCopyMenu = useCallback(() => setCopySelection(null), []);
  useEffect(closeCopyMenu, [props.value, props.showAnnotations, closeCopyMenu]);
  const [tooltipInfo, setTooltipInfo] = useState<HoverTooltipInfo | null>(null);
  const [activeEnumDialog, setActiveEnumDialog] = useState<ActiveEnumDialog | null>(null);
  useEffect(() => setActiveEnumDialog(null), [props.value, props.showAnnotations]);
  const [internalPreviewImage, setInternalPreviewImage] = useState<Base64ImageInfo | null>(null);
  const syntax = getSourceLanguage(props.value, props.language);
  const label =
    props.ariaLabel || `${props.language === 'text' ? 'raw' : props.language.toUpperCase()} 请求体`;

  const handlePreviewImage = useCallback((img: Base64ImageInfo) => {
    if (propsRef.current.onPreviewImage) {
      propsRef.current.onPreviewImage(img);
    } else {
      setInternalPreviewImage(img);
    }
  }, []);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const onPreviewEvent = (e: Event) => {
      const detail = (e as CustomEvent<Base64ImageInfo>).detail;
      if (detail) {
        handlePreviewImage(detail);
      }
    };
    el.addEventListener('preview-base64-image', onPreviewEvent);
    return () => el.removeEventListener('preview-base64-image', onPreviewEvent);
  }, [handlePreviewImage]);

  useLayoutEffect(() => {
    propsRef.current = props;
  });

  useLayoutEffect(() => {
    if (!hostRef.current) return;
    const initial = propsRef.current;
    const initialSyntax = getSourceLanguage(initial.value, initial.language);

    const completeEnums = (context: CompletionContext) => {
      if (context.state.readOnly) return null;
      const getOptions = propsRef.current.getFieldOptions;
      const getMeta = propsRef.current.getFieldMeta;
      const tree = syntaxTree(context.state);
      if (tree.topNode.name !== 'JsonText') return null;
      const node = tree.resolveInner(context.pos, -1);
      if (node.name === 'PropertyName') return null;
      let from = context.pos,
        to = context.pos;
      let path: Array<string | number> | undefined;
      if (['String', 'Number', 'True', 'False', 'Null'].includes(node.name)) {
        from = node.from;
        to = node.to;
        path = getJsonFieldPath(context.state, Math.min(node.to, node.from + 1));
      } else {
        let property = node;
        while (property.parent && property.name !== 'Property') property = property.parent;
        const key = property.name === 'Property' ? property.getChild('PropertyName') : null;
        if (!key || context.pos <= key.to) return null;
        path = getJsonFieldPath(context.state, key.from + 1);
      }
      if (!path) return null;

      const docStr = context.state.doc.toString();
      const meta = getMeta?.(path, docStr);
      const options = getOptions?.(path, docStr) || meta?.enums || [];
      const valueType =
        meta?.type || [...new Set(options.map((item) => typeof item.value))].join(' | ');
      const section = {
        name: '选择枚举值',
        /**
         * Renders the enum menu heading and schema type badge.
         * @param None; uses the current field's resolved enum type.
         * @returns A non-selectable completion section heading.
         */
        header: () => {
          const heading = document.createElement('completion-section');
          heading.className = 'source-editor__enum-heading';
          const title = document.createElement('span');
          title.className = 'source-editor__enum-heading-title';
          title.textContent = '选择枚举值';
          heading.appendChild(title);
          if (valueType) {
            const badge = document.createElement('span');
            badge.className = 'source-editor__enum-type schema-type';
            badge.dataset.type = valueType;
            badge.textContent = valueType;
            heading.appendChild(badge);
          }
          return heading;
        },
      };

      return options.length
        ? {
            from,
            to,
            filter: false,
            options: options.map((item) => ({
              label: JSON.stringify(item.value),
              displayLabel: String(item.value),
              detail: item.description,
              type: 'enum',
              section,
            })),
          }
        : null;
    };

    const isJson = initialSyntax === 'json';
    const layoutMotion = createEditorLayoutMotion(
      (tr) =>
        tr.annotation(editorLayoutChange) === true ||
        tr.effects.some(
          (effect) =>
            effect.is(foldEffect) || effect.is(unfoldEffect) || effect.is(toggleExpandLongString),
        ),
    );

    const view = new EditorView({
      parent: hostRef.current,
      dispatchTransactions: layoutMotion.dispatchTransactions,
      state: EditorState.create({
        doc: initial.value,
        extensions: [
          accessRef.current.of([
            EditorState.readOnly.of(Boolean(initial.readOnly)),
            EditorView.editable.of(!initial.readOnly),
          ]),
          syntaxRef.current.of(
            initialSyntax === 'json' ? json() : initialSyntax === 'xml' ? xml() : [],
          ),
          attributesRef.current.of(
            EditorView.contentAttributes.of({
              'aria-label': initial.ariaLabel || '请求体源码',
              spellcheck: 'false',
              autocorrect: 'off',
              autocapitalize: 'off',
            }),
          ),
          history(),
          drawSelection(),
          bracketMatching(),
          EditorView.lineWrapping,
          codeFolding({ placeholderText: '…' }),
          lineNumbersRef.current.of((initial.lineNumbers ?? !isJson) ? lineNumbers() : []),
          jsonNodeControls(setCopySelection),
          // JSON-specific advanced plugins
          pairedScopeField,
          hoveredLineField,
          jsonHoverBackground,
          jsonHoverTracking,
          isJson ? expandedStringsField : [],
          isJson ? createIndentGuidePlugin() : [],
          isJson ? createInlineFoldPlugin() : [],
          isJson
            ? createLongStringPlugin(
                () => Boolean(propsRef.current.truncateLongStrings),
                () => Boolean(propsRef.current.defaultExpandLongStrings),
                () => handlePreviewImage,
              )
            : [],
          annotationsRef.current.of(
            isJson && initial.showAnnotations
              ? createDescriptionPlugin(initial.getFieldMeta, initial.getFieldDescription, (info) =>
                  setActiveEnumDialog(info),
                )
              : [],
          ),
          syntaxHighlighting(sourceHighlight),
          enumPickerRef.current.of([]),
          autocompletion({
            override: [completeEnums],
            icons: false,
            selectOnOpen: false,
            tooltipClass: () => 'source-editor__completions',
            addToOptions: [
              {
                position: 60,
                /**
                 * Separates enum values from their optional descriptions.
                 * @param completion Enum option currently being rendered.
                 * @returns A separator, or null for options without descriptions.
                 */
                render(completion) {
                  if (!completion.detail) return null;
                  const separator = document.createElement('span');
                  separator.className = 'source-editor__enum-separator';
                  separator.textContent = '-';
                  return separator;
                },
              },
            ],
          }),
          EditorState.phrases.of({
            'Fold line': '折叠此层',
            'Unfold line': '展开此层',
            unfold: '展开内容',
            'folded code': '已折叠内容',
          }),
          keymap.of([
            ...completionKeymap,
            ...defaultKeymap.filter((binding) => binding.key !== 'Mod-Enter'),
            ...historyKeymap,
            ...foldKeymap,
            indentWithTab,
          ]),
          EditorView.updateListener.of((update) => {
            if (update.docChanged || update.selectionSet || update.viewportChanged) {
              setTooltipInfo(null);
            }
            if (
              update.docChanged &&
              !update.transactions.some((transaction) => transaction.annotation(externalChange))
            ) {
              propsRef.current.onChange?.(update.state.doc.toString());
            }
          }),
          EditorView.domEventHandlers({
            /**
             * Opens enum suggestions for a clicked JSON value without changing the layout.
             * @param event Mouse click used to exclude selection and modified clicks.
             * @param editor Active editor supplying the cursor position and JSON syntax tree.
             * @returns False to preserve the editor's native click behavior.
             */
            click(event, editor) {
              if (
                editor.state.readOnly ||
                (!propsRef.current.getFieldOptions && !propsRef.current.getFieldMeta) ||
                event.button !== 0 ||
                event.detail !== 1 ||
                event.shiftKey ||
                event.ctrlKey ||
                event.metaKey ||
                event.altKey ||
                !editor.state.selection.main.empty ||
                editor.state.selection.ranges.length !== 1 ||
                !editor.contentDOM.contains(event.target as Node)
              )
                return false;

              const tree = syntaxTree(editor.state);
              if (tree.topNode.name !== 'JsonText') return false;
              const node = tree.resolveInner(editor.state.selection.main.head, -1);
              if (!['String', 'Number', 'True', 'False', 'Null'].includes(node.name)) return false;

              setTooltipInfo(null);
              startCompletion(editor);
              return false;
            },
            mousemove(event, editor) {
              if (syntaxTree(editor.state).topNode.name !== 'JsonText') return false;
              const pos = editor.posAtCoords({ x: event.clientX, y: event.clientY });

              const scope = findPairedScopeAtCoords(editor, event.clientX, event.clientY);
              const current = editor.state.field(pairedScopeField);
              const isSame =
                (!scope && !current) ||
                (scope &&
                  current &&
                  scope.openBracketPos === current.openBracketPos &&
                  scope.closeBracketPos === current.closeBracketPos &&
                  scope.column === current.column);
              if (!isSame) {
                editor.dispatch({ effects: setPairedScope.of(scope) });
              }

              // Key hover tooltip - only for request fields (suppressed on response / readOnly unless explicitly enabled)
              const enableHover = propsRef.current.hoverTooltip ?? !propsRef.current.readOnly;
              if (!enableHover) {
                setTooltipInfo(null);
                return false;
              }

              const element =
                event.target instanceof HTMLElement
                  ? event.target.closest<HTMLElement>('.cm-token-key, .source-editor__key')
                  : null;
              if (!element || event.buttons || pos === null) {
                setTooltipInfo(null);
                return false;
              }

              const path = getJsonFieldPath(editor.state, pos, 1);
              if (!path || path.length === 0) {
                setTooltipInfo(null);
                return false;
              }

              const docStr = editor.state.doc.toString();
              const meta = propsRef.current.getFieldMeta?.(path, docStr);
              const desc =
                meta?.description || propsRef.current.getFieldDescription?.(path, docStr) || '';
              if (!desc && !meta) {
                setTooltipInfo(null);
                return false;
              }

              const keyName = String(path[path.length - 1]);
              let currentValue: unknown;
              try {
                const parsed: unknown = JSON.parse(docStr);
                currentValue = getNestedValue(parsed, path);
              } catch {
                /* ignore */
              }

              setTooltipInfo({
                name: keyName,
                path: path.join('.'),
                type: meta?.type || 'string',
                description: desc,
                required: meta?.required,
                enums: meta?.enums,
                currentValue,
                x: event.clientX,
                y: event.clientY,
              });
              return false;
            },
            mouseleave(_, editor) {
              editor.dispatch({
                effects: [setPairedScope.of(null), setHoveredLine.of(null)],
              });
              setTooltipInfo(null);
              return false;
            },
            blur() {
              setTooltipInfo(null);
              return false;
            },
            scroll() {
              setTooltipInfo(null);
              return false;
            },
          }),
        ],
      }),
    });

    viewRef.current = view;
    const focusFrame = initial.autoFocus ? requestAnimationFrame(() => view.focus()) : undefined;
    return () => {
      if (focusFrame !== undefined) cancelAnimationFrame(focusFrame);
      layoutMotion.destroy();
      view.destroy();
      viewRef.current = null;
    };
  }, [handlePreviewImage]);

  useLayoutEffect(() => {
    viewRef.current?.dispatch({
      effects: lineNumbersRef.current.reconfigure(
        (props.lineNumbers ?? syntax !== 'json') ? lineNumbers() : [],
      ),
    });
  }, [props.lineNumbers, syntax]);

  useLayoutEffect(() => {
    const view = viewRef.current;
    if (view && view.state.doc.toString() !== props.value) {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: props.value },
        annotations: externalChange.of(true),
      });
    }
  }, [props.value]);

  useLayoutEffect(() => {
    viewRef.current?.dispatch({
      effects: [
        syntaxRef.current.reconfigure(syntax === 'json' ? json() : syntax === 'xml' ? xml() : []),
        attributesRef.current.reconfigure(
          EditorView.contentAttributes.of({
            'aria-label': label,
            spellcheck: 'false',
            autocorrect: 'off',
            autocapitalize: 'off',
          }),
        ),
      ],
    });
  }, [label, syntax]);

  useLayoutEffect(() => {
    viewRef.current?.dispatch({
      effects: accessRef.current.reconfigure([
        EditorState.readOnly.of(Boolean(props.readOnly)),
        EditorView.editable.of(!props.readOnly),
      ]),
    });
  }, [props.readOnly]);

  useLayoutEffect(() => {
    const changed = annotationVisibilityRef.current !== props.showAnnotations;
    annotationVisibilityRef.current = props.showAnnotations;
    viewRef.current?.dispatch({
      annotations: editorLayoutChange.of(changed),
      effects: annotationsRef.current.reconfigure(
        syntax === 'json' && props.showAnnotations
          ? createDescriptionPlugin(props.getFieldMeta, props.getFieldDescription, (info) =>
              setActiveEnumDialog(info),
            )
          : [],
      ),
    });
  }, [syntax, props.showAnnotations, props.getFieldMeta, props.getFieldDescription]);

  const { readOnly, getFieldOptions, getFieldMeta } = props;
  useLayoutEffect(() => {
    viewRef.current?.dispatch({
      effects: enumPickerRef.current.reconfigure(
        syntax === 'json' && !readOnly && (getFieldOptions || getFieldMeta)
          ? createEnumPickerPlugin(
              getFieldOptions ?? ((path, source) => getFieldMeta?.(path, source)?.enums ?? []),
            )
          : [],
      ),
    });
  }, [syntax, readOnly, getFieldOptions, getFieldMeta]);

  useLayoutEffect(() => {
    if (viewRef.current && props.fold)
      (props.fold.collapsed ? foldAll : unfoldAll)(viewRef.current);
  }, [props.fold, props.value]);

  return (
    <div className={`source-editor${syntax === 'json' ? ' source-editor--json' : ''}`}>
      <div className="source-editor__host" ref={hostRef} />
      <JsonNodeCopyMenu selection={copySelection} onClose={closeCopyMenu} />
      <FloatingTooltip info={tooltipInfo} />
      <EnumPopover dialog={activeEnumDialog} onClose={() => setActiveEnumDialog(null)} />
      {!props.onPreviewImage && internalPreviewImage && (
        <ImagePreviewDialog
          open={Boolean(internalPreviewImage)}
          onClose={() => setInternalPreviewImage(null)}
          images={(() => {
            const scanned = scanImagesFromResponse(props.value);
            return scanned.length > 0 ? scanned : [internalPreviewImage];
          })()}
          initialFocusKeyPath={internalPreviewImage.keyPath}
        />
      )}
    </div>
  );
}
