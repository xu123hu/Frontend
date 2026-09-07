<script setup lang="ts">
/**
 * S1 首页重构 —— AI 对话首页参考设计 + dashboard 真实接线（H18）。
 *
 * 数据源（全部真实，禁止假数据）：
 * - GET /dashboard（useDashboard）→ running_tasks / pending_reviews 计数
 * - GET /projects（useProjects(5)）→ 最近项目列表
 * - POST /runs research_cycle（startResearchCycle）→ 真实后端提交研究问题
 *
 * 诚实性（08 §6）：runs 列表端点未上线（GET /runs 405），不渲染裸 run id 或伪造任务文案。
 * dashboard 端点未接线时显示诚实错误态，不静默降级为假空态。
 */
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import {
  FolderPlus,
  PenLine,
  Search,
  ClipboardCheck,
  Paperclip,
  Send,
  ChevronRight,
  Bot,
  Clock,
} from 'lucide-vue-next';
import AppButton from '@shared/ui/AppButton/AppButton.vue';
import AppCard from '@shared/ui/AppButton/AppCard.vue';
import AppChip from '@shared/ui/AppButton/AppChip.vue';
import ErrorState from '@shared/ui/AppButton/ErrorState.vue';
import EmptyState from '@shared/ui/EmptyState.vue';
import Skeleton from '@shared/ui/Skeleton.vue';
import { useSession } from '@features/auth/use-session';
import { useDashboard } from '@features/dashboard/use-dashboard';
import { useProjects } from '@features/projects/use-projects';
import { startResearchCycle } from '@features/steward/api';
import { ApiError } from '@app/api/client';
import type { ProjectStage } from '@entities/project/types';

const router = useRouter();
const session = useSession();
const dashboardQuery = useDashboard();
const projectsQuery = useProjects(5);

// ---- 问候 ----
const displayName = computed(() => {
  const raw = session.account.value?.display_name ?? '';
  if (!raw || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(raw)) {
    return '科研用户';
  }
  return raw;
});
const greeting = computed(() => {
  const h = new Date().getHours();
  if (h < 6) return '夜深了';
  if (h < 12) return '上午好';
  if (h < 18) return '下午好';
  return '晚上好';
});

// ---- 快捷入口 ----
interface QuickCard {
  icon: typeof FolderPlus;
  title: string;
  subtitle: string;
  tone: 'indigo' | 'teal' | 'violet' | 'amber';
  action: () => void;
}
const quickCards: readonly QuickCard[] = [
  { icon: FolderPlus, title: '新建项目', subtitle: '定义研究问题，开启完整科研流程', tone: 'indigo', action: () => router.push({ name: 'projects' }) },
  { icon: PenLine, title: '继续写作', subtitle: '回到最近的论文草稿或模板', tone: 'teal', action: () => router.push('/research/writing') },
  { icon: Search, title: '检索文献', subtitle: '跨库搜索并导入参考文献', tone: 'violet', action: () => router.push('/research/literature') },
  { icon: ClipboardCheck, title: '评审论文', subtitle: '进入评审批次或上传新论文', tone: 'amber', action: () => router.push('/research/review') },
];

// ---- 大输入框提交 ----
const question = ref('');
const submitting = ref(false);
const submitError = ref<string | null>(null);

async function submitQuestion(): Promise<void> {
  const trimmed = question.value.trim();
  if (!trimmed || submitting.value) return;
  submitting.value = true;
  submitError.value = null;
  try {
    await startResearchCycle(trimmed);
    await router.push({ name: 'review' });
  } catch (err) {
    submitError.value = err instanceof ApiError ? err.message : '提交失败，请检查网络后重试。';
  } finally {
    submitting.value = false;
  }
}

function onTextareaKeydown(e: KeyboardEvent): void {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    void submitQuestion();
  }
}

// ---- 最近项目 ----
const recentProjects = computed(() => projectsQuery.data.value?.items ?? []);

const PROJECT_STAGES: readonly ProjectStage[] = ['discovery', 'verification', 'writing', 'review', 'published'];
const STAGE_LABELS: Record<ProjectStage, string> = {
  discovery: '发现',
  verification: '验证',
  writing: '写作',
  review: '评审',
  published: '发表',
};

function stageIndex(stage: string): number {
  const idx = PROJECT_STAGES.indexOf(stage as ProjectStage);
  return idx >= 0 ? idx : 0;
}
function stageProgress(stage: string): number {
  return ((stageIndex(stage) + 1) / PROJECT_STAGES.length) * 100;
}

function coverClass(domain: string): string {
  const h = [...domain].reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) % 997, 7);
  const tones = ['indigo', 'teal', 'violet', 'amber'] as const;
  return `cover-${tones[h % tones.length]}`;
}

function formatUpdated(iso: string): string {
  try {
    return new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric' }).format(new Date(iso));
  } catch {
    return iso;
  }
}
</script>

<template>
  <div class="home-page">
    <!-- bg-blob 光斑（portal 渐变背景的装饰） -->
    <div
      class="bg-blob blob-a"
      aria-hidden="true"
    />
    <div
      class="bg-blob blob-b"
      aria-hidden="true"
    />
    <div
      class="bg-blob blob-c"
      aria-hidden="true"
    />

    <div class="home-inner">
      <!-- 问候区 -->
      <section class="greeting animate-fade-in-up">
        <p class="greeting-text">{{ greeting }}，{{ displayName }} 👋</p>
        <h1 class="greeting-title">今天想研究<span class="gradient-text">什么</span>？</h1>
        <p class="greeting-sub">告诉我研究问题，AI 帮你检索、验证、写作</p>
      </section>

      <!-- 大输入框 -->
      <section class="input-area animate-fade-in-up delay-100">
        <div class="input-glow-wrapper">
          <div class="input-inner">
            <AppButton
              variant="ghost"
              size="md"
              class="attach-btn"
              aria-label="附加文献 PDF"
              :disabled="submitting"
            >
              <Paperclip :size="18" />
            </AppButton>
            <textarea
              v-model="question"
              class="question-input"
              placeholder="输入研究问题，例如：分层线性模型在教育测量中的应用"
              rows="1"
              :disabled="submitting"
              @keydown="onTextareaKeydown"
            />
            <AppButton
              variant="primary"
              size="md"
              class="send-btn"
              aria-label="发送研究问题"
              :loading="submitting"
              :disabled="!question.trim()"
              @click="submitQuestion"
            >
              <Send :size="18" />
            </AppButton>
          </div>
        </div>
        <ErrorState
          v-if="submitError"
          title="研究循环启动失败"
          :reason="submitError"
          tone="danger"
          retryable
          @retry="submitQuestion"
        />
        <div class="input-hints">
          <AppChip tone="neutral">自然语言研究问题</AppChip>
          <AppChip tone="neutral">拖拽文献 PDF</AppChip>
          <AppChip tone="neutral">选择学科</AppChip>
        </div>
      </section>

      <!-- 快捷入口 -->
      <section class="quick-grid animate-fade-in-up delay-200">
        <AppCard
          v-for="card in quickCards"
          :key="card.title"
          variant="portal"
          class="quick-card"
          role="button"
          tabindex="0"
          :aria-label="card.title"
          @click="card.action"
          @keydown.enter="card.action"
        >
          <div
            class="quick-icon"
            :class="`qi-${card.tone}`"
          >
            <component
              :is="card.icon"
              :size="24"
            />
          </div>
          <h3 class="quick-title">{{ card.title }}</h3>
          <p class="quick-sub">{{ card.subtitle }}</p>
        </AppCard>
      </section>

      <!-- AI 正在为你做 -->
      <section class="dashboard-section animate-fade-in-up delay-300">
        <h2 class="section-title">AI 正在为你做</h2>
        <Skeleton
          v-if="dashboardQuery.isPending.value"
          label="Dashboard 加载中"
        />
        <ErrorState
          v-else-if="dashboardQuery.isError.value"
          title="Dashboard 加载失败"
          :reason="dashboardQuery.error.value?.message || '服务暂时不可用。'"
          tone="danger"
          retryable
          @retry="dashboardQuery.refetch()"
        />
        <AppCard
          v-else-if="dashboardQuery.data.value && dashboardQuery.data.value.running_tasks > 0"
          variant="portal"
          class="ai-status-card ai-bubble-gradient"
        >
          <div class="ai-status-icon">
            <Bot :size="22" />
          </div>
          <div class="ai-status-body">
            <p class="ai-status-text">
              AI 正在执行 {{ dashboardQuery.data.value.running_tasks }} 项任务 · 待确认
              {{ dashboardQuery.data.value.pending_reviews }} 项
            </p>
          </div>
        </AppCard>
        <EmptyState
          v-else
          title="AI 管家待命中"
          hint="没有进行中的任务。在上方输入研究问题即可启动。"
        />
      </section>

      <!-- 最近项目 -->
      <section class="recent-section animate-fade-in-up delay-400">
        <div class="section-head">
          <h2 class="section-title">最近项目</h2>
          <button
            class="view-all"
            type="button"
            @click="router.push({ name: 'projects' })"
          >
            查看全部
            <ChevronRight :size="14" />
          </button>
        </div>
        <Skeleton
          v-if="projectsQuery.isPending.value"
          label="最近项目加载中"
        />
        <ErrorState
          v-else-if="projectsQuery.isError.value"
          title="项目列表加载失败"
          :reason="projectsQuery.error.value?.message || '服务暂时不可用。'"
          tone="danger"
          retryable
          @retry="projectsQuery.refetch()"
        />
        <EmptyState
          v-else-if="recentProjects.length === 0"
          title="还没有科研项目"
          hint="创建第一个项目后，文献、证据、写作与评审都会围绕它组织。"
        >
          <AppButton
            variant="primary"
            size="sm"
            @click="router.push({ name: 'projects' })"
          >
            创建项目
          </AppButton>
        </EmptyState>
        <div
          v-else
          class="project-list"
        >
          <AppCard
            v-for="project in recentProjects"
            :key="project.id"
            variant="portal"
            class="project-card"
            role="button"
            tabindex="0"
            :aria-label="`打开项目：${project.title}`"
            @click="router.push({ name: 'project', params: { id: project.id } })"
            @keydown.enter="router.push({ name: 'project', params: { id: project.id } })"
          >
            <div class="project-row">
              <div
                class="project-cover"
                :class="coverClass(project.domain)"
              >
                <span class="cover-letter">{{ project.title.charAt(0) }}</span>
              </div>
              <div class="project-info">
                <h3 class="project-title">{{ project.title }}</h3>
                <p class="project-rq">{{ project.research_question }}</p>
              </div>
              <div class="project-side">
                <span class="updated">
                  <Clock :size="12" />
                  {{ formatUpdated(project.updated_at) }}
                </span>
                <ChevronRight
                  class="chev"
                  :size="16"
                />
              </div>
            </div>
            <div class="stage-bar-wrap">
              <div class="stage-labels">
                <span
                  v-for="(s, idx) in PROJECT_STAGES"
                  :key="s"
                  class="stage-label"
                  :class="{ active: idx <= stageIndex(project.stage) }"
                >{{ STAGE_LABELS[s] }}</span>
              </div>
              <div class="stage-track">
                <div
                  class="stage-fill"
                  :style="{ width: stageProgress(project.stage) + '%' }"
                />
              </div>
            </div>
          </AppCard>
        </div>
      </section>

      <!-- 待处理评审 -->
      <section
        v-if="dashboardQuery.data.value && dashboardQuery.data.value.pending_reviews > 0"
        class="pending-section animate-fade-in-up"
      >
        <AppCard
          variant="portal"
          class="pending-card"
          role="button"
          tabindex="0"
          aria-label="前往评审中心"
          @click="router.push('/research/review')"
          @keydown.enter="router.push('/research/review')"
        >
          <div class="pending-inner">
            <div class="pending-icon">
              <ClipboardCheck :size="20" />
            </div>
            <p class="pending-text">
              你有 {{ dashboardQuery.data.value.pending_reviews }} 项待处理评审
            </p>
            <ChevronRight
              class="chev"
              :size="16"
            />
          </div>
        </AppCard>
      </section>
    </div>
  </div>
</template>

<style scoped>
/* ---- 容器与光斑 ---- */
.home-page {
  position: relative;
  min-height: 100%;
  overflow: hidden;
  background: linear-gradient(160deg, var(--ailp-gray-50) 0%, var(--ailp-primary-50) 40%, var(--ailp-accent-50) 100%);
}
.blob-a { width: 500px; height: 500px; background: var(--ailp-primary-200); top: -150px; left: -100px; }
.blob-b { width: 400px; height: 400px; background: var(--ailp-accent-200); top: 200px; right: -100px; opacity: 0.3; }
.blob-c { width: 600px; height: 600px; background: var(--ailp-primary-100); bottom: -200px; left: 33%; opacity: 0.5; }

.home-inner {
  position: relative;
  z-index: 1;
  max-width: 896px;
  margin: 0 auto;
  padding: 40px 20px 64px;
}

/* ---- 问候区 ---- */
.greeting { text-align: center; margin-bottom: 36px; }
.greeting-text { font-size: 16px; color: var(--ailp-muted-foreground); margin: 0 0 10px; }
.greeting-title {
  font-size: 34px;
  font-weight: 750;
  letter-spacing: -0.02em;
  color: var(--ailp-foreground);
  margin: 0 0 12px;
  line-height: 1.2;
}
.greeting-sub { font-size: 17px; color: var(--ailp-muted-foreground); margin: 0; }

/* ---- 大输入框 ---- */
.input-area { margin-bottom: 36px; }
.input-inner {
  background: #fff;
  border-radius: var(--ailp-radius-2xl);
  padding: 18px 20px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
}
.attach-btn {
  flex-shrink: 0;
  width: 42px;
  height: 42px;
  border-radius: var(--ailp-radius-lg);
  background: var(--ailp-muted);
  color: var(--ailp-muted-foreground);
  display: grid;
  place-items: center;
}
.attach-btn:hover { background: var(--ailp-primary-50); color: var(--ailp-primary-600); }
.question-input {
  flex: 1;
  min-height: 42px;
  resize: none;
  border: none;
  outline: none;
  background: transparent;
  font: inherit;
  font-size: 15px;
  color: var(--ailp-foreground);
  line-height: 1.55;
  padding-top: 9px;
}
.question-input::placeholder { color: var(--ailp-gray-400); }
.send-btn {
  flex-shrink: 0;
  width: 42px;
  height: 42px;
  border-radius: var(--ailp-radius-lg);
  padding: 0;
  display: grid;
  place-items: center;
}
.input-hints {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-top: 14px;
}

/* ---- 快捷入口 ---- */
.quick-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  margin-bottom: 36px;
}
.quick-card {
  padding: 18px;
  cursor: pointer;
}
.quick-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--ailp-radius-lg);
  display: grid;
  place-items: center;
  margin-bottom: 14px;
  transition: transform 0.2s ease;
}
.quick-card:hover .quick-icon { transform: scale(1.08); }
.qi-indigo { background: linear-gradient(135deg, var(--ailp-primary-100), var(--ailp-primary-50)); color: var(--ailp-primary-600); }
.qi-teal { background: linear-gradient(135deg, var(--ailp-accent-100), var(--ailp-accent-50)); color: var(--ailp-accent-600); }
.qi-violet { background: linear-gradient(135deg, #ede9fe, #f5f3ff); color: #7c3aed; }
.qi-amber { background: linear-gradient(135deg, #fef3c7, #fffbeb); color: var(--ailp-warning-600); }
.quick-title { font-size: 15px; font-weight: 700; color: var(--ailp-foreground); margin: 0 0 5px; }
.quick-sub { font-size: 13px; color: var(--ailp-muted-foreground); margin: 0; line-height: 1.45; }

/* ---- AI 正在为你做 ---- */
.section-title { font-size: 18px; font-weight: 700; color: var(--ailp-foreground); margin: 0 0 14px; }
.dashboard-section { margin-bottom: 32px; }
.ai-status-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 20px;
}
.ai-status-icon {
  width: 40px; height: 40px; border-radius: var(--ailp-radius-lg);
  background: linear-gradient(135deg, var(--ailp-primary-600), var(--ailp-accent-500));
  color: #fff; display: grid; place-items: center; flex-shrink: 0;
}
.ai-status-text { font-size: 15px; font-weight: 600; color: var(--ailp-foreground); margin: 0; }

/* ---- 最近项目 ---- */
.recent-section { margin-bottom: 24px; }
.section-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.section-head .section-title { margin-bottom: 0; }
.view-all {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 14px; font-weight: 600; color: var(--ailp-primary-600);
  background: transparent; border: none; cursor: pointer;
}
.view-all:hover { color: var(--ailp-primary-700); }
.project-list { display: grid; gap: 10px; }
.project-card { padding: 16px 18px; cursor: pointer; }
.project-row { display: flex; align-items: flex-start; gap: 14px; }
.project-cover {
  width: 48px; height: 48px; border-radius: var(--ailp-radius-lg);
  display: grid; place-items: center; flex-shrink: 0;
  color: #fff; font-weight: 750; font-size: 18px;
  box-shadow: var(--ailp-shadow-sm);
}
.cover-indigo { background: linear-gradient(135deg, var(--ailp-primary-600), #7c3aed); }
.cover-teal { background: linear-gradient(135deg, var(--ailp-accent-500), var(--ailp-accent-600)); }
.cover-violet { background: linear-gradient(135deg, #8b5cf6, #a78bfa); }
.cover-amber { background: linear-gradient(135deg, var(--ailp-warning-500), #fbbf24); }
.project-info { flex: 1; min-width: 0; }
.project-title { font-size: 15px; font-weight: 700; color: var(--ailp-foreground); margin: 0 0 3px; }
.project-rq {
  font-size: 13px; color: var(--ailp-muted-foreground); margin: 0;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.project-side { flex-shrink: 0; display: flex; align-items: center; gap: 6px; }
.updated {
  display: inline-flex; align-items: center; gap: 3px;
  font-size: 12px; color: var(--ailp-gray-400);
}
.chev { color: var(--ailp-gray-300); }
.project-card:hover .chev { color: var(--ailp-primary-500); }
.stage-bar-wrap { margin-top: 12px; padding-left: 62px; }
.stage-labels { display: flex; gap: 0; justify-content: space-between; margin-bottom: 4px; }
.stage-label { font-size: 11px; color: var(--ailp-gray-300); transition: color 0.2s ease; }
.stage-label.active { color: var(--ailp-primary-600); font-weight: 650; }
.stage-track {
  height: 5px; border-radius: var(--ailp-radius-full);
  background: var(--ailp-gray-100); overflow: hidden;
}
.stage-fill {
  height: 100%; border-radius: inherit;
  background: linear-gradient(90deg, var(--ailp-primary-500), var(--ailp-accent-500));
  transition: width 0.5s ease;
}

/* ---- 待处理评审 ---- */
.pending-card { cursor: pointer; }
.pending-inner { display: flex; align-items: center; gap: 12px; }
.pending-icon {
  width: 36px; height: 36px; border-radius: var(--ailp-radius-md);
  background: linear-gradient(135deg, var(--ailp-warning-500), #fbbf24);
  color: #fff; display: grid; place-items: center; flex-shrink: 0;
}
.pending-text { font-size: 14px; font-weight: 600; color: var(--ailp-foreground); margin: 0; flex: 1; }

/* ---- 响应式 ---- */
@media (max-width: 900px) {
  .quick-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 580px) {
  .quick-grid { grid-template-columns: 1fr; }
  .greeting-title { font-size: 28px; }
  .home-inner { padding: 28px 14px 56px; }
  .stage-bar-wrap { padding-left: 0; }
}
</style>
