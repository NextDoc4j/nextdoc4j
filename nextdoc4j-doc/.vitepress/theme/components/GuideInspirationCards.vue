<template>
  <div class="inspiration-grid">
    <!-- Inspiration 1: Knife4j -->
    <div class="inspiration-card">
      <div class="inspiration-card-header">
        <div class="inspiration-icon-box">K</div>
        <div class="inspiration-card-title">灵感源泉：Knife4j</div>
      </div>
      <p class="inspiration-card-desc">
        深受 <strong>Knife4j</strong> 开源项目的启发。在长期使用中我们深刻体会到优秀文档工具对于研发效能的重要性，并在 OpenAPI 3 与现代 Web 潮流下进一步追求更极致的界面设计与交互体验。
      </p>
    </div>

    <!-- Inspiration 2: Vben Admin -->
    <div class="inspiration-card">
      <div class="inspiration-card-header">
        <div class="inspiration-icon-box vben">V</div>
        <div class="inspiration-card-title">视觉规范：Vben Admin 5</div>
      </div>
      <p class="inspiration-card-desc">
        前端基于业界广受好评的 <strong>Vben Admin 5</strong> 企业级框架设计规范构建，采用 Vue 3.5、TypeScript 5.8 与 Vite 6，提供专业的组件体系、主题配置以及极佳的响应式浏览体验。
      </p>
    </div>
  </div>
</template>

<style scoped>
.inspiration-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
  margin: 16px 0 28px;
}

@media (max-width: 640px) {
  .inspiration-grid {
    grid-template-columns: 1fr;
  }
}

.inspiration-card {
  background: var(--vp-c-bg-elv, #ffffff);
  border: 1px solid var(--vp-c-divider, rgba(15, 23, 42, 0.08));
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 10px 30px -10px rgba(15, 23, 42, 0.04);
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

.inspiration-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 14px 36px -10px rgba(15, 23, 42, 0.08);
  border-color: rgba(5, 150, 105, 0.25);
}

.dark .inspiration-card:hover {
  border-color: rgba(16, 185, 129, 0.3);
}

.inspiration-card-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.inspiration-icon-box {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: rgba(5, 150, 105, 0.08);
  color: #059669;
  display: grid;
  place-items: center;
  font-weight: 800;
  font-size: 14px;
}

.inspiration-icon-box.vben {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}

.dark .inspiration-icon-box {
  background: rgba(16, 185, 129, 0.12);
  color: #10b981;
}

.dark .inspiration-icon-box.vben {
  background: rgba(59, 130, 246, 0.16);
  color: #60a5fa;
}

.inspiration-card-title {
  font-size: 15px;
  font-weight: 750;
  color: var(--vp-c-text-1, #0f172a);
}

.inspiration-card-desc {
  font-size: 13px;
  color: var(--vp-c-text-2, #475569);
  line-height: 1.6;
  margin: 0;
}
</style>
