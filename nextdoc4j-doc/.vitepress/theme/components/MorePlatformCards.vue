<template>
  <div class="more-platform-cards">
    <a
      href="https://gitee.com/NextDoc4j"
      target="_blank"
      rel="noopener noreferrer"
      class="platform-card platform-card-gitee"
    >
      <span class="platform-logo-box">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M11.984 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.016 0zm6.09 5.333c.328 0 .593.266.592.593v1.482a.594.594 0 0 1-.593.592H9.777c-.982 0-1.778.796-1.778 1.778v5.63c0 .327.266.592.593.592h5.63c.982 0 1.778-.796 1.778-1.778v-.296a.593.593 0 0 0-.592-.593h-4.15a.592.592 0 0 1-.592-.592v-1.482a.593.593 0 0 1 .593-.592h6.815c.327 0 .593.265.593.592v3.408a4 4 0 0 1-4 4H5.926a.593.593 0 0 1-.593-.593V9.778a4.444 4.444 0 0 1 4.445-4.444h8.296z" />
        </svg>
      </span>
      <span class="platform-copy">
        <span class="platform-name">Gitee</span>
        <span class="platform-tag">国内主仓</span>
      </span>
      <span class="platform-arrow" aria-hidden="true">↗</span>
    </a>

    <a
      href="https://github.com/NextDoc4j"
      target="_blank"
      rel="noopener noreferrer"
      class="platform-card platform-card-github"
    >
      <span class="platform-logo-box">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
        </svg>
      </span>
      <span class="platform-copy">
        <span class="platform-name">GitHub</span>
        <span class="platform-tag">全球镜像</span>
      </span>
      <span class="platform-arrow" aria-hidden="true">↗</span>
    </a>

    <a
      href="https://gitcode.com/NextDoc4j"
      target="_blank"
      rel="noopener noreferrer"
      class="platform-card platform-card-gitcode"
    >
      <span class="platform-logo-box">
        <img src="/logo/gitcode.png" alt="" width="22" height="22" />
      </span>
      <span class="platform-copy">
        <span class="platform-name">GitCode</span>
        <span class="platform-tag">CSDN 社区</span>
      </span>
      <span class="platform-arrow" aria-hidden="true">↗</span>
    </a>
  </div>
</template>

<style scoped>
.more-platform-cards {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin: 18px 0 30px;
}

.platform-card {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  padding: 16px;
  color: inherit;
  text-decoration: none;
  background: var(--vp-c-bg, #ffffff);
  border: 1px solid var(--vp-c-divider, rgba(15, 23, 42, 0.08));
  border-radius: 12px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}

.platform-card:hover {
  border-color: var(--vp-c-brand-1, #059669);
  box-shadow: 0 8px 20px -8px rgba(5, 150, 105, 0.22);
  transform: translateY(-2px);
}

.dark .platform-card {
  background: var(--vp-c-bg-soft, #131b2e);
}

.platform-logo-box {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  flex: 0 0 42px;
  color: #24292f;
  background: var(--vp-c-bg-mute, #f1f5f9);
  border-radius: 10px;
}

.platform-logo-box img {
  display: block;
}

.platform-card-gitee .platform-logo-box {
  color: #c71d23;
}

.platform-card-gitcode .platform-logo-box {
  color: #059669;
}

.dark .platform-logo-box {
  background: #1e293b;
}

.dark .platform-card-github .platform-logo-box {
  color: #f8fafc;
  background: rgba(255, 255, 255, 0.1);
}

.platform-copy {
  display: flex;
  flex: 1 1 auto;
  min-width: max-content;
  flex-direction: column;
  gap: 2px;
}

.platform-name {
  display: block;
  overflow: hidden;
  color: var(--vp-c-text-1, #0f172a);
  font-size: 14px;
  font-weight: 750;
  line-height: 1.4;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.platform-tag {
  display: block;
  overflow: hidden;
  color: var(--vp-c-text-2, #475569);
  font-size: 12px;
  line-height: 1.4;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.platform-arrow {
  align-self: flex-start;
  flex: 0 0 auto;
  color: var(--vp-c-brand-1, #059669);
  font-size: 14px;
  line-height: 1;
  transition: transform 0.2s ease;
}

.platform-card:hover .platform-arrow {
  transform: translate(2px, -2px);
}

@media (max-width: 640px) {
  .more-platform-cards {
    grid-template-columns: 1fr;
  }
}

@media (min-width: 641px) and (max-width: 860px) {
  .more-platform-cards {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
