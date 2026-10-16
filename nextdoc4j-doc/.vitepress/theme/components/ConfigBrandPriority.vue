<script setup lang="ts">
const levels = [
  {
    order: "1",
    title: "品牌自定义标题（最高优先级）",
    desc: "在 nextdoc4j.extension.brand.title 中声明的定制文本，将全局覆盖其他标题设置。"
  },
  {
    order: "2",
    title: "SpringDoc OpenAPI Info 标题（次级优先级）",
    desc: "若未配置品牌标题，系统自动提取 @OpenAPIDefinition(info = @Info(title = '...')) 中的标题。"
  },
  {
    order: "3",
    title: "NextDoc4j 默认兜底标题（最低优先级）",
    desc: "若前两者均未设置，系统自动兜底呈现为「NextDoc4j API 文档」。"
  }
];
</script>

<template>
  <div class="priority-steps-list">
    <div v-for="lvl in levels" :key="lvl.order" class="priority-step-item">
      <span class="priority-badge">{{ lvl.order }}</span>
      <div class="priority-info">
        <h5 class="priority-title">{{ lvl.title }}</h5>
        <p class="priority-desc">{{ lvl.desc }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.priority-steps-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 16px 0 24px;
}

.priority-step-item {
  background: var(--vp-c-bg, #ffffff);
  border: 1px solid var(--vp-c-divider, rgba(15, 23, 42, 0.08));
  border-radius: 10px;
  padding: 14px 18px;
  display: flex;
  align-items: center;
  gap: 14px;
}

.priority-badge {
  width: 26px;
  height: 26px;
  border-radius: 6px;
  display: grid;
  place-items: center;
  font-size: 12px;
  font-weight: 800;
  font-family: var(--vp-font-family-mono, monospace);
}

.priority-step-item:nth-child(1) .priority-badge { background: rgba(5, 150, 105, 0.1); color: #059669; }
.priority-step-item:nth-child(2) .priority-badge { background: rgba(2, 132, 199, 0.1); color: #0284c7; }
.priority-step-item:nth-child(3) .priority-badge { background: rgba(100, 116, 139, 0.1); color: #64748b; }

.priority-title {
  font-size: 14px;
  font-weight: 750;
  color: var(--vp-c-text-1, #0f172a);
  margin: 0 0 2px;
}

.priority-desc {
  font-size: 12.5px;
  color: var(--vp-c-text-2, #64748b);
  margin: 0;
}
</style>
