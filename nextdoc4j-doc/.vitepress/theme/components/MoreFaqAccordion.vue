<template>
  <div class="faq-container">
    <!-- FAQ 1: Spring Boot 版本兼容性 -->
    <div class="faq-card" :class="{ collapsed: collapsedStates[0] }">
      <button
        type="button"
        class="faq-card-header"
        :aria-expanded="!collapsedStates[0]"
        aria-controls="faq-body-0"
        @click="toggleFaq(0)"
      >
        <div class="faq-title">
          <span class="faq-q-badge">Q1</span>
          <span>启动时报 LiteWebJarsResourceResolver ClassNotFoundException 错误</span>
        </div>
        <svg class="faq-toggle-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>
      <div id="faq-body-0" v-show="!collapsedStates[0]" class="faq-card-body">
        <div class="alert-box alert-danger">
          <strong>错误现象：</strong> 应用启动时出现 <code>java.lang.ClassNotFoundException: org.springframework.web.servlet.resource.LiteWebJarsResourceResolver</code> 导致上下文启动失败。
        </div>

        <div class="alert-box alert-warning">
          <strong>根本原因：</strong> <code>LiteWebJarsResourceResolver</code> 是 <strong>Spring Boot 3.4.0</strong> 引入的新类。当前工程的 Spring Boot 版本低于 <code>3.4.0</code>（例如仍在 3.2.x 或 3.3.x）。
        </div>

        <h4 class="faq-subheading">版本兼容性矩阵（硬性要求）：</h4>
        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th>核心组件</th>
                <th>最低支持版本</th>
                <th>推荐版本</th>
                <th>说明</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Spring Boot</strong></td>
                <td><code>3.4.0</code></td>
                <td><code>3.5.x</code> / <code>4.x</code></td>
                <td>硬性基线，低于 3.4.0 无法加载资源解析器</td>
              </tr>
              <tr>
                <td><strong>SpringDoc</strong></td>
                <td><code>2.8.0</code> (Boot 3) / <code>3.0.0</code> (Boot 4)</td>
                <td><code>2.8.17</code> (Boot 3) / <code>3.0.3</code> (Boot 4)</td>
                <td>1.4.0 起由宿主工程自行引入 starter</td>
              </tr>
              <tr>
                <td><strong>JDK</strong></td>
                <td><code>17</code></td>
                <td><code>21+</code> (LTS)</td>
                <td>全面适配现代 Java 虚拟机</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="alert-box alert-tip">
          💡 <strong>解决方案：</strong> 请将宿主工程的 <code>spring-boot-starter-parent</code> 版本升级至 <code>3.4.0</code> 及以上（推荐 <code>3.5.x</code>）。
        </div>
      </div>
    </div>

    <!-- FAQ 2: 实体对象参数在文档中显示为空 -->
    <div class="faq-card" :class="{ collapsed: collapsedStates[1] }">
      <button
        type="button"
        class="faq-card-header"
        :aria-expanded="!collapsedStates[1]"
        aria-controls="faq-body-1"
        @click="toggleFaq(1)"
      >
        <div class="faq-title">
          <span class="faq-q-badge">Q2</span>
          <span>接口入参是自定义实体对象，但在 API 文档中属性列表为空或未展开</span>
        </div>
        <svg class="faq-toggle-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>
      <div id="faq-body-1" v-show="!collapsedStates[1]" class="faq-card-body">
        <div class="alert-box alert-danger">
          <strong>错误现象：</strong> 接口方法入参为 <code>UserDTO</code>，但文档中仅显示类型名称，内部字段（如 <code>name</code>, <code>age</code>）未展开。
        </div>

        <div class="alert-box alert-warning">
          <strong>原因剖析：</strong> SpringDoc 默认不会自动平铺展开自定义入参对象的成员属性，需要开启平铺参数解析。
        </div>

        <h4 class="faq-subheading">解决方案（推荐方式一 全局配置）：</h4>

        <!-- Code Group Switcher -->
        <div class="code-group-switch">
          <button
            type="button"
            class="code-group-btn"
            :class="{ active: configTab === 'yml' }"
            @click="configTab = 'yml'"
          >
            application.yml
          </button>
          <button
            type="button"
            class="code-group-btn"
            :class="{ active: configTab === 'properties' }"
            @click="configTab = 'properties'"
          >
            application.properties
          </button>
        </div>

        <div v-if="configTab === 'yml'" class="code-terminal-card">
          <div class="code-terminal-header">
            <div class="terminal-dots">
              <span class="terminal-dot dot-r"></span>
              <span class="terminal-dot dot-y"></span>
              <span class="terminal-dot dot-g"></span>
            </div>
            <span class="terminal-label">application.yml</span>
            <button type="button" class="floating-copy-btn" :class="{ copied: isYmlCopied }" @click="copyYml">
              <span>{{ isYmlCopied ? '已复制！' : '复制' }}</span>
            </button>
          </div>
          <div class="code-terminal-body">
            <pre><code>springdoc:
  # 将对象内的入参属性自动平铺展示（推荐）
  default-flat-param-object: true</code></pre>
          </div>
        </div>

        <div v-else class="code-terminal-card">
          <div class="code-terminal-header">
            <div class="terminal-dots">
              <span class="terminal-dot dot-r"></span>
              <span class="terminal-dot dot-y"></span>
              <span class="terminal-dot dot-g"></span>
            </div>
            <span class="terminal-label">application.properties</span>
            <button type="button" class="floating-copy-btn" :class="{ copied: isPropsCopied }" @click="copyProps">
              <span>{{ isPropsCopied ? '已复制！' : '复制' }}</span>
            </button>
          </div>
          <div class="code-terminal-body">
            <pre><code># 将对象内的入参属性自动平铺展示（推荐）
springdoc.default-flat-param-object=true</code></pre>
          </div>
        </div>
      </div>
    </div>

    <!-- FAQ 3: 入参展示不稳定/部分入参不显示 -->
    <div class="faq-card" :class="{ collapsed: collapsedStates[2] }">
      <button
        type="button"
        class="faq-card-header"
        :aria-expanded="!collapsedStates[2]"
        aria-controls="faq-body-2"
        @click="toggleFaq(2)"
      >
        <div class="faq-title">
          <span class="faq-q-badge">Q3</span>
          <span>入参展示不全、偶尔缺失或无法正确识别方法形参名称</span>
        </div>
        <svg class="faq-toggle-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>
      <div id="faq-body-2" v-show="!collapsedStates[2]" class="faq-card-body">
        <div class="alert-box alert-danger">
          <strong>错误现象：</strong> 接口的 <code>@RequestParam</code> 或 <code>@PathVariable</code> 形参名称在文档中变成 <code>arg0</code>, <code>arg1</code> 或偶尔丢失。
        </div>

        <div class="alert-box alert-warning">
          <strong>原因剖析：</strong> Java 编译器默认编译出的 <code>.class</code> 字节码中不保留真实的方法参数名。SpringDoc 无法通过反射精准推断入参名称。
        </div>

        <h4 class="faq-subheading">解决方案：在 Maven 编译插件中启用 -parameters</h4>

        <div class="code-terminal-card">
          <div class="code-terminal-header">
            <div class="terminal-dots">
              <span class="terminal-dot dot-r"></span>
              <span class="terminal-dot dot-y"></span>
              <span class="terminal-dot dot-g"></span>
            </div>
            <span class="terminal-label">pom.xml (maven-compiler-plugin)</span>
            <button type="button" class="floating-copy-btn" :class="{ copied: isXmlCopied }" @click="copyXml">
              <span>{{ isXmlCopied ? '已复制！' : '复制 XML' }}</span>
            </button>
          </div>
          <div class="code-terminal-body">
            <pre><code>&lt;plugin&gt;
    &lt;groupId&gt;org.apache.maven.plugins&lt;/groupId&gt;
    &lt;artifactId&gt;maven-compiler-plugin&lt;/artifactId&gt;
    &lt;configuration&gt;
        &lt;encoding&gt;${project.build.sourceEncoding}&lt;/encoding&gt;
        &lt;!-- 保留方法参数名以确保 SpringDoc 入参正常展示 --&gt;
        &lt;compilerArgument&gt;-parameters&lt;/compilerArgument&gt;
    &lt;/configuration&gt;
&lt;/plugin&gt;</code></pre>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const collapsedStates = ref([false, false, false])
const configTab = ref<'yml' | 'properties'>('yml')

const isYmlCopied = ref(false)
const isPropsCopied = ref(false)
const isXmlCopied = ref(false)

/**
 * 切换指定 FAQ 的展开状态，保持其他问题当前状态不变。
 * @param {number} index FAQ 在列表中的索引。
 * @returns {void} 更新响应式展开状态，不返回业务数据。
 */
function toggleFaq(index: number): void {
  collapsedStates.value[index] = !collapsedStates.value[index]
}

/**
 * 复制 YAML 形式的对象参数平铺配置。
 * @returns {void} 复制完成后更新按钮状态，不返回业务数据。
 */
function copyYml(): void {
  navigator.clipboard.writeText('springdoc:\n  default-flat-param-object: true').then(() => {
    isYmlCopied.value = true
    setTimeout(() => { isYmlCopied.value = false }, 2000)
  })
}

/**
 * 复制 Properties 形式的对象参数平铺配置。
 * @returns {void} 复制完成后更新按钮状态，不返回业务数据。
 */
function copyProps(): void {
  navigator.clipboard.writeText('springdoc.default-flat-param-object=true').then(() => {
    isPropsCopied.value = true
    setTimeout(() => { isPropsCopied.value = false }, 2000)
  })
}

/**
 * 复制 Maven 编译参数配置，帮助保留 Java 方法形参名称。
 * @returns {void} 复制完成后更新按钮状态，不返回业务数据。
 */
function copyXml(): void {
  const xml = `<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-compiler-plugin</artifactId>
    <configuration>
        <encoding>\${project.build.sourceEncoding}</encoding>
        <compilerArgument>-parameters</compilerArgument>
    </configuration>
</plugin>`
  navigator.clipboard.writeText(xml).then(() => {
    isXmlCopied.value = true
    setTimeout(() => { isXmlCopied.value = false }, 2000)
  })
}
</script>

<style scoped>
.faq-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin: 20px 0 32px;
}

.faq-card {
  background: var(--vp-c-bg, #ffffff);
  border: 1px solid var(--vp-c-divider, rgba(15, 23, 42, 0.08));
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
  transition: all 0.2s ease;
}

.faq-card:hover {
  border-color: rgba(5, 150, 105, 0.3);
  box-shadow: 0 8px 24px -6px rgba(0, 0, 0, 0.06);
}

.dark .faq-card {
  background: var(--vp-c-bg-soft, #131b2e);
}

.dark .faq-card:hover {
  border-color: rgba(16, 185, 129, 0.35);
  box-shadow: 0 8px 24px -6px rgba(0, 0, 0, 0.5);
}

.faq-card-header {
  width: 100%;
  padding: 16px 20px;
  background: var(--vp-c-bg-soft, #f8fafc);
  border: none;
  border-bottom: 1px solid var(--vp-c-divider, rgba(15, 23, 42, 0.08));
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  cursor: pointer;
  user-select: none;
  color: inherit;
  font: inherit;
  text-align: left;
}

.faq-card-header:focus-visible,
.code-group-btn:focus-visible,
.floating-copy-btn:focus-visible {
  outline: 2px solid var(--vp-c-brand-1, #059669);
  outline-offset: 2px;
}

.dark .faq-card-header {
  background: #0d1322;
}

.faq-title {
  font-size: 15px;
  font-weight: 750;
  color: var(--vp-c-text-1, #0f172a);
  display: flex;
  align-items: center;
  gap: 10px;
}

.dark .faq-title {
  color: #f8fafc;
}

.faq-q-badge {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  background: #059669;
  color: white;
  font-weight: 800;
  font-size: 12.5px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.dark .faq-q-badge {
  background: #10b981;
}

.faq-toggle-icon {
  color: var(--vp-c-text-3, #94a3b8);
  transition: transform 0.2s ease;
  flex-shrink: 0;
}

.faq-card.collapsed .faq-toggle-icon {
  transform: rotate(-90deg);
}

.faq-card.collapsed .faq-card-header {
  border-bottom: none;
}

.faq-card-body {
  padding: 20px 22px;
}

.faq-subheading {
  font-size: 13.5px;
  font-weight: 750;
  margin: 16px 0 8px;
  color: var(--vp-c-text-1, #0f172a);
}

.dark .faq-subheading {
  color: #f8fafc;
}

/* Alert Callouts */
.alert-box {
  padding: 13px 16px;
  border-radius: 10px;
  margin: 12px 0;
  font-size: 13px;
  line-height: 1.65;
}

.alert-danger {
  background: rgba(225, 29, 72, 0.08);
  border: 1px solid rgba(225, 29, 72, 0.25);
  color: #be123c;
}

.dark .alert-danger {
  color: #fda4af;
  background: rgba(225, 29, 72, 0.12);
}

.alert-warning {
  background: rgba(245, 158, 11, 0.08);
  border: 1px solid rgba(245, 158, 11, 0.25);
  color: #b45309;
}

.dark .alert-warning {
  color: #fde68a;
  background: rgba(245, 158, 11, 0.12);
}

.alert-tip {
  background: rgba(5, 150, 105, 0.08);
  border: 1px solid rgba(5, 150, 105, 0.25);
  color: var(--vp-c-text-1, #0f172a);
}

.dark .alert-tip {
  color: #f8fafc;
  background: rgba(16, 185, 129, 0.12);
}

.alert-box code {
  color: inherit;
  background: rgba(0, 0, 0, 0.06);
  padding: 1.5px 5px;
  border-radius: 4px;
  font-size: 0.88em;
  font-weight: 600;
}

.dark .alert-box code {
  background: rgba(255, 255, 255, 0.1);
}

/* Table */
.table-responsive {
  width: 100%;
  overflow-x: auto;
  margin: 12px 0 16px;
}

.faq-card table {
  width: 100%;
  border-collapse: collapse;
  border: 1px solid var(--vp-c-divider, rgba(15, 23, 42, 0.08));
  border-radius: 8px;
}

.faq-card th, .faq-card td {
  padding: 9px 14px;
  border: 1px solid var(--vp-c-divider, rgba(15, 23, 42, 0.08));
  text-align: left;
  font-size: 12.5px;
}

.faq-card th {
  background-color: var(--vp-c-bg-soft, #f8fafc);
  font-weight: 700;
  color: var(--vp-c-text-1, #0f172a);
}

.dark .faq-card th {
  background-color: #0d1322;
  color: #f8fafc;
}

.faq-card td code {
  color: #047857;
  background-color: rgba(5, 150, 105, 0.08);
  padding: 1.5px 5px;
  border-radius: 4px;
  font-size: 0.88em;
  font-weight: 600;
}

.dark .faq-card td code {
  color: #34d399;
  background-color: rgba(16, 185, 129, 0.14);
}

/* Code Terminal Inside FAQ */
.code-terminal-card {
  background: var(--vp-c-bg, #ffffff);
  border: 1px solid var(--vp-c-divider, rgba(15, 23, 42, 0.08));
  border-radius: 10px;
  overflow: hidden;
  margin: 12px 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
}

.dark .code-terminal-card {
  background: #0d1322;
}

.code-terminal-header {
  padding: 8px 14px;
  background: var(--vp-c-bg-soft, #f8fafc);
  border-bottom: 1px solid var(--vp-c-divider, rgba(15, 23, 42, 0.08));
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.dark .code-terminal-header {
  background: #0d1322;
}

.terminal-dots { display: flex; gap: 5px; }
.terminal-dot { width: 8px; height: 8px; border-radius: 50%; }
.dot-r { background: #ff5f57; } .dot-y { background: #febc2e; } .dot-g { background: #28c840; }
.terminal-label { font-size: 11px; font-weight: 600; color: var(--vp-c-text-3, #94a3b8); font-family: var(--vp-font-mono, monospace); }

.floating-copy-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 5px;
  font-size: 11px;
  color: var(--vp-c-text-2, #475569);
  background: var(--vp-c-bg, #ffffff);
  border: 1px solid var(--vp-c-divider, rgba(15, 23, 42, 0.1));
  cursor: pointer;
}

.floating-copy-btn:hover { color: #059669; border-color: #059669; }
.floating-copy-btn.copied { color: #10b981; border-color: #10b981; }

.dark .floating-copy-btn {
  background: var(--vp-c-bg-soft, #131b2e);
  color: var(--vp-c-text-2, #94a3b8);
}

.code-terminal-body {
  padding: 12px 16px;
  font-family: var(--vp-font-mono, monospace);
  font-size: 12px;
  line-height: 1.6;
  color: var(--vp-c-text-1, #0f172a);
  overflow-x: auto;
}

.dark .code-terminal-body {
  color: #f8fafc;
}

.code-terminal-body pre { margin: 0; }

/* Code Group Switcher */
.code-group-switch {
  display: inline-flex;
  gap: 4px;
  background: var(--vp-c-bg-mute, #f1f5f9);
  padding: 3px;
  border-radius: 6px;
  margin-top: 8px;
}

.dark .code-group-switch {
  background: #1e293b;
}

.code-group-btn {
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--vp-c-text-2, #475569);
  border: none;
  background: transparent;
  cursor: pointer;
  font-family: var(--vp-font-mono, monospace);
}

.dark .code-group-btn {
  color: #94a3b8;
}

.code-group-btn.active {
  background: var(--vp-c-bg, #ffffff);
  color: #059669;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
}

.dark .code-group-btn.active {
  background: #090d16;
  color: #34d399;
}
</style>
