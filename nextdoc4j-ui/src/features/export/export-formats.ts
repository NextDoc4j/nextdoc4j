import exportHtmlIcon from '../../assets/export/doc-export-html.svg';
import exportMarkdownIcon from '../../assets/export/doc-export-markdown.svg';
import exportOpenApiIcon from '../../assets/export/doc-export-openapi.svg';
import exportPdfIcon from '../../assets/export/doc-export-pdf.svg';
import exportWordIcon from '../../assets/export/doc-export-word.svg';

export type ExportFormat = 'html' | 'json' | 'markdown' | 'pdf' | 'word';

export interface ExportFormatOption {
  extension: string;
  icon: string;
  id: ExportFormat;
  label: string;
}

export const exportFormatOptions: ExportFormatOption[] = [
  { extension: '.docx', icon: exportWordIcon, id: 'word', label: 'Word 文档' },
  { extension: '.pdf', icon: exportPdfIcon, id: 'pdf', label: 'PDF 文档' },
  { extension: '.md', icon: exportMarkdownIcon, id: 'markdown', label: 'Markdown' },
  { extension: '.html', icon: exportHtmlIcon, id: 'html', label: 'HTML 网页' },
  { extension: '.json', icon: exportOpenApiIcon, id: 'json', label: 'OpenAPI 规范' },
];
