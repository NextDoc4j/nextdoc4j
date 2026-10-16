<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";

const currentTab = ref("tab-webmvc-boot3");
const isCopied = ref(false);
const tabsContainerRef = ref<HTMLElement | null>(null);
const canScrollLeft = ref(false);
const canScrollRight = ref(false);

const tabs = [
  { id: "tab-webmvc-boot3", label: "WebMvc (Boot 3.4.x)" },
  { id: "tab-webflux-boot3", label: "WebFlux (Boot 3.4.x)" },
  { id: "tab-webmvc-boot4", label: "WebMvc (Boot 4.x)" },
  { id: "tab-webflux-boot4", label: "WebFlux (Boot 4.x)" },
  { id: "tab-bom", label: "BOM 统一管理" },
];

function updateScrollState() {
  const el = tabsContainerRef.value;
  if (!el) return;
  canScrollLeft.value = el.scrollLeft > 4;
  canScrollRight.value = el.scrollLeft < (el.scrollWidth - el.clientWidth - 4);
}

function selectTab(id: string, event?: MouseEvent) {
  currentTab.value = id;
  const target = event?.currentTarget as HTMLElement;
  if (target) {
    target.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest"
    });
  }
  setTimeout(updateScrollState, 350);
}

function scrollTabs(direction: "left" | "right") {
  const el = tabsContainerRef.value;
  if (!el) return;
  const offset = direction === "left" ? -140 : 140;
  el.scrollBy({ left: offset, behavior: "smooth" });
  setTimeout(updateScrollState, 300);
}

function onTabsWheel(e: WheelEvent) {
  const el = tabsContainerRef.value;
  if (el && Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
    e.preventDefault();
    el.scrollLeft += e.deltaY;
    updateScrollState();
  }
}

onMounted(() => {
  updateScrollState();
  window.addEventListener("resize", updateScrollState);
});

onUnmounted(() => {
  window.removeEventListener("resize", updateScrollState);
});

const snippets: Record<string, string> = {
  "tab-webmvc-boot3": `<!-- 1. NextDoc4j 单套统一 Starter (Spring Boot 3.4.x / 4.x 通用) -->
<dependency>
    <groupId>top.nextdoc4j</groupId>
    <artifactId>nextdoc4j-spring-boot-starter</artifactId>
    <version>1.5.0</version>
</dependency>

<!-- 2. SpringDoc WebMvc UI 依赖 (匹配 Spring Boot 3.4.x) -->
<dependency>
    <groupId>org.springdoc</groupId>
    <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
    <version>2.8.17</version>
</dependency>`,

  "tab-webflux-boot3": `<!-- 1. NextDoc4j 单套统一 Starter (Spring Boot 3.4.x / 4.x 通用) -->
<dependency>
    <groupId>top.nextdoc4j</groupId>
    <artifactId>nextdoc4j-spring-boot-starter</artifactId>
    <version>1.5.0</version>
</dependency>

<!-- 2. SpringDoc WebFlux UI 依赖 (匹配 Spring Boot 3.4.x) -->
<dependency>
    <groupId>org.springdoc</groupId>
    <artifactId>springdoc-openapi-starter-webflux-ui</artifactId>
    <version>2.8.17</version>
</dependency>`,

  "tab-webmvc-boot4": `<!-- 1. NextDoc4j 单套统一 Starter (Spring Boot 3.4.x / 4.x 通用) -->
<dependency>
    <groupId>top.nextdoc4j</groupId>
    <artifactId>nextdoc4j-spring-boot-starter</artifactId>
    <version>1.5.0</version>
</dependency>

<!-- 2. SpringDoc WebMvc UI 依赖 (匹配 Spring Boot 4.x) -->
<dependency>
    <groupId>org.springdoc</groupId>
    <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
    <version>3.0.3</version>
</dependency>`,

  "tab-webflux-boot4": `<!-- 1. NextDoc4j 单套统一 Starter (Spring Boot 3.4.x / 4.x 通用) -->
<dependency>
    <groupId>top.nextdoc4j</groupId>
    <artifactId>nextdoc4j-spring-boot-starter</artifactId>
    <version>1.5.0</version>
</dependency>

<!-- 2. SpringDoc WebFlux UI 依赖 (匹配 Spring Boot 4.x) -->
<dependency>
    <groupId>org.springdoc</groupId>
    <artifactId>springdoc-openapi-starter-webflux-ui</artifactId>
    <version>3.0.3</version>
</dependency>`,

  "tab-bom": `<!-- 在 dependencyManagement 中引入 BOM 统一管控版本 -->
<dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>org.springdoc</groupId>
            <artifactId>springdoc-openapi-bom</artifactId>
            <version>2.8.17</version> <!-- Boot 4 请改为 3.0.3 -->
            <type>pom</type>
            <scope>import</scope>
        </dependency>
        <dependency>
            <groupId>top.nextdoc4j</groupId>
            <artifactId>nextdoc4j-bom</artifactId>
            <version>1.5.0</version>
            <type>pom</type>
            <scope>import</scope>
        </dependency>
    </dependencies>
</dependencyManagement>

<!-- 在 dependencies 中直接引入（无需填写 version） -->
<dependencies>
    <dependency>
        <groupId>top.nextdoc4j</groupId>
        <artifactId>nextdoc4j-spring-boot-starter</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springdoc</groupId>
        <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
    </dependency>
</dependencies>`
};

function copyCode() {
  const text = snippets[currentTab.value];
  if (!text) return;
  navigator.clipboard.writeText(text).then(() => {
    isCopied.value = true;
    setTimeout(() => {
      isCopied.value = false;
    }, 1800);
  });
}
</script>

<template>
  <div class="started-maven-wrap">
    <!-- Version Compatibility Table -->
    <div class="guide-table-wrap">
      <table class="guide-table">
        <thead>
          <tr>
            <th>Web 栈类型</th>
            <th>Spring Boot 版本</th>
            <th>SpringDoc UI 坐标 (groupId: org.springdoc)</th>
            <th>推荐 SpringDoc 版本</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Servlet / WebMvc</strong></td>
            <td>3.4.x</td>
            <td><code>springdoc-openapi-starter-webmvc-ui</code></td>
            <td><code>2.8.17</code></td>
          </tr>
          <tr>
            <td><strong>Reactive / WebFlux</strong></td>
            <td>3.4.x</td>
            <td><code>springdoc-openapi-starter-webflux-ui</code></td>
            <td><code>2.8.17</code></td>
          </tr>
          <tr>
            <td><strong>Servlet / WebMvc</strong></td>
            <td>4.x</td>
            <td><code>springdoc-openapi-starter-webmvc-ui</code></td>
            <td><code>3.0.3</code></td>
          </tr>
          <tr>
            <td><strong>Reactive / WebFlux</strong></td>
            <td>4.x</td>
            <td><code>springdoc-openapi-starter-webflux-ui</code></td>
            <td><code>3.0.3</code></td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 5-Tab Terminal -->
    <div class="code-terminal-card">
      <div class="code-terminal-header">
        <div class="terminal-tabs-wrapper" :class="{ 'can-scroll-left': canScrollLeft, 'can-scroll-right': canScrollRight }">
          <button
            v-if="canScrollLeft"
            type="button"
            class="tab-scroll-arrow left"
            aria-label="向左滑动"
            @click="scrollTabs('left')"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
          </button>

          <div
            ref="tabsContainerRef"
            class="terminal-tabs"
            @scroll="updateScrollState"
            @wheel="onTabsWheel"
          >
            <button
              v-for="t in tabs"
              :key="t.id"
              type="button"
              class="terminal-tab-btn"
              :class="{ active: currentTab === t.id }"
              @click="selectTab(t.id, $event)"
            >
              {{ t.label }}
            </button>
          </div>

          <button
            v-if="canScrollRight"
            type="button"
            class="tab-scroll-arrow right"
            aria-label="向右滑动"
            @click="scrollTabs('right')"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>
          </button>
        </div>

        <div class="terminal-actions">
          <span class="terminal-lang-tag">pom.xml</span>
        </div>
      </div>

      <div class="code-terminal-body-wrap">
        <button
          type="button"
          class="floating-copy-btn"
          :class="{ copied: isCopied }"
          title="复制代码"
          aria-label="复制代码"
          @click="copyCode"
        >
          <svg v-if="!isCopied" class="copy-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
          </svg>
          <svg v-else class="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </button>

        <div class="code-terminal-body">
          <!-- Pane 1 -->
          <div v-show="currentTab === 'tab-webmvc-boot3'" class="code-pane active">
<pre><code><span class="c-comment">&lt;!-- 1. NextDoc4j 单套统一 Starter (Spring Boot 3.4.x / 4.x 通用) --&gt;</span>
<span class="c-tag">&lt;dependency&gt;</span>
    <span class="c-tag">&lt;groupId&gt;</span><span class="c-str">top.nextdoc4j</span><span class="c-tag">&lt;/groupId&gt;</span>
    <span class="c-tag">&lt;artifactId&gt;</span><span class="c-str">nextdoc4j-spring-boot-starter</span><span class="c-tag">&lt;/artifactId&gt;</span>
    <span class="c-tag">&lt;version&gt;</span><span class="c-str">1.5.0</span><span class="c-tag">&lt;/version&gt;</span>
<span class="c-tag">&lt;/dependency&gt;</span>

<span class="c-comment">&lt;!-- 2. SpringDoc WebMvc UI 依赖 (匹配 Spring Boot 3.4.x) --&gt;</span>
<span class="c-tag">&lt;dependency&gt;</span>
    <span class="c-tag">&lt;groupId&gt;</span><span class="c-str">org.springdoc</span><span class="c-tag">&lt;/groupId&gt;</span>
    <span class="c-tag">&lt;artifactId&gt;</span><span class="c-str">springdoc-openapi-starter-webmvc-ui</span><span class="c-tag">&lt;/artifactId&gt;</span>
    <span class="c-tag">&lt;version&gt;</span><span class="c-str">2.8.17</span><span class="c-tag">&lt;/version&gt;</span>
<span class="c-tag">&lt;/dependency&gt;</span></code></pre>
          </div>

          <!-- Pane 2 -->
          <div v-show="currentTab === 'tab-webflux-boot3'" class="code-pane active">
<pre><code><span class="c-comment">&lt;!-- 1. NextDoc4j 单套统一 Starter (Spring Boot 3.4.x / 4.x 通用) --&gt;</span>
<span class="c-tag">&lt;dependency&gt;</span>
    <span class="c-tag">&lt;groupId&gt;</span><span class="c-str">top.nextdoc4j</span><span class="c-tag">&lt;/groupId&gt;</span>
    <span class="c-tag">&lt;artifactId&gt;</span><span class="c-str">nextdoc4j-spring-boot-starter</span><span class="c-tag">&lt;/artifactId&gt;</span>
    <span class="c-tag">&lt;version&gt;</span><span class="c-str">1.5.0</span><span class="c-tag">&lt;/version&gt;</span>
<span class="c-tag">&lt;/dependency&gt;</span>

<span class="c-comment">&lt;!-- 2. SpringDoc WebFlux UI 依赖 (匹配 Spring Boot 3.4.x) --&gt;</span>
<span class="c-tag">&lt;dependency&gt;</span>
    <span class="c-tag">&lt;groupId&gt;</span><span class="c-str">org.springdoc</span><span class="c-tag">&lt;/groupId&gt;</span>
    <span class="c-tag">&lt;artifactId&gt;</span><span class="c-str">springdoc-openapi-starter-webflux-ui</span><span class="c-tag">&lt;/artifactId&gt;</span>
    <span class="c-tag">&lt;version&gt;</span><span class="c-str">2.8.17</span><span class="c-tag">&lt;/version&gt;</span>
<span class="c-tag">&lt;/dependency&gt;</span></code></pre>
          </div>

          <!-- Pane 3 -->
          <div v-show="currentTab === 'tab-webmvc-boot4'" class="code-pane active">
<pre><code><span class="c-comment">&lt;!-- 1. NextDoc4j 单套统一 Starter (Spring Boot 3.4.x / 4.x 通用) --&gt;</span>
<span class="c-tag">&lt;dependency&gt;</span>
    <span class="c-tag">&lt;groupId&gt;</span><span class="c-str">top.nextdoc4j</span><span class="c-tag">&lt;/groupId&gt;</span>
    <span class="c-tag">&lt;artifactId&gt;</span><span class="c-str">nextdoc4j-spring-boot-starter</span><span class="c-tag">&lt;/artifactId&gt;</span>
    <span class="c-tag">&lt;version&gt;</span><span class="c-str">1.5.0</span><span class="c-tag">&lt;/version&gt;</span>
<span class="c-tag">&lt;/dependency&gt;</span>

<span class="c-comment">&lt;!-- 2. SpringDoc WebMvc UI 依赖 (匹配 Spring Boot 4.x) --&gt;</span>
<span class="c-tag">&lt;dependency&gt;</span>
    <span class="c-tag">&lt;groupId&gt;</span><span class="c-str">org.springdoc</span><span class="c-tag">&lt;/groupId&gt;</span>
    <span class="c-tag">&lt;artifactId&gt;</span><span class="c-str">springdoc-openapi-starter-webmvc-ui</span><span class="c-tag">&lt;/artifactId&gt;</span>
    <span class="c-tag">&lt;version&gt;</span><span class="c-str">3.0.3</span><span class="c-tag">&lt;/version&gt;</span>
<span class="c-tag">&lt;/dependency&gt;</span></code></pre>
          </div>

          <!-- Pane 4 -->
          <div v-show="currentTab === 'tab-webflux-boot4'" class="code-pane active">
<pre><code><span class="c-comment">&lt;!-- 1. NextDoc4j 单套统一 Starter (Spring Boot 3.4.x / 4.x 通用) --&gt;</span>
<span class="c-tag">&lt;dependency&gt;</span>
    <span class="c-tag">&lt;groupId&gt;</span><span class="c-str">top.nextdoc4j</span><span class="c-tag">&lt;/groupId&gt;</span>
    <span class="c-tag">&lt;artifactId&gt;</span><span class="c-str">nextdoc4j-spring-boot-starter</span><span class="c-tag">&lt;/artifactId&gt;</span>
    <span class="c-tag">&lt;version&gt;</span><span class="c-str">1.5.0</span><span class="c-tag">&lt;/version&gt;</span>
<span class="c-tag">&lt;/dependency&gt;</span>

<span class="c-comment">&lt;!-- 2. SpringDoc WebFlux UI 依赖 (匹配 Spring Boot 4.x) --&gt;</span>
<span class="c-tag">&lt;dependency&gt;</span>
    <span class="c-tag">&lt;groupId&gt;</span><span class="c-str">org.springdoc</span><span class="c-tag">&lt;/groupId&gt;</span>
    <span class="c-tag">&lt;artifactId&gt;</span><span class="c-str">springdoc-openapi-starter-webflux-ui</span><span class="c-tag">&lt;/artifactId&gt;</span>
    <span class="c-tag">&lt;version&gt;</span><span class="c-str">3.0.3</span><span class="c-tag">&lt;/version&gt;</span>
<span class="c-tag">&lt;/dependency&gt;</span></code></pre>
          </div>

          <!-- Pane 5 -->
          <div v-show="currentTab === 'tab-bom'" class="code-pane active">
<pre><code><span class="c-comment">&lt;!-- 在 dependencyManagement 中引入 BOM 统一管控版本 --&gt;</span>
<span class="c-tag">&lt;dependencyManagement&gt;</span>
    <span class="c-tag">&lt;dependencies&gt;</span>
        <span class="c-tag">&lt;dependency&gt;</span>
            <span class="c-tag">&lt;groupId&gt;</span><span class="c-str">org.springdoc</span><span class="c-tag">&lt;/groupId&gt;</span>
            <span class="c-tag">&lt;artifactId&gt;</span><span class="c-str">springdoc-openapi-bom</span><span class="c-tag">&lt;/artifactId&gt;</span>
            <span class="c-tag">&lt;version&gt;</span><span class="c-str">2.8.17</span><span class="c-tag">&lt;/version&gt;</span> <span class="c-comment">&lt;!-- Boot 4 请改为 3.0.3 --&gt;</span>
            <span class="c-tag">&lt;type&gt;</span>pom<span class="c-tag">&lt;/type&gt;</span>
            <span class="c-tag">&lt;scope&gt;</span>import<span class="c-tag">&lt;/scope&gt;</span>
        <span class="c-tag">&lt;/dependency&gt;</span>
        <span class="c-tag">&lt;dependency&gt;</span>
            <span class="c-tag">&lt;groupId&gt;</span><span class="c-str">top.nextdoc4j</span><span class="c-tag">&lt;/groupId&gt;</span>
            <span class="c-tag">&lt;artifactId&gt;</span><span class="c-str">nextdoc4j-bom</span><span class="c-tag">&lt;/artifactId&gt;</span>
            <span class="c-tag">&lt;version&gt;</span><span class="c-str">1.5.0</span><span class="c-tag">&lt;/version&gt;</span>
            <span class="c-tag">&lt;type&gt;</span>pom<span class="c-tag">&lt;/type&gt;</span>
            <span class="c-tag">&lt;scope&gt;</span>import<span class="c-tag">&lt;/scope&gt;</span>
        <span class="c-tag">&lt;/dependency&gt;</span>
    <span class="c-tag">&lt;/dependencies&gt;</span>
<span class="c-tag">&lt;/dependencyManagement&gt;</span>

<span class="c-comment">&lt;!-- 在 dependencies 中直接引入（无需填写 version） --&gt;</span>
<span class="c-tag">&lt;dependencies&gt;</span>
    <span class="c-tag">&lt;dependency&gt;</span>
        <span class="c-tag">&lt;groupId&gt;</span><span class="c-str">top.nextdoc4j</span><span class="c-tag">&lt;/groupId&gt;</span>
        <span class="c-tag">&lt;artifactId&gt;</span><span class="c-str">nextdoc4j-spring-boot-starter</span><span class="c-tag">&lt;/artifactId&gt;</span>
    <span class="c-tag">&lt;/dependency&gt;</span>
    <span class="c-tag">&lt;dependency&gt;</span>
        <span class="c-tag">&lt;groupId&gt;</span><span class="c-str">org.springdoc</span><span class="c-tag">&lt;/groupId&gt;</span>
        <span class="c-tag">&lt;artifactId&gt;</span><span class="c-str">springdoc-openapi-starter-webmvc-ui</span><span class="c-tag">&lt;/artifactId&gt;</span>
    <span class="c-tag">&lt;/dependency&gt;</span>
<span class="c-tag">&lt;/dependencies&gt;</span></code></pre>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.started-maven-wrap {
  margin: 12px 0 24px;
}

/* Compatibility Table */
.guide-table-wrap {
  width: 100%;
  overflow-x: auto;
  margin: 14px 0 20px;
  border-radius: 12px;
  border: 1px solid var(--vp-c-divider, rgba(15, 23, 42, 0.08));
  background: var(--vp-c-bg, #ffffff);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
}

.guide-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13.5px;
  text-align: left;
  margin: 0 !important;
  display: table !important;
}

.guide-table th {
  background: var(--vp-c-bg-soft, #f8fafc);
  padding: 11px 16px;
  font-weight: 700;
  color: var(--vp-c-text-1, #0f172a);
  border-bottom: 1px solid var(--vp-c-divider, rgba(15, 23, 42, 0.09));
  font-size: 13px;
}

.guide-table td {
  padding: 12px 16px;
  border-bottom: 1px solid var(--vp-c-divider, rgba(15, 23, 42, 0.06));
  color: var(--vp-c-text-2, #475569);
  font-size: 13px;
}

.guide-table tr:last-child td {
  border-bottom: none;
}

.guide-table code {
  font-family: var(--vp-font-family-mono, monospace);
  font-size: 12px;
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--vp-c-bg-soft, #f1f5f9);
  color: var(--vp-c-brand-1, #059669);
  font-weight: 600;
}

/* Code Terminal Container */
.code-terminal-card {
  margin: 16px 0 24px;
  background: var(--vp-c-bg, #ffffff);
  border-radius: 14px;
  border: 1px solid var(--vp-c-divider, rgba(15, 23, 42, 0.09));
  box-shadow: 0 16px 40px -12px rgba(15, 23, 42, 0.08);
  overflow: hidden;
  transition: background 0.2s ease, border-color 0.2s ease;
}

:root.dark .code-terminal-card {
  background: #0d131f;
  border-color: rgba(255, 255, 255, 0.09);
  box-shadow: 0 20px 48px -14px rgba(0, 0, 0, 0.6);
}

.code-terminal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 14px 0 10px;
  height: 42px;
  background: var(--vp-c-bg-soft, #f1f5f9);
  border-bottom: 1px solid var(--vp-c-divider, rgba(15, 23, 42, 0.08));
  gap: 12px;
}

:root.dark .code-terminal-header {
  background: #111827;
  border-color: rgba(255, 255, 255, 0.08);
}

.terminal-tabs-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
  height: 100%;
  overflow: hidden;
}

.terminal-tabs-wrapper::before,
.terminal-tabs-wrapper::after {
  content: "";
  position: absolute;
  top: 0;
  bottom: 0;
  width: 28px;
  pointer-events: none;
  z-index: 2;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.terminal-tabs-wrapper::before {
  left: 0;
  background: linear-gradient(to right, var(--vp-c-bg-soft, #f1f5f9) 25%, transparent 100%);
}

.terminal-tabs-wrapper::after {
  right: 0;
  background: linear-gradient(to left, var(--vp-c-bg-soft, #f1f5f9) 25%, transparent 100%);
}

:root.dark .terminal-tabs-wrapper::before {
  background: linear-gradient(to right, #111827 25%, transparent 100%);
}

:root.dark .terminal-tabs-wrapper::after {
  background: linear-gradient(to left, #111827 25%, transparent 100%);
}

.terminal-tabs-wrapper.can-scroll-left::before {
  opacity: 1;
}

.terminal-tabs-wrapper.can-scroll-right::after {
  opacity: 1;
}

.tab-scroll-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 4;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--vp-c-bg, #ffffff);
  border: 1px solid var(--vp-c-divider, rgba(15, 23, 42, 0.12));
  color: var(--vp-c-text-2, #64748b);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
  transition: all 0.15s ease;
  padding: 0;
}

:root.dark .tab-scroll-arrow {
  background: #1e293b;
  border-color: rgba(255, 255, 255, 0.15);
  color: #94a3b8;
}

.tab-scroll-arrow:hover {
  color: var(--vp-c-brand-1, #059669);
  border-color: var(--vp-c-brand-1, #059669);
  transform: translateY(-50%) scale(1.1);
}

.tab-scroll-arrow.left {
  left: 2px;
}

.tab-scroll-arrow.right {
  right: 2px;
}

.tab-scroll-arrow svg {
  width: 11px;
  height: 11px;
}

.terminal-tabs {
  display: flex;
  align-items: center;
  gap: 4px;
  overflow-x: auto;
  flex-grow: 1;
  white-space: nowrap;
  height: 100%;
  padding: 0 4px;
  scrollbar-width: none !important;
  -ms-overflow-style: none;
  scroll-behavior: smooth;
}

.terminal-tabs::-webkit-scrollbar {
  display: none !important;
  width: 0 !important;
  height: 0 !important;
}

.terminal-tab-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 28px;
  line-height: 28px;
  padding: 0 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 550;
  color: var(--vp-c-text-2, #64748b);
  transition: all 0.15s ease;
  white-space: nowrap;
  cursor: pointer;
  border: none;
  background: transparent;
  flex-shrink: 0;
  margin: 0;
}

.terminal-tab-btn:hover {
  color: var(--vp-c-text-1, #0f172a);
  background: rgba(0, 0, 0, 0.04);
}

:root.dark .terminal-tab-btn:hover {
  color: #f8fafc;
  background: rgba(255, 255, 255, 0.05);
}

.terminal-tab-btn.active {
  color: var(--vp-c-brand-1, #059669);
  background: var(--vp-c-bg, #ffffff);
  font-weight: 700;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

:root.dark .terminal-tab-btn.active {
  color: #34d399;
  background: rgba(16, 185, 129, 0.16);
}

.terminal-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.terminal-lang-tag {
  font-family: var(--vp-font-family-mono, monospace);
  font-size: 11px;
  color: var(--vp-c-text-3, #94a3b8);
  font-weight: 600;
  text-transform: uppercase;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.03);
}

:root.dark .terminal-lang-tag {
  background: rgba(255, 255, 255, 0.05);
}

/* Floating Copy Button Inside Code Block */
.code-terminal-body-wrap {
  position: relative;
  width: 100%;
}

.floating-copy-btn {
  position: absolute;
  top: 10px;
  right: 12px;
  z-index: 10;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  display: grid;
  place-items: center;
  cursor: pointer;
  opacity: 0;
  transform: translateY(4px);
  pointer-events: none;
  border: 1px solid rgba(15, 23, 42, 0.12);
  background: #ffffff;
  color: #475569;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08);
  transition: opacity 0.2s ease, transform 0.2s ease, background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

.code-terminal-card:hover .floating-copy-btn,
.code-terminal-body-wrap:hover .floating-copy-btn {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
}

.floating-copy-btn:hover {
  color: var(--vp-c-brand-1, #059669);
  border-color: rgba(5, 150, 105, 0.4);
  box-shadow: 0 6px 16px rgba(5, 150, 105, 0.16);
  transform: translateY(-1px) scale(1.05);
}

:root.dark .floating-copy-btn {
  background: #090d16;
  color: #cbd5e1;
  border-color: rgba(255, 255, 255, 0.16);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.6);
}

:root.dark .floating-copy-btn:hover {
  color: #34d399;
  border-color: rgba(52, 211, 153, 0.45);
}

.floating-copy-btn svg {
  width: 14px;
  height: 14px;
  display: block;
}

.floating-copy-btn.copied {
  border-color: #10b981 !important;
  color: #10b981 !important;
}

.code-terminal-body {
  padding: 18px 22px;
  overflow-x: auto;
  font-family: var(--vp-font-family-mono, monospace);
  font-size: 13px;
  line-height: 1.65;
  color: var(--vp-c-text-1, #1e293b);
  background: var(--vp-c-bg, #ffffff);
  scrollbar-width: thin;
  scrollbar-color: rgba(15, 23, 42, 0.15) transparent;
}

:root.dark .code-terminal-body {
  color: #e2e8f0;
  background: #0d131f;
  scrollbar-color: rgba(255, 255, 255, 0.18) transparent;
}

.code-terminal-body::-webkit-scrollbar {
  height: 4px;
  display: block !important;
}

.code-terminal-body::-webkit-scrollbar-thumb {
  background: rgba(15, 23, 42, 0.14);
  border-radius: 9999px;
}

:root.dark .code-terminal-body::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.18);
}

.code-terminal-body pre {
  margin: 0 !important;
  padding: 0 !important;
  background: transparent !important;
  font-family: inherit;
}

/* Syntax Highlighting Colors */
.c-tag { color: #e11d48; }
.c-attr { color: #d97706; }
.c-str { color: #059669; }
.c-comment { color: #64748b; font-style: italic; }
.c-kw { color: #7c3aed; font-weight: 600; }

:root.dark .c-tag { color: #f43f5e; }
:root.dark .c-attr { color: #fbbf24; }
:root.dark .c-str { color: #34d399; }
:root.dark .c-comment { color: #94a3b8; font-style: italic; }
:root.dark .c-kw { color: #c084fc; font-weight: 600; }
</style>
