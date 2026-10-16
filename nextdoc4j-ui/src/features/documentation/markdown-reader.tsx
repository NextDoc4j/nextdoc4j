import { AnimatedDetails } from '../../components/rare-ui/height-transition';
import { RailToc, type RailTocItem } from '../../components/rare-ui/rail-toc';
import { useNotification } from '../../lib/notifications';
import { useLayoutEffect, useRef, useState } from 'react';

import { IconClock, IconFileText } from '@tabler/icons-react';

import { MarkdownContent } from './markdown-content';
import type { MarkdownDocument } from './markdown';
import { downloadBlob, printHtml } from '../export/browser-download';
import { ExportDialog, ExportIconButton } from '../export/export-dialog';
import { exportFormatOptions, type ExportFormat } from '../export/export-formats';
import { createMarkdownHtml } from '../export/html';
import { createExportFileName } from '../export/openapi-subset';
import { createOpenApiWordBlob } from '../export/word';

interface MarkdownReaderProps {
  document?: MarkdownDocument;
}

const markdownExportFormats: ExportFormat[] = ['word', 'pdf', 'markdown', 'html'];

/**
 * Formats a supplementary-document timestamp without changing its source timezone.
 *
 * @param value Timestamp supplied by the document metadata.
 * @returns A compact readable timestamp, or a placeholder when no timestamp exists.
 */
const formatMarkdownLastModified = (value?: string) => {
  if (!value) return '-';
  const [date, time] = value.split('T');
  if (!time) return value;
  return `${date} ${time.replace(/\.\d+(?:Z)?$/u, '').replace(/Z$/u, '')}`;
};

/**
 * Formats a Markdown document byte count while preserving an existing unit label.
 *
 * @param value Raw byte count or formatted value supplied by the document metadata.
 * @returns A readable size with one unit and no duplicated byte suffix.
 */
const formatMarkdownContentLength = (value: number | string) => {
  if (typeof value === 'string') {
    const normalized = value.trim().replace(/\b(KB|MB|GB|TB)\s+B$/iu, '$1');
    if (!/^\d+(?:\.\d+)?$/u.test(normalized)) return normalized || '-';
    value = Number(normalized);
  }

  if (!Number.isFinite(value) || value < 0) return `${value} B`;
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let amount = value;
  let unitIndex = 0;
  while (amount >= 1024 && unitIndex < units.length - 1) {
    amount /= 1024;
    unitIndex += 1;
  }
  const formattedAmount = new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 2 }).format(
    amount,
  );
  return `${formattedAmount} ${units[unitIndex]}`;
};

/**
 * Renders the supplementary-document reader and its scroll-synced table of contents.
 *
 * @param props Markdown document selected through the shared navigation tree.
 * @returns A reading card with persistent metadata and a hierarchical document outline.
 */
export function MarkdownReader({ document: markdownDocument }: MarkdownReaderProps) {
  const readingContainerRef = useRef<HTMLElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [tocItems, setTocItems] = useState<RailTocItem[]>([]);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const setExportMessage = useNotification();

  useLayoutEffect(() => {
    const content = contentRef.current;
    readingContainerRef.current = content?.closest('main') ?? null;
    const headings = [...(content?.querySelectorAll<HTMLElement>('h1, h2, h3, h4, h5, h6') ?? [])];
    const items: RailTocItem[] = [];
    const ancestors: number[] = [];
    for (const [index, heading] of headings.entries()) {
      const label = heading.textContent?.trim();
      if (!label) continue;
      const level = Number(heading.tagName.slice(1));
      while (ancestors.length && ancestors[ancestors.length - 1] >= level) ancestors.pop();
      heading.id = `markdown-heading-${index}`;
      items.push({ id: heading.id, label, depth: ancestors.length });
      ancestors.push(level);
    }
    setTocItems(items);
  }, [markdownDocument?.content]);

  if (!markdownDocument) {
    return (
      <div className="legacy-markdown">
        <div className="legacy-markdown__missing">
          <IconFileText aria-hidden="true" size={30} stroke={1.6} />
          <h1>未找到附加文档</h1>
          <p>该链接对应的文档可能已被移除或改名。</p>
        </div>
      </div>
    );
  }

  const contentLength =
    markdownDocument.contentLength ?? new TextEncoder().encode(markdownDocument.content).byteLength;
  /**
   * Exports the active supplementary Markdown document in the selected reusable dialog format.
   *
   * @param format Word, PDF, Markdown, or HTML format selected by the reader.
   * @returns Promise resolved after a download starts or the browser print flow opens.
   */
  const exportMarkdownDocument = async (format: ExportFormat) => {
    try {
      if (format === 'markdown') {
        downloadBlob(
          new Blob([markdownDocument.content], { type: 'text/markdown;charset=utf-8' }),
          createExportFileName(markdownDocument.displayName, markdownDocument.group, 'md'),
        );
        setExportMessage('已下载 Markdown 文档。');
      } else if (format === 'html') {
        downloadBlob(
          new Blob([createMarkdownHtml(markdownDocument.content, markdownDocument.displayName)], {
            type: 'text/html;charset=utf-8',
          }),
          createExportFileName(markdownDocument.displayName, markdownDocument.group, 'html'),
        );
        setExportMessage('已下载独立 HTML 文档。');
      } else if (format === 'pdf') {
        setExportMessage(
          printHtml(createMarkdownHtml(markdownDocument.content, markdownDocument.displayName))
            ? '已打开打印窗口，请在系统打印面板中另存为 PDF。'
            : '浏览器拦截了打印窗口，请允许弹窗后重试。',
        );
      } else {
        setExportMessage('正在生成 Word 文档…');
        downloadBlob(
          await createOpenApiWordBlob(markdownDocument.content, markdownDocument.displayName),
          createExportFileName(markdownDocument.displayName, markdownDocument.group, 'docx'),
        );
        setExportMessage('已下载 Word 文档。');
      }
    } catch (error) {
      const selectedFormat = exportFormatOptions.find((item) => item.id === format);
      setExportMessage(`${selectedFormat?.label || '文档'}生成失败，请重试。`);
      throw error;
    }
  };

  return (
    <div className="legacy-markdown">
      <div className="legacy-markdown__page">
        <AnimatedDetails
          className="legacy-markdown__mobile-toc"
          summary="本文目录"
          persistentContent={<ExportIconButton onClick={() => setExportDialogOpen(true)} />}
        >
          <div className="legacy-markdown__mobile-toc-content">
            {tocItems.length > 0 ? (
              <RailToc items={tocItems} containerRef={readingContainerRef} offset={88} />
            ) : (
              <p>暂无目录</p>
            )}
          </div>
        </AnimatedDetails>

        <article className="legacy-markdown__content">
          <header className="legacy-markdown__document-bar">
            <div className="legacy-markdown__document-name">
              <IconFileText aria-hidden="true" size={17} stroke={1.8} />
              <span>{markdownDocument.displayName}</span>
            </div>
            <div aria-label="文档信息" className="legacy-markdown__meta">
              <span title={markdownDocument.lastModified}>
                <IconClock aria-hidden="true" size={14} stroke={1.8} />
                更新时间：
                <time dateTime={markdownDocument.lastModified}>
                  {formatMarkdownLastModified(markdownDocument.lastModified)}
                </time>
              </span>
              <span>
                <IconFileText aria-hidden="true" size={14} stroke={1.8} />
                文件大小：{formatMarkdownContentLength(contentLength)}
              </span>
            </div>
          </header>
          <div className="legacy-markdown__body" ref={contentRef}>
            <MarkdownContent allowHtml content={markdownDocument.content} />
          </div>
        </article>

        <aside aria-label="本文目录" className="legacy-markdown__toc">
          <div className="legacy-markdown__rail-actions">
            <span>{tocItems.length} 个章节</span>
            <ExportIconButton onClick={() => setExportDialogOpen(true)} />
          </div>
          <div className="legacy-markdown__toc-scroll workspace-scrollbar">
            {tocItems.length > 0 ? (
              <RailToc items={tocItems} containerRef={readingContainerRef} offset={88} />
            ) : (
              <p>暂无目录</p>
            )}
          </div>
        </aside>
      </div>
      <ExportDialog
        formats={markdownExportFormats}
        onClose={() => setExportDialogOpen(false)}
        onExport={exportMarkdownDocument}
        open={exportDialogOpen}
        summary={
          <>
            当前文档 <strong>{markdownDocument.displayName}</strong>
          </>
        }
      />
    </div>
  );
}
