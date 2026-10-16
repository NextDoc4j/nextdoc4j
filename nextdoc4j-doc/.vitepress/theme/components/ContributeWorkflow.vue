<template>
  <div class="contribute-workflow-wrap">
    <div class="pr-workflow-list">
      <div class="pr-step-item">
        <div class="step-content">
          <h4><span class="step-number">1</span><span>Fork 官方仓库</span></h4>
          <p>在 Gitee 页面点击右上角 Fork 按钮，将 <code>nextdoc4j/nextdoc4j</code> 派生至您的个人账号空间。</p>
        </div>
      </div>

      <div class="pr-step-item">
        <div class="step-content">
          <h4><span class="step-number">2</span><span>克隆到本地开发环境</span></h4>
          <p>执行 <code>git clone https://gitee.com/your-username/nextdoc4j.git</code> 将代码拉取至本地环境。</p>
        </div>
      </div>

      <div class="pr-step-item">
        <div class="step-content">
          <h4><span class="step-number">3</span><span>基于 dev 分支创建特性分支</span></h4>
          <p>从最新的 <code>dev</code> 分支拉取新分支：<code>git checkout -b feat/your-feature-name</code>，请勿直接在 master 上开发。</p>
        </div>
      </div>

      <div class="pr-step-item">
        <div class="step-content">
          <h4><span class="step-number">4</span><span>本地编码与规范格式化</span></h4>
          <p>编写业务逻辑并补齐单元测试。提交前在项目根目录运行 <code>mvn compile</code> 进行 Spotless 自动代码格式化与合规校验。</p>
        </div>
      </div>

      <div class="pr-step-item">
        <div class="step-content">
          <h4><span class="step-number">5</span><span>推送并提交 Pull Request (PR)</span></h4>
          <p>推送到个人远程仓库后在 Gitee 发起 PR，目标分支选择官方 <code>dev</code>，按模板详细说明变更背景与测试结果。</p>
        </div>
      </div>

      <div class="pr-step-item">
        <div class="step-content">
          <h4><span class="step-number">6</span><span>签署 CLA 贡献者协议</span></h4>
          <p>机器人会引导签署 CLA 协议。请确保 Commit 中的作者邮箱与代码托管平台账号绑定的主邮箱一致。</p>
        </div>
      </div>

      <div class="pr-step-item">
        <div class="step-content">
          <h4><span class="step-number">7</span><span>等待核心团队 Review</span></h4>
          <p>核心团队会及时审阅代码并给出修改建议，讨论通过且自动化 CI 全绿后予以合并。</p>
        </div>
      </div>

      <div class="pr-step-item">
        <div class="step-content">
          <h4><span class="step-number">8</span><span>清理分支并同步最新代码</span></h4>
          <p>PR 合并后在本地删除临时分支，并从官方 upstream 同步最新提交，准备开启下一次贡献。</p>
        </div>
      </div>
    </div>

    <!-- Terminal Box -->
    <div class="code-terminal-card">
      <div class="code-terminal-header">
        <div class="terminal-dots">
          <span class="terminal-dot dot-r"></span>
          <span class="terminal-dot dot-y"></span>
          <span class="terminal-dot dot-g"></span>
        </div>
        <span class="terminal-label">PR 终端操作速记流</span>
        <button type="button" class="floating-copy-btn" :class="{ copied: isCopied }" @click="copyWorkflow">
          <svg v-if="!isCopied" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
          <svg v-else width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path>
          </svg>
          <span>{{ isCopied ? '已复制！' : '复制流程' }}</span>
        </button>
      </div>
      <div class="code-terminal-body">
        <pre><code># 1. 克隆并进入目录
git clone https://gitee.com/your-username/nextdoc4j.git
cd nextdoc4j

# 2. 从 dev 分支拉取新特性分支
git checkout -b feat/sse-virtual-scroll origin/dev

# 3. 本地编译与自动格式化规范
mvn compile

# 4. 提交并推送到个人远程
git commit -m "feat(debug): add virtual scroll support for SSE events"
git push -u origin feat/sse-virtual-scroll</code></pre>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const isCopied = ref(false)

const workflowCode = `# 1. 克隆并进入目录
git clone https://gitee.com/your-username/nextdoc4j.git
cd nextdoc4j

# 2. 从 dev 分支拉取新特性分支
git checkout -b feat/sse-virtual-scroll origin/dev

# 3. 本地编译与自动格式化规范
mvn compile

# 4. 提交并推送到个人远程
git commit -m "feat(debug): add virtual scroll support for SSE events"
git push -u origin feat/sse-virtual-scroll`

/**
 * 复制贡献流程的终端命令，方便贡献者直接在本地执行。
 * @returns {void} 复制完成后更新按钮状态，不返回业务数据。
 */
function copyWorkflow(): void {
  navigator.clipboard.writeText(workflowCode).then(() => {
    isCopied.value = true
    setTimeout(() => {
      isCopied.value = false
    }, 2000)
  })
}
</script>

<style scoped>
.contribute-workflow-wrap {
  margin: 0 0 24px;
}

.pr-workflow-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 20px;
}

.pr-step-item {
  display: block;
  background: var(--vp-c-bg, #ffffff);
  border: 1px solid var(--vp-c-divider, rgba(15, 23, 42, 0.08));
  border-radius: 10px;
  padding: 12px 18px;
  transition: all 0.2s ease;
}

.pr-step-item:hover {
  border-color: rgba(5, 150, 105, 0.3);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.04);
}

.dark .pr-step-item {
  background: var(--vp-c-bg-soft, #131b2e);
}

.dark .pr-step-item:hover {
  border-color: rgba(16, 185, 129, 0.35);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4);
}

.step-number {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: rgba(5, 150, 105, 0.1);
  color: #059669;
  font-weight: 800;
  font-size: 12.5px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  border: 1px solid rgba(5, 150, 105, 0.2);
}

.dark .step-number {
  background: rgba(16, 185, 129, 0.15);
  color: #34d399;
  border-color: rgba(16, 185, 129, 0.3);
}

.step-content h4 {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 750;
  color: var(--vp-c-text-1, #0f172a);
  margin: 0 0 3px;
}

.step-content p {
  font-size: 13px;
  color: var(--vp-c-text-2, #475569);
  margin: 0;
  line-height: 1.6;
}

.step-content code {
  color: #047857;
  background-color: rgba(5, 150, 105, 0.08);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.88em;
  font-weight: 600;
}

.dark .step-content code {
  color: #34d399;
  background-color: rgba(16, 185, 129, 0.14);
}

/* Terminal Box */
.code-terminal-card {
  background: var(--vp-c-bg, #ffffff);
  border: 1px solid var(--vp-c-divider, rgba(15, 23, 42, 0.08));
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
}

.dark .code-terminal-card {
  background: #0d1322;
}

.code-terminal-header {
  padding: 10px 16px;
  background: var(--vp-c-bg-soft, #f8fafc);
  border-bottom: 1px solid var(--vp-c-divider, rgba(15, 23, 42, 0.08));
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.dark .code-terminal-header {
  background: var(--vp-c-bg-soft, #131b2e);
}

.terminal-dots {
  display: flex;
  gap: 6px;
}

.terminal-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
}

.dot-r { background: #ff5f57; }
.dot-y { background: #febc2e; }
.dot-g { background: #28c840; }

.terminal-label {
  font-size: 11.5px;
  font-weight: 600;
  color: var(--vp-c-text-3, #94a3b8);
  font-family: var(--vp-font-mono, monospace);
}

.floating-copy-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 11.5px;
  color: var(--vp-c-text-2, #475569);
  background: var(--vp-c-bg, #ffffff);
  border: 1px solid var(--vp-c-divider, rgba(15, 23, 42, 0.1));
  cursor: pointer;
  transition: all 0.15s;
}

.floating-copy-btn:hover {
  color: #059669;
  border-color: #059669;
}

.floating-copy-btn.copied {
  color: #10b981;
  border-color: #10b981;
}

.dark .floating-copy-btn {
  background: var(--vp-c-bg-soft, #131b2e);
  color: var(--vp-c-text-2, #94a3b8);
}

.code-terminal-body {
  padding: 16px 20px;
  font-family: var(--vp-font-mono, monospace);
  font-size: 12.5px;
  line-height: 1.65;
  color: var(--vp-c-text-1, #0f172a);
  overflow-x: auto;
}

.dark .code-terminal-body {
  color: #f8fafc;
}

.code-terminal-body pre {
  margin: 0;
}
</style>
