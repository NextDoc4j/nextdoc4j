<template>
  <div class="ui-showcase-box">
    <div class="ui-showcase-header">
      <div class="ui-showcase-title">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
        </svg>
        <span>{{ title }}</span>
      </div>
      <span v-if="tag" class="ui-showcase-tag">{{ tag }}</span>
    </div>
    <div class="ui-showcase-body">
      <img :src="src" :alt="alt || title" class="ui-showcase-img" />
    </div>
    <div v-if="caption" class="ui-showcase-caption">
      {{ caption }}
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  src: string;
  title: string;
  tag?: string;
  caption?: string;
  alt?: string;
}>();
</script>

<style scoped>
.ui-showcase-box {
  background: var(--vp-c-bg, #ffffff);
  border: 1px solid var(--vp-c-divider, rgba(15, 23, 42, 0.08));
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
  margin: 20px 0 28px;
  transition: all 0.25s ease;
}

.ui-showcase-box:hover {
  border-color: rgba(5, 150, 105, 0.3);
  box-shadow: 0 10px 30px -10px rgba(15, 23, 42, 0.08);
}

.dark .ui-showcase-box {
  background: var(--vp-c-bg-soft, #131b2e);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.dark .ui-showcase-box:hover {
  border-color: rgba(16, 185, 129, 0.35);
  box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.6);
}

.ui-showcase-header {
  padding: 12px 18px;
  background: var(--vp-c-bg-soft, #f8fafc);
  border-bottom: 1px solid var(--vp-c-divider, rgba(15, 23, 42, 0.08));
  font-size: 13px;
  font-weight: 700;
  color: var(--vp-c-text-1, #0f172a);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.dark .ui-showcase-header {
  background: var(--vp-c-bg-soft, #131b2e);
  color: #f8fafc;
}

.ui-showcase-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ui-showcase-tag {
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 9999px;
  background: rgba(5, 150, 105, 0.08);
  color: #047857;
}

.dark .ui-showcase-tag {
  background: rgba(16, 185, 129, 0.14);
  color: #34d399;
}

.ui-showcase-body {
  width: 100%;
  background: #f8fafc;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.dark .ui-showcase-body {
  background: #090d16;
}

.ui-showcase-img {
  width: 100%;
  height: auto;
  max-height: 520px;
  object-fit: contain;
  display: block;
  transition: transform 0.25s ease;
}

.ui-showcase-box:hover .ui-showcase-img {
  transform: scale(1.01);
}

.ui-showcase-caption {
  padding: 11px 18px;
  font-size: 12.5px;
  color: var(--vp-c-text-2, #64748b);
  background: var(--vp-c-bg, #ffffff);
  border-top: 1px solid var(--vp-c-divider, rgba(15, 23, 42, 0.05));
}

.dark .ui-showcase-caption {
  background: var(--vp-c-bg-soft, #131b2e);
}
</style>
