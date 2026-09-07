<script setup lang="ts">
/**
 * 待审主张列表（公式/定理/前提，用户可修正 → HumanDecision 审计语义）。
 * - 作者模式：修正表述 + 发起分层验证（L0-L4）/ Lean（三状态）。
 * - 展开项懒加载验证结果与 Lean 三状态（未运行 → 显示「未运行」而非错误）。
 */
import { computed, reactive, ref } from 'vue';
import { useQueryClient } from '@tanstack/vue-query';
import { ChevronDown, ChevronRight, Loader2 } from 'lucide-vue-next';
import { apiRequest } from '@app/api/client';
import { config } from '@app/config';
import { reviewKeys, useCorrectClaim, useLean, useRunLeanDirect, useStartVerification, useVerification } from '@features/review/queries';
import { CLAIM_SUPPORT_LABELS } from '@features/review/lean-overall';
import { useRunEvents } from '@features/runs/use-run-events';
import type { ReviewClaim, ReviewMode, VerificationLayer } from '@entities/review/types';
import VerifyLayerList from '@widgets/VerifyLayerList/VerifyLayerList.vue';
import LeanThreeStatesView from '@widgets/LeanThreeStates/LeanThreeStates.vue';

const props = defineProps<{ paperId: string; claims: ReviewClaim[]; mode: ReviewMode }>();

const KIND_LABELS: Record<ReviewClaim['kind'], string> = { formula: '公式', theorem: '定理', assumption: '前提' };

const queryClient = useQueryClient();
const expandedId = ref<string | null>(null);
const drafts = reactive<Record<string, string>>({});
const correctMutation = useCorrectClaim(props.paperId);
const startVerification = useStartVerification();
const runLeanDirectMutation = useRunLeanDirect();
const leanDirectResult = ref<{ status: string; kernel_state: string; translation_fidelity: string; build_log: string | null; error_message?: string } | null>(null);
const leanDirectRunning = ref(false);

const expandedClaimId = computed(() => expandedId.value);
const verificationQuery = useVerification(expandedClaimId);
const leanQuery = useLean(expandedClaimId);

// ---------- 验证/Lean run（SSE 进度 + 完成后失效缓存） ----------
const runningClaimId = ref<string | null>(null);
const runningMethod = ref<'layers' | 'lean'>('layers');
const { progressMessage, streaming } = useRunEvents(runningClaimId, {
  onComplete: () => {
    if (!runningClaimId.value) return;
    void queryClient.invalidateQueries({ queryKey: reviewKeys.verification(runningClaimId.value) });
    void queryClient.invalidateQueries({ queryKey: reviewKeys.lean(runningClaimId.value) });
  },
});

async function runCheck(claimId: string, method: 'layers' | 'lean'): Promise<void> {
  runningClaimId.value = claimId;
  runningMethod.value = method;
  expandedId.value = claimId;
  try {
    await startVerification.mutateAsync({ claimId, mockMethod: method });
  } catch {
    runningClaimId.value = null;
  }
}


async function runLeanDirectCheck(claim: ReviewClaim): Promise<void> {
  const source = displayStatement(claim);
  if (!source.trim()) return;
  leanDirectRunning.value = true;
  leanDirectResult.value = null;
  expandedId.value = claim.id;
  try {
    const result = await runLeanDirectMutation.mutateAsync({ source, statement: source });
    leanDirectResult.value = result;
  } catch (err) {
    leanDirectResult.value = {
      status: 'error',
      kernel_state: 'NOT_RUN',
      translation_fidelity: 'NOT_RUN',
      build_log: null,
      error_message: err instanceof Error ? err.message : String(err),
    };
  } finally {
    leanDirectRunning.value = false;
  }
}
function toggleExpand(claimId: string): void {
  expandedId.value = expandedId.value === claimId ? null : claimId;
}

function displayStatement(claim: ReviewClaim): string {
  return claim.corrected_statement ?? claim.statement;
}

function saveCorrection(claim: ReviewClaim): void {
  const value = drafts[claim.id]?.trim();
  if (!value) return;
  void correctMutation.mutateAsync({ claimId: claim.id, correctedStatement: value }).then(() => {
    delete drafts[claim.id];
  });
}

// ---------- 真实验证引擎（统一身份模式：SymPy/mpmath/Z3 直连科研后端） ----------
interface RealCheckLayer {
  layer: string;
  status: 'passed' | 'unverifiable' | 'counterexample' | 'formal_pending' | 'not_run';
  contract_status: string;
  method: string;
  summary: string;
  limitations: string[];
  evidence: Record<string, unknown>;
  counterexample: Record<string, unknown> | null;
}
interface RealCheckResponse {
  engine: string;
  layers: RealCheckLayer[];
  verdict: { all_passed: boolean; has_counterexample: boolean; any_unverifiable: boolean; pending_formal: boolean };
}

const REAL_LAYER_CODE: Record<string, VerificationLayer['layer']> = {
  L0_SYNTAX: 'L0',
  L1_ASSUMPTION: 'L1',
  L2_SYMBOLIC: 'L2',
  L3_NUMERIC: 'L3',
  L4_COUNTEREXAMPLE: 'L4',
};
const REAL_LAYER_LABELS: Record<string, string> = {
  L0_SYNTAX: '语法解析',
  L1_ASSUMPTION: '假设与定义域',
  L2_SYMBOLIC: '符号等价',
  L3_NUMERIC: '数值重算',
  L4_COUNTEREXAMPLE: '反例搜索',
};

const realLayers = reactive<Record<string, VerificationLayer[] | undefined>>({});
const realRunning = ref<string | null>(null);
const realError = ref<string | null>(null);

function mapRealStatus(status: RealCheckLayer['status']): VerificationLayer['status'] {
  if (status === 'passed') return 'passed';
  if (status === 'counterexample') return 'failed';
  if (status === 'unverifiable' || status === 'formal_pending') return 'inconclusive';
  return 'not_run';
}

function mapRealCounterexample(raw: Record<string, unknown>): VerificationLayer['counterexample'] {
  if (!raw) return null;
  const values = raw['values'];
  const asString = (key: string): string => {
    const value = raw[key];
    return value === undefined || value === null ? '' : String(value);
  };
  return {
    assignment: values !== undefined ? JSON.stringify(values) : asString('assignment'),
    assumption_check: asString('premise_check') || asString('assumption_check'),
    recompute: asString('recomputed') || asString('recompute') || asString('simplified_difference'),
  };
}

/** 调用科研后端真实验证引擎（/verification/check），结果按五层独立显示。 */
async function runRealCheck(claim: ReviewClaim): Promise<void> {
  realRunning.value = claim.id;
  realError.value = null;
  try {
    const result = await apiRequest<RealCheckResponse>('/verification/check', {
      method: 'POST',
      body: { expression: displayStatement(claim), assumptions: claim.assumptions },
    }).then((e) => e.data);
    realLayers[claim.id] = result.layers.map((item) => ({
      layer: REAL_LAYER_CODE[item.layer] ?? 'L0',
      label: REAL_LAYER_LABELS[item.layer] ?? item.layer,
      method: item.method,
      status: mapRealStatus(item.status),
      summary: [item.summary, ...item.limitations.map((l) => `限制：${l}`)].filter(Boolean).join('；'),
      tool_name: String(item.evidence['tool_name'] ?? 'research-verification'),
      tool_version: String(item.evidence['tool_version'] ?? ''),
      counterexample: mapRealCounterexample(item.counterexample ?? {}),
    }));
  } catch (err) {
    realError.value = err instanceof Error ? err.message : '真实验证引擎调用失败。';
  } finally {
    realRunning.value = null;
  }
}
</script>

<template>
  <ul
    class="claims"
    aria-label="待审主张（公式/定理/前提）"
  >
    <li
      v-for="claim in claims"
      :key="claim.id"
      class="claim-card"
      :data-claim-id="claim.id"
    >
      <header class="claim-head">
        <span
          class="kind-chip"
          aria-label="主张类型"
        >{{ KIND_LABELS[claim.kind] }}</span>
        <span
          class="support-badge"
          :data-support="claim.evidence_support"
        >{{ CLAIM_SUPPORT_LABELS[claim.evidence_support] }}</span>
        <button
          class="expand-btn"
          type="button"
          :aria-expanded="expandedId === claim.id"
          @click="toggleExpand(claim.id)"
        >
          <component
            :is="expandedId === claim.id ? ChevronDown : ChevronRight"
            :size="14"
            aria-hidden="true"
          />
          验证详情
        </button>
      </header>

      <p class="statement mono">
        {{ displayStatement(claim) }}
      </p>
      <p
        v-if="claim.corrected_statement"
        class="corrected-note"
      >
        已修正（原表述：{{ claim.statement }}）
      </p>
      <p
        v-if="claim.quote"
        class="quote"
      >
        原文（第 {{ (claim.page_index ?? 0) + 1 }} 页）：「{{ claim.quote }}」
      </p>
      <ul
        v-if="claim.assumptions.length > 0"
        class="assumptions"
        aria-label="前提"
      >
        <li
          v-for="(a, i) in claim.assumptions"
          :key="i"
          class="mono"
        >
          前提：{{ a }}
        </li>
      </ul>

      <!-- 作者模式：修正 + 发起验证 -->
      <div
        v-if="mode === 'author'"
        class="author-actions"
      >
        <label :for="`correct-${claim.id}`">修正表述（HumanDecision 审计）</label>
        <textarea
          :id="`correct-${claim.id}`"
          v-model="drafts[claim.id]"
          class="mono"
          rows="2"
          :placeholder="claim.statement"
        />
        <div class="action-row">
          <button
            class="btn small"
            type="button"
            :disabled="!drafts[claim.id]?.trim() || correctMutation.isPending.value"
            @click="saveCorrection(claim)"
          >
            保存修正
          </button>
          <button
            class="btn small"
            type="button"
            :disabled="streaming"
            @click="runCheck(claim.id, 'layers')"
          >
            运行分层验证（L0-L4）
          </button>
          <button
            class="btn small"
            type="button"
            :disabled="streaming"
            @click="runCheck(claim.id, 'lean')"
          >
            运行 Lean
          </button>
        </div>
      </div>

      <!-- 展开区：真实验证引擎 + 验证五层 + Lean 三状态 -->
      <div
        v-if="expandedId === claim.id"
        class="expand-body"
      >
        <div
          v-if="config.oidcEnabled"
          class="real-engine"
        >
          <div class="action-row">
            <button
              class="btn small"
              type="button"
              :disabled="realRunning === claim.id"
              @click="runRealCheck(claim)"
            >
              {{ realRunning === claim.id ? '真实引擎运行中…' : '运行真实验证引擎（SymPy/mpmath/Z3）' }}
            </button>
            <button
              class="btn small"
              type="button"
              :disabled="leanDirectRunning"
              @click="runLeanDirectCheck(claim)"
            >
              {{ leanDirectRunning ? 'Lean 运行中…' : '运行 Lean 形式化验证（直连）' }}
            </button>
          </div>
          <p
            v-if="realError"
            class="real-error"
            role="alert"
          >
            {{ realError }}
          </p>
          <template v-if="realLayers[claim.id]">
            <h4>真实引擎分层验证（SymPy/mpmath/Z3 直连科研后端，五能力独立）</h4>
            <VerifyLayerList :layers="realLayers[claim.id] ?? []" />
          </template>
        </div>
        <div
          v-if="streaming && runningClaimId === claim.id"
          class="running-line"
          role="status"
        >
          <Loader2
            :size="14"
            class="spin"
            aria-hidden="true"
          />
          {{ runningMethod === 'lean' ? 'Lean 运行中' : '分层验证运行中' }}{{ progressMessage ? `：${progressMessage}` : '…' }}
        </div>
        <template v-if="verificationQuery.data.value">
          <h4>分层验证（五能力独立，不合并总分）</h4>
          <VerifyLayerList :layers="verificationQuery.data.value" />
        </template>
        <p
          v-else
          class="muted"
        >
          暂无分层验证记录。
        </p>
        <template v-if="leanQuery.data.value">
          <h4>Lean 三状态分项（翻译 / 内核 / 科研结论）</h4>
          <LeanThreeStatesView :lean="leanQuery.data.value" />
        </template>
        <template v-if="leanDirectResult">
          <h4>Lean 形式化验证结果（直连 POST /verification/lean）</h4>
          <div class="lean-direct-result" :data-status="leanDirectResult.status">
            <p class="lean-h9-note" role="note"><b>H9：形式化陈述已验证 ≠ 论文结论成立</b> — Lean 结果与 L0-L4 独立展示，永不合并为论文正确标志。</p>
            <div class="lean-direct-states">
              <div class="lean-state-item">
                <span class="lean-state-label">内核状态 (kernel_state)</span>
                <span class="lean-state-value" :class="'kernel-' + leanDirectResult.kernel_state.toLowerCase()">{{ leanDirectResult.kernel_state }}</span>
              </div>
              <div class="lean-state-item">
                <span class="lean-state-label">翻译忠实度 (translation_fidelity)</span>
                <span class="lean-state-value" :class="'fidelity-' + leanDirectResult.translation_fidelity.toLowerCase()">{{ leanDirectResult.translation_fidelity }}</span>
              </div>
              <div class="lean-state-item">
                <span class="lean-state-label">运行状态 (status)</span>
                <span class="lean-state-value">{{ leanDirectResult.status }}</span>
              </div>
            </div>
            <pre v-if="leanDirectResult.build_log" class="lean-build-log">{{ leanDirectResult.build_log }}</pre>
            <p v-if="leanDirectResult.error_message" class="lean-error" role="alert">错误：{{ leanDirectResult.error_message }}</p>
          </div>
        </template>
        <p
          v-if="!leanQuery.data.value && !leanDirectResult"
          class="muted"
        >
          该主张未运行 Lean。
        </p>
      </div>

      <Boundary
        v-if="expandedId === claim.id && !verificationQuery.data.value && !leanQuery.data.value && !streaming"
        tone="info"
        title="该主张暂无验证记录"
      >
        作者模式可在上方发起分层验证或 Lean；结果将按 L0-L4 与三状态分项显示。
      </Boundary>
    </li>
  </ul>
</template>

<style scoped>
.claims {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 12px;
}
.claim-card {
  border: 1px solid var(--border);
  border-radius: var(--r);
  background: var(--surface);
  padding: 14px;
  display: grid;
  gap: 8px;
}
.claim-head {
  display: flex;
  align-items: center;
  gap: 8px;
}
.kind-chip {
  display: inline-flex;
  padding: 2px 9px;
  border-radius: 999px;
  background: var(--primary-soft);
  color: var(--primary);
  font-size: var(--font-size-xs);
  font-weight: 800;
}
.support-badge {
  display: inline-flex;
  padding: 2px 9px;
  border-radius: 999px;
  border: 1px solid var(--border);
  font-size: var(--font-size-xs);
  font-weight: 700;
  color: var(--ink-2);
}
.support-badge[data-support='supported'] { border-color: #bfdfd0; color: var(--success); background: var(--success-bg); }
.support-badge[data-support='partial'] { border-color: #ead29e; color: var(--warning); background: var(--warning-bg); }
.support-badge[data-support='conflicting'] { border-color: #e6c0bc; color: var(--danger); background: var(--danger-bg); }
.expand-btn {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  border: 1px solid var(--border);
  background: var(--surface);
  border-radius: 6px;
  padding: 3px 9px;
  font-size: var(--font-size-xs);
  cursor: pointer;
  color: var(--ink-2);
}
.statement {
  margin: 0;
  font-size: var(--font-size-sm);
  line-height: 1.55;
}
.corrected-note {
  margin: 0;
  font-size: var(--font-size-xs);
  color: var(--success);
}
.quote {
  margin: 0;
  font-size: var(--font-size-xs);
  color: var(--muted);
}
.assumptions {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.assumptions li {
  border: 1px dashed var(--border);
  border-radius: 6px;
  padding: 2px 8px;
  font-size: var(--font-size-xs);
  color: var(--ink-2);
}
.author-actions {
  border-top: 1px dashed var(--border);
  padding-top: 10px;
  display: grid;
  gap: 6px;
}
.author-actions label {
  font-size: var(--font-size-xs);
  font-weight: 700;
  color: var(--muted);
}
textarea {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: 7px;
  padding: 8px 10px;
  font-size: var(--font-size-sm);
  resize: vertical;
  background: var(--surface);
  color: var(--text);
}
.action-row {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}
.btn {
  border: 1px solid var(--border);
  background: var(--surface);
  border-radius: 7px;
  padding: 5px 11px;
  font-size: var(--font-size-xs);
  font-weight: 700;
  cursor: pointer;
  color: var(--text);
}
.btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.expand-body {
  border-top: 1px solid var(--border);
  padding-top: 10px;
  display: grid;
  gap: 10px;
}
.expand-body h4 {
  margin: 0;
  font-size: var(--font-size-xs);
  color: var(--muted);
}
.real-engine {
  display: grid;
  gap: 8px;
  border: 1px dashed var(--border);
  border-radius: var(--r);
  padding: 10px;
}
.real-error {
  margin: 0;
  color: var(--danger);
  font-size: var(--font-size-xs);
}
.running-line {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--font-size-xs);
  color: var(--info);
}
.spin {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
.muted {
  margin: 0;
  font-size: var(--font-size-xs);
  color: var(--muted);
}
.mono {
  font-family: var(--mono);
  word-break: break-word;
}

.lean-direct-result {
  border: 1px solid var(--ailp-border, #e5e7eb);
  border-radius: 8px;
  padding: 12px 16px;
  margin: 8px 0;
  background: var(--ailp-bg-subtle, #f9fafb);
}
.lean-h9-note {
  font-size: 13px;
  color: var(--ailp-text-secondary, #6b7280);
  margin: 0 0 12px 0;
  padding: 8px 12px;
  background: var(--ailp-accent-subtle, #fef3c7);
  border-left: 3px solid var(--ailp-accent, #f59e0b);
  border-radius: 4px;
}
.lean-direct-states {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}
.lean-state-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.lean-state-label {
  font-size: 12px;
  color: var(--ailp-text-secondary, #6b7280);
}
.lean-state-value {
  font-size: 14px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 4px;
  display: inline-block;
}
.kernel-passed { background: #d1fae5; color: #065f46; }
.kernel-failed { background: #fee2e2; color: #991b1b; }
.kernel-timed_out { background: #fef3c7; color: #92400e; }
.kernel-not_run { background: #f3f4f6; color: #6b7280; }
.fidelity-confirmed { background: #d1fae5; color: #065f46; }
.fidelity-partial { background: #fef3c7; color: #92400e; }
.fidelity-diverged { background: #fee2e2; color: #991b1b; }
.fidelity-not_run { background: #f3f4f6; color: #6b7280; }
.lean-build-log {
  background: #1f2937;
  color: #e5e7eb;
  padding: 12px;
  border-radius: 6px;
  font-size: 12px;
  overflow-x: auto;
  max-height: 200px;
  overflow-y: auto;
}
.lean-error {
  color: #991b1b;
  font-size: 13px;
  margin: 8px 0 0 0;
}</style>
