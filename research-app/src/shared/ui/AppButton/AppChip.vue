<script setup lang="ts">
/**
 * 统一标签 chip（S16 组件库唯一实现，H17）。
 * tone: neutral / primary / accent / success / warning / danger / violet。
 */
withDefaults(
  defineProps<{
    tone?: 'neutral' | 'primary' | 'accent' | 'success' | 'warning' | 'danger' | 'violet';
    size?: 'sm' | 'md';
    dot?: boolean;
  }>(),
  { tone: 'neutral', size: 'sm', dot: false },
);
</script>

<template>
  <span
    class="app-chip"
    :class="[`t-${tone}`, `s-${size}`]"
  >
    <span
      v-if="dot"
      class="chip-dot"
      aria-hidden="true"
    />
    <slot />
  </span>
</template>

<style scoped>
.app-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border-radius: var(--radius-full);
  font-weight: 600;
  line-height: 1;
  white-space: nowrap;
}
.s-sm {
  padding: 3px 9px;
  font-size: 12px;
}
.s-md {
  padding: 5px 12px;
  font-size: var(--font-size-base);
}
.chip-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  opacity: 0.7;
}
.t-neutral {
  background: var(--ailp-muted);
  color: var(--ailp-muted-foreground);
}
.t-primary {
  background: var(--ailp-primary-50);
  color: var(--ailp-primary-600);
}
.t-accent {
  background: var(--ailp-accent-50);
  color: var(--ailp-accent-600);
}
.t-success {
  background: rgba(16, 185, 129, 0.1);
  color: var(--ailp-success-600);
}
.t-warning {
  background: rgba(245, 158, 11, 0.12);
  color: var(--ailp-warning-600);
}
.t-danger {
  background: rgba(239, 68, 68, 0.1);
  color: var(--ailp-error-600);
}
.t-violet {
  background: rgba(139, 92, 246, 0.1);
  color: #7c3aed;
}
</style>
