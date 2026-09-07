<script setup lang="ts">
/**
 * 统一按钮（S16 组件库唯一实现，H17）。
 * 变体：primary（渐变底+glow）/ secondary（白底靛蓝边）/ ghost / danger；
 * 尺寸：sm / md / lg；loading 态内置，disabled 保护。
 */
withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    loading?: boolean;
    disabled?: boolean;
    type?: 'button' | 'submit';
    block?: boolean;
    ariaLabel?: string;
  }>(),
  { variant: 'primary', size: 'md', loading: false, disabled: false, type: 'button', block: false, ariaLabel: undefined },
);
</script>

<template>
  <button
    class="app-btn"
    :class="[`v-${variant}`, `s-${size}`, { block, loading }]"
    :type="type"
    :disabled="disabled || loading"
    :aria-label="ariaLabel"
    aria-busy="false"
  >
    <span
      v-if="loading"
      class="spinner"
      aria-hidden="true"
    />
    <span class="btn-content">
      <slot />
    </span>
  </button>
</template>

<style scoped>
.app-btn {
  --_radius: var(--radius-md);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-family: var(--font);
  font-weight: 650;
  letter-spacing: 0.01em;
  border-radius: var(--_radius);
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.2s ease, background 0.2s ease, border-color 0.2s ease;
  user-select: none;
  white-space: nowrap;
}
.app-btn:hover:not(:disabled) {
  transform: translateY(-1px);
}
.app-btn:active:not(:disabled) {
  transform: translateY(0);
}
.app-btn:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}
.s-sm {
  min-height: 28px;
  padding: 3px 10px;
  font-size: var(--font-size-sm);
  border-radius: var(--radius-sm);
}
.s-md {
  min-height: 34px;
  padding: 6px 14px;
  font-size: var(--font-size-base);
}
.s-lg {
  min-height: 42px;
  padding: 9px 18px;
  font-size: var(--font-size-lg);
  border-radius: var(--radius-lg);
}
.block {
  width: 100%;
}
.v-primary {
  background: linear-gradient(135deg, var(--ailp-primary-600) 0%, var(--ailp-primary-500) 100%);
  color: #fff;
  border: 1px solid transparent;
  box-shadow: 0 4px 14px rgba(79, 70, 229, 0.28);
}
.v-primary:hover:not(:disabled) {
  box-shadow: 0 8px 22px rgba(79, 70, 229, 0.35);
}
.v-secondary {
  background: var(--ailp-card);
  color: var(--ailp-primary-600);
  border: 1px solid var(--ailp-primary-300);
}
.v-secondary:hover:not(:disabled) {
  background: var(--ailp-primary-50);
  border-color: var(--ailp-primary-400);
}
.v-ghost {
  background: transparent;
  color: var(--ailp-muted-foreground);
  border: 1px solid transparent;
}
.v-ghost:hover:not(:disabled) {
  background: var(--ailp-muted);
  color: var(--ailp-foreground);
}
.v-danger {
  background: var(--ailp-card);
  color: var(--ailp-error-600);
  border: 1px solid var(--ailp-error-300, #fecaca);
}
.v-danger:hover:not(:disabled) {
  background: var(--ailp-error-50, #fef2f2);
  border-color: var(--ailp-error-500);
}
.spinner {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid currentColor;
  border-top-color: transparent;
  animation: app-btn-spin 0.7s linear infinite;
  flex-shrink: 0;
}
.btn-content {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
@keyframes app-btn-spin {
  to { transform: rotate(360deg); }
}
</style>
