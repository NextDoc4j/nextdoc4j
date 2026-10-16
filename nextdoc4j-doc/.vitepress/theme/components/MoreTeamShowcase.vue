<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

const isSponsorModalOpen = ref(false)
const copiedPayment = ref<'wechat' | 'alipay' | null>(null)
const memberAvatars = ref<Record<string, string>>({})
let copyResetTimer: ReturnType<typeof setTimeout> | undefined

interface TeamCacheMember {
  username?: string
  login?: string
  avatar_url?: string
}

interface TeamCache {
  members?: TeamCacheMember[]
}

/**
 * 打开赞助支持弹窗，展示微信与支付宝收款码。
 * @returns {void} 更新弹窗显示状态，不返回业务数据。
 */
function openSponsorModal(): void {
  isSponsorModalOpen.value = true
}

/**
 * 关闭赞助支持弹窗并恢复页面浏览状态。
 * @returns {void} 更新弹窗显示状态，不返回业务数据。
 */
function closeSponsorModal(): void {
  isSponsorModalOpen.value = false
}

/**
 * 处理赞助弹窗的键盘关闭操作。
 * @param {KeyboardEvent} event 浏览器分发的键盘事件。
 * @returns {void} 在按下 Escape 时关闭弹窗，不返回业务数据。
 */
function handleModalKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && isSponsorModalOpen.value) {
    closeSponsorModal()
  }
}

/**
 * 复制赞助备注，方便用户在支付时填写统一的项目备注。
 * @param {'wechat' | 'alipay'} payment 当前二维码所属的支付方式。
 * @returns {Promise<void>} 复制完成后更新按钮状态，不返回业务数据。
 */
async function copyRemark(payment: 'wechat' | 'alipay'): Promise<void> {
  if (!navigator.clipboard) {
    return
  }

  try {
    await navigator.clipboard.writeText('nextdoc4j')
    copiedPayment.value = payment

    if (copyResetTimer) {
      clearTimeout(copyResetTimer)
    }

    copyResetTimer = setTimeout(() => {
      copiedPayment.value = null
    }, 2000)
  } catch {
    copiedPayment.value = null
  }
}

/**
 * 从团队缓存中读取成员头像地址，加载失败时保留卡片中的首字母头像。
 * @returns {Promise<void>} 更新成员头像映射，不返回业务数据。
 */
async function loadMemberAvatars(): Promise<void> {
  try {
    const response = await fetch('/team-cache.json')
    if (!response.ok) {
      return
    }

    const cache = await response.json() as TeamCache
    memberAvatars.value = (cache.members || []).reduce<Record<string, string>>((avatars, member) => {
      const username = member.username || member.login
      if (username && member.avatar_url) {
        avatars[username] = member.avatar_url
      }
      return avatars
    }, {})
  } catch {
    // 缓存不可用时使用模板中的首字母头像作为降级展示。
  }
}

onMounted(async () => {
  document.addEventListener('keydown', handleModalKeydown)
  await loadMemberAvatars()
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleModalKeydown)

  if (copyResetTimer) {
    clearTimeout(copyResetTimer)
  }
})
</script>

<template>
  <div class="team-sponsor-wrapper">
    <div class="team-grid">
      <article class="member-card">
        <div class="member-top-row">
          <div class="member-avatar-wrap">
            <div class="member-avatar">
              <img v-if="memberAvatars.wenjing_1129" :src="memberAvatars.wenjing_1129" alt="wenjing_1129 头像" />
              <span v-else>W</span>
            </div>
          </div>
          <div class="member-social-corner">
            <a href="https://github.com/Mm-Dxx" target="_blank" rel="noopener noreferrer" class="social-btn github" title="GitHub">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
              </svg>
            </a>
            <a href="https://gitee.com/wenjing_1129" target="_blank" rel="noopener noreferrer" class="social-btn gitee" title="Gitee">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M11.984 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.016 0zm6.09 5.333c.328 0 .593.266.592.593v1.482a.594.594 0 0 1-.593.592H9.777c-.982 0-1.778.796-1.778 1.778v5.63c0 .327.266.592.593.592h5.63c.982 0 1.778-.796 1.778-1.778v-.296a.593.593 0 0 0-.592-.593h-4.15a.592.592 0 0 1-.592-.592v-1.482a.593.593 0 0 1 .593-.592h6.815c.327 0 .593.265.593.592v3.408a4 4 0 0 1-4 4H5.926a.593.593 0 0 1-.593-.593V9.778a4.444 4.444 0 0 1 4.445-4.444h8.296z" />
              </svg>
            </a>
          </div>
        </div>

        <div class="member-header-info">
          <div class="member-name-row">
            <span class="member-name">wenjing_1129</span>
            <span class="member-role">前端架构师</span>
          </div>
          <div class="member-location">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span>中国 · 浙江杭州</span>
          </div>
        </div>

        <p class="member-bio">
          负责 NextDoc4j 整体前端工程架构设计、响应式交互系统与 SSE 实时数据流调试面板。
        </p>

        <div class="member-skills-list">
          <span class="skill-tag">Vue 3</span>
          <span class="skill-tag">TypeScript</span>
          <span class="skill-tag">Vben 5</span>
          <span class="skill-tag">Tailwind</span>
        </div>
      </article>

      <article class="member-card member-blue">
        <div class="member-top-row">
          <div class="member-avatar-wrap">
            <div class="member-avatar member-avatar-blue">
              <img v-if="memberAvatars['dom-w']" :src="memberAvatars['dom-w']" alt="dom-w 头像" />
              <span v-else>D</span>
            </div>
          </div>
          <div class="member-social-corner">
            <a href="https://github.com/Time-w" target="_blank" rel="noopener noreferrer" class="social-btn github" title="GitHub">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
              </svg>
            </a>
            <a href="https://gitee.com/dom-w" target="_blank" rel="noopener noreferrer" class="social-btn gitee" title="Gitee">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M11.984 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.016 0zm6.09 5.333c.328 0 .593.266.592.593v1.482a.594.594 0 0 1-.593.592H9.777c-.982 0-1.778.796-1.778 1.778v5.63c0 .327.266.592.593.592h5.63c.982 0 1.778-.796 1.778-1.778v-.296a.593.593 0 0 0-.592-.593h-4.15a.592.592 0 0 1-.592-.592v-1.482a.593.593 0 0 1 .593-.592h6.815c.327 0 .593.265.593.592v3.408a4 4 0 0 1-4 4H5.926a.593.593 0 0 1-.593-.593V9.778a4.444 4.444 0 0 1 4.445-4.444h8.296z" />
              </svg>
            </a>
          </div>
        </div>

        <div class="member-header-info">
          <div class="member-name-row">
            <span class="member-name">dom-w</span>
            <span class="member-role member-role-blue">后端架构师</span>
          </div>
          <div class="member-location">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span>中国 · 浙江杭州</span>
          </div>
        </div>

        <p class="member-bio">
          负责 NextDoc4j Starter 体系、Boot 3/4 统一适配、Gateway 微服务聚合推导与 Sa-Token 插件。
        </p>

        <div class="member-skills-list">
          <span class="skill-tag">Java 21</span>
          <span class="skill-tag">Boot 3/4</span>
          <span class="skill-tag">OpenAPI 3</span>
          <span class="skill-tag">Gateway</span>
        </div>
      </article>
    </div>

    <div class="join-card">
      <div class="join-card-text">
        <h3>诚邀加入 NextDoc4j 社区</h3>
        <p>无论您是提交 Bug、优化文档还是开发核心插件，我们都期待您的身影。</p>
      </div>
      <a href="/more/contribute" class="join-btn">
        <span>查看贡献指南</span>
        <span aria-hidden="true">→</span>
      </a>
    </div>

    <div class="sponsor-action-card">
      <h3 class="sponsor-card-title">支持 NextDoc4j 开源开发</h3>
      <p class="sponsor-card-desc">
        您的每一份赞助都将用于 NextDoc4j 文档站点 CDN 流量加速、自动化测试基础设施以及持续的新版本功能迭代。
      </p>
      <button type="button" class="sponsor-modal-btn" @click="openSponsorModal">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <line x1="2" y1="10" x2="22" y2="10" />
        </svg>
        <span>赞助支持项目</span>
      </button>
    </div>
  </div>

  <div
    v-if="isSponsorModalOpen"
    class="modal-overlay"
    role="dialog"
    aria-modal="true"
    aria-labelledby="sponsor-modal-title"
    @click.self="closeSponsorModal"
  >
    <div class="modal-dialog">
      <div class="modal-header">
        <span id="sponsor-modal-title" class="modal-title">支持 NextDoc4j 开源开发</span>
        <button type="button" class="modal-close-btn" title="关闭" aria-label="关闭" @click="closeSponsorModal">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div class="modal-body">
        <div class="modal-qr-row">
          <div class="qr-card-item">
            <div class="qr-card-header">
              <div class="qr-card-title">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="#07c160" aria-hidden="true">
                  <path d="M8.5 4C4.36 4 1 6.91 1 10.5c0 2.02 1.07 3.82 2.76 4.98l-.72 2.15 2.52-1.26c.77.21 1.58.33 2.44.33.25 0 .5-.01.74-.03-.23-.55-.36-1.15-.36-1.77 0-2.87 2.69-5.2 6-5.2.22 0 .43.01.65.04C14.39 6.28 11.69 4 8.5 4zm7.5 6.4c-3.04 0-5.5 2.01-5.5 4.5 0 1.45.84 2.73 2.14 3.55l-.56 1.68 1.96-.98c.6.17 1.23.25 1.96.25 3.04 0 5.5-2.01 5.5-4.5s-2.46-4.5-5.5-4.5z" />
                </svg>
                <span>微信赞助</span>
              </div>
              <span class="qr-tag">WECHAT PAY</span>
            </div>
            <div class="qr-img-box">
              <div class="qr-img-wrap">
                <img src="/images/paymentcode/wechat-qr.jpg" alt="微信收款码" class="qr-img no-zoom" />
              </div>
              <p class="qr-desc">
                扫码支持开源开发<br />
                添加时请备注：<span class="remark">nextdoc4j</span>
              </p>
            </div>
            <div class="qr-card-footer">
              <button
                type="button"
                class="copy-wechat-btn"
                :class="{ copied: copiedPayment === 'wechat' }"
                @click="copyRemark('wechat')"
              >
                <svg v-if="copiedPayment !== 'wechat'" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                <svg v-else width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
                  <path d="M5 13l4 4L19 7" />
                </svg>
                <span>{{ copiedPayment === 'wechat' ? '已复制备注！' : '复制备注：nextdoc4j' }}</span>
              </button>
            </div>
          </div>

          <div class="qr-card-item">
            <div class="qr-card-header">
              <div class="qr-card-title">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="#1677ff" aria-hidden="true">
                  <path d="M21.5 2h-19C1.1 2 0 3.1 0 4.5v15C0 20.9 1.1 22 2.5 22h19c1.4 0 2.5-1.1 2.5-2.5v-15C24 3.1 22.9 2 21.5 2zM8.8 6.8h6.4v1.5h-2.5c.6 1 1.4 1.9 2.5 2.6l-1 1.3c-.9-.6-1.6-1.4-2.2-2.3-.4 1.4-1.2 2.8-2.5 3.8l-1.3-1.1c1.2-.9 1.8-2 2.1-3.2H7.7V6.8h1.1zm8.7 10.9c-.8.8-2.1 1.5-3.8 2l-.8-1.5c1.4-.4 2.4-.9 3-1.5l1.6 1z" />
                </svg>
                <span>支付宝赞助</span>
              </div>
              <span class="qr-tag alipay-tag">ALIPAY</span>
            </div>
            <div class="qr-img-box">
              <div class="qr-img-wrap">
                <img src="/images/paymentcode/alipay-qr.jpg" alt="支付宝收款码" class="qr-img no-zoom" />
              </div>
              <p class="qr-desc">
                扫码支持开源开发<br />
                添加时请备注：<span class="remark">nextdoc4j</span>
              </p>
            </div>
            <div class="qr-card-footer">
              <button
                type="button"
                class="copy-wechat-btn"
                :class="{ copied: copiedPayment === 'alipay' }"
                @click="copyRemark('alipay')"
              >
                <svg v-if="copiedPayment !== 'alipay'" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                <svg v-else width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
                  <path d="M5 13l4 4L19 7" />
                </svg>
                <span>{{ copiedPayment === 'alipay' ? '已复制备注！' : '复制备注：nextdoc4j' }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-footer">感谢所有开源同行与社区用户的认可与支持！</div>
    </div>
  </div>
</template>

<style scoped>
.team-sponsor-wrapper {
  margin: 16px 0 32px;
}

.team-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 18px;
  margin: 20px 0 28px;
}

@media (max-width: 640px) {
  .team-grid {
    grid-template-columns: 1fr;
  }
}

.member-card {
  position: relative;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 22px;
  background: var(--vp-c-bg, #ffffff);
  border: 1px solid var(--vp-c-divider, rgba(15, 23, 42, 0.08));
  border-radius: 16px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.member-card::before {
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  height: 3px;
  background: linear-gradient(90deg, #059669, #34d399);
  content: '';
  opacity: 0;
  transition: opacity 0.3s ease;
}

.member-card.member-blue::before {
  background: linear-gradient(90deg, #2563eb, #60a5fa);
}

.member-card:hover {
  border-color: rgba(5, 150, 105, 0.35);
  box-shadow: 0 6px 16px -2px rgba(15, 23, 42, 0.06);
  transform: translateY(-3px);
}

.member-card:hover::before {
  opacity: 1;
}

.dark .member-card {
  background: var(--vp-c-bg-soft, #131b2e);
}

.dark .member-card:hover {
  border-color: rgba(52, 211, 153, 0.35);
}

.member-top-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 14px;
}

.member-avatar-wrap {
  flex-shrink: 0;
}

.member-avatar {
  display: grid;
  place-items: center;
  overflow: hidden;
  width: 54px;
  height: 54px;
  color: #ffffff;
  font-size: 20px;
  font-weight: 800;
  background: linear-gradient(135deg, #059669, #10b981);
  border-radius: 14px;
  box-shadow: 0 4px 12px rgba(5, 150, 105, 0.25);
}

.member-avatar-blue {
  background: linear-gradient(135deg, #2563eb, #3b82f6);
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
}

.member-avatar img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.member-social-corner {
  display: flex;
  align-items: center;
  gap: 6px;
}

.social-btn {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  color: #0f172a;
  text-decoration: none;
  background: #f1f5f9;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  opacity: 1;
  transition: transform 0.2s ease;
}

.social-btn.github {
  color: #0f172a;
}

.social-btn.gitee {
  color: #c71d23;
  background: rgba(199, 29, 35, 0.08);
  border-color: rgba(199, 29, 35, 0.28);
}

.dark .social-btn.github {
  color: #f8fafc;
  background: #1e293b;
  border-color: #475569;
}

.dark .social-btn.gitee {
  color: #ff7a83;
  background: rgba(199, 29, 35, 0.18);
  border-color: rgba(255, 122, 131, 0.38);
}

.social-btn:hover {
  transform: scale(1.08);
}

.member-header-info {
  margin-bottom: 8px;
}

.member-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.member-name {
  color: var(--vp-c-text-1, #0f172a);
  font-size: 16px;
  font-weight: 800;
}

.dark .member-name {
  color: #f8fafc;
}

.member-role {
  padding: 2px 8px;
  color: #059669;
  font-size: 11px;
  font-weight: 700;
  background: rgba(5, 150, 105, 0.1);
  border: 1px solid rgba(5, 150, 105, 0.2);
  border-radius: 6px;
}

.member-role-blue {
  color: #2563eb;
  background: rgba(37, 99, 235, 0.1);
  border-color: rgba(37, 99, 235, 0.2);
}

.dark .member-role {
  color: #34d399;
  background: rgba(52, 211, 153, 0.15);
  border-color: rgba(52, 211, 153, 0.3);
}

.dark .member-role-blue {
  color: #93c5fd;
  background: rgba(59, 130, 246, 0.15);
  border-color: rgba(59, 130, 246, 0.3);
}

.member-location {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--vp-c-text-3, #94a3b8);
  font-size: 12px;
}

.member-bio {
  flex-grow: 1;
  margin: 10px 0 14px;
  color: var(--vp-c-text-2, #475569);
  font-size: 13px;
  line-height: 1.6;
}

.member-skills-list {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  padding-top: 12px;
  border-top: 1px dashed var(--vp-c-divider, rgba(15, 23, 42, 0.08));
}

.skill-tag {
  padding: 2px 7px;
  color: var(--vp-c-text-2, #475569);
  font-family: var(--vp-font-mono, monospace);
  font-size: 11px;
  font-weight: 600;
  background: var(--vp-c-bg-mute, #f1f5f9);
  border: 1px solid var(--vp-c-divider, rgba(15, 23, 42, 0.08));
  border-radius: 5px;
}

.dark .skill-tag {
  color: #94a3b8;
  background: #1e293b;
}

.join-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 20px;
  margin-bottom: 32px;
  background: rgba(5, 150, 105, 0.04);
  border: 1px dashed rgba(5, 150, 105, 0.35);
  border-radius: 12px;
}

.join-card h3 {
  margin-bottom: 2px;
  color: var(--vp-c-brand-1, #059669);
  font-size: 14px;
  font-weight: 750;
}

.join-card p {
  color: var(--vp-c-text-2, #475569);
  font-size: 12.5px;
}

.join-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  padding: 6px 14px;
  color: #ffffff !important;
  font-size: 12.5px;
  font-weight: 650;
  text-decoration: none;
  white-space: nowrap;
  background: var(--vp-c-brand-1, #059669);
  border-radius: 6px;
}

.sponsor-action-card {
  padding: 28px 24px;
  text-align: center;
  background: var(--vp-c-bg, #ffffff);
  border: 1px solid var(--vp-c-divider, rgba(15, 23, 42, 0.08));
  border-radius: 16px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.dark .sponsor-action-card {
  background: var(--vp-c-bg-soft, #131b2e);
}

.sponsor-card-title {
  margin-bottom: 6px;
  color: var(--vp-c-text-1, #0f172a);
  font-size: 17px;
  font-weight: 800;
}

.dark .sponsor-card-title {
  color: #f8fafc;
}

.sponsor-card-desc {
  max-width: 500px;
  margin: 0 auto 20px;
  color: var(--vp-c-text-2, #475569);
  font-size: 13.5px;
  line-height: 1.6;
}

.sponsor-modal-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-width: 168px;
  padding: 10px 24px;
  color: #ffffff;
  font-size: 13.5px;
  font-weight: 700;
  background: var(--vp-c-brand-1, #059669);
  border: 0;
  border-radius: 8px;
  box-shadow: 0 4px 14px rgba(5, 150, 105, 0.25);
  cursor: pointer;
  transition: all 0.2s ease;
}

.sponsor-modal-btn:hover {
  box-shadow: 0 6px 18px rgba(5, 150, 105, 0.35);
  transform: translateY(-2px);
}

.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px 16px;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(8px);
}

.modal-dialog {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 620px;
  max-height: 90vh;
  overflow: hidden;
  background: var(--vp-c-bg, #ffffff);
  border: 1px solid var(--vp-c-divider, rgba(15, 23, 42, 0.08));
  border-radius: 16px;
  box-shadow: 0 18px 40px -4px rgba(15, 23, 42, 0.12);
}

.dark .modal-dialog {
  background: var(--vp-c-bg-soft, #131b2e);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  padding: 14px 20px;
  background: var(--vp-c-bg-soft, #f8fafc);
  border-bottom: 1px solid var(--vp-c-divider, rgba(15, 23, 42, 0.08));
}

.dark .modal-header,
.dark .modal-footer {
  background: rgba(255, 255, 255, 0.02);
}

.modal-title {
  color: var(--vp-c-text-1, #0f172a);
  font-size: 14.5px;
  font-weight: 750;
}

.dark .modal-title {
  color: #f8fafc;
}

.modal-close-btn {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  color: var(--vp-c-text-2, #475569);
  background: transparent;
  border: 0;
  border-radius: 6px;
  cursor: pointer;
}

.modal-close-btn:hover {
  background: var(--vp-c-bg-mute, #f1f5f9);
}

.modal-body {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}

.modal-qr-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.qr-card-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow: hidden;
  text-align: center;
  background: var(--vp-c-bg-soft, #f8fafc);
  border: 1px solid var(--vp-c-divider, rgba(15, 23, 42, 0.08));
  border-radius: 12px;
}

.qr-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  flex-shrink: 0;
  padding: 10px 14px;
  border-bottom: 1px solid var(--vp-c-divider, rgba(15, 23, 42, 0.08));
}

.qr-card-title {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--vp-c-text-1, #0f172a);
  font-size: 13px;
  font-weight: 700;
}

.qr-tag {
  padding: 2px 7px;
  color: #059669;
  font-size: 10px;
  font-weight: 750;
  background: rgba(5, 150, 105, 0.1);
  border-radius: 9999px;
}

.qr-tag.alipay-tag {
  color: #1677ff;
  background: rgba(22, 119, 255, 0.1);
}

.qr-img-box {
  display: flex;
  flex: 0 0 auto;
  flex-direction: column;
  align-items: center;
  width: 100%;
  box-sizing: border-box;
  padding: 24px 20px 18px;
  background: inherit;
}

.qr-img-wrap {
  display: grid;
  flex-shrink: 0;
  place-items: center;
  width: min(100%, 212px);
  aspect-ratio: 1;
  height: auto;
  box-sizing: border-box;
  background: #ffffff;
  padding: 10px;
  border: 1px solid var(--vp-c-divider, rgba(15, 23, 42, 0.1));
  border-radius: 12px;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.06);
}

.qr-img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.qr-desc {
  margin: 10px 0 0;
  color: var(--vp-c-text-2, #475569);
  font-size: 12px;
  line-height: 1.5;
}

.qr-desc .remark {
  padding: 1.5px 5px;
  color: #059669;
  font-family: var(--vp-font-family-mono, monospace);
  font-weight: 700;
  background: rgba(5, 150, 105, 0.08);
  border-radius: 4px;
}

.dark .qr-desc .remark {
  color: #34d399;
  background: rgba(16, 185, 129, 0.14);
}

.qr-card-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  flex-shrink: 0;
  margin-top: auto;
  padding: 9px 14px;
  border-top: 1px solid var(--vp-c-divider, rgba(15, 23, 42, 0.06));
}

.copy-wechat-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 12px;
  color: #059669;
  font-size: 11.5px;
  font-weight: 600;
  background: var(--vp-c-bg, #ffffff);
  border: 1px solid var(--vp-c-divider, rgba(15, 23, 42, 0.12));
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.copy-wechat-btn:hover {
  background: rgba(5, 150, 105, 0.08);
  border-color: #059669;
}

.copy-wechat-btn.copied {
  color: #ffffff;
  background: #059669;
  border-color: #059669;
}

.dark .copy-wechat-btn {
  color: #34d399;
  background: var(--vp-c-bg-soft, #131b2e);
}

.dark .copy-wechat-btn.copied {
  color: #ffffff;
  background: #10b981;
}

.modal-footer {
  flex-shrink: 0;
  padding: 10px 20px;
  color: var(--vp-c-text-2, #475569);
  font-size: 12px;
  text-align: center;
  background: var(--vp-c-bg-soft, #f8fafc);
  border-top: 1px solid var(--vp-c-divider, rgba(15, 23, 42, 0.08));
}

@media (max-width: 560px) {
  .modal-qr-row {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .join-card {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
