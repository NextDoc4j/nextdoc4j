<template>
  <div class="sponsor-section">
    <!-- 标题区域 -->
    <div class="sponsor-header">
      <h2> 支持我们的开源项目</h2>
      <p class="sponsor-subtitle">您的赞助将帮助我们持续改进产品，为社区提供更好的服务</p>
    </div>

    <!-- 赞助按钮 -->
    <div class="sponsor-action">
      <div class="coffee-card">
        <div class="coffee-header">
          <span class="coffee-icon"></span>
          <h3>请我们喝咖啡</h3>
          <p class="coffee-desc">小额赞助，支持日常开发</p>
        </div>

        <div class="coffee-actions">
          <button @click="showPaymentModal = true" class="sponsor-btn primary">
            <span class="btn-icon"></span>
            请我喝咖啡
          </button>
        </div>
      </div>
    </div>

    <!-- 支付弹窗 -->
    <div v-if="showPaymentModal" class="payment-modal-overlay" @click.self="showPaymentModal = false">
      <div class="payment-modal">
        <div class="modal-header">
          <h3>每一份赞助都是对我们持续维护开源的认可 </h3>
          <button @click="showPaymentModal = false" class="close-btn">
            <svg viewBox="0 0 24 24" width="24" height="24">
              <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>

        <div class="payment-content">
          <div class="qr-codes-horizontal">
            <!-- 微信支付收款码 -->
            <div class="qr-item">
              <img :src="config.sponsor?.payments?.wechat || '/images/paymentcode/wechat-qr.jpg'" alt="微信收款码" class="qr-image" />
            </div>

            <!-- 支付宝收款码 -->
            <div class="qr-item">
              <img :src="config.sponsor?.payments?.alipay || '/images/paymentcode/alipay-qr.jpg'" alt="支付宝收款码" class="qr-image" />
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <p class="gratitude-text">
            <span class="heart"></span>
            {{ config.sponsor?.gratitudeText || '每一份支持都是我们前进的动力' }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

// 类型定义
interface PaymentMethods {
  alipay?: string
  wechat?: string
}

interface SponsorConfig {
  enabled?: boolean
  payments?: PaymentMethods
  gratitudeText?: string
  suggestedAmounts?: number[]
  supporters?: Array<{
    name: string
    avatar: string
    amount?: number
  }>
}

interface TeamConfig {
  sponsor?: SponsorConfig
}

// 响应式数据
const showPaymentModal = ref<boolean>(false)
const selectedAmount = ref<number>(10)
const config = ref<TeamConfig>({})

// 建议金额（从配置文件获取）
const suggestedAmounts = ref<number[]>([10, 20, 50, 100])

// 支持者列表（从配置文件获取）
const supporters = ref<Array<{
  name: string
  avatar: string
  amount?: number
}>>([])

// 加载配置文件
const loadConfig = async (): Promise<void> => {
  try {
    const configModule = await import('/more/team/team.config.ts')
    config.value = configModule.default || configModule
  } catch (error) {
    console.warn(' 赞助组件未找到 team.config.ts 文件，使用默认配置')
    config.value = {
      sponsor: {
        enabled: true,
        payments: {
          alipay: '/images/paymentcode/alipay-qr.jpg',
          wechat: '/images/paymentcode/wechat-qr.jpg',
        },
        gratitudeText: '每一份支持都是我们前进的动力',
        supporters: []
      }
    }
  }
}

// 键盘事件处理函数
const handleKeydown = (e: KeyboardEvent): void => {
  if (e.key === 'Escape' && showPaymentModal.value) {
    showPaymentModal.value = false
  }
}

// 组件挂载时的操作
onMounted(async () => {
  await loadConfig()

  if (config.value.sponsor?.suggestedAmounts) {
    suggestedAmounts.value = config.value.sponsor.suggestedAmounts
  }

  if (config.value.sponsor?.supporters) {
    supporters.value = config.value.sponsor.supporters
  }

  // 设置默认选中金额
  selectedAmount.value = suggestedAmounts.value[0]

  // 只在客户端添加键盘事件监听器
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    document.addEventListener('keydown', handleKeydown)
  }
})

// 组件卸载时清理事件监听器
onUnmounted(() => {
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    document.removeEventListener('keydown', handleKeydown)
  }
})
</script>

<style scoped>
.sponsor-section {
  max-width: 800px;
  margin: 2rem auto;
  padding: 2rem;
  text-align: center;
}

.sponsor-header h2 {
  font-size: 2rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
  margin-bottom: 0.5rem;
}

.sponsor-subtitle {
  color: var(--vp-c-text-2);
  font-size: 1.1rem;
  line-height: 1.6;
  margin-bottom: 3rem;
}

.coffee-card {
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.05), rgba(22, 163, 74, 0.03));
  border: 2px solid var(--vp-c-divider-light);
  border-radius: 24px;
  padding: 3rem 2rem;
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  position: relative;
  overflow: hidden;
  max-width: 400px;
  margin: 0 auto;
}

.coffee-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, var(--vp-c-green-1), var(--vp-c-green-2));
  transform: scaleX(0);
  transition: transform 0.4s ease;
}

.coffee-card:hover::before {
  transform: scaleX(1);
}

.coffee-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 20px 40px rgba(34, 197, 94, 0.15);
  border-color: var(--vp-c-green-1);
}

.coffee-header {
  margin-bottom: 2rem;
}

.coffee-icon {
  font-size: 3rem;
  display: block;
  margin-bottom: 1rem;
  animation: bounce 2s infinite;
}

.coffee-card h3 {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
  margin-bottom: 0.5rem;
}

.coffee-desc {
  color: var(--vp-c-text-2);
  font-size: 1rem;
  margin: 0;
}

.coffee-actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.sponsor-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem 2rem;
  border-radius: 12px;
  font-size: 1.1rem;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: all 0.3s ease;
  background: var(--vp-c-green-1);
  color: white;
  box-shadow: 0 4px 16px rgba(34, 197, 94, 0.3);
}

.sponsor-btn:hover {
  background: var(--vp-c-green-2);
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(34, 197, 94, 0.4);
}

.btn-icon {
  font-size: 1.2em;
  animation: pulse 2s infinite;
}

/* 弹窗样式 */
.payment-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.3s ease;
}

.payment-modal {
  background: var(--vp-c-bg);
  border-radius: 20px;
  width: 90vw;
  max-width: 750px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.2);
  animation: slideUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 2rem;
  border-bottom: 2px solid var(--vp-c-divider-light);
}

.modal-header h3 {
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  padding: 0.5rem;
  border-radius: 8px;
  cursor: pointer;
  color: var(--vp-c-text-2);
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
}

/* 左右平铺的二维码 */
.payment-content {
  padding: 2.5rem 2rem;
}

.qr-codes-horizontal {
  display: flex;
  flex-direction: row;
  gap: 3rem;
  justify-content: center;
  align-items: center;
}

.qr-item {
  flex: 1;
  display: flex;
  justify-content: center;
  max-width: 320px;
}

.qr-image {
  width: 100%;
  height: auto;
  object-fit: contain;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  background: white;
}

.modal-footer {
  padding: 1.5rem 2rem;
  border-top: 1px solid var(--vp-c-divider-light);
  background: var(--vp-c-bg-soft);
}

.gratitude-text {
  margin: 0;
  color: var(--vp-c-text-2);
  font-size: 0.95rem;
  text-align: center;
}

.heart {
  font-size: 1.1em;
  animation: heartbeat 1.5s ease-in-out infinite;
}

/* 动画效果 */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes bounce {
  0%, 20%, 53%, 80%, 100% {
    transform: translateY(0);
  }
  40%, 43% {
    transform: translateY(-8px);
  }
  70% {
    transform: translateY(-4px);
  }
  90% {
    transform: translateY(-2px);
  }
}

@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); }
}

@keyframes heartbeat {
  0% { transform: scale(1); }
  14% { transform: scale(1.2); }
  28% { transform: scale(1); }
  42% { transform: scale(1.2); }
  70% { transform: scale(1); }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .sponsor-section {
    padding: 1rem;
  }

  .coffee-card {
    padding: 2rem 1.5rem;
  }

  .payment-modal {
    width: 95vw;
    max-width: none;
    margin: 1rem;
  }

  .payment-content {
    padding: 2rem 1rem;
  }

  .qr-codes-horizontal {
    flex-direction: column;
    gap: 2rem;
  }

  .qr-item {
    max-width: 350px;
  }

  .modal-header {
    padding: 1rem 1.5rem;
  }
}
</style>
