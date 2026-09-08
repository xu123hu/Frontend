<script setup lang="ts">
/**
 * AI diff 面板（TC-F04-02）：每条建议四要素卡片（原文/建议/理由/风险），
 * 逐项接受/拒绝；拒绝项不写入源文件；决策写入 HumanDecision 审计（草案端点）。
 * 点击"定位"滚动编辑器到建议行。
 */
import { FileText, Check, X, Locate } from 'lucide-vue-next';
import Boundary from '@shared/ui/Boundary.vue';
import type { AiSuggestion } from '@entities/writing/types';

defineProps<{
  suggestions: AiSuggestion[];
  pending: boolean;
  error: string | null;
}>();

const emit = defineEmits<{
  decide: [suggestionId: string, accept: boolean];
  locate: [suggestion: AiSuggestion];
}>();

function statusLabel(status: AiSuggestion['status']): string {
  return status === 'accepted' ? '已接受' : status === 'rejected' ? '已拒绝' : '待处理';
}
</script>

<template>
  <div
    class="diff-panel"
    aria-label="AI 修订建议"
  >
    <div class="panel-head">
      <p class="side-title">
        AI 修订建议（{{ suggestions.length }}）
      </p>
      <p class="hint">
        AI 内容仅作为差异修订，逐项接受或拒绝后才会写入源文件。
      </p>
    </div>

    <Boundary
      v-if="error"
      tone="danger"
      title="建议加载失败"
    >
      {{ error }}
    </Boundary>

    <p
      v-else-if="suggestions.length === 0"
      class="empty"
    >
      暂无 AI 修订建议。保存文稿后 AI 可给出逐条润色建议。
    </p>

    <ul class="sg-list">
      <li
        v-for="sg in suggestions"
        :key="sg.id"
        class="sg"
        :class="{ done: sg.status !== 'pending' }"
      >
        <div class="sg-head">
          <FileText :size="13" />
          <span class="sg-file">{{ sg.file_path }}</span>
          <span class="sg-lines">L{{ sg.line_from }}–{{ sg.line_to }}</span>
          <span
            class="sg-state"
            :class="sg.status"
          >{{ statusLabel(sg.status) }}</span>
        </div>

        <div class="sg-cols">
          <div class="sg-col orig">
            <p class="col-label">
              原文
            </p>
            <pre class="code">{{ sg.original }}</pre>
          </div>
          <div class="sg-col sugg">
            <p class="col-label">
              建议
            </p>
            <pre class="code">{{ sg.suggested }}</pre>
          </div>
        </div>

        <dl class="reason">
          <dt>理由</dt>
          <dd>{{ sg.reason }}</dd>
          <dt>风险</dt>
          <dd :class="{ high: sg.risk.includes('高') }">
            {{ sg.risk }}
          </dd>
        </dl>

        <div class="sg-actions">
          <button
            type="button"
            class="mini-btn"
            :disabled="pending || sg.status !== 'pending'"
            @click="emit('locate', sg)"
          >
            <Locate :size="12" />
            定位
          </button>
          <button
            type="button"
            class="mini-btn ok"
            :disabled="pending || sg.status !== 'pending'"
            :aria-label="`接受建议 ${sg.id}`"
            @click="emit('decide', sg.id, true)"
          >
            <Check :size="12" />
            接受
          </button>
          <button
            type="button"
            class="mini-btn no"
            :disabled="pending || sg.status !== 'pending'"
            :aria-label="`拒绝建议 ${sg.id}`"
            @click="emit('decide', sg.id, false)"
          >
            <X :size="12" />
            拒绝
          </button>
        </div>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.diff-panel {
  display: grid;
  gap: 8px;
  align-content: start;
}
.panel-head {
  display: grid;
  gap: 3px;
}
.side-title,
.hint {
  margin: 0;
}
.side-title {
  font-size: var(--font-size-sm);
  font-weight: 800;
}
.hint {
  font-size: var(--font-size-xs);
  color: var(--text-muted);
}
.empty {
  margin: 0;
  color: var(--text-muted);
  font-size: var(--font-size-xs);
}
.sg-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 9px;
}
.sg {
  border: 1px solid var(--border);
  border-radius: 9px;
  padding: 9px;
  background: var(--surface);
}
.sg.done {
  opacity: 0.72;
}
.sg-head {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--font-size-xs);
  margin-bottom: 6px;
}
.sg-file {
  font-family: var(--mono);
  font-weight: 700;
}
.sg-lines {
  color: var(--text-muted);
}
.sg-state {
  margin-left: auto;
  font-weight: 800;
  padding: 1px 7px;
  border-radius: 999px;
  background: var(--warning-bg);
  color: var(--ailp-warning-600);
}
.sg-state.accepted {
  background: var(--success-bg);
  color: var(--ailp-success-600);
}
.sg-state.rejected {
  background: var(--danger-bg);
  color: var(--ailp-error-600);
}
.sg-cols {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 7px;
}
.col-label {
  margin: 0 0 3px;
  font-size: 10px;
  font-weight: 800;
  color: var(--text-muted);
}
.sg-col.orig .code {
  background: var(--danger-bg);
  border-color: var(--danger-bg);
}
.sg-col.sugg .code {
  background: var(--success-bg);
  border-color: var(--success-bg);
}
.code {
  margin: 0;
  padding: 6px 8px;
  border: 1px solid var(--border);
  border-radius: 6px;
  font-family: var(--mono);
  font-size: 11px;
  line-height: 1.5;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.reason {
  display: grid;
  grid-template-columns: 52px 1fr;
  gap: 2px 8px;
  margin: 7px 0 0;
  font-size: var(--font-size-xs);
}
.reason dt {
  color: var(--text-muted);
  font-weight: 700;
}
.reason dd {
  margin: 0;
}
.reason dd.high {
  color: var(--danger);
  font-weight: 700;
}
.sg-actions {
  display: flex;
  gap: 6px;
  margin-top: 8px;
}
.mini-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 26px;
  padding: 2px 9px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--surface);
  font-size: var(--font-size-xs);
  font-weight: 700;
  cursor: pointer;
}
.mini-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.mini-btn.ok {
  color: var(--ailp-success-600);
  border-color: var(--success-bg);
}
.mini-btn.no {
  color: var(--danger);
  border-color: var(--danger-bg);
}
@media (max-width: 1080px) {
  .sg-cols {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
