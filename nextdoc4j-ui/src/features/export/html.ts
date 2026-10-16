import DOMPurify from 'dompurify';
import MarkdownIt from 'markdown-it';

import { enableMarkdownHeadingAnchors } from '../documentation/markdown-heading';
import { createOpenApiMarkdown } from './markdown';
import type { OpenApiDocument } from '../../types/openapi';
import type { ExportDocumentModel } from './types';

const markdown = new MarkdownIt({ breaks: true, html: false, linkify: true, typographer: true });
const markdownWithHtml = new MarkdownIt({
  breaks: true,
  html: true,
  linkify: true,
  typographer: true,
});
enableMarkdownHeadingAnchors(markdown);
enableMarkdownHeadingAnchors(markdownWithHtml);

/**
 * Wraps rendered Markdown in the printable standalone document shared by HTML and PDF exports.
 *
 * @param title Human-readable document title written into the browser metadata.
 * @param content Rendered and sanitized document body markup.
 * @returns Complete standalone HTML with embedded document styles.
 */
const createStandaloneHtml = (title: string, content: string) => `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${markdown.utils.escapeHtml(title)}</title>
    <style>
      :root { color: #172033; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif; }
      body { box-sizing: border-box; line-height: 1.65; margin: 0 auto; max-width: 1080px; padding: 40px 32px; -webkit-font-smoothing: antialiased; }
      h1, h2, h3, h4, h5, h6 { color: #18223a; line-height: 1.25; margin-top: 1.7em; }
      h1 { border-bottom: 2px solid #4f46e5; padding-bottom: 12px; }
      h2 { border-bottom: 1px solid #dbe1ee; padding-bottom: 8px; }
      h3, h4, h5, h6 { break-after: avoid; }
      img { height: auto; max-width: 100%; }
      table { border-collapse: collapse; display: block; max-width: 100%; overflow-x: auto; width: 100%; }
      th, td { border: 1px solid #dbe1ee; line-height: 1.65; min-width: 72px; overflow-wrap: anywhere; padding: 8px 10px; text-align: left; vertical-align: top; white-space: normal; }
      th:last-child, td:last-child { min-width: 220px; }
      th { background: #f6f7fb; }
      code { background: #f1f3f8; border-radius: 4px; font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Consolas, monospace; padding: 2px 5px; }
      pre { background: #111827; border-radius: 8px; color: #f8fafc; overflow: auto; padding: 16px; }
      pre code { background: transparent; padding: 0; }
      @media print { body { max-width: none; padding: 16px; } h1, h2, h3, h4, h5, h6 { break-after: avoid; } table, pre { break-inside: avoid; } }
    </style>
  </head>
  <body>${content}</body>
</html>`;

/**
 * Creates a self-contained HTML document from an OpenAPI subset.
 *
 * @param input Prepared export model or OpenAPI subset containing selected operations.
 * @returns Printable standalone HTML with embedded documentation styles.
 */
export const createOpenApiHtml = (input: ExportDocumentModel | OpenApiDocument) => {
  const title =
    'title' in input && 'document' in input ? input.title : input.info?.title || 'OpenAPI 文档';
  const content = markdown.render(createOpenApiMarkdown(input)).replaceAll('&lt;br&gt;', '<br>');
  return createStandaloneHtml(title, content);
};

/**
 * Creates a sanitized self-contained HTML document from supplementary Markdown content.
 *
 * @param content Markdown source that may contain safe embedded HTML tags.
 * @param title Human-readable supplementary-document title.
 * @returns Printable standalone HTML preserving allowed Markdown and HTML markup.
 */
export const createMarkdownHtml = (content: string, title: string) => {
  const renderedContent = markdownWithHtml.render(content).replaceAll('&lt;br&gt;', '<br>');
  const sanitizedContent = DOMPurify.sanitize(renderedContent, {
    FORBID_ATTR: ['style'],
    FORBID_TAGS: ['base', 'embed', 'form', 'iframe', 'object', 'script'],
    USE_PROFILES: { html: true },
  });
  return createStandaloneHtml(title, sanitizedContent);
};
