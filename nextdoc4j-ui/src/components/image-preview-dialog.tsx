import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { IconCheck, IconCopy, IconDownload, IconLink, IconPhoto, IconX } from '@tabler/icons-react';
import { formatImageBytes, type Base64ImageInfo } from '../utils/base64-image';

export interface ImagePreviewDialogProps {
  open: boolean;
  onClose: () => void;
  images: Base64ImageInfo[];
  initialFocusKeyPath?: string;
}

export function ImagePreviewDialog({
  open,
  onClose,
  images,
  initialFocusKeyPath,
}: ImagePreviewDialogProps) {
  const [bgModes, setBgModes] = useState<Record<string, 'checker' | 'white' | 'dark'>>({});
  const [zoomedKeys, setZoomedKeys] = useState<Record<string, boolean>>({});
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimerRef = useRef<number | undefined>(undefined);

  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Focus management & Focus trap
  useEffect(() => {
    if (!open) return;

    previousActiveElement.current = document.activeElement as HTMLElement | null;

    // Focus close button initially
    const focusTimer = window.setTimeout(() => {
      closeBtnRef.current?.focus();
    }, 30);

    const prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }

      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = Array.from(
          dialogRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
          ),
        ).filter((el) => el.offsetParent !== null);

        if (focusable.length === 0) return;

        const firstEl = focusable[0];
        const lastEl = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (
            document.activeElement === firstEl ||
            !dialogRef.current.contains(document.activeElement)
          ) {
            e.preventDefault();
            lastEl.focus();
          }
        } else {
          if (
            document.activeElement === lastEl ||
            !dialogRef.current.contains(document.activeElement)
          ) {
            e.preventDefault();
            firstEl.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);

    return () => {
      window.clearTimeout(focusTimer);
      document.documentElement.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown, true);
      // Restore focus to trigger element
      if (
        previousActiveElement.current &&
        typeof previousActiveElement.current.focus === 'function'
      ) {
        previousActiveElement.current.focus();
      }
    };
  }, [open, onClose]);

  // Auto-scroll to target image card if initialFocusKeyPath provided
  useEffect(() => {
    if (!open || !initialFocusKeyPath) return;
    const timer = window.setTimeout(() => {
      const el = document.getElementById(`img-card-${initialFocusKeyPath}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 60);
    return () => window.clearTimeout(timer);
  }, [open, initialFocusKeyPath]);

  const showToast = (msg: string) => {
    window.clearTimeout(toastTimerRef.current);
    setToastMsg(msg);
    toastTimerRef.current = window.setTimeout(() => setToastMsg(null), 2000);
  };

  const copyText = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(`已复制 ${label}`);
    } catch {
      showToast('复制失败，请手动复制');
    }
  };

  const downloadImage = (img: Base64ImageInfo) => {
    const a = document.createElement('a');
    a.href = img.dataUrl;
    const safeName = (img.keyPath || 'image').replace(/[^a-zA-Z0-9_-]/g, '_');
    const ext = img.format.toLowerCase() === 'jpeg' ? 'jpg' : img.format.toLowerCase();
    a.download = `${safeName}.${ext || 'png'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast(`已开始下载 (${a.download})`);
  };

  const toggleZoom = (key: string) => {
    setZoomedKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const setCardBg = (key: string, mode: 'checker' | 'white' | 'dark') => {
    setBgModes((prev) => ({ ...prev, [key]: mode }));
  };

  if (!open || images.length === 0) return null;

  return createPortal(
    <div className="image-dialog-overlay" onClick={onClose}>
      {toastMsg && (
        <div className="image-dialog-toast" role="status" aria-live="polite">
          <IconCheck size={14} stroke={2.5} />
          <span>{toastMsg}</span>
        </div>
      )}

      <div
        ref={dialogRef}
        className={`image-dialog ${images.length === 1 ? 'image-dialog--single' : 'image-dialog--multi'}`}
        role="dialog"
        aria-modal="true"
        aria-label="响应图片预览"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="image-dialog__header">
          <div className="image-dialog__title-area">
            <span className="image-dialog__title">
              <IconPhoto size={16} stroke={2} aria-hidden="true" />
              响应图片预览
            </span>
            <span className="image-dialog__count-badge">共 {images.length} 张图片</span>
          </div>

          <button
            ref={closeBtnRef}
            className="image-dialog__close-btn"
            onClick={onClose}
            title="关闭 (Esc)"
            aria-label="关闭预览"
            type="button"
          >
            <IconX size={15} stroke={2} />
          </button>
        </div>

        {/* Scrollable Body: Image Cards Stream (min-height: 0 ensures full scroll without clipping) */}
        <div className="image-dialog__body">
          {images.map((img) => {
            const bgMode = bgModes[img.keyPath] || 'checker';
            const isZoomed = Boolean(zoomedKeys[img.keyPath]);

            return (
              <div className="image-node-card" id={`img-card-${img.keyPath}`} key={img.keyPath}>
                {/* Top: JSON Node Path & Metadata */}
                <div className="image-node-card__header">
                  <div className="image-node-card__path">
                    <code>{img.keyPath}</code>
                  </div>
                  <div className="image-node-card__meta">
                    <span className="meta-tag meta-tag--format">{img.format}</span>
                    <span className="meta-tag">{formatImageBytes(img.approxBytes)}</span>
                  </div>
                </div>

                {/* Middle: Image Viewport with Checkerboard Background */}
                <div className={`image-node-card__viewport bg--${bgMode}`}>
                  <img
                    src={img.dataUrl}
                    alt={img.keyPath}
                    className={`image-node-card__img ${isZoomed ? 'is-zoomed' : ''}`}
                    onClick={() => toggleZoom(img.keyPath)}
                    title="点击放大/还原"
                    loading="lazy"
                  />
                </div>

                {/* Bottom: Quick Operations & Tools Toolbar */}
                <div className="image-node-card__footer">
                  <div className="card-actions-left">
                    <button
                      className="card-action-btn"
                      onClick={() => copyText(img.rawBase64, 'Base64 纯文本')}
                      type="button"
                      title="复制去除前缀的纯 Base64 Payload"
                    >
                      <IconCopy size={13} stroke={1.8} />
                      <span>复制 Base64</span>
                    </button>

                    <button
                      className="card-action-btn"
                      onClick={() => copyText(img.dataUrl, 'DataURL')}
                      type="button"
                      title="复制完整 data:image/... URI"
                    >
                      <IconLink size={13} stroke={1.8} />
                      <span>复制 DataURL</span>
                    </button>

                    <button
                      className="card-action-btn card-action-btn--primary"
                      onClick={() => downloadImage(img)}
                      type="button"
                      title="下载并保存到本地"
                    >
                      <IconDownload size={13} stroke={2} />
                      <span>下载图片</span>
                    </button>
                  </div>

                  <div className="card-actions-right">
                    <button
                      className={`card-action-btn ${isZoomed ? 'card-action-btn--active' : ''}`}
                      onClick={() => toggleZoom(img.keyPath)}
                      type="button"
                      title="切换原始尺寸或适应视口"
                    >
                      {isZoomed ? '适应' : '1:1 原图'}
                    </button>

                    <div className="bg-switcher-group" title="切换背景透明显色">
                      <button
                        className={`bg-switch-btn ${bgMode === 'checker' ? 'is-active' : ''}`}
                        onClick={() => setCardBg(img.keyPath, 'checker')}
                        type="button"
                        title="透明棋盘格显色"
                      >
                        🏁
                      </button>
                      <button
                        className={`bg-switch-btn ${bgMode === 'white' ? 'is-active' : ''}`}
                        onClick={() => setCardBg(img.keyPath, 'white')}
                        type="button"
                        title="浅色纯白背景"
                      >
                        ⬜
                      </button>
                      <button
                        className={`bg-switch-btn ${bgMode === 'dark' ? 'is-active' : ''}`}
                        onClick={() => setCardBg(img.keyPath, 'dark')}
                        type="button"
                        title="深色纯黑背景"
                      >
                        ⬛
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>,
    document.body,
  );
}
