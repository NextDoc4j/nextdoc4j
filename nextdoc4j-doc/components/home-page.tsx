'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type MouseEvent } from 'react';

type IconName =
  | 'arrow-right'
  | 'play'
  | 'zap'
  | 'lock'
  | 'dollar'
  | 'server'
  | 'code'
  | 'check'
  | 'layers'
  | 'layout'
  | 'shield'
  | 'copy'
  | 'check-check'
  | 'star'
  | 'github'
  | 'gitee';

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
    case 'check':
      return <svg {...common}><path d="m5 13 4 4L19 7" /></svg>;
    case 'layers':
      return <svg {...common}><path d="m12 2 10 5-10 5L2 7l10-5Z" /><path d="m2 12 10 5 10-5" /><path d="m2 17 10 5 10-5" /></svg>;
    case 'layout':
      return <svg {...common}><rect x="3" y="3" width="18" height="18" rx="4" /><path d="M3 9h18M9 21V9" /></svg>;
    case 'shield':
      return <svg {...common}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /></svg>;
    case 'copy':
      return <svg {...common}><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>;
    case 'check-check':
      return <svg {...common}><path d="m3 12 4 4L17 6" /><path d="m10 16 2 2 9-9" /></svg>;
    case 'star':
      return <svg {...common} fill="currentColor" stroke="none"><path d="m12 2.25 2.94 5.95 6.56.95-4.75 4.63 1.12 6.54L12 17.24l-5.87 3.08 1.12-6.54L2.5 9.15l6.56-.95L12 2.25Z" /></svg>;
    case 'github':
      return <svg {...common} fill="currentColor" stroke="none"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" /></svg>;
    case 'gitee':
      return <svg {...common} fill="currentColor" stroke="none"><path d="M11.984 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.016 0zm6.09 5.333c.328 0 .593.266.592.593v1.482a.594.594 0 0 1-.593.592H9.777c-.982 0-1.778.796-1.778 1.778v5.63c0 .327.266.592.593.592h5.63c.982 0 1.778-.796 1.778-1.778v-.296a.593.593 0 0 0-.592-.593h-4.15a.592.592 0 0 1-.592-.592v-1.482a.593.593 0 0 1 .593-.592h6.815c.327 0 .593.265.593.592v3.408a4 4 0 0 1-4 4H5.926a.593.593 0 0 1-.593-.593V9.778a4.444 4.444 0 0 1 4.445-4.444h8.296z" /></svg>;
  }
}

type TocItem = {
  num: string;
  navTitle: string;
  navDesc: string;
  badge: string;
  title: string;
  desc: string;
  link: string;
  features: { title: string; desc: string }[];
};

const tocItems: TocItem[] = [
  {
    num: '01',
    navTitle: '在线调试与 SSE 流',
    navDesc: 'Path/Query/Header/Body 联动与流式事件响应',
    badge: 'DEBUG & SSE',
    title: '全能型接口调试与 SSE 流式事件支持',
    desc: '重新组织调试工作台，参数编辑、动态 Header 注入、响应状态码分段展示与原请求回显同屏完成。1.4.0 深度支持 Server-Sent Events 流式事件，实时查看并可一键终止。',
    link: '/guide/ui/browse-debug',
    features: [
      { title: '多参数联动校验', desc: '支持 Path、Query、Cookie、Form-Data 与 JSON Body 混合输入' },
      { title: 'SSE 流式事件虚拟滚动', desc: '高效渲染 AI / 消息推送流式数据，支持随时暂停和终止' },
    ],
  },
  {
    num: '02',
    navTitle: '微服务网关聚合',
    navDesc: 'Spring Cloud Gateway 路由与文档自动发现',
    badge: 'GATEWAY ROUTING',
    title: 'Spring Cloud Gateway 路由与文档自动发现',
    desc: '引入单套网关 Starter 即可自动发现集群中各微服务的 OpenAPI 文档，自动解析 StripPrefix 过滤器并重写跨服务相对路径。',
    link: '/guide/plugin/gateway',
    features: [
      { title: '服务自动推导', desc: '无缝适配 WebFlux 与 WebMvc 双类型网关运行时' },
      { title: '跨服务全局检索', desc: '在网关统一入口直接模糊搜索所有子微服务接口' },
    ],
  },
  {
    num: '03',
    navTitle: 'Sa-Token 权限码提取',
    navDesc: '原生识别方法注解与鉴权参数透传',
    badge: 'SA-TOKEN & SECURITY',
    title: 'Sa-Token 权限码提取与安全鉴权',
    desc: '无侵入提取 Controller 方法上的 @SaCheckPermission 注解，直观展示每个接口所需的权限标识符与角色要求，支持全局鉴权请求头自动注入。',
    link: '/guide/plugin/satoken',
    features: [
      { title: '方法级权限透传', desc: '自动识别 AND / OR 权限组合逻辑并在界面显著标识' },
      { title: '文档访问密码保护', desc: '支持为文档入口增加账号密码校验，保障内部环境安全' },
    ],
  },
  {
    num: '04',
    navTitle: '枚举字典与多维导出',
    navDesc: '字段含义下拉补全与 Markdown / OpenAPI 导出',
    badge: 'ENUM & EXPORT',
    title: '枚举字典增强与离线文档导出',
    desc: '智能解析 Java Enum 枚举字典为入参下拉选择框与表格描述，同时支持一键将文档离线导出为 Markdown、HTML、OpenAPI JSON 与 Word。',
    link: '/guide/plugin/enum',
    features: [
      { title: '枚举下拉提示', desc: '输入框智能呈现枚举常量与含义映射，降低调试错填率' },
      { title: '全格式离线归档', desc: '支持附加品牌 Logo 导出可离线阅读的 Markdown 与 HTML' },
    ],
  },
];

type TerminalTabKey = 'webmvc' | 'webflux' | 'gateway-webflux' | 'gateway-webmvc' | 'bom' | 'yml';

const terminalTabs: { key: TerminalTabKey; label: string }[] = [
  { key: 'webmvc', label: '单体 WebMvc' },
  { key: 'webflux', label: '单体 WebFlux' },
  { key: 'gateway-webflux', label: '网关 WebFlux' },
  { key: 'gateway-webmvc', label: '网关 WebMvc' },
  { key: 'bom', label: 'BOM 统一管理' },
  { key: 'yml', label: 'application.yml' },
];

const terminalMeta: Record<TerminalTabKey, { tag: string; hint: string }> = {
  webmvc: { tag: '单体服务 · Servlet 栈', hint: '配合 spring-boot-starter-web · 统一 Starter 适配 Boot 3.4.x / 4.x' },
  webflux: { tag: '单体服务 · 响应式 WebFlux 栈', hint: '配合 spring-boot-starter-webflux · 统一 Starter 适配 Boot 3.4.x / 4.x' },
  'gateway-webflux': { tag: '网关聚合 · Reactive 响应式网关', hint: '配合 spring-cloud-starter-gateway-server-webflux · 自动聚合微服务' },
  'gateway-webmvc': { tag: '网关聚合 · Blocking 阻塞式网关', hint: '配合 spring-cloud-starter-gateway-server-webmvc · 自动聚合微服务' },
  bom: { tag: 'BOM 版本管理 · 官方推荐方案', hint: '使用 nextdoc4j-bom + springdoc-openapi-bom，依赖无需写版本号' },
  yml: { tag: '核心配置 · YAML 格式', hint: '单体或网关通用配置项，支持自定义文档入口路径' },
};

const snippets: Record<TerminalTabKey, string> = {
  webmvc: [
    '<!-- NextDoc4j 核心 Starter (Boot 3.4.x / 4.x 统一坐标) -->',
    '<dependency>',
    '    <groupId>top.nextdoc4j</groupId>',
    '    <artifactId>nextdoc4j-spring-boot-starter</artifactId>',
    '    <version>1.5.0</version>',
    '</dependency>',
    '',
    '<!-- 宿主自行引入 SpringDoc WebMvc UI -->',
    '<!-- Boot 3.4.x 推荐 2.8.17；Boot 4.x 请改为 3.0.3 -->',
    '<dependency>',
    '    <groupId>org.springdoc</groupId>',
    '    <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>',
    '    <version>2.8.17</version>',
    '</dependency>',
  ].join('\n'),
  webflux: [
    '<!-- NextDoc4j 核心 Starter (Boot 3.4.x / 4.x 统一坐标) -->',
    '<dependency>',
    '    <groupId>top.nextdoc4j</groupId>',
    '    <artifactId>nextdoc4j-spring-boot-starter</artifactId>',
    '    <version>1.5.0</version>',
    '</dependency>',
    '',
    '<!-- 宿主自行引入 SpringDoc WebFlux UI -->',
    '<!-- Boot 3.4.x 推荐 2.8.17；Boot 4.x 请改为 3.0.3 -->',
    '<dependency>',
    '    <groupId>org.springdoc</groupId>',
    '    <artifactId>springdoc-openapi-starter-webflux-ui</artifactId>',
    '    <version>2.8.17</version>',
    '</dependency>',
  ].join('\n'),
  'gateway-webflux': [
    '<!-- NextDoc4j 网关聚合 Starter (Boot 3.4.x / 4.x 统一坐标) -->',
    '<dependency>',
    '    <groupId>top.nextdoc4j</groupId>',
    '    <artifactId>nextdoc4j-gateway-spring-boot-starter</artifactId>',
    '    <version>1.5.0</version>',
    '</dependency>',
    '',
    '<!-- Spring Cloud Gateway 响应式网关运行时 (WebFlux) -->',
    '<dependency>',
    '    <groupId>org.springframework.cloud</groupId>',
    '    <artifactId>spring-cloud-starter-gateway-server-webflux</artifactId>',
    '</dependency>',
    '',
    '<!-- 宿主引入 SpringDoc WebFlux UI (Boot 3.4.x: 2.8.17 / Boot 4: 3.0.3) -->',
    '<dependency>',
    '    <groupId>org.springdoc</groupId>',
    '    <artifactId>springdoc-openapi-starter-webflux-ui</artifactId>',
    '    <version>2.8.17</version>',
    '</dependency>',
  ].join('\n'),
  'gateway-webmvc': [
    '<!-- NextDoc4j 网关聚合 Starter (Boot 3.4.x / 4.x 统一坐标) -->',
    '<dependency>',
    '    <groupId>top.nextdoc4j</groupId>',
    '    <artifactId>nextdoc4j-gateway-spring-boot-starter</artifactId>',
    '    <version>1.5.0</version>',
    '</dependency>',
    '',
    '<!-- Spring Cloud Gateway 阻塞式网关运行时 (WebMvc) -->',
    '<dependency>',
    '    <groupId>org.springframework.cloud</groupId>',
    '    <artifactId>spring-cloud-starter-gateway-server-webmvc</artifactId>',
    '</dependency>',
    '',
    '<!-- 宿主引入 SpringDoc WebMvc UI (Boot 3.4.x: 2.8.17 / Boot 4: 3.0.3) -->',
    '<dependency>',
    '    <groupId>org.springdoc</groupId>',
    '    <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>',
    '    <version>2.8.17</version>',
    '</dependency>',
  ].join('\n'),
  bom: [
    '<!-- 1. 放入 dependencyManagement 中统一管理 NextDoc4j 与 SpringDoc 版本 -->',
    '<dependencyManagement>',
    '    <dependencies>',
    '        <dependency>',
    '            <groupId>top.nextdoc4j</groupId>',
    '            <artifactId>nextdoc4j-bom</artifactId>',
    '            <version>1.5.0</version>',
    '            <type>pom</type>',
    '            <scope>import</scope>',
    '        </dependency>',
    '        <!-- SpringDoc BOM: Boot 3.4.x 填 2.8.17；Boot 4 填 3.0.3 -->',
    '        <dependency>',
    '            <groupId>org.springdoc</groupId>',
    '            <artifactId>springdoc-openapi-bom</artifactId>',
    '            <version>2.8.17</version>',
    '            <type>pom</type>',
    '            <scope>import</scope>',
    '        </dependency>',
    '    </dependencies>',
    '</dependencyManagement>',
    '',
    '<!-- 2. 在 dependencies 中直接引入（无需填写 version 版本号） -->',
    '<dependencies>',
    '    <dependency>',
    '        <groupId>top.nextdoc4j</groupId>',
    '        <artifactId>nextdoc4j-spring-boot-starter</artifactId>',
    '    </dependency>',
    '    <dependency>',
    '        <groupId>org.springdoc</groupId>',
    '        <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>',
    '    </dependency>',
    '</dependencies>',
  ].join('\n'),
  yml: [
    'nextdoc4j:',
    '  enabled: true                    # 是否启用 NextDoc4j 文档工作台（默认 false）',
    '  doc-path: /doc.html              # 自定义文档入口路径（默认 /doc.html）',
    '  gateway:',
    '    auto-discovery: true           # 网关场景：开启子微服务 OpenAPI 文档自动发现与聚合',
    '    routes-reload-interval: 30s    # 网关场景：动态路由探测刷新间隔',
  ].join('\n'),
};

const bentoCards: { icon: IconName; title: string; desc: string; pills: string[] }[] = [
  {
    icon: 'layers',
    title: '单 Starter 适配 Boot 3 & 4',
    desc: '1.4.0 起统一单套坐标，无论在 Spring Boot 3.4.x 还是 Spring Boot 4 环境下均可无缝引入，无需为不同版本切换 artifactId。',
    pills: ['nextdoc4j-bom', 'Zero-Migration'],
  },
  {
    icon: 'layout',
    title: '企业级品牌与主题定制',
    desc: '基于 Vben 5 设计标准，支持自定义 Logo、系统标题、主色调、菜单展示模式与文档入口路径，与企业产品视觉体系统一。',
    pills: ['CSS Variables', 'Brand Theme'],
  },
  {
    icon: 'shield',
    title: '安全鉴权与全局配置',
    desc: '支持简单文档密码拦截、全局 Token 注入与调试缓存开关控制。敏感环境轻松锁定，避免未授权调试。',
    pills: ['Auth Interceptor', 'Global Params'],
  },
];

const comparisonRows = [
  ['Boot 3 / 4 适配', '单套坐标统一支持', '依赖拆分多套坐标'],
  ['SSE 流式调试', '支持事件流渲染与中止', '仅单次响应缓冲'],
  ['微服务网关聚合', '自动推导与 StripPrefix', '需手动编码转发配置'],
  ['权限码注解识别', '原生解析 Sa-Token 注解', '无原生权限注解联动'],
  ['视觉与主题体系', 'Vben 5 规范 / 浅深双模', '陈旧单列卡顿布局'],
];

const quickLinkGroups = [
  {
    title: '指南文档',
    links: [
      ['快速开始', '/guide/start/started'],
      ['基础配置', '/guide/config/basicconfiguration'],
      ['品牌定制', '/guide/config/brandconfiguration'],
      ['浏览与调试', '/guide/ui/browse-debug'],
    ],
  },
  {
    title: '插件生态',
    links: [
      ['Sa-Token 权限插件', '/guide/plugin/satoken'],
      ['网关聚合插件', '/guide/plugin/gateway'],
      ['枚举字典插件', '/guide/plugin/enum'],
      ['认证展示插件', '/guide/plugin/authentication'],
    ],
  },
  {
    title: '社区支持',
    links: [
      ['社区与支持', '/more/team'],
      ['贡献指南', '/more/contribute'],
      ['更新日志', '/more/changelog'],
      ['常见问题 (FAQ)', '/more/faq'],
    ],
  },
  {
    title: '代码仓库',
    links: [
      ['GitHub 组织', 'https://github.com/NextDoc4j'],
      ['Gitee 组织', 'https://gitee.com/NextDoc4j'],
      ['单体服务演示', 'https://single-demo.nextdoc4j.top/'],
      ['网关聚合演示', 'https://gateway-demo.nextdoc4j.top/'],
    ],
  },
] as const;

const communityCards = [
  {
    id: 'gitee',
    title: 'Gitee 码云',
    role: '国内主仓',
    desc: '官方主代码仓库，提供国内极速拉取与发行版同步下载。',
    href: 'https://gitee.com/nextdoc4j/nextdoc4j',
    label: '前往 Gitee Star',
  },
  {
    id: 'github',
    title: 'GitHub',
    role: '全球镜像',
    desc: '面向全球开发者的开源协作阵地，欢迎提交 Issue 缺陷与 PR。',
    href: 'https://github.com/NextDoc4j/nextdoc4j',
    label: '前往 GitHub Star',
  },
  {
    id: 'gitcode',
    title: 'GitCode',
    role: 'CSDN 社区',
    desc: 'CSDN 开发者生态代码托管平台，支持开发者一键同步与交流。',
    href: 'https://gitcode.com/NextDoc4j/nextdoc4j',
    label: '前往 GitCode Star',
  },
] as const;

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

function makeTranslate(x: number, y: number) {
  return 'translate(' + x + 'px, ' + y + 'px)';
}

function renderCodeLine(line: string) {
  const trimmed = line.trim();
  if (trimmed.startsWith('<!--') || trimmed.startsWith('#')) {
    return <span className="syn-cmt">{line}</span>;
  }

  if (line.includes('<')) {
    return line.split(/(<\/?[A-Za-z][^>]*>)/g).map((part, index) => (
      part.startsWith('<')
        ? <span className="syn-tag" key={part + '-' + index}>{part}</span>
        : <span key={part + '-' + index}>{part}</span>
    ));
  }

  const yamlMatch = line.match(/^(\s*)([A-Za-z0-9_-]+:)(.*?)(\s+#.*)?$/);
  if (yamlMatch) {
    const [, indent, key, value, comment] = yamlMatch;
    return (
      <>
        {indent}
        <span className="syn-key">{key}</span>
        <span className={value.trim() ? 'syn-str' : undefined}>{value}</span>
        {comment ? <span className="syn-cmt">{comment}</span> : null}
      </>
    );
  }

  return line;
}

function renderSnippet(snippet: string) {
  const lines = snippet.split('\n');
  return lines.map((line, index) => (
    <span className="terminal-code-line" key={line + '-' + index}>
      {renderCodeLine(line)}
      {index < lines.length - 1 ? '\n' : null}
    </span>
  ));
}

export function HomePage() {
  const [studioTab, setStudioTab] = useState<'overview' | 'detail' | 'debug'>('overview');
  const [activeTocIndex, setActiveTocIndex] = useState(0);
  const [terminalTab, setTerminalTab] = useState<TerminalTabKey>('webmvc');
  const [isCopied, setIsCopied] = useState(false);
  const [cardTransform, setCardTransform] = useState('perspective(1000px) rotateX(0deg) rotateY(0deg)');
  const [glareStyle, setGlareStyle] = useState('none');
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isDemoMenuOpen, setIsDemoMenuOpen] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const demoMenuRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draggingRef = useRef(false);
  const currentToc = tocItems[activeTocIndex] ?? tocItems[0];

  useEffect(() => {
    return () => {
      if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current);
      if (copyTimerRef.current !== null) clearTimeout(copyTimerRef.current);
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

  const copyCurrentSnippet = async () => {
    try {
      await navigator.clipboard.writeText(snippets[terminalTab]);
      setIsCopied(true);
      if (copyTimerRef.current !== null) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setIsCopied(false), 1800);
    } catch (error) {
      console.error('Failed to copy snippet:', error);
    }
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
                  <div className="macos-segmented-pill">
                    {[
                      ['overview', '接口总览'],
                      ['detail', '接口详情'],
                      ['debug', '在线调试'],
                    ].map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        className={'macos-segment-item ' + (studioTab === key ? 'active' : '')}
                        onClick={() => setStudioTab(key as 'overview' | 'detail' | 'debug')}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <div className="macos-address-pill">
                    <span className="green-dot" />
                    <span>http://localhost:8080/doc.html</span>
                  </div>
                </div>
                <div className="macos-window-viewport">
                  <div className="macos-window-glare" style={{ background: glareStyle }} />
                  {studioTab === 'overview' ? (
                    <div className="macos-view-panel active panel-overview">
                      <img className="no-zoom overview-theme-light" src="/images/screenshots/bright-home.png" alt="NextDoc4j 接口总览浅色界面" />
                      <img className="no-zoom overview-theme-dark" src="/images/screenshots/dark-home.png" alt="NextDoc4j 接口总览深色界面" />
                    </div>
                  ) : null}
                  {studioTab === 'detail' ? (
                    <div className="macos-view-panel active panel-detail">
                      <img className="no-zoom" src="/images/screenshots/guide/detail-workbench.png" alt="NextDoc4j 接口详情工作台" />
                    </div>
                  ) : null}
                  {studioTab === 'debug' ? (
                    <div className="macos-view-panel active panel-debug">
                      <img className="no-zoom" src="/images/screenshots/guide/debug-panel-placeholder.png" alt="NextDoc4j 在线调试面板" />
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="toc-flow-section">
        <div className="shell">
          <div className="flow-header">
            <h2 className="flow-title">系统化探索核心架构能力</h2>
            <p className="flow-subtitle">结构清晰、触手可及。点击左侧能力目录，查看 NextDoc4j 针对研发协作链路的针对性优化。</p>
          </div>
          <div className="toc-explorer-box">
            <div className="toc-index-nav">
              {tocItems.map((item, index) => (
                <button
                  key={item.num}
                  type="button"
                  className={'toc-nav-item ' + (activeTocIndex === index ? 'active' : '')}
                  onClick={() => setActiveTocIndex(index)}
                >
                  <span className="toc-nav-index-num">{item.num}</span>
                  <span className="toc-nav-info">
                    <span className="toc-nav-info-title">{item.navTitle}</span>
                    <span className="toc-nav-info-desc">{item.navDesc}</span>
                  </span>
                  <span className="toc-nav-arrow"><Icon name="arrow-right" size={14} /></span>
                </button>
              ))}
            </div>
            <div className="toc-display-pane">
              <div className="toc-display-top">
                <div className="toc-display-tag-strip">
                  <span className="toc-tag-badge">{currentToc.badge}</span>
                  <span className="toc-tag-badge sub-badge">OpenAPI 3.1</span>
                </div>
                <h3 className="toc-display-title">{currentToc.title}</h3>
                <p className="toc-display-desc">{currentToc.desc}</p>
                <div className="toc-features-grid">
                  {currentToc.features.map((feature) => (
                    <div key={feature.title} className="toc-feature-chip">
                      <span className="chip-icon"><Icon name="check" size={10} /></span>
                      <span>
                        <span className="chip-text-title">{feature.title}</span>
                        <span className="chip-text-desc">{feature.desc}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="toc-display-action-row">
                <Link className="toc-learn-more-link" href={currentToc.link}>
                  <span>阅读该特性的详细使用指南</span>
                  <Icon name="arrow-right" size={14} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bento-fluid-section">
        <div className="shell">
          <div className="bento-fluid-grid">
            {bentoCards.map((card) => (
              <article key={card.title} className="bento-soft-card">
                <div className="bento-card-icon"><Icon name={card.icon} size={22} /></div>
                <h3 className="bento-card-title">{card.title}</h3>
                <p className="bento-card-desc">{card.desc}</p>
                <div className="bento-card-pill-row">
                  {card.pills.map((pill) => <span key={pill} className="bento-pill-item">{pill}</span>)}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="terminal-section">
        <div className="shell">
          <div className="flow-header terminal-header">
            <h2 className="flow-title">最简依赖引入与配置</h2>
            <p className="flow-subtitle">支持单体 WebMvc / WebFlux、网关 WebFlux / WebMvc 及 BOM 统一版本管理，几行配置即可替换传统 Swagger UI。</p>
          </div>
          <div className="terminal-shell-box">
            <div className="terminal-titlebar">
              <div className="terminal-segmented-tabs">
                {terminalTabs.map((tab) => (
                  <button key={tab.key} type="button" className={'terminal-tab-btn ' + (terminalTab === tab.key ? 'active' : '')} onClick={() => setTerminalTab(tab.key)}>
                    {tab.label}
                  </button>
                ))}
              </div>
              <button type="button" className={'terminal-copy-action ' + (isCopied ? 'copied' : '')} onClick={copyCurrentSnippet}>
                <Icon name={isCopied ? 'check-check' : 'copy'} size={12} />
                <span>{isCopied ? '已复制' : '复制'}</span>
              </button>
            </div>
            <div className="terminal-code-body">
              <div className="terminal-meta-bar">
                <span className="terminal-meta-tag">{terminalMeta[terminalTab].tag}</span>
                <span className="terminal-meta-hint">{terminalMeta[terminalTab].hint}</span>
              </div>
              <pre><code>{renderSnippet(snippets[terminalTab])}</code></pre>
            </div>
          </div>
        </div>
      </section>

      <section className="spec-matrix-section">
        <div className="shell">
          <div className="flow-header"><h2 className="flow-title">技术特性对比概览</h2></div>
          <div className="spec-table-box">
            <div className="spec-table-row head">
              <div>维度指标</div>
              <div><span className="spec-head-brand-badge">NextDoc4j (v1.5.0)</span></div>
              <div>传统 Swagger UI</div>
            </div>
            {comparisonRows.map(([dimension, nextdoc, swagger]) => (
              <div className="spec-table-row" key={dimension}>
                <div data-label="维度指标"><strong>{dimension}</strong></div>
                <div className="spec-cell-brand" data-label="NextDoc4j"><Icon name="check" size={14} />{nextdoc}</div>
                <div className="spec-cell-dim" data-label="传统 Swagger UI">{swagger}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="community-nav-section">
        <div className="shell">
          <div className="community-header">
            <h2 className="flow-title">开源社区与快速链接</h2>
            <p className="flow-subtitle">选择您喜爱的代码托管平台 Star 支持我们，或快速导航至相关文档。</p>
          </div>
          <div className="community-platforms-wrap">
            <div className="community-cards-grid">
              {communityCards.map((card) => (
                <article key={card.id} className="platform-interactive-card">
                  <div className="platform-card-header">
                    <div className="platform-identity">
                      <div className={'platform-symbol-icon ' + card.id}>
                        {card.id === 'gitcode' ? <img src="/logo/gitcode.png" alt="GitCode" /> : <Icon name={card.id as 'github' | 'gitee'} size={22} />}
                      </div>
                      <div className="platform-title-text">{card.title}</div>
                    </div>
                    <span className="platform-role-tag">{card.role}</span>
                  </div>
                  <p className="platform-card-desc">{card.desc}</p>
                  <div className="platform-cta-row">
                    <a className="btn-star-primary" href={card.href} target="_blank" rel="noopener noreferrer">
                      <Icon name="star" size={14} />
                      <span>{card.label}</span>
                    </a>
                  </div>
                </article>
              ))}
            </div>
          </div>
          <div className="home-quick-links-grid">
            {quickLinkGroups.map((group) => (
              <div className="quick-link-col" key={group.title}>
                <h4>{group.title}</h4>
                <ul>
                  {group.links.map(([label, href]) => (
                    <li key={label}>
                      {href.startsWith('http') ? (
                        <a href={href} target="_blank" rel="noopener noreferrer">{label}</a>
                      ) : (
                        <Link href={href}>{label}</Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="home-footer">
        <span>Copyright © 2025 <a href="https://nextdoc4j.top/" target="_blank" rel="noopener noreferrer">NextDoc4j 版权所有</a></span>
        <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer">浙ICP备2025151976号-2</a>
      </footer>
    </div>
  );
}
