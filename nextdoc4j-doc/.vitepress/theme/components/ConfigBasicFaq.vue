<script setup lang="ts">
import { ref } from "vue";

const faqs = ref([
  {
    q: "配置了 context-path 后如何正确访问自定义 doc-path？",
    a: "若 Spring Boot 配置了 server.servlet.context-path: /api 且 nextdoc4j.doc-path: /docs，则实际文档访问地址为 http://localhost:8080/api/docs。",
    open: true
  },
  {
    q: "生产模式设为 true 后，访问 /doc.html 会发生什么？",
    a: "所有文档页面、静态 webjars 及 OpenAPI 数据接口均直接返回 404 Not Found，服务如同没有引入任何文档组件一样干净与安全。",
    open: false
  }
]);

function toggleFaq(index: number) {
  faqs.value[index].open = !faqs.value[index].open;
}
</script>

<template>
  <div class="faq-list-grid">
    <div
      v-for="(item, idx) in faqs"
      :key="idx"
      class="faq-card-item"
      :class="{ open: item.open }"
    >
      <button class="faq-question-btn" type="button" @click="toggleFaq(idx)">
        <span class="faq-q-indicator">Q{{ idx + 1 }}</span>
        <span class="faq-q-text">{{ item.q }}</span>
        <svg class="faq-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/>
        </svg>
      </button>
      <div v-show="item.open" class="faq-answer-body">
        <p>{{ item.a }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.faq-list-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 18px 0 24px;
}

.faq-card-item {
  background: var(--vp-c-bg, #ffffff);
  border: 1px solid var(--vp-c-divider, rgba(15, 23, 42, 0.08));
  border-radius: 10px;
  overflow: hidden;
  transition: all 0.2s ease;
}
.faq-card-item:hover {
  border-color: #059669;
}

.faq-question-btn {
  width: 100%;
  padding: 14px 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  text-align: left;
  font-size: 14px;
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
  background: rgba(5, 150, 105, 0.1);
  color: #059669;
  display: grid;
  place-items: center;
  font-size: 11px;
  font-weight: 800;
  flex-shrink: 0;
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
  color: #059669;
}

.faq-answer-body {
  padding: 0 18px 14px 54px;
  font-size: 13.5px;
  color: var(--vp-c-text-2, #64748b);
  line-height: 1.65;
}
.faq-answer-body p {
  margin: 0;
}
</style>
