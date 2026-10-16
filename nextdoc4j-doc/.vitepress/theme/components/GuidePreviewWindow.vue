<script setup lang="ts">
import { ref, computed } from "vue";
import { useData, withBase } from "vitepress";

const { isDark } = useData();
const previewMode = ref<"light" | "dark">("light");

if (typeof window !== "undefined") {
  previewMode.value = isDark.value ? "dark" : "light";
}

const currentPreviewImg = computed(() => {
  return previewMode.value === "dark"
    ? withBase("/images/screenshots/dark-home.png")
    : withBase("/images/screenshots/bright-home.png");
});
</script>

<template>
  <div class="overview-preview-box">
    <div class="preview-window-bar">
      <div class="preview-tab-pill">
        <button
          class="preview-tab-item"
          :class="{ active: previewMode === 'light' }"
          type="button"
          @click="previewMode = 'light'"
        >
          浅色模式
        </button>
        <button
          class="preview-tab-item"
          :class="{ active: previewMode === 'dark' }"
          type="button"
          @click="previewMode = 'dark'"
        >
          深色模式
        </button>
      </div>
      <span class="preview-url-text">http://localhost:8080/doc.html</span>
    </div>
    <img :src="currentPreviewImg" alt="NextDoc4j 工作台预览" class="preview-stage-img" />
  </div>
</template>

<style scoped>
.overview-preview-box {
  margin: 20px 0 32px;
  background: var(--vp-c-bg-elv, #ffffff);
  border-radius: 20px;
  box-shadow: 0 24px 60px -16px rgba(15, 23, 42, 0.1);
  border: 1px solid var(--vp-c-divider, rgba(15, 23, 42, 0.08));
  overflow: hidden;
}

.preview-window-bar {
  height: 42px;
  background: var(--vp-c-bg-soft, #f8fafc);
  display: flex;
  align-items: center;
  padding: 0 16px;
  gap: 12px;
  border-bottom: 1px solid var(--vp-c-divider, rgba(15, 23, 42, 0.08));
}

.preview-tab-pill {
  display: inline-flex;
  padding: 2px;
  border-radius: 9999px;
  background: var(--vp-c-bg-mute, rgba(15, 23, 42, 0.06));
}

.preview-tab-item {
  padding: 3px 12px;
  border-radius: 9999px;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--vp-c-text-2, #64748b);
  cursor: pointer;
  border: none;
  background: none;
}

.preview-tab-item.active {
  background: var(--vp-c-bg-elv, #ffffff);
  color: #059669;
  box-shadow: 0 2px 5px rgba(0,0,0,0.05);
}

.dark .preview-tab-item.active {
  color: #10b981;
}

.preview-url-text {
  margin-left: auto;
  font-family: var(--vp-font-family-mono, monospace);
  font-size: 11px;
  color: var(--vp-c-text-3, #94a3b8);
}

.preview-stage-img {
  width: 100%;
  aspect-ratio: 1692 / 968;
  display: block;
  object-fit: cover;
  object-position: top left;
}
</style>
