import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from 'react';

import { MarkdownContent } from '../documentation/markdown-content';
import { createMarkdownHeadingId } from '../documentation/markdown-heading';

const estimatedSectionHeight = 320;
const previewOverscan = 720;

interface PreviewMetric {
  height: number;
  offset: number;
}

interface VirtualMarkdownPreviewProps {
  content: string;
}

/**
 * Splits one Markdown export into independently measurable heading sections.
 *
 * @param content Canonical Markdown export content.
 * @returns Non-empty sections preserving their original document order.
 */
const splitMarkdownSections = (content: string) =>
  content
    .split(/(?=^#{2,4}\s)/mu)
    .map((section) => section.trim())
    .filter(Boolean);

/**
 * Finds the virtual section containing or following a vertical scroll offset.
 *
 * @param metrics Ordered measured or estimated section metrics.
 * @param offset Vertical scroll offset within the preview viewport.
 * @returns Index of the closest section, or zero for an empty list.
 */
const findSectionIndex = (metrics: PreviewMetric[], offset: number) => {
  let lower = 0;
  let upper = Math.max(0, metrics.length - 1);
  while (lower < upper) {
    const middle = Math.floor((lower + upper) / 2);
    const metric = metrics[middle]!;
    if (metric.offset + metric.height < offset) lower = middle + 1;
    else upper = middle;
  }
  return lower;
};

/**
 * Renders a formatted Markdown document with measured section virtualization.
 *
 * @param props Canonical Markdown content generated from the selected OpenAPI subset.
 * @returns Scrollable formatted preview that mounts only visible and buffered sections.
 */
export function VirtualMarkdownPreview({ content }: VirtualMarkdownPreviewProps) {
  const sections = useMemo(() => splitMarkdownSections(content), [content]);
  const anchorIndexes = useMemo(() => {
    const indexes = new Map<string, number>();
    sections.forEach((section, index) => {
      const heading = /^#{2,4}\s+(.+)$/mu.exec(section)?.[1];
      if (heading) indexes.set(createMarkdownHeadingId(heading), index);
    });
    return indexes;
  }, [sections]);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(720);
  const [sectionHeights, setSectionHeights] = useState<Record<number, number>>({});
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const sectionRefs = useRef(new Map<number, HTMLDivElement>());
  const scrollFrameRef = useRef<number | undefined>(undefined);
  const pendingScrollTopRef = useRef(0);

  useLayoutEffect(() => {
    setScrollTop(0);
    setSectionHeights({});
    viewportRef.current?.scrollTo({ top: 0 });
  }, [content]);

  useEffect(
    () => () => {
      if (scrollFrameRef.current !== undefined) {
        globalThis.cancelAnimationFrame(scrollFrameRef.current);
      }
    },
    [],
  );

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const updateViewportHeight = () => {
      const windowLimit = globalThis.innerHeight || 800;
      const measured = viewport.clientHeight;
      setViewportHeight(measured > 0 ? Math.min(measured, windowLimit) : windowLimit);
    };
    updateViewportHeight();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(updateViewportHeight);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  const metrics = useMemo(() => {
    let offset = 0;
    const items = sections.map((_, index) => {
      const height = sectionHeights[index] ?? estimatedSectionHeight;
      const metric = { height, offset };
      offset += height;
      return metric;
    });
    return { items, totalHeight: offset };
  }, [sectionHeights, sections]);

  const startIndex = findSectionIndex(metrics.items, Math.max(0, scrollTop - previewOverscan));
  const endIndex = Math.min(
    sections.length,
    findSectionIndex(metrics.items, scrollTop + viewportHeight + previewOverscan) + 1,
  );

  useLayoutEffect(() => {
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver((entries) => {
      setSectionHeights((current) => {
        let next: Record<number, number> | undefined;
        entries.forEach((entry) => {
          const index = Number((entry.target as HTMLElement).dataset.previewIndex);
          const height = Math.ceil((entry.target as HTMLElement).getBoundingClientRect().height);
          if (!Number.isFinite(index) || height === current[index]) return;
          next ??= { ...current };
          next[index] = height;
        });
        return next ?? current;
      });
    });
    sectionRefs.current.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [endIndex, startIndex]);

  /**
   * Maintains the element registry used to measure currently rendered virtual sections.
   *
   * @param index Stable section index in the canonical Markdown document.
   * @param element Rendered section element, or null after it leaves the virtual range.
   * @returns Nothing; updates the mutable measurement registry.
   */
  const setSectionRef = useCallback((index: number, element: HTMLDivElement | null) => {
    if (element) sectionRefs.current.set(index, element);
    else sectionRefs.current.delete(index);
  }, []);

  /**
   * Coalesces native scroll events into one virtual-range update per animation frame.
   *
   * @param nextScrollTop Latest native vertical scroll position.
   * @returns Nothing; schedules the next visible range update.
   */
  const updateScrollPosition = useCallback((nextScrollTop: number) => {
    pendingScrollTopRef.current = nextScrollTop;
    if (scrollFrameRef.current !== undefined) return;
    scrollFrameRef.current = globalThis.requestAnimationFrame(() => {
      scrollFrameRef.current = undefined;
      setScrollTop(pendingScrollTopRef.current);
    });
  }, []);

  /**
   * Scrolls virtual content to a Markdown directory target without changing the application Hash route.
   *
   * @param event Preview click event that may originate from an internal Markdown link.
   * @returns Nothing; non-anchor clicks retain their default behavior.
   */
  const handleAnchorNavigation = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      const target =
        event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a') : null;
      const href = target?.getAttribute('href');
      if (!href?.startsWith('#')) return;
      let anchorId = href.slice(1);
      try {
        anchorId = decodeURIComponent(anchorId);
      } catch {
        // Invalid percent escapes remain usable as their raw fragment text.
      }
      const index = anchorIndexes.get(anchorId);
      if (index === undefined) return;
      event.preventDefault();
      viewportRef.current?.scrollTo({
        behavior: globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches
          ? 'auto'
          : 'smooth',
        top: metrics.items[index]?.offset ?? 0,
      });
    },
    [anchorIndexes, metrics.items],
  );

  return (
    <div
      className="export-document-preview"
      onClick={handleAnchorNavigation}
      onScroll={(event) => updateScrollPosition(event.currentTarget.scrollTop)}
      ref={viewportRef}
    >
      <div className="export-document-preview__canvas" style={{ height: metrics.totalHeight }}>
        {sections.slice(startIndex, endIndex).map((section, offset) => {
          const index = startIndex + offset;
          return (
            <div
              className="export-document-preview__section"
              data-preview-index={index}
              key={`${index}:${section.slice(0, 48)}`}
              ref={(element) => setSectionRef(index, element)}
              style={{ transform: `translateY(${metrics.items[index]!.offset}px)` }}
            >
              <MarkdownContent content={section} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
