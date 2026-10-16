<script setup lang="ts">
import { ref } from "vue";

const isCopied = ref(false);

const javaCode = `package com.example.demo.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;

@Tag(name = "用户管理模块", description = "提供用户的查询、创建与详情接口")
@RestController
@RequestMapping("/api/v1/users")
public class UserController {

    @Operation(summary = "根据用户 ID 查询详情", description = "根据用户主键返回用户详细档案信息")
    @GetMapping("/{id}")
    public UserVO getUserById(
            @Parameter(description = "用户唯一标识 ID", example = "1001")
            @PathVariable Long id) {
        return new UserVO(id, "NextDoc4j User", "dev@nextdoc4j.top");
    }
}`;

function copyCode() {
  navigator.clipboard.writeText(javaCode).then(() => {
    isCopied.value = true;
    setTimeout(() => {
      isCopied.value = false;
    }, 1800);
  });
}
</script>

<template>
  <div class="code-terminal-card">
    <div class="code-terminal-header">
      <div class="terminal-tabs">
        <span class="terminal-tab-btn active">UserController.java</span>
      </div>
      <div class="terminal-actions">
        <span class="terminal-lang-tag">java</span>
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
<pre><code><span class="c-kw">package</span> com.example.demo.controller;

<span class="c-kw">import</span> io.swagger.v3.oas.annotations.Operation;
<span class="c-kw">import</span> io.swagger.v3.oas.annotations.Parameter;
<span class="c-kw">import</span> io.swagger.v3.oas.annotations.tags.Tag;
<span class="c-kw">import</span> org.springframework.web.bind.annotation.*;

<span class="c-anno">@Tag</span>(name = <span class="c-str">"用户管理模块"</span>, description = <span class="c-str">"提供用户的查询、创建与详情接口"</span>)
<span class="c-anno">@RestController</span>
<span class="c-anno">@RequestMapping</span>(<span class="c-str">"/api/v1/users"</span>)
<span class="c-kw">public class</span> <span class="c-type">UserController</span> {

    <span class="c-anno">@Operation</span>(summary = <span class="c-str">"根据用户 ID 查询详情"</span>, description = <span class="c-str">"根据用户主键返回用户详细档案信息"</span>)
    <span class="c-anno">@GetMapping</span>(<span class="c-str">"/{id}"</span>)
    <span class="c-kw">public</span> <span class="c-type">UserVO</span> <span class="c-kw">getUserById</span>(
            <span class="c-anno">@Parameter</span>(description = <span class="c-str">"用户唯一标识 ID"</span>, example = <span class="c-str">"1001"</span>)
            <span class="c-anno">@PathVariable</span> <span class="c-type">Long</span> id) {
        <span class="c-kw">return new</span> <span class="c-type">UserVO</span>(id, <span class="c-str">"NextDoc4j User"</span>, <span class="c-str">"dev@nextdoc4j.top"</span>);
    }
}</code></pre>
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
  flex-grow: 1;
  height: 100%;
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
  font-weight: 700;
  color: var(--vp-c-brand-1, #059669);
  background: var(--vp-c-bg, #ffffff);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  white-space: nowrap;
  margin: 0;
}

:root.dark .terminal-tab-btn {
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
.c-kw { color: #7c3aed; font-weight: 600; }
.c-anno { color: #ea580c; }
.c-str { color: #059669; }
.c-type { color: #0284c7; }

:root.dark .c-kw { color: #c084fc; font-weight: 600; }
:root.dark .c-anno { color: #fb923c; }
:root.dark .c-str { color: #34d399; }
:root.dark .c-type { color: #38bdf8; }
</style>
