<script setup lang="ts">
import { ref } from "vue";

const isCopied = ref(false);

function copyUrl() {
  navigator.clipboard.writeText("http://localhost:8080/doc.html").then(() => {
    isCopied.value = true;
    setTimeout(() => {
      isCopied.value = false;
    }, 1800);
  });
}
</script>

<template>
  <div class="launch-url-clean-card">
    <div class="launch-url-icon">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
      </svg>
    </div>
    <div class="launch-url-info">
      <div class="launch-url-badge-row">
        <button
          type="button"
          class="launch-url-target"
          :class="{ copied: isCopied }"
          title="点击一键复制"
          @click="copyUrl"
        >
          <span>http://localhost:8080/doc.html</span>
          <svg v-if="!isCopied" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
          </svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="check-icon">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </button>
      </div>
      <div class="launch-url-subtext">
        默认端口为 8080，点击上方链接可直接复制。若配置了 <code>nextdoc4j.doc-path</code> 请使用对应的自定义路径。
      </div>
    </div>
  </div>
</template>

<style scoped>
.launch-url-clean-card {
  background: var(--vp-c-bg, #ffffff);
  border: 1px solid var(--vp-c-divider, rgba(15, 23, 42, 0.08));
  border-radius: 14px;
  padding: 20px 24px;
  margin: 16px 0 28px;
  box-shadow: 0 14px 36px -10px rgba(15, 23, 42, 0.06);
  display: flex;
  align-items: center;
  gap: 16px;
}

:root.dark .launch-url-clean-card {
  background: #111827;
  border-color: rgba(255, 255, 255, 0.08);
  box-shadow: 0 14px 36px -10px rgba(0, 0, 0, 0.5);
}

.launch-url-icon {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  background: rgba(5, 150, 105, 0.08);
  color: var(--vp-c-brand-1, #059669);
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

:root.dark .launch-url-icon {
  background: rgba(16, 185, 129, 0.12);
  color: #10b981;
}

.launch-url-icon svg {
  width: 22px;
  height: 22px;
}

.launch-url-info {
  flex: 1;
  min-width: 0;
}

.launch-url-badge-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.launch-url-target {
  font-family: var(--vp-font-family-mono, monospace);
  font-size: 15px;
  font-weight: 750;
  color: var(--vp-c-brand-1, #059669);
  letter-spacing: -0.01em;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 10px;
  border-radius: 6px;
  background: rgba(5, 150, 105, 0.08);
  border: 1px solid rgba(5, 150, 105, 0.15);
  transition: all 0.16s ease;
}

:root.dark .launch-url-target {
  color: #34d399;
  background: rgba(16, 185, 129, 0.12);
  border-color: rgba(16, 185, 129, 0.25);
}

.launch-url-target:hover {
  background: rgba(5, 150, 105, 0.14);
  transform: translateY(-1px);
}

.launch-url-target svg {
  width: 13px;
  height: 13px;
}

.launch-url-target .check-icon {
  color: #10b981;
}

.launch-url-subtext {
  font-size: 13px;
  color: var(--vp-c-text-2, #64748b);
  line-height: 1.5;
}

.launch-url-subtext code {
  font-family: var(--vp-font-family-mono, monospace);
  font-size: 12px;
  padding: 1px 5px;
  border-radius: 4px;
  background: var(--vp-c-bg-soft, #f1f5f9);
  color: var(--vp-c-brand-1, #059669);
  font-weight: 600;
}

@media (max-width: 640px) {
  .launch-url-clean-card {
    align-items: flex-start;
    gap: 12px;
    padding: 16px;
  }

  .launch-url-badge-row,
  .launch-url-target {
    min-width: 0;
    max-width: 100%;
  }

  .launch-url-target {
    font-size: 12px;
  }

  .launch-url-target span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
</style>
