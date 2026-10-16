<template>
  <div class="prominent-notice-card" id="section-notice">
    <div class="notice-header-row">
      <span class="notice-badge-tag">重要架构统一说明</span>
      <h3 class="notice-card-title">1.4.0 起单套 Starter 统一坐标</h3>
    </div>
    <p class="notice-card-desc">
      NextDoc4j 正式合并为单套 Starter 坐标 <code class="prominent-code">nextdoc4j-spring-boot-starter</code>，同时适配 <strong>Spring Boot 3.4.x</strong> 与 <strong>Spring Boot 4.x</strong>（单体 WebMvc / WebFlux 与微服务网关共用）。无需再区分 <del class="del-code">springboot3</del> 或 <del class="del-code">springboot4</del> 后缀，大幅降低依赖维护复杂度。
    </p>
  </div>
</template>

<style scoped>
.prominent-notice-card {
  margin: 20px 0 32px;
  border-radius: 14px;
  padding: 20px 24px;
  background: linear-gradient(135deg, rgba(5, 150, 105, 0.09) 0%, rgba(14, 165, 233, 0.06) 100%);
  border: 1.5px solid rgba(5, 150, 105, 0.26);
  border-left: 5px solid var(--vp-c-brand-1, #059669);
  box-shadow: 0 10px 30px -10px rgba(5, 150, 105, 0.1);
  position: relative;
}

:root.dark .prominent-notice-card {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.14) 0%, rgba(14, 165, 233, 0.08) 100%);
  border-color: rgba(16, 185, 129, 0.35);
  border-left: 5px solid #10b981;
  box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.4);
}

.notice-header-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.notice-badge-tag {
  font-size: 11px;
  font-weight: 750;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  padding: 2px 8px;
  border-radius: 9999px;
  background: var(--vp-c-brand-1, #059669);
  color: #ffffff;
  font-family: var(--vp-font-family-mono, monospace);
}

.notice-card-title {
  font-size: 15.5px;
  font-weight: 800;
  color: var(--vp-c-text-1, #0f172a);
  letter-spacing: -0.01em;
  margin: 0;
}

.notice-card-desc {
  font-size: 13.5px;
  color: var(--vp-c-text-2, #475569);
  line-height: 1.7;
  margin: 0;
}

.prominent-code {
  font-family: var(--vp-font-family-mono, monospace);
  font-weight: 700;
  font-size: 12.5px;
  padding: 2px 7px;
  border-radius: 5px;
  background: var(--vp-c-bg, #ffffff);
  color: var(--vp-c-brand-1, #059669);
  border: 1px solid rgba(5, 150, 105, 0.25);
}

.del-code {
  font-family: var(--vp-font-family-mono, monospace);
  font-size: 12px;
  color: #e11d48;
  background: rgba(225, 29, 72, 0.08);
  padding: 1px 5px;
  border-radius: 4px;
  text-decoration: line-through;
}
</style>
