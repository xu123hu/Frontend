<script setup lang="ts">
/**
 * Lean 三状态分项（M4 §8.4 / 02 §5.6）。
 * 红线：形式化翻译 / 内核状态 / 科研结论支持度三列独立；
 * 任一 partial → 综合 partial_supported；永不显示「论文正确」。
 */
import { computed } from 'vue';
import { CheckCircle2, XCircle, AlertTriangle, MinusCircle, ShieldAlert } from 'lucide-vue-next';
import type { LeanThreeStates } from '@entities/review/types';

const props = defineProps<{ lean: LeanThreeStates }>();

const TRANSLATION_LABELS: Record<LeanThreeStates['translation_fidelity'], string> = {
  faithful: '忠实（faithful）',
  partial: '部分忠实（partial）',
  diverged: '偏离（diverged）',
  not_run: '未运行',
};
const KERNEL_LABELS: Record<LeanThreeStates['kernel_status'], string> = {
  succeeded: '内核接受（succeeded）',
  failed: '内核拒绝（failed）',
  timed_out: '超时（timed_out）',
  awaiting_statement_confirm: '等待确认陈述',
  not_run: '未运行',
};
const SUPPORT_LABELS: Record<LeanThreeStates['claim_support'], string> = {
  full: '完整支持（full）',
  partial: '部分支持（partial）',
  unsupported: '不支持（unsupported）',
  not_verified: '未验证',
};

const OVERALL_TEXT: Record<LeanThreeStates['overall'], string> = {
  supported: '该主张被支持（supported）——仅指该主张，不等于论文正确',
  partial_supported: '部分支持（partial_supported）——通过 Lean ≠ 论文正确',
  rejected: '不支持（rejected）',
  pending: '待定（pending）',
};

const columns = computed(() => [
  { key: 'translation', title: '形式化翻译', text: TRANSLATION_LABELS[props.lean.translation_fidelity], tone: toneOf(props.lean.translation_fidelity === 'faithful' ? 'ok' : props.lean.translation_fidelity === 'not_run' ? 'idle' : 'warn') },
  { key: 'kernel', title: '内核状态', text: KERNEL_LABELS[props.lean.kernel_status], tone: toneOf(props.lean.kernel_status === 'succeeded' ? 'ok' : props.lean.kernel_status === 'not_run' || props.lean.kernel_status === 'awaiting_statement_confirm' ? 'idle' : 'bad') },
  { key: 'support', title: '科研结论支持度', text: SUPPORT_LABELS[props.lean.claim_support], tone: toneOf(props.lean.claim_support === 'full' ? 'ok' : props.lean.claim_support === 'partial' ? 'warn' : props.lean.claim_support === 'unsupported' ? 'bad' : 'idle') },
]);

function toneOf(kind: 'ok' | 'warn' | 'bad' | 'idle'): string {
  return kind;
}
</script>

<template>
  <div
    class="lean"
    :data-overall="lean.overall"
  >
    <div
      v-if="lean.overall !== 'supported'"
      class="overall-banner"
      :class="{ rejected: lean.overall === 'rejected' }"
      role="alert"
    >
      <ShieldAlert
        :size="16"
        aria-hidden="true"
      />
      <span><b>综合状态：{{ OVERALL_TEXT[lean.overall] }}</b></span>
    </div>
    <div
      v-else
      class="overall-banner ok"
    >
      <CheckCircle2
        :size="16"
        aria-hidden="true"
      />
      <span><b>综合状态：{{ OVERALL_TEXT[lean.overall] }}</b></span>
    </div>

    <div class="columns">
      <div
        v-for="col in columns"
        :key="col.key"
        class="col"
        :data-tone="col.tone"
      >
        <h4>{{ col.title }}</h4>
        <p>
          <component
            :is="col.tone === 'ok' ? CheckCircle2 : col.tone === 'bad' ? XCircle : col.tone === 'warn' ? AlertTriangle : MinusCircle"
            :size="13"
            aria-hidden="true"
          />
          {{ col.text }}
        </p>
      </div>
    </div>

    <p class="sorry-check">
      no sorry/admit 检查：
      <b>{{ lean.sorry_admit_free === null ? '未检查' : lean.sorry_admit_free ? '通过（无 sorry/admit）' : '未通过（存在 sorry/admit）' }}</b>
    </p>

    <ul
      v-if="lean.diagnostics.length > 0"
      class="diagnostics"
      aria-label="Lean 诊断"
    >
      <li
        v-for="(d, i) in lean.diagnostics"
        :key="i"
      >
        {{ d }}
      </li>
    </ul>
  </div>
</template>

<style scoped>
.lean {
  display: grid;
  gap: 10px;
}
.overall-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid #ead29e;
  background: var(--warning-bg);
  color: var(--warning);
  border-radius: var(--r);
  padding: 9px 12px;
  font-size: var(--font-size-sm);
}
.overall-banner.ok {
  border-color: #bfdfd0;
  background: var(--success-bg);
  color: var(--success);
}
.overall-banner.rejected {
  border-color: #e6c0bc;
  background: var(--danger-bg);
  color: var(--danger);
}
.columns {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}
.col {
  border: 1px solid var(--border);
  border-radius: var(--r);
  padding: 10px 12px;
  background: var(--surface);
}
.col h4 {
  margin: 0 0 6px;
  font-size: var(--font-size-xs);
  color: var(--muted);
}
.col p {
  margin: 0;
  font-size: var(--font-size-xs);
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 5px;
}
.col[data-tone='ok'] p { color: var(--success); }
.col[data-tone='bad'] p { color: var(--danger); }
.col[data-tone='warn'] p { color: var(--warning); }
.col[data-tone='idle'] p { color: var(--muted); }
.sorry-check {
  margin: 0;
  font-size: var(--font-size-xs);
  color: var(--ink-2);
}
.diagnostics {
  margin: 0;
  padding-left: 18px;
  font-size: var(--font-size-xs);
  color: var(--muted);
  display: grid;
  gap: 3px;
}
@media (max-width: 760px) {
  .columns {
    grid-template-columns: 1fr;
  }
}
</style>
