<template>
  <div class="spec-tabs-card">
    <div class="spec-tabs-header">
      <button
        class="spec-tab-btn"
        :class="{ active: activeTab === 0 }"
        @click="activeTab = 0"
      >
        后端 Java 开发规范
      </button>
      <button
        class="spec-tab-btn"
        :class="{ active: activeTab === 1 }"
        @click="activeTab = 1"
      >
        前端 Vue 3 规范
      </button>
      <button
        class="spec-tab-btn"
        :class="{ active: activeTab === 2 }"
        @click="activeTab = 2"
      >
        Commit 提交信息规范
      </button>
    </div>

    <!-- Tab 1: 后端规范 -->
    <div v-show="activeTab === 0" class="spec-tab-pane">
      <ul class="spec-list">
        <li><strong>JDK 基线要求</strong>：核心代码需同时兼容 JDK 17 及更高 LTS 版本（JDK 21+）。</li>
        <li><strong>代码风格标准</strong>：严格遵循阿里巴巴《Java开发手册》，变量及方法命名清晰无歧义。</li>
        <li><strong>自动格式化校验</strong>：项目配置了 Spotless 插件，提交前务必在根目录执行 <code>mvn compile</code> 修正格式与缩进。</li>
        <li><strong>文档与注释</strong>：所有公共 API（<code>public</code> 方法及接口）必须提供完善的 JavaDoc 注释与参数示例。</li>
      </ul>
    </div>

    <!-- Tab 2: 前端规范 -->
    <div v-show="activeTab === 1" class="spec-tab-pane">
      <ul class="spec-list">
        <li><strong>技术栈体系</strong>：基于 Vue 3 + TypeScript + Tailwind CSS 构建，全面拥抱 Composition API。</li>
        <li><strong>组件命名规范</strong>：单文件组件名采用 PascalCase（如 <code>PluginAuthCards.vue</code>），文件名遵循语义化。</li>
        <li><strong>静态检查与格式化</strong>：提交代码前执行 <code>npm run lint:fix</code> 与 <code>npm run format</code> 消除告警。</li>
        <li><strong>深浅双模主题</strong>：所有新组件与页面必须提供完善的 Dark Theme 适配与高对比度支持。</li>
      </ul>
    </div>

    <!-- Tab 3: Commit 规范 -->
    <div v-show="activeTab === 2" class="spec-tab-pane">
      <p class="commit-lead">请遵循 Angular Conventional Commits 标准格式 <code>&lt;type&gt;(&lt;scope&gt;): &lt;subject&gt;</code>：</p>
      <ul class="spec-list">
        <li><code>feat:</code> 新增接口调试、网关聚合或插件特性</li>
        <li><code>fix:</code> 修复注解解析、UI 渲染或路由路径推导 Bug</li>
        <li><code>docs:</code> 完善指南、新增配置示例或修正文字说明</li>
        <li><code>refactor:</code> 代码重构与架构解耦（不影响原有对外行为）</li>
        <li><code>test:</code> 新增单元测试用例或提升测试覆盖率</li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const activeTab = ref(0)
</script>

<style scoped>
.spec-tabs-card {
  border: 1px solid var(--vp-c-divider, rgba(15, 23, 42, 0.08));
  border-radius: 12px;
  overflow: hidden;
  margin: 20px 0 28px;
  background: var(--vp-c-bg, #ffffff);
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
}

.dark .spec-tabs-card {
  background: var(--vp-c-bg-soft, #131b2e);
}

.spec-tabs-header {
  display: flex;
  align-items: center;
  gap: 4px;
  min-height: 42px;
  padding: 0 8px;
  background: var(--vp-c-bg-soft, #f8fafc);
  border-bottom: 1px solid var(--vp-c-divider, rgba(15, 23, 42, 0.08));
  overflow-x: auto;
  scrollbar-width: none;
}

.dark .spec-tabs-header {
  background: #111827;
  border-color: rgba(255, 255, 255, 0.08);
}

.spec-tabs-header::-webkit-scrollbar {
  display: none;
}

.spec-tab-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  height: 28px;
  padding: 0 12px;
  color: var(--vp-c-text-2, #64748b);
  font-size: 12px;
  font-weight: 550;
  line-height: 28px;
  border: none;
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
  margin: 0;
}

.spec-tab-btn:hover {
  color: var(--vp-c-text-1, #0f172a);
  background: rgba(0, 0, 0, 0.04);
}

.dark .spec-tab-btn:hover {
  color: #f8fafc;
  background: rgba(255, 255, 255, 0.05);
}

.spec-tab-btn.active {
  color: #059669;
  background: var(--vp-c-bg, #ffffff);
  font-weight: 700;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

.dark .spec-tab-btn.active {
  color: #34d399;
  background: rgba(16, 185, 129, 0.16);
}

.spec-tab-pane {
  padding: 20px 22px;
}

.commit-lead {
  font-size: 13px;
  color: var(--vp-c-text-2, #475569);
  margin-bottom: 12px;
}

.spec-list {
  list-style: none;
  padding-left: 14px;
  margin: 0;
}

.spec-list li {
  position: relative;
  font-size: 13px;
  color: var(--vp-c-text-2, #475569);
  line-height: 1.7;
  margin-bottom: 8px;
}

.spec-list li:last-child {
  margin-bottom: 0;
}

.spec-list li::before {
  content: "•";
  position: absolute;
  left: -14px;
  color: #059669;
  font-weight: 800;
}

.dark .spec-list li::before {
  color: #34d399;
}

.spec-list li strong {
  color: var(--vp-c-text-1, #0f172a);
}

.dark .spec-list li strong {
  color: #f8fafc;
}

.spec-tab-pane code {
  color: #047857;
  background-color: rgba(5, 150, 105, 0.08);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.88em;
  font-weight: 600;
}

.dark .spec-tab-pane code {
  color: #34d399;
  background-color: rgba(16, 185, 129, 0.14);
}
</style>
