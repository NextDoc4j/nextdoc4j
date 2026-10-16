// Adapted from Rare UI (https://rareui.com), copyright (c) 2026 Swami Malode.
// MIT + Commons Clause + Attribution; see ./LICENSE.
import * as React from 'react';
import { motion, useMotionValue, useMotionValueEvent, useSpring } from 'motion/react';

import { cn } from './utils';
import { useReducedMotion } from './use-reduced-motion';

export type RailTocItem = { id: string; label: string; depth?: number };

const RAIL_X = 5;
const LABEL_GAP = 14;
const TRAVEL_SPRING = { stiffness: 140, damping: 26, mass: 0.6 };
const TURN_SPRING = { stiffness: 260, damping: 30 };
// rail length the plane must back up before it turns around, so scroll jitter can't flip it
const TURN_SLACK = 2;

const PLANE = 'M12 2 20.5 21 12 17.5 3.5 21z';
// the plane is narrower than a dot, so the rail and dots under it are cut away
const PLANE_HOLE = 4;

const useIsoLayoutEffect = typeof window !== 'undefined' ? React.useLayoutEffect : React.useEffect;

type Point = { x: number; y: number };
type Geometry = { nodes: Point[]; d: string; width: number; height: number };
function buildPath(nodes: Point[]) {
  const points: Point[] = [{ x: nodes[0].x, y: 0 }, nodes[0]];
  for (let i = 1; i < nodes.length; i++) {
    const from = nodes[i - 1];
    const to = nodes[i];
    if (from.x !== to.x) {
      const bend = (to.y - from.y) * 0.3;
      points.push({ x: from.x, y: from.y + bend }, { x: to.x, y: to.y - bend });
    }
    points.push(to);
  }
  return points.map((p, i) => `${i ? 'L' : 'M'}${p.x} ${p.y}`).join(' ');
}

// the rail only ever runs downward, so y is monotonic along its length
function lengthAtY(path: SVGPathElement, total: number, y: number) {
  let lo = 0;
  let hi = total;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (path.getPointAtLength(mid).y < y) lo = mid;
    else hi = mid;
  }
  return hi;
}

export type RailTocProps = React.ComponentProps<'nav'> & {
  items: RailTocItem[];
  containerRef?: React.RefObject<HTMLElement | null>;
  offset?: number;
  indent?: number;
  title?: string;
};

const RailToc = ({
  className,
  items,
  containerRef,
  offset = 96,
  indent = 14,
  title = '本文目录',
  ...props
}: RailTocProps) => {
  const reduceMotion = useReducedMotion();
  const maskId = `rail-toc-${React.useId().replace(/[^\w-]/g, '')}`;

  const listRef = React.useRef<HTMLUListElement>(null);
  const rowRefs = React.useRef<(HTMLLIElement | null)[]>([]);
  const pathRef = React.useRef<SVGPathElement>(null);
  const holeRefs = React.useRef<(SVGCircleElement | null)[]>([]);

  const [geometry, setGeometry] = React.useState<Geometry>();
  const [reached, setReached] = React.useState(1);

  const lengths = React.useRef<number[]>([]);
  const total = React.useRef(0);
  const placed = React.useRef(false);
  const pinned = React.useRef<number | null>(null);
  const userScrolled = React.useRef(false);
  const facing = React.useRef<1 | -1>(1);
  const turnFrom = React.useRef(0);

  const target = useMotionValue(0);
  const travel = useSpring(target, TRAVEL_SPRING);
  const distance = reduceMotion ? target : travel;

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const heading = useMotionValue(180);
  const turn = useSpring(heading, TURN_SPRING);
  const filled = useMotionValue(0);

  const steer = React.useCallback(
    (angle: number) => {
      // unwrapped against the current heading so the turn spring takes the short way round
      const prev = heading.get();
      heading.set(angle + 360 * Math.round((prev - angle) / 360));
    },
    [heading],
  );

  const placeHoles = React.useCallback(() => {
    holeRefs.current.forEach((hole) => {
      hole?.setAttribute('cx', `${x.get()}`);
      hole?.setAttribute('cy', `${y.get()}`);
    });
  }, [x, y]);

  useMotionValueEvent(x, 'change', placeHoles);
  useMotionValueEvent(y, 'change', placeHoles);

  const pose = React.useCallback(
    (l: number) => {
      const path = pathRef.current;
      const length = total.current;
      if (!path || !length) return;
      // Keep the indicator on the heading rail, including spring travel at either end.
      const first = lengths.current[0] ?? 0;
      const last = lengths.current.at(-1) ?? length;
      const position = Math.min(last, Math.max(first, l));
      const at = path.getPointAtLength(position);
      const behind = path.getPointAtLength(Math.max(0, position - 1));
      const ahead = path.getPointAtLength(Math.min(length, position + 1));
      x.set(at.x);
      y.set(at.y);
      steer(
        (Math.atan2(ahead.y - behind.y, ahead.x - behind.x) * 180) / Math.PI +
          90 +
          (facing.current < 0 ? 180 : 0),
      );
      filled.set(position / length);
      setReached(lengths.current.filter((n) => n <= position + 0.5).length);
    },
    [x, y, steer, filled],
  );

  useMotionValueEvent(distance, 'change', pose);

  const aim = React.useCallback(
    (next: number) => {
      const from = turnFrom.current;
      if ((next - from) * facing.current > 0) turnFrom.current = next;
      else if (Math.abs(next - from) > TURN_SLACK) {
        facing.current = facing.current > 0 ? -1 : 1;
        turnFrom.current = next;
      }
      target.set(next);
    },
    [target],
  );

  const metrics = React.useCallback(() => {
    const scroller = containerRef?.current;
    return {
      scroller,
      scrollTop: scroller ? scroller.scrollTop : window.scrollY,
      viewHeight: scroller ? scroller.clientHeight : window.innerHeight,
      scrollHeight: scroller ? scroller.scrollHeight : document.documentElement.scrollHeight,
    };
  }, [containerRef]);

  const sync = React.useCallback(() => {
    const nodes = lengths.current;
    if (!nodes.length) return;

    // a clicked heading holds the plane until the reader scrolls, since headings near the end can't scroll up to the anchor
    if (pinned.current !== null) {
      aim(nodes[pinned.current] ?? nodes[0]);
      return;
    }

    const { scroller, scrollTop, viewHeight, scrollHeight } = metrics();
    const originTop = scroller ? scroller.getBoundingClientRect().top : 0;

    // the anchor starts at the top edge and sweeps to the bottom near the end, so the first and last headings are both reachable
    const remaining = Math.max(0, scrollHeight - viewHeight - scrollTop);
    const line = Math.min(offset, scrollTop);
    const anchor = line + Math.max(0, viewHeight - line - remaining);

    const tops = items.map((item) => {
      const el = document.getElementById(item.id);
      return el ? el.getBoundingClientRect().top - originTop : Infinity;
    });

    let index = -1;
    for (let i = tops.length - 1; i >= 0; i--) {
      if (tops[i] <= anchor) {
        index = i;
        break;
      }
    }
    let next: number;
    if (index === -1) next = nodes[0];
    else if (index === nodes.length - 1) next = nodes[index];
    else {
      const span = tops[index + 1] - tops[index];
      const progress = span > 0 ? (anchor - tops[index]) / span : 0;
      next = nodes[index] + Math.min(1, Math.max(0, progress)) * (nodes[index + 1] - nodes[index]);
    }

    aim(next);
    if (!placed.current) {
      placed.current = true;
      travel.jump(next);
      pose(next);
      turn.jump(heading.get());
    }
  }, [metrics, items, offset, aim, travel, turn, heading, pose]);

  useIsoLayoutEffect(() => {
    const list = listRef.current;
    if (!list || !items.length) return;

    const measure = () => {
      const nodes = items.map((item, i) => {
        const row = rowRefs.current[i];
        return {
          x: RAIL_X + (item.depth ?? 0) * indent,
          y: row ? row.offsetTop + row.offsetHeight / 2 : 0,
        };
      });
      setGeometry({
        nodes,
        d: buildPath(nodes),
        width: Math.max(...nodes.map((n) => n.x)) + RAIL_X + 4,
        height: list.offsetHeight,
      });
    };

    measure();
    const ro = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(measure);
    ro?.observe(list);
    document.fonts?.ready.then(measure).catch(() => {});
    return () => ro?.disconnect();
  }, [items, indent]);

  useIsoLayoutEffect(() => {
    const path = pathRef.current;
    if (!path || !geometry || typeof path.getTotalLength !== 'function') return;
    total.current = path.getTotalLength();
    lengths.current = geometry.nodes.map((n) => lengthAtY(path, total.current, n.y));
    sync();
    pose(distance.get());
    placeHoles();
  }, [geometry, sync, pose, distance, placeHoles]);

  React.useEffect(() => {
    const scroller = containerRef?.current ?? window;
    const onIntent = () => {
      userScrolled.current = true;
    };
    const onScroll = () => {
      if (pinned.current !== null && userScrolled.current) pinned.current = null;
      sync();
    };
    scroller.addEventListener('scroll', onScroll, { passive: true });
    scroller.addEventListener('wheel', onIntent, {
      passive: true,
    });
    scroller.addEventListener('touchstart', onIntent, {
      passive: true,
    });
    scroller.addEventListener('pointerdown', onIntent);
    window.addEventListener('keydown', onIntent);
    window.addEventListener('resize', sync);
    return () => {
      scroller.removeEventListener('scroll', onScroll);
      scroller.removeEventListener('wheel', onIntent);
      scroller.removeEventListener('touchstart', onIntent);
      scroller.removeEventListener('pointerdown', onIntent);
      window.removeEventListener('keydown', onIntent);
      window.removeEventListener('resize', sync);
    };
  }, [containerRef, sync]);

  const select = (index: number) => {
    const el = document.getElementById(items[index].id);
    if (!el) return;
    pinned.current = index;
    userScrolled.current = false;
    sync();
    const scroller = containerRef?.current;
    const top = scroller
      ? el.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop
      : el.getBoundingClientRect().top + window.scrollY;
    const behavior = reduceMotion ? 'auto' : 'smooth';
    (scroller ?? window).scrollTo({ top: top - offset, behavior });
  };

  const active = Math.max(0, reached - 1);
  React.useEffect(() => {
    const list = listRef.current;
    const row = rowRefs.current[active];
    const viewport = list?.closest<HTMLElement>(
      '.legacy-markdown__toc-scroll, .legacy-markdown__mobile-toc-content',
    );
    if (!row || !viewport || !viewport.clientHeight) return;
    const box = viewport.getBoundingClientRect();
    const bounds = row.getBoundingClientRect();
    if (bounds.top < box.top + 12 || bounds.bottom > box.bottom - 12) {
      viewport.scrollTo({
        top:
          viewport.scrollTop + bounds.top - box.top - viewport.clientHeight / 2 + bounds.height / 2,
        behavior: reduceMotion ? 'auto' : 'smooth',
      });
    }
  }, [active, reduceMotion]);

  return (
    <nav
      data-slot="rail-toc"
      aria-label={title}
      className={cn('rare-rail-toc', className)}
      {...props}
    >
      <p data-slot="rail-toc-title" className="rare-rail-toc-title">
        <svg
          viewBox="0 0 16 16"
          className="-ml-0.5 h-3.5 w-3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          aria-hidden
        >
          <path d="M2 4h12M2 8h8M2 12h10" />
        </svg>
        {title}
      </p>

      <ul ref={listRef} data-slot="rail-toc-list" className="relative">
        {geometry && (
          <svg
            className="pointer-events-none absolute left-0 top-0 overflow-visible"
            width={geometry.width}
            height={geometry.height}
            aria-hidden
          >
            <linearGradient
              id={`${maskId}-fade`}
              gradientUnits="userSpaceOnUse"
              x1={0}
              y1={0}
              x2={0}
              y2={geometry.nodes[0].y - 4}
            >
              <stop offset="0" stopColor="black" />
              <stop offset="1" stopColor="white" />
            </linearGradient>
            <mask
              id={maskId}
              maskUnits="userSpaceOnUse"
              x={-8}
              y={-8}
              width={geometry.width + 16}
              height={geometry.height + 16}
            >
              <rect
                x={-8}
                y={-8}
                width={geometry.width + 16}
                height={geometry.height + 16}
                fill={`url(#${maskId}-fade)`}
              />
              {geometry.nodes.map((node, i) => (
                <circle key={i} cx={node.x} cy={node.y} r={4} fill="black" />
              ))}
              <circle
                ref={(el) => {
                  holeRefs.current[0] = el;
                }}
                r={PLANE_HOLE}
                fill="black"
              />
            </mask>
            <mask
              id={`${maskId}-nodes`}
              maskUnits="userSpaceOnUse"
              x={-8}
              y={-8}
              width={geometry.width + 16}
              height={geometry.height + 16}
            >
              <rect
                x={-8}
                y={-8}
                width={geometry.width + 16}
                height={geometry.height + 16}
                fill="white"
              />
              <circle
                ref={(el) => {
                  holeRefs.current[1] = el;
                }}
                r={PLANE_HOLE}
                fill="black"
              />
            </mask>
            <g mask={`url(#${maskId})`}>
              <path
                ref={pathRef}
                d={geometry.d}
                fill="none"
                strokeWidth="1.25"
                strokeDasharray="2 5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="rare-rail-toc-track"
              />
              <motion.path
                d={geometry.d}
                fill="none"
                strokeWidth="1.25"
                stroke="var(--rail)"
                strokeLinejoin="round"
                style={{ pathLength: filled }}
              />
            </g>
            <g mask={`url(#${maskId}-nodes)`}>
              {geometry.nodes.map((node, i) => {
                const covered = i < reached;
                return (
                  <circle
                    key={items[i]?.id ?? i}
                    cx={node.x}
                    cy={node.y}
                    r={covered ? 3 : 3.25}
                    strokeWidth="1.25"
                    className={cn(
                      'transition-[fill,stroke] duration-200',
                      covered ? 'fill-[var(--rail)] stroke-[var(--rail)]' : 'rare-rail-toc-node',
                    )}
                  />
                );
              })}
            </g>
          </svg>
        )}

        {geometry && (
          <motion.div
            data-slot="rail-toc-plane"
            className="rare-rail-toc-plane"
            style={{
              x,
              y,
              rotate: reduceMotion ? heading : turn,
            }}
            aria-hidden
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 overflow-visible">
              <path
                d={PLANE}
                fill="currentColor"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
          </motion.div>
        )}

        {items.map((item, i) => {
          const isActive = i === active;
          return (
            <li
              key={item.id}
              ref={(el) => {
                rowRefs.current[i] = el;
              }}
            >
              <button
                type="button"
                onClick={() => select(i)}
                aria-current={isActive ? 'location' : undefined}
                className={cn('rare-rail-toc-button', isActive && 'is-active')}
                style={{
                  paddingLeft: RAIL_X + (item.depth ?? 0) * indent + LABEL_GAP,
                }}
              >
                {item.label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export { RailToc };
export default RailToc;
