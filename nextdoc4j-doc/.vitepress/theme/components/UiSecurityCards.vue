<template>
  <div class="ui-security-cards">
    <div class="security-grid-card">
      <div class="security-grid-header">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="8.5" cy="7.5" r="4"/>
          <line x1="20" y1="8" x2="20" y2="14"/>
          <line x1="23" y1="11" x2="17" y2="11"/>
        </svg>
        <span>Sa-Token 权限码标识展示</span>
      </div>
      <div class="security-grid-img-wrap">
        <img src="/images/screenshots/guide/security-plugin-1.png" alt="Sa-Token 权限码展示" class="security-grid-img" />
      </div>
      <div class="security-grid-caption">接口详情头部展示精确所需权限码（如 <code>user:delete</code>）</div>
    </div>

    <div class="security-grid-card">
      <div class="security-grid-header">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
        <span>Sa-Token 角色码要求展示</span>
      </div>
      <div class="security-grid-img-wrap">
        <img src="/images/screenshots/guide/security-plugin-2.png" alt="Sa-Token 角色码展示" class="security-grid-img" />
      </div>
      <div class="security-grid-caption">接口详情头部展示所需角色要求（如 <code>admin</code>）</div>
    </div>
  </div>
</template>

<style scoped>
.ui-security-cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
  margin: 20px 0 28px;
}

@media (max-width: 768px) {
  .ui-security-cards {
    grid-template-columns: 1fr;
  }
}

.security-grid-card {
  background: var(--vp-c-bg, #ffffff);
  border: 1px solid var(--vp-c-divider, rgba(15, 23, 42, 0.08));
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
  transition: all 0.25s ease;
  display: flex;
  flex-direction: column;
}

.security-grid-card:hover {
  border-color: rgba(5, 150, 105, 0.3);
  box-shadow: 0 10px 30px -10px rgba(15, 23, 42, 0.08);
}

.dark .security-grid-card {
  background: var(--vp-c-bg-soft, #131b2e);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.dark .security-grid-card:hover {
  border-color: rgba(16, 185, 129, 0.35);
  box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.6);
}

.security-grid-header {
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

.dark .security-grid-header {
  background: var(--vp-c-bg-soft, #131b2e);
  color: #f8fafc;
}

.security-grid-img-wrap {
  width: 100%;
  aspect-ratio: 16 / 10;
  background: #f8fafc;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.dark .security-grid-img-wrap {
  background: #090d16;
}

.security-grid-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: center;
  display: block;
  transition: transform 0.25s ease;
}

.security-grid-card:hover .security-grid-img {
  transform: scale(1.02);
}

.security-grid-caption {
  padding: 11px 16px;
  font-size: 12.5px;
  color: var(--vp-c-text-2, #64748b);
  background: var(--vp-c-bg, #ffffff);
  border-top: 1px solid var(--vp-c-divider, rgba(15, 23, 42, 0.05));
  margin-top: auto;
}

.dark .security-grid-caption {
  background: var(--vp-c-bg-soft, #131b2e);
}

.security-grid-caption code {
  font-size: 11.5px;
  padding: 2px 5px;
  border-radius: 4px;
  background: rgba(5, 150, 105, 0.08);
  color: #047857;
}

.dark .security-grid-caption code {
  background: rgba(16, 185, 129, 0.12);
  color: #34d399;
}
</style>
