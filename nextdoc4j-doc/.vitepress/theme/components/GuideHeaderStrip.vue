<script setup lang="ts">
import { withBase } from "vitepress";
</script>

<template>
  <div class="guide-header-strip-root">
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

    <!-- Action Banner Card (Non-wrapping buttons) -->
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
  </div>
</template>

<style scoped>
.guide-header-strip-root {
  width: 100%;
  margin-top: 12px;
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
  margin-bottom: 30px;
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

/* Action Banner (No Wrapping Buttons) */
.overview-action-banner {
  background: linear-gradient(135deg, rgba(5, 150, 105, 0.08) 0%, rgba(14, 165, 233, 0.05) 100%);
  border: 1px solid rgba(5, 150, 105, 0.2);
  border-radius: 16px;
  padding: 20px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 36px;
}

.dark .overview-action-banner {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(14, 165, 233, 0.06) 100%);
  border-color: rgba(16, 185, 129, 0.25);
}

.banner-text-wrap {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
  flex: 1;
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

.banner-text {
  min-width: 0;
}

.banner-text h4 {
  font-size: 15px;
  font-weight: 750;
  color: var(--vp-c-text-1, #0f172a);
  margin: 0 0 2px;
  white-space: nowrap;
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
  flex-shrink: 0;
  flex-wrap: nowrap;
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
  white-space: nowrap;
  flex-shrink: 0;
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
  white-space: nowrap;
  flex-shrink: 0;
}

.btn-live-demo:hover {
  background: var(--vp-c-bg-soft, #edf2f7);
  color: #059669 !important;
}

.dark .btn-live-demo:hover {
  color: #10b981 !important;
}

@media (max-width: 768px) {
  .overview-action-banner {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
  .banner-text h4 {
    white-space: normal;
  }
  .banner-actions {
    width: 100%;
  }
  .btn-quick-start,
  .btn-live-demo {
    flex: 1;
    justify-content: center;
  }
}
</style>
