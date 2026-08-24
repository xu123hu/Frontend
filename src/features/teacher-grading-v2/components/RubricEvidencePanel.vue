<template>
  <aside class="rubric-panel" data-grading-region="rubric" aria-label="评分量规与教师决定">
    <section class="rubric-panel__summary">
      <p class="rubric-panel__eyebrow">评分依据</p>
      <div class="rubric-panel__score"><strong>{{ selection.scoring.maxScore ?? '—' }}</strong><span>满分</span></div>
      <p v-if="selection.scoring.standardAnswer" class="rubric-panel__standard">{{ selection.scoring.standardAnswer }}</p>
      <p v-if="selection.scoring.answerAnalysis" class="rubric-panel__analysis">{{ selection.scoring.answerAnalysis }}</p>
    </section>

    <section class="rubric-panel__rubric">
      <h2>评分量规</h2>
      <p v-if="selection.scoring.rubricStatus === 'missing'" class="rubric-panel__missing">评分量规待补全，需教师依据原题作出明确判断</p>
      <ol v-else>
        <li v-for="item in selection.scoring.rubricItems" :key="item.id">
          <span><strong>{{ item.criterion }}</strong><small>{{ item.evidenceHint }}</small></span>
          <b>{{ item.points }} 分</b>
        </li>
      </ol>
    </section>

    <section class="rubric-panel__evidence">
      <h2>建议与证据</h2>
      <p v-if="selection.suggestion?.reviewNeeded" class="rubric-panel__review">建议人工复核</p>
      <p v-for="evidence in selection.suggestion?.evidence || []" :key="evidence.kind + evidence.text">{{ evidence.text }}</p>
      <p v-if="!selection.suggestion?.evidence.length" class="rubric-panel__empty">暂无可展示的建议证据，教师可依据原题明确给分。</p>
    </section>

    <section class="rubric-panel__decision">
      <h2>教师决定</h2>
      <div class="rubric-panel__choice" role="group" aria-label="评分决定">
        <button type="button" :class="{ active: decision === 'accept' }" :aria-pressed="decision === 'accept'" @click="$emit('update:decision', 'accept')">
          采用建议 {{ selection.suggestion?.proposedScore ?? '—' }} 分
        </button>
        <button type="button" :class="{ active: decision === 'override' }" :aria-pressed="decision === 'override'" @click="$emit('update:decision', 'override')">
          教师明确给分
        </button>
      </div>
      <label for="grading-final-score">最终得分</label>
      <input id="grading-final-score" :value="finalScore ?? ''" type="number" min="0" step="0.5" @input="updateScore" />
      <label for="grading-feedback">反馈给学生</label>
      <textarea id="grading-feedback" :value="feedback" rows="4" placeholder="写下可执行的改进建议" @input="updateFeedback" />
    </section>
  </aside>
</template>

<script setup lang="ts">
import type { WorkspaceSelection } from '../contracts'

defineProps<{ selection: WorkspaceSelection; finalScore: number | null; feedback: string; decision: 'accept' | 'override' }>()
const emit = defineEmits<{
  'update:final-score': [value: number | null]
  'update:feedback': [value: string]
  'update:decision': [value: 'accept' | 'override']
}>()

function updateScore(event: Event) {
  const value = Number((event.target as HTMLInputElement).value)
  emit('update:final-score', Number.isFinite(value) ? value : null)
}
function updateFeedback(event: Event) { emit('update:feedback', (event.target as HTMLTextAreaElement).value) }
</script>

<style scoped>
.rubric-panel { min-width:0; border-left:1px solid #dbe4ef; background:#f9fbfd; color:#243950; }
.rubric-panel section { padding:18px; border-bottom:1px solid #dbe4ef; }
.rubric-panel h2 { margin:0 0 10px; color:#1b314d; font-size:14px; }
.rubric-panel__eyebrow { margin:0 0 5px; color:#65758a; font-size:12px; font-weight:800; letter-spacing:.04em; }
.rubric-panel__score { display:flex; align-items:baseline; gap:7px; color:#60738b; }
.rubric-panel__score strong { color:#15375e; font-size:30px; }
.rubric-panel__standard { margin:13px 0 7px; color:#233b58; font-size:13px; line-height:1.6; }
.rubric-panel__analysis { margin:0; color:#66778c; font-size:12px; line-height:1.55; }
.rubric-panel__rubric ol { list-style:none; padding:0; margin:0; display:grid; gap:8px; }
.rubric-panel__rubric li { display:flex; align-items:start; justify-content:space-between; gap:8px; padding:9px; border-radius:8px; background:#fff; border:1px solid #e1e8f0; }
.rubric-panel__rubric span { display:grid; gap:3px; font-size:13px; }
.rubric-panel__rubric small { color:#67788c; line-height:1.45; }
.rubric-panel__rubric b { color:#295b8d; font-size:12px; white-space:nowrap; }
.rubric-panel__missing { margin:0; border-left:3px solid #b98117; padding:8px 10px; background:#fff6df; color:#795314; font-size:13px; line-height:1.55; }
.rubric-panel__evidence p { margin:6px 0 0; color:#4f6177; font-size:13px; line-height:1.55; }
.rubric-panel__review { display:inline-block; margin:0 !important; padding:4px 7px; border-radius:999px; background:#fff0c9; color:#825412 !important; font-size:11px !important; font-weight:800; }
.rubric-panel__empty { color:#738196 !important; }
.rubric-panel__choice { display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-bottom:14px; }
.rubric-panel__choice button { border:1px solid #cbd9e7; border-radius:7px; padding:8px 6px; background:#fff; color:#36516f; font-size:12px; font-weight:700; cursor:pointer; }
.rubric-panel__choice button.active { border-color:#3a78b2; background:#e8f3ff; color:#15558f; }
.rubric-panel__decision label { display:block; margin:10px 0 5px; color:#52667e; font-size:12px; font-weight:800; }
.rubric-panel__decision input, .rubric-panel__decision textarea { box-sizing:border-box; width:100%; border:1px solid #c9d7e5; border-radius:7px; background:#fff; color:#193250; padding:8px; font:13px/1.5 inherit; }
.rubric-panel__decision textarea { resize:vertical; }
@media (max-width: 920px) { .rubric-panel { border-left:0; border-top:1px solid #dbe4ef; } }
</style>
