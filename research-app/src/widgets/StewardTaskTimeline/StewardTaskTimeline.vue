<script setup lang="ts">
/**
 * 管家任务时间线（06 §8 研究循环，F4 抽屉任务 Tab + ProjectDetail 复用）。
 * - 计划头：研究问题 / 推理策略 / 综合状态 / 进度 / 预算与花费（budget/spent，M0 冻结）。
 * - 步骤时间线：计划→执行→审批→拒绝→产物；拒绝步骤保留已完成证据 + 替代路径（06 §8 步骤 7）。
 * - 候选假设一律标记 hypothesis（04 红线：非 fact）。
 * - 研究循环完成后展示产物清单（研究问题/假设/主张/验证/限制/人工决定，06 §8 步骤 8）。
 * - 体验轨 TC-X06-01：状态图标+文字不只靠颜色。
 */
import { computed } from 'vue';
import {
  CircleDashed,
  Loader2,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  AlertTriangle,
  FlaskConical,
} from 'lucide-vue-next';
import { useCycleResult, useStewardPlans } from '@features/steward/queries';
import type { PlanStep, StewardPlan } from '@entities/steward/types';
import Skeleton from '@shared/ui/Skeleton.vue';
import EmptyState from '@shared/ui/EmptyState.vue';

const plansQuery = useStewardPlans();

const POLICY_LABELS: Record<StewardPlan['reasoning_policy'], string> = {
  quick: '快速',
  standard: '标准',
  rigorous: '严谨',
};
const STATUS_LABELS: Record<StewardPlan['status'], string> = {
  queued: '排队中',
  running: '执行中',
  paused: '已暂停（可恢复）',
  partial: '部分完成（含被拒绝步骤）',
  succeeded: '已完成',
  failed: '失败',
  cancelled: '已取消',
  budget_exhausted: '预算耗尽',
};

function stepIcon(status: PlanStep['status']) {
  switch (status) {
    case 'running':
      return Loader2;
    case 'succeeded':
      return CheckCircle2;
    case 'rejected':
      return XCircle;
    case 'awaiting_approval':
      return ShieldAlert;
    case 'failed':
      return AlertTriangle;
    default:
      return CircleDashed;
  }
}
function stepText(status: PlanStep['status']): string {
  switch (status) {
    case 'running':
      return '执行中';
    case 'succeeded':
      return '已完成';
    case 'rejected':
      return '已拒绝（证据保留）';
    case 'awaiting_approval':
      return '等待审批';
    case 'failed':
      return '失败';
    default:
      return '待执行';
  }
}
function money(minor: number): string {
  return (minor / 100).toFixed(2);
}

const plans = computed(() => plansQuery.data.value ?? []);
/** 产物查询挂在每个已完成计划上（组件内 map 不便；用首计划演示）。 */
const primaryPlan = computed(() => plans.value[0] ?? null);
const cycleResultQuery = useCycleResult(
  computed(() => (primaryPlan.value && (primaryPlan.value.status === 'succeeded' || primaryPlan.value.status === 'partial') ? primaryPlan.value.run_id : null)),
);
</script>

<template>
  <div class="timeline-root">
    <Skeleton
      v-if="plansQuery.isPending.value"
      label="管家计划加载中"
    />
    <EmptyState
      v-else-if="plans.length === 0"
      title="暂无研究循环计划"
      hint="在上方输入研究问题发起研究循环；计划、审批与产物会在此出现。"
    />

    <article
      v-for="plan in plans"
      :key="plan.run_id"
      class="plan"
      :data-status="plan.status"
      :aria-label="`研究循环计划：${plan.research_question}`"
    >
      <header class="plan-head">
        <p class="question">
          {{ plan.research_question }}
        </p>
        <span class="chips">
          <span
            class="chip"
            :data-tone="plan.reasoning_policy"
          >{{ POLICY_LABELS[plan.reasoning_policy] }}模式</span>
          <span class="chip status">{{ STATUS_LABELS[plan.status] }}</span>
        </span>
      </header>

      <div
        v-if="plan.progress !== null"
        class="progress"
        role="progressbar"
        :aria-valuenow="plan.progress"
        aria-valuemin="0"
        aria-valuemax="100"
        :aria-label="`计划进度 ${plan.progress}%`"
      >
        <div
          class="bar"
          :style="{ width: `${plan.progress}%` }"
        />
      </div>
      <p
        v-if="plan.stage_message"
        class="stage"
      >
        {{ plan.stage_message }}
      </p>

      <p
        v-if="plan.budget"
        class="budget"
      >
        预算：已花费 {{ money(plan.spent?.cost_minor_units ?? 0) }} / {{ money(plan.budget.max_cost_minor_units) }} 元 ·
        运行 {{ plan.spent?.runtime_seconds ?? 0 }} / {{ plan.budget.max_runtime_seconds }} 秒
      </p>

      <!-- 候选假设（全部标记 hypothesis，非 fact） -->
      <section
        v-if="plan.hypotheses.length > 0"
        class="hypotheses"
        aria-label="候选假设（均为假设，非结论）"
      >
        <h4>
          <FlaskConical
            :size="13"
            aria-hidden="true"
          />
          候选假设（hypothesis，非结论）
        </h4>
        <ul>
          <li
            v-for="h in plan.hypotheses"
            :key="h.id"
          >
            <span
              class="hyp-tag"
              aria-label="假设标记"
            >假设</span>
            {{ h.text }}
          </li>
        </ul>
      </section>

      <!-- 步骤时间线 -->
      <ol
        class="steps"
        aria-label="计划步骤时间线"
      >
        <li
          v-for="step in plan.steps"
          :key="step.id"
          class="step"
          :data-status="step.status"
        >
          <span class="step-icon">
            <component
              :is="stepIcon(step.status)"
              :size="15"
              :class="{ spin: step.status === 'running' }"
              aria-hidden="true"
            />
          </span>
          <div class="step-body">
            <div class="step-head">
              <b>{{ step.order }}. {{ step.title }}</b>
              <span class="step-status">{{ stepText(step.status) }}</span>
            </div>
            <p class="cap">
              能力：{{ step.capability }}
            </p>
            <p
              v-if="step.result_summary"
              class="result"
            >
              {{ step.result_summary }}
            </p>
            <!-- 拒绝步骤：已完成证据保留 + 替代路径（06 §8 步骤 7） -->
            <div
              v-if="step.status === 'rejected' && step.alternative_paths.length > 0"
              class="alternatives"
            >
              <p>替代路径：</p>
              <ul>
                <li
                  v-for="(alt, i) in step.alternative_paths"
                  :key="i"
                >
                  {{ alt }}
                </li>
              </ul>
            </div>
            <p
              v-if="step.status === 'awaiting_approval' && step.approval_id"
              class="approval-hint"
            >
              审批 ID：{{ step.approval_id }}（决策入口见下方审批卡）
            </p>
          </div>
        </li>
      </ol>

      <!-- 研究循环产物（完成后） -->
      <section
        v-if="plan === primaryPlan && cycleResultQuery.data.value"
        class="cycle-result"
        aria-label="研究循环产物"
      >
        <h4>研究循环产物</h4>
        <dl>
          <div>
            <dt>主张与支持度</dt>
            <dd>
              <ul>
                <li
                  v-for="(c, i) in cycleResultQuery.data.value.claims"
                  :key="i"
                >
                  {{ c.text }}（{{ c.support }}）
                </li>
              </ul>
            </dd>
          </div>
          <div>
            <dt>验证记录</dt>
            <dd>
              <ul>
                <li
                  v-for="(v, i) in cycleResultQuery.data.value.verification"
                  :key="i"
                >
                  {{ v.item }}：{{ v.status }}（{{ v.tool }}）
                </li>
              </ul>
            </dd>
          </div>
          <div>
            <dt>限制声明</dt>
            <dd>
              <ul>
                <li
                  v-for="(l, i) in cycleResultQuery.data.value.limitations"
                  :key="i"
                >
                  {{ l }}
                </li>
              </ul>
            </dd>
          </div>
          <div>
            <dt>人工决定</dt>
            <dd>
              <ul>
                <li
                  v-for="(d, i) in cycleResultQuery.data.value.human_decisions"
                  :key="i"
                >
                  {{ d }}
                </li>
              </ul>
            </dd>
          </div>
        </dl>
      </section>
    </article>
  </div>
</template>

<style scoped>
.timeline-root {
  display: grid;
  gap: 12px;
}
.plan {
  border: 1px solid var(--border);
  border-radius: var(--r);
  background: var(--surface);
  padding: 14px;
  display: grid;
  gap: 10px;
}
.plan-head {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: flex-start;
}
.question {
  margin: 0;
  font-weight: 750;
  font-size: var(--font-size-sm);
  line-height: 1.5;
}
.chips {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
  flex-wrap: wrap;
  justify-content: flex-end;
}
.chip {
  display: inline-flex;
  padding: 2px 9px;
  border-radius: 999px;
  font-size: var(--font-size-xs);
  font-weight: 800;
  background: var(--primary-soft);
  color: var(--primary);
}
.chip.status {
  background: var(--subtle-bg);
  color: var(--ink-2);
}
[data-status='partial'] .chip.status,
[data-status='paused'] .chip.status {
  background: var(--warning-bg);
  color: var(--warning);
}
[data-status='failed'],
[data-status='budget_exhausted'] .chip.status {
  background: var(--danger-bg);
  color: var(--danger);
}
[data-status='succeeded'] .chip.status {
  background: var(--success-bg);
  color: var(--success);
}
.progress {
  height: 6px;
  border-radius: 999px;
  background: var(--subtle-bg);
  overflow: hidden;
}
.bar {
  height: 100%;
  border-radius: inherit;
  background: var(--primary);
  transition: width 0.4s ease;
}
.stage {
  margin: 0;
  font-size: var(--font-size-xs);
  color: var(--muted);
}
.budget {
  margin: 0;
  font-size: var(--font-size-xs);
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}
.hypotheses h4,
.cycle-result h4 {
  margin: 0 0 6px;
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: var(--font-size-xs);
  color: var(--muted);
}
.hypotheses ul,
.alternatives ul,
.cycle-result dd ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 5px;
  font-size: var(--font-size-xs);
  line-height: 1.5;
}
.hyp-tag {
  display: inline-flex;
  padding: 1px 7px;
  border-radius: 999px;
  border: 1px dashed var(--warning);
  color: var(--warning);
  font-weight: 800;
  margin-right: 6px;
  font-size: 11px;
}
.steps {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
}
.step {
  display: flex;
  gap: 10px;
  padding: 7px 0;
  position: relative;
}
.step:not(:last-child)::before {
  content: '';
  position: absolute;
  left: 10px;
  top: 30px;
  bottom: -7px;
  width: 2px;
  background: var(--border);
}
.step-icon {
  flex-shrink: 0;
  width: 22px;
  display: grid;
  place-items: center;
  color: var(--muted);
}
.step[data-status='running'] .step-icon { color: var(--primary); }
.step[data-status='succeeded'] .step-icon { color: var(--success); }
.step[data-status='rejected'] .step-icon { color: var(--danger); }
.step[data-status='failed'] .step-icon { color: var(--danger); }
.step[data-status='awaiting_approval'] .step-icon { color: var(--warning); }
.step-body {
  min-width: 0;
  flex: 1;
  display: grid;
  gap: 3px;
}
.step-head {
  display: flex;
  align-items: baseline;
  gap: 8px;
  flex-wrap: wrap;
}
.step-head b {
  font-size: var(--font-size-sm);
}
.step-status {
  font-size: var(--font-size-xs);
  font-weight: 700;
  color: var(--muted);
}
.step[data-status='running'] .step-status { color: var(--primary); }
.step[data-status='succeeded'] .step-status { color: var(--success); }
.step[data-status='rejected'] .step-status { color: var(--danger); }
.step[data-status='awaiting_approval'] .step-status { color: var(--warning); }
.cap {
  margin: 0;
  font-size: 11px;
  color: var(--muted);
}
.result {
  margin: 0;
  font-size: var(--font-size-xs);
  color: var(--ink-2);
  line-height: 1.5;
}
.alternatives {
  border: 1px dashed var(--warning-bg);
  background: var(--warning-bg);
  border-radius: 7px;
  padding: 7px 9px;
  display: grid;
  gap: 3px;
}
.alternatives p {
  margin: 0;
  font-size: var(--font-size-xs);
  font-weight: 800;
  color: var(--warning);
}
.approval-hint {
  margin: 0;
  font-size: 11px;
  color: var(--muted);
}
.cycle-result {
  border-top: 1px dashed var(--border);
  padding-top: 10px;
}
.cycle-result dl {
  margin: 0;
  display: grid;
  gap: 8px;
}
.cycle-result dt {
  font-size: var(--font-size-xs);
  font-weight: 800;
  color: var(--ink-2);
}
.cycle-result dd {
  margin: 2px 0 0;
}
.spin {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
