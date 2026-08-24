<template>
  <header class="workspace-header" data-grading-region="header">
    <div class="workspace-header__identity">
      <p class="workspace-header__eyebrow">{{ context.class?.label || '批改范围受限' }}</p>
      <h1>{{ context.assignment?.title || '批改工作台' }}</h1>
      <LatexText
        class="workspace-header__question"
        :text="context.question ? '第 ' + context.question.itemNo + ' 题 · ' + context.question.questionText : '请选择已发布作业中的题目'"
      />
    </div>
    <div class="workspace-header__tools">
      <div class="workspace-header__progress" aria-label="批改进度">
        <strong>{{ context.progress.confirmed }}</strong><span> / {{ context.progress.total }} 已确认</span>
        <small>剩余 {{ context.progress.remaining }} 份</small>
      </div>
      <label class="workspace-header__filter" for="grading-status-filter">
        <span>队列</span>
        <select id="grading-status-filter" :value="context.filter" @change="changeFilter">
          <option value="all">全部作答</option>
          <option value="ungraded">待批改</option>
          <option value="review">待复看</option>
          <option value="confirmed">已确认</option>
        </select>
      </label>
    </div>
  </header>
</template>

<script setup lang="ts">
import LatexText from '@/components/LatexText.vue'
import type { WorkspaceContext, WorkspaceFilter } from '../contracts'

defineProps<{ context: WorkspaceContext }>()
const emit = defineEmits<{ filter: [value: WorkspaceFilter] }>()

function changeFilter(event: Event) {
  const value = (event.target as HTMLSelectElement).value
  if (value === 'all' || value === 'ungraded' || value === 'review' || value === 'confirmed') emit('filter', value)
}
</script>

<style scoped>
.workspace-header { display:flex; justify-content:space-between; gap:24px; align-items:flex-start; padding:22px 26px; background:#13233d; color:#f8fbff; border-radius:16px 16px 0 0; }
.workspace-header__eyebrow { margin:0 0 6px; color:#a9c5ed; font-size:13px; font-weight:700; letter-spacing:.04em; }
.workspace-header h1 { margin:0; font-size:24px; line-height:1.25; }
.workspace-header__question { display:block; max-width:720px; margin:9px 0 0; color:#d7e5f8; line-height:1.6; }
.workspace-header__tools { display:flex; align-items:center; gap:18px; flex-shrink:0; }
.workspace-header__progress { min-width:104px; text-align:right; color:#d7e5f8; font-size:13px; }
.workspace-header__progress strong { color:#fff; font-size:24px; }
.workspace-header__progress small { display:block; color:#a9c5ed; margin-top:3px; }
.workspace-header__filter { display:grid; gap:4px; color:#bcd4f2; font-size:12px; font-weight:700; }
.workspace-header__filter select { min-width:118px; border:1px solid #5a769e; border-radius:8px; background:#1d3353; color:#fff; padding:7px 9px; font:inherit; }
@media (max-width: 760px) { .workspace-header { flex-direction:column; } .workspace-header__tools { width:100%; justify-content:space-between; } }
</style>
