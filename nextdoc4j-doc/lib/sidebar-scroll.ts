const storageKey = 'nextdoc4j:docs-sidebar:scroll-top';
const scrollKeys = new Set(['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ']);

export function preserveSidebarScroll(viewport: HTMLElement) {
  let savedTop: number | null = null;
  try {
    const value = sessionStorage.getItem(storageKey);
    if (value !== null && Number.isFinite(Number(value)) && Number(value) >= 0) {
      savedTop = Number(value);
    }
  } catch {
    // Storage may be unavailable; native scrolling should keep working.
  }

  let restoring = savedTop !== null;
  let restoreFrame: number | undefined;
  let saveFrame: number | undefined;
  let resize: ResizeObserver | undefined;

  const save = () => {
    // Keep the destination intact if the page reloads during restoration.
    if (restoring || !viewport.clientHeight) return;
    try {
      sessionStorage.setItem(storageKey, String(viewport.scrollTop));
    } catch {
      // Persistence is optional when storage is blocked.
    }
  };

  const scheduleSave = () => {
    if (restoring || saveFrame !== undefined) return;
    saveFrame = requestAnimationFrame(() => {
      saveFrame = undefined;
      save();
    });
  };

  const interrupt = (event: Event) => {
    if (event instanceof KeyboardEvent && !scrollKeys.has(event.key)) return;
    if (!restoring) return;
    restoring = false;
    resize?.disconnect();
    if (restoreFrame !== undefined) cancelAnimationFrame(restoreFrame);
    restoreFrame = undefined;
    scheduleSave();
  };

  if (restoring) {
    // Wait for a measurable viewport, including when the sidebar starts hidden.
    resize = new ResizeObserver(() => {
      if (!viewport.clientHeight) return;
      resize?.disconnect();
      const from = viewport.scrollTop;
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      let startedAt: number | undefined;

      const animate = (now: number) => {
        restoreFrame = undefined;
        startedAt ??= now;
        const target = Math.min(savedTop ?? 0, Math.max(0, viewport.scrollHeight - viewport.clientHeight));
        const progress = reducedMotion || from === target ? 1 : Math.min((now - startedAt) / 260, 1);
        viewport.scrollTop = from + (target - from) * (1 - (1 - progress) ** 3);
        if (progress < 1) {
          restoreFrame = requestAnimationFrame(animate);
        } else {
          restoring = false;
          save();
        }
      };

      restoreFrame = requestAnimationFrame(animate);
    });
    resize.observe(viewport);
  }

  const inputEvents = ['wheel', 'touchstart', 'pointerdown', 'keydown'] as const;
  viewport.addEventListener('scroll', scheduleSave, { passive: true });
  for (const event of inputEvents) viewport.addEventListener(event, interrupt, { passive: true });
  window.addEventListener('pagehide', save);

  return () => {
    save();
    resize?.disconnect();
    if (restoreFrame !== undefined) cancelAnimationFrame(restoreFrame);
    if (saveFrame !== undefined) cancelAnimationFrame(saveFrame);
    viewport.removeEventListener('scroll', scheduleSave);
    for (const event of inputEvents) viewport.removeEventListener(event, interrupt);
    window.removeEventListener('pagehide', save);
  };
}
