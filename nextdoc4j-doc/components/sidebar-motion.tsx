'use client';

import { preserveSidebarScroll } from '@/lib/sidebar-scroll';
import { useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';

const itemSelector = '[role="presentation"] [data-id] a';

export function SidebarMotion() {
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  useLayoutEffect(() => {
    let disposed = false;
    let frame: number | undefined;
    let readyFrame: number | undefined;
    let root: HTMLElement | null = null;
    let surface: HTMLElement | null = null;
    let observer: MutationObserver | undefined;
    let resize: ResizeObserver | undefined;
    let hovered: HTMLElement | null = null;
    let focused: HTMLElement | null = null;
    let pointerDriven = false;
    let cleanup = () => {};

    const write = (name: string, value: string) => {
      if (surface && surface.style.getPropertyValue(name) !== value) {
        surface.style.setProperty(name, value);
      }
    };

    const visible = (item: HTMLElement | null) => {
      return Boolean(item?.isConnected && item.offsetWidth && item.offsetHeight && !item.closest('[inert]'));
    };

    const place = (layer: 'active' | 'hover', item: HTMLElement | null) => {
      write(`--nd-sidebar-${layer}-visible`, visible(item) ? '1' : '0');
      if (!surface || !visible(item) || !item) return;

      // Both rectangles move together during native scrolling, so these coordinates stay fixed.
      const origin = surface.getBoundingClientRect();
      const box = item.getBoundingClientRect();
      write(`--nd-sidebar-${layer}-x`, `${box.left - origin.left}px`);
      write(`--nd-sidebar-${layer}-y`, `${box.top - origin.top}px`);
      write(`--nd-sidebar-${layer}-width`, `${box.width}px`);
      write(`--nd-sidebar-${layer}-height`, `${box.height}px`);

      if (!surface.hasAttribute('data-nd-sidebar-ready') && readyFrame === undefined) {
        readyFrame = requestAnimationFrame(() => {
          readyFrame = undefined;
          if (!disposed && surface) surface.setAttribute('data-nd-sidebar-ready', '');
        });
      }
    };

    const measure = () => {
      if (!surface || disposed) return;

      const active = surface.querySelector<HTMLElement>('a[data-active="true"]');
      const hover = pointerDriven ? hovered : hovered ?? focused;
      place('active', active);
      place('hover', hover === active ? null : hover);
    };

    const schedule = () => {
      if (disposed || frame !== undefined) return;
      frame = requestAnimationFrame(() => {
        frame = undefined;
        measure();
      });
    };

    const findItem = (target: EventTarget | null) => {
      if (!(target instanceof Element) || !root) return null;
      const item = target.closest<HTMLElement>(itemSelector);
      return item && root.contains(item) && visible(item) ? item : null;
    };

    const attach = () => {
      if (disposed || root) return;
      const nextRoot = document.getElementById('nd-sidebar');
      if (!nextRoot) return;

      const viewport = nextRoot.querySelector<HTMLElement>(':scope > [role="presentation"] > [data-id]');
      const content = viewport?.firstElementChild;
      if (!viewport || !(content instanceof HTMLElement)) return;
      root = nextRoot;
      surface = content;
      rootObserver.disconnect();
      const cleanupScroll = preserveSidebarScroll(viewport);
      surface.classList.add('nd-sidebar-motion');
      setPortalTarget(surface);
      resize = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(schedule);
      resize?.observe(surface);

      const onPointerOver = (event: PointerEvent) => {
        const next = findItem(event.target);
        if (pointerDriven && hovered === next) return;
        pointerDriven = true;
        hovered = next;
        schedule();
      };
      const onPointerLeave = () => {
        hovered = null;
        pointerDriven = false;
        schedule();
      };
      const onFocusIn = (event: FocusEvent) => {
        focused = findItem(event.target);
        if (focused !== hovered) {
          hovered = null;
          pointerDriven = false;
        }
        schedule();
      };
      const onFocusOut = (event: FocusEvent) => {
        focused = findItem(event.relatedTarget);
        schedule();
      };
      const onKeyDown = () => {
        hovered = null;
        pointerDriven = false;
        schedule();
      };
      root.addEventListener('pointerover', onPointerOver);
      root.addEventListener('pointerleave', onPointerLeave);
      root.addEventListener('focusin', onFocusIn);
      root.addEventListener('focusout', onFocusOut);
      root.addEventListener('keydown', onKeyDown);
      window.addEventListener('resize', schedule);

      observer = new MutationObserver(schedule);
      observer.observe(surface, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['data-active'],
      });

      measure();

      cleanup = () => {
        cleanupScroll();
        root?.removeEventListener('pointerover', onPointerOver);
        root?.removeEventListener('pointerleave', onPointerLeave);
        root?.removeEventListener('focusin', onFocusIn);
        root?.removeEventListener('focusout', onFocusOut);
        root?.removeEventListener('keydown', onKeyDown);
        window.removeEventListener('resize', schedule);
        observer?.disconnect();
        resize?.disconnect();
        surface?.classList.remove('nd-sidebar-motion');
        surface?.removeAttribute('data-nd-sidebar-ready');
        surface = null;
        root = null;
      };
    };

    const rootObserver = new MutationObserver(attach);
    rootObserver.observe(document.body, { childList: true, subtree: true });
    attach();

    return () => {
      disposed = true;
      rootObserver.disconnect();
      cleanup();
      if (frame !== undefined) cancelAnimationFrame(frame);
      if (readyFrame !== undefined) cancelAnimationFrame(readyFrame);
    };
  }, []);

  return portalTarget && createPortal(
    <>
      <span aria-hidden="true" data-nd-sidebar-highlight="active" />
      <span aria-hidden="true" data-nd-sidebar-highlight="hover" />
    </>,
    portalTarget,
  );
}
