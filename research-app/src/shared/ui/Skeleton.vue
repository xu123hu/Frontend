<script setup lang="ts">
withDefaults(
  defineProps<{
    progress?: { current: number; total: number; message: string } | null;
    label?: string;
  }>(),
  { progress: null, label: '加载中' },
);

function percent(p: { current: number; total: number }): number {
  if (p.total <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((p.current / p.total) * 100)));
}
</script>

<template>
  <div
    class="skeleton-wrap"
    role="status"
    :aria-label="label"
  >
    <template v-if="progress">
      <div
        class="progress"
        :aria-label="`${label} ${percent(progress)}%`"
      >
        <span :style="{ width: percent(progress) + '%' }" />
      </div>
      <p class="muted small">
        {{ progress.message }}（{{ percent(progress) }}%）
      </p>
    </template>
    <template v-else>
      <div
        v-for="i in 3"
        :key="i"
        class="skeleton"
      />
    </template>
  </div>
</template>

<style scoped>
.skeleton-wrap {
  display: grid;
  gap: 6px;
  padding: 8px 0;
}
.skeleton {
  height: 11px;
  background: #e5eae8;
  border-radius: 4px;
  overflow: hidden;
  position: relative;
}
.skeleton::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.5), transparent);
  animation: shimmer 1.4s ease-in-out infinite;
}
.progress {
  height: 6px;
  border-radius: 6px;
  background: #dfe6e3;
  overflow: hidden;
}
.progress span {
  display: block;
  height: 100%;
  background: var(--accent);
}
.small {
  font-size: var(--font-size-xs);
}
.muted {
  color: var(--muted);
}
@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}
@media (prefers-reduced-motion: reduce) {
  .skeleton::after { animation: none; }
}
</style>
