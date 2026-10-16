import type MarkdownIt from 'markdown-it';

/**
 * Converts a Markdown heading into the stable fragment identifier used by exported directories.
 *
 * @param value Visible Markdown heading text.
 * @returns Lowercase Unicode-safe fragment identifier.
 */
export const createMarkdownHeadingId = (value: string) =>
  value
    .normalize('NFKC')
    .toLocaleLowerCase()
    .replaceAll(/[`*_~]/gu, '')
    .replaceAll(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replaceAll(/^-+|-+$/gu, '') || 'section';

/**
 * Adds deterministic id attributes to headings rendered by one MarkdownIt instance.
 *
 * @param parser MarkdownIt parser used by browser preview or standalone HTML export.
 * @returns Nothing; installs a heading renderer rule on the supplied parser.
 */
export const enableMarkdownHeadingAnchors = (parser: MarkdownIt) => {
  parser.renderer.rules.heading_open = (tokens, index, options, _environment, renderer) => {
    const heading = tokens[index]!;
    const content = tokens[index + 1]?.content || '';
    heading.attrSet('id', createMarkdownHeadingId(content));
    return renderer.renderToken(tokens, index, options);
  };
};
