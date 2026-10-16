import { useRef, type ComponentProps, type RefObject } from 'react';
import { useMovingHighlight } from './use-moving-highlight';

export function MovingHighlight({
  as: Tag = 'div',
  className = '',
  ...props
}: ComponentProps<'div'> & { as?: 'div' | 'section' }) {
  const ref = useRef<HTMLElement | null>(null);
  useMovingHighlight(ref, '.operation-request__record');
  return (
    <Tag
      {...props}
      ref={ref as RefObject<HTMLDivElement | null>}
      className={`rare-moving-fields ${className}`}
    />
  );
}
