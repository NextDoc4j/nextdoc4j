import { FolderIcon } from '../../components/rare-ui/folder-icon';
import { AnimatedCounter } from '../../components/rare-ui/animated-counter';
import { useCallback, useMemo, useState, type ReactNode } from 'react';

import {
  IconAdjustments,
  IconArrowRight,
  IconCheck,
  IconCode,
  IconCopy,
  IconDatabase,
  IconDownload,
  IconKey,
  IconLicense,
  IconMail,
  IconUser,
  IconWorld,
} from '@tabler/icons-react';

import type { AppView } from '../../lib/hash-route';
import { useNotification } from '../../lib/notifications';
import type { ApiOperation, OpenApiDocument, ServiceDefinition } from '../../types/openapi';
import { resolveBrandMetadata } from '../brand/brand';
import { MarkdownContent } from '../documentation/markdown-content';
import { getMethodAccentColor } from '../openapi/utils';

interface HomePageProps {
  activeService?: ServiceDefinition;
  document: OpenApiDocument;
  isAggregation: boolean;
  markdownCount: number;
  onNavigate: (view: AppView, sourceGroupId?: string) => void;
  onOpenMarkdown: () => void;
  onSelectService?: (service: ServiceDefinition) => void;
  onSelectSettings: (section: 'auth' | 'config') => void;
  operations: ApiOperation[];
  services: ServiceDefinition[];
  statisticsDocument?: OpenApiDocument;
}

interface ModuleEntry {
  description: string;
  icon: ReactNode;
  onClick: () => void;
  title: string;
}

const methodOrder = ['get', 'post', 'put', 'delete', 'patch', 'head', 'options'] as const;

/**
 * Modern minimalist home dashboard compatible with monolith and gateway aggregation modes.
 *
 * @param props Active document, aggregation services, navigation callbacks and workspace counts.
 * @returns The project introduction, document statistics and module shortcuts.
 */
export function HomePage({
  activeService,
  document,
  isAggregation,
  markdownCount,
  onNavigate,
  onOpenMarkdown,
  onSelectService,
  onSelectSettings,
  operations,
  services,
  statisticsDocument = document,
}: HomePageProps) {
  const notify = useNotification();
  const [copiedHost, setCopiedHost] = useState(false);

  const methodDistribution = useMemo(() => {
    const counts = new Map<string, number>();
    operations.forEach((operation) => {
      const method = operation.method?.toLowerCase() ?? '';
      if (method) {
        counts.set(method, (counts.get(method) ?? 0) + 1);
      }
    });
    const total = operations.length || 1;
    const knownMethods = methodOrder.filter((method) => counts.has(method));
    const otherMethods = Array.from(counts.keys()).filter(
      (method) => !methodOrder.includes(method as (typeof methodOrder)[number]),
    );
    return [...knownMethods, ...otherMethods].map((method) => ({
      count: counts.get(method) ?? 0,
      method,
      percent: ((counts.get(method) ?? 0) / total) * 100,
    }));
  }, [operations]);

  const modelCount = Object.keys(statisticsDocument.components?.schemas ?? {}).length;
  const groupCount =
    statisticsDocument.tags?.length ?? new Set(operations.map((operation) => operation.group)).size;
  const securityCount =
    Object.keys(statisticsDocument.components?.securitySchemes ?? {}).length ||
    (statisticsDocument.security?.length ?? 0);

  const brand = resolveBrandMetadata(document);
  const logo = brand.logo;
  const serverUrl = document.servers?.[0]?.url;

  const title = brand.title?.trim() || document.info?.title?.trim() || 'NextDoc4j';
  const description = document.info?.description?.trim();

  const hasVersion = Boolean(document.info?.version);
  const hasEngineVersion = Boolean(document['x-nextdoc4j']?.version);
  const hasSpecVersion = Boolean(document.openapi);
  const hasChips = hasVersion || hasEngineVersion || hasSpecVersion;

  const contactName = document.info?.contact?.name?.trim();
  const contactUrl = document.info?.contact?.url?.trim();
  const contactEmail = document.info?.contact?.email?.trim();
  const licenseName = document.info?.license?.name?.trim();
  const licenseUrl = document.info?.license?.url?.trim();

  const hasMetaBar = Boolean(serverUrl || contactName || contactUrl || contactEmail || licenseName);

  /**
   * Copies the active server base URL to the system clipboard.
   *
   * Tries modern `navigator.clipboard` first, falling back to a hidden textarea
   * with `document.execCommand('copy')` for non-secure HTTP or intranet environments.
   * Displays a toast error notification if copying fails or is rejected.
   *
   * @param None; uses the current server URL.
   * @returns Resolves when the copy attempt and feedback dispatch are complete.
   */
  const handleCopyHost = useCallback(async () => {
    if (!serverUrl) return;

    let success = false;
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(serverUrl);
        success = true;
      } catch {
        // Fall through to legacy execCommand fallback
      }
    }

    if (!success && typeof window !== 'undefined' && window.document) {
      const domDoc = window.document;
      const previousActive = domDoc.activeElement;
      const textarea = domDoc.createElement('textarea');
      try {
        textarea.value = serverUrl;
        textarea.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0;';
        domDoc.body.appendChild(textarea);
        textarea.select();
        success = domDoc.execCommand('copy');
      } catch {
        success = false;
      } finally {
        textarea.remove();
        if (previousActive instanceof HTMLElement) {
          previousActive.focus({ preventScroll: true });
        }
      }
    }

    if (success) {
      setCopiedHost(true);
      setTimeout(() => setCopiedHost(false), 2000);
    } else {
      notify('复制失败，请手动复制');
    }
  }, [notify, serverUrl]);

  const entries: ModuleEntry[] = [
    {
      description: '浏览全部 API 接口与请求定义',
      icon: <IconCode aria-hidden="true" size={18} stroke={1.8} />,
      onClick: () => onNavigate('docs', 'all'),
      title: '接口文档',
    },
    {
      description: '查看 Schema 数据结构与字段约束',
      icon: <IconDatabase aria-hidden="true" size={18} stroke={1.8} />,
      onClick: () => onNavigate('models'),
      title: '实体模型',
    },
    {
      description: '配置 Bearer Token 与 API Key',
      icon: <IconKey aria-hidden="true" size={18} stroke={1.8} />,
      onClick: () => onSelectSettings('auth'),
      title: '全局认证',
    },
    {
      description: '统一注入公共 Header 与 Query 参数',
      icon: <IconAdjustments aria-hidden="true" size={18} stroke={1.8} />,
      onClick: () => onSelectSettings('config'),
      title: '全局参数',
    },
    {
      description: '下载离线 HTML、Markdown 或规范',
      icon: <IconDownload aria-hidden="true" size={18} stroke={1.8} />,
      onClick: () => onNavigate('export'),
      title: '文档导出',
    },
    {
      description: markdownCount > 0 ? `查阅 ${markdownCount} 篇补充说明文档` : '查阅补充说明文档',
      icon: <FolderIcon />,
      onClick: onOpenMarkdown,
      title: '其它文档',
    },
  ];

  return (
    <div className="legacy-home">
      {/* 1. Hero Section */}
      <header className="legacy-home__header">
        <div className="legacy-home__project">
          <h1 className="legacy-home__title">{title}</h1>

          {hasChips && (
            <div className="legacy-home__chips">
              {document.info?.version && (
                <span className="legacy-home__chip legacy-home__chip--version">
                  V {document.info.version}
                </span>
              )}
              {document['x-nextdoc4j']?.version && (
                <span className="legacy-home__chip legacy-home__chip--engine">
                  Nextdoc4j v{document['x-nextdoc4j'].version}
                </span>
              )}
              {document.openapi && (
                <span className="legacy-home__chip legacy-home__chip--spec">
                  OpenAPI {document.openapi}
                </span>
              )}
            </div>
          )}

          {description && (
            <MarkdownContent className="legacy-home__description" content={description} />
          )}

          {hasMetaBar && (
            <div className="legacy-home__meta-bar">
              {serverUrl && (
                <button
                  className="legacy-home__host-pill"
                  onClick={handleCopyHost}
                  title="点击复制 API 服务基址"
                  type="button"
                >
                  {copiedHost ? (
                    <IconCheck aria-hidden="true" size={13} stroke={2} />
                  ) : (
                    <IconCopy aria-hidden="true" size={13} stroke={1.8} />
                  )}
                  <span>{serverUrl}</span>
                  {copiedHost && <span className="legacy-home__copied-hint">已复制</span>}
                </button>
              )}

              {contactName && (
                <span className="legacy-home__meta-item">
                  <IconUser aria-hidden="true" size={13} stroke={1.8} />
                  <span>
                    联系人：<strong>{contactName}</strong>
                  </span>
                </span>
              )}

              {contactUrl && (
                <a
                  className="legacy-home__meta-link"
                  href={contactUrl}
                  rel="noreferrer"
                  target="_blank"
                  title="访问项目主页"
                >
                  <IconWorld aria-hidden="true" size={13} stroke={1.8} />
                  <span>{contactUrl.replace(/^https?:\/\//, '')}</span>
                </a>
              )}

              {contactEmail && (
                <a
                  className="legacy-home__meta-link"
                  href={`mailto:${contactEmail}`}
                  title="发送邮件"
                >
                  <IconMail aria-hidden="true" size={13} stroke={1.8} />
                  <span>{contactEmail}</span>
                </a>
              )}

              {licenseName &&
                (licenseUrl ? (
                  <a
                    className="legacy-home__meta-link"
                    href={licenseUrl}
                    rel="noreferrer"
                    target="_blank"
                    title="查看开源许可证"
                  >
                    <IconLicense aria-hidden="true" size={13} stroke={1.8} />
                    <strong>{licenseName}</strong>
                  </a>
                ) : (
                  <span className="legacy-home__meta-item">
                    <IconLicense aria-hidden="true" size={13} stroke={1.8} />
                    <strong>{licenseName}</strong>
                  </span>
                ))}
            </div>
          )}
        </div>

        <div className="legacy-home__logo-wrap">
          <img alt="Logo" className="legacy-home__logo" src={logo} />
        </div>
      </header>

      {/* 2. Statistics & Metrics Section */}
      <section className="legacy-home__section">
        <div className="legacy-home__section-head">
          <h2>接口指标统计</h2>
        </div>

        <div className="legacy-home__stat-grid">
          <div className="legacy-home__stat-card">
            <div className="legacy-home__stat-label">API 端点总数</div>
            <div className="legacy-home__stat-value">
              <AnimatedCounter value={operations.length} />
            </div>
            <div className="legacy-home__stat-sub">
              包含 {methodDistribution.length} 种 HTTP 方法
            </div>
          </div>

          <div className="legacy-home__stat-card">
            <div className="legacy-home__stat-label">实体数据模型</div>
            <div className="legacy-home__stat-value">
              <AnimatedCounter value={modelCount} />
            </div>
            <div className="legacy-home__stat-sub">结构体与枚举引用</div>
          </div>

          <div className="legacy-home__stat-card">
            <div className="legacy-home__stat-label">分类标签分组</div>
            <div className="legacy-home__stat-value">
              <AnimatedCounter value={groupCount} />
            </div>
            <div className="legacy-home__stat-sub">业务领域模块划分</div>
          </div>

          <div className="legacy-home__stat-card">
            <div className="legacy-home__stat-label">
              {isAggregation ? '微服务集群' : '安全认证策略'}
            </div>
            <div className="legacy-home__stat-value">
              <AnimatedCounter value={isAggregation ? services.length : securityCount} />
            </div>
            <div className="legacy-home__stat-sub">
              {isAggregation
                ? `${services.filter((s) => !s.disabled && s.status !== 'DOWN').length} 个服务在线`
                : 'Bearer Token, ApiKey'}
            </div>
          </div>
        </div>

        {/* HTTP Method Distribution */}
        <div className="legacy-home__distribution-box">
          <div className="legacy-home__distribution-top">
            <span className="legacy-home__distribution-label">请求方法分布</span>
            <span className="legacy-home__distribution-total">
              <AnimatedCounter value={operations.length} /> Total
            </span>
          </div>

          {methodDistribution.length > 0 ? (
            <>
              <div className="legacy-home__method-bar">
                {methodDistribution.map((item) => (
                  <span
                    key={item.method}
                    style={{
                      background: getMethodAccentColor(item.method),
                      width: `${item.percent}%`,
                    }}
                    title={`${item.method.toUpperCase()}: ${item.count} (${item.percent.toFixed(1)}%)`}
                  />
                ))}
              </div>
              <div className="legacy-home__method-legend">
                {methodDistribution.map((item) => (
                  <span key={item.method}>
                    <i style={{ background: getMethodAccentColor(item.method) }} />
                    <b>{item.method.toUpperCase()}</b>
                    <span>
                      <AnimatedCounter value={item.count} />
                    </span>
                    <small>({item.percent.toFixed(1)}%)</small>
                  </span>
                ))}
              </div>
            </>
          ) : (
            <p className="legacy-home__empty">暂无接口数据</p>
          )}
        </div>
      </section>

      {/* 3. Microservices Cluster Section (Aggregation Mode) */}
      {isAggregation && services.length > 0 && (
        <section className="legacy-home__section">
          <div className="legacy-home__section-head">
            <h2>微服务集群节点</h2>
            <span className="legacy-home__section-badge">
              <AnimatedCounter value={services.length} /> 个服务
            </span>
          </div>
          <div className="legacy-home__service-grid">
            {services.map((service) => {
              const isActive = service.url === activeService?.url;
              const isUp = !service.disabled && service.status !== 'DOWN';
              return (
                <button
                  className={`legacy-home__service ${isActive ? 'is-active' : ''}`}
                  disabled={service.disabled}
                  key={service.url}
                  onClick={() => onSelectService?.(service)}
                  type="button"
                >
                  <div className="legacy-home__service-head">
                    <span className="legacy-home__service-name" title={service.name}>
                      {service.name}
                    </span>
                    <span className={`legacy-home__service-status ${isUp ? 'is-up' : 'is-down'}`}>
                      ● {service.status || (service.disabled ? 'DOWN' : 'UP')}
                    </span>
                  </div>
                  <div className="legacy-home__service-meta">
                    <span className="legacy-home__service-url" title={service.url}>
                      {service.url}
                    </span>
                    <span className="legacy-home__service-indicator">
                      {isActive ? '当前活跃' : '切换服务'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* 4. Quick Action Entries */}
      <section className="legacy-home__section">
        <div className="legacy-home__section-head">
          <h2>快速入口</h2>
        </div>
        <div className="legacy-home__entries">
          {entries.map((entry) => (
            <button
              className="legacy-home__entry"
              key={entry.title}
              onClick={entry.onClick}
              type="button"
            >
              <span className="legacy-home__entry-icon">{entry.icon}</span>
              <div className="legacy-home__entry-text">
                <b>{entry.title}</b>
                <small>{entry.description}</small>
              </div>
              <IconArrowRight
                aria-hidden="true"
                className="legacy-home__entry-arrow"
                size={16}
                stroke={1.8}
              />
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
