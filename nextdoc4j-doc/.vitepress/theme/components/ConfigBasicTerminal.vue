<script setup lang="ts">
import { ref } from "vue";

const currentTab = ref("tab-cfg-yaml");
const isCopied = ref(false);

const snippets: Record<string, string> = {
  "tab-cfg-yaml": `nextdoc4j:
  # 1. 核心总开关（默认 false）
  enabled: true

  # 2. 自定义文档入口路径（1.4.0+，默认 /doc.html，需为以 / 开头的单段路径）
  doc-path: /docs

  # 3. 启用跨域支持（开发环境前后端联调推荐）
  cors: true

  # 4. 生产环境安全隐身模式（开启后全面禁用并下线文档端点与元数据）
  production: false`,

  "tab-cfg-prop": `# 1. 核心总开关
nextdoc4j.enabled=true

# 2. 自定义文档入口路径（1.4.0+，默认 /doc.html）
nextdoc4j.doc-path=/docs

# 3. 启用跨域支持
nextdoc4j.cors=true

# 4. 生产环境安全隐身模式
nextdoc4j.production=false`
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
  <div class="code-terminal-card" id="basicConfigTerminal">
    <div class="code-terminal-header">
      <div class="terminal-tabs">
        <button
          type="button"
          class="terminal-tab-btn"
          :class="{ active: currentTab === 'tab-cfg-yaml' }"
          @click="currentTab = 'tab-cfg-yaml'"
        >
          application.yml
        </button>
        <button
          type="button"
          class="terminal-tab-btn"
          :class="{ active: currentTab === 'tab-cfg-prop' }"
          @click="currentTab = 'tab-cfg-prop'"
        >
          application.properties
        </button>
      </div>
      <div class="terminal-actions">
        <span class="terminal-lang-tag">config</span>
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
        <div v-show="currentTab === 'tab-cfg-yaml'" class="code-pane active">
<pre><code><span class="c-kw">nextdoc4j</span>:
  <span class="c-comment"># 1. 核心总开关（默认 false）</span>
  <span class="c-attr">enabled</span>: <span class="c-num">true</span>

  <span class="c-comment"># 2. 自定义文档入口路径（1.4.0+，默认 /doc.html，需为以 / 开头的单段路径）</span>
  <span class="c-attr">doc-path</span>: <span class="c-str">/docs</span>

  <span class="c-comment"># 3. 启用跨域支持（开发环境前后端联调推荐）</span>
  <span class="c-attr">cors</span>: <span class="c-num">true</span>

  <span class="c-comment"># 4. 生产环境安全隐身模式（开启后全面禁用并下线文档端点与元数据）</span>
  <span class="c-attr">production</span>: <span class="c-num">false</span></code></pre>
        </div>

        <div v-show="currentTab === 'tab-cfg-prop'" class="code-pane active">
<pre><code><span class="c-comment"># 1. 核心总开关</span>
<span class="c-attr">nextdoc4j.enabled</span>=<span class="c-num">true</span>

<span class="c-comment"># 2. 自定义文档入口路径（1.4.0+，默认 /doc.html）</span>
<span class="c-attr">nextdoc4j.doc-path</span>=<span class="c-str">/docs</span>

<span class="c-comment"># 3. 启用跨域支持</span>
<span class="c-attr">nextdoc4j.cors</span>=<span class="c-num">true</span>

<span class="c-comment"># 4. 生产环境安全隐身模式</span>
<span class="c-attr">nextdoc4j.production</span>=<span class="c-num">false</span></code></pre>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.code-terminal-card {
  margin: 16px 0 24px;
  background: var(--vp-c-bg, #ffffff);
  border-radius: 14px;
  border: 1px solid var(--vp-c-divider, rgba(15, 23, 42, 0.09));
  box-shadow: 0 10px 30px -10px rgba(15, 23, 42, 0.06);
  overflow: hidden;
  transition: all 0.25s ease;
}

.code-terminal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 14px 0 10px;
  height: 42px;
  background: var(--vp-c-bg-soft, #f1f5f9);
  border-bottom: 1px solid var(--vp-c-divider, rgba(15, 23, 42, 0.08));
}

.terminal-tabs {
  display: flex;
  align-items: center;
  gap: 4px;
  overflow-x: auto;
  white-space: nowrap;
  height: 100%;
  scrollbar-width: none !important;
}
.terminal-tabs::-webkit-scrollbar { display: none !important; }

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
}
.terminal-tab-btn:hover {
  color: var(--vp-c-text-1, #0f172a);
  background: rgba(0, 0, 0, 0.04);
}
.terminal-tab-btn.active {
  color: #059669;
  background: var(--vp-c-bg, #ffffff);
  font-weight: 700;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

.terminal-actions {
  display: flex;
  align-items: center;
  gap: 8px;
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
  border: 1px solid var(--vp-c-divider, rgba(15, 23, 42, 0.12));
  background: var(--vp-c-bg, #ffffff);
  color: var(--vp-c-text-2, #475569);
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08);
  transition: all 0.2s ease;
}
.code-terminal-card:hover .floating-copy-btn,
.code-terminal-body-wrap:hover .floating-copy-btn {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
}
.floating-copy-btn:hover {
  color: #059669;
  border-color: rgba(5, 150, 105, 0.3);
  box-shadow: 0 6px 16px rgba(5, 150, 105, 0.16);
  transform: translateY(-1px) scale(1.05);
}
.floating-copy-btn svg { width: 14px; height: 14px; }
.floating-copy-btn.copied {
  border-color: #10b981 !important;
  color: #10b981 !important;
}

.code-terminal-body {
  padding: 18px 22px;
  overflow-x: auto;
  font-family: var(--vp-font-family-mono, monospace);
  font-size: 13px;
  line-height: 1.68;
  color: var(--vp-c-text-1, #1e293b);
  background: var(--vp-c-bg, #ffffff);
  scrollbar-width: thin;
}
.code-terminal-body pre {
  margin: 0;
  padding: 0;
  background: transparent;
}
.code-terminal-body code {
  font-family: inherit;
  font-size: inherit;
  color: inherit;
  background: transparent;
  padding: 0;
}

/* Syntax Tokens */
.c-kw { color: #7c3aed; font-weight: 600; }
.c-attr { color: #d97706; }
.c-str { color: #059669; }
.c-num { color: #db2777; }
.c-comment { color: #64748b; font-style: italic; }

:root.dark .terminal-tab-btn.active {
  color: #34d399;
  background: rgba(16, 185, 129, 0.16);
}
:root.dark .floating-copy-btn {
  background: #090d16;
  color: #cbd5e1;
}
:root.dark .c-kw { color: #c084fc; }
:root.dark .c-attr { color: #fbbf24; }
:root.dark .c-str { color: #34d399; }
:root.dark .c-num { color: #f472b6; }
:root.dark .c-comment { color: #94a3b8; }
</style>
