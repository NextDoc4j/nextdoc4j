<template>
  <div class="ui-search-cards">
    <div class="search-grid-card">
      <div class="search-grid-header">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.35-4.35"/>
        </svg>
        <span>按 URL 路径检索（如 <code>/api/user</code>）</span>
      </div>
      <img src="/images/screenshots/guide/global-search-url.png" alt="URL 路径搜索结果" class="search-grid-img" />
      <div class="search-grid-caption">输入 URL 路径关键词，快速定位目标接口</div>
    </div>

    <div class="search-grid-card">
      <div class="search-grid-header">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
        <span>按业务中文描述检索</span>
      </div>
      <img src="/images/screenshots/guide/global-search-description.png" alt="描述关键字搜索结果" class="search-grid-img" />
      <div class="search-grid-caption">输入中文功能说明与拼音模糊匹配</div>
    </div>
  </div>
</template>

<style scoped>
.ui-search-cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
  margin: 20px 0 28px;
}

@media (max-width: 768px) {
  .ui-search-cards {
    grid-template-columns: 1fr;
  }
}

.search-grid-card {
  background: var(--vp-c-bg, #ffffff);
  border: 1px solid var(--vp-c-divider, rgba(15, 23, 42, 0.08));
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
  transition: all 0.2s ease;
}

.search-grid-card:hover {
  border-color: rgba(5, 150, 105, 0.3);
  box-shadow: 0 10px 30px -10px rgba(15, 23, 42, 0.08);
}

.dark .search-grid-card {
  background: var(--vp-c-bg-soft, #131b2e);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.dark .search-grid-card:hover {
  border-color: rgba(16, 185, 129, 0.35);
  box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.6);
}

.search-grid-header {
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

.search-grid-header code {
  font-size: 12px;
  padding: 2px 5px;
  border-radius: 4px;
  background: rgba(5, 150, 105, 0.08);
  color: #047857;
}

.dark .search-grid-header code {
  background: rgba(16, 185, 129, 0.12);
  color: #34d399;
}

.search-grid-img {
  width: 100%;
  height: 240px;
  object-fit: cover;
  object-position: top center;
  display: block;
}

.search-grid-caption {
  padding: 10px 16px;
  font-size: 12.5px;
  color: var(--vp-c-text-2, #64748b);
  background: var(--vp-c-bg, #ffffff);
  border-top: 1px solid var(--vp-c-divider, rgba(15, 23, 42, 0.05));
}

.dark .search-grid-caption {
  background: var(--vp-c-bg-soft, #131b2e);
}
</style>
