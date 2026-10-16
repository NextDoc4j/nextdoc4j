<template>
  <div class="ui-browse-cards">
    <div class="browse-card-item">
      <div class="browse-card-title">
        <span class="browse-card-dot"></span>
        <span>快速定位接口</span>
      </div>
      <p class="browse-card-desc">多维树形菜单 + 拼音/路径快速过滤，秒级定位业务目标 API。</p>
    </div>

    <div class="browse-card-item">
      <div class="browse-card-title">
        <span class="browse-card-dot"></span>
        <span>评审入参出参</span>
      </div>
      <p class="browse-card-desc">折叠展开字段层级、类型、必填标识与字段注释一览无余。</p>
    </div>

    <div class="browse-card-item">
      <div class="browse-card-title">
        <span class="browse-card-dot"></span>
        <span>团队高效协作</span>
      </div>
      <p class="browse-card-desc">标准示例与自动生成 TS 代码，消除前后端沟通理解偏差。</p>
    </div>
  </div>
</template>

<style scoped>
.ui-browse-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
  margin: 18px 0 24px;
}

@media (max-width: 860px) {
  .ui-browse-cards {
    grid-template-columns: 1fr;
  }
}

.browse-card-item {
  background: var(--vp-c-bg, #ffffff);
  border: 1px solid var(--vp-c-divider, rgba(15, 23, 42, 0.08));
  border-radius: 10px;
  padding: 16px 18px;
  transition: all 0.2s ease;
}

.browse-card-item:hover {
  border-color: rgba(5, 150, 105, 0.3);
  transform: translateY(-1px);
}

.dark .browse-card-item {
  background: var(--vp-c-bg-soft, #131b2e);
}

.dark .browse-card-item:hover {
  border-color: rgba(16, 185, 129, 0.35);
}

.browse-card-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--vp-c-text-1, #0f172a);
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.browse-card-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #059669;
  flex-shrink: 0;
}

.dark .browse-card-dot {
  background: #10b981;
}

.browse-card-desc {
  font-size: 12.5px;
  color: var(--vp-c-text-2, #64748b);
  line-height: 1.6;
  margin: 0;
}
</style>
