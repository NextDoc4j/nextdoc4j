<template>
  <div class="arch-stack-grid">
    <!-- Front-end -->
    <div class="arch-stack-card">
      <h4 class="arch-card-h">前端工作台架构</h4>
      <ul class="arch-stack-items">
        <li><span>核心框架</span><strong>Vue 3.5</strong></li>
        <li><span>构建工具</span><strong>Vite 6</strong></li>
        <li><span>类型体系</span><strong>TypeScript 5.8</strong></li>
        <li><span>UI 组件库</span><strong>Element Plus 2.10</strong></li>
        <li><span>状态管理</span><strong>Pinia 3</strong></li>
        <li><span>设计标准</span><strong>Vben Admin 5</strong></li>
      </ul>
    </div>

    <!-- Back-end -->
    <div class="arch-stack-card">
      <h4 class="arch-card-h">后端 Starter 架构</h4>
      <ul class="arch-stack-items">
        <li><span>运行环境</span><strong>JDK 17+</strong></li>
        <li><span>核心框架</span><strong>Spring Boot 3.4.x / 4.x</strong></li>
        <li><span>规范标准</span><strong>OpenAPI 3.1</strong></li>
        <li><span>引擎基座</span><strong>SpringDoc 2.8 / 3.x</strong></li>
        <li><span>依赖管理</span><strong>nextdoc4j-bom</strong></li>
        <li><span>分发体系</span><strong>Maven Central</strong></li>
      </ul>
    </div>

    <!-- Gateway & Ecosystem -->
    <div class="arch-stack-card">
      <h4 class="arch-card-h">网关与扩展生态</h4>
      <ul class="arch-stack-items">
        <li><span>响应式网关</span><strong>SCG WebFlux</strong></li>
        <li><span>阻塞式网关</span><strong>SCG WebMvc</strong></li>
        <li><span>权限插件</span><strong>Sa-Token 插件</strong></li>
        <li><span>枚举插件</span><strong>Enum 字典增强</strong></li>
        <li><span>安全拦截</span><strong>简单认证插件</strong></li>
        <li><span>离线归档</span><strong>MD / HTML 导出</strong></li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.arch-stack-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin: 16px 0 28px;
}

@media (max-width: 860px) {
  .arch-stack-grid {
    grid-template-columns: 1fr;
  }
}

.arch-stack-card {
  background: var(--vp-c-bg-elv, #ffffff);
  border: 1px solid var(--vp-c-divider, rgba(15, 23, 42, 0.08));
  border-radius: 16px;
  padding: 22px;
  box-shadow: 0 10px 30px -10px rgba(15, 23, 42, 0.04);
}

.arch-card-h {
  font-size: 15.5px;
  font-weight: 750;
  color: var(--vp-c-text-1, #0f172a);
  margin: 0 0 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.arch-card-h::before {
  content: "";
  width: 3px;
  height: 14px;
  border-radius: 2px;
  background: #059669;
}

.dark .arch-card-h::before {
  background: #10b981;
}

.arch-stack-items {
  list-style: none !important;
  display: flex;
  flex-direction: column;
  gap: 9px;
  margin: 0 !important;
  padding: 0 !important;
}

.arch-stack-items li {
  font-size: 13px;
  color: var(--vp-c-text-2, #475569);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 7px;
  border-bottom: 1px solid var(--vp-c-divider, rgba(15, 23, 42, 0.06));
  margin: 0 !important;
}

.arch-stack-items li:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.arch-stack-items strong {
  color: var(--vp-c-text-1, #0f172a);
  font-weight: 600;
  font-family: var(--vp-font-family-mono, monospace);
  font-size: 12.5px;
}
</style>
