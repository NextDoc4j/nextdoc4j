<script setup lang="ts">
const params = [
  {
    name: "nextdoc4j.enabled",
    tag: "核心总控",
    desc: "控制 NextDoc4j 增强文档的全局装配。设为 false 时，Spring 容器不会初始化任何 NextDoc4j 相关的 Controller、Filter 与静态资源映射器，实现零开销。",
    tags: ["开发环境: true", "测试环境: true"]
  },
  {
    name: "nextdoc4j.doc-path",
    tag: "1.4.0 新增",
    desc: "支持将默认访问入口 /doc.html 自定义为团队专属别名（如 /docs 或 /api-docs）。系统在启动期会对路径进行严格校验，若路径不合法会触发 Fail-Fast 阻断，避免上线后访问异常。",
    tags: ["单段路径推荐", "需同步鉴权白名单"]
  },
  {
    name: "nextdoc4j.cors",
    tag: "联调增强",
    desc: "一键开启内置的 CORS 跨域过滤器。当前后端分离独立部署或开发人员在本地跨域调用 API 接口时，无需额外手写全局 CORS WebMvcConfigurer。",
    tags: ["本地联调利器", "生产建议设 false"]
  },
  {
    name: "nextdoc4j.production",
    tag: "安全隐身",
    desc: "生产环境物理级安全隐身开关。设为 true 时，不仅 NextDoc4j UI 入口彻底关闭，还会深度拦截下线 SpringDoc 的 /v3/api-docs 原始元数据暴露，杜绝接口资产外泄。",
    tags: ["生产环境: true", "阻断外网探针"]
  }
];
</script>

<template>
  <div class="param-deep-grid">
    <div v-for="item in params" :key="item.name" class="param-card">
      <div class="param-card-header">
        <span class="param-name">{{ item.name }}</span>
        <span class="param-badge">{{ item.tag }}</span>
      </div>
      <p class="param-desc">{{ item.desc }}</p>
      <div class="param-tags">
        <span v-for="t in item.tags" :key="t" class="param-tag-item">{{ t }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.param-deep-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin: 18px 0 24px;
}
@media (max-width: 768px) {
  .param-deep-grid {
    grid-template-columns: 1fr;
  }
}

.param-card {
  background: var(--vp-c-bg, #ffffff);
  border: 1px solid var(--vp-c-divider, rgba(15, 23, 42, 0.08));
  border-radius: 12px;
  padding: 18px 20px;
  transition: all 0.2s ease;
}
.param-card:hover {
  border-color: rgba(5, 150, 105, 0.35);
  box-shadow: 0 10px 24px -8px rgba(5, 150, 105, 0.12);
  transform: translateY(-2px);
}

.param-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.param-name {
  font-family: var(--vp-font-family-mono, monospace);
  font-size: 14px;
  font-weight: 750;
  color: var(--vp-c-text-1, #0f172a);
}

.param-badge {
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 9999px;
  background: rgba(5, 150, 105, 0.1);
  color: #059669;
}

.param-desc {
  font-size: 13.5px;
  color: var(--vp-c-text-2, #64748b);
  line-height: 1.65;
  margin-bottom: 12px;
}

.param-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.param-tag-item {
  font-size: 11.5px;
  padding: 2px 8px;
  border-radius: 4px;
  background: var(--vp-c-bg-soft, #f1f5f9);
  color: var(--vp-c-text-2, #64748b);
}

:root.dark .param-badge {
  background: rgba(16, 185, 129, 0.15);
  color: #34d399;
}
</style>
