<script setup lang="ts">
/**
 * 审批卡（02 §5.9 ApprovalRequest 冻结结构 + 06 §8 步骤 6）。
 * - 动作 / 理由 / 参数摘要（redacted）/ 参数哈希绑定 / 风险级 / 预算估计 / 数据范围。
 * - 决策：批准 / 拒绝；参数变更（哈希不匹配）→ 原审批失效（cancelled），需重审。
 * - 体验轨 TC-X06-02：按钮原生 button 键盘可达；状态图标+文字不只靠颜色。
 */
import { computed } from 'vue';
import { ShieldCheck, ShieldAlert, CheckCircle2, XCircle, Ban } from 'lucide-vue-next';
import { useDecideApproval } from '@features/steward/queries';
import type { ApprovalView } from '@entities/steward/types';

const props = defineProps<{ approval: ApprovalView }>();

const decideMutation = useDecideApproval();

const isPending = computed(() => props.approval.status === 'pending');

const RISK_LABELS: Record<ApprovalView['risk_tier'], string> = {
  low: '低风险',
  moderate: '中风险',
  high: '高风险',
  prohibited: '禁止类',
};

function statusIcon(status: ApprovalView['status']) {
  switch (status) {
    case 'approved':
      return CheckCircle2;
    case 'rejected':
      return XCircle;
    case 'cancelled':
    case 'expired':
      return Ban;
    default:
      return ShieldAlert;
  }
}
function statusText(status: ApprovalView['status']): string {
  switch (status) {
    case 'approved':
      return '已批准';
    case 'rejected':
      return '已拒绝';
    case 'cancelled':
      return '已失效（需重审）';
    case 'expired':
      return '已过期';
    default:
      return '待决策';
  }
}

function approve(): void {
  void decideMutation.mutateAsync({ approvalId: props.approval.id, decision: 'approved' });
}
function reject(): void {
  void decideMutation.mutateAsync({ approvalId: props.approval.id, decision: 'rejected' });
}
/** 演练钩子（与 F2 simulate_unavailable 同性质）：模拟参数在审批等待期间被修改。 */
function rejectWithParamsChanged(): void {
  void decideMutation.mutateAsync({ approvalId: props.approval.id, decision: 'rejected', paramsChanged: true });
}
</script>

<template>
  <article
    class="approval"
    :data-status="approval.status"
    :aria-label="`审批卡：${approval.action}`"
  >
    <header class="head">
      <component
        :is="statusIcon(approval.status)"
        :size="15"
        aria-hidden="true"
      />
      <b class="action mono">{{ approval.action }}</b>
      <span
        class="risk"
        :data-risk="approval.risk_tier"
      >{{ RISK_LABELS[approval.risk_tier] }}</span>
      <span class="status">{{ statusText(approval.status) }}</span>
    </header>

    <p class="reason">
      {{ approval.reason }}
    </p>

    <dl class="params">
      <div
        v-for="(value, key) in approval.arguments_redacted"
        :key="key"
      >
        <dt class="mono">
          {{ key }}
        </dt>
        <dd class="mono">
          {{ value }}
        </dd>
      </div>
    </dl>
    <p class="hash">
      参数哈希绑定：<span class="mono">{{ approval.arguments_hash || '—' }}</span>
    </p>
    <p class="meta">
      <template v-if="approval.estimated_cost_minor_units !== null">
        预估成本 {{ (approval.estimated_cost_minor_units / 100).toFixed(2) }} 元 ·
      </template>
      <template v-if="approval.data_scope.length > 0">
        数据范围：{{ approval.data_scope.join('、') }} ·
      </template>
      <template v-if="approval.expires_at">
        过期时间 {{ new Date(approval.expires_at).toLocaleString('zh-CN') }}
      </template>
    </p>

    <p
      v-if="approval.resolution_note"
      class="resolution"
    >
      {{ approval.resolution_note }}
    </p>

    <div
      v-if="isPending"
      class="decisions"
    >
      <button
        class="btn ok"
        type="button"
        :disabled="decideMutation.isPending.value"
        @click="approve"
      >
        <ShieldCheck
          :size="13"
          aria-hidden="true"
        />
        批准
      </button>
      <button
        class="btn danger"
        type="button"
        :disabled="decideMutation.isPending.value"
        @click="reject"
      >
        <XCircle
          :size="13"
          aria-hidden="true"
        />
        拒绝
      </button>
      <button
        class="btn"
        type="button"
        :disabled="decideMutation.isPending.value"
        title="演练：等待期间参数被修改 → 原审批失效"
        @click="rejectWithParamsChanged"
      >
        模拟参数变更
      </button>
    </div>
  </article>
</template>

<style scoped>
.approval {
  border: 1px solid var(--border);
  border-radius: var(--r);
  background: var(--surface);
  padding: 12px;
  display: grid;
  gap: 8px;
}
.head {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.action {
  font-size: var(--font-size-sm);
  font-weight: 800;
}
.risk {
  display: inline-flex;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: var(--font-size-xs);
  font-weight: 800;
}
.risk[data-risk='high'] { background: var(--danger-bg); color: var(--danger); border: 1px solid var(--danger-bg); }
.risk[data-risk='moderate'] { background: var(--warning-bg); color: var(--warning); border: 1px solid var(--warning-bg); }
.risk[data-risk='low'] { background: var(--success-bg); color: var(--success); border: 1px solid var(--success-bg); }
.risk[data-risk='prohibited'] { background: var(--danger-bg); color: var(--danger); border: 1px dashed var(--danger); }
.status {
  margin-left: auto;
  font-size: var(--font-size-xs);
  font-weight: 700;
  color: var(--muted);
}
[data-status='pending'] .status { color: var(--warning); }
[data-status='approved'] .status { color: var(--success); }
[data-status='rejected'] .status { color: var(--danger); }
.reason {
  margin: 0;
  font-size: var(--font-size-xs);
  color: var(--ink-2);
  line-height: 1.55;
}
.params {
  margin: 0;
  display: grid;
  gap: 3px;
}
.params div {
  display: flex;
  gap: 8px;
  font-size: var(--font-size-xs);
}
.params dt {
  color: var(--muted);
  min-width: 40%;
}
.params dd {
  margin: 0;
}
.hash {
  margin: 0;
  font-size: var(--font-size-xs);
  color: var(--muted);
}
.meta {
  margin: 0;
  font-size: var(--font-size-xs);
  color: var(--muted);
}
.resolution {
  margin: 0;
  font-size: var(--font-size-xs);
  color: var(--warning);
  background: var(--warning-bg);
  border-radius: 7px;
  padding: 6px 9px;
}
.decisions {
  display: flex;
  gap: 7px;
  flex-wrap: wrap;
}
.btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: 1px solid var(--border);
  background: var(--surface);
  border-radius: 7px;
  padding: 5px 11px;
  font-size: var(--font-size-xs);
  font-weight: 700;
  cursor: pointer;
}
.btn.ok { color: var(--success); border-color: var(--success-bg); }
.btn.danger { color: var(--danger); border-color: var(--danger-bg); }
.btn:disabled { opacity: 0.55; cursor: not-allowed; }
.mono {
  font-family: var(--mono);
  word-break: break-all;
}
</style>
