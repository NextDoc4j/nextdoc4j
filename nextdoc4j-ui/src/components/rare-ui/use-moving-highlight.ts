import { useLayoutEffect, type RefObject } from 'react';

/** Moves a shared background; an optional layout owner lets it follow folding rows directly. */
export function useMovingHighlight(
  ref: RefObject<HTMLElement | null>,
  itemSelector: string,
  activeSelector?: string,
  enabled = true,
  focusSelector?: string,
  layoutRef?: RefObject<HTMLElement | null>,
) {
  useLayoutEffect(() => {
    const container = ref.current;
    if (!container || !enabled) return;
    let hovered: HTMLElement | null = null;
    let focused: HTMLElement | null = null;
    let trackedFocus: HTMLElement | null = null;
    let pointerDriven = false;
    let frame: number | undefined;
    let readyFrame: number | undefined;
    let settleFrame: number | undefined;
    let disposed = false;
    const layoutRoot = layoutRef?.current;
    const layoutTransitions = new Map<EventTarget, Set<string>>();
    const observed = new Set<HTMLElement>();
    const write = (name: string, value: string) => {
      if (container.style.getPropertyValue(name) !== value)
        container.style.setProperty(name, value);
    };
    const visible = (item: HTMLElement | null) =>
      Boolean(
        item?.isConnected && item.offsetWidth && item.offsetHeight && !item.closest('[inert]'),
      );
    const place = (layer: string, item: HTMLElement | null) => {
      write(`--moving-${layer}-visible`, visible(item) ? '1' : '0');
      if (!visible(item) || !item) return;
      const origin = container.getBoundingClientRect();
      const box = item.getBoundingClientRect();
      write(
        `--moving-${layer}-x`,
        `${box.left - origin.left - container.clientLeft + container.scrollLeft}px`,
      );
      write(
        `--moving-${layer}-y`,
        `${box.top - origin.top - container.clientTop + container.scrollTop}px`,
      );
      write(`--moving-${layer}-width`, `${box.width}px`);
      write(`--moving-${layer}-height`, `${box.height}px`);
      if (!container.hasAttribute('data-moving-ready') && readyFrame === undefined) {
        readyFrame = requestAnimationFrame(() => {
          readyFrame = undefined;
          if (!disposed) container.setAttribute('data-moving-ready', '');
        });
      }
    };
    const measure = () => {
      if (disposed) return;
      // Lazy branches can unmount before their transitionend/cancel can reach the owner.
      for (const target of layoutTransitions.keys())
        if (!(target instanceof Node) || !layoutRoot?.contains(target))
          layoutTransitions.delete(target);
      const nextFocus = focusSelector
        ? ([...container.querySelectorAll<HTMLElement>(focusSelector)].find(visible) ?? null)
        : null;
      // A keyboard-driven choice takes over from a pointer parked on an older row.
      if (trackedFocus !== nextFocus) {
        trackedFocus = nextFocus;
        hovered = null;
        pointerDriven = false;
      }
      const active = activeSelector
        ? ([...container.querySelectorAll<HTMLElement>(activeSelector)].find(visible) ?? null)
        : null;
      place('active', active);
      // Menu gaps must not send a pointer-driven highlight back to a previously clicked row.
      const hover = pointerDriven ? hovered : (hovered ?? focused ?? trackedFocus);
      place('hover', hover === active ? null : hover);
    };
    const schedule = () => {
      frame ??= requestAnimationFrame(() => {
        frame = undefined;
        measure();
        if (layoutTransitions.size) schedule();
        else if (container.hasAttribute('data-moving-layout') && settleFrame === undefined) {
          // Paint the final geometry before restoring the normal selection transition.
          settleFrame = requestAnimationFrame(() => {
            settleFrame = undefined;
            if (!disposed && !layoutTransitions.size)
              container.removeAttribute('data-moving-layout');
          });
        }
      });
    };
    const affectsLayout = (event: TransitionEvent) =>
      !event.pseudoElement &&
      (['width', 'height', 'grid-template-rows'].includes(event.propertyName) ||
        (event.propertyName === 'transform' &&
          (event.target === container || event.target === layoutRoot)));
    const followLayout = (event: TransitionEvent) => {
      if (!event.target || !affectsLayout(event)) return;
      const properties = layoutTransitions.get(event.target) ?? new Set<string>();
      properties.add(event.propertyName);
      layoutTransitions.set(event.target, properties);
      container.setAttribute('data-moving-layout', '');
      measure();
      schedule();
    };
    const finishLayout = (event: TransitionEvent) => {
      if (!event.target || !affectsLayout(event)) return;
      const properties = layoutTransitions.get(event.target);
      properties?.delete(event.propertyName);
      if (!properties?.size) layoutTransitions.delete(event.target);
      schedule();
    };
    const resize = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(schedule);
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
      if (hovered && !items.has(hovered)) hovered = null;
      if (focused && !items.has(focused)) focused = null;
      schedule();
    };
    const find = (target: EventTarget | null) => {
      const item = target instanceof Element ? target.closest<HTMLElement>(itemSelector) : null;
      return item && container.contains(item) && visible(item) ? item : null;
    };
    const hover = (event: PointerEvent) => {
      const next = find(event.target);
      if (pointerDriven && hovered === next) return;
      pointerDriven = true;
      hovered = next;
      schedule();
    };
    const leave = () => {
      hovered = null;
      schedule();
    };
    const focus = (event: FocusEvent) => {
      focused = find(event.target);
      // Clicking the hovered row also fires focusin; keep pointer ownership until keyboard use.
      if (focused !== hovered) {
        pointerDriven = false;
        hovered = null;
      }
      schedule();
    };
    const blur = (event: FocusEvent) => {
      focused = find(event.relatedTarget);
      schedule();
    };
    const keyboard = () => {
      pointerDriven = false;
      hovered = null;
      schedule();
    };
    const mutations = new MutationObserver(reconcile);
    mutations.observe(container, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'inert', 'aria-current'],
    });
    resize?.observe(container);
    reconcile();
    measure();
    container.addEventListener('pointerover', hover);
    container.addEventListener('pointerleave', leave);
    container.addEventListener('focusin', focus);
    container.addEventListener('focusout', blur);
    container.addEventListener('keydown', keyboard);
    container.addEventListener('scroll', schedule, true);
    container.addEventListener('rare-layout-change', schedule);
    layoutRoot?.addEventListener('transitionrun', followLayout);
    layoutRoot?.addEventListener('transitionend', finishLayout);
    layoutRoot?.addEventListener('transitioncancel', finishLayout);
    window.addEventListener('resize', schedule);
    return () => {
      disposed = true;
      mutations.disconnect();
      resize?.disconnect();
      if (frame !== undefined) cancelAnimationFrame(frame);
      if (readyFrame !== undefined) cancelAnimationFrame(readyFrame);
      if (settleFrame !== undefined) cancelAnimationFrame(settleFrame);
      container.removeEventListener('pointerover', hover);
      container.removeEventListener('pointerleave', leave);
      container.removeEventListener('focusin', focus);
      container.removeEventListener('focusout', blur);
      container.removeEventListener('keydown', keyboard);
      container.removeEventListener('scroll', schedule, true);
      container.removeEventListener('rare-layout-change', schedule);
      layoutRoot?.removeEventListener('transitionrun', followLayout);
      layoutRoot?.removeEventListener('transitionend', finishLayout);
      layoutRoot?.removeEventListener('transitioncancel', finishLayout);
      window.removeEventListener('resize', schedule);
      container.removeAttribute('data-moving-ready');
      container.removeAttribute('data-moving-layout');
    };
  }, [ref, itemSelector, activeSelector, enabled, focusSelector, layoutRef]);
}
