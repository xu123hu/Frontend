<template>
  <div v-if="open" class="tdr-dialog" role="dialog" aria-modal="true" aria-label="版本冲突">
    <div class="tdr-dialog-card">
      <h3 class="tdr-dialog-title">版本冲突</h3>
      <p class="tdr-dialog-msg">该文档已被其他编辑更新为新版本，直接保存会覆盖他人修改，不能静默覆盖。</p>
      <div class="tdr-dialog-actions">
        <button class="tdr-btn" type="button" @click="$emit('close')">取消</button>
        <button class="tdr-btn primary" type="button" @click="$emit('refresh')">刷新到最新版本</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ open: boolean }>()
defineEmits<{ (e: 'close'): void; (e: 'refresh'): void }>()
</script>