<template>
  <div class="ui-overview-grid">
    <div class="ui-grid-card">
      <div class="ui-grid-header">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
        </svg>
        <span>接口详情工作台</span>
      </div>
      <div class="ui-grid-img-wrap">
        <img src="/images/screenshots/guide/detail-workbench.png" alt="接口详情工作台" class="ui-grid-img" />
      </div>
      <div class="ui-grid-caption">多响应示例、状态码切换与结构化入参视图</div>
    </div>

    <div class="ui-grid-card">
      <div class="ui-grid-header">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="16 18 22 12 16 6"/>
          <polyline points="8 6 2 12 8 18"/>
        </svg>
        <span>TS 实体代码生成弹窗</span>
      </div>
      <div class="ui-grid-img-wrap">
        <img src="/images/screenshots/guide/code-example-dialog.png" alt="TypeScript 实体代码示例" class="ui-grid-img" />
      </div>
      <div class="ui-grid-caption">前端一键生成 TypeScript Request / Response 实体定义</div>
    </div>
  </div>
</template>

<style scoped>
.ui-overview-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
  margin: 20px 0 28px;
}

@media (max-width: 768px) {
  .ui-overview-grid {
    grid-template-columns: 1fr;
  }
}

.ui-grid-card {
  background: var(--vp-c-bg, #ffffff);
  border: 1px solid var(--vp-c-divider, rgba(15, 23, 42, 0.08));
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
  transition: all 0.25s ease;
  display: flex;
  flex-direction: column;
}

.ui-grid-card:hover {
  border-color: rgba(5, 150, 105, 0.3);
  box-shadow: 0 10px 30px -10px rgba(15, 23, 42, 0.08);
}

.dark .ui-grid-card {
  background: var(--vp-c-bg-soft, #131b2e);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.dark .ui-grid-card:hover {
  border-color: rgba(16, 185, 129, 0.35);
  box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.6);
}

.ui-grid-header {
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

.dark .ui-grid-header {
  background: var(--vp-c-bg-soft, #131b2e);
  color: #f8fafc;
}

.ui-grid-img-wrap {
  width: 100%;
  aspect-ratio: 16 / 10;
  background: #f8fafc;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.dark .ui-grid-img-wrap {
  background: #090d16;
}

.ui-grid-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: center;
  display: block;
  transition: transform 0.25s ease;
}

.ui-grid-card:hover .ui-grid-img {
  transform: scale(1.02);
}

.ui-grid-caption {
  padding: 11px 16px;
  font-size: 12.5px;
  color: var(--vp-c-text-2, #64748b);
  background: var(--vp-c-bg, #ffffff);
  border-top: 1px solid var(--vp-c-divider, rgba(15, 23, 42, 0.05));
  margin-top: auto;
}

.dark .ui-grid-caption {
  background: var(--vp-c-bg-soft, #131b2e);
}
</style>
