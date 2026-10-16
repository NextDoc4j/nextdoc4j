<script setup lang="ts">
import { ref } from "vue";

const currentTab = ref("tab-gw-webflux");
const isCopied = ref(false);

const tabs = [
  { id: "tab-gw-webflux", label: "Gateway WebFlux (主流推荐)" },
  { id: "tab-gw-webmvc", label: "Gateway WebMvc" },
  { id: "tab-gw-yml", label: "网关 application.yml" },
];

const snippets: Record<string, string> = {
  "tab-gw-webflux": `<!-- 1. NextDoc4j 统一网关 Starter -->
<dependency>
    <groupId>top.nextdoc4j</groupId>
    <artifactId>nextdoc4j-gateway-spring-boot-starter</artifactId>
    <version>1.5.0</version>
</dependency>

<!-- 2. Spring Cloud Gateway 运行时 (WebFlux) -->
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-gateway-server-webflux</artifactId>
</dependency>

<!-- 3. SpringDoc Reactive UI -->
<dependency>
    <groupId>org.springdoc</groupId>
    <artifactId>springdoc-openapi-starter-webflux-ui</artifactId>
    <version>2.8.17</version>
</dependency>`,

  "tab-gw-webmvc": `<!-- 1. NextDoc4j 统一网关 Starter -->
<dependency>
    <groupId>top.nextdoc4j</groupId>
    <artifactId>nextdoc4j-gateway-spring-boot-starter</artifactId>
    <version>1.5.0</version>
</dependency>

<!-- 2. Spring Cloud Gateway 运行时 (WebMvc) -->
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-gateway-server-webmvc</artifactId>
</dependency>

<!-- 3. SpringDoc Servlet UI -->
<dependency>
    <groupId>org.springdoc</groupId>
    <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
    <version>2.8.17</version>
</dependency>`,

  "tab-gw-yml": `nextdoc4j:
  enabled: true
  gateway:
    # 开启微服务路由自动聚合（智能识别 StripPrefix 过滤器）
    auto-discovery: true

spring:
  cloud:
    gateway:
      server:
        webflux:
          routes:
            - id: user-service
              uri: lb://user-service
              predicates:
                - Path=/user/**
              filters:
                - StripPrefix=1`
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
  <div class="started-gateway-wrap">
    <!-- Gateway Table -->
    <div class="guide-table-wrap">
      <table class="guide-table">
        <thead>
          <tr>
            <th>网关架构类型</th>
            <th>Gateway 运行时坐标 (groupId: org.springframework.cloud)</th>
            <th>SpringDoc UI 坐标 (groupId: org.springdoc)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Reactive WebFlux</strong></td>
            <td><code>spring-cloud-starter-gateway-server-webflux</code></td>
            <td><code>springdoc-openapi-starter-webflux-ui</code></td>
          </tr>
          <tr>
            <td><strong>Servlet WebMvc</strong></td>
            <td><code>spring-cloud-starter-gateway-server-webmvc</code></td>
            <td><code>springdoc-openapi-starter-webmvc-ui</code></td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Gateway Terminal -->
    <div class="code-terminal-card" id="gatewayCodeTerminal">
      <div class="code-terminal-header">
        <div class="terminal-tabs">
          <button
            v-for="t in tabs"
            :key="t.id"
            type="button"
            class="terminal-tab-btn"
            :class="{ active: currentTab === t.id }"
            @click="currentTab = t.id"
          >
            {{ t.label }}
          </button>
        </div>
        <div class="terminal-actions">
          <span class="terminal-lang-tag">gateway</span>
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
          <div v-show="currentTab === 'tab-gw-webflux'" class="code-pane active">
<pre><code><span class="c-comment">&lt;!-- 1. NextDoc4j 统一网关 Starter --&gt;</span>
<span class="c-tag">&lt;dependency&gt;</span>
    <span class="c-tag">&lt;groupId&gt;</span><span class="c-str">top.nextdoc4j</span><span class="c-tag">&lt;/groupId&gt;</span>
    <span class="c-tag">&lt;artifactId&gt;</span><span class="c-str">nextdoc4j-gateway-spring-boot-starter</span><span class="c-tag">&lt;/artifactId&gt;</span>
    <span class="c-tag">&lt;version&gt;</span><span class="c-str">1.5.0</span><span class="c-tag">&lt;/version&gt;</span>
<span class="c-tag">&lt;/dependency&gt;</span>

<span class="c-comment">&lt;!-- 2. Spring Cloud Gateway 运行时 (WebFlux) --&gt;</span>
<span class="c-tag">&lt;dependency&gt;</span>
    <span class="c-tag">&lt;groupId&gt;</span><span class="c-str">org.springframework.cloud</span><span class="c-tag">&lt;/groupId&gt;</span>
    <span class="c-tag">&lt;artifactId&gt;</span><span class="c-str">spring-cloud-starter-gateway-server-webflux</span><span class="c-tag">&lt;/artifactId&gt;</span>
<span class="c-tag">&lt;/dependency&gt;</span>

<span class="c-comment">&lt;!-- 3. SpringDoc Reactive UI --&gt;</span>
<span class="c-tag">&lt;dependency&gt;</span>
    <span class="c-tag">&lt;groupId&gt;</span><span class="c-str">org.springdoc</span><span class="c-tag">&lt;/groupId&gt;</span>
    <span class="c-tag">&lt;artifactId&gt;</span><span class="c-str">springdoc-openapi-starter-webflux-ui</span><span class="c-tag">&lt;/artifactId&gt;</span>
    <span class="c-tag">&lt;version&gt;</span><span class="c-str">2.8.17</span><span class="c-tag">&lt;/version&gt;</span>
<span class="c-tag">&lt;/dependency&gt;</span></code></pre>
          </div>

          <div v-show="currentTab === 'tab-gw-webmvc'" class="code-pane active">
<pre><code><span class="c-comment">&lt;!-- 1. NextDoc4j 统一网关 Starter --&gt;</span>
<span class="c-tag">&lt;dependency&gt;</span>
    <span class="c-tag">&lt;groupId&gt;</span><span class="c-str">top.nextdoc4j</span><span class="c-tag">&lt;/groupId&gt;</span>
    <span class="c-tag">&lt;artifactId&gt;</span><span class="c-str">nextdoc4j-gateway-spring-boot-starter</span><span class="c-tag">&lt;/artifactId&gt;</span>
    <span class="c-tag">&lt;version&gt;</span><span class="c-str">1.5.0</span><span class="c-tag">&lt;/version&gt;</span>
<span class="c-tag">&lt;/dependency&gt;</span>

<span class="c-comment">&lt;!-- 2. Spring Cloud Gateway 运行时 (WebMvc) --&gt;</span>
<span class="c-tag">&lt;dependency&gt;</span>
    <span class="c-tag">&lt;groupId&gt;</span><span class="c-str">org.springframework.cloud</span><span class="c-tag">&lt;/groupId&gt;</span>
    <span class="c-tag">&lt;artifactId&gt;</span><span class="c-str">spring-cloud-starter-gateway-server-webmvc</span><span class="c-tag">&lt;/artifactId&gt;</span>
<span class="c-tag">&lt;/dependency&gt;</span>

<span class="c-comment">&lt;!-- 3. SpringDoc Servlet UI --&gt;</span>
<span class="c-tag">&lt;dependency&gt;</span>
    <span class="c-tag">&lt;groupId&gt;</span><span class="c-str">org.springdoc</span><span class="c-tag">&lt;/groupId&gt;</span>
    <span class="c-tag">&lt;artifactId&gt;</span><span class="c-str">springdoc-openapi-starter-webmvc-ui</span><span class="c-tag">&lt;/artifactId&gt;</span>
    <span class="c-tag">&lt;version&gt;</span><span class="c-str">2.8.17</span><span class="c-tag">&lt;/version&gt;</span>
<span class="c-tag">&lt;/dependency&gt;</span></code></pre>
          </div>

          <div v-show="currentTab === 'tab-gw-yml'" class="code-pane active">
<pre><code><span class="c-kw">nextdoc4j</span>:
  <span class="c-attr">enabled</span>: <span class="c-num">true</span>
  <span class="c-attr">gateway</span>:
    <span class="c-comment"># 开启微服务路由自动聚合（智能识别 StripPrefix 过滤器）</span>
    <span class="c-attr">auto-discovery</span>: <span class="c-num">true</span>

<span class="c-kw">spring</span>:
  <span class="c-kw">cloud</span>:
    <span class="c-kw">gateway</span>:
      <span class="c-kw">server</span>:
        <span class="c-kw">webflux</span>:
          <span class="c-kw">routes</span>:
            - <span class="c-attr">id</span>: <span class="c-str">user-service</span>
              <span class="c-attr">uri</span>: <span class="c-str">lb://user-service</span>
              <span class="c-kw">predicates</span>:
                - <span class="c-str">Path=/user/**</span>
              <span class="c-kw">filters</span>:
                - <span class="c-str">StripPrefix=1</span></code></pre>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.started-gateway-wrap {
  margin: 12px 0 24px;
}

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

.terminal-tabs {
  display: flex;
  align-items: center;
  gap: 4px;
  overflow-x: auto;
  flex-grow: 1;
  white-space: nowrap;
  height: 100%;
  padding: 0;
  scrollbar-width: thin;
  scrollbar-color: transparent transparent;
  transition: scrollbar-color 0.2s ease;
}

.terminal-tabs:hover {
  scrollbar-color: rgba(15, 23, 42, 0.18) transparent;
}

:root.dark .terminal-tabs {
  scrollbar-color: transparent transparent;
}

:root.dark .terminal-tabs:hover {
  scrollbar-color: rgba(255, 255, 255, 0.22) transparent;
}

.terminal-tabs::-webkit-scrollbar {
  height: 3px;
}

.terminal-tabs::-webkit-scrollbar-track {
  background: transparent;
}

.terminal-tabs::-webkit-scrollbar-thumb {
  background: transparent;
  border-radius: 9999px;
  transition: background 0.2s ease;
}

.terminal-tabs:hover::-webkit-scrollbar-thumb {
  background: rgba(15, 23, 42, 0.18);
}

:root.dark .terminal-tabs:hover::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.22);
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
.c-num { color: #db2777; }

:root.dark .c-tag { color: #f43f5e; }
:root.dark .c-attr { color: #fbbf24; }
:root.dark .c-str { color: #34d399; }
:root.dark .c-comment { color: #94a3b8; font-style: italic; }
:root.dark .c-kw { color: #c084fc; font-weight: 600; }
:root.dark .c-num { color: #f472b6; }
</style>
