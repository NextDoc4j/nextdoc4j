import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { IconChevronDown, IconFileText, IconPlayerPlay } from '@tabler/icons-react';
import { HeroCopyButton, type HeroCopyStatus } from '../../components/rare-ui/hero-copy-button';
import { HeightTransition } from '../../components/rare-ui/height-transition';
import { resolveRequestBase } from '../../lib/http';
import { SecurityMetadata } from '../security/security-metadata';
import { MarkdownContent } from './markdown-content';
import type { ApiOperation, OpenApiDocument } from '../../types/openapi';

const methodBackgrounds: Record<string, string> = {
  delete: '#b94e64',
  get: '#23804e',
  patch: '#a86a1f',
  post: '#2677b7',
  put: '#7254aa',
};

/**
 * Displays a height-aware Markdown description with a compact, non-interactive preview.
 *
 * @param props The current operation's Markdown description.
 * @returns Full Markdown for short content, or an expandable preview for long content.
 */
function OperationDescription({ content }: { content: string }) {
  const contentId = useId();
  const contentRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);
  const [preview, setPreview] = useState('');
  const collapsed = overflowing && !expanded;

  useLayoutEffect(() => {
    const element = contentRef.current;
    if (!element) return;
    setExpanded(false);

    /**
     * Measures rendered Markdown and derives a preview from already sanitized content.
     *
     * @param None; reads the description element captured by this effect.
     * @returns Nothing; updates overflow state and a preview without hidden focus targets.
     */
    const measureDescription = () => {
      const markdown = element.firstElementChild;
      if (!markdown) return;
      const long = element.scrollHeight > 112;
      setOverflowing(long);
      if (!long) return;
      const clone = markdown.cloneNode(true) as HTMLElement;
      [...clone.children].slice(2).forEach((child) => child.remove());
      clone.querySelectorAll('img, .markdown-heading-anchor').forEach((child) => child.remove());
      clone.querySelectorAll('[id]').forEach((child) => child.removeAttribute('id'));
      clone.querySelectorAll('a').forEach((link) => link.replaceWith(...link.childNodes));
      const walker = globalThis.document.createTreeWalker(clone, NodeFilter.SHOW_TEXT);
      let remaining = Math.max(70, Math.min(200, Math.floor(element.clientWidth / 13) * 3));
      let node = walker.nextNode();
      while (node) {
        const length = node.textContent?.length ?? 0;
        if (length > remaining) {
          const range = globalThis.document.createRange();
          range.setStart(node, remaining);
          range.setEnd(clone, clone.childNodes.length);
          range.deleteContents();
          break;
        }
        remaining -= length;
        node = walker.nextNode();
      }
      if ((markdown.textContent?.length ?? 0) > (clone.textContent?.length ?? 0)) {
        (clone.lastElementChild || clone).append('…');
      }
      setPreview(clone.innerHTML);
    };

    measureDescription();
    const observer = new ResizeObserver(measureDescription);
    observer.observe(element);
    return () => observer.disconnect();
  }, [content]);

  return (
    <div className="hero-description" aria-label="接口描述">
      <HeightTransition className="hero-description__viewport">
        <div
          aria-hidden={collapsed}
          className={`hero-description__content hero-description__content-full${collapsed ? ' is-collapsed' : ''}`}
          id={contentId}
          inert={collapsed}
          ref={contentRef}
        >
          <MarkdownContent content={content} />
        </div>
        {collapsed && (
          <div
            className="hero-description__content hero-description__content-preview"
            dangerouslySetInnerHTML={{ __html: preview }}
          />
        )}
      </HeightTransition>
      {overflowing && (
        <button
          aria-controls={contentId}
          aria-expanded={expanded}
          className="hero-description__toggle"
          onClick={() => setExpanded((value) => !value)}
          type="button"
        >
          {expanded ? '收起描述' : '展开完整描述'}
          <IconChevronDown aria-hidden="true" size={12} stroke={1.8} />
        </button>
      )}
    </div>
  );
}

interface OperationEndpointProps {
  baseUrl: string;
  fullUrl: string;
  method: string;
  methodColor: string;
  path: string;
}

const renderEndpointPath = (path: string): ReactNode =>
  path.split(/(\{[^}]+\})/u).map((part, index) =>
    /^\{[^}]+\}$/u.test(part) ? (
      <span className="endpoint-path-param" key={`${part}-${index}`}>
        {part}
      </span>
    ) : (
      <span key={`${part}-${index}`}>{part}</span>
    ),
  );

/**
 * Renders the method and URL command bar with the moving segment highlight from the design.
 *
 * @param props Active operation endpoint values.
 * @returns A copyable method, origin, path and complete URL bar.
 */
function OperationEndpoint({
  baseUrl,
  fullUrl,
  method,
  methodColor,
  path,
}: OperationEndpointProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const copyStatusTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [copyStatus, setCopyStatus] = useState<HeroCopyStatus>('idle');

  useEffect(() => () => clearTimeout(copyStatusTimerRef.current), []);

  const handleCopyResult = (status: Exclude<HeroCopyStatus, 'idle'>) => {
    setCopyStatus(status);
    clearTimeout(copyStatusTimerRef.current);
    copyStatusTimerRef.current = setTimeout(() => setCopyStatus('idle'), 1600);
  };

  const hideHighlight = () => {
    trackRef.current?.style.setProperty('--url-hover-o', '0');
    trackRef.current?.classList.remove('is-full-preview');
  };

  const placeSegmentHighlight = (segment: HTMLElement | null) => {
    const track = trackRef.current;
    if (!track) return;
    track.classList.remove('is-full-preview');
    if (!segment) {
      hideHighlight();
      return;
    }
    const trackRect = track.getBoundingClientRect();
    const segmentRect = segment.getBoundingClientRect();
    track.style.setProperty(
      '--url-hover-x',
      `${segmentRect.left - trackRect.left + track.scrollLeft}px`,
    );
    track.style.setProperty('--url-hover-y', `${segmentRect.top - trackRect.top}px`);
    track.style.setProperty('--url-hover-w', `${segmentRect.width}px`);
    track.style.setProperty('--url-hover-h', `${segmentRect.height}px`);
    track.style.setProperty('--url-hover-o', '1');
  };

  const placeFullHighlight = () => {
    const track = trackRef.current;
    const segments = track ? [...track.querySelectorAll<HTMLElement>('[data-url-segment]')] : [];
    if (!track || segments.length === 0) return;
    const firstRect = segments[0].getBoundingClientRect();
    const lastRect = segments.at(-1)?.getBoundingClientRect();
    if (!lastRect) return;
    const trackRect = track.getBoundingClientRect();
    track.classList.add('is-full-preview');
    track.style.setProperty(
      '--url-hover-x',
      `${firstRect.left - trackRect.left + track.scrollLeft}px`,
    );
    track.style.setProperty('--url-hover-y', `${firstRect.top - trackRect.top}px`);
    track.style.setProperty('--url-hover-w', `${lastRect.right - firstRect.left}px`);
    track.style.setProperty('--url-hover-h', `${firstRect.height}px`);
    track.style.setProperty('--url-hover-o', '1');
  };

  return (
    <div className="hero-endpoint" data-endpoint-bar>
      <span
        className="hero-endpoint__method"
        style={{ '--operation-method-color': methodColor } as CSSProperties}
      >
        {method.toUpperCase()}
      </span>
      <div
        className="hero-endpoint__track"
        data-url-track
        onFocus={(event) => {
          const target = event.target;
          placeSegmentHighlight(
            target instanceof HTMLElement
              ? target.closest<HTMLElement>('[data-url-segment]')
              : null,
          );
        }}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) hideHighlight();
        }}
        onPointerLeave={hideHighlight}
        ref={trackRef}
      >
        <HeroCopyButton
          aria-label="复制前置 URL"
          className="hero-endpoint__segment hero-endpoint__segment--origin"
          copiedMessage={`前置 URL 已复制：${baseUrl}`}
          data-url-segment="origin"
          onCopyResult={handleCopyResult}
          onPointerEnter={(event) => placeSegmentHighlight(event.currentTarget)}
          text={baseUrl}
          title={`点击复制前置 URL：${baseUrl}`}
        >
          <span>{baseUrl}</span>
        </HeroCopyButton>
        <HeroCopyButton
          aria-label="复制 Path"
          className="hero-endpoint__segment hero-endpoint__segment--path"
          copiedMessage={`接口 Path 已复制：${path}`}
          data-url-segment="path"
          onCopyResult={handleCopyResult}
          onPointerEnter={(event) => placeSegmentHighlight(event.currentTarget)}
          text={path}
          title={`点击复制接口 Path：${path}`}
        >
          <code>{renderEndpointPath(path)}</code>
        </HeroCopyButton>
      </div>
      <HeroCopyButton
        aria-label="复制完整 URL"
        className="hero-endpoint__copy-btn"
        copiedMessage={`完整请求地址已复制：${fullUrl}`}
        onCopyResult={handleCopyResult}
        onBlur={hideHighlight}
        onFocus={placeFullHighlight}
        onPointerEnter={placeFullHighlight}
        onPointerLeave={hideHighlight}
        status={copyStatus}
        text={fullUrl}
        title={`点击复制完整地址：${fullUrl}`}
      />
    </div>
  );
}

interface OperationHeroCardProps {
  document: OpenApiDocument;
  onOpenPlayground: () => void;
  operation: ApiOperation;
  requestPrefix: string;
}

/** Renders the operation's basic information and copyable endpoint/security metadata. */
export function OperationHeroCard({
  document,
  onOpenPlayground,
  operation,
  requestPrefix,
}: OperationHeroCardProps) {
  const operationTags = operation.tags?.length ? operation.tags : [operation.group].filter(Boolean);
  const methodColor = methodBackgrounds[operation.method] ?? '#526f8a';
  const baseUrl = new URL(resolveRequestBase(requestPrefix) || '/', window.location.origin)
    .toString()
    .replace(/\/+$/, '');
  const fullUrl = `${baseUrl}/${operation.path.replace(/^\/+/, '')}`;
  return (
    <header
      className="legacy-operation__hero"
      style={{ '--operation-method-color': methodColor } as CSSProperties}
    >
      <div className="hero-header">
        <div className="hero-header__identity">
          <div className="hero-meta">
            {operationTags.length > 0 && (
              <span className="hero-meta__breadcrumb" title="所属模块分类">
                <span className="hero-meta__dot" aria-hidden="true" />
                {operationTags.map((tag, index) => (
                  <span className="hero-meta__tag-group" key={tag}>
                    {index > 0 && <span className="hero-meta__slash">/</span>}
                    <span className="hero-meta__tag-item">{tag}</span>
                  </span>
                ))}
              </span>
            )}
            {operation.operationId && (
              <HeroCopyButton
                aria-label={`复制方法名 ${operation.operationId}`}
                className="hero-meta__opid"
                copiedMessage={`方法标识 ${operation.operationId} 已复制`}
                text={operation.operationId}
                title={`点击复制方法名 (operationId)：${operation.operationId}`}
              >
                <span className="hero-meta__opid-badge">ID</span>
                <code className="hero-meta__opid-code">{operation.operationId}</code>
              </HeroCopyButton>
            )}
          </div>
          <h1 className="hero-header__title">
            {operation.summary || operation.operationId || '未命名接口'}
          </h1>
        </div>
        <div className="hero-actions">
          <HeroCopyButton
            aria-label="AI 助手：复制接口信息"
            className="hero-btn"
            copiedMessage="接口上下文已复制，可粘贴至 AI 助手"
            icon={<IconFileText className="icon-default" size={14} stroke={1.8} />}
            text={`${operation.method.toUpperCase()} ${operation.path}\n接口名称：${operation.summary || ''}\n接口描述：${operation.description || ''}`}
            title="复制接口信息用于 AI 分析"
          >
            <span>AI 助手</span>
          </HeroCopyButton>
          <button className="hero-btn hero-btn--primary" onClick={onOpenPlayground} type="button">
            <IconPlayerPlay aria-hidden="true" size={14} stroke={1.8} />
            <span>在线调试</span>
          </button>
        </div>
      </div>

      <OperationEndpoint
        baseUrl={baseUrl}
        fullUrl={fullUrl}
        method={operation.method}
        methodColor={methodColor}
        path={operation.path}
      />

      {operation.description?.trim() && <OperationDescription content={operation.description} />}

      <SecurityMetadata document={document} operation={operation} />
    </header>
  );
}
