<template>
  <div class="home-landing-page">
    <!-- ==========================================================================
         1. Hero Section (Ambient Glow & macOS Studio Window Stage)
         ========================================================================== -->
    <section class="hero-canvas">
      <div class="ambient-sphere-left"></div>
      <div class="ambient-sphere-right"></div>

      <div class="shell">
        <div class="hero-intro-box">
          <div class="hero-pill-badge">
            <span class="hero-pill-dot"></span>
            <span>SpringDoc · OpenAPI 3 · Boot 3 &amp; 4 统一支持</span>
          </div>

          <h1 class="hero-headline">
            重构 Java API 文档的<br />
            <span class="brand-gradient">现代工作台与调试体验</span>
          </h1>

          <p class="hero-tagline">
            专为 SpringDoc 打造的高效文档界面。单套 Starter 零学习成本替代传统 Swagger UI，集成多维接口查看、SSE 流式调试、Sa-Token 权限码与微服务网关聚合。
          </p>

          <div class="hero-cta-group">
            <a class="cta-button-primary" href="/guide/start/started">
              <span>开始集成使用</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14M13 6l6 6-6 6"/>
              </svg>
            </a>
            <a class="cta-button-secondary" href="https://demo.nextdoc4j.top/" target="_blank" rel="noopener noreferrer">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
              <span>在线功能演示</span>
            </a>
          </div>

          <div class="hero-meta-strip">
            <span>JDK <strong>17+</strong></span>
            <span>Spring Boot <strong>3.4.x / 4.x</strong></span>
            <span>OpenAPI <strong>3.1</strong></span>
            <span>Version <strong>1.5.0</strong></span>
          </div>
        </div>

        <!-- macOS Studio App Window Stage (接口总览 / 接口详情 / 在线调试) with 3D Parallax & Floating Badges -->
        <div class="stage-canvas">
          <div
            ref="stageRef"
            class="stage-canvas-3d-wrapper"
            @mousemove="onStageMouseMove"
            @mouseleave="onStageMouseLeave"
            @mousedown="onStageMouseDown"
            @mouseup="onStageMouseUp"
          >
            <!-- Floating Feature Badges around the Card -->
            <!-- 1. Top Left Badge: SSE 流式响应调试 -->
            <div class="floating-feature-badge badge-top-left" :style="badgeStyle1">
              <div class="floating-badge-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                </svg>
              </div>
              <div class="floating-badge-text">
                <div class="floating-badge-title">SSE 流式调试</div>
                <div class="floating-badge-sub">实时事件流 / 虚拟滚动</div>
              </div>
            </div>

            <!-- 2. Top Right Badge: Sa-Token 权限码 -->
            <div class="floating-feature-badge badge-top-right" :style="badgeStyle2">
              <div class="floating-badge-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </div>
              <div class="floating-badge-text">
                <div class="floating-badge-title">Sa-Token 权限码</div>
                <div class="floating-badge-sub">原生注解自动识别联动</div>
              </div>
            </div>

            <!-- 3. Middle Right Badge: 枚举释义下拉 -->
            <div class="floating-feature-badge badge-middle-right" :style="badgeStyle5">
              <div class="floating-badge-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                </svg>
              </div>
              <div class="floating-badge-text">
                <div class="floating-badge-title">枚举智能释义</div>
                <div class="floating-badge-sub">下拉单选与字典自动绑定</div>
              </div>
            </div>

            <!-- 4. Bottom Left Badge: 微服务网关聚合 -->
            <div class="floating-feature-badge badge-bottom-left" :style="badgeStyle3">
              <div class="floating-badge-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                  <rect x="2" y="2" width="20" height="8" rx="2" ry="2"/>
                  <rect x="2" y="14" width="20" height="8" rx="2" ry="2"/>
                  <line x1="6" y1="6" x2="6.01" y2="6"/>
                  <line x1="6" y1="18" x2="6.01" y2="18"/>
                </svg>
              </div>
              <div class="floating-badge-text">
                <div class="floating-badge-title">微服务网关聚合</div>
                <div class="floating-badge-sub">WebFlux / WebMvc 自动路由</div>
              </div>
            </div>

            <!-- 5. Bottom Right Badge: TS / Java 实体代码生成 -->
            <div class="floating-feature-badge badge-bottom-right" :style="badgeStyle4">
              <div class="floating-badge-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                  <polyline points="16 18 22 12 16 6"/>
                  <polyline points="8 6 2 12 8 18"/>
                </svg>
              </div>
              <div class="floating-badge-text">
                <div class="floating-badge-title">TS / Java 实体生成</div>
                <div class="floating-badge-sub">一键生成 Request/Response</div>
              </div>
            </div>

            <!-- The 3D Interactive macOS Window Card -->
            <div
              class="macos-window-card"
              :style="{ transform: cardTransform }"
            >
              <div class="macos-window-titlebar">
                <div class="macos-window-lights">
                  <span class="macos-light-btn close"></span>
                  <span class="macos-light-btn min"></span>
                  <span class="macos-light-btn max"></span>
                </div>

                <!-- Segmented Switcher (接口总览 / 接口详情 / 在线调试) -->
                <div class="macos-segmented-pill">
                  <button
                    type="button"
                    class="macos-segment-item"
                    :class="{ active: studioTab === 'overview' }"
                    @click="switchStudioTab('overview')"
                    @mousedown="switchStudioTab('overview')"
                  >
                    接口总览
                  </button>
                  <button
                    type="button"
                    class="macos-segment-item"
                    :class="{ active: studioTab === 'detail' }"
                    @click="switchStudioTab('detail')"
                    @mousedown="switchStudioTab('detail')"
                  >
                    接口详情
                  </button>
                  <button
                    type="button"
                    class="macos-segment-item"
                    :class="{ active: studioTab === 'debug' }"
                    @click="switchStudioTab('debug')"
                    @mousedown="switchStudioTab('debug')"
                  >
                    在线调试
                  </button>
                </div>

                <div class="macos-address-pill">
                  <span class="green-dot"></span>
                  <span>http://localhost:8080/doc.html</span>
                </div>
              </div>

              <div class="macos-window-viewport">
                <!-- Dynamic Specular Lighting Glare inside viewport -->
                <div class="macos-window-glare" :style="{ background: glareStyle }"></div>

                <!-- Tab 1: 接口总览 (响应式自动切换深/浅色截图) -->
                <div v-show="studioTab === 'overview'" class="macos-view-panel active panel-overview">
                  <img class="no-zoom overview-theme-light" src="/images/screenshots/bright-home.png" alt="NextDoc4j 接口总览浅色界面" />
                  <img class="no-zoom overview-theme-dark" src="/images/screenshots/dark-home.png" alt="NextDoc4j 接口总览深色界面" />
                </div>

                <!-- Tab 2: 接口详情 -->
                <div v-show="studioTab === 'detail'" class="macos-view-panel active panel-detail">
                  <img class="no-zoom" src="/images/screenshots/guide/detail-workbench.png" alt="NextDoc4j 接口详情工作台" />
                </div>

                <!-- Tab 3: 在线调试 -->
                <div v-show="studioTab === 'debug'" class="macos-view-panel active panel-debug">
                  <img class="no-zoom" src="/images/screenshots/guide/debug-panel-placeholder.png" alt="NextDoc4j 在线调试面板" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ==========================================================================
         2. ToC Flow: Dynamic Architectural Explorer
         ========================================================================== -->
    <section class="toc-flow-section">
      <div class="shell">
        <div class="flow-header">
          <h2 class="flow-title">系统化探索核心架构能力</h2>
          <p class="flow-subtitle">
            结构清晰、触手可及。点击左侧能力目录，查看 NextDoc4j 针对研发协作链路的针对性优化。
          </p>
        </div>

        <div class="toc-explorer-box">
          <!-- Left: ToC Index Items -->
          <div class="toc-index-nav">
            <div
              v-for="(item, index) in tocItems"
              :key="index"
              class="toc-nav-item"
              :class="{ active: activeTocIndex === index }"
              @click="activeTocIndex = index"
            >
              <span class="toc-nav-index-num">{{ item.num }}</span>
              <div class="toc-nav-info">
                <h4>{{ item.navTitle }}</h4>
                <p>{{ item.navDesc }}</p>
              </div>
              <svg class="toc-nav-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/>
              </svg>
            </div>
          </div>

          <!-- Right: Dynamic Showcase Display -->
          <div class="toc-display-pane">
            <div class="toc-display-top">
              <div class="toc-display-tag-strip">
                <span class="toc-tag-badge">{{ currentToc.badge }}</span>
                <span class="toc-tag-badge sub-badge">OpenAPI 3.1</span>
              </div>
              <h3 class="toc-display-title">{{ currentToc.title }}</h3>
              <p class="toc-display-desc">{{ currentToc.desc }}</p>

              <div class="toc-features-grid">
                <div
                  v-for="(feature, fIdx) in currentToc.features"
                  :key="fIdx"
                  class="toc-feature-chip"
                >
                  <span class="chip-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
                    </svg>
                  </span>
                  <div>
                    <div class="chip-text-title">{{ feature.title }}</div>
                    <div class="chip-text-desc">{{ feature.desc }}</div>
                  </div>
                </div>
              </div>
            </div>

            <div class="toc-display-action-row">
              <a class="toc-learn-more-link" :href="currentToc.link">
                <span>阅读该特性的详细使用指南</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14M13 6l6 6-6 6"/>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ==========================================================================
         3. Soft Bento Capabilities Grid
         ========================================================================== -->
    <section class="bento-fluid-section">
      <div class="shell">
        <div class="bento-fluid-grid">
          <!-- Card 1 -->
          <article class="bento-soft-card">
            <div class="bento-card-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </div>
            <h3 class="bento-card-title">单 Starter 适配 Boot 3 &amp; 4</h3>
            <p class="bento-card-desc">
              1.4.0 起统一单套坐标，无论在 Spring Boot 3.4.x 还是 Spring Boot 4 环境下均可无缝引入，无需为不同版本切换 artifactId。
            </p>
            <div class="bento-card-pill-row">
              <span class="bento-pill-item">nextdoc4j-bom</span>
              <span class="bento-pill-item">Zero-Migration</span>
            </div>
          </article>

          <!-- Card 2 -->
          <article class="bento-soft-card">
            <div class="bento-card-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <rect x="3" y="3" width="18" height="18" rx="4"/>
                <path stroke-linecap="round" d="M3 9h18M9 21V9"/>
              </svg>
            </div>
            <h3 class="bento-card-title">企业级品牌与主题定制</h3>
            <p class="bento-card-desc">
              基于 Vben 5 设计标准，支持自定义 Logo、系统标题、主色调、菜单展示模式与文档入口路径，与企业产品视觉体系统一。
            </p>
            <div class="bento-card-pill-row">
              <span class="bento-pill-item">CSS Variables</span>
              <span class="bento-pill-item">Brand Theme</span>
            </div>
          </article>

          <!-- Card 3 -->
          <article class="bento-soft-card">
            <div class="bento-card-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <h3 class="bento-card-title">安全鉴权与全局配置</h3>
            <p class="bento-card-desc">
              支持简单文档密码拦截、全局 Token 注入与调试缓存开关控制。敏感环境轻松锁定，避免未授权调试。
            </p>
            <div class="bento-card-pill-row">
              <span class="bento-pill-item">Auth Interceptor</span>
              <span class="bento-pill-item">Global Params</span>
            </div>
          </article>
        </div>
      </div>
    </section>

    <!-- ==========================================================================
         4. Adaptive Code Terminal & Quick Integration (Enhanced with BOM / WebMvc / WebFlux)
         ========================================================================== -->
    <section class="terminal-section">
      <div class="shell">
        <div class="flow-header terminal-header">
          <h2 class="flow-title">最简依赖引入与配置</h2>
          <p class="flow-subtitle">
            支持单体 WebMvc / WebFlux、网关 WebFlux / WebMvc 及 BOM 统一版本管理，几行配置即可替换传统 Swagger UI。
          </p>
        </div>

        <div class="terminal-shell-box">
          <div class="terminal-titlebar">
            <!-- Tab Switcher -->
            <div class="terminal-segmented-tabs">
              <button
                v-for="tab in terminalTabsList"
                :key="tab.key"
                type="button"
                class="terminal-tab-btn"
                :class="{ active: terminalTab === tab.key }"
                @click="terminalTab = tab.key"
              >
                {{ tab.label }}
              </button>
            </div>

            <!-- Copy Button -->
            <button
              type="button"
              class="terminal-copy-action"
              :class="{ copied: isCopied }"
              @click="copyCurrentSnippet"
            >
              <svg v-if="!isCopied" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
              <svg v-else width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
              </svg>
              <span>{{ isCopied ? '已复制' : '复制' }}</span>
            </button>
          </div>

          <div class="terminal-code-body">
            <!-- Contextual Meta Bar -->
            <div class="terminal-meta-bar">
              <span class="terminal-meta-tag">{{ currentTerminalInfo.tag }}</span>
              <span class="terminal-meta-hint">{{ currentTerminalInfo.hint }}</span>
            </div>

            <!-- Snippet 1: 单体 WebMvc -->
            <pre v-show="terminalTab === 'webmvc'"><code><span class="syn-cmt">&lt;!-- NextDoc4j 核心 Starter (Boot 3.4.x / 4.x 统一坐标) --&gt;</span>
<span class="syn-tag">&lt;dependency&gt;</span>
    <span class="syn-tag">&lt;groupId&gt;</span>top.nextdoc4j<span class="syn-tag">&lt;/groupId&gt;</span>
    <span class="syn-tag">&lt;artifactId&gt;</span>nextdoc4j-spring-boot-starter<span class="syn-tag">&lt;/artifactId&gt;</span>
    <span class="syn-tag">&lt;version&gt;</span>1.5.0<span class="syn-tag">&lt;/version&gt;</span>
<span class="syn-tag">&lt;/dependency&gt;</span>

<span class="syn-cmt">&lt;!-- 宿主自行引入 SpringDoc WebMvc UI --&gt;</span>
<span class="syn-cmt">&lt;!-- Boot 3.4.x 推荐 2.8.17；Boot 4.x 请改为 3.0.3 --&gt;</span>
<span class="syn-tag">&lt;dependency&gt;</span>
    <span class="syn-tag">&lt;groupId&gt;</span>org.springdoc<span class="syn-tag">&lt;/groupId&gt;</span>
    <span class="syn-tag">&lt;artifactId&gt;</span>springdoc-openapi-starter-webmvc-ui<span class="syn-tag">&lt;/artifactId&gt;</span>
    <span class="syn-tag">&lt;version&gt;</span>2.8.17<span class="syn-tag">&lt;/version&gt;</span>
<span class="syn-tag">&lt;/dependency&gt;</span></code></pre>

            <!-- Snippet 2: 单体 WebFlux -->
            <pre v-show="terminalTab === 'webflux'"><code><span class="syn-cmt">&lt;!-- NextDoc4j 核心 Starter (Boot 3.4.x / 4.x 统一坐标) --&gt;</span>
<span class="syn-tag">&lt;dependency&gt;</span>
    <span class="syn-tag">&lt;groupId&gt;</span>top.nextdoc4j<span class="syn-tag">&lt;/groupId&gt;</span>
    <span class="syn-tag">&lt;artifactId&gt;</span>nextdoc4j-spring-boot-starter<span class="syn-tag">&lt;/artifactId&gt;</span>
    <span class="syn-tag">&lt;version&gt;</span>1.5.0<span class="syn-tag">&lt;/version&gt;</span>
<span class="syn-tag">&lt;/dependency&gt;</span>

<span class="syn-cmt">&lt;!-- 宿主自行引入 SpringDoc WebFlux UI --&gt;</span>
<span class="syn-cmt">&lt;!-- Boot 3.4.x 推荐 2.8.17；Boot 4.x 请改为 3.0.3 --&gt;</span>
<span class="syn-tag">&lt;dependency&gt;</span>
    <span class="syn-tag">&lt;groupId&gt;</span>org.springdoc<span class="syn-tag">&lt;/groupId&gt;</span>
    <span class="syn-tag">&lt;artifactId&gt;</span>springdoc-openapi-starter-webflux-ui<span class="syn-tag">&lt;/artifactId&gt;</span>
    <span class="syn-tag">&lt;version&gt;</span>2.8.17<span class="syn-tag">&lt;/version&gt;</span>
<span class="syn-tag">&lt;/dependency&gt;</span></code></pre>

            <!-- Snippet 3: 网关 WebFlux -->
            <pre v-show="terminalTab === 'gateway-webflux'"><code><span class="syn-cmt">&lt;!-- NextDoc4j 网关聚合 Starter (Boot 3.4.x / 4.x 统一坐标) --&gt;</span>
<span class="syn-tag">&lt;dependency&gt;</span>
    <span class="syn-tag">&lt;groupId&gt;</span>top.nextdoc4j<span class="syn-tag">&lt;/groupId&gt;</span>
    <span class="syn-tag">&lt;artifactId&gt;</span>nextdoc4j-gateway-spring-boot-starter<span class="syn-tag">&lt;/artifactId&gt;</span>
    <span class="syn-tag">&lt;version&gt;</span>1.5.0<span class="syn-tag">&lt;/version&gt;</span>
<span class="syn-tag">&lt;/dependency&gt;</span>

<span class="syn-cmt">&lt;!-- Spring Cloud Gateway 响应式网关运行时 (WebFlux) --&gt;</span>
<span class="syn-tag">&lt;dependency&gt;</span>
    <span class="syn-tag">&lt;groupId&gt;</span>org.springframework.cloud<span class="syn-tag">&lt;/groupId&gt;</span>
    <span class="syn-tag">&lt;artifactId&gt;</span>spring-cloud-starter-gateway-server-webflux<span class="syn-tag">&lt;/artifactId&gt;</span>
<span class="syn-tag">&lt;/dependency&gt;</span>

<span class="syn-cmt">&lt;!-- 宿主引入 SpringDoc WebFlux UI (Boot 3.4.x: 2.8.17 / Boot 4: 3.0.3) --&gt;</span>
<span class="syn-tag">&lt;dependency&gt;</span>
    <span class="syn-tag">&lt;groupId&gt;</span>org.springdoc<span class="syn-tag">&lt;/groupId&gt;</span>
    <span class="syn-tag">&lt;artifactId&gt;</span>springdoc-openapi-starter-webflux-ui<span class="syn-tag">&lt;/artifactId&gt;</span>
    <span class="syn-tag">&lt;version&gt;</span>2.8.17<span class="syn-tag">&lt;/version&gt;</span>
<span class="syn-tag">&lt;/dependency&gt;</span></code></pre>

            <!-- Snippet 4: 网关 WebMvc -->
            <pre v-show="terminalTab === 'gateway-webmvc'"><code><span class="syn-cmt">&lt;!-- NextDoc4j 网关聚合 Starter (Boot 3.4.x / 4.x 统一坐标) --&gt;</span>
<span class="syn-tag">&lt;dependency&gt;</span>
    <span class="syn-tag">&lt;groupId&gt;</span>top.nextdoc4j<span class="syn-tag">&lt;/groupId&gt;</span>
    <span class="syn-tag">&lt;artifactId&gt;</span>nextdoc4j-gateway-spring-boot-starter<span class="syn-tag">&lt;/artifactId&gt;</span>
    <span class="syn-tag">&lt;version&gt;</span>1.5.0<span class="syn-tag">&lt;/version&gt;</span>
<span class="syn-tag">&lt;/dependency&gt;</span>

<span class="syn-cmt">&lt;!-- Spring Cloud Gateway 阻塞式网关运行时 (WebMvc) --&gt;</span>
<span class="syn-tag">&lt;dependency&gt;</span>
    <span class="syn-tag">&lt;groupId&gt;</span>org.springframework.cloud<span class="syn-tag">&lt;/groupId&gt;</span>
    <span class="syn-tag">&lt;artifactId&gt;</span>spring-cloud-starter-gateway-server-webmvc<span class="syn-tag">&lt;/artifactId&gt;</span>
<span class="syn-tag">&lt;/dependency&gt;</span>

<span class="syn-cmt">&lt;!-- 宿主引入 SpringDoc WebMvc UI (Boot 3.4.x: 2.8.17 / Boot 4: 3.0.3) --&gt;</span>
<span class="syn-tag">&lt;dependency&gt;</span>
    <span class="syn-tag">&lt;groupId&gt;</span>org.springdoc<span class="syn-tag">&lt;/groupId&gt;</span>
    <span class="syn-tag">&lt;artifactId&gt;</span>springdoc-openapi-starter-webmvc-ui<span class="syn-tag">&lt;/artifactId&gt;</span>
    <span class="syn-tag">&lt;version&gt;</span>2.8.17<span class="syn-tag">&lt;/version&gt;</span>
<span class="syn-tag">&lt;/dependency&gt;</span></code></pre>

            <!-- Snippet 5: BOM 统一依赖管理 -->
            <pre v-show="terminalTab === 'bom'"><code><span class="syn-cmt">&lt;!-- 1. 放入 dependencyManagement 中统一管理 NextDoc4j 与 SpringDoc 版本 --&gt;</span>
<span class="syn-tag">&lt;dependencyManagement&gt;</span>
    <span class="syn-tag">&lt;dependencies&gt;</span>
        <span class="syn-tag">&lt;dependency&gt;</span>
            <span class="syn-tag">&lt;groupId&gt;</span>top.nextdoc4j<span class="syn-tag">&lt;/groupId&gt;</span>
            <span class="syn-tag">&lt;artifactId&gt;</span>nextdoc4j-bom<span class="syn-tag">&lt;/artifactId&gt;</span>
            <span class="syn-tag">&lt;version&gt;</span>1.5.0<span class="syn-tag">&lt;/version&gt;</span>
            <span class="syn-tag">&lt;type&gt;</span>pom<span class="syn-tag">&lt;/type&gt;</span>
            <span class="syn-tag">&lt;scope&gt;</span>import<span class="syn-tag">&lt;/scope&gt;</span>
        <span class="syn-tag">&lt;/dependency&gt;</span>
        <span class="syn-cmt">&lt;!-- SpringDoc BOM: Boot 3.4.x 填 2.8.17；Boot 4 填 3.0.3 --&gt;</span>
        <span class="syn-tag">&lt;dependency&gt;</span>
            <span class="syn-tag">&lt;groupId&gt;</span>org.springdoc<span class="syn-tag">&lt;/groupId&gt;</span>
            <span class="syn-tag">&lt;artifactId&gt;</span>springdoc-openapi-bom<span class="syn-tag">&lt;/artifactId&gt;</span>
            <span class="syn-tag">&lt;version&gt;</span>2.8.17<span class="syn-tag">&lt;/version&gt;</span>
            <span class="syn-tag">&lt;type&gt;</span>pom<span class="syn-tag">&lt;/type&gt;</span>
            <span class="syn-tag">&lt;scope&gt;</span>import<span class="syn-tag">&lt;/scope&gt;</span>
        <span class="syn-tag">&lt;/dependency&gt;</span>
    <span class="syn-tag">&lt;/dependencies&gt;</span>
<span class="syn-tag">&lt;/dependencyManagement&gt;</span>

<span class="syn-cmt">&lt;!-- 2. 在 dependencies 中直接引入（无需填写 version 版本号） --&gt;</span>
<span class="syn-tag">&lt;dependencies&gt;</span>
    <span class="syn-tag">&lt;dependency&gt;</span>
        <span class="syn-tag">&lt;groupId&gt;</span>top.nextdoc4j<span class="syn-tag">&lt;/groupId&gt;</span>
        <span class="syn-tag">&lt;artifactId&gt;</span>nextdoc4j-spring-boot-starter<span class="syn-tag">&lt;/artifactId&gt;</span>
    <span class="syn-tag">&lt;/dependency&gt;</span>
    <span class="syn-tag">&lt;dependency&gt;</span>
        <span class="syn-tag">&lt;groupId&gt;</span>org.springdoc<span class="syn-tag">&lt;/groupId&gt;</span>
        <span class="syn-tag">&lt;artifactId&gt;</span>springdoc-openapi-starter-webmvc-ui<span class="syn-tag">&lt;/artifactId&gt;</span>
    <span class="syn-tag">&lt;/dependency&gt;</span>
<span class="syn-tag">&lt;/dependencies&gt;</span></code></pre>

            <!-- Snippet 6: application.yml -->
            <pre v-show="terminalTab === 'yml'"><code><span class="syn-key">nextdoc4j</span>:
  <span class="syn-key">enabled</span>: <span class="syn-val">true</span>                    <span class="syn-cmt"># 是否启用 NextDoc4j 文档工作台（默认 false）</span>
  <span class="syn-key">doc-path</span>: <span class="syn-str">/doc.html</span>              <span class="syn-cmt"># 自定义文档入口路径（默认 /doc.html）</span>
  <span class="syn-key">gateway</span>:
    <span class="syn-key">auto-discovery</span>: <span class="syn-val">true</span>           <span class="syn-cmt"># 网关场景：开启子微服务 OpenAPI 文档自动发现与聚合</span>
    <span class="syn-key">routes-reload-interval</span>: <span class="syn-val">30s</span>    <span class="syn-cmt"># 网关场景：动态路由探测刷新间隔</span></code></pre>
          </div>
        </div>
      </div>
    </section>

    <!-- ==========================================================================
         5. High-Contrast Spec Matrix Table
         ========================================================================== -->
    <section class="spec-matrix-section">
      <div class="shell">
        <div class="flow-header">
          <h2 class="flow-title">技术特性对比概览</h2>
        </div>

        <div class="spec-table-box">
          <div class="spec-table-row head">
            <div>维度指标</div>
            <div><span class="spec-head-brand-badge">NextDoc4j (v1.5.0)</span></div>
            <div>传统 Swagger UI</div>
          </div>

          <div class="spec-table-row">
            <div data-label="维度指标"><strong>Boot 3 / 4 适配</strong></div>
            <div class="spec-cell-brand" data-label="NextDoc4j">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
              单套坐标统一支持
            </div>
            <div class="spec-cell-dim" data-label="传统 Swagger UI">依赖拆分多套坐标</div>
          </div>

          <div class="spec-table-row">
            <div data-label="维度指标"><strong>SSE 流式调试</strong></div>
            <div class="spec-cell-brand" data-label="NextDoc4j">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
              支持事件流渲染与中止
            </div>
            <div class="spec-cell-dim" data-label="传统 Swagger UI">仅单次响应缓冲</div>
          </div>

          <div class="spec-table-row">
            <div data-label="维度指标"><strong>微服务网关聚合</strong></div>
            <div class="spec-cell-brand" data-label="NextDoc4j">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
              自动推导与 StripPrefix
            </div>
            <div class="spec-cell-dim" data-label="传统 Swagger UI">需手动编码转发配置</div>
          </div>

          <div class="spec-table-row">
            <div data-label="维度指标"><strong>权限码注解识别</strong></div>
            <div class="spec-cell-brand" data-label="NextDoc4j">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
              原生解析 Sa-Token 注解
            </div>
            <div class="spec-cell-dim" data-label="传统 Swagger UI">无原生权限注解联动</div>
          </div>

          <div class="spec-table-row">
            <div data-label="维度指标"><strong>视觉与主题体系</strong></div>
            <div class="spec-cell-brand" data-label="NextDoc4j">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
              Vben 5 规范 / 浅深双模
            </div>
            <div class="spec-cell-dim" data-label="传统 Swagger UI">陈旧单列卡顿布局</div>
          </div>
        </div>
      </div>
    </section>

    <!-- ==========================================================================
         6. Community & Quick Navigation Section
         ========================================================================== -->
    <section class="community-nav-section">
      <div class="shell">
        <div class="community-header">
          <h2 class="flow-title">开源社区与快速链接</h2>
          <p class="flow-subtitle">
            选择您喜爱的代码托管平台 Star 支持我们，或快速导航至相关文档。
          </p>
        </div>

        <div class="community-platforms-wrap">
          <CommunityPlatforms />
        </div>

        <div class="home-quick-links-grid">
          <div class="quick-link-col">
            <h4>指南文档</h4>
            <ul>
              <li><a href="/guide/start/started">快速开始</a></li>
              <li><a href="/guide/config/basicconfiguration">基础配置</a></li>
              <li><a href="/guide/config/brandconfiguration">品牌定制</a></li>
              <li><a href="/guide/ui/browse-debug">浏览与调试</a></li>
            </ul>
          </div>

          <div class="quick-link-col">
            <h4>插件生态</h4>
            <ul>
              <li><a href="/guide/plugin/satoken">Sa-Token 权限插件</a></li>
              <li><a href="/guide/plugin/gateway">网关聚合插件</a></li>
              <li><a href="/guide/plugin/enum">枚举字典插件</a></li>
              <li><a href="/guide/plugin/authentication">认证展示插件</a></li>
            </ul>
          </div>

          <div class="quick-link-col">
            <h4>社区支持</h4>
            <ul>
              <li><a href="/more/join-group">加入讨论群</a></li>
              <li><a href="/more/contribute">贡献指南</a></li>
              <li><a href="/more/changelog">更新日志</a></li>
              <li><a href="/more/faq">常见问题 (FAQ)</a></li>
              <li><a href="/more/team/team">社区团队</a></li>
            </ul>
          </div>

          <div class="quick-link-col">
            <h4>代码仓库</h4>
            <ul>
              <li><a href="https://github.com/NextDoc4j" target="_blank" rel="noopener noreferrer">GitHub 组织</a></li>
              <li><a href="https://gitee.com/NextDoc4j" target="_blank" rel="noopener noreferrer">Gitee 组织</a></li>
              <li><a href="https://demo.nextdoc4j.top/" target="_blank" rel="noopener noreferrer">在线演示平台</a></li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
// 1. macOS Studio Window Tab Switcher
const studioTab = ref<'overview' | 'detail' | 'debug'>('overview')

function switchStudioTab(tab: 'overview' | 'detail' | 'debug') {
  studioTab.value = tab
}

// 2. 3D Mouse Movement & Parallax Glow
const stageRef = ref<HTMLElement | null>(null)
const cardTransform = ref('')
const glareStyle = ref('')
const tiltX = ref(0)
const tiltY = ref(0)
const isMouseDown = ref(false)
let rafId: any = null

const badgeStyle1 = computed(() => ({
  transform: `translate(${-tiltX.value * 1.5}px, ${-tiltY.value * 1.5}px)`
}))
const badgeStyle2 = computed(() => ({
  transform: `translate(${tiltX.value * 1.8}px, ${-tiltY.value * 1.2}px)`
}))
const badgeStyle3 = computed(() => ({
  transform: `translate(${-tiltX.value * 1.2}px, ${tiltY.value * 1.6}px)`
}))
const badgeStyle4 = computed(() => ({
  transform: `translate(${tiltX.value * 1.6}px, ${tiltY.value * 1.4}px)`
}))
const badgeStyle5 = computed(() => ({
  transform: `translate(${tiltX.value * 2.0}px, ${tiltY.value * 0.8}px)`
}))

function onStageMouseDown() {
  isMouseDown.value = true
}

function onStageMouseUp() {
  isMouseDown.value = false
}

function onStageMouseMove(e: MouseEvent) {
  if (isMouseDown.value || !stageRef.value) return
  const rect = stageRef.value.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top

  const centerX = rect.width / 2
  const centerY = rect.height / 2

  if (rafId) cancelAnimationFrame(rafId)
  rafId = requestAnimationFrame(() => {
    const maxTilt = 6 // Maximum tilt in degrees
    const rotX = ((y - centerY) / centerY) * -maxTilt
    const rotY = ((x - centerX) / centerX) * maxTilt

    tiltX.value = ((x - centerX) / centerX) * 10
    tiltY.value = ((y - centerY) / centerY) * 10

    cardTransform.value = `perspective(1000px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg)`

    const glareX = (x / rect.width) * 100
    const glareY = (y / rect.height) * 100
    glareStyle.value = `radial-gradient(circle at ${glareX.toFixed(1)}% ${glareY.toFixed(1)}%, rgba(255, 255, 255, 0.14) 0%, rgba(255, 255, 255, 0) 60%)`
  })
}

function onStageMouseLeave() {
  isMouseDown.value = false
  if (rafId) cancelAnimationFrame(rafId)
  tiltX.value = 0
  tiltY.value = 0
  cardTransform.value = 'perspective(1000px) rotateX(0deg) rotateY(0deg)'
  glareStyle.value = ''
}

// 2. ToC Dynamic Architecture Explorer Data
const tocItems = [
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
      { title: 'SSE 流式事件虚拟滚动', desc: '高效渲染 AI / 消息推送流式数据，支持随时暂停和终止' }
    ]
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
      { title: '跨服务全局检索', desc: '在网关统一入口直接模糊搜索所有子微服务接口' }
    ]
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
      { title: '文档访问密码保护', desc: '支持为文档入口增加账号密码校验，保障内部环境安全' }
    ]
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
      { title: '全格式离线归档', desc: '支持附加品牌 Logo 导出可离线阅读的 Markdown 与 HTML' }
    ]
  }
]

const activeTocIndex = ref(0)
const currentToc = computed(() => tocItems[activeTocIndex.value])

// 3. Code Terminal Tab Switcher & Clipboard
type TerminalTabKey = 'webmvc' | 'webflux' | 'gateway-webflux' | 'gateway-webmvc' | 'bom' | 'yml'

const terminalTab = ref<TerminalTabKey>('webmvc')

const terminalTabsList = [
  { key: 'webmvc' as const, label: '单体 WebMvc' },
  { key: 'webflux' as const, label: '单体 WebFlux' },
  { key: 'gateway-webflux' as const, label: '网关 WebFlux' },
  { key: 'gateway-webmvc' as const, label: '网关 WebMvc' },
  { key: 'bom' as const, label: 'BOM 统一管理' },
  { key: 'yml' as const, label: 'application.yml' }
]

const terminalMetaMap: Record<TerminalTabKey, { tag: string; hint: string }> = {
  webmvc: {
    tag: '单体服务 · Servlet 栈',
    hint: '配合 spring-boot-starter-web · 统一 Starter 适配 Boot 3.4.x / 4.x'
  },
  webflux: {
    tag: '单体服务 · 响应式 WebFlux 栈',
    hint: '配合 spring-boot-starter-webflux · 统一 Starter 适配 Boot 3.4.x / 4.x'
  },
  'gateway-webflux': {
    tag: '网关聚合 · Reactive 响应式网关',
    hint: '配合 spring-cloud-starter-gateway-server-webflux · 自动聚合微服务'
  },
  'gateway-webmvc': {
    tag: '网关聚合 · Blocking 阻塞式网关',
    hint: '配合 spring-cloud-starter-gateway-server-webmvc · 自动聚合微服务'
  },
  bom: {
    tag: 'BOM 版本管理 · 官方推荐方案',
    hint: '使用 nextdoc4j-bom + springdoc-openapi-bom，依赖无需写版本号'
  },
  yml: {
    tag: '核心配置 · YAML 格式',
    hint: '单体或网关通用配置项，支持自定义文档入口路径'
  }
}

const currentTerminalInfo = computed(() => terminalMetaMap[terminalTab.value])

const rawSnippets: Record<TerminalTabKey, string> = {
  webmvc: `<!-- NextDoc4j 核心 Starter (Boot 3.4.x / 4.x 统一坐标) -->
<dependency>
    <groupId>top.nextdoc4j</groupId>
    <artifactId>nextdoc4j-spring-boot-starter</artifactId>
    <version>1.5.0</version>
</dependency>

<!-- 宿主自行引入 SpringDoc WebMvc UI -->
<!-- Boot 3.4.x 推荐 2.8.17；Boot 4.x 请改为 3.0.3 -->
<dependency>
    <groupId>org.springdoc</groupId>
    <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
    <version>2.8.17</version>
</dependency>`,

  webflux: `<!-- NextDoc4j 核心 Starter (Boot 3.4.x / 4.x 统一坐标) -->
<dependency>
    <groupId>top.nextdoc4j</groupId>
    <artifactId>nextdoc4j-spring-boot-starter</artifactId>
    <version>1.5.0</version>
</dependency>

<!-- 宿主自行引入 SpringDoc WebFlux UI -->
<!-- Boot 3.4.x 推荐 2.8.17；Boot 4.x 请改为 3.0.3 -->
<dependency>
    <groupId>org.springdoc</groupId>
    <artifactId>springdoc-openapi-starter-webflux-ui</artifactId>
    <version>2.8.17</version>
</dependency>`,

  'gateway-webflux': `<!-- NextDoc4j 网关聚合 Starter (Boot 3.4.x / 4.x 统一坐标) -->
<dependency>
    <groupId>top.nextdoc4j</groupId>
    <artifactId>nextdoc4j-gateway-spring-boot-starter</artifactId>
    <version>1.5.0</version>
</dependency>

<!-- Spring Cloud Gateway 响应式网关运行时 (WebFlux) -->
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-gateway-server-webflux</artifactId>
</dependency>

<!-- 宿主引入 SpringDoc WebFlux UI (Boot 3.4.x: 2.8.17 / Boot 4: 3.0.3) -->
<dependency>
    <groupId>org.springdoc</groupId>
    <artifactId>springdoc-openapi-starter-webflux-ui</artifactId>
    <version>2.8.17</version>
</dependency>`,

  'gateway-webmvc': `<!-- NextDoc4j 网关聚合 Starter (Boot 3.4.x / 4.x 统一坐标) -->
<dependency>
    <groupId>top.nextdoc4j</groupId>
    <artifactId>nextdoc4j-gateway-spring-boot-starter</artifactId>
    <version>1.5.0</version>
</dependency>

<!-- Spring Cloud Gateway 阻塞式网关运行时 (WebMvc) -->
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-gateway-server-webmvc</artifactId>
</dependency>

<!-- 宿主引入 SpringDoc WebMvc UI (Boot 3.4.x: 2.8.17 / Boot 4: 3.0.3) -->
<dependency>
    <groupId>org.springdoc</groupId>
    <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
    <version>2.8.17</version>
</dependency>`,

  bom: `<!-- 1. 放入 dependencyManagement 中统一管理 NextDoc4j 与 SpringDoc 版本 -->
<dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>top.nextdoc4j</groupId>
            <artifactId>nextdoc4j-bom</artifactId>
            <version>1.5.0</version>
            <type>pom</type>
            <scope>import</scope>
        </dependency>
        <!-- SpringDoc BOM: Boot 3.4.x 填 2.8.17；Boot 4 填 3.0.3 -->
        <dependency>
            <groupId>org.springdoc</groupId>
            <artifactId>springdoc-openapi-bom</artifactId>
            <version>2.8.17</version>
            <type>pom</type>
            <scope>import</scope>
        </dependency>
    </dependencies>
</dependencyManagement>

<!-- 2. 在 dependencies 中直接引入（无需填写 version 版本号） -->
<dependencies>
    <dependency>
        <groupId>top.nextdoc4j</groupId>
        <artifactId>nextdoc4j-spring-boot-starter</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springdoc</groupId>
        <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
    </dependency>
</dependencies>`,

  yml: `nextdoc4j:
  enabled: true                    # 是否启用 NextDoc4j 文档工作台（默认 false）
  doc-path: /doc.html              # 自定义文档入口路径（默认 /doc.html）
  gateway:
    auto-discovery: true           # 网关场景：开启子微服务 OpenAPI 文档自动发现与聚合
    routes-reload-interval: 30s    # 网关场景：动态路由探测刷新间隔`
}

const isCopied = ref(false)
let copyTimer: any = null

const copyCurrentSnippet = async () => {
  const text = rawSnippets[terminalTab.value]
  if (!text) return

  try {
    await navigator.clipboard.writeText(text)
    isCopied.value = true
    if (copyTimer) clearTimeout(copyTimer)
    copyTimer = setTimeout(() => {
      isCopied.value = false
    }, 1800)
  } catch (err) {
    console.error('Failed to copy snippet:', err)
  }
}
</script>
