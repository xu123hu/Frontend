<template>
  <footer class="grading-action-bar" data-grading-action-bar tabindex="0" @keydown="handleKeydown">
    <p><strong>教师确认后</strong>才会写入正式成绩并更新掌握度。</p>
    <div class="grading-action-bar__buttons">
      <button type="button" :disabled="actionPending || !canPrevious" @click="$emit('previous')">上一份</button>
      <button type="button" :disabled="actionPending || !canConfirm" @click="$emit('review')">稍后复看 <kbd>M</kbd></button>
      <button type="button" class="grading-action-bar__confirm" data-action="confirm-next" aria-label="确认并下一份" :disabled="actionPending || !canConfirm" @click="$emit('confirm')">
        {{ actionPending ? '正在确认…' : '确认并下一份' }} <kbd>Enter</kbd>
      </button>
    </div>
  </footer>
</template>

<script setup lang="ts">
defineProps<{ canPrevious: boolean; canConfirm: boolean; actionPending: boolean }>()
const emit = defineEmits<{ previous: []; review: []; confirm: [] }>()

function handleKeydown(event: KeyboardEvent) {
  if (event.target !== event.currentTarget) return
  if (event.key.toLowerCase() === 'm') { event.preventDefault(); emit('review'); return }
  if (event.key === 'Enter') { event.preventDefault(); emit('confirm') }
}
</script>

<style scoped>
.grading-action-bar { display:flex; justify-content:space-between; align-items:center; gap:16px; padding:14px 20px; border-top:1px solid #d7e1ec; background:#fff; box-shadow:0 -5px 14px rgba(22,48,79,.06); outline:none; }
.grading-action-bar:focus-visible { box-shadow:inset 0 0 0 3px #82b9eb; }
.grading-action-bar p { margin:0; color:#5d6f83; font-size:12px; }
.grading-action-bar p strong { color:#233e5d; }
.grading-action-bar__buttons { display:flex; flex-wrap:wrap; justify-content:flex-end; gap:8px; }
.grading-action-bar button { border:1px solid #c9d7e5; border-radius:8px; background:#fff; color:#284563; padding:9px 11px; font:13px inherit; font-weight:750; cursor:pointer; }
.grading-action-bar button:disabled { cursor:not-allowed; opacity:.55; }
.grading-action-bar__confirm { border-color:#1f6daa !important; background:#246fa9 !important; color:#fff !important; }
kbd { margin-left:4px; border:1px solid currentColor; border-radius:3px; padding:1px 3px; font-size:10px; font-family:inherit; opacity:.75; }
@media (max-width: 760px) { .grading-action-bar { align-items:flex-start; flex-direction:column; } .grading-action-bar__buttons { width:100%; } }
</style>
