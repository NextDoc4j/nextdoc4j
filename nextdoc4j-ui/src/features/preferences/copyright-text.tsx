import type { ReactNode } from 'react';

interface CopyrightTextProps {
  value: string;
}

/**
 * Converts extension-provided copyright text into safe text and HTTP link nodes.
 *
 * @param value Copyright text that may contain simple Markdown links.
 * @returns Text and external-link nodes without raw HTML injection.
 */
const renderCopyrightNodes = (value: string): ReactNode[] => {
  const content = value.includes('Copyright') ? value : `Copyright © ${value}`;
  const links = content.matchAll(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/gu);
  const nodes: ReactNode[] = [];
  let cursor = 0;
  for (const match of links) {
    const index = match.index;
    if (index > cursor) nodes.push(content.slice(cursor, index));
    nodes.push(
      <a href={match[2]} key={`${index}:${match[2]}`} rel="noreferrer" target="_blank">
        {match[1]}
      </a>,
    );
    cursor = index + match[0].length;
  }
  if (cursor < content.length) nodes.push(content.slice(cursor));
  return nodes;
};

/**
 * Renders sanitized extension copyright content for previews and the workspace footer.
 *
 * @param props Extension-provided copyright value.
 * @returns Inline copyright content with safe external links.
 */
export function CopyrightText({ value }: CopyrightTextProps) {
  return <>{renderCopyrightNodes(value)}</>;
}
