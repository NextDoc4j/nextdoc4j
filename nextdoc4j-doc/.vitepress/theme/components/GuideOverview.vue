<script setup lang="ts">
import { ref, computed } from "vue";
import { useData, withBase } from "vitepress";

const { isDark } = useData();

// Preview mode toggle
const previewMode = ref<"light" | "dark">("light");

// Initialize preview mode based on current theme
if (typeof window !== "undefined") {
  previewMode.value = isDark.value ? "dark" : "light";
}

const currentPreviewImg = computed(() => {
  return previewMode.value === "dark"
    ? withBase("/images/screenshots/dark-home.png")
    : withBase("/images/screenshots/bright-home.png");
});
</script>

<template>
  <div class="guide-overview-root">
    <!-- Page Lead -->
    <p class="guide-page-lead">
      NextDoc4j 是面向 SpringDoc 和 OpenAPI 3 的现代化接口文档与在线调试工作台，以单套 Starter 统一适配 Spring Boot 3.4.x 与 4.x，全方位重构研发调试与协作体验。
    </p>

    <!-- Seamless Tech Badges Strip -->
    <div class="guide-badge-strip">
      <!-- NextDoc4j Version -->
      <span class="tech-pill-badge brand-pill" title="NextDoc4j 发行版">
        <span class="tech-pill-dot"></span>
        <span>Version <strong>1.5.0</strong></span>
      </span>

      <!-- Spring Boot -->
      <span class="tech-pill-badge" title="Spring Boot 3.4.x / 4.x">
        <svg class="tech-pill-logo" viewBox="0 0 24 24" fill="#6DB33F">
          <path d="M21.57 14.8c-.85 3.32-3.8 5.7-7.23 5.7-4.14 0-7.5-3.36-7.5-7.5 0-1.88.69-3.6 1.83-4.93l-1.32-1.32C5.58 8.44 4.84 10.63 4.84 13c0 5.25 4.25 9.5 9.5 9.5 4.38 0 8.08-2.96 9.17-7l-1.94-.7zm.93-4.3c-.02-.45-.07-.9-.16-1.33l-1.96.44c.07.29.1.59.12.89h2zm-2.22-3.9l1.45-1.45c-.65-.77-1.42-1.43-2.27-1.96l-1.06 1.72c.67.42 1.28.94 1.88 1.69zm-4.78-3.9v-2c-.93.07-1.83.27-2.68.61l.74 1.86c.64-.26 1.3-.41 1.94-.47zM9.54 5.25L8.1 3.8C6.18 5.17 4.7 7.23 4.02 9.64l1.93.53C6.5 8.1 7.77 6.4 9.54 5.25z"/>
        </svg>
        <span>Spring Boot <strong>3.4.x / 4.x</strong></span>
      </span>

      <!-- SpringDoc -->
      <span class="tech-pill-badge" title="SpringDoc OpenAPI 2.8.x / 3.x">
        <svg class="tech-pill-logo" viewBox="0 0 24 24" fill="#85EA2D">
          <circle cx="12" cy="12" r="10"/>
          <circle cx="12" cy="12" r="4" fill="#ffffff"/>
        </svg>
        <span>SpringDoc <strong>2.8 / 3.x</strong></span>
      </span>

      <!-- OpenAPI 3.1 -->
      <span class="tech-pill-badge" title="OpenAPI 3.1 规范">
        <svg class="tech-pill-logo" viewBox="0 0 24 24" fill="#6BA539">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14.5h-2v-2h2v2zm0-4h-2V7h2v5.5z"/>
        </svg>
        <span>OpenAPI <strong>3.1</strong></span>
      </span>

      <!-- Java / OpenJDK -->
      <span class="tech-pill-badge" title="运行环境 JDK 17+">
        <svg class="tech-pill-logo" viewBox="0 0 24 24" fill="#E76F00">
          <path d="M8.85 16.94c0 .03-.01.07-.01.1 0 1.25 2.1 2.27 4.7 2.27s4.7-1.02 4.7-2.27c0-.03 0-.07-.01-.1-.78.8-2.6 1.37-4.69 1.37s-3.91-.57-4.7-1.37zm-.38-2.61c-.56.63-1.4 1.54-1.4 2.5 0 2.21 2.87 4 6.42 4s6.42-1.79 6.42-4c0-.96-.84-1.87-1.4-2.5-.94.94-2.88 1.6-5.02 1.6s-4.08-.66-5.02-1.6zm6.36-9.66c.21 1.09-.58 2.06-1.57 2.97-1.12 1.03-2.18 2.01-2.18 3.52 0 .04.01.09.01.13.43-.56 1.04-1.02 1.76-1.45 1.15-.69 2.59-1.55 2.59-3.37 0-.61-.21-1.23-.61-1.8zm-1.85-2.67c-.24 1.19.46 2.21 1.41 3.12 1.12 1.07 2.18 2.08 2.18 3.69 0 .07-.01.13-.01.2.47-.63 1.13-1.16 1.89-1.63 1.18-.73 2.6-1.61 2.6-3.48 0-.66-.23-1.32-.67-1.9-2.25-.01-5.16.02-7.4 0z"/>
        </svg>
        <span>JDK <strong>17+</strong></span>
      </span>

      <span class="tech-pill-divider"></span>

      <!-- Vue 3.5 -->
      <span class="tech-pill-badge" title="Vue 3.5 响应式前端框架">
        <svg class="tech-pill-logo" viewBox="0 0 24 24">
          <path d="M2 3h3.5L12 15 18.5 3H22L12 21 2 3z" fill="#42b883"/>
          <path d="M6.5 3h3L12 8.5 14.5 3h3L12 13.5 6.5 3z" fill="#35495e"/>
        </svg>
        <span>Vue <strong>3.5.x</strong></span>
      </span>

      <!-- TypeScript 5.8 -->
      <span class="tech-pill-badge" title="TypeScript 5.8 静态类型系统">
        <svg class="tech-pill-logo" viewBox="0 0 24 24">
          <rect width="24" height="24" rx="4" fill="#3178C6"/>
          <path d="M6 10h6M9 10v9M14 15.5c.8.8 1.8 1.2 2.8 1.2 1.1 0 1.8-.5 1.8-1.2 0-.8-.7-1.1-2-1.5-1.8-.5-3.1-1.3-3.1-3 0-1.8 1.4-3 3.4-3 1.2 0 2.2.4 2.9 1.1l-1 1.5c-.6-.5-1.3-.8-2-.8-.9 0-1.4.5-1.4 1.1 0 .7.6 1 1.8 1.4 2 .6 3.3 1.3 3.3 3.1 0 2-1.5 3.1-3.7 3.1-1.5 0-2.8-.5-3.7-1.5l1.2-1.5z" fill="#ffffff"/>
        </svg>
        <span>TypeScript <strong>5.8.x</strong></span>
      </span>

      <!-- Vite 6 -->
      <span class="tech-pill-badge" title="Vite 6 新一代前端构建工具">
        <svg class="tech-pill-logo" viewBox="0 0 24 24">
          <path d="M21.5 3.5L12.5 20.5 3 5.5l9.5 2 9-4z" fill="#BD34FE"/>
          <path d="M12.5 7.5L3 5.5l9.5 15 2.5-4.5L12.5 7.5z" fill="#FFD62E"/>
        </svg>
        <span>Vite <strong>6.x</strong></span>
      </span>

      <!-- Element Plus -->
      <span class="tech-pill-badge" title="Element Plus 2.10 UI 组件库">
        <svg class="tech-pill-logo" viewBox="0 0 24 24" fill="#409EFF">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
        </svg>
        <span>Element Plus <strong>2.10.x</strong></span>
      </span>

      <!-- Vben Admin 5 -->
      <span class="tech-pill-badge" title="基于 Vben Admin 5 设计规范">
        <svg class="tech-pill-logo" viewBox="0 0 24 24" fill="#1677FF">
          <path d="M3 4l9 16L21 4h-4.5L12 13.5 7.5 4H3z"/>
        </svg>
        <span>Vben <strong>5 Standard</strong></span>
      </span>
    </div>

    <!-- Action Banner Card -->
    <div class="overview-action-banner">
      <div class="banner-text">
        <h4>几行配置即可替代传统 Swagger UI</h4>
        <p>单套 Starter 坐标，零学习成本迁移，即刻享有现代工作台体验。</p>
      </div>
      <div class="banner-actions">
        <a class="btn-quick-start" :href="withBase('/guide/start/started')">
          <span>快速开始集成</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14M13 6l6 6-6 6"/>
          </svg>
        </a>
        <a class="btn-live-demo" href="https://demo.nextdoc4j.top/" target="_blank" rel="noopener noreferrer">
          <span>在线演示</span>
        </a>
      </div>
    </div>

    <!-- Section 1: 项目简介 -->
    <section class="doc-section" id="section-intro">
      <h2 class="doc-section-title">
        <span class="doc-title-icon-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <circle cx="12" cy="12" r="10"/>
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 16v-4M12 8h.01"/>
          </svg>
        </span>
        <span>什么是 NextDoc4j？</span>
      </h2>
      <p class="doc-paragraph">
        <strong>NextDoc4j</strong> 是一个基于现代 Web 技术栈深度重构的 Java API 文档与在线调试工作台。它专为 <strong>SpringDoc</strong> 和 <strong>OpenAPI 3</strong> 生态量身定制，旨在彻底打破传统 Swagger UI 陈旧、卡顿、交互不便的固有局限。
      </p>
      <p class="doc-paragraph">
        从 <strong>1.4.0 版本</strong> 起，NextDoc4j 实现了<strong>单套 Starter 坐标</strong>对 <strong>Spring Boot 3.4.x</strong> 与 <strong>Spring Boot 4.x</strong> 的无缝统一支持，并在单体 WebMvc / WebFlux 与 Spring Cloud Gateway 微服务网关场景中提供全功能开箱即用能力。
      </p>
    </section>

    <!-- Section 2: 诞生背景与设计理念 -->
    <section class="doc-section" id="section-background">
      <h2 class="doc-section-title">
        <span class="doc-title-icon-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
          </svg>
        </span>
        <span>诞生背景与设计理念</span>
      </h2>
      <p class="doc-paragraph">
        NextDoc4j 的诞生深深植根于开源生态的优秀实践，站在巨人的肩膀上不断演进与探索：
      </p>

      <div class="inspiration-grid">
        <!-- Inspiration 1: Knife4j -->
        <div class="inspiration-card">
          <div class="inspiration-card-header">
            <div class="inspiration-icon-box">K</div>
            <div class="inspiration-card-title">灵感源泉：Knife4j</div>
          </div>
          <p class="inspiration-card-desc">
            深受 <strong>Knife4j</strong> 开源项目的启发。在长期使用中我们深刻体会到优秀文档工具对于研发效能的重要性，并在 OpenAPI 3 与现代 Web 潮流下进一步追求更极致的界面设计与交互体验。
          </p>
        </div>

        <!-- Inspiration 2: Vben Admin -->
        <div class="inspiration-card">
          <div class="inspiration-card-header">
            <div class="inspiration-icon-box" style="background: rgba(59, 130, 246, 0.1); color: #3b82f6;">V</div>
            <div class="inspiration-card-title">视觉规范：Vben Admin 5</div>
          </div>
          <p class="inspiration-card-desc">
            前端基于业界广受好评的 <strong>Vben Admin 5</strong> 企业级框架设计规范构建，采用 Vue 3.5、TypeScript 5.8 与 Vite 6，提供专业的组件体系、主题配置以及极佳的响应式浏览体验。
          </p>
        </div>
      </div>
    </section>

    <!-- Section 3: 核心特性概览 -->
    <section class="doc-section" id="section-features">
      <h2 class="doc-section-title">
        <span class="doc-title-icon-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <polygon points="12 2 2 7 12 12 22 7 12 2"/>
            <polyline points="2 17 12 22 22 17"/>
            <polyline points="2 12 12 17 22 12"/>
          </svg>
        </span>
        <span>核心特性概览</span>
      </h2>
      <p class="doc-paragraph">
        NextDoc4j 针对日常研发、接口调试与团队交付链路进行了系统性强化：
      </p>

      <div class="overview-bento-grid">
        <!-- Card 1: 现代化企业级设计 -->
        <div class="overview-feature-card">
          <div class="feat-card-top">
            <div class="feat-icon-badge">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
            </div>
            <h3 class="feat-card-title">现代化企业级设计</h3>
          </div>
          <ul class="feat-card-list">
            <li>
              <span class="feat-item-dot"></span>
              <span class="feat-item-tag">双模主题</span>
              <span class="feat-item-desc">支持原生深浅色模式一键平滑切换</span>
            </li>
            <li>
              <span class="feat-item-dot"></span>
              <span class="feat-item-tag">响应布局</span>
              <span class="feat-item-desc">深度适配宽屏显示器与移动端设备</span>
            </li>
            <li>
              <span class="feat-item-dot"></span>
              <span class="feat-item-tag">极简视觉</span>
              <span class="feat-item-desc">规范化信息层级与交互视窗动效</span>
            </li>
          </ul>
        </div>

        <!-- Card 2: 全能接口调试工作台 -->
        <div class="overview-feature-card">
          <div class="feat-card-top">
            <div class="feat-icon-badge">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
            </div>
            <h3 class="feat-card-title">全能接口调试工作台</h3>
          </div>
          <ul class="feat-card-list">
            <li>
              <span class="feat-item-dot"></span>
              <span class="feat-item-tag">参数联动</span>
              <span class="feat-item-desc">支持 Path、Query、Header 与 Body 校验</span>
            </li>
            <li>
              <span class="feat-item-dot"></span>
              <span class="feat-item-tag">流式调试</span>
              <span class="feat-item-desc">实时接收并渲染 SSE 事件流与中止</span>
            </li>
            <li>
              <span class="feat-item-dot"></span>
              <span class="feat-item-tag">响应回显</span>
              <span class="feat-item-desc">状态码、原始请求与多响应同屏比对</span>
            </li>
          </ul>
        </div>

        <!-- Card 3: 微服务网关聚合 -->
        <div class="overview-feature-card">
          <div class="feat-card-top">
            <div class="feat-icon-badge">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
            </div>
            <h3 class="feat-card-title">微服务网关聚合</h3>
          </div>
          <ul class="feat-card-list">
            <li>
              <span class="feat-item-dot"></span>
              <span class="feat-item-tag">自动发现</span>
              <span class="feat-item-desc">单 Starter 自动聚合微服务集群接口</span>
            </li>
            <li>
              <span class="feat-item-dot"></span>
              <span class="feat-item-tag">路由重写</span>
              <span class="feat-item-desc">智能识别 StripPrefix 过滤器与路径映射</span>
            </li>
            <li>
              <span class="feat-item-dot"></span>
              <span class="feat-item-tag">全局检索</span>
              <span class="feat-item-desc">网关统一控制台跨服务极速模糊搜索</span>
            </li>
          </ul>
        </div>

        <!-- Card 4: 权限码提取与品牌定制 -->
        <div class="overview-feature-card">
          <div class="feat-card-top">
            <div class="feat-icon-badge">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
            </div>
            <h3 class="feat-card-title">权限码提取与品牌定制</h3>
          </div>
          <ul class="feat-card-list">
            <li>
              <span class="feat-item-dot"></span>
              <span class="feat-item-tag">权限解析</span>
              <span class="feat-item-desc">无侵入识别 Sa-Token 权限校验注解</span>
            </li>
            <li>
              <span class="feat-item-dot"></span>
              <span class="feat-item-tag">品牌定制</span>
              <span class="feat-item-desc">自定义系统 Logo、主题色与文档路径</span>
            </li>
            <li>
              <span class="feat-item-dot"></span>
              <span class="feat-item-tag">离线归档</span>
              <span class="feat-item-desc">一键导出 Markdown、HTML 与 OpenAPI</span>
            </li>
          </ul>
        </div>
      </div>
    </section>

    <!-- Section 4: 技术架构全景 -->
    <section class="doc-section" id="section-architecture">
      <h2 class="doc-section-title">
        <span class="doc-title-icon-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <rect x="2" y="2" width="20" height="8" rx="2" ry="2"/>
            <rect x="2" y="14" width="20" height="8" rx="2" ry="2"/>
            <line x1="6" y1="6" x2="6.01" y2="6"/>
            <line x1="6" y1="18" x2="6.01" y2="18"/>
          </svg>
        </span>
        <span>技术架构全景</span>
      </h2>
      <p class="doc-paragraph">
        NextDoc4j 采用前后端高内聚低耦合的现代化架构设计：
      </p>

      <div class="arch-stack-grid">
        <!-- Front-end -->
        <div class="arch-stack-card">
          <h4 class="arch-card-h">前端工作台架构</h4>
          <ul class="arch-stack-items">
            <li><span>核心框架</span><strong>Vue 3.5</strong></li>
            <li><span>构建工具</span><strong>Vite 6</strong></li>
            <li><span>类型体系</span><strong>TypeScript 5.8</strong></li>
            <li><span>UI 组件库</span><strong>Element Plus 2.10</strong></li>
            <li><span>状态管理</span><strong>Pinia 3</strong></li>
            <li><span>设计标准</span><strong>Vben Admin 5</strong></li>
          </ul>
        </div>

        <!-- Back-end -->
        <div class="arch-stack-card">
          <h4 class="arch-card-h">后端 Starter 架构</h4>
          <ul class="arch-stack-items">
            <li><span>运行环境</span><strong>JDK 17+</strong></li>
            <li><span>核心框架</span><strong>Spring Boot 3.4.x / 4.x</strong></li>
            <li><span>规范标准</span><strong>OpenAPI 3.1</strong></li>
            <li><span>引擎基座</span><strong>SpringDoc 2.8 / 3.x</strong></li>
            <li><span>依赖管理</span><strong>nextdoc4j-bom</strong></li>
            <li><span>分发体系</span><strong>Maven Central</strong></li>
          </ul>
        </div>

        <!-- Gateway & Ecosystem -->
        <div class="arch-stack-card">
          <h4 class="arch-card-h">网关与扩展生态</h4>
          <ul class="arch-stack-items">
            <li><span>响应式网关</span><strong>SCG WebFlux</strong></li>
            <li><span>阻塞式网关</span><strong>SCG WebMvc</strong></li>
            <li><span>权限插件</span><strong>Sa-Token 插件</strong></li>
            <li><span>枚举插件</span><strong>Enum 字典增强</strong></li>
            <li><span>安全拦截</span><strong>简单认证插件</strong></li>
            <li><span>离线归档</span><strong>MD / HTML 导出</strong></li>
          </ul>
        </div>
      </div>
    </section>

    <!-- Section 5: 界面展示 -->
    <section class="doc-section" id="section-screenshots">
      <h2 class="doc-section-title">
        <span class="doc-title-icon-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
            <line x1="8" y1="21" x2="16" y2="21"/>
            <line x1="12" y1="17" x2="12" y2="21"/>
          </svg>
        </span>
        <span>工作台界面预览</span>
      </h2>
      <p class="doc-paragraph">
        NextDoc4j 提供清晰的双栏工作台布局与沉浸式调试体验：
      </p>

      <div class="overview-preview-box">
        <div class="preview-window-bar">
          <div class="preview-tab-pill">
            <button
              class="preview-tab-item"
              :class="{ active: previewMode === 'light' }"
              type="button"
              @click="previewMode = 'light'"
            >
              浅色模式
            </button>
            <button
              class="preview-tab-item"
              :class="{ active: previewMode === 'dark' }"
              type="button"
              @click="previewMode = 'dark'"
            >
              深色模式
            </button>
          </div>
          <span class="preview-url-text">http://localhost:8080/doc.html</span>
        </div>
        <img :src="currentPreviewImg" alt="NextDoc4j 工作台预览" class="preview-stage-img" />
      </div>
    </section>

    <!-- Section 6: 开源社区与支持 -->
    <section class="doc-section" id="section-community">
      <h2 class="doc-section-title">
        <span class="doc-title-icon-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
          </svg>
        </span>
        <span>开源社区与支持</span>
      </h2>
      <p class="doc-paragraph">
        NextDoc4j 遵循开源开放精神，欢迎前往您喜爱的代码托管平台 Star 或 Fork 共同建设：
      </p>

      <div class="community-showcase-shell">
        <!-- 3-Platform Interactive Cards -->
        <div class="community-cards-grid">
          <!-- Gitee -->
          <div class="platform-interactive-card">
            <div class="platform-card-header">
              <div class="platform-identity">
                <div class="platform-symbol-icon gitee">
                  <svg width="22" height="22" viewBox="0 0 24 24">
                    <path d="M11.984 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.016 0zm6.09 5.333c.328 0 .593.266.592.593v1.482a.594.594 0 0 1-.593.592H9.777c-.982 0-1.778.796-1.778 1.778v5.63c0 .327.266.592.593.592h5.63c.982 0 1.778-.796 1.778-1.778v-.296a.593.593 0 0 0-.592-.593h-4.15a.592.592 0 0 1-.592-.592v-1.482a.593.593 0 0 1 .593-.592h6.815c.327 0 .593.265.593.592v3.408a4 4 0 0 1-4 4H5.926a.593.593 0 0 1-.593-.593V9.778a4.444 4.444 0 0 1 4.445-4.444h8.296z" fill="currentColor"/>
                  </svg>
                </div>
                <div>
                  <div class="platform-title-text">Gitee 码云</div>
                </div>
              </div>
              <span class="platform-role-tag">国内主仓</span>
            </div>
            <p class="platform-card-desc">
              官方主代码仓库，提供国内极速拉取与发行版同步下载。
            </p>
            <div class="platform-cta-row">
              <a class="btn-star-primary" href="https://gitee.com/nextdoc4j/nextdoc4j" target="_blank" rel="noopener noreferrer">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                <span>前往 Gitee Star</span>
              </a>
            </div>
          </div>

          <!-- GitHub -->
          <div class="platform-interactive-card">
            <div class="platform-card-header">
              <div class="platform-identity">
                <div class="platform-symbol-icon github">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
                  </svg>
                </div>
                <div>
                  <div class="platform-title-text">GitHub</div>
                </div>
              </div>
              <span class="platform-role-tag">全球镜像</span>
            </div>
            <p class="platform-card-desc">
              面向全球开发者的开源协作阵地，欢迎提交 Issue 缺陷与 PR。
            </p>
            <div class="platform-cta-row">
              <a class="btn-star-primary" href="https://github.com/NextDoc4j/nextdoc4j" target="_blank" rel="noopener noreferrer">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                <span>前往 GitHub Star</span>
              </a>
            </div>
          </div>

          <!-- GitCode -->
          <div class="platform-interactive-card">
            <div class="platform-card-header">
              <div class="platform-identity">
                <div class="platform-symbol-icon gitcode">
                  <img :src="withBase('/logo/gitcode.png')" alt="GitCode" />
                </div>
                <div>
                  <div class="platform-title-text">GitCode</div>
                </div>
              </div>
              <span class="platform-role-tag">CSDN 社区</span>
            </div>
            <p class="platform-card-desc">
              CSDN 开发者生态代码托管平台，支持开发者一键同步与交流。
            </p>
            <div class="platform-cta-row">
              <a class="btn-star-primary" href="https://gitcode.com/NextDoc4j/nextdoc4j" target="_blank" rel="noopener noreferrer">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                <span>前往 GitCode Star</span>
              </a>
            </div>
          </div>
        </div>

        <!-- Community Communication Banner -->
        <div class="community-chat-banner">
          <div class="chat-banner-left">
            <div class="chat-icon-avatar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
              </svg>
            </div>
            <div>
              <div class="chat-banner-title">加入技术交流与社群支持</div>
              <div class="chat-banner-subtitle">与核心维护团队即时交流集成心得，或提交 Bug / Feature 需求</div>
            </div>
          </div>

          <div class="chat-banner-actions">
            <a class="chat-btn-item" :href="withBase('/more/join-group')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
              <span>加入交流群</span>
            </a>
            <a class="chat-btn-item" :href="withBase('/more/contribute')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path stroke-linecap="round" stroke-linejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/></svg>
              <span>贡献指南</span>
            </a>
            <a class="chat-btn-item" :href="withBase('/more/faq')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01"/></svg>
              <span>常见问题 FAQ</span>
            </a>
          </div>
        </div>
      </div>
    </section>

    <!-- Section 7: 开源协议与致谢 -->
    <section class="doc-section" id="section-license">
      <h2 class="doc-section-title">
        <span class="doc-title-icon-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
        </span>
        <span>开源协议与致谢</span>
      </h2>
      <p class="doc-paragraph">
        NextDoc4j 基于 <strong>Apache License 2.0</strong> 协议开源。感谢以下优秀的开源项目与社区生态：
      </p>
      <ul class="guide-license-list">
        <li><strong>Knife4j</strong> — 优秀的 Swagger 增强工具，为我们提供了宝贵的研发设计灵感。</li>
        <li><strong>Vben Admin</strong> — 企业级管理系统框架，为前端 UI 奠定了坚实的技术底座。</li>
        <li><strong>SpringDoc</strong> — 优秀的 Spring Boot OpenAPI 3 规范集成底座。</li>
        <li><strong>Swagger UI</strong> — 经典的 API 交互式文档先行者。</li>
        <li><strong>Vue.js &amp; Element Plus</strong> — 现代化的前端响应式框架与组件生态。</li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.guide-overview-root {
  width: 100%;
  max-width: 100%;
}

.guide-page-lead {
  font-size: 16px;
  color: var(--vp-c-text-2, #64748b);
  line-height: 1.65;
  margin-bottom: 20px;
}

/* Badges Strip */
.guide-badge-strip {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 34px;
}

.tech-pill-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 11px;
  border-radius: 9999px;
  background: var(--vp-c-bg-elv, #ffffff);
  border: 1px solid var(--vp-c-divider, rgba(15, 23, 42, 0.08));
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
  font-size: 12px;
  font-weight: 500;
  color: var(--vp-c-text-2, #64748b);
  font-family: var(--vp-font-family-mono, monospace);
  transition: all 0.16s ease;
  cursor: default;
}

.tech-pill-badge strong {
  color: var(--vp-c-text-1, #0f172a);
  font-weight: 650;
}

.tech-pill-badge:hover {
  background: rgba(5, 150, 105, 0.08);
  border-color: rgba(5, 150, 105, 0.25);
  color: #059669;
  transform: translateY(-1px);
}

.dark .tech-pill-badge:hover {
  background: rgba(16, 185, 129, 0.12);
  border-color: rgba(16, 185, 129, 0.3);
  color: #10b981;
}

.tech-pill-badge:hover strong {
  color: #059669;
}

.dark .tech-pill-badge:hover strong {
  color: #10b981;
}

.tech-pill-badge.brand-pill {
  background: rgba(5, 150, 105, 0.08);
  border-color: rgba(5, 150, 105, 0.25);
  color: #059669;
  font-weight: 600;
}

.dark .tech-pill-badge.brand-pill {
  background: rgba(16, 185, 129, 0.12);
  border-color: rgba(16, 185, 129, 0.3);
  color: #10b981;
}

.tech-pill-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #059669;
}

.dark .tech-pill-dot {
  background: #10b981;
}

.tech-pill-logo {
  width: 14px;
  height: 14px;
  display: block;
  flex-shrink: 0;
}

.tech-pill-divider {
  width: 1px;
  height: 16px;
  background: var(--vp-c-divider, rgba(15, 23, 42, 0.08));
  margin: 0 4px;
}

/* Action Banner */
.overview-action-banner {
  background: linear-gradient(135deg, rgba(5, 150, 105, 0.08) 0%, rgba(14, 165, 233, 0.05) 100%);
  border: 1px solid rgba(5, 150, 105, 0.2);
  border-radius: 16px;
  padding: 22px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 40px;
}

.dark .overview-action-banner {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(14, 165, 233, 0.06) 100%);
  border-color: rgba(16, 185, 129, 0.25);
}

.banner-text-wrap {
  display: flex;
  align-items: center;
  gap: 12px;
}

.banner-icon-badge {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: #059669;
  color: #ffffff;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.dark .banner-icon-badge {
  background: #10b981;
  color: #022c22;
}

.banner-icon-badge svg {
  width: 18px;
  height: 18px;
}

.banner-text h4 {
  font-size: 15px;
  font-weight: 750;
  color: var(--vp-c-text-1, #0f172a);
  margin: 0 0 2px;
}

.banner-text p {
  font-size: 13px;
  color: var(--vp-c-text-2, #64748b);
  margin: 0;
}

.banner-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.btn-quick-start {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  padding: 0 18px;
  border-radius: 9999px;
  background: #059669;
  color: #ffffff !important;
  font-size: 13px;
  font-weight: 600;
  box-shadow: 0 4px 14px rgba(5, 150, 105, 0.3);
  transition: all 0.16s ease;
  text-decoration: none !important;
}

.dark .btn-quick-start {
  background: #10b981;
  color: #022c22 !important;
  box-shadow: 0 4px 14px rgba(16, 185, 129, 0.35);
}

.btn-quick-start:hover {
  background: #047857;
  transform: translateY(-1px);
}

.dark .btn-quick-start:hover {
  background: #34d399;
}

.btn-live-demo {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  padding: 0 16px;
  border-radius: 9999px;
  background: var(--vp-c-bg-elv, #ffffff);
  color: var(--vp-c-text-1, #0f172a) !important;
  font-size: 13px;
  font-weight: 600;
  border: 1px solid var(--vp-c-divider, rgba(15, 23, 42, 0.1));
  transition: all 0.16s ease;
  text-decoration: none !important;
}

.btn-live-demo:hover {
  background: var(--vp-c-bg-soft, #edf2f7);
  color: #059669 !important;
}

.dark .btn-live-demo:hover {
  color: #10b981 !important;
}

/* Doc Section */
.doc-section {
  margin-bottom: 48px;
  scroll-margin-top: 80px;
}

.doc-section-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 20px;
  font-weight: 800;
  letter-spacing: -0.025em;
  color: var(--vp-c-text-1, #0f172a);
  margin: 32px 0 16px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--vp-c-divider, rgba(15, 23, 42, 0.08));
}

.doc-title-icon-box {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: rgba(5, 150, 105, 0.08);
  color: #059669;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.dark .doc-title-icon-box {
  background: rgba(16, 185, 129, 0.12);
  color: #10b981;
}

.doc-title-icon-box svg {
  width: 15px;
  height: 15px;
}

.doc-paragraph {
  font-size: 15px;
  color: var(--vp-c-text-2, #475569);
  line-height: 1.75;
  margin-bottom: 16px;
}

/* Inspiration Cards */
.inspiration-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
  margin: 20px 0 28px;
}

@media (max-width: 640px) {
  .inspiration-grid {
    grid-template-columns: 1fr;
  }
}

.inspiration-card {
  background: var(--vp-c-bg-elv, #ffffff);
  border: 1px solid var(--vp-c-divider, rgba(15, 23, 42, 0.08));
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 10px 30px -10px rgba(15, 23, 42, 0.04);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.inspiration-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 14px 36px -10px rgba(15, 23, 42, 0.08);
  border-color: rgba(5, 150, 105, 0.25);
}

.dark .inspiration-card:hover {
  border-color: rgba(16, 185, 129, 0.3);
}

.inspiration-card-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.inspiration-icon-box {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: rgba(5, 150, 105, 0.08);
  color: #059669;
  display: grid;
  place-items: center;
  font-weight: 800;
  font-size: 14px;
}

.dark .inspiration-icon-box {
  background: rgba(16, 185, 129, 0.12);
  color: #10b981;
}

.inspiration-card-title {
  font-size: 15px;
  font-weight: 750;
  color: var(--vp-c-text-1, #0f172a);
}

.inspiration-card-desc {
  font-size: 13px;
  color: var(--vp-c-text-2, #475569);
  line-height: 1.6;
  margin: 0;
}

/* Bento Features Grid */
.overview-bento-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
  margin: 20px 0 32px;
}

@media (max-width: 640px) {
  .overview-bento-grid {
    grid-template-columns: 1fr;
  }
}

.overview-feature-card {
  background: var(--vp-c-bg-elv, #ffffff);
  border: 1px solid var(--vp-c-divider, rgba(15, 23, 42, 0.08));
  border-radius: 16px;
  padding: 22px;
  box-shadow: 0 10px 30px -10px rgba(15, 23, 42, 0.04);
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.overview-feature-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 14px 36px -10px rgba(15, 23, 42, 0.08);
  border-color: rgba(5, 150, 105, 0.25);
}

.dark .overview-feature-card:hover {
  border-color: rgba(16, 185, 129, 0.3);
}

.feat-card-top {
  display: flex;
  align-items: center;
  gap: 12px;
}

.feat-icon-badge {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: rgba(5, 150, 105, 0.08);
  color: #059669;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.dark .feat-icon-badge {
  background: rgba(16, 185, 129, 0.12);
  color: #10b981;
}

.feat-icon-badge svg {
  width: 19px;
  height: 19px;
}

.feat-card-title {
  font-size: 15.5px;
  font-weight: 750;
  color: var(--vp-c-text-1, #0f172a);
  margin: 0;
  line-height: 1.3;
}

.feat-card-list {
  list-style: none !important;
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0 !important;
  padding: 0 !important;
}

.feat-card-list li {
  font-size: 13px;
  color: var(--vp-c-text-2, #475569);
  line-height: 1.5;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 8px;
  background: var(--vp-c-bg-soft, #edf2f7);
  margin: 0 !important;
}

.feat-item-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #059669;
  flex-shrink: 0;
}

.dark .feat-item-dot {
  background: #10b981;
}

.feat-item-tag {
  color: var(--vp-c-text-1, #0f172a);
  font-weight: 650;
  white-space: nowrap;
  flex-shrink: 0;
}

.feat-item-desc {
  color: var(--vp-c-text-2, #64748b);
  flex-grow: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 768px) {
  .feat-item-desc {
    white-space: normal;
  }
  .feat-card-list li {
    align-items: flex-start;
  }
}

/* Architecture 3-Column Grid */
.arch-stack-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin: 20px 0 32px;
}

@media (max-width: 860px) {
  .arch-stack-grid {
    grid-template-columns: 1fr;
  }
}

.arch-stack-card {
  background: var(--vp-c-bg-elv, #ffffff);
  border: 1px solid var(--vp-c-divider, rgba(15, 23, 42, 0.08));
  border-radius: 16px;
  padding: 22px;
  box-shadow: 0 10px 30px -10px rgba(15, 23, 42, 0.04);
}

.arch-card-h {
  font-size: 15.5px;
  font-weight: 750;
  color: var(--vp-c-text-1, #0f172a);
  margin: 0 0 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.arch-card-h::before {
  content: "";
  width: 3px;
  height: 14px;
  border-radius: 2px;
  background: #059669;
}

.dark .arch-card-h::before {
  background: #10b981;
}

.arch-stack-items {
  list-style: none !important;
  display: flex;
  flex-direction: column;
  gap: 9px;
  margin: 0 !important;
  padding: 0 !important;
}

.arch-stack-items li {
  font-size: 13px;
  color: var(--vp-c-text-2, #475569);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 7px;
  border-bottom: 1px solid var(--vp-c-divider, rgba(15, 23, 42, 0.06));
  margin: 0 !important;
}

.arch-stack-items li:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.arch-stack-items strong {
  color: var(--vp-c-text-1, #0f172a);
  font-weight: 600;
  font-family: var(--vp-font-family-mono, monospace);
  font-size: 12.5px;
}

/* Preview macOS Window Box */
.overview-preview-box {
  margin: 24px 0 36px;
  background: var(--vp-c-bg-elv, #ffffff);
  border-radius: 20px;
  box-shadow: 0 24px 60px -16px rgba(15, 23, 42, 0.1);
  border: 1px solid var(--vp-c-divider, rgba(15, 23, 42, 0.08));
  overflow: hidden;
}

.preview-window-bar {
  height: 42px;
  background: var(--vp-c-bg-soft, #f8fafc);
  display: flex;
  align-items: center;
  padding: 0 16px;
  gap: 12px;
  border-bottom: 1px solid var(--vp-c-divider, rgba(15, 23, 42, 0.08));
}

.preview-lights {
  display: flex;
  gap: 7px;
}

.preview-light {
  width: 11px;
  height: 11px;
  border-radius: 50%;
}

.preview-light.c { background: #ff5f57; }
.preview-light.m { background: #febc2e; }
.preview-light.x { background: #28c840; }

.preview-tab-pill {
  display: inline-flex;
  padding: 2px;
  border-radius: 9999px;
  background: var(--vp-c-bg-mute, rgba(15, 23, 42, 0.06));
  margin-left: 8px;
}

.preview-tab-item {
  padding: 3px 12px;
  border-radius: 9999px;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--vp-c-text-2, #64748b);
  cursor: pointer;
  border: none;
  background: none;
}

.preview-tab-item.active {
  background: var(--vp-c-bg-elv, #ffffff);
  color: #059669;
  box-shadow: 0 2px 5px rgba(0,0,0,0.05);
}

.dark .preview-tab-item.active {
  color: #10b981;
}

.preview-url-text {
  margin-left: auto;
  font-family: var(--vp-font-family-mono, monospace);
  font-size: 11px;
  color: var(--vp-c-text-3, #94a3b8);
}

.preview-stage-img {
  width: 100%;
  aspect-ratio: 1692 / 968;
  display: block;
  object-fit: cover;
  object-position: top left;
}

/* Community Showcase */
.community-showcase-shell {
  margin: 24px 0 36px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.community-cards-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

@media (max-width: 860px) {
  .community-cards-grid {
    grid-template-columns: 1fr;
  }
}

.platform-interactive-card {
  background: var(--vp-c-bg-elv, #ffffff);
  border: 1px solid var(--vp-c-divider, rgba(15, 23, 42, 0.08));
  border-radius: 16px;
  padding: 22px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 16px;
  box-shadow: 0 10px 30px -10px rgba(15, 23, 42, 0.04);
  transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease;
}

.platform-interactive-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 14px 36px -10px rgba(15, 23, 42, 0.08);
  border-color: rgba(5, 150, 105, 0.25);
}

.dark .platform-interactive-card:hover {
  border-color: rgba(16, 185, 129, 0.3);
}

.platform-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.platform-identity {
  display: flex;
  align-items: center;
  gap: 10px;
}

.platform-symbol-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.platform-symbol-icon.gitee {
  background: rgba(199, 29, 35, 0.08);
  color: #c71d23;
}

.platform-symbol-icon.github {
  background: rgba(15, 23, 42, 0.08);
  color: var(--vp-c-text-1, #0f172a);
}

.dark .platform-symbol-icon.github {
  background: rgba(255, 255, 255, 0.08);
  color: #f8fafc;
}

.platform-symbol-icon.gitcode {
  background: rgba(37, 99, 235, 0.08);
  color: #2563eb;
}

.platform-symbol-icon.gitcode img {
  width: 22px;
  height: 22px;
  border-radius: 6px;
}

.platform-title-text {
  font-size: 15px;
  font-weight: 750;
  color: var(--vp-c-text-1, #0f172a);
}

.platform-role-tag {
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 9999px;
  background: var(--vp-c-bg-soft, #edf2f7);
  color: var(--vp-c-text-2, #64748b);
  font-family: var(--vp-font-family-mono, monospace);
}

.platform-card-desc {
  font-size: 13px;
  color: var(--vp-c-text-2, #475569);
  line-height: 1.6;
  flex-grow: 1;
  margin: 0;
}

.platform-cta-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-top: 14px;
  border-top: 1px solid var(--vp-c-divider, rgba(15, 23, 42, 0.06));
}

.btn-star-primary {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 34px;
  padding: 0 12px;
  border-radius: 9999px;
  background: rgba(5, 150, 105, 0.08);
  color: #059669 !important;
  font-size: 12.5px;
  font-weight: 700;
  transition: all 0.16s ease;
  text-decoration: none !important;
}

.dark .btn-star-primary {
  background: rgba(16, 185, 129, 0.12);
  color: #10b981 !important;
}

.btn-star-primary:hover {
  background: #059669;
  color: #ffffff !important;
  transform: translateY(-1px);
  box-shadow: 0 4px 14px rgba(5, 150, 105, 0.3);
}

.dark .btn-star-primary:hover {
  background: #10b981;
  color: #022c22 !important;
}

.btn-star-primary svg {
  width: 14px;
  height: 14px;
}

/* Chat Banner */
.community-chat-banner {
  background: linear-gradient(135deg, var(--vp-c-bg-elv, #ffffff) 0%, var(--vp-c-bg-soft, #edf2f7) 100%);
  border: 1px solid var(--vp-c-divider, rgba(15, 23, 42, 0.08));
  border-radius: 16px;
  padding: 22px 26px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
  box-shadow: 0 10px 30px -10px rgba(15, 23, 42, 0.04);
}

.chat-banner-left {
  display: flex;
  align-items: center;
  gap: 14px;
}

.chat-icon-avatar {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: rgba(5, 150, 105, 0.08);
  color: #059669;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.dark .chat-icon-avatar {
  background: rgba(16, 185, 129, 0.12);
  color: #10b981;
}

.chat-icon-avatar svg {
  width: 20px;
  height: 20px;
}

.chat-banner-title {
  font-size: 15px;
  font-weight: 750;
  color: var(--vp-c-text-1, #0f172a);
  margin-bottom: 2px;
}

.chat-banner-subtitle {
  font-size: 13px;
  color: var(--vp-c-text-2, #64748b);
}

.chat-banner-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.chat-btn-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 14px;
  border-radius: 9999px;
  background: var(--vp-c-bg-elv, #ffffff);
  border: 1px solid var(--vp-c-divider, rgba(15, 23, 42, 0.1));
  font-size: 12.5px;
  font-weight: 600;
  color: var(--vp-c-text-1, #0f172a) !important;
  transition: all 0.15s ease;
  text-decoration: none !important;
}

.chat-btn-item:hover {
  border-color: #059669;
  color: #059669 !important;
  background: rgba(5, 150, 105, 0.08);
}

.dark .chat-btn-item:hover {
  border-color: #10b981;
  color: #10b981 !important;
  background: rgba(16, 185, 129, 0.12);
}

.guide-license-list {
  padding-left: 20px;
  color: var(--vp-c-text-2, #475569);
  line-height: 1.8;
  margin-bottom: 20px;
}
</style>
