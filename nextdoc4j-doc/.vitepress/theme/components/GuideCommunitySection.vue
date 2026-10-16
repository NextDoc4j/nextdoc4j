<script setup lang="ts">
import { withBase } from "vitepress";
</script>

<template>
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
</template>

<style scoped>
.community-showcase-shell {
  margin: 16px 0 28px;
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
  gap: 8px;
  flex-wrap: nowrap;
}

.platform-identity {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex-shrink: 0;
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
  white-space: nowrap;
}

.platform-role-tag {
  font-size: 11px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 9999px;
  background: var(--vp-c-bg-soft, #edf2f7);
  color: var(--vp-c-text-2, #64748b);
  font-family: var(--vp-font-family-mono, monospace);
  white-space: nowrap !important;
  flex-shrink: 0 !important;
  display: inline-block;
  line-height: 1.4;
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
  white-space: nowrap;
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
  white-space: nowrap;
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

@media (max-width: 640px) {
  .community-chat-banner {
    align-items: stretch;
    padding: 16px;
  }

  .chat-banner-left,
  .chat-banner-actions {
    width: 100%;
    min-width: 0;
  }

  .chat-banner-left {
    align-items: flex-start;
  }

  .chat-banner-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .chat-btn-item {
    width: 100%;
    justify-content: center;
  }
}
</style>
