<script setup lang="ts">
/**
 * 项目详情 / 项目工作区入口（黄金链路一 TC-F01-06/08）。
 * - 数据：GET /projects/{id}（M4 v2.0）
 * - 403：跨租户越权 → 通用文案 + Problem Details 语义，不泄露项目存在性（06 §3 步骤 6）
 * - 404：项目不存在
 * - 一期用列表 + 状态时间线呈现研究问题/阶段，不做巨型图可视化（提示词 §项目工作区）
 */
import { computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import Boundary from '@shared/ui/Boundary.vue';
import Skeleton from '@shared/ui/Skeleton.vue';
import { useProject } from '@features/projects/use-projects';
import { useUiStore } from '@app/stores/ui';
import { ApiError } from '@app/api/client';

const route = useRoute();
const ui = useUiStore();

const projectId = computed(() => String(route.params.id ?? ''));
const projectQuery = useProject(projectId.value);
const project = computed(() => projectQuery.data.value ?? null);
const errorKind = computed(() => (projectQuery.error.value instanceof ApiError ? projectQuery.error.value.kind : ''));

// 进入项目 → 同步 AI 管家/顶栏项目上下文（TC-F01-06）
watch(
  project,
  (value) => {
    if (value) ui.setProjectName(value.title);
  },
  { immediate: true },
);

const STAGE_LABELS: Record<string, string> = {
  discovery: '发现期',
  verification: '验证期',
  writing: '写作期',
  review: '评审期',
  published: '已发表',
};
const STAGE_TIMELINE: Array<{ key: string; desc: string }> = [
  { key: 'discovery', desc: '明确研究问题、假设与证据要求' },
  { key: 'verification', desc: '数学验证与文献证据沉淀' },
  { key: 'writing', desc: 'LaTeX 写作与引用核验' },
  { key: 'review', desc: '作者/评审者双视角审查' },
  { key: 'published', desc: '成果发表与复现包归档' },
];
function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
  } catch {
    return iso;
  }
}
</script>

<template>
  <div class="page">
    <Skeleton
      v-if="projectQuery.isPending.value"
      label="项目详情加载中"
    />

    <!-- 越权/不存在：统一文案，不泄露存在性（TC-F01-08） -->
    <Boundary
      v-else-if="projectQuery.isError.value && (errorKind === 'forbidden' || errorKind === 'not_found')"
      tone="warning"
      title="无法访问该项目"
    >
      <p class="boundary-text">
        该项目不存在，或当前账户无权访问。
      </p>
      <p
        v-if="projectQuery.error.value instanceof ApiError && projectQuery.error.value.status"
        class="muted small"
      >
        服务响应：{{ projectQuery.error.value.status }}（Problem Details 已在控制台记录，页面不泄露资源存在性）
      </p>
    </Boundary>

    <Boundary
      v-else-if="projectQuery.isError.value"
      tone="danger"
      title="项目详情加载失败"
    >
      {{ projectQuery.error.value?.message }}
      <button
        class="retry"
        type="button"
        @click="projectQuery.refetch()"
      >
        重试
      </button>
    </Boundary>

    <template v-else-if="project">
      <header class="page-head">
        <div>
          <p class="eyebrow">
            {{ project.domain }} · {{ project.visibility === 'private' ? '私有' : '团队' }}
          </p>
          <h1>{{ project.title }}</h1>
          <p class="rq">
            {{ project.research_question }}
          </p>
        </div>
        <span class="stage-chip">{{ STAGE_LABELS[project.stage] ?? project.stage }}</span>
      </header>

      <section
        class="panel"
        aria-label="研究阶段时间线"
      >
        <h2>研究阶段</h2>
        <ol class="timeline">
          <li
            v-for="(stageItem, index) in STAGE_TIMELINE"
            :key="stageItem.key"
            :class="{ done: index < STAGE_TIMELINE.findIndex((s) => s.key === project!.stage), current: stageItem.key === project!.stage }"
          >
            <span
              class="dot"
              aria-hidden="true"
            />
            <div>
              <b>{{ STAGE_LABELS[stageItem.key] }}</b>
              <p>{{ stageItem.desc }}</p>
            </div>
          </li>
        </ol>
      </section>

      <section
        class="panel"
        aria-label="项目事实"
      >
        <h2>项目信息</h2>
        <dl class="facts">
          <div>
            <dt>项目 ID</dt><dd class="mono">
              {{ project.id }}
            </dd>
          </div>
          <div>
            <dt>租户 ID</dt><dd class="mono">
              {{ project.tenant_id }}
            </dd>
          </div>
          <div><dt>版本（乐观锁）</dt><dd>v{{ project.version }}</dd></div>
          <div><dt>创建时间</dt><dd>{{ formatDate(project.created_at) }}</dd></div>
          <div><dt>更新时间</dt><dd>{{ formatDate(project.updated_at) }}</dd></div>
        </dl>
        <Boundary
          tone="info"
          title="研究问题—假设—证据—验证视图将在 F4 接入"
        >
          主张、证据与验证记录的数据契约（ClaimRecord/EvidenceRecord/VerificationRecord）已在 M0 冻结，
          场景接线与作者/评审者视图在 F4 里程碑交付。
        </Boundary>
      </section>
    </template>
  </div>
</template>

<style scoped>
.page {
  max-width: 1080px;
  margin: 0 auto;
  display: grid;
  gap: 16px;
}
.page-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}
.eyebrow {
  margin: 0 0 4px;
  color: var(--primary);
  font-size: var(--font-size-sm);
  font-weight: 700;
}
.page-head h1 {
  font-size: var(--font-size-3xl);
  margin: 0 0 6px;
}
.rq {
  margin: 0;
  color: var(--text-muted);
  max-width: 70ch;
}
.stage-chip {
  flex-shrink: 0;
  display: inline-flex;
  padding: 4px 12px;
  border-radius: 999px;
  background: var(--primary-soft);
  color: var(--primary);
  font-size: var(--font-size-sm);
  font-weight: 700;
}
.panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r);
  padding: 18px;
}
.panel h2 {
  margin: 0 0 12px;
  font-size: var(--font-size-lg);
}
.timeline {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0;
}
.timeline li {
  display: flex;
  gap: 12px;
  padding: 8px 0;
  position: relative;
  color: var(--text-muted);
}
.timeline li:not(:last-child)::before {
  content: '';
  position: absolute;
  left: 7px;
  top: 28px;
  bottom: -8px;
  width: 2px;
  background: var(--border);
}
.timeline .dot {
  flex-shrink: 0;
  width: 12px;
  height: 12px;
  margin-top: 4px;
  border-radius: 50%;
  border: 2px solid var(--border);
  background: var(--surface);
}
.timeline li.done .dot {
  background: var(--success);
  border-color: var(--success);
}
.timeline li.current .dot {
  background: var(--primary);
  border-color: var(--primary);
}
.timeline li.current {
  color: var(--text);
}
.timeline b {
  font-size: var(--font-size-sm);
}
.timeline p {
  margin: 2px 0 0;
  font-size: var(--font-size-sm);
}
.facts {
  margin: 0 0 14px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 10px;
}
.facts dt {
  font-size: var(--font-size-xs);
  color: var(--text-muted);
  font-weight: 700;
}
.facts dd {
  margin: 2px 0 0;
  font-size: var(--font-size-sm);
  word-break: break-all;
}
.boundary-text {
  margin: 0 0 6px;
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
.retry {
  border: 1px solid var(--danger);
  background: #fff;
  color: var(--danger);
  border-radius: 6px;
  padding: 2px 9px;
  font-size: var(--font-size-xs);
  font-weight: 700;
  cursor: pointer;
  margin-left: 8px;
}
</style>
