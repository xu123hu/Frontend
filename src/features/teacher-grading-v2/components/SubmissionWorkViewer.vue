<template>
  <section class="work-viewer" data-grading-region="work" aria-label="学生原始作答">
    <div class="work-viewer__heading">
      <div>
        <p class="work-viewer__eyebrow">原始作答 · {{ selection.submissionItemId }}</p>
        <h2>学生作答</h2>
      </div>
      <span v-if="selection.fixtureId" class="work-viewer__source">来源已记录</span>
    </div>
    <section class="work-viewer__question">
      <p>题目</p>
      <strong>{{ question?.questionText || '题干暂不可用' }}</strong>
      <ol v-if="question?.options?.length" class="work-viewer__options">
        <li v-for="(option, index) in question.options" :key="option">{{ String.fromCharCode(65 + index) }}. {{ option }}</li>
      </ol>
    </section>
    <section class="work-viewer__answer">
      <p>作答内容</p>
      <pre v-if="selection.work.originalAnswer">{{ selection.work.originalAnswer }}</pre>
      <div v-else class="work-viewer__empty">该作答没有可用的文本内容，请依据原始文件人工核对。</div>
    </section>
    <section v-if="selection.work.fileId" class="work-viewer__file">
      <div>
        <p>原始文件</p>
        <small>{{ fileError || (fileLoading ? '正在安全加载原始文件…' : '已关联学生原始文件') }}</small>
      </div>
      <button v-if="fileError" type="button" @click="$emit('retry-file')">重试加载</button>
      <img v-else-if="fileUrl" :src="fileUrl" alt="学生原始作答文件" />
    </section>
  </section>
</template>

<script setup lang="ts">
import type { WorkspaceContext, WorkspaceSelection } from '../contracts'

defineProps<{
  question: WorkspaceContext['question']
  selection: WorkspaceSelection
  fileUrl: string
  fileLoading: boolean
  fileError: string
}>()
defineEmits<{ 'retry-file': [] }>()
</script>

<style scoped>
.work-viewer { min-width:0; padding:24px 28px 30px; background:#fff; }
.work-viewer__heading { display:flex; justify-content:space-between; align-items:flex-start; gap:14px; padding-bottom:18px; border-bottom:1px solid #e4eaf1; }
.work-viewer__eyebrow, .work-viewer__question p, .work-viewer__answer p, .work-viewer__file p { margin:0 0 6px; color:#64758b; font-size:12px; font-weight:800; letter-spacing:.04em; }
.work-viewer h2 { margin:0; color:#172c48; font-size:20px; }
.work-viewer__source { padding:5px 8px; border-radius:999px; background:#eef5ff; color:#3972aa; font-size:11px; font-weight:700; }
.work-viewer__question { padding:20px 0; border-bottom:1px solid #e4eaf1; color:#1f334d; line-height:1.7; }
.work-viewer__question strong { font-size:16px; font-weight:650; }
.work-viewer__options { padding-left:22px; margin:11px 0 0; color:#40536a; }
.work-viewer__answer { padding-top:20px; }
.work-viewer__answer pre { min-height:210px; margin:0; padding:18px; overflow:auto; border:1px solid #dae4ef; border-radius:10px; background:#fbfcfe; color:#172c48; white-space:pre-wrap; font:15px/1.85 ui-monospace, SFMono-Regular, Consolas, monospace; }
.work-viewer__empty { padding:18px; border:1px dashed #b8c6d6; border-radius:10px; color:#5c6e83; background:#fbfcfe; }
.work-viewer__file { margin-top:18px; padding:14px; border:1px solid #dae4ef; border-radius:10px; background:#f7faff; }
.work-viewer__file small { color:#61738b; }
.work-viewer__file button { margin-top:10px; border:1px solid #4e85b9; border-radius:7px; background:#fff; color:#1f5f98; padding:6px 10px; font-weight:700; cursor:pointer; }
.work-viewer__file img { display:block; max-width:100%; max-height:480px; margin-top:12px; object-fit:contain; }
</style>
