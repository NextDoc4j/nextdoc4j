<script setup lang="ts">
import { ref } from "vue";

const currentTab = ref("tab-maven");
const isCopied = ref(false);

const snippets: Record<string, string> = {
  "tab-maven": `<!-- NextDoc4j 统一枚举展示插件 (Boot 3 / 4 共用) -->
<dependency>
    <groupId>top.nextdoc4j</groupId>
    <artifactId>nextdoc4j-plugin-enum</artifactId>
</dependency>`,

  "tab-yaml": `nextdoc4j:
  plugin:
    enum:
      # 启用枚举展示插件
      enabled: true`,

  "tab-java": `@Getter
@RequiredArgsConstructor
public enum OrderStatus implements EnumValue<String> {

    PENDING("PENDING", "待支付"),
    PAID("PAID", "已支付"),
    SHIPPED("SHIPPED", "已发货"),
    COMPLETED("COMPLETED", "已完成"),
    CANCELLED("CANCELLED", "已取消");

    private final String value;
    private final String description;
}`
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
  <div class="code-terminal-card" id="enumQuickTerminal">
    <div class="code-terminal-header">
      <div class="terminal-tabs">
        <button
          type="button"
          class="terminal-tab-btn"
          :class="{ active: currentTab === 'tab-maven' }"
          @click="currentTab = 'tab-maven'"
        >
          1. 引入依赖
        </button>
        <button
          type="button"
          class="terminal-tab-btn"
          :class="{ active: currentTab === 'tab-yaml' }"
          @click="currentTab = 'tab-yaml'"
        >
          2. 启用插件
        </button>
        <button
          type="button"
          class="terminal-tab-btn"
          :class="{ active: currentTab === 'tab-java' }"
          @click="currentTab = 'tab-java'"
        >
          3. 定义枚举
        </button>
      </div>
      <div class="terminal-actions">
        <span class="terminal-lang-tag">xml / java</span>
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
        <div v-show="currentTab === 'tab-maven'" class="code-pane active">
<pre><code><span class="c-comment">&lt;!-- NextDoc4j 统一枚举展示插件 (Boot 3 / 4 共用) --&gt;</span>
<span class="c-tag">&lt;dependency&gt;</span>
    <span class="c-tag">&lt;groupId&gt;</span>top.nextdoc4j<span class="c-tag">&lt;/groupId&gt;</span>
    <span class="c-tag">&lt;artifactId&gt;</span><span class="c-str">nextdoc4j-plugin-enum</span><span class="c-tag">&lt;/artifactId&gt;</span>
<span class="c-tag">&lt;/dependency&gt;</span></code></pre>
        </div>

        <div v-show="currentTab === 'tab-yaml'" class="code-pane active">
<pre><code><span class="c-kw">nextdoc4j</span>:
  <span class="c-attr">plugin</span>:
    <span class="c-attr">enum</span>:
      <span class="c-comment"># 启用枚举展示插件</span>
      <span class="c-attr">enabled</span>: <span class="c-num">true</span></code></pre>
        </div>

        <div v-show="currentTab === 'tab-java'" class="code-pane active">
<pre><code><span class="c-anno">@Getter</span>
<span class="c-anno">@RequiredArgsConstructor</span>
<span class="c-kw">public enum</span> <span class="c-str">OrderStatus</span> <span class="c-kw">implements</span> <span class="c-tag">EnumValue</span>&lt;<span class="c-tag">String</span>&gt; {

    PENDING(<span class="c-str">"PENDING"</span>, <span class="c-str">"待支付"</span>),
    PAID(<span class="c-str">"PAID"</span>, <span class="c-str">"已支付"</span>),
    SHIPPED(<span class="c-str">"SHIPPED"</span>, <span class="c-str">"已发货"</span>),
    COMPLETED(<span class="c-str">"COMPLETED"</span>, <span class="c-str">"已完成"</span>),
    CANCELLED(<span class="c-str">"CANCELLED"</span>, <span class="c-str">"已取消"</span>);

    <span class="c-kw">private final</span> <span class="c-tag">String</span> value;
    <span class="c-kw">private final</span> <span class="c-tag">String</span> description;
}</code></pre>
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
.c-tag { color: #2563eb; }
.c-anno { color: #ca8a04; font-weight: 600; }

:root.dark .terminal-tab-btn.active {
  color: #34d399;
  background: rgba(16, 185, 129, 0.16);
}
:root.dark .floating-copy-btn {
  background: #090d16;
  color: #cbd5e1;
}
:root.dark .code-terminal-body {
  background: var(--vp-c-bg-soft, #131b2e);
  color: #f8fafc;
}
:root.dark .c-kw { color: #c084fc; }
:root.dark .c-attr { color: #fbbf24; }
:root.dark .c-str { color: #34d399; }
:root.dark .c-num { color: #f472b6; }
:root.dark .c-comment { color: #94a3b8; }
:root.dark .c-tag { color: #60a5fa; }
:root.dark .c-anno { color: #facc15; }
</style>
