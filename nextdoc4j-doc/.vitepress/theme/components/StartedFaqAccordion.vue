<script setup lang="ts">
import { ref } from "vue";

const openStates = ref<Record<number, boolean>>({
  0: true,
  1: false,
  2: false,
});

function toggleFaq(index: number) {
  openStates.value[index] = !openStates.value[index];
}
</script>

<template>
  <div class="faq-list-grid">
    <!-- FAQ 1 -->
    <div class="faq-card-item" :class="{ open: openStates[0] }">
      <button class="faq-question-btn" type="button" @click="toggleFaq(0)">
        <span class="faq-q-indicator">Q1</span>
        <span class="faq-q-text">Spring Security 或 Sa-Token 拦截了文档静态资源导致无法打开？</span>
        <svg class="faq-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/>
        </svg>
      </button>
      <div v-show="openStates[0]" class="faq-answer-body">
        <p>请在您的安全框架白名单中放行以下路径（允许匿名访问）：</p>
        <p><code>/doc.html</code>、<code>/webjars/**</code>、<code>/v3/api-docs/**</code>、<code>/swagger-resources/**</code>、<code>/favicon.ico</code>。</p>
      </div>
    </div>

    <!-- FAQ 2 -->
    <div class="faq-card-item" :class="{ open: openStates[1] }">
      <button class="faq-question-btn" type="button" @click="toggleFaq(1)">
        <span class="faq-q-indicator">Q2</span>
        <span class="faq-q-text">访问 /doc.html 返回 404 Not Found？</span>
        <svg class="faq-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/>
        </svg>
      </button>
      <div v-show="openStates[1]" class="faq-answer-body">
        <p>1. 请检查 <code>nextdoc4j.enabled=true</code> 是否已正确写入配置文件。</p>
        <p>2. 请检查是否引入了匹配 Web 栈的 <code>springdoc-openapi-starter-webmvc-ui</code> 或 <code>springdoc-openapi-starter-webflux-ui</code>。</p>
        <p>3. 若配置了 <code>server.servlet.context-path</code>，访问地址需带上前缀，例如：<code>http://localhost:8080/context-path/doc.html</code>。</p>
      </div>
    </div>

    <!-- FAQ 3 -->
    <div class="faq-card-item" :class="{ open: openStates[2] }">
      <button class="faq-question-btn" type="button" @click="toggleFaq(2)">
        <span class="faq-q-indicator">Q3</span>
        <span class="faq-q-text">从 1.3.x 版本升级到 1.4.x 的注意事项？</span>
        <svg class="faq-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/>
        </svg>
      </button>
      <div v-show="openStates[2]" class="faq-answer-body">
        <p>旧坐标 <code>nextdoc4j-springboot3-starter</code> 与 <code>nextdoc4j-springboot4-starter</code> 已统一合并为 <code>nextdoc4j-spring-boot-starter</code>。</p>
        <p>升级后请将 artifactId 统一替换，并确保自行引入 springdoc UI 即可平滑升级。</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.faq-list-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 16px 0 28px;
}

.faq-card-item {
  background: var(--vp-c-bg, #ffffff);
  border: 1px solid var(--vp-c-divider, rgba(15, 23, 42, 0.08));
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.2s ease;
}

:root.dark .faq-card-item {
  background: #111827;
  border-color: rgba(255, 255, 255, 0.08);
}

.faq-card-item:hover {
  border-color: var(--vp-c-brand-1, #059669);
  box-shadow: 0 10px 30px -10px rgba(15, 23, 42, 0.05);
}

.faq-question-btn {
  width: 100%;
  padding: 16px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  text-align: left;
  font-size: 14.5px;
  font-weight: 700;
  color: var(--vp-c-text-1, #0f172a);
  background: transparent;
  border: none;
  cursor: pointer;
}

.faq-q-indicator {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  background: rgba(5, 150, 105, 0.08);
  color: var(--vp-c-brand-1, #059669);
  display: grid;
  place-items: center;
  font-size: 11px;
  font-weight: 800;
  flex-shrink: 0;
}

:root.dark .faq-q-indicator {
  background: rgba(16, 185, 129, 0.12);
  color: #34d399;
}

.faq-q-text {
  flex-grow: 1;
}

.faq-chevron {
  color: var(--vp-c-text-3, #94a3b8);
  transition: transform 0.2s ease;
}

.faq-card-item.open .faq-chevron {
  transform: rotate(180deg);
  color: var(--vp-c-brand-1, #059669);
}

.faq-answer-body {
  padding: 0 20px 18px 56px;
  font-size: 13.5px;
  color: var(--vp-c-text-2, #475569);
  line-height: 1.65;
}

.faq-answer-body p {
  margin-bottom: 8px !important;
}

.faq-answer-body p:last-child {
  margin-bottom: 0 !important;
}

.faq-answer-body code {
  font-family: var(--vp-font-family-mono, monospace);
  font-size: 12px;
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--vp-c-bg-soft, #f1f5f9);
  color: var(--vp-c-brand-1, #059669);
  font-weight: 600;
}
</style>
