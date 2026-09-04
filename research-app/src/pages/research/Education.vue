<script setup lang="ts">
/**
 * 教育研究（F5 收口，替换 F4 静态边界占位）。
 * 契约：CR-F5-01（对齐 M4 §8.1-8.6 + §8.7）。
 * 红线：
 * - 科研端只查询授权数据产品，不直连学生业务库；
 * - 任一切片 k<20 → 422 PRIVACY_THRESHOLD_NOT_MET，界面展示拒绝原因，不返回/不渲染切片数据；
 * - 快照不可变（immutable），图表 artifact 绑定快照哈希 + 参数哈希；
 * - 成果回流前需人工审批（HumanDecision 审计语义）。
 * UI 施工图纸：D:\科研端demo\index.html education() 视图（原型逐帧对齐）。
 */
import { computed, ref } from 'vue';
import Boundary from '@shared/ui/Boundary.vue';
import Skeleton from '@shared/ui/Skeleton.vue';
import DataSourceBadge from '@shared/ui/DataSourceBadge.vue';
import { ApiError } from '@app/api/client';
import { useCreateSnapshot, useDataProducts, useEducationStudy, useExportChart, usePreflight, useRequestPublication, useRunAnalysis } from '@features/education/queries';
import type { ChartExport, DatasetSnapshot } from '@entities/education/types';

const STEPS = ['接收教师课题', '授权与隐私预检', '创建数据快照', '统计分析与图表', '成果审批与回流'] as const;
const step = ref(0);

const studyQuery = useEducationStudy();
const productsQuery = useDataProducts();
const preflight = usePreflight();
const snapshotMutation = useCreateSnapshot();
const analysisMutation = useRunAnalysis(() => snapshot.value?.id ?? null);
const chartMutation = useExportChart();
const publication = useRequestPublication();

const study = computed(() => studyQuery.data.value);
const product = computed(() => productsQuery.data.value?.[0] ?? null);
/** 快照以本地事实为准（k<20 演练的失败 mutation 不清除已创建快照的展示）。 */
const localSnapshot = ref<DatasetSnapshot | null>(null);
const snapshot = computed<DatasetSnapshot | null>(() => localSnapshot.value);
const chart = computed<ChartExport | null>(() => chartMutation.data.value ?? null);

/** 是否已确认授权并创建快照。 */
const authorized = ref(false);
const analyzed = ref(false);
const published = ref(false);

/** k<20 拒绝提示（PRIVACY_THRESHOLD_NOT_MET）。 */
const privacyRejected = ref<{ message: string } | null>(null);

const researchQuestion = ref('赛前训练是否降低了论文中的符号未定义与单位量纲冲突？');
const comparePlan = ref('训练前 vs. 训练后 · 按错误类型分层');

const scopeNormal = { granularity: '班级×周', scope: '训练前后对比' };
const scopeSmall = { class_id: 'cls_13', week: '2026-W30' }; // 演示 k<20 切片

/** 进入隐私预检：发起 M4 §8.2 preflight（只返回预估/最小 cell_k/分级，不返回数据）。 */
async function enterPreflight(): Promise<void> {
  if (step.value === 1 || !product.value || preflight.isPending.value) return;
  step.value = 1;
  await preflight.mutateAsync({ productId: product.value.id, scope: scopeNormal });
}

async function confirmAndSnapshot(): Promise<void> {
  if (!product.value) return;
  privacyRejected.value = null;
  try {
    const snap = await snapshotMutation.mutateAsync({ productId: product.value.id, scope: scopeNormal });
    if (snap) {
      localSnapshot.value = snap;
      authorized.value = true;
      step.value = 2;
    }
  } catch (e) {
    if (e instanceof ApiError) privacyRejected.value = { message: e.message };
  }
}

async function runAnalysis(): Promise<void> {
  if (!snapshot.value) return;
  privacyRejected.value = null;
  await analysisMutation.mutateAsync();
  analyzed.value = true;
  step.value = 3;
}

/** 演示 k<20 拒绝：小切片命中 → 422 PRIVACY_THRESHOLD_NOT_MET（M4 §8.3）。 */
async function testSmallSample(): Promise<void> {
  if (!product.value) return;
  privacyRejected.value = null;
  try {
    await snapshotMutation.mutateAsync({ productId: product.value.id, scope: scopeSmall });
    // 理论上不应走到这（handler 对 k<20 恒 422）；到达即契约违背，如实显示。
    privacyRejected.value = { message: '意外：小切片未被拒绝，契约不匹配。' };
  } catch (e) {
    if (e instanceof ApiError && e.code === 'PRIVACY_THRESHOLD_NOT_MET') {
      privacyRejected.value = { message: e.message };
    } else if (e instanceof ApiError) {
      privacyRejected.value = { message: e.message };
    }
  }
}

async function exportChart(): Promise<void> {
  if (!snapshot.value) return;
  await chartMutation.mutateAsync({ snapshotId: snapshot.value.id, format: 'svg' });
}

async function requestFlowBack(): Promise<void> {
  if (!study.value) return;
  await publication.mutateAsync({ studyId: study.value.id });
  step.value = 4;
}

/** 人工审批（HumanDecision 审计语义；真实审批执行归后端，前端演示决策闭环）。 */
function approvePublication(): void {
  published.value = true;
}

function stepClass(i: number): string {
  if (i < step.value) return 'done';
  if (i === step.value) return 'active';
  return '';
}

function snapshotLabel(): string {
  if (snapshot.value) return `只读 · ${snapshot.value.id}`;
  if (authorized.value) return '只读 · 创建中';
  return '尚未创建';
}
</script>

<template>
  <div class="page">
    <header class="page-head">
      <div>
        <h1>教育研究</h1>
        <p>同时支持授权数据分析、教师课题协作和成果回流；科研端不直连学生业务库。</p>
      </div>
      <div class="actions">
        <DataSourceBadge />
        <button
          class="btn"
          type="button"
          @click="enterPreflight"
        >
          查看授权与隐私预检
        </button>
      </div>
    </header>

    <div class="workspace">
      <!-- 左：研究流程大纲 -->
      <aside
        class="outline"
        aria-label="研究流程"
      >
        <h2>研究流程</h2>
        <ol class="steps">
          <li
            v-for="(s, i) in STEPS"
            :key="s"
            :class="stepClass(i)"
          >
            <span class="step-no">{{ i < step ? '✓' : i + 1 }}</span>
            <span>{{ s }}</span>
            <small>{{ i < step ? '已完成' : i === step ? '当前' : '' }}</small>
          </li>
        </ol>
        <div class="meta">
          授权状态：{{ authorized ? '已授权' : '待确认' }}<br>
          快照：{{ snapshotLabel() }}<br>
          分析：{{ analyzed ? '已完成' : '未开始' }}<br>
          任何切片 k &lt; 20 都会被拒绝。
        </div>
      </aside>

      <!-- 右：当前步骤内容 -->
      <section
        class="panel"
        aria-label="教育研究流程内容"
      >
        <div class="panel-head">
          <h2>{{ STEPS[step] }}</h2>
          <span class="step-badge">{{ step + 1 }} / {{ STEPS.length }}</span>
        </div>

        <Skeleton
          v-if="studyQuery.isPending.value"
          label="课题加载中"
        />
        <Boundary
          v-else-if="studyQuery.isError.value"
          tone="danger"
          title="课题加载失败"
        >
          {{ studyQuery.error.value?.message }}
        </Boundary>

        <!-- 步骤 0：接收教师课题 -->
        <div
          v-else-if="step === 0 && study"
          class="body"
        >
          <h3>教师发布的研究课题</h3>
          <p class="muted">
            {{ study.publisher }}邀请科研人员分析训练前后建模论文中的符号与量纲错误变化。
          </p>
          <div class="result-row">
            <div><small>匿名样本</small><strong>{{ study.sample }}</strong></div>
            <div><small>最小样本阈值</small><strong>k ≥ {{ study.minimum }}</strong></div>
            <div><small>数据状态</small><strong>待授权</strong></div>
          </div>
          <p class="note">
            未经授权的数据不可使用。竞赛评审结束后，只有匿名、聚合并经过审批的数据才能进入教育研究。
          </p>
          <div class="actions">
            <button
              class="btn primary"
              type="button"
              @click="enterPreflight"
            >
              查看授权与隐私预检
            </button>
          </div>
        </div>

        <!-- 步骤 1：隐私预检 -->
        <div
          v-else-if="step === 1"
          class="body"
        >
          <Skeleton
            v-if="productsQuery.isPending.value"
            label="数据产品加载中"
          />
          <template v-else-if="product">
            <h3>隐私预检</h3>
            <p class="muted">
              授权数据产品：{{ product.name }}。科研端只获得本课题需要的字段（{{ product.fields.join('、') }}）。
            </p>
            <div
              v-if="preflight.data.value"
              class="result-row preflight"
            >
              <div><small>预估行数</small><strong>{{ preflight.data.value.estimated_rows }}</strong></div>
              <div><small>最小 cell_k</small><strong>{{ preflight.data.value.min_cell_k }}</strong></div>
              <div><small>分级</small><strong>{{ preflight.data.value.classification }}</strong></div>
            </div>
            <ul class="privacy-list">
              <li>
                <span
                  class="check"
                  aria-hidden="true"
                >✓</span>
                <div><b>授权用途</b><p>{{ product.purpose_restrictions }}</p></div>
              </li>
              <li>
                <span
                  class="check"
                  aria-hidden="true"
                >✓</span>
                <div><b>去标识检查</b><p>不含姓名、学号、学校和自由文本身份字段。</p></div>
              </li>
              <li>
                <span
                  class="check"
                  aria-hidden="true"
                >✓</span>
                <div><b>最小样本检查</b><p>总体样本 {{ study?.sample ?? '—' }}；任何切片 k &lt; 20 将被拒绝。</p></div>
              </li>
            </ul>
            <div class="approval">
              <h3>数据使用需要用户确认</h3>
              <p>确认后创建只读数据快照；原始学生业务库仍不可访问。</p>
            </div>
            <div class="actions">
              <button
                class="btn primary"
                type="button"
                :disabled="snapshotMutation.isPending.value"
                @click="confirmAndSnapshot"
              >
                {{ snapshotMutation.isPending.value ? '创建中…' : '确认并创建数据快照' }}
              </button>
            </div>
          </template>
          <Boundary
            v-else
            tone="danger"
            title="数据产品加载失败"
          >
            {{ productsQuery.error.value?.message }}
          </Boundary>
        </div>

        <!-- 步骤 2：数据快照 -->
        <div
          v-else-if="step === 2"
          class="body"
        >
          <h3>数据快照已创建</h3>
          <p class="muted">
            快照 {{ snapshot?.id ?? '—' }} · {{ snapshot?.records ?? study?.sample ?? '—' }} 条匿名记录 · 参数和数据字典已冻结（{{ snapshot?.hash ?? '—' }}）。
          </p>
          <div class="field">
            <label for="rq">研究问题</label>
            <textarea
              id="rq"
              v-model="researchQuestion"
              rows="2"
            />
          </div>
          <div class="field">
            <label for="plan">比较方案</label>
            <select
              id="plan"
              v-model="comparePlan"
            >
              <option>训练前 vs. 训练后 · 按错误类型分层</option>
            </select>
          </div>
          <div class="actions">
            <button
              class="btn primary"
              type="button"
              :disabled="analysisMutation.isPending.value"
              @click="runAnalysis"
            >
              {{ analysisMutation.isPending.value ? '分析中…' : '运行统计分析' }}
            </button>
            <button
              class="btn"
              type="button"
              :disabled="snapshotMutation.isPending.value"
              @click="testSmallSample"
            >
              测试 k &lt; 20 拒绝状态
            </button>
          </div>
        </div>

        <!-- 步骤 3：分析结果与限制 -->
        <div
          v-else-if="step === 3 && analysisMutation.data.value"
          class="body"
        >
          <h3>分析结果与限制</h3>
          <div class="result-row">
            <div><small>匿名样本</small><strong>{{ snapshot?.records ?? study?.sample ?? '—' }}</strong></div>
            <div><small>符号错误变化</small><strong>{{ analysisMutation.data.value.estimate.symbol_error_change }}%</strong></div>
            <div><small>量纲错误变化</small><strong>{{ analysisMutation.data.value.estimate.unit_error_change }}%</strong></div>
          </div>
          <div
            class="chart"
            aria-label="训练前后各类论文错误率下降（示例图表，非真实统计）"
          >
            <div
              class="bar alt"
              style="height:86%"
            >
              <span>前·符号</span>
            </div>
            <div
              class="bar"
              style="height:59%"
            >
              <span>后·符号</span>
            </div>
            <div
              class="bar alt"
              style="height:71%"
            >
              <span>前·量纲</span>
            </div>
            <div
              class="bar"
              style="height:54%"
            >
              <span>后·量纲</span>
            </div>
          </div>
          <p class="muted small">
            图表摘要：训练后两类错误均下降（{{ analysisMutation.data.value.estimate.symbol_error_change }}% / {{ analysisMutation.data.value.estimate.unit_error_change }}%），
            但本研究不是随机对照，不能仅据此作因果结论。
          </p>
          <ul class="warnings">
            <li
              v-for="w in analysisMutation.data.value.warnings"
              :key="w"
            >
              {{ w }}
            </li>
          </ul>
          <p class="note">
            <b>研究限制：</b>{{ analysisMutation.data.value.assumptions.join('；') }}。结果需由研究者解释。
          </p>
          <div class="actions">
            <button
              class="btn primary"
              type="button"
              :disabled="publication.isPending.value"
              @click="requestFlowBack"
            >
              {{ publication.isPending.value ? '提交中…' : '申请成果回流' }}
            </button>
            <button
              class="btn"
              type="button"
              :disabled="chartMutation.isPending.value"
              @click="exportChart"
            >
              {{ chartMutation.isPending.value ? '导出中…' : '导出图表与数据快照' }}
            </button>
          </div>
          <p
            v-if="chart"
            class="muted small mono"
          >
            已导出 {{ chart.download_name }} · 快照 {{ chart.snapshot_hash }} · 参数 {{ chart.params_hash }}
          </p>
        </div>

        <!-- 步骤 4：成果回流 -->
        <div
          v-else-if="step === 4"
          class="body"
        >
          <h3>成果回流</h3>
          <p class="muted">
            研究报告、方法卡和训练建议将形成带来源与版本的副本，分别回流教师端和学生端。
          </p>
          <ul class="privacy-list">
            <li>
              <span
                class="check"
                aria-hidden="true"
              >✓</span>
              <div><b>教师端</b><p>接收共性错误趋势、教学建议和新的训练任务。</p></div>
            </li>
            <li>
              <span
                class="check"
                aria-hidden="true"
              >✓</span>
              <div><b>学生端</b><p>接收经过审核的符号与量纲训练卡，不包含评委意见。</p></div>
            </li>
          </ul>
          <div class="approval">
            <h3>{{ published ? '成果发布已批准' : '成果发布等待审批' }}</h3>
            <p>发布保留来源项目、数据快照、版本、发布者和撤回状态；发布前等待教师与数据管理员审批。</p>
          </div>
          <div
            v-if="published"
            class="result-row"
          >
            <div><small>教师端</small><strong>已回流</strong></div>
            <div><small>学生端</small><strong>已回流</strong></div>
            <div><small>审计</small><strong>HumanDecision</strong></div>
          </div>
          <div
            v-else
            class="actions"
          >
            <button
              class="btn primary"
              type="button"
              @click="approvePublication"
            >
              模拟管理员审批（演示）
            </button>
          </div>
        </div>

        <!-- k<20 拒绝提示 -->
        <Boundary
          v-if="privacyRejected"
          tone="danger"
          title="隐私规则已阻止分析"
        >
          {{ privacyRejected.message }}
        </Boundary>
      </section>
    </div>
  </div>
</template>

<style scoped>
.page {
  max-width: 1460px;
  margin: 0 auto;
  display: grid;
  gap: 16px;
}
.page-head {
  display: flex;
  gap: 18px;
  align-items: flex-start;
  justify-content: space-between;
}
.page-head h1 {
  font-size: var(--font-size-3xl);
  margin: 0 0 6px;
}
.page-head p {
  margin: 0;
  color: var(--text-muted);
  max-width: 75ch;
}
.actions {
  display: flex;
  gap: 7px;
  align-items: center;
  flex-wrap: wrap;
}
.workspace {
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: 16px;
  align-items: start;
}
.outline {
  border: 1px solid var(--border);
  border-radius: var(--r);
  background: var(--surface);
  padding: 16px;
  position: sticky;
  top: 16px;
}
.outline h2 {
  margin: 0 0 12px;
  font-size: var(--font-size-lg);
}
.steps {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 4px;
}
.steps li {
  display: grid;
  grid-template-columns: 22px 1fr;
  align-items: center;
  gap: 8px;
  padding: 7px 8px;
  border-radius: 7px;
  font-size: var(--font-size-sm);
  font-weight: 650;
  color: var(--muted);
}
.steps li.active {
  background: var(--primary-soft);
  color: var(--primary);
}
.steps li.done {
  color: var(--text);
}
.steps small {
  grid-column: 2;
  font-size: var(--font-size-xs);
  color: var(--muted);
  font-weight: 500;
}
.step-no {
  display: inline-flex;
  width: 20px;
  height: 20px;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  border: 1px solid var(--border);
  font-size: 11px;
  font-weight: 800;
}
.steps li.active .step-no {
  background: var(--primary);
  border-color: var(--primary);
  color: #fff;
}
.steps li.done .step-no {
  background: var(--success-bg);
  border-color: #bfdfd0;
  color: var(--success);
}
.meta {
  margin-top: 12px;
  padding: 10px;
  border: 1px solid var(--border);
  border-radius: 7px;
  background: var(--subtle-bg);
  font-size: var(--font-size-xs);
  color: var(--muted);
  line-height: 1.6;
}
.panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r);
  padding: 18px;
}
.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.panel-head h2 {
  margin: 0;
  font-size: var(--font-size-lg);
}
.step-badge {
  display: inline-flex;
  padding: 2px 10px;
  border-radius: 999px;
  background: var(--primary-soft);
  color: var(--primary);
  font-size: var(--font-size-xs);
  font-weight: 800;
}
.body h3 {
  margin: 0 0 8px;
  font-size: var(--font-size-md);
}
.muted {
  color: var(--text-muted);
}
.small {
  font-size: var(--font-size-xs);
}
.mono {
  font-family: var(--mono);
}
.result-row {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin: 12px 0;
}
.result-row > div {
  flex: 1;
  min-width: 120px;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 10px 12px;
  background: var(--subtle-bg);
}
.result-row small {
  display: block;
  color: var(--muted);
  font-size: var(--font-size-xs);
  margin-bottom: 4px;
}
.result-row strong {
  font-size: var(--font-size-xl);
}
.note {
  margin: 12px 0 0;
  padding: 10px 12px;
  border: 1px solid #ead29e;
  border-radius: 7px;
  background: var(--warning-bg);
  color: #664718;
  font-size: var(--font-size-sm);
  line-height: 1.6;
}
.privacy-list {
  list-style: none;
  margin: 12px 0 0;
  padding: 0;
  display: grid;
  gap: 8px;
}
.privacy-list li {
  display: flex;
  gap: 10px;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 10px 12px;
}
.check {
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  border-radius: 999px;
  background: var(--success-bg);
  color: var(--success);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 800;
}
.privacy-list b {
  font-size: var(--font-size-sm);
}
.privacy-list p {
  margin: 2px 0 0;
  font-size: var(--font-size-xs);
  color: var(--muted);
  line-height: 1.55;
}
.approval {
  margin-top: 13px;
  padding: 12px;
  border: 1px solid #ead29e;
  border-radius: 8px;
  background: var(--warning-bg);
}
.approval h3 {
  margin: 0 0 4px;
  font-size: var(--font-size-sm);
  color: #664718;
}
.approval p {
  margin: 0;
  font-size: var(--font-size-xs);
  color: #7a5a20;
}
.field {
  display: grid;
  gap: 5px;
  margin: 12px 0;
}
.field label {
  font-size: var(--font-size-sm);
  font-weight: 700;
}
.field textarea,
.field select {
  border: 1px solid var(--border);
  border-radius: 7px;
  padding: 8px 10px;
  font: inherit;
  font-size: var(--font-size-sm);
  background: var(--surface);
}
.chart {
  display: flex;
  align-items: flex-end;
  gap: 14px;
  height: 150px;
  border-bottom: 1px solid var(--border);
  padding: 12px 8px 0;
  margin: 12px 0 4px;
}
.bar {
  flex: 1;
  max-width: 90px;
  background: var(--primary);
  border-radius: 6px 6px 0 0;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding-bottom: 4px;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
}
.bar.alt {
  background: var(--primary-soft);
  color: var(--primary);
}
.warnings {
  list-style: none;
  margin: 8px 0 0;
  padding: 0;
  display: grid;
  gap: 4px;
  font-size: var(--font-size-xs);
  color: var(--warning);
}
.btn {
  min-height: 34px;
  padding: 6px 11px;
  border: 1px solid var(--border);
  border-radius: 7px;
  background: var(--surface);
  font-weight: 650;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.btn.primary {
  background: var(--primary);
  border-color: var(--primary);
  color: #fff;
}
.btn:disabled {
  opacity: 0.6;
  cursor: default;
}
@media (max-width: 900px) {
  .workspace {
    grid-template-columns: 1fr;
  }
  .outline {
    position: static;
  }
}
</style>
