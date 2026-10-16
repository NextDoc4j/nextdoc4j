<template>
  <div class="plugin-auth-grid">
    <div class="plugin-grid-card">
      <div class="plugin-grid-header">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
        <span>全局认证配置页</span>
      </div>
      <div class="plugin-grid-img-wrap">
        <img src="/images/screenshots/guide/authentication-plugin-ui.png" alt="全局认证配置页" class="plugin-grid-img" />
      </div>
      <div class="plugin-grid-caption">自动解析 securitySchemes 生成独立配置表单，支持 Bearer / ApiKey / Basic</div>
    </div>

    <div class="plugin-grid-card">
      <div class="plugin-grid-header">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        <span>在线调试 Headers 中自动注入全局请求头</span>
      </div>
      <div class="plugin-grid-img-wrap">
        <img src="/images/screenshots/guide/authentication-plugin-ui-2.png" alt="在线调试 Headers 中自动注入全局请求头" class="plugin-grid-img" />
      </div>
      <div class="plugin-grid-caption">在线调试受保护接口时全自动挂载 Authorization 请求头，无需重复填入</div>
    </div>
  </div>
</template>

<style scoped>
.plugin-auth-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
  margin: 20px 0 28px;
}

@media (max-width: 768px) {
  .plugin-auth-grid {
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
