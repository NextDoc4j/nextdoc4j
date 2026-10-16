import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';

import { IconDownload } from '@tabler/icons-react';
import { AnimatedCheck } from '../../components/rare-ui/animated-check';

import { Modal } from '../../components/modal';
import { exportFormatOptions, type ExportFormat } from './export-formats';

interface ExportDialogProps {
  formats?: ExportFormat[];
  onClose: () => void;
  onExport: (format: ExportFormat) => Promise<void>;
  open: boolean;
  summary: ReactNode;
}

interface ExportIconButtonProps {
  disabled?: boolean;
  onClick: () => void;
}

const allExportFormats = exportFormatOptions.map((format) => format.id);

/**
 * Renders the shared icon-only entry used to open a document export dialog.
 *
 * @param props Disabled state and click handler supplied by the owning document view.
 * @returns A compact accessible export button with the common download icon.
 */
export function ExportIconButton({ disabled = false, onClick }: ExportIconButtonProps) {
  return (
    <button
      aria-label="导出文档"
      className="document-export-button"
      disabled={disabled}
      onClick={onClick}
      title="导出文档"
      type="button"
    >
      <IconDownload aria-hidden="true" size={16} stroke={1.8} />
    </button>
  );
}

/**
 * Renders the shared format picker used by OpenAPI and supplementary Markdown documents.
 *
 * @param props Visible state, available formats, export summary and completion callbacks.
 * @returns The common export dialog, or null while the dialog is closed.
 */
export function ExportDialog({
  formats = allExportFormats,
  onClose,
  onExport,
  open,
  summary,
}: ExportDialogProps) {
  const availableFormats = useMemo(
    () => exportFormatOptions.filter((format) => formats.includes(format.id)),
    [formats],
  );
  const [selectedFormatId, setSelectedFormatId] = useState<ExportFormat>(
    availableFormats[0]?.id || 'word',
  );
  const [exporting, setExporting] = useState(false);
  const selectedFormat =
    availableFormats.find((format) => format.id === selectedFormatId) || availableFormats[0];

  useEffect(() => {
    if (!availableFormats.some((format) => format.id === selectedFormatId)) {
      setSelectedFormatId(availableFormats[0]?.id || 'word');
    }
  }, [availableFormats, selectedFormatId]);

  if (!open || !selectedFormat) return null;

  /**
   * Runs the selected export and closes the dialog only after a successful result.
   *
   * @param None; uses the selected format and owning export callback.
   * @returns Promise resolved after the export callback finishes or reports its own failure.
   */
  const confirmExport = async () => {
    setExporting(true);
    try {
      await onExport(selectedFormat.id);
      onClose();
    } catch {
      // The owning page publishes the export failure through the global notification center.
    } finally {
      setExporting(false);
    }
  };

  return (
    <Modal
      mobileSheet
      open={open}
      onClose={onClose}
      title="选择导出格式"
      description="选择一个适合当前场景的导出格式"
      className="export-format-dialog"
      busy={exporting}
      footer={
        <>
          <button disabled={exporting} onClick={onClose} type="button">
            取消
          </button>
          <button
            className="is-primary"
            disabled={exporting}
            onClick={() => void confirmExport()}
            type="button"
          >
            {exporting ? '生成中…' : `导出 ${selectedFormat.label}`}
          </button>
        </>
      }
    >
      <p className="export-modal-description">
        {summary}，将导出为<strong>{selectedFormat.label}</strong>。
      </p>
      <div
        className="export-format-grid"
        style={{ '--export-format-count': availableFormats.length } as CSSProperties}
      >
        {availableFormats.map((format) => (
          <button
            aria-pressed={selectedFormatId === format.id}
            className={`export-format-card ${selectedFormatId === format.id ? 'is-selected' : ''}`}
            disabled={exporting}
            key={format.id}
            onClick={() => setSelectedFormatId(format.id)}
            type="button"
          >
            <span className="export-format-check">
              <AnimatedCheck checked={selectedFormatId === format.id} />
            </span>
            <span className={`export-format-icon is-${format.id}`}>
              <img alt="" src={format.icon} />
            </span>
            <b>{format.label}</b>
            <small>{format.extension}</small>
          </button>
        ))}
      </div>
    </Modal>
  );
}
