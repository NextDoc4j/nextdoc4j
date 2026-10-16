<template>
  <div class="join-group-wrapper">
    <!-- QR Codes Showcase Grid -->
    <div class="qr-showcase-grid">
      <!-- Core maintainer WeChat -->
      <div class="qr-card">
        <div class="qr-card-header">
          <div class="qr-card-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            <span>核心维护者微信</span>
          </div>
          <span class="qr-card-tag">MAINTAINER</span>
        </div>
        <div class="qr-image-box">
          <div class="qr-image-wrap">
            <img src="/images/contact/wechat-user.png" alt="NextDoc4j 核心维护者微信二维码" class="qr-img no-zoom" />
          </div>
          <p class="qr-card-desc">
            扫码添加核心维护者微信<br />
            添加时请备注：<span class="remark">nextdoc4j</span>
          </p>
        </div>
        <div class="qr-card-footer">
          <button type="button" class="copy-wechat-btn" :class="{ copied: isCopied }" @click="copyWechatId">
            <svg v-if="!isCopied" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path>
            </svg>
            <span>{{ isCopied ? '已复制备注！' : '复制备注：nextdoc4j' }}</span>
          </button>
        </div>
      </div>
    </div>

    <div class="tip-callout">
      <div class="tip-callout-header">
        <span class="tip-callout-badge">交流规范</span>
        <strong>社群交流规范</strong>
      </div>
      <p>
        沟通中请勿发布任何商业广告、推广引流及违法违规内容。提问前推荐先阅读
        <a href="/more/faq">常见问题 FAQ</a>，并附带 Spring Boot / SpringDoc 具体版本号及异常堆栈日志，以便维护者高效协助定位。
      </p>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const isCopied = ref(false)

/**
 * 复制添加维护者时需要填写的备注内容，便于维护者识别咨询或协作请求。
 * @returns {void} 复制操作完成后更新按钮状态，不返回业务数据。
 */
function copyWechatId(): void {
  const remark = 'nextdoc4j'
  navigator.clipboard.writeText(remark).then(() => {
    isCopied.value = true
    setTimeout(() => {
      isCopied.value = false
    }, 2000)
  })
}
</script>

<style scoped>
.join-group-wrapper {
  margin: 16px 0 32px;
}

.qr-showcase-grid {
  width: 100%;
  box-sizing: border-box;
  display: flex;
  justify-content: center;
  margin: 24px 0 32px;
}

.qr-card {
  width: min(100%, 440px);
  min-width: 0;
  box-sizing: border-box;
  background: var(--vp-c-bg-soft, #f8fafc);
  border: 1px solid var(--vp-c-divider, rgba(15, 23, 42, 0.08));
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  transition: all 0.25s ease;
}

.qr-card:hover {
  border-color: rgba(5, 150, 105, 0.35);
  box-shadow: 0 10px 28px -8px rgba(15, 23, 42, 0.08);
  transform: translateY(-2px);
}

.dark .qr-card {
  background: var(--vp-c-bg-soft, #131b2e);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.dark .qr-card:hover {
  border-color: rgba(16, 185, 129, 0.4);
  box-shadow: 0 12px 32px -8px rgba(0, 0, 0, 0.6);
}

.qr-card-header {
  width: 100%;
  box-sizing: border-box;
  padding: 12px 18px;
  background: var(--vp-c-bg-soft, #f8fafc);
  border-bottom: 1px solid var(--vp-c-divider, rgba(15, 23, 42, 0.08));
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.dark .qr-card-header {
  background: var(--vp-c-bg-soft, #131b2e);
}

.qr-card-title {
  font-size: 13.5px;
  font-weight: 700;
  color: var(--vp-c-text-1, #0f172a);
  display: flex;
  align-items: center;
  gap: 8px;
}

.qr-card-tag {
  font-size: 10.5px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 9999px;
  background: rgba(5, 150, 105, 0.1);
  color: #059669;
}

.dark .qr-card-tag {
  background: rgba(16, 185, 129, 0.15);
  color: #34d399;
}

.qr-image-box {
  width: 100%;
  box-sizing: border-box;
  flex: 0 0 auto;
  padding: 24px 20px 18px;
  background: inherit;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.qr-image-wrap {
  width: min(100%, 212px);
  aspect-ratio: 1;
  height: auto;
  box-sizing: border-box;
  background: #ffffff;
  padding: 10px;
  border-radius: 12px;
  border: 1px solid var(--vp-c-divider, rgba(15, 23, 42, 0.1));
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.06);
  display: grid;
  place-items: center;
  transition: transform 0.2s ease;
}

.qr-card:hover .qr-image-wrap {
  transform: scale(1.02);
}

.qr-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}

.qr-card-desc {
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  flex: 0 0 auto;
  font-size: 13px;
  color: var(--vp-c-text-2, #475569);
  margin: 14px 0 0;
  line-height: 1.6;
  overflow-wrap: anywhere;
}

.qr-card-desc strong {
  color: var(--vp-c-text-1, #0f172a);
}

.qr-card-desc .remark {
  color: #059669;
  font-weight: 700;
  font-family: var(--vp-font-mono, monospace);
  background: rgba(5, 150, 105, 0.08);
  padding: 2px 6px;
  border-radius: 4px;
}

.dark .qr-card-desc .remark {
  color: #34d399;
  background: rgba(16, 185, 129, 0.14);
}

.qr-card-footer {
  width: 100%;
  box-sizing: border-box;
  flex-shrink: 0;
  padding: 11px 16px;
  background: inherit;
  border-top: 1px solid var(--vp-c-divider, rgba(15, 23, 42, 0.06));
  margin-top: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dark .qr-card-footer {
  background: var(--vp-c-bg-soft, #131b2e);
}

.qr-tip-text {
  font-size: 12px;
  color: var(--vp-c-text-3, #94a3b8);
}

.copy-wechat-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  color: #059669;
  background: var(--vp-c-bg, #ffffff);
  border: 1px solid var(--vp-c-divider, rgba(15, 23, 42, 0.12));
  cursor: pointer;
  transition: all 0.15s ease;
}

.copy-wechat-btn:hover {
  background: rgba(5, 150, 105, 0.08);
  border-color: #059669;
}

.copy-wechat-btn.copied {
  background: #059669;
  color: #ffffff;
  border-color: #059669;
}

.dark .copy-wechat-btn {
  color: #34d399;
  background: var(--vp-c-bg-soft, #131b2e);
}

.dark .copy-wechat-btn.copied {
  background: #10b981;
  color: #ffffff;
}

.tip-callout {
  margin: 20px 0 32px;
  padding: 20px 24px;
  color: var(--vp-c-text-2, #475569);
  font-size: 13.5px;
  line-height: 1.7;
  background: linear-gradient(135deg, rgba(5, 150, 105, 0.09) 0%, rgba(14, 165, 233, 0.06) 100%);
  border: 1.5px solid rgba(5, 150, 105, 0.26);
  border-left: 5px solid var(--vp-c-brand-1, #059669);
  border-radius: 14px;
  box-shadow: 0 10px 30px -10px rgba(5, 150, 105, 0.1);
}

.tip-callout-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.tip-callout-badge {
  padding: 2px 8px;
  color: #ffffff;
  font-size: 11px;
  font-weight: 750;
  letter-spacing: 0.04em;
  background: var(--vp-c-brand-1, #059669);
  border-radius: 9999px;
}

.tip-callout strong {
  color: var(--vp-c-text-1, #0f172a);
  font-size: 15.5px;
  font-weight: 800;
}

.tip-callout p {
  margin: 0;
}

.dark .tip-callout {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.14) 0%, rgba(14, 165, 233, 0.08) 100%);
  border-color: rgba(16, 185, 129, 0.35);
  border-left-color: #10b981;
  box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.4);
}

.dark .tip-callout strong {
  color: #f8fafc;
}

.tip-callout a {
  color: var(--vp-c-brand-1, #059669);
  font-weight: 650;
  text-decoration: none;
}

@media (max-width: 640px) {
  .tip-callout {
    padding: 16px 18px;
    font-size: 13px;
  }
}
</style>
