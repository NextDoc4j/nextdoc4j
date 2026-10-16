<script setup lang="ts">
const steps = [
  {
    num: "1",
    title: "密码加载/生成",
    desc: "Spring Boot 启动时加载静态配置密码或自动生成高强度的 UUID 临时凭据。"
  },
  {
    num: "2",
    title: "访问自动拦截",
    desc: "未登录用户访问 /doc.html 时自动重定向并渲染极简登录弹窗卡片。"
  },
  {
    num: "3",
    title: "会话 Token 校验",
    desc: "输入正确密码后，浏览器签发安全 SessionStorage 令牌，免密畅享在线调试。"
  },
  {
    num: "4",
    title: "重启主动失效",
    desc: "动态密码随应用重启自动刷新，确保临时授权不会无限期长期滞留。"
  }
];
</script>

<template>
  <div class="auth-flow-grid">
    <div v-for="st in steps" :key="st.num" class="auth-step-card">
      <span class="auth-step-num">{{ st.num }}</span>
      <h5 class="auth-step-title">{{ st.title }}</h5>
      <p class="auth-step-desc">{{ st.desc }}</p>
    </div>
  </div>
</template>

<style scoped>
.auth-flow-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin: 18px 0 24px;
}
@media (max-width: 860px) {
  .auth-flow-grid {
    grid-template-columns: 1fr 1fr;
  }
}
@media (max-width: 540px) {
  .auth-flow-grid {
    grid-template-columns: 1fr;
  }
}

.auth-step-card {
  background: var(--vp-c-bg, #ffffff);
  border: 1px solid var(--vp-c-divider, rgba(15, 23, 42, 0.08));
  border-radius: 12px;
  padding: 16px;
  transition: all 0.2s ease;
}
.auth-step-card:hover {
  border-color: rgba(5, 150, 105, 0.35);
  box-shadow: 0 10px 24px -10px rgba(5, 150, 105, 0.12);
  transform: translateY(-2px);
}

.auth-step-num {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  background: rgba(5, 150, 105, 0.1);
  color: #059669;
  display: grid;
  place-items: center;
  font-size: 11px;
  font-weight: 800;
  font-family: var(--vp-font-family-mono, monospace);
  margin-bottom: 8px;
}

.auth-step-title {
  font-size: 13.5px;
  font-weight: 750;
  color: var(--vp-c-text-1, #0f172a);
  margin: 0 0 4px;
}

.auth-step-desc {
  font-size: 12px;
  color: var(--vp-c-text-2, #64748b);
  line-height: 1.55;
  margin: 0;
}
</style>
