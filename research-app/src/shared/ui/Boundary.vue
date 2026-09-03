<script setup lang="ts">
defineProps<{
  title?: string;
  message?: string;
  tone?: 'info' | 'warning' | 'danger' | 'success';
}>();
</script>

<template>
  <div
    class="boundary"
    :class="`tone-${tone ?? 'info'}`"
    role="note"
  >
    <div
      v-if="title"
      class="boundary-title"
    >
      <slot name="title">
        {{ title }}
      </slot>
    </div>
    <div
      v-if="message || $slots.default"
      class="boundary-body"
    >
      <slot>{{ message }}</slot>
    </div>
  </div>
</template>

<style scoped>
.boundary {
  padding: 11px;
  background: var(--info-bg);
  border: 1px solid #c7d9e7;
  color: #294f70;
  border-radius: 7px;
  font-size: var(--font-size-sm);
  line-height: 1.55;
}
.boundary-title {
  font-weight: 700;
  margin-bottom: 4px;
}
.tone-warning {
  background: var(--warning-bg);
  border-color: #ead29e;
  color: #664718;
}
.tone-danger {
  background: var(--danger-bg);
  border-color: #e6c0bc;
  color: #6f1d1d;
}
.tone-success {
  background: var(--success-bg);
  border-color: #bfdfd0;
  color: #1c6a4a;
}
</style>
