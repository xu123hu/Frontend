<template>
  <div class="temtpy" role="status">
    <div class="temtpy-icon" aria-hidden="true">{{ icon }}</div>
    <h3 class="temtpy-title">{{ title }}</h3>
    <p class="temtpy-msg">{{ message }}</p>
    <button v-if="actionText" class="tdr-btn primary" type="button" @click="$emit('action')">{{ actionText }}</button>
  </div>
</template>

<script setup lang="ts">
defineProps<{ icon: string; title: string; message: string; actionText?: string }>()
defineEmits<{ (e: 'action'): void }>()
</script>