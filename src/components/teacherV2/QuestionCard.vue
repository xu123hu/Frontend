<template>
  <div class="tv2-qcard" :class="{ 'is-selected': selected, 'is-compact': compact }" :data-qid="question.question_id">
    <div class="tv2-qcard__head">
      <span v-if="seq" class="tv2-qcard__seq">{{ seq }}.</span>
      <div class="tv2-qcard__meta">
        <span class="tv2-tag" :class="diffClass">{{ diffLabel }}</span>
        <span class="tv2-tag tv2-tag--slate">{{ typeLabel }}</span>
        <span v-if="question.source === 'school'" class="tv2-tag tv2-tag--info">校本</span>
        <span v-else-if="question.source === 'ai_variant'" class="tv2-tag tv2-tag--ai">AI 变式</span>
        <span v-else class="tv2-tag tv2-tag--slate">官方题库</span>
        <span class="tv2-qcard__kp">{{ question.kp_name }}</span>
        <span v-if="question.class_error_rate" class="tv2-qcard__err">本班错误率 {{ Math.round(question.class_error_rate * 100) }}%</span>
      </div>
      <div class="tv2-qcard__spacer" />
      <div class="tv2-qcard__actions">
        <slot name="actions" />
      </div>
    </div>

    <div class="tv2-qcard__stem" v-html="renderedStem" />

    <div v-if="question.options?.length" class="tv2-qcard__options">
      <div v-for="(opt, i) in question.options" :key="i" class="tv2-qcard__opt" :class="{ 'is-answer': showAnswer && question.answer === 'ABCD'[i] }">
        <span class="tv2-qcard__opt-label">{{ 'ABCD'[i] }}.</span>
        <span v-html="renderOption(opt)" />
        <span v-if="showAnswer && question.answer === 'ABCD'[i]" class="tv2-tag tv2-tag--ok" style="margin-left: auto">答案</span>
      </div>
    </div>
    <div v-else-if="showAnswer" class="tv2-qcard__answer">
      <span class="tv2-tag tv2-tag--ok">答案</span>
      <span v-html="renderOption(question.answer)" />
    </div>

    <div v-if="showAnalysis && question.analysis" class="tv2-qcard__analysis">
      <div v-if="question.analysis.analysis" class="tv2-qcard__analysis-row"><b>分析</b><span v-html="renderOption(question.analysis.analysis)" /></div>
      <div v-if="question.analysis.solution" class="tv2-qcard__analysis-row"><b>解答</b><span v-html="renderOption(question.analysis.solution)" /></div>
      <div v-if="question.analysis.comment" class="tv2-qcard__analysis-row"><b>点评</b><span v-html="renderOption(question.analysis.comment)" /></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import katex from 'katex'
import DOMPurify from 'dompurify'
import type { V2Question } from '@/types/teacherV2'

const props = withDefaults(defineProps<{
  question: V2Question
  seq?: number
  selected?: boolean
  compact?: boolean
  showAnswer?: boolean
  showAnalysis?: boolean
}>(), { showAnswer: true })

const diffLabel = computed(() => ({ basic: '基础', medium: '中档', hard: '压轴' }[props.question.difficulty]))
const diffClass = computed(() => ({ basic: 'tv2-tag--ok', medium: 'tv2-tag--info', hard: 'tv2-tag--err' }[props.question.difficulty]))
const typeLabel = computed(() => ({ choice: '选择题', fill: '填空题', solution: '解答题' }[props.question.q_type]))

function tex(src: string): string {
  const s = String(src ?? '')
  let out = ''
  let i = 0
  while (i < s.length) {
    if (s[i] !== '$') {
      const next = s.indexOf('$', i)
      const end = next === -1 ? s.length : next
      out += s.slice(i, end).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      i = end
      continue
    }
    const close = s.indexOf('$', i + 1)
    if (close === -1) { out += '$'; break }
    try { out += katex.renderToString(s.slice(i + 1, close), { throwOnError: false }) } catch { out += s.slice(i, close + 1) }
    i = close + 1
  }
  return DOMPurify.sanitize(out, { USE_PROFILES: { html: true, mathMl: true } })
}
const renderedStem = computed(() => tex(props.question.stem))
const renderOption = (s: string) => tex(s)
</script>

<style scoped>
.tv2-qcard {
  border: 1px solid var(--tv2-line); border-radius: var(--tv2-radius);
  background: var(--tv2-card); padding: 13px 16px; transition: border-color 0.15s, box-shadow 0.15s;
}
.tv2-qcard:hover { border-color: var(--tv2-primary-border); }
.tv2-qcard.is-selected { border-color: var(--tv2-primary); box-shadow: 0 0 0 3px var(--tv2-primary-soft); }
.tv2-qcard__head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.tv2-qcard__seq { font-weight: 700; font-family: var(--tv2-font-num); font-size: 14px; color: var(--tv2-ink); }
.tv2-qcard__meta { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.tv2-qcard__kp { font-size: 12px; color: var(--tv2-ink2); }
.tv2-qcard__err { font-size: 11.5px; color: var(--tv2-rose); font-weight: 600; }
.tv2-qcard__spacer { flex: 1; }
.tv2-qcard__actions { display: flex; gap: 6px; align-items: center; }
.tv2-qcard__stem { margin-top: 9px; font-size: 13.5px; line-height: 1.7; color: var(--tv2-ink); }
.tv2-qcard__options { margin-top: 9px; display: flex; flex-direction: column; gap: 5px; }
.tv2-qcard__opt {
  display: flex; align-items: baseline; gap: 7px; font-size: 13px; color: var(--tv2-ink2);
  padding: 5px 9px; border-radius: 7px; border: 1px solid transparent;
}
.tv2-qcard__opt.is-answer { background: var(--tv2-teal-soft); border-color: var(--tv2-teal-border); color: var(--tv2-teal); font-weight: 600; }
.tv2-qcard__opt-label { font-family: var(--tv2-font-num); font-weight: 600; flex-shrink: 0; }
.tv2-qcard__answer { margin-top: 9px; display: flex; align-items: baseline; gap: 8px; font-size: 13.5px; color: var(--tv2-teal); font-weight: 600; }
.tv2-qcard__analysis { margin-top: 10px; border-top: 1px dashed var(--tv2-line); padding-top: 9px; display: flex; flex-direction: column; gap: 6px; }
.tv2-qcard__analysis-row { display: flex; gap: 9px; font-size: 12.5px; line-height: 1.65; }
.tv2-qcard__analysis-row b { color: var(--tv2-ink2); flex-shrink: 0; font-weight: 600; }
.tv2-qcard__analysis-row span { color: var(--tv2-ink2); }
.tv2-qcard.is-compact { padding: 10px 13px; }
.tv2-qcard.is-compact .tv2-qcard__stem { font-size: 12.5px; }
</style>
