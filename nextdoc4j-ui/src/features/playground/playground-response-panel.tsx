import { AnimatedCopyButton } from '../../components/rare-ui/animated-copy-button';
import { JsonDescriptionToggle } from '../../components/json-description-toggle';
import {
  IconArrowDownLeft,
  IconArrowUpRight,
  IconClock,
  IconDatabase,
  IconDownload,
  IconInfoCircle,
  IconSearch,
  IconTrash,
} from '@tabler/icons-react';
import { useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { CodeEditor, type CodeEditorFieldMeta } from '../../components/code-editor';
import { Input } from '../../components/input';
import { SegmentedControl } from '../../components/segmented-control';
import { Tooltip } from '../../components/tooltip';
import type { Schema } from '../../types/openapi';
import type { Base64ImageInfo } from '../../utils/base64-image';
import { PlaygroundHint } from './playground-fields';
import type { ConsoleLogEntry } from './pre-post-types';
import { formatBytes, type ResponseMetrics } from './response-metrics';
import { SseEventList } from './sse-event-list';
import type { DebugParameter, SseEvent } from './types';

interface RequestSnapshot {
  body: string;
  contentType: string;
  cookies: DebugParameter[];
  headers: Array<[string, string]>;
  method: string;
  sentAt: string;
  url: string;
}

type ResponseTab = 'headers' | 'request' | 'response' | 'console';
type ResponseMode = 'pretty' | 'raw';
interface Inputs {
  setResponseTab: Dispatch<SetStateAction<ResponseTab>>;
  responseTabs: { label: ReactNode; title?: string; value: ResponseTab }[];
  responseTab: ResponseTab;
  responseMetrics: ResponseMetrics | undefined;
  setResponseMode: Dispatch<SetStateAction<ResponseMode>>;
  responseMode: ResponseMode;
  detectedImages: Base64ImageInfo[];
  imageDialogOpen: boolean;
  setSelectedImageKeyPath: Dispatch<SetStateAction<string | undefined>>;
  setImageDialogOpen: Dispatch<SetStateAction<boolean>>;
  responseText: string;
  responseRawText: string;
  copy: (value: string, message: string) => Promise<boolean>;
  getResponseExport: () => { text: string; type: string; filename: string };
  downloadBlob: (blob: Blob, fileName: string) => void;
  setResponseSearch: Dispatch<SetStateAction<string>>;
  responseSearch: string;
  responseLimited: boolean;
  responseJson: unknown;
  formattingResponse: boolean;
  formatLargeResponse: () => Promise<void>;
  scanLargeResponseImages: () => Promise<void>;
  sending: boolean;
  streaming: boolean;
  responseError: string;
  sseEvents: SseEvent[];
  sseDropped: number;
  visibleResponseText: string;
  schemas: Record<string, Schema>;
  getResponseFieldMeta: (
    path: Array<string | number>,
    source: string,
  ) => CodeEditorFieldMeta | undefined;
  getResponseFieldDescription: (path: Array<string | number>, source: string) => string;
  sentRequest: RequestSnapshot | undefined;
  responseHeaders: [string, string][];
  setConsoleFilter: Dispatch<SetStateAction<'post' | 'net' | 'pre' | 'all'>>;
  consoleFilter: 'post' | 'net' | 'pre' | 'all';
  clearLogs: () => void;
  consoleDropped: number;
  filteredConsoleLogs: ConsoleLogEntry[];
}
/** Renders response metrics, bounded previews and retained execution logs.
 * @param input Explicit domain inputs and callbacks.
 * @returns Response panel markup and controls.
 */
export function PlaygroundResponsePanel({
  setResponseTab,
  responseTabs,
  responseTab,
  responseMetrics,
  setResponseMode,
  responseMode,
  detectedImages,
  imageDialogOpen,
  setSelectedImageKeyPath,
  setImageDialogOpen,
  responseText,
  responseRawText,
  copy,
  getResponseExport,
  downloadBlob,
  setResponseSearch,
  responseSearch,
  responseLimited,
  responseJson,
  formattingResponse,
  formatLargeResponse,
  scanLargeResponseImages,
  sending,
  streaming,
  responseError,
  sseEvents,
  sseDropped,
  visibleResponseText,
  schemas,
  getResponseFieldMeta,
  getResponseFieldDescription,
  sentRequest,
  responseHeaders,
  setConsoleFilter,
  consoleFilter,
  clearLogs,
  consoleDropped,
  filteredConsoleLogs,
}: Inputs) {
  const [showDescriptions, setShowDescriptions] = useState(true);
  const hasJsonNodes =
    responseMode === 'pretty' &&
    !responseLimited &&
    !responseSearch.trim() &&
    !streaming &&
    !sseEvents.length &&
    Boolean(responseText) &&
    (responseJson !== undefined || /^\s*[[{]/.test(responseText));
  return (
    <section className="playground-panel">
      <header className="playground-panel__heading">
        <SegmentedControl
          ariaLabel="响应查看区域"
          autoWidth
          className="playground-panel__tabs playground-panel__tabs--response"
          onChange={setResponseTab}
          options={responseTabs}
          value={responseTab}
        />
        <div className="playground-panel__heading-metrics">
          <Tooltip
            autoFlip={false}
            placement="bottom"
            tooltipClassName="playground-metric-tooltip"
            content={
              <span className="playground-metric-details">
                <strong>请求耗时</strong>
                {responseMetrics ? (
                  <>
                    {(
                      [
                        ['准备请求', responseMetrics.preparation],
                        ['Socket 初始化', responseMetrics.timing?.socket],
                        ['DNS 查询', responseMetrics.timing?.dns],
                        ['TCP / TLS', responseMetrics.timing?.connect],
                        ['发送 / 等待', responseMetrics.timing?.wait],
                        ['接收响应', responseMetrics.timing?.receive],
                      ] as const
                    ).map(([label, duration]) => (
                      <span className="playground-metric-details__row" key={label}>
                        <span>{label}</span>
                        <b className={duration === undefined ? 'is-unavailable' : undefined}>
                          {duration === undefined ? '未提供' : `${duration.toFixed(2)} ms`}
                        </b>
                      </span>
                    ))}
                    <span className="playground-metric-details__row is-total">
                      <span>总耗时</span>
                      <b>{responseMetrics.duration.toFixed(0)} ms</b>
                    </span>
                  </>
                ) : (
                  <small>发送请求后查看耗时明细</small>
                )}
              </span>
            }
          >
            <button
              aria-label="查看请求耗时明细"
              className="playground-response__metric"
              type="button"
            >
              <IconClock aria-hidden="true" size={13} stroke={1.8} />
              {responseMetrics ? `${responseMetrics.duration.toFixed(0)} ms` : '— ms'}
            </button>
          </Tooltip>
          <Tooltip
            autoFlip={false}
            placement="bottom"
            tooltipClassName="playground-metric-tooltip"
            content={
              <span className="playground-metric-details">
                <strong>数据大小</strong>
                {responseMetrics ? (
                  <>
                    {(
                      [
                        ['请求头', responseMetrics.requestHeaderSize],
                        ['请求正文', responseMetrics.requestBodySize],
                        ['响应头', responseMetrics.responseHeaderSize],
                        ['响应正文', responseMetrics.responseBodySize],
                      ] as const
                    ).map(([label, bytes]) => (
                      <span className="playground-metric-details__row" key={label}>
                        <span>{label}</span>
                        <b>{formatBytes(bytes)}</b>
                      </span>
                    ))}
                  </>
                ) : (
                  <small>发送请求后查看大小明细</small>
                )}
              </span>
            }
          >
            <button
              aria-label="查看请求与响应大小明细"
              className="playground-response__metric"
              type="button"
            >
              <IconDatabase aria-hidden="true" size={13} stroke={1.8} />
              {responseMetrics ? formatBytes(responseMetrics.responseBodySize) : '— B'}
            </button>
          </Tooltip>
        </div>
      </header>
      <div
        className={`playground-panel__body ${responseTab === 'console' ? 'is-console' : ''}`.trim()}
      >
        {responseTab === 'response' && (
          <>
            <div className="playground-response__tools">
              <div className="playground-response__tools-left">
                <SegmentedControl<ResponseMode | 'images'>
                  autoWidth
                  ariaLabel="响应内容格式"
                  className="playground-response__format"
                  onChange={(value) => {
                    if (value === 'images') {
                      setSelectedImageKeyPath(undefined);
                      setImageDialogOpen(true);
                    } else {
                      setImageDialogOpen(false);
                      setResponseMode(value);
                    }
                  }}
                  options={[
                    { label: '格式化', value: 'pretty' },
                    { label: '原始', value: 'raw' },
                    ...(detectedImages.length
                      ? [
                          {
                            label: (
                              <span className="playground-tab-label">
                                <span>图片</span>
                                <span className="playground-status-badge playground-response__image-count">
                                  {detectedImages.length}
                                </span>
                              </span>
                            ),
                            value: 'images' as const,
                            title: `查看响应中的 ${detectedImages.length} 张图片`,
                          },
                        ]
                      : []),
                  ]}
                  value={imageDialogOpen && detectedImages.length ? 'images' : responseMode}
                />
              </div>
              <div className="playground-response__tools-right">
                {hasJsonNodes || (!responseText && !responseRawText) ? (
                  <JsonDescriptionToggle
                    disabled={!responseText && !responseRawText}
                    visible={showDescriptions}
                    onChange={setShowDescriptions}
                  />
                ) : (
                  <PlaygroundHint text="复制响应">
                    <AnimatedCopyButton
                      aria-label="复制响应"
                      disabled={!responseText && !responseRawText}
                      text={responseText || responseRawText}
                      onCopy={() => copy(getResponseExport().text, '响应已复制')}
                      type="button"
                    />
                  </PlaygroundHint>
                )}
                <PlaygroundHint text="下载响应">
                  <button
                    aria-label="下载响应"
                    disabled={!responseText && !responseRawText}
                    onClick={() =>
                      downloadBlob(
                        new Blob([getResponseExport().text], { type: getResponseExport().type }),
                        getResponseExport().filename,
                      )
                    }
                    type="button"
                  >
                    <IconDownload aria-hidden="true" size={15} />
                  </button>
                </PlaygroundHint>
                <label className="ui-input-shell">
                  <IconSearch aria-hidden="true" size={13} />
                  <Input
                    variant="embedded"
                    aria-label="查找响应字段或值"
                    onChange={(event) => setResponseSearch(event.target.value)}
                    placeholder="查找字段或值"
                    value={responseSearch}
                  />
                </label>
              </div>
            </div>
            {responseLimited && (
              <p className="px-4 py-2 text-xs text-muted" role="status">
                <button
                  type="button"
                  disabled={formattingResponse}
                  onClick={() => void scanLargeResponseImages()}
                >
                  扫描完整响应中的图片
                </button>
                大响应仅预览前 256 KiB，搜索限于预览；复制、下载和后置操作使用完整内容。
                {responseJson !== undefined && (
                  <button
                    type="button"
                    disabled={formattingResponse}
                    onClick={() => void formatLargeResponse()}
                  >
                    {formattingResponse ? '正在格式化…' : '格式化预览'}
                  </button>
                )}
              </p>
            )}
            {sending && !streaming ? (
              <div className="playground-empty">
                <span className="playground-loading" />
                <strong>正在等待响应</strong>
              </div>
            ) : responseError ? (
              <div className="playground-empty is-error">
                <b>!</b>
                <strong>{responseError}</strong>
              </div>
            ) : sseEvents.length || streaming ? (
              <>
                {sseDropped > 0 && (
                  <p className="px-4 py-2 text-xs text-muted">
                    已省略 {sseDropped}{' '}
                    条较早消息，复制和下载仅包含保留内容；大小为累计事件文本大小。
                  </p>
                )}
                {responseMode === 'raw' ? (
                  <pre className="playground-response__raw">{visibleResponseText}</pre>
                ) : (
                  <SseEventList
                    events={sseEvents}
                    query={responseSearch}
                    streaming={streaming}
                    schemas={schemas}
                    onCopy={(text) => copy(text, '消息内容已复制')}
                  />
                )}
              </>
            ) : responseText &&
              !responseLimited &&
              responseMode === 'pretty' &&
              !responseSearch.trim() &&
              (responseJson !== undefined || /^\s*[[{]/.test(responseText)) ? (
              <div className="playground-response__json">
                <CodeEditor
                  language="json"
                  readOnly
                  value={responseText}
                  getFieldMeta={getResponseFieldMeta}
                  getFieldDescription={getResponseFieldDescription}
                  showAnnotations={showDescriptions}
                  truncateLongStrings={true}
                  defaultExpandLongStrings={true}
                  hoverTooltip={false}
                  onPreviewImage={(img) => {
                    setSelectedImageKeyPath(img.keyPath);
                    setImageDialogOpen(true);
                  }}
                />
              </div>
            ) : visibleResponseText ? (
              <pre className="playground-response__raw">{visibleResponseText}</pre>
            ) : (
              <div className="playground-empty">
                <b>∅</b>
                <strong>
                  {responseMetrics ? '请求完成，无响应正文' : '发送请求后查看实时响应'}
                </strong>
              </div>
            )}
          </>
        )}
        {responseTab === 'headers' && (
          <div className="playground-headers">
            {[
              ['请求头', sentRequest?.headers || []] as const,
              ['响应头', responseHeaders] as const,
            ].map(([title, items]) => (
              <section className="playground-headers__section" key={title}>
                <header>
                  <span className="playground-headers__title">
                    {title === '请求头' ? (
                      <IconArrowUpRight size={15} aria-hidden="true" />
                    ) : (
                      <IconArrowDownLeft size={15} aria-hidden="true" />
                    )}
                    <h3>{title}</h3>
                    <span className="playground-headers__scope">
                      {title === '请求头' ? '应用配置' : '浏览器可读'}
                    </span>
                    <span className="playground-headers__count">{items.length}</span>
                    <Tooltip
                      content={
                        title === '请求头'
                          ? '这里展示应用配置并交给 Fetch 的请求头。Host、Origin、Referer、User-Agent、Cookie、Content-Length、Sec-* 等由浏览器管理，完整发送值请查看浏览器 Network；multipart 边界也由浏览器生成。'
                          : '这里展示 Fetch 实际可读取的响应头。跨域时受 Access-Control-Expose-Headers 限制，Set-Cookie 不向页面脚本开放；完整头信息请查看浏览器 Network。'
                      }
                    >
                      <button
                        className="playground-headers__info"
                        aria-label={`${title}展示范围`}
                        type="button"
                      >
                        <IconInfoCircle size={13} aria-hidden="true" />
                      </button>
                    </Tooltip>
                  </span>
                  <Tooltip content={`复制全部${title}`}>
                    <AnimatedCopyButton
                      aria-label={`复制全部${title}`}
                      disabled={!items.length}
                      className="playground-headers__copy"
                      onCopy={() =>
                        copy(
                          items.map(([name, value]) => `${name}: ${value}`).join('\n'),
                          `${title}已复制`,
                        )
                      }
                      type="button"
                    />
                  </Tooltip>
                </header>
                {items.length ? (
                  <dl className="playground-headers__list">
                    {items.map(([name, value]) => (
                      <div className="playground-headers__row" key={name}>
                        <dt>
                          <code>{name}</code>
                        </dt>
                        <dd>
                          <span>{value || '—'}</span>
                          <Tooltip content="复制值">
                            <AnimatedCopyButton
                              className="playground-headers__copy"
                              aria-label={`复制 ${name} 的值`}
                              text={value}
                              onCopy={() => copy(value, `${title}值已复制`)}
                              type="button"
                            />
                          </Tooltip>
                        </dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p className="playground-headers__empty">
                    {sentRequest ? '暂无头信息' : '发送请求后显示'}
                  </p>
                )}
              </section>
            ))}
          </div>
        )}
        {responseTab === 'request' && (
          <div className="playground-snapshot">
            {sentRequest ? (
              <>
                <header>
                  <i />
                  <strong>发送快照</strong>
                  <time>{sentRequest.sentAt}</time>
                </header>
                <div className="playground-snapshot__url">
                  <span>{sentRequest.method}</span>
                  <code>{sentRequest.url}</code>
                </div>
                <h3>请求头</h3>
                <div className="playground-snapshot__headers">
                  {sentRequest.headers.map(([name, value]) => (
                    <div key={name}>
                      <code>{name}</code>
                      <span>{value}</span>
                    </div>
                  ))}
                </div>
                {sentRequest.cookies.length > 0 && (
                  <>
                    <h3>Cookies</h3>
                    <div className="playground-snapshot__headers">
                      {sentRequest.cookies.map((item) => (
                        <div key={item.name}>
                          <code>{item.name}</code>
                          <span>{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
                <h3>
                  请求体 <code>{sentRequest.contentType || 'none'}</code>
                </h3>
                <pre>{sentRequest.body || '无请求体'}</pre>
              </>
            ) : (
              <div className="playground-empty">
                <strong>发送请求后查看实际请求</strong>
              </div>
            )}
          </div>
        )}
        {responseTab === 'console' && (
          <div className="playground-console-view">
            <div className="playground-console-toolbar">
              <div className="playground-console-filters">
                <SegmentedControl<'all' | 'pre' | 'net' | 'post'>
                  ariaLabel="执行日志筛选"
                  className="playground-console-segment"
                  onChange={setConsoleFilter}
                  options={[
                    { label: 'ALL', value: 'all' },
                    { label: 'PRE', value: 'pre' },
                    { label: 'NET', value: 'net' },
                    { label: 'POST', value: 'post' },
                  ]}
                  value={consoleFilter}
                />
              </div>
              <Tooltip content="清空日志" placement="top">
                <button
                  aria-label="清空日志"
                  className="playground-console-clear"
                  onClick={clearLogs}
                  type="button"
                >
                  <IconTrash aria-hidden="true" size={14} stroke={1.8} />
                </button>
              </Tooltip>
            </div>
            <div className="playground-console-logs">
              {consoleDropped > 0 && <p role="status">已省略 {consoleDropped} 条较早日志</p>}
              {filteredConsoleLogs.length === 0 ? (
                <div className="playground-empty">
                  <b>∅</b>
                  <strong>暂无执行日志</strong>
                  <p>点击“发送”将按顺序执行前置操作、网络请求与后置校验</p>
                </div>
              ) : (
                filteredConsoleLogs.map((log, idx) => (
                  <div key={idx} className="playground-console-row">
                    <span className="playground-console-time">{log.time}</span>
                    <span className={`playground-console-tag tag-${log.phase}`}>
                      [{log.category}]
                    </span>
                    {log.status === 'pass' && (
                      <span className="playground-console-badge is-pass">
                        {log.category === 'ASSERT' ? 'PASS' : '成功'}
                      </span>
                    )}
                    {log.status === 'skip' && (
                      <span className="playground-console-badge">跳过</span>
                    )}
                    {log.status === 'fail' && (
                      <span className="playground-console-badge is-fail">
                        {log.category === 'ASSERT' ? 'FAIL' : '失败'}
                      </span>
                    )}
                    <span className="playground-console-content">{log.content}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
