import { memo, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CodeBlock } from '../../components/rare-ui/code-block';

import DOMPurify from 'dompurify';
import MarkdownIt from 'markdown-it';

import { enableMarkdownHeadingAnchors } from './markdown-heading';

interface MarkdownContentProps {
  allowHtml?: boolean;
  className?: string;
  content?: string;
}

const markdown = new MarkdownIt({
  breaks: true,
  html: false,
  linkify: true,
  typographer: true,
});
const markdownWithHtml = new MarkdownIt({
  breaks: true,
  html: true,
  linkify: true,
  typographer: true,
});
enableMarkdownHeadingAnchors(markdown);
enableMarkdownHeadingAnchors(markdownWithHtml);

interface MarkdownEnvironment {
  prefix: string;
  codeBlocks: Array<{ code: string; language: string }>;
}

for (const parser of [markdown, markdownWithHtml]) {
  parser.renderer.rules.fence = (tokens, index, _options, env) => {
    const environment = env as MarkdownEnvironment;
    const block = tokens[index];
    const slot = environment.codeBlocks.length;
    environment.codeBlocks.push({
      code: block.content,
      language: block.info.trim().split(/\s+/u)[0] || 'text',
    });
    return `<div data-code-block="${environment.prefix}-${slot}"></div>`;
  };
}

/**
 * Safely renders OpenAPI Markdown descriptions.
 *
 * @param props Component content and optional layout classes.
 * @returns Sanitized Markdown markup, or null for empty content.
 */
function MarkdownContentContent({
  allowHtml = false,
  className = '',
  content,
}: MarkdownContentProps) {
  const prefix = useId();
  const markupRef = useRef<HTMLDivElement>(null);
  const [targets, setTargets] = useState<HTMLElement[]>([]);
  const { html, codeBlocks } = useMemo(() => {
    if (!content?.trim()) return { html: '', codeBlocks: [] };
    const parser = allowHtml ? markdownWithHtml : markdown;
    const environment: MarkdownEnvironment = { prefix, codeBlocks: [] };
    const html = DOMPurify.sanitize(
      parser.render(content, environment).replaceAll('&lt;br&gt;', '<br>'),
      {
        FORBID_ATTR: ['style'],
        FORBID_TAGS: ['base', 'embed', 'form', 'iframe', 'object', 'script'],
        USE_PROFILES: { html: true },
      },
    );
    return { html, codeBlocks: environment.codeBlocks };
  }, [allowHtml, content, prefix]);
  const markup = useMemo(() => ({ __html: html }), [html]);

  useLayoutEffect(() => {
    setTargets(
      [...(markupRef.current?.querySelectorAll<HTMLElement>('[data-code-block]') ?? [])].filter(
        (element) => element.dataset.codeBlock?.startsWith(`${prefix}-`),
      ),
    );
  }, [html, prefix]);

  if (!html) return null;

  return (
    <div className={`markdown-content ${className}`}>
      <div ref={markupRef} dangerouslySetInnerHTML={markup} />
      {targets.map((target) => {
        const index = Number(target.dataset.codeBlock?.slice(prefix.length + 1));
        const block = codeBlocks[index];
        return block
          ? createPortal(
              <CodeBlock code={block.code} language={block.language} accent="#4f46e5" />,
              target,
              `${prefix}-${index}`,
            )
          : null;
      })}
    </div>
  );
}

export const MarkdownContent = memo(MarkdownContentContent);
