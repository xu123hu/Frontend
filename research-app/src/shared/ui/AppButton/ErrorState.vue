<script setup lang="ts">
/**
 * 统一错误态（S16 组件库唯一实现，H17）。
 * 三段式：原因 + 重试 + 解决方案。tone: danger（默认）/ warning。
 * 通过 default 插槽放置"解决方案"链接或说明。
 */
withDefaults(
  defineProps<{
    title?: string;
    reason?: string;
    tone?: 'danger' | 'warning';
    retryable?: boolean;
  }>(),
  { title: '操作失败', reason: '发生了未知错误，请重试。', tone: 'danger', retryable: true },
);
defineEmits<{ retry: [] }>();
</script>

<template>
  <div
    class="error-state"
    :class="`tone-${tone}`"
    role="alert"
  >
    <div
      class="error-icon"
      aria-hidden="true"
    >
      !
    </div>
    <div class="error-body">
      <b class="error-title">{{ title }}</b>
      <p class="error-reason">
        {{ reason }}
      </p>
      <div class="error-actions">
        <slot name="actions">
          <button
            v-if="retryable"
            class="retry-btn"
            type="button"
            @click="$emit('retry')"
          >
            重试
          </button>
          <a
            class="solution-link"
            href="javascript:void(0)"
            @click.prevent="console.info('solution link placeholder')"
          >查看解决方案</a>
        </slot>
      </div>
    </div>
  </div>
</template>

<style scoped>
.error-state {
  display: flex;
  gap: 12px;
  padding: 14px 16px;
  border-radius: var(--radius-lg);
  border: 1px solid;
  font-size: var(--font-size-base);
  align-items: flex-start;
}
.tone-danger {
  background: rgba(239, 68, 68, 0.06);
  border-color: rgba(239, 68, 68, 0.25);
  color: var(--ailp-error-600);
}
.tone-warning {
  background: rgba(245, 158, 11, 0.08);
  border-color: rgba(245, 158, 11, 0.3);
  color: var(--ailp-warning-600);
}
.error-icon {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-weight: 800;
  background: currentColor;
  color: #fff;
  flex-shrink: 0;
  margin-top: 1px;
}
.error-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.error-title {
  font-weight: 700;
  color: var(--ailp-foreground);
}
.error-reason {
  margin: 0;
  color: var(--ailp-muted-foreground);
  font-size: var(--font-size-base);
}
.error-actions {
  display: flex;
  gap: 14px;
  align-items: center;
  margin-top: 4px;
}
.retry-btn {
  background: var(--ailp-primary-50);
  color: var(--ailp-primary-600);
  border: 1px solid var(--ailp-primary-300);
  border-radius: var(--radius-sm);
  padding: 4px 12px;
  font-weight: 650;
  cursor: pointer;
}
.retry-btn:hover {
  background: var(--ailp-primary-100);
}
.solution-link {
  color: var(--ailp-primary-600);
  font-size: var(--font-size-base);
  cursor: pointer;
}
</style>

