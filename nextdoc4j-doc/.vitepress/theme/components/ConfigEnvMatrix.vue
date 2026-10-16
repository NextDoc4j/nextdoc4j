<script setup lang="ts">
const envs = [
  {
    type: "dev",
    badge: "DEV 环境",
    title: "本地与开发环境",
    desc: "开启跨域与文档总开关，关闭生产模式，享受全部在线调试与交互能力。",
    snippet: `nextdoc4j:
  enabled: true
  cors: true
  production: false`
  },
  {
    type: "test",
    badge: "TEST 环境",
    title: "测试与预发环境",
    desc: "开启文档供 QA 与前端联调验证，关闭跨域支持，保持规范网络链路。",
    snippet: `nextdoc4j:
  enabled: true
  cors: false
  production: false`
  },
  {
    type: "prod",
    badge: "PROD 环境",
    title: "正式生产环境",
    desc: "开启 production 安全隐身模式，阻断外网探针对接口元数据的刺探。",
    snippet: `nextdoc4j:
  enabled: true
  cors: false
  production: true`
  }
];
</script>

<template>
  <div class="env-matrix-grid">
    <div v-for="env in envs" :key="env.type" class="env-card" :class="env.type">
      <div class="env-card-top">
        <span class="env-card-badge">{{ env.badge }}</span>
        <h4 class="env-card-title">{{ env.title }}</h4>
        <p class="env-card-desc">{{ env.desc }}</p>
      </div>
      <div class="env-config-snippet">
        <pre><code>{{ env.snippet }}</code></pre>
      </div>
    </div>
  </div>
</template>

<style scoped>
.env-matrix-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin: 18px 0 24px;
}
@media (max-width: 860px) {
  .env-matrix-grid {
    grid-template-columns: 1fr;
  }
}

.env-card {
  background: var(--vp-c-bg, #ffffff);
  border: 1px solid var(--vp-c-divider, rgba(15, 23, 42, 0.08));
  border-radius: 14px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  transition: all 0.2s ease;
}
.env-card.prod {
  border-color: rgba(225, 29, 72, 0.3);
  background: linear-gradient(180deg, rgba(225, 29, 72, 0.03) 0%, var(--vp-c-bg, #ffffff) 100%);
}
.env-card:hover {
  box-shadow: 0 10px 24px -10px rgba(15, 23, 42, 0.08);
  transform: translateY(-2px);
}

.env-card-badge {
  display: inline-block;
  font-size: 11px;
  font-weight: 750;
  padding: 2px 8px;
  border-radius: 9999px;
  margin-bottom: 10px;
  font-family: var(--vp-font-family-mono, monospace);
}
.env-card.dev .env-card-badge { background: rgba(5, 150, 105, 0.1); color: #059669; }
.env-card.test .env-card-badge { background: rgba(2, 132, 199, 0.1); color: #0284c7; }
.env-card.prod .env-card-badge { background: rgba(225, 29, 72, 0.1); color: #e11d48; }

.env-card-title {
  font-size: 15px;
  font-weight: 800;
  color: var(--vp-c-text-1, #0f172a);
  margin: 0 0 6px;
}

.env-card-desc {
  font-size: 13px;
  color: var(--vp-c-text-2, #64748b);
  line-height: 1.6;
  margin-bottom: 14px;
}

.env-config-snippet {
  font-family: var(--vp-font-family-mono, monospace);
  font-size: 12px;
  background: var(--vp-c-bg-soft, #f1f5f9);
  padding: 10px 12px;
  border-radius: 8px;
  color: var(--vp-c-text-1, #1e293b);
  line-height: 1.5;
}
.env-config-snippet pre {
  margin: 0;
  padding: 0;
  background: transparent;
}
.env-config-snippet code {
  font-family: inherit;
  font-size: inherit;
  color: inherit;
  background: transparent;
  padding: 0;
}
</style>
