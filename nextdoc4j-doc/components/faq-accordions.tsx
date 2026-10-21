'use client';

import { Accordions } from 'fumadocs-ui/components/accordion';
import { type ComponentProps, useEffect, useRef, useState } from 'react';

type FaqAccordionsProps = Pick<ComponentProps<typeof Accordions>, 'children' | 'defaultValue'>;

export function FaqAccordions({ children, defaultValue = [] }: FaqAccordionsProps) {
  const root = useRef<HTMLDivElement>(null);
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    const reveal = () => {
      let id: string;
      try {
        id = decodeURIComponent(window.location.hash.slice(1));
      } catch {
        return;
      }
      const heading = document.getElementById(id);
      const selected = heading?.getAttribute('data-accordion-value');
      if (!heading || !selected || !root.current?.contains(heading)) return;
      setValue((previous) => previous.includes(selected) ? previous : [...previous, selected]);
    };

    // Decode Chinese anchors and also reveal answers after in-page navigation.
    reveal();
    window.addEventListener('hashchange', reveal);
    return () => window.removeEventListener('hashchange', reveal);
  }, []);

  return (
    <Accordions ref={root} multiple value={value} onValueChange={setValue}>
      {children}
    </Accordions>
  );
}
