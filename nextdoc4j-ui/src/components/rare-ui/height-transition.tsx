// Adapted from Rare UI web-search Collapse (https://rareui.com), copyright (c) 2026 Swami Malode.
// MIT + Commons Clause + Attribution; see ./LICENSE.
import { motion } from 'motion/react';
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from 'react';
import { useReducedMotion } from './use-reduced-motion';
import { UI_MOTION } from './motion-timing';

/** Measures real content height, including later changes, and hides collapsed focus targets. */
export function HeightTransition({
  open = true,
  children,
  className = '',
  id,
  as = 'div',
  contentClassName = '',
  disabled,
  unmountOnExit = false,
}: {
  open?: boolean;
  children: ReactNode;
  className?: string;
  id?: string;
  as?: 'div' | 'fieldset';
  contentClassName?: string;
  disabled?: boolean;
  unmountOnExit?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number>();
  const reduced = useReducedMotion();
  const [retained, setRetained] = useState(open);
  useEffect(() => {
    if (!unmountOnExit) return;
    if (open) setRetained(true);
    else {
      const timer = setTimeout(() => setRetained(false), reduced ? 0 : UI_MOTION.collapse);
      return () => clearTimeout(timer);
    }
  }, [open, reduced, unmountOnExit]);
  const Tag = as === 'fieldset' ? motion.fieldset : motion.div;
  useLayoutEffect(() => {
    const content = ref.current;
    if (!content) return;
    const measure = () => {
      const style = getComputedStyle(content);
      setHeight(
        content.offsetHeight +
          (parseFloat(style.marginTop) || 0) +
          (parseFloat(style.marginBottom) || 0),
      );
    };
    measure();
    const observer =
      typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(measure);
    observer?.observe(content);
    return () => observer?.disconnect();
  }, [open]);
  return (
    <Tag
      className={`rare-height-transition ${className}`}
      id={id}
      aria-hidden={!open || undefined}
      inert={!open}
      disabled={disabled}
      initial={false}
      style={reduced ? { height: open ? 'auto' : 0, opacity: open ? 1 : 0 } : undefined}
      animate={
        reduced ? undefined : { height: open ? (height ?? 'auto') : 0, opacity: open ? 1 : 0 }
      }
      transition={{ duration: reduced ? 0 : UI_MOTION.collapse / 1000, ease: UI_MOTION.ease }}
    >
      <div className={`rare-height-content ${contentClassName}`} ref={ref}>
        {(!unmountOnExit || open || (retained && !reduced)) && children}
      </div>
    </Tag>
  );
}

/** Retains native details semantics and its content while a closing transition finishes. */
export function AnimatedDetails({
  summary,
  children,
  defaultOpen = false,
  className = '',
  unmountOnExit = false,
  persistentContent,
  ...props
}: Omit<ComponentProps<'details'>, 'open' | 'onToggle'> & {
  summary: ReactNode;
  defaultOpen?: boolean;
  unmountOnExit?: boolean;
  persistentContent?: ReactNode;
}) {
  const [expanded, setExpanded] = useState(defaultOpen);
  const [closing, setClosing] = useState(false);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (!closing) return;
    const timer = setTimeout(() => setClosing(false), reduced ? 0 : UI_MOTION.collapse);
    return () => clearTimeout(timer);
  }, [closing, reduced]);
  return (
    <details
      {...props}
      className={`rare-details ${className}`}
      open={expanded || closing}
      data-expanded={expanded}
    >
      <summary
        aria-expanded={expanded}
        onClick={(event) => {
          event.preventDefault();
          setClosing(expanded && !reduced);
          setExpanded(!expanded);
        }}
      >
        {summary}
      </summary>
      {persistentContent}
      <HeightTransition open={expanded} unmountOnExit={unmountOnExit}>
        {children}
      </HeightTransition>
    </details>
  );
}
