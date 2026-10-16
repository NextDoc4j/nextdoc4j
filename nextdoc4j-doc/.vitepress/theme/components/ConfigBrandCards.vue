<template>
  <div class="config-brand-grid">
    <div class="brand-grid-card">
      <div class="brand-grid-header">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
        <span>认证登录页品牌展示</span>
      </div>
      <div class="brand-grid-img-wrap">
        <img src="/images/screenshots/guide/login-logo.png" alt="认证登录页品牌展示" class="brand-grid-img" />
      </div>
      <div class="brand-grid-caption">自定义 Logo 与系统标题无缝呈现于安全登录页头部</div>
    </div>

    <div class="brand-grid-card">
      <div class="brand-grid-header">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
        <span>文档主页顶部与页脚展示</span>
      </div>
      <div class="brand-grid-img-wrap">
        <img src="/images/screenshots/guide/home-logo.png" alt="文档主页顶部与页脚展示" class="brand-grid-img" />
      </div>
      <div class="brand-grid-caption">主工作台顶部展示定制 Logo，底部动态渲染环境与版权信息</div>
    </div>
  </div>
</template>

<style scoped>
.config-brand-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
  margin: 20px 0 28px;
}

@media (max-width: 768px) {
  .config-brand-grid {
    grid-template-columns: 1fr;
  }
}

.brand-grid-card {
  background: var(--vp-c-bg, #ffffff);
  border: 1px solid var(--vp-c-divider, rgba(15, 23, 42, 0.08));
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
  transition: all 0.25s ease;
  display: flex;
  flex-direction: column;
}

.brand-grid-card:hover {
  border-color: rgba(5, 150, 105, 0.3);
  box-shadow: 0 10px 30px -10px rgba(15, 23, 42, 0.08);
}

.dark .brand-grid-card {
  background: var(--vp-c-bg-soft, #131b2e);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.dark .brand-grid-card:hover {
  border-color: rgba(16, 185, 129, 0.35);
  box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.6);
}

.brand-grid-header {
  padding: 12px 16px;
  background: var(--vp-c-bg-soft, #f8fafc);
  border-bottom: 1px solid var(--vp-c-divider, rgba(15, 23, 42, 0.08));
  font-size: 13px;
  font-weight: 700;
  color: var(--vp-c-text-1, #0f172a);
  display: flex;
  align-items: center;
  gap: 8px;
}

.dark .brand-grid-header {
  background: var(--vp-c-bg-soft, #131b2e);
  color: #f8fafc;
}

.brand-grid-img-wrap {
  width: 100%;
  aspect-ratio: 16 / 10;
  background: #f8fafc;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.dark .brand-grid-img-wrap {
  background: #090d16;
}

.brand-grid-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: center;
  display: block;
  transition: transform 0.25s ease;
}

.brand-grid-card:hover .brand-grid-img {
  transform: scale(1.02);
}

.brand-grid-caption {
  padding: 11px 16px;
  font-size: 12.5px;
  color: var(--vp-c-text-2, #64748b);
  background: var(--vp-c-bg, #ffffff);
  border-top: 1px solid var(--vp-c-divider, rgba(15, 23, 42, 0.05));
  margin-top: auto;
}

.dark .brand-grid-caption {
  background: var(--vp-c-bg-soft, #131b2e);
}
</style>
