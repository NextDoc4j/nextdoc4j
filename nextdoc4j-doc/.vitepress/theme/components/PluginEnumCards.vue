<template>
  <div class="plugin-enum-grid">
    <div class="plugin-grid-card">
      <div class="plugin-grid-header">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
        </svg>
        <span>接口详情中的枚举值与说明展示</span>
      </div>
      <div class="plugin-grid-img-wrap">
        <img src="/images/screenshots/guide/enum-plugin-ui.png" alt="接口详情中的枚举值与说明展示" class="plugin-grid-img" />
      </div>
      <div class="plugin-grid-caption">清晰直观呈现状态码数值与中文业务说明对应关系</div>
    </div>

    <div class="plugin-grid-card">
      <div class="plugin-grid-header">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
        <span>在线调试时可下拉选择枚举值</span>
      </div>
      <div class="plugin-grid-img-wrap">
        <img src="/images/screenshots/guide/enum-plugin-dropdown.png" alt="在线调试时可下拉选择枚举值" class="plugin-grid-img" />
      </div>
      <div class="plugin-grid-caption">在线调试入参自动识别枚举，提供可视化下拉单选项</div>
    </div>
  </div>
</template>

<style scoped>
.plugin-enum-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
  margin: 20px 0 28px;
}

@media (max-width: 768px) {
  .plugin-enum-grid {
    grid-template-columns: 1fr;
  }
}

.plugin-grid-card {
  background: var(--vp-c-bg, #ffffff);
  border: 1px solid var(--vp-c-divider, rgba(15, 23, 42, 0.08));
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
  transition: all 0.25s ease;
  display: flex;
  flex-direction: column;
}

.plugin-grid-card:hover {
  border-color: rgba(5, 150, 105, 0.3);
  box-shadow: 0 10px 30px -10px rgba(15, 23, 42, 0.08);
}

.dark .plugin-grid-card {
  background: var(--vp-c-bg-soft, #131b2e);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.dark .plugin-grid-card:hover {
  border-color: rgba(16, 185, 129, 0.35);
  box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.6);
}

.plugin-grid-header {
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

.dark .plugin-grid-header {
  background: var(--vp-c-bg-soft, #131b2e);
  color: #f8fafc;
}

.plugin-grid-img-wrap {
  width: 100%;
  aspect-ratio: 16 / 10;
  background: #f8fafc;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.dark .plugin-grid-img-wrap {
  background: #090d16;
}

.plugin-grid-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: center;
  display: block;
  transition: transform 0.25s ease;
}

.plugin-grid-card:hover .plugin-grid-img {
  transform: scale(1.02);
}

.plugin-grid-caption {
  padding: 11px 16px;
  font-size: 12.5px;
  color: var(--vp-c-text-2, #64748b);
  background: var(--vp-c-bg, #ffffff);
  border-top: 1px solid var(--vp-c-divider, rgba(15, 23, 42, 0.05));
  margin-top: auto;
}

.dark .plugin-grid-caption {
  background: var(--vp-c-bg-soft, #131b2e);
}
</style>
