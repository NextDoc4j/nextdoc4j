import { useLayoutEffect, type RefObject } from 'react';

/** Positions presentation-only active and hover layers without changing tab behavior.
 * @param ref Existing scroll or segmented container.
 * @param itemSelector Selector for its direct selectable children.
 * @param activeSelector Selector identifying the current item.
 * @param enabled Whether the owning view has mounted its tab container.
 * @returns Nothing; owns geometry variables and cleans up its observers.
 */
export function useTabIndicators(
  ref: RefObject<HTMLDivElement | null>,
  itemSelector: string,
  activeSelector: string,
  enabled = true,
): void {
  useLayoutEffect(() => {
    const container = ref.current;
    if (!enabled || !container) return;
    let frame: number | undefined;
    let readyFrame: number | undefined;
    let hovered: HTMLElement | undefined;
    let disposed = false;
    const observed = new Set<HTMLElement>();
    /** Writes geometry only when it changes, avoiding layout observer feedback.
     * @param name CSS custom property.
     * @param value New property value.
     * @returns Nothing.
     */
    const set = (name: string, value: string) => {
      if (container.style.getPropertyValue(name) !== value)
        container.style.setProperty(name, value);
    };
    /** Aligns one layer to an item in the container's own scroll coordinates.
     * @param layer Active or hover layer.
     * @param item Current visible tab element.
     * @returns Nothing; hides the layer when no measurable item exists.
     */
    const place = (layer: string, item?: HTMLElement | null) => {
      const visible = Boolean(item && item.offsetWidth && item.offsetHeight);
      set(`--tab-${layer}-visible`, visible ? '1' : '0');
      if (!visible || !item) return;
      set(`--tab-${layer}-x`, `${item.offsetLeft}px`);
      set(`--tab-${layer}-y`, `${item.offsetTop}px`);
      set(`--tab-${layer}-width`, `${item.offsetWidth}px`);
      set(`--tab-${layer}-height`, `${item.offsetHeight}px`);
    };
    /** Updates both layers after layout, selection, labels or tab order changes.
     * @param None.
     * @returns Nothing; never updates selection, routing or scroll state.
     */
    const measure = () => {
      if (disposed) return;
      const active = container.querySelector<HTMLElement>(activeSelector);
      place('active', active);
      place('hover', hovered?.isConnected && hovered !== active ? hovered : undefined);
      if (
        active?.offsetWidth &&
        !container.hasAttribute('data-tab-motion-ready') &&
        readyFrame === undefined
      ) {
        readyFrame = requestAnimationFrame(() => {
          readyFrame = undefined;
          if (!disposed) container.setAttribute('data-tab-motion-ready', '');
        });
      }
    };
    /** Batches repeated observer notifications into one frame.
     * @param None.
     * @returns Nothing.
     */
    const schedule = () => {
      frame ??= requestAnimationFrame(() => {
        frame = undefined;
        measure();
      });
    };
    const resize = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(schedule);
    /** Observes newly inserted items and releases detached ones.
     * @param None.
     * @returns Nothing; updates geometry after reconciling observed elements.
     */
    const reconcile = () => {
      const items = new Set(container.querySelectorAll<HTMLElement>(itemSelector));
      for (const item of observed)
        if (!items.has(item)) {
          resize?.unobserve(item);
          observed.delete(item);
        }
      for (const item of items)
        if (!observed.has(item)) {
          resize?.observe(item);
          observed.add(item);
        }
      schedule();
    };
    /** Tracks pointer hover across child labels and icons without intercepting events.
     * @param event Pointer entering an item or one of its descendants.
     * @returns Nothing.
     */
    const hover = (event: PointerEvent) => {
      const target = event.target instanceof Element ? event.target : undefined;
      hovered = [...observed].find(
        (item) => item.contains(target ?? null) && !item.matches(':disabled'),
      );
      measure();
    };
    /** Dismisses the hover layer when the pointer leaves or dragging begins.
     * @param None.
     * @returns Nothing.
     */
    const leave = () => {
      hovered = undefined;
      place('hover');
    };
    const mutations = new MutationObserver(reconcile);
    mutations.observe(container, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['class', 'aria-selected', 'aria-checked'],
    });
    resize?.observe(container);
    reconcile();
    measure();
    container.addEventListener('pointerover', hover);
    container.addEventListener('pointerleave', leave);
    container.addEventListener('dragstart', leave);
    window.addEventListener('resize', schedule);
    void document.fonts?.ready.then(() => {
      if (!disposed) schedule();
    });
    return () => {
      disposed = true;
      mutations.disconnect();
      resize?.disconnect();
      if (frame !== undefined) cancelAnimationFrame(frame);
      if (readyFrame !== undefined) cancelAnimationFrame(readyFrame);
      container.removeEventListener('pointerover', hover);
      container.removeEventListener('pointerleave', leave);
      container.removeEventListener('dragstart', leave);
      window.removeEventListener('resize', schedule);
      container.removeAttribute('data-tab-motion-ready');
    };
  }, [ref, itemSelector, activeSelector, enabled]);
}
