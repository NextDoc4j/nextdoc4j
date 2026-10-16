import { createOpenApiMarkdown } from './markdown';
import type { OpenApiDocument } from '../../types/openapi';

/**
 * Removes lightweight Markdown markers before text is written to a Word paragraph.
 *
 * @param value Markdown inline text containing emphasis, links or inline code.
 * @returns Plain readable text suitable for a Word text run.
 */
const stripInlineMarkdown = (value: string) =>
  value
    .replaceAll(/<img\b[^>]*\balt=["']([^"']*)["'][^>]*>/giu, '$1')
    .replaceAll(/<br\s*\/?>/giu, '\n')
    .replaceAll(/<[^>]+>/gu, '')
    .replaceAll(/\[([^\]]+)\]\(#[^)]+\)/g, '$1')
    .replaceAll(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)')
    .replaceAll(/[*_~`]/gu, '')
    .trim();

/**
 * Builds a .docx Blob from the canonical Markdown export representation.
 *
 * @param input Canonical Markdown text or an OpenAPI document retained for compatibility callers.
 * @param documentTitle Optional document title used in generated Word metadata.
 * @returns Promise resolving to a browser-downloadable Word document Blob.
 */
export const createOpenApiWordBlob = async (
  input: OpenApiDocument | string,
  documentTitle?: string,
): Promise<Blob> => {
  const docx = await import('docx');
  const markdown = typeof input === 'string' ? input : createOpenApiMarkdown(input);
  const title = documentTitle || (typeof input === 'string' ? 'OpenAPI 文档' : input.info?.title);
  const children: Array<InstanceType<typeof docx.Paragraph> | InstanceType<typeof docx.Table>> = [];
  const lines = markdown.split('\n');
  let inCodeBlock = false;
  let codeLanguage = '';

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]!;
    if (line.startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      codeLanguage = inCodeBlock ? line.slice(3).trim() : '';
      continue;
    }
    if (inCodeBlock) {
      children.push(
        new docx.Paragraph({
          children: [
            new docx.TextRun({
              color: '243447',
              font: 'Consolas',
              size: 18,
              text: line || ' ',
            }),
          ],
          shading: { fill: 'F3F5F8', type: docx.ShadingType.CLEAR },
          spacing: { after: 0, before: codeLanguage ? 20 : 0 },
        }),
      );
      codeLanguage = '';
      continue;
    }

    const markdownHeading = /^(#{1,6})\s+(.+)$/u.exec(line);
    const htmlHeading = /^<h([1-6])(?:\s[^>]*)?>(.*?)<\/h\1>$/iu.exec(line.trim());
    if (markdownHeading || htmlHeading) {
      const headingLevels = [
        docx.HeadingLevel.TITLE,
        docx.HeadingLevel.HEADING_1,
        docx.HeadingLevel.HEADING_2,
        docx.HeadingLevel.HEADING_3,
        docx.HeadingLevel.HEADING_4,
        docx.HeadingLevel.HEADING_5,
      ];
      const headingIndex = markdownHeading
        ? markdownHeading[1].length - 1
        : Number(htmlHeading![1]) - 1;
      const headingText = markdownHeading?.[2] || htmlHeading![2];
      children.push(
        new docx.Paragraph({
          heading: headingLevels[headingIndex],
          text: stripInlineMarkdown(headingText),
        }),
      );
      continue;
    }

    if (line.startsWith('|') && lines[index + 1]?.match(/^\|(?:\s*:?-+:?\s*\|)+$/u)) {
      const tableLines = [line];
      index += 2;
      while (index < lines.length && lines[index]?.startsWith('|')) {
        tableLines.push(lines[index]!);
        index += 1;
      }
      index -= 1;
      children.push(
        new docx.Table({
          rows: tableLines.map(
            (row, rowIndex) =>
              new docx.TableRow({
                children: row
                  .slice(1, -1)
                  .split('|')
                  .map(
                    (cell) =>
                      new docx.TableCell({
                        children: [
                          new docx.Paragraph({
                            children: [
                              new docx.TextRun({
                                bold: rowIndex === 0,
                                text: stripInlineMarkdown(cell.trim()),
                              }),
                            ],
                          }),
                        ],
                        shading: rowIndex === 0 ? { fill: 'EEF2F7' } : undefined,
                      }),
                  ),
              }),
          ),
          width: { size: 100, type: docx.WidthType.PERCENTAGE },
        }),
      );
      continue;
    }

    if (/^-\s+/u.test(line)) {
      children.push(
        new docx.Paragraph({
          bullet: { level: 0 },
          text: stripInlineMarkdown(line.replace(/^-\s+/u, '')),
        }),
      );
      continue;
    }
    if (line.trim() === '---') continue;
    if (line.startsWith('> ')) {
      children.push(
        new docx.Paragraph({
          children: [
            new docx.TextRun({
              color: '52657A',
              italics: true,
              text: stripInlineMarkdown(line.slice(2)),
            }),
          ],
        }),
      );
      continue;
    }
    const plainLine = stripInlineMarkdown(line);
    if (plainLine) {
      children.push(new docx.Paragraph({ text: plainLine }));
    }
  }

  const wordDocument = new docx.Document({
    sections: [{ children }],
    title: title || 'OpenAPI 文档',
  });
  return docx.Packer.toBlob(wordDocument);
};
