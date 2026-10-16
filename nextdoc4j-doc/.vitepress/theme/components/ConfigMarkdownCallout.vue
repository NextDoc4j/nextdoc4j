<script setup lang="ts">
</script>

<template>
  <div class="callout-box-card">
    <div class="callout-header">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 8v4M12 16h.01"/>
      </svg>
      <span>Markdown 图片路径引用规范与避坑说明</span>
    </div>
    <div class="callout-desc">
      在 Markdown 中插入图片时，推荐使用<strong>相对静态资源根路径</strong>（如 <code>/img/flow.png</code>，对应 Spring Boot 后端 <code>src/main/resources/static/img/flow.png</code>）或<strong>完整网络图片 URL</strong>。请确保 Spring Boot 静态资源映射规则正确放行，避免 404 无法正常渲染。
    </div>
  </div>
</template>

<style scoped>
.callout-box-card {
  background: linear-gradient(135deg, rgba(2, 132, 199, 0.08) 0%, rgba(5, 150, 105, 0.05) 100%);
  border: 1.5px solid rgba(2, 132, 199, 0.22);
  border-left: 5px solid #0284c7;
  border-radius: 12px;
  padding: 16px 20px;
  margin: 16px 0 24px;
}

.callout-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 750;
  color: var(--vp-c-text-1, #0f172a);
  margin-bottom: 6px;
}

.callout-desc {
  font-size: 13.5px;
  color: var(--vp-c-text-2, #334155);
  line-height: 1.65;
  overflow-wrap: anywhere;
}
.callout-desc code {
  font-family: var(--vp-font-family-mono, monospace);
  font-size: 12.5px;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.04);
  color: #059669;
  overflow-wrap: anywhere;
  word-break: break-word;
}
:root.dark .callout-desc code {
  background: rgba(255, 255, 255, 0.08);
  color: #34d399;
}
</style>
