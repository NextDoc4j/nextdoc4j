import type { Transaction } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';
import { UI_MOTION } from './motion-timing';

interface Snapshot {
  height: number;
  lines: Map<number, { top: number; folded: boolean }>;
}

/** Task List-style positional feedback around editor folds, without animating source edits. */
export function createEditorLayoutMotion(shouldAnimate: (transaction: Transaction) => boolean) {
  const running = new Set<Animation>();
  let disposed = false;
  let owner: EditorView | undefined;
  let scrollOwner: HTMLElement | null = null;
  let generation = 0;
  const reduced = () => globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? true;
  const clear = () => {
    generation++;
    for (const animation of running) animation.cancel();
    running.clear();
    owner?.dom.removeAttribute('data-layout-motion');
    owner?.dom.removeAttribute('data-height-motion');
    scrollOwner?.removeAttribute('data-json-motion');
    scrollOwner = null;
  };
  const media = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
  const preferenceChanged = () => {
    clear();
  };
  media?.addEventListener?.('change', preferenceChanged);

  const settle = () => {
    const view = owner;
    if (!view) return;
    const request = generation;
    // Restore natural flex sizing before CodeMirror's final geometry pass, keeping bars clipped.
    view.dom.removeAttribute('data-height-motion');
    view.requestMeasure({
      read: () => undefined,
      write: () => {
        if (disposed || request !== generation || running.size) return;
        view.dom.removeAttribute('data-layout-motion');
        scrollOwner?.removeAttribute('data-json-motion');
        scrollOwner = null;
      },
    });
  };

  // Only mounted, visible lines participate; large documents retain CodeMirror's virtualization.
  const height = (view: EditorView) => {
    let result = view.dom.getBoundingClientRect().height;
    // Animate the visible pane, rather than thousands of offscreen source lines.
    for (
      let parent = view.dom.parentElement;
      parent && parent !== document.body;
      parent = parent.parentElement
    )
      if (parent.clientHeight && /auto|scroll|hidden|clip/.test(getComputedStyle(parent).overflowY))
        result = Math.min(result, parent.clientHeight);
    return result;
  };
  const lines = (view: EditorView) => {
    const result: Array<{ element: HTMLElement; position: number; top: number; folded: boolean }> =
      [];
    const origin = view.contentDOM.getBoundingClientRect().top;
    const viewport = view.scrollDOM.getBoundingClientRect();
    for (const element of view.contentDOM.querySelectorAll<HTMLElement>('.cm-line')) {
      const box = element.getBoundingClientRect();
      if (
        box.bottom < Math.max(0, viewport.top) ||
        box.top > Math.min(innerHeight, viewport.bottom)
      )
        continue;
      result.push({
        element,
        position: view.posAtDOM(element),
        top: box.top - origin,
        folded: Boolean(element.querySelector('.cm-foldPlaceholder')),
      });
      if (result.length >= 160) break;
    }
    return result;
  };
  const play = (element: HTMLElement, frames: Keyframe[], duration: number) => {
    const animation = element.animate?.(frames, {
      duration,
      easing: UI_MOTION.easing,
      fill: 'backwards',
    });
    if (!animation) return;
    running.add(animation);
    animation.onfinish = () => {
      running.delete(animation);
      if (!running.size) settle();
    };
  };
  return {
    dispatchTransactions(transactions: readonly Transaction[], view: EditorView) {
      owner = view;
      const animate =
        !disposed &&
        !reduced() &&
        transactions.some(shouldAnimate) &&
        !transactions.some((tr) => tr.docChanged);
      const snapshot: Snapshot | undefined = animate
        ? {
            height: height(view),
            lines: new Map(
              lines(view).map((line) => [line.position, { top: line.top, folded: line.folded }]),
            ),
          }
        : undefined;
      // Pointer hover/selection transactions must not interrupt a fold in progress.
      if (snapshot || transactions.some((tr) => tr.docChanged)) {
        clear();
      }
      view.update(transactions);
      if (!snapshot) return;
      // update() has finished; read the committed DOM and start before its first paint.
      // Waiting for requestMeasure lets newly unfolded rows flash at their final size.
      // The old scroll pane can still have its collapsed height during this update.
      // Use the new content's natural height, bounded by actual CSS limits rather than that old box.
      let targetHeight = Math.min(view.dom.getBoundingClientRect().height, innerHeight);
      for (
        let parent = view.dom.parentElement;
        parent && parent !== document.body;
        parent = parent.parentElement
      ) {
        const maxHeight = getComputedStyle(parent).maxHeight;
        if (maxHeight.endsWith('px')) targetHeight = Math.min(targetHeight, parseFloat(maxHeight));
      }
      const after = { height: targetHeight, lines: lines(view) };
      if (disposed || reduced()) return;
      view.dom.setAttribute('data-layout-motion', '');
      scrollOwner = view.dom.closest<HTMLElement>(
        '.operation-json__body, .entity-model__json-content',
      );
      scrollOwner?.setAttribute('data-json-motion', '');
      if (Math.abs(snapshot.height - after.height) > 1) {
        view.dom.setAttribute('data-height-motion', '');
        play(
          view.dom,
          [{ height: `${snapshot.height}px` }, { height: `${after.height}px` }],
          UI_MOTION.collapse,
        );
      }
      for (const line of after.lines) {
        const before = snapshot.lines.get(line.position);
        if (before === undefined)
          play(
            line.element,
            [
              { opacity: 0, transform: 'translateY(4px)' },
              { opacity: 1, transform: 'translateY(0)' },
            ],
            UI_MOTION.collapse,
          );
        else if (Math.abs(before.top - line.top) > 1)
          play(
            line.element,
            [
              { transform: `translateY(${before.top - line.top}px)` },
              { transform: 'translateY(0)' },
            ],
            UI_MOTION.move,
          );
        if (before && before.folded !== line.folded)
          play(line.element, [{ opacity: 0.55 }, { opacity: 1 }], UI_MOTION.feedback);
      }
      if (!running.size) settle();
    },
    destroy() {
      disposed = true;
      clear();
      media?.removeEventListener?.('change', preferenceChanged);
    },
  };
}
