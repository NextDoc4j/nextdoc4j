'use client';

import Link from 'next/link';
import { HomeContent } from '@/components/home-content';
import { AnimatedTabs } from '@/components/rare-ui/animated-tabs';
import { AnimatedContent } from '@/components/rare-ui/animated-content';
import { useEffect, useRef, useState, type MouseEvent } from 'react';

type IconName = 'arrow-right' | 'play' | 'zap' | 'lock' | 'dollar' | 'server' | 'code' | 'layers';

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };

  switch (name) {
    case 'arrow-right':
      return <svg {...common}><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></svg>;
    case 'play':
      return <svg {...common}><path d="m5 3 14 9-14 9V3Z" /></svg>;
    case 'zap':
      return <svg {...common}><path d="m13 2-10 12h9l-1 8 10-12h-9l1-8Z" /></svg>;
    case 'lock':
      return <svg {...common}><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>;
    case 'dollar':
      return <svg {...common}><path d="M12 2v20" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>;
    case 'server':
      return <svg {...common}><rect x="2" y="2" width="20" height="8" rx="2" /><rect x="2" y="14" width="20" height="8" rx="2" /><path d="M6 6h.01M6 18h.01" /></svg>;
    case 'code':
      return <svg {...common}><path d="m16 18 6-6-6-6" /><path d="m8 6-6 6 6 6" /></svg>;
    case 'layers':
      return <svg {...common}><path d="m12 2 10 5-10 5L2 7l10-5Z" /><path d="m2 12 10 5 10-5" /><path d="m2 17 10 5 10-5" /></svg>;
  }
}

const demoOptions = [
  {
    id: 'single',
    title: '单体服务',
    description: 'Spring Boot',
    url: 'https://single-demo.nextdoc4j.top/',
    icon: 'server' as IconName,
  },
  {
    id: 'gateway',
    title: '网关聚合',
    description: 'Spring Cloud Gateway',
    url: 'https://gateway-demo.nextdoc4j.top/',
    icon: 'layers' as IconName,
  },
] as const;

const studioPreviews = [
  { id: 'overview', label: '接口总览', image: 'workspace', alt: 'NextDoc4j 项目概览、接口统计与文档导航' },
  { id: 'detail', label: '接口详情', image: 'api-detail', alt: 'NextDoc4j 接口详情、权限要求与请求响应结构' },
  { id: 'debug', label: '在线调试', image: 'debug-request', alt: 'NextDoc4j 在线调试、请求参数与实际 JSON 响应' },
] as const;

function makeTranslate(x: number, y: number) {
  return 'translate(' + x + 'px, ' + y + 'px)';
}

export function HomePage() {
  const [studioTab, setStudioTab] = useState<(typeof studioPreviews)[number]['id']>('overview');
  const [cardTransform, setCardTransform] = useState('perspective(1000px) rotateX(0deg) rotateY(0deg)');
  const [glareStyle, setGlareStyle] = useState('none');
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isDemoMenuOpen, setIsDemoMenuOpen] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const demoMenuRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const draggingRef = useRef(false);
  const currentPreview = studioPreviews.find((preview) => preview.id === studioTab) ?? studioPreviews[0];

  useEffect(() => {
    return () => {
      if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  useEffect(() => {
    if (!isDemoMenuOpen) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!(event.target instanceof Node) || !demoMenuRef.current?.contains(event.target)) {
        setIsDemoMenuOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsDemoMenuOpen(false);
      }
    };
    document.addEventListener('pointerdown', closeOnOutsidePointer);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isDemoMenuOpen]);

  const onStageMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    if (draggingRef.current || !stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current);
    animationFrameRef.current = requestAnimationFrame(() => {
      const rotX = ((y - centerY) / centerY) * -6;
      const rotY = ((x - centerX) / centerX) * 6;
      const nextTilt = {
        x: ((x - centerX) / centerX) * 10,
        y: ((y - centerY) / centerY) * 10,
      };
      setTilt(nextTilt);
      setCardTransform('perspective(1000px) rotateX(' + rotX.toFixed(2) + 'deg) rotateY(' + rotY.toFixed(2) + 'deg)');
      setGlareStyle(
        'radial-gradient(circle at ' +
          ((x / rect.width) * 100).toFixed(1) +
          '% ' +
          ((y / rect.height) * 100).toFixed(1) +
          '%, rgba(255, 255, 255, 0.14) 0%, rgba(255, 255, 255, 0) 60%)',
      );
    });
  };

  const onStageMouseLeave = () => {
    draggingRef.current = false;
    if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current);
    setTilt({ x: 0, y: 0 });
    setCardTransform('perspective(1000px) rotateX(0deg) rotateY(0deg)');
    setGlareStyle('none');
  };

  return (
    <div className="home-landing-page">
      <section className="hero-canvas">
        <div className="ambient-sphere-left" />
        <div className="ambient-sphere-right" />
        <div className="shell">
          <div className="hero-intro-box">
            <div className="hero-pill-badge">
              <span className="hero-pill-dot" />
              <span>SpringDoc · OpenAPI 3 · Boot 3 &amp; 4 统一支持</span>
            </div>
            <h1 className="hero-headline">
              重构 Java API 文档的<br />
              <span className="brand-gradient">现代工作台与调试体验</span>
            </h1>
            <p className="hero-tagline">
              专为 SpringDoc 打造的高效文档界面。单套 Starter 零学习成本替代传统 Swagger UI，集成多维接口查看、SSE 流式调试、Sa-Token 权限码与微服务网关聚合。
            </p>
            <div className="hero-cta-group">
              <Link className="cta-button-primary" href="/guide/start/started">
                <span>快速上手</span>
                <Icon name="arrow-right" size={14} />
              </Link>
              <div
                className="demo-rail"
                ref={demoMenuRef}
                data-open={isDemoMenuOpen}
                title="在线功能演示"
              >
                <button
                  className="demo-rail-trigger"
                  type="button"
                  aria-expanded={isDemoMenuOpen}
                  aria-haspopup="menu"
                  aria-controls="nextdoc4j-demo-rail"
                  aria-label={isDemoMenuOpen ? '收起在线功能演示' : '展开在线功能演示'}
                  onClick={() => setIsDemoMenuOpen((open) => !open)}
                >
                  <Icon name="play" size={14} />
                  <span>在线演示</span>
                </button>
                <div
                  id="nextdoc4j-demo-rail"
                  className="demo-rail-details"
                  aria-hidden={!isDemoMenuOpen}
                  role="menu"
                  aria-label="在线功能演示"
                >
                  {demoOptions.map((demo) => (
                    <a
                      key={demo.id}
                      className={'demo-rail-option demo-rail-option--' + demo.id}
                      href={demo.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      role="menuitem"
                      tabIndex={isDemoMenuOpen ? 0 : -1}
                      onClick={() => setIsDemoMenuOpen(false)}
                    >
                      <span className="demo-rail-option-icon"><Icon name={demo.icon} size={13} /></span>
                      <span>{demo.title}</span>
                    </a>
                  ))}
                </div>
              </div>
            </div>
            <div className="hero-meta-strip">
              <span>JDK <strong>17+</strong></span>
              <span>Spring Boot <strong>3.4.x / 4.x</strong></span>
              <span>OpenAPI <strong>3.1</strong></span>
              <span>Version <strong>1.5.0</strong></span>
            </div>
          </div>

          <div className="stage-canvas">
            <div
              ref={stageRef}
              className="stage-canvas-3d-wrapper"
              onMouseMove={onStageMouseMove}
              onMouseLeave={onStageMouseLeave}
              onMouseDown={() => { draggingRef.current = true; }}
              onMouseUp={() => { draggingRef.current = false; }}
            >
              {[
                { className: 'badge-top-left', icon: 'zap' as IconName, title: 'SSE 流式调试', sub: '实时事件流 / 虚拟滚动', x: -tilt.x * 1.5, y: -tilt.y * 1.5 },
                { className: 'badge-top-right', icon: 'lock' as IconName, title: 'Sa-Token 权限码', sub: '原生注解自动识别联动', x: tilt.x * 1.8, y: -tilt.y * 1.2 },
                { className: 'badge-middle-right', icon: 'dollar' as IconName, title: '枚举智能释义', sub: '下拉单选与字典自动绑定', x: tilt.x * 2, y: tilt.y * 0.8 },
                { className: 'badge-bottom-left', icon: 'server' as IconName, title: '微服务网关聚合', sub: 'WebFlux / WebMvc 自动路由', x: -tilt.x * 1.2, y: tilt.y * 1.6 },
                { className: 'badge-bottom-right', icon: 'code' as IconName, title: 'TS / Java 实体生成', sub: '一键生成 Request/Response', x: tilt.x * 1.6, y: tilt.y * 1.4 },
              ].map((badge) => (
                <div key={badge.title} className={'floating-feature-badge ' + badge.className} style={{ transform: makeTranslate(badge.x, badge.y) }}>
                  <div className="floating-badge-icon"><Icon name={badge.icon} size={18} /></div>
                  <div className="floating-badge-text">
                    <div className="floating-badge-title">{badge.title}</div>
                    <div className="floating-badge-sub">{badge.sub}</div>
                  </div>
                </div>
              ))}

              <div className="macos-window-card" style={{ transform: cardTransform }}>
                <div className="macos-window-titlebar">
                  <div className="macos-window-lights">
                    <span className="macos-light-btn close" />
                    <span className="macos-light-btn min" />
                    <span className="macos-light-btn max" />
                  </div>
                  <AnimatedTabs
                    className="macos-segmented-pill"
                    itemClassName="macos-segment-item"
                    label="选择工作台预览"
                    controls="home-studio-preview"
                    items={studioPreviews}
                    value={studioTab}
                    onChange={setStudioTab}
                  />
                  <div className="macos-address-pill">
                    <span className="green-dot" />
                    <span>http://localhost:8080/doc.html</span>
                  </div>
                </div>
                <div className="macos-window-viewport">
                  <div className="macos-window-glare" style={{ background: glareStyle }} />
                  <AnimatedContent id="home-studio-preview" className="macos-view-panel" contentClassName="macos-view-content" transitionKey={currentPreview.id} resize={false}>
                    <img className="no-zoom studio-theme-light" src={`/images/screenshots/features/${currentPreview.image}-light.webp`} alt={`${currentPreview.alt}（浅色）`} width={1440} height={960} decoding="async" draggable={false} />
                    <img className="no-zoom studio-theme-dark" src={`/images/screenshots/features/${currentPreview.image}-dark.webp`} alt={`${currentPreview.alt}（深色）`} width={1440} height={960} decoding="async" draggable={false} />
                  </AnimatedContent>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <HomeContent />

      <footer className="home-footer">
        <span>Copyright © 2025 <a href="https://nextdoc4j.top/" target="_blank" rel="noopener noreferrer">NextDoc4j 版权所有</a></span>
        <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer">浙ICP备2025151976号-2</a>
      </footer>
    </div>
  );
}
