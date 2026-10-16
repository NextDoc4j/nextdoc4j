<template>
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
</template>

<style scoped>
.overview-bento-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
  margin: 16px 0 28px;
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
</style>
