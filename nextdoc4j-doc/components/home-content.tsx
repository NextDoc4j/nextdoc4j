'use client';

import Link from 'next/link';
import {
  memo,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { LayoutGroup, motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Copy,
  Files,
  Braces,
  FileJson2,
  Network,
  Package,
  PanelsTopLeft,
  Server,
  ShieldCheck,
  Terminal,
  Radio,
  Workflow,
} from 'lucide-react';
import { GiteeMark, GithubMark } from '@/components/platform-marks';
import { Tooltip } from '@/components/rare-ui/tooltip';
import { AnimatedTabs, tabSpring } from '@/components/rare-ui/animated-tabs';
import {
  AnimatedContent,
  AnimatedHeight,
} from '@/components/rare-ui/animated-content';
import { ThemedScreenshot } from '@/components/themed-screenshot';
import { platformLinks } from '@/lib/platforms';
import { version } from '@/package.json';

const steps = [
  {
    title: '添加依赖',
    description: '引入 NextDoc4j Starter 与匹配的 SpringDoc UI。',
  },
  { title: '启用文档', description: '在宿主配置中打开工作台，默认保持关闭。' },
  { title: '启动并访问', description: '启动应用，从 /doc.html 打开接口文档。' },
];

const configurations = {
  brand: {
    label: '品牌与入口',
    description: '设置工作台和登录页的标题、Logo，并指定文档入口。',
    code: 'nextdoc4j:\n  enabled: true\n  doc-path: /docs\n  extension:\n    enabled: true\n    brand:\n      title: 订单开放平台\n      logo: classpath:/brand/logo.svg',
    note: '将 Logo 放入宿主的 classpath:/brand/logo.svg，重启后通过 /docs 访问。',
    href: '/guide/config/brandconfiguration',
  },
  auth: {
    label: '文档访问保护',
    description: '使用环境变量管理访问密码，为文档增加登录入口。',
    code: 'nextdoc4j:\n  enabled: true\n  auth:\n    enabled: true\n    password: ${NEXTDOC4J_DOC_PASSWORD}',
    note: '文档密码控制文档访问；业务接口的认证和权限仍由宿主应用管理。',
    href: '/guide/config/authconfiguration',
  },
  production: {
    label: '生产环境关闭',
    description: '保留应用依赖，通过环境配置屏蔽文档资源。',
    code: 'nextdoc4j:\n  enabled: true\n  production: true',
    note: 'production=true 时，文档入口及相关文档资源返回 404。',
    href: '/guide/config/basicconfiguration',
  },
} as const;

type ConfigurationKey = keyof typeof configurations;

const capabilities = [
  {
    title: 'SSE 流式响应',
    detail: '逐条查看事件内容，按需终止当前连接。',
    href: '/guide/ui/response-preview',
    icon: Radio,
  },
  {
    title: '请求前后置操作',
    detail: '可视化步骤与 JavaScript 脚本，提取变量、回填认证。',
    href: '/guide/ui/request-workflows',
    icon: Workflow,
  },
  {
    title: '文档导出与交付',
    detail: 'OpenAPI、Markdown、HTML、Word，以及打印 PDF。',
    href: '/guide/ui/search-export',
    icon: Files,
  },
];

const resourceGroups = [
  {
    title: '开始使用',
    links: [
      ['快速开始', '/guide/start/started'],
      ['配置说明', '/guide/config/basicconfiguration'],
      ['开发指南', '/development'],
      ['常见问题', '/more/faq'],
    ],
  },
  {
    title: '工作台与插件',
    links: [
      ['界面功能', '/guide/ui/overview'],
      ['枚举展示插件', '/guide/plugin/enum'],
      ['Sa-Token 权限码', '/guide/plugin/satoken'],
      ['网关聚合', '/guide/plugin/gateway'],
    ],
  },
  {
    title: '参与项目',
    links: [
      ['贡献指南', '/more/contribute'],
      ['更新日志', '/more/changelog'],
      ['社区与支持', '/more/team'],
      [
        'Demo 源码 ↗',
        'https://github.com/NextDoc4j/nextdoc4j/tree/master/nextdoc4j-demo',
      ],
    ],
  },
] as const;

function DocLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="hp-text-link">
      {children}
      <ArrowRight aria-hidden="true" />
    </Link>
  );
}

function CodePanel({
  filename,
  code,
  language,
}: {
  filename: string;
  code: string;
  language: 'xml' | 'yaml';
}) {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>(
    'idle',
  );
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setCopyState('idle');
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [code]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopyState('copied');
    } catch {
      setCopyState('failed');
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopyState('idle'), 1800);
  }

  return (
    <div className="hp-code-panel">
      <div className="hp-file-bar">
        <span>
          <span className="hp-file-extension">
            {language === 'xml' ? 'XML' : 'YML'}
          </span>
          {filename}
        </span>
        <button
          type="button"
          className="hp-copy"
          onClick={copy}
          aria-label={`复制 ${filename}`}
        >
          {copyState === 'copied' ? (
            <Check aria-hidden="true" />
          ) : (
            <Copy aria-hidden="true" />
          )}
          <span role="status">
            {copyState === 'copied'
              ? '已复制'
              : copyState === 'failed'
                ? '复制失败'
                : '复制'}
          </span>
        </button>
      </div>
      <pre className="hp-code">
        <code>
          {code.split('\n').map((line, index) => {
            const yaml =
              language === 'yaml' ? line.match(/^(\s*)([\w-]+:)(.*)$/) : null;
            return (
              <span className="hp-code-line" key={index}>
                <span className="hp-line-number" aria-hidden="true">
                  {index + 1}
                </span>
                <span>
                  {yaml ? (
                    <>
                      {yaml[1]}
                      <span className="hp-code-key">{yaml[2]}</span>
                      <span className="hp-code-value">{yaml[3]}</span>
                    </>
                  ) : (
                    line.split(/(<\/?[\w.-]+>)/g).map((token, i) => (
                      <span
                        className={
                          token.startsWith('<') ? 'hp-code-tag' : undefined
                        }
                        key={i}
                      >
                        {token}
                      </span>
                    ))
                  )}
                </span>
              </span>
            );
          })}
        </code>
      </pre>
    </div>
  );
}

function SectionHeading({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="hp-section-heading">
      <h2 id={id}>{title}</h2>
      <p>{children}</p>
    </div>
  );
}

function WindowBar({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="hp-window-bar">
      <div className="macos-window-lights" aria-hidden="true">
        <span className="macos-light-btn close" />
        <span className="macos-light-btn min" />
        <span className="macos-light-btn max" />
      </div>
      <span className="hp-window-title">{title}</span>
      {children ? <div className="hp-window-controls">{children}</div> : null}
    </div>
  );
}

function Installation() {
  const [step, setStep] = useState(0);
  const stepGroup = useId();
  const reducedMotion = useReducedMotion();
  const [boot, setBoot] = useState<'3' | '4'>('3');
  const [stack, setStack] = useState<'webmvc' | 'webflux'>('webmvc');
  const springdocVersion = boot === '3' ? '2.9.1' : '3.1.1';
  const dependencies = `<dependency>\n    <groupId>top.nextdoc4j</groupId>\n    <artifactId>nextdoc4j-spring-boot-starter</artifactId>\n    <version>${version}</version>\n</dependency>\n<dependency>\n    <groupId>org.springdoc</groupId>\n    <artifactId>springdoc-openapi-starter-${stack}-ui</artifactId>\n    <version>${springdocVersion}</version>\n</dependency>`;

  return (
    <section
      className="hp-section hp-installation"
      aria-labelledby="hp-install-title"
    >
      <div className="shell">
        <SectionHeading id="hp-install-title" title="三步接入 Spring Boot 项目">
          保留现有的 SpringDoc
          接口描述，添加依赖、启用配置，即可打开文档工作台。
        </SectionHeading>
        <div className="hp-window hp-install-window">
          <WindowBar title="快速接入">
            <span className="hp-window-meta">NextDoc4j {version}</span>
          </WindowBar>
          <AnimatedHeight>
            <div className="hp-install-grid">
              <div className="hp-install-copy">
                <LayoutGroup id={stepGroup}>
                  <ol className="hp-install-steps" aria-label="接入步骤">
                    {steps.map((item, index) => (
                      <li key={item.title}>
                        <button
                          type="button"
                          onClick={() => setStep(index)}
                          aria-pressed={step === index}
                          aria-controls="hp-install-example"
                        >
                          {step === index && (
                            <motion.span
                              className="hp-step-active"
                              layoutId="active-step"
                              transition={
                                reducedMotion ? { duration: 0 } : tabSpring
                              }
                              aria-hidden="true"
                            />
                          )}
                          <span className="hp-step-number">{index + 1}</span>
                          <span className="hp-step-label">
                            <strong>{item.title}</strong>
                            <span>{item.description}</span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ol>
                </LayoutGroup>
                <DocLink href="/guide/start/started">完整接入指南</DocLink>
                <p className="hp-install-requirements">
                  JDK 17+ <span>·</span> Maven 3.9+
                  <br />
                  Spring Boot 3 / 4
                </p>
              </div>
              <div className="hp-install-example" id="hp-install-example">
                <div className="hp-example-toolbar">
                  {step === 0 ? (
                    <>
                      <AnimatedTabs
                        className="hp-switch"
                        label="选择 Spring Boot 版本"
                        items={[
                          { id: '3', label: 'Boot 3' },
                          { id: '4', label: 'Boot 4' },
                        ]}
                        value={boot}
                        onChange={setBoot}
                        controls="hp-install-code"
                      />
                      <label className="hp-stack-select">
                        Web 栈
                        <select
                          value={stack}
                          onChange={(event) =>
                            setStack(event.target.value as typeof stack)
                          }
                          aria-label="选择 Web 栈"
                        >
                          <option value="webmvc">WebMVC</option>
                          <option value="webflux">WebFlux</option>
                        </select>
                      </label>
                    </>
                  ) : (
                    <>
                      <span className="hp-example-stage">
                        {steps[step].title}
                      </span>
                      <button
                        type="button"
                        className="hp-text-link"
                        onClick={() => setStep(0)}
                      >
                        查看依赖
                        <ArrowRight aria-hidden="true" />
                      </button>
                    </>
                  )}
                </div>
                <AnimatedContent
                  id="hp-install-code"
                  className="hp-install-content"
                  transitionKey={`${step}-${boot}-${stack}`}
                  resize={false}
                >
                  {step === 0 ? (
                    <CodePanel
                      filename="pom.xml"
                      code={dependencies}
                      language="xml"
                    />
                  ) : step === 1 ? (
                    <CodePanel
                      filename="application.yml"
                      code={'nextdoc4j:\n  enabled: true'}
                      language="yaml"
                    />
                  ) : (
                    <div className="hp-open-preview">
                      <div className="hp-preview-address">
                        <code>http://localhost:8080/doc.html</code>
                      </div>
                      <ThemedScreenshot
                        light="/images/screenshots/features/workspace-light.webp"
                        dark="/images/screenshots/features/workspace-dark.webp"
                        alt="应用启动后打开的 NextDoc4j 工作台"
                        width={1440}
                        height={960}
                      />
                    </div>
                  )}
                  <p className="hp-example-note">
                    {step === 0
                      ? `Boot ${boot} 使用 SpringDoc ${boot === '3' ? '2.x' : '3.x'}，示例版本 ${springdocVersion}。已有 SpringDoc UI 时复用兼容版本。`
                      : step === 1
                        ? 'enabled 默认是 false。合并到宿主的 application.yml 后，重新启动应用。'
                        : '替换为应用实际端口；有上下文路径时，在 /doc.html 前加上对应前缀。'}
                  </p>
                </AnimatedContent>
              </div>
            </div>
          </AnimatedHeight>
        </div>
      </div>
    </section>
  );
}

function ArchitectureDiagram({ single }: { single: boolean }) {
  const reducedMotion = useReducedMotion();
  const appear = (delay: number) => ({
    initial: { opacity: 0, y: reducedMotion ? 0 : 10 },
    animate: { opacity: 1, y: 0 },
    transition: {
      ...tabSpring,
      delay: reducedMotion ? 0 : delay,
      ...(reducedMotion ? { duration: 0 } : {}),
    },
  });
  return (
    <div
      className={`hp-diagram ${single ? 'hp-diagram-single' : 'hp-diagram-gateway'}`}
      role="img"
      aria-label={
        single
          ? '单体架构：Controller 由 SpringDoc 生成 OpenAPI 文档，NextDoc4j Starter 提供页面资源与扩展，工作台读取文档并向宿主发起调试请求。'
          : '网关架构：用户、系统和文件服务提供 OpenAPI，Spring Cloud Gateway 聚合服务文档并转发请求，NextDoc4j 工作台按服务切换。'
      }
    >
      <div className="hp-app-boundary">
        <div className="hp-diagram-caption">
          <span>
            <Server aria-hidden="true" />
            {single ? 'Spring Boot 应用' : '微服务与网关'}
          </span>
          <code>{single ? 'WebMVC / WebFlux' : 'Spring Cloud Gateway'}</code>
        </div>
        {single ? (
          <div className="hp-app-flow">
            <motion.div className="hp-flow-node" {...appear(0.04)}>
              <Braces aria-hidden="true" />
              <strong>Controller</strong>
              <code>@Operation · @Schema</code>
            </motion.div>
            <ArrowRight className="hp-flow-arrow" aria-hidden="true" />
            <motion.div className="hp-flow-node" {...appear(0.1)}>
              <FileJson2 aria-hidden="true" />
              <strong>SpringDoc</strong>
              <code>/v3/api-docs</code>
            </motion.div>
          </div>
        ) : (
          <>
            <div className="hp-services">
              {['用户服务', '系统服务', '文件服务'].map((name, index) => (
                <motion.div key={name} {...appear(index * 0.05)}>
                  <Server aria-hidden="true" />
                  <strong>{name}</strong>
                  <code>/v3/api-docs</code>
                </motion.div>
              ))}
            </div>
            <svg
              className="hp-service-routes"
              viewBox="0 0 480 38"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              {[
                'M80 0 V10 Q80 18 88 18 H232 Q240 18 240 26 V38',
                'M240 0 V38',
                'M400 0 V10 Q400 18 392 18 H248 Q240 18 240 26 V38',
              ].map((d) => (
                <motion.path
                  key={d}
                  d={d}
                  initial={{ pathLength: reducedMotion ? 1 : 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{
                    duration: reducedMotion ? 0 : 0.45,
                    delay: reducedMotion ? 0 : 0.12,
                  }}
                />
              ))}
            </svg>
          </>
        )}
        <motion.div className="hp-runtime" {...appear(0.14)}>
          <span className="hp-runtime-icon">
            {single ? (
              <Package aria-hidden="true" />
            ) : (
              <Network aria-hidden="true" />
            )}
          </span>
          <div>
            <strong>
              {single ? 'NextDoc4j Starter' : 'Spring Cloud Gateway'}
            </strong>
            <span>
              {single
                ? '页面资源 / 访问保护 / 扩展元数据'
                : '服务发现 / 文档转发 / 前缀重写'}
            </span>
          </div>
          <span className="hp-runtime-label">
            {single ? '应用内集成' : '统一入口'}
          </span>
        </motion.div>
      </div>
      <div className="hp-diagram-connector">
        <svg viewBox="0 0 20 52" aria-hidden="true">
          <path d="M10 0V48m-4-5 4 5 4-5" />
          <motion.path
            className="hp-connector-trace"
            d="M10 0V48m-4-5 4 5 4-5"
            initial={{ pathLength: reducedMotion ? 1 : 0 }}
            animate={{ pathLength: 1 }}
            transition={{
              duration: reducedMotion ? 0 : 0.45,
              delay: reducedMotion ? 0 : 0.22,
            }}
          />
        </svg>
        <span>{single ? 'OpenAPI 3 + 扩展信息' : '按服务加载 OpenAPI'}</span>
      </div>
      <motion.div className="hp-workbench" {...appear(0.22)}>
        <div className="hp-workbench-header">
          <img src="/logo/logo.png" alt="" width={26} height={30} />
          <strong>NextDoc4j 工作台</strong>
          <code>/doc.html</code>
        </div>
        <div className="hp-workbench-tools">
          <span>
            <PanelsTopLeft aria-hidden="true" />
            文档与模型
          </span>
          <span>
            <Terminal aria-hidden="true" />
            在线调试
          </span>
          <span>
            <ShieldCheck aria-hidden="true" />
            认证与参数
          </span>
        </div>
      </motion.div>
      <p className="hp-diagram-footnote">
        {single
          ? '业务请求直接发送到当前应用。'
          : '业务请求仍通过已有的 Gateway 路由转发。'}
      </p>
    </div>
  );
}

function Architecture() {
  const [mode, setMode] = useState<'single' | 'gateway'>('single');
  const single = mode === 'single';
  return (
    <section
      className="hp-section hp-architecture"
      aria-labelledby="hp-architecture-title"
    >
      <div className="shell">
        <SectionHeading
          id="hp-architecture-title"
          title="适配单体应用与微服务网关"
        >
          SpringDoc 生成 OpenAPI，NextDoc4j 提供工作台。根据部署方式选择对应
          Starter。
        </SectionHeading>
        <div className="hp-window">
          <WindowBar title="接入架构">
            <AnimatedTabs
              className="hp-switch"
              label="选择部署架构"
              items={[
                { id: 'single', label: '单体应用' },
                { id: 'gateway', label: '网关聚合' },
              ]}
              value={mode}
              onChange={setMode}
              controls="hp-architecture-example"
            />
          </WindowBar>
          <AnimatedContent
            id="hp-architecture-example"
            transitionKey={mode}
            contentClassName="hp-architecture-grid"
          >
            <ArchitectureDiagram single={single} />
            <div className="hp-architecture-copy">
              <span className="hp-architecture-badge">
                {single ? (
                  <Package aria-hidden="true" />
                ) : (
                  <Network aria-hidden="true" />
                )}
                {single ? '随应用部署' : '在网关聚合'}
              </span>
              <h3>{single ? '应用内直接使用' : '统一多个服务的文档入口'}</h3>
              <p className="hp-architecture-detail">
                {single
                  ? '页面资源随 JAR 提供，文档与接口位于同一应用。WebMVC 与 WebFlux 共用单体 Starter。'
                  : '从已有 Gateway 路由发现服务文档，处理转发前缀与分组地址。下游服务提供 OpenAPI 文档即可。'}
              </p>
              <ul className="hp-architecture-facts">
                {(single
                  ? ['文档与接口同源访问', '复用 SpringDoc 接口分组']
                  : ['下游服务提供 OpenAPI', '复用已有服务路由']
                ).map((fact) => (
                  <li key={fact}>
                    <Check aria-hidden="true" />
                    {fact}
                  </li>
                ))}
              </ul>
              <div className="hp-starter-block">
                <span>
                  <Package aria-hidden="true" />
                  引入的 Starter
                </span>
                <code className="hp-starter-name">
                  {single
                    ? 'nextdoc4j-spring-boot-starter'
                    : 'nextdoc4j-gateway-spring-boot-starter'}
                </code>
              </div>
              <div className="hp-architecture-links">
                <DocLink
                  href={
                    single ? '/guide/start/started' : '/guide/plugin/gateway'
                  }
                >
                  接入说明
                </DocLink>
                <a
                  className="hp-demo-link"
                  href={
                    single
                      ? 'https://single-demo.nextdoc4j.top/'
                      : 'https://gateway-demo.nextdoc4j.top/'
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {single ? '单体在线演示' : '网关在线演示'}
                  <ArrowUpRight aria-hidden="true" />
                </a>
              </div>
            </div>
          </AnimatedContent>
        </div>
      </div>
    </section>
  );
}

function Capabilities() {
  return (
    <section
      className="hp-section hp-capabilities"
      aria-labelledby="hp-features-title"
    >
      <div className="shell">
        <SectionHeading id="hp-features-title" title="从接口定义到在线调试">
          字段含义、权限要求和请求过程，在同一个工作台中查看和处理。
        </SectionHeading>
        <div className="hp-feature-grid">
          <article className="hp-feature hp-feature-enum">
            <ThemedScreenshot
              light="/images/screenshots/features/json-enum-light.webp"
              dark="/images/screenshots/features/json-enum-dark.webp"
              alt="JSON 请求正文中展开 status 枚举，同时显示候选值和中文业务含义"
              width={692}
              height={480}
            />
            <div className="hp-feature-content">
              <div className="hp-feature-heading">
                <code>EnumValue&lt;T&gt;</code>
                <Link
                  href="/guide/plugin/enum"
                  aria-label="阅读枚举展示插件说明"
                >
                  <ArrowUpRight aria-hidden="true" />
                </Link>
              </div>
              <h3>枚举字段可以直接选择</h3>
              <p>
                枚举插件把值与业务含义写入文档。JSON Body、Query
                和表单可直接选择，写入实际请求。
              </p>
            </div>
          </article>
          <article className="hp-feature hp-feature-security">
            <ThemedScreenshot
              light="/images/screenshots/plugins/permissions-light.webp"
              dark="/images/screenshots/plugins/permissions-dark.webp"
              alt="接口详情展示 OR 权限组合与 admin 角色分支"
              width={636}
              height={478}
            />
            <div className="hp-feature-content">
              <div className="hp-feature-heading">
                <code>@SaCheckPermission</code>
                <Link
                  href="/guide/plugin/satoken"
                  aria-label="阅读 Sa-Token 权限码插件说明"
                >
                  <ArrowUpRight aria-hidden="true" />
                </Link>
              </div>
              <h3>权限与角色跟随接口展示</h3>
              <p>
                Sa-Token 插件解析 MVC 应用中的注解，展示 AND / OR
                权限组合与角色要求。业务鉴权由宿主执行。
              </p>
            </div>
          </article>
        </div>
        <div className="hp-capability-index">
          {capabilities.map((item) => (
            <Link
              href={item.href}
              className="hp-capability-link"
              key={item.title}
            >
              <span className="hp-capability-icon">
                <item.icon aria-hidden="true" />
              </span>
              <div>
                <h3>{item.title}</h3>
                <p>{item.detail}</p>
              </div>
              <ArrowUpRight aria-hidden="true" />
            </Link>
          ))}
        </div>
        <div className="hp-section-action">
          <DocLink href="/guide/ui/overview">浏览全部界面功能</DocLink>
        </div>
      </div>
    </section>
  );
}

function Configuration() {
  const [selected, setSelected] = useState<ConfigurationKey>('brand');
  const current = configurations[selected];
  return (
    <section
      className="hp-section hp-configuration"
      aria-labelledby="hp-config-title"
    >
      <div className="shell">
        <SectionHeading id="hp-config-title" title="按需配置工作台">
          自定义入口与品牌，配置文档密码，按环境控制开放范围。
        </SectionHeading>
        <div className="hp-window">
          <WindowBar title="工作台配置">
            <AnimatedTabs
              className="hp-switch hp-config-options"
              label="选择配置场景"
              items={(Object.keys(configurations) as ConfigurationKey[]).map(
                (id) => ({ id, label: configurations[id].label }),
              )}
              value={selected}
              onChange={setSelected}
              controls="hp-config-example"
            />
          </WindowBar>
          <AnimatedContent
            id="hp-config-example"
            transitionKey={selected}
            contentClassName="hp-config-grid"
          >
            <div className="hp-config-caption">
              <h3>{current.label}</h3>
              <p>{current.description}</p>
              <div className="hp-config-note">
                <p>{current.note}</p>
                <DocLink href={current.href}>查看配置说明</DocLink>
              </div>
            </div>
            <div className="hp-config-example">
              <CodePanel
                filename={
                  selected === 'production'
                    ? 'application-prod.yml'
                    : 'application.yml'
                }
                code={current.code}
                language="yaml"
              />
            </div>
          </AnimatedContent>
        </div>
      </div>
    </section>
  );
}

function Community() {
  return (
    <section
      className="hp-section hp-community"
      aria-labelledby="hp-community-title"
    >
      <div className="shell">
        <SectionHeading id="hp-community-title" title="文档、源码与社区">
          NextDoc4j 基于 Apache-2.0 开源，欢迎反馈问题、完善文档和参与开发。
        </SectionHeading>
        <div className="hp-repositories">
          {platformLinks.map((platform) => (
            <Tooltip
              key={platform.id}
              content={
                <span className="nd-platform-stars">
                  {platform.name} · {platform.stars} Stars
                </span>
              }
            >
              <a
                href={platform.href}
                target="_blank"
                rel="noopener noreferrer"
                className="hp-repository"
                data-platform={platform.id}
                aria-label={`打开 NextDoc4j 的 ${platform.name} 仓库`}
              >
                <span className="hp-repository-mark">
                  {platform.id === 'github' ? (
                    <GithubMark />
                  ) : platform.id === 'gitee' ? (
                    <GiteeMark />
                  ) : (
                    <img
                      src="/logo/gitcode.png"
                      alt=""
                      width={22}
                      height={22}
                    />
                  )}
                </span>
                <span>{platform.name}</span>
                <ArrowUpRight aria-hidden="true" />
              </a>
            </Tooltip>
          ))}
        </div>
        <nav className="hp-resource-grid" aria-label="文档与社区快捷入口">
          <div className="hp-resource-brand">
            <div>
              <img src="/logo/logo.png" alt="" width={30} height={34} />
              <strong>NextDoc4j</strong>
            </div>
            <p>
              面向 Spring Boot 的<br />
              OpenAPI 3 文档增强方案。
            </p>
            <Link href="/guide/start/started" className="hp-start-link">
              开始接入
              <ArrowRight aria-hidden="true" />
            </Link>
          </div>
          {resourceGroups.map((group) => (
            <div className="hp-resource-group" key={group.title}>
              <h3>{group.title}</h3>
              <ul>
                {group.links.map(([label, href]) => (
                  <li key={href}>
                    {href.startsWith('https://') ? (
                      <a href={href} target="_blank" rel="noopener noreferrer">
                        {label}
                      </a>
                    ) : (
                      <Link href={href}>{label}</Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        <div className="hp-section-action">
          <DocLink href="/more/team">认识社区，加入讨论</DocLink>
        </div>
      </div>
    </section>
  );
}

export const HomeContent = memo(function HomeContent() {
  return (
    <div className="home-product">
      <Installation />
      <Architecture />
      <Capabilities />
      <Configuration />
      <Community />
    </div>
  );
});
