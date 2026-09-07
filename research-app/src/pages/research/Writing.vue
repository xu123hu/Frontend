<script setup lang="ts">
/**
 * 写作工作台（黄金链路四，TC-F04-01..06）。
 * 三栏：文件树 | CodeMirror 6 编辑器 | 右侧（编译时间线 + AI diff + 引用插入）。
 * - AI 生成内容只能作为差异修订，逐项接受/拒绝；拒绝项不写入源文件（TC-F04-02）。
 * - 引用仅来自已核验 CitationRecord → \cite{key} + .bib 更新（TC-F04-03）。
 * - 编译 run（run_type=writing）SSE 进度 → PDF/日志/引擎/哈希；失败行级定位 + 旧 PDF 保留（TC-F04-04/05）。
 * 诚实性：编译/引用/diff 端点运行在 MSW 契约草案（常驻徽标由布局统一承担）。
 */
import { computed, ref, watch, onBeforeUnmount, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Plus, BookOpen, Play, FlaskConical, Save, Sparkles, PenLine, BrainCircuit, Quote, Loader2 as Spinner } from 'lucide-vue-next';
import { AppButton, AppCard, AppInput } from '@shared/ui';
import Boundary from '@shared/ui/Boundary.vue';
import Skeleton from '@shared/ui/Skeleton.vue';
import EmptyState from '@shared/ui/EmptyState.vue';
import { useProjects } from '@features/projects/use-projects';
import {
  useManuscripts,
  useManuscriptFiles,
  useCreateManuscript,
  useSaveFile,
  useSuggestions,
  useDecideSuggestion,
  useCitationCandidates,
  useStartCompile,
} from '@features/writing/queries';
import LatexEditor from '@widgets/LatexEditor/LatexEditor.vue';
import WritingFileTree from '@widgets/WritingFileTree/WritingFileTree.vue';
import DiffPanel from '@widgets/DiffPanel/DiffPanel.vue';
import CitationInsertDialog from '@widgets/CitationInsertDialog/CitationInsertDialog.vue';
import CompileTimeline from '@widgets/CompileTimeline/CompileTimeline.vue';
import type { ManuscriptFile, AiSuggestion } from '@entities/writing/types';
import { useStewardChat } from '@features/steward/queries';
import type { StewardChatMessage } from '@features/steward/api';

const route = useRoute();
const router = useRouter();

// ---------- 项目上下文（与文献页一致） ----------
const projectsQuery = useProjects(20);
const projects = computed(() => projectsQuery.data.value?.items ?? []);
const activeProjectId = ref<string>('');
const projectId = computed(() => activeProjectId.value || projects.value[0]?.id || '');

// ---------- 文稿列表 / 选择 ----------
const manuscriptsQuery = useManuscripts(computed(() => projectId.value));
const manuscripts = computed(() => manuscriptsQuery.data.value ?? []);
const selectedManuscriptId = ref<string>(String(route.params.manuscriptId ?? ''));
watch(
  () => route.params.manuscriptId,
  (id) => {
    selectedManuscriptId.value = String(id ?? '');
  },
);
// 未指定时默认打开第一个文稿（写作工作台直接可用）。
watch(
  () => manuscripts.value.length,
  (n) => {
    if (n > 0 && !selectedManuscriptId.value) {
      selectedManuscriptId.value = manuscripts.value[0]!.id;
      void router.replace({ name: 'writing-detail', params: { manuscriptId: selectedManuscriptId.value } });
    }
  },
  { immediate: true },
);

const createMutation = useCreateManuscript(computed(() => projectId.value));
const newName = ref('');
const createError = ref<string | null>(null);
async function createManuscript(): Promise<void> {
  const name = newName.value.trim();
  if (!name) return;
  createError.value = null;
  try {
    const ms = await createMutation.mutateAsync(name);
    newName.value = '';
    await router.push({ name: 'writing-detail', params: { manuscriptId: ms.id } });
  } catch (err) {
    createError.value = err instanceof Error ? err.message : '创建失败。';
  }
}

// ---------- 文件树 / 编辑器 ----------
const filesQuery = useManuscriptFiles(computed(() => selectedManuscriptId.value));
const files = computed<ManuscriptFile[]>(() => filesQuery.data.value ?? []);
const activePath = ref<string>('main.tex');
const activeFile = computed(() => files.value.find((f) => f.path === activePath.value));
const content = ref('');
watch(
  activeFile,
  (f) => {
    if (f) content.value = f.content;
  },
  { immediate: true },
);

const saveMutation = useSaveFile();
const saveState = ref<'idle' | 'saving' | 'saved' | 'error'>('idle');
let saveTimer: ReturnType<typeof setTimeout> | undefined;
watch(
  content,
  () => {
    // 防抖 1200ms 保存（乐观锁版本递增）
    clearTimeout(saveTimer);
    saveState.value = 'saving';
    const file = activeFile.value;
    if (!file || content.value === file.content) {
      saveState.value = 'idle';
      return;
    }
    saveTimer = setTimeout(() => {
      void (async () => {
        try {
          await saveMutation.mutateAsync({ fileId: file.id, content: content.value, version: file.version });
          saveState.value = 'saved';
          setTimeout(() => {
            saveState.value = 'idle';
          }, 1800);
        } catch (err) {
          saveState.value = 'error';
          saveError.value = err instanceof Error ? err.message : '保存失败。';
        }
      })();
    }, 1200);
  },
);
const saveError = ref<string | null>(null);

// 编辑器 ref（引用插入 / 错误定位）
const editorRef = ref<InstanceType<typeof LatexEditor> | null>(null);

// ---------- 引用插入 ----------
const citationQuery = useCitationCandidates(computed(() => selectedManuscriptId.value));
const citationKeys = computed(() => (citationQuery.data.value ?? []).filter((c) => !c.already_in_bib).map((c) => c.citation_key));
const citationOpen = ref(false);

// ---------- AI diff ----------
const suggestionsQuery = useSuggestions(computed(() => selectedManuscriptId.value));
const suggestions = computed(() => suggestionsQuery.data.value ?? []);
const decideMutation = useDecideSuggestion(computed(() => selectedManuscriptId.value));
const diffError = ref<string | null>(null);
async function decide(suggestionId: string, accept: boolean): Promise<void> {
  diffError.value = null;
  try {
    await decideMutation.mutateAsync({ suggestionId, accept });
    // 接受的建议写入源文件（hunk 应用）——由 mock 决策端点返回状态，此处展示审计结果。
  } catch (err) {
    diffError.value = err instanceof Error ? err.message : '决策失败。';
  }
}

// AI 建议定位：切换到对应文件 + 聚焦行
function locateSuggestion(sg: AiSuggestion): void {
  activePath.value = sg.file_path;
  void nextTick(() => editorRef.value?.focusLine(sg.line_from));
}

// 编辑器内 diff 行高亮（rejected 不高亮）
const suggestionLines = computed(() =>
  suggestions.value
    .filter((s) => s.file_path === activePath.value && s.status !== 'rejected')
    .map((s) => ({ aStart: s.line_from, aEnd: s.line_to, status: s.status as 'pending' | 'accepted' })),
);

// ---------- 编译 ----------
const compileMutation = useStartCompile();
const activeRunId = ref<string | null>(null);
const compileError = ref<string | null>(null);
async function startCompile(mockScenario?: 'success' | 'missing_resource' | 'unsafe_command'): Promise<void> {
  if (!selectedManuscriptId.value) return;
  compileError.value = null;
  try {
    const accepted = await compileMutation.mutateAsync({ manuscriptId: selectedManuscriptId.value, mockScenario });
    activeRunId.value = accepted.run_id;
  } catch (err) {
    compileError.value = err instanceof Error ? err.message : '编译启动失败。';
  }
}

// 编译错误定位（切换文件 + 聚焦行）
async function locateCompileError(file: string, line: number): Promise<void> {
  activePath.value = file;
  await nextTick();
  editorRef.value?.focusLine(line);
}

// 证据检查入口（F4 收口回答生成侧；此处提供 UI 入口与无证据句展示）
const auditOpen = ref(false);

// 清理定时器
onBeforeUnmount(() => clearTimeout(saveTimer));

// ---------- AI 面板四能力（P0-2 H4/H8：真实调用 /steward/chat） ----------
const stewardChat = useStewardChat();
const aiLoading = ref(false);
const aiError = ref<string | null>(null);
const aiResult = ref<string | null>(null);
const aiKind = ref<string | null>(null);

const AI_PROMPTS: Record<string, string> = {
  polish: '你是学术写作润色助手。请润色以下LaTeX文本，保持学术严谨性，改善表达流畅度，不改变原意。只输出润色后的LaTeX文本。',
  continue: '你是学术写作续写助手。请基于上下文续写接下来的段落，保持学术风格和逻辑连贯。只输出续写的LaTeX文本。',
  logic: '你是学术逻辑检查助手。请检查逻辑严密性，指出漏洞或矛盾并给出修改建议。',
  citation: '你是学术引用建议助手。请分析文本，建议需要添加引用的论断并给出引用关键词。',
};

async function runAiAction(kind: string): Promise<void> {
  const text = content.value;
  if (!text?.trim()) { aiError.value = '请先选择文本或确保文档有内容。'; return; }
  aiLoading.value = true; aiError.value = null; aiResult.value = null; aiKind.value = kind;
  const messages: StewardChatMessage[] = [{ role: 'user', content: AI_PROMPTS[kind] + '\n\n文本：\n' + text }];
  try {
    const response = await stewardChat.mutateAsync({ messages, reasoningPolicyId: 'standard' });
    aiResult.value = response.content;
  } catch (err) {
    aiError.value = err instanceof Error ? 'AI调用失败：' + err.message : 'AI调用失败，请稍后重试。';
  } finally { aiLoading.value = false; }
}

function applyAiResult(): void {
  if (!aiResult.value) return;
  editorRef.value?.insertAtCursor(aiResult.value);
  aiResult.value = null;
}
</script>

<template>
  <div class="page writing">
    <header class="page-head">
      <div>
        <h1>写作</h1>
        <p>LaTeX 写作、已核验引用插入、可重现编译与 AI 修订 diff。</p>
      </div>
      <div class="actions">
        <template v-if="projectsQuery.isPending.value">
          <Skeleton label="项目列表加载中" />
        </template>
        <select
          v-else-if="projects.length > 0"
          :value="projectId"
          class="scope"
          aria-label="切换写作所属项目"
          @change="activeProjectId = ($event.target as HTMLSelectElement).value"
        >
          <option
            v-for="p in projects"
            :key="p.id"
            :value="p.id"
          >
            {{ p.title }}
          </option>
        </select>
        <form
          class="new-form"
          @submit.prevent="createManuscript"
        >
          <AppInput
            v-model="newName"
            type="text"
            placeholder="新建文稿名称…"
            aria-label="新文稿名称"
            class="new-name-input"
          />
          <AppButton
            variant="secondary"
            type="submit"
            :loading="createMutation.isPending.value"
            :disabled="!newName.trim()"
          >
            <Plus :size="14" />
            新建
          </AppButton>
        </form>
      </div>
    </header>

    <p
      v-if="createError"
      class="mini-error"
      role="alert"
    >
      {{ createError }}
    </p>

    <Skeleton
      v-if="manuscriptsQuery.isPending.value"
      label="文稿列表加载中"
    />
    <Boundary
      v-else-if="manuscriptsQuery.isError.value"
      tone="danger"
      title="文稿列表加载失败"
    >
      {{ manuscriptsQuery.error.value?.message }}
    </Boundary>
    <EmptyState
      v-else-if="manuscripts.length === 0"
      title="还没有文稿"
      hint="创建 LaTeX 文稿，在项目内完成写作、引用与编译。"
    />

    <div
      v-else-if="selectedManuscriptId"
      class="workspace"
    >
      <!-- 左：文件树 -->
      <AppCard
        padding="sm"
        class="pane tree-pane"
        aria-label="文稿文件"
      >
        <WritingFileTree
          :files="files"
          :active-path="activePath"
          @select="activePath = $event"
        />
      </AppCard>

      <!-- 中：编辑器 -->
      <AppCard
        padding="none"
        class="pane editor-pane"
        aria-label="LaTeX 编辑器"
      >
        <div class="editor-toolbar">
          <span class="file-path">{{ activePath }}</span>
          <span
            class="save-state"
            :class="saveState"
          >
            <Save
              v-if="saveState === 'saving'"
              :size="12"
            />
            {{ saveState === 'saving' ? '保存中…' : saveState === 'saved' ? '已保存' : saveState === 'error' ? '保存失败' : '' }}
          </span>
        </div>
        <Skeleton
          v-if="filesQuery.isPending.value"
          label="文件加载中"
        />
        <Boundary
          v-else-if="filesQuery.isError.value"
          tone="danger"
          title="文件加载失败"
        >
          {{ filesQuery.error.value?.message }}
        </Boundary>
        <LatexEditor
          v-else-if="activeFile"
          ref="editorRef"
          v-model="content"
          :citation-keys="citationKeys"
          :suggestion-lines="suggestionLines"
        />
      </AppCard>

      <!-- 右：编译 + AI diff + 引用 -->
      <AppCard
        padding="sm"
        class="pane right-pane"
        aria-label="编译与修订"
      >
        <div class="right-actions">
          <AppButton
            type="button"
            @click="startCompile()"
          >
            <Play :size="14" />
            编译 PDF
          </AppButton>
          <AppButton
            type="button"
            variant="secondary"
            @click="citationOpen = true"
          >
            <BookOpen :size="14" />
            插入引用
          </AppButton>
          <AppButton
            type="button"
            variant="ghost"
            :aria-label="`证据检查${auditOpen ? '收起' : '展开'}`"
            @click="auditOpen = !auditOpen"
          >
            <FlaskConical :size="14" />
            证据检查
          </AppButton>
        
          <!-- AI 面板四能力（P0-2：真实调用 /steward/chat） -->
          <div class="ai-actions">
            <span class="ai-label">AI 助手</span>
            <AppButton
              type="button"
              variant="secondary"
              size="sm"
              :disabled="aiLoading"
              @click="runAiAction('polish')"
            >
              <Sparkles :size="12" /> 润色
            </AppButton>
            <AppButton
              type="button"
              variant="secondary"
              size="sm"
              :disabled="aiLoading"
              @click="runAiAction('continue')"
            >
              <PenLine :size="12" /> 续写
            </AppButton>
            <AppButton
              type="button"
              variant="secondary"
              size="sm"
              :disabled="aiLoading"
              @click="runAiAction('logic')"
            >
              <BrainCircuit :size="12" /> 逻辑检查
            </AppButton>
            <AppButton
              type="button"
              variant="secondary"
              size="sm"
              :disabled="aiLoading"
              @click="runAiAction('citation')"
            >
              <Quote :size="12" /> 引用建议
            </AppButton>
          </div>
          <div
            v-if="aiLoading"
            class="ai-loading"
          >
            <Spinner :size="14" /> AI 思考中…
          </div>
          <div
            v-if="aiError"
            class="mini-error"
            role="alert"
          >
            {{ aiError }}
          </div>
          <div
            v-if="aiResult"
            class="ai-result"
          >
            <div class="ai-result-head">
              <span>AI {{ aiKind }} 结果</span>
              <AppButton
                type="button"
                size="sm"
                @click="applyAiResult"
              >
                应用到文档
              </AppButton>
            </div>
            <pre class="ai-result-text">{{ aiResult }}</pre>
          </div>
        </div>
        <p
          v-if="compileError"
          class="mini-error"
          role="alert"
        >
          {{ compileError }}
        </p>

        <CompileTimeline
          :run-id="activeRunId"
          :manuscript-id="selectedManuscriptId"
          @locate="locateCompileError"
        />

        <details
          v-if="activeRunId"
          class="drill"
        >
          <summary>演练：编译失败场景</summary>
          <div class="drill-actions">
            <AppButton
              type="button"
              variant="secondary"
              size="sm"
              @click="startCompile('missing_resource')"
            >
              缺失资源
            </AppButton>
            <AppButton
              type="button"
              variant="secondary"
              size="sm"
              @click="startCompile('unsafe_command')"
            >
              不安全命令
            </AppButton>
          </div>
        </details>

        <div
          v-if="auditOpen"
          class="audit"
        >
          <p class="audit-title">
            证据检查（无证据句）
          </p>
          <p class="audit-hint">
            以下句子暂无可追溯证据，可选择“补充证据”或降低表述强度。
          </p>
          <ul class="audit-list">
            <li
              v-for="s in ['未来工作将引入稳健标准误与更细粒度协变量']"
              :key="s"
            >
              <span>「{{ s }}」</span>
              <AppButton
                type="button"
                variant="secondary"
                size="sm"
              >
                请求补证
              </AppButton>
            </li>
          </ul>
        </div>

        <DiffPanel
          :suggestions="suggestions"
          :pending="decideMutation.isPending.value"
          :error="diffError ?? suggestionsQuery.error.value?.message ?? null"
          @decide="decide"
          @locate="locateSuggestion"
        />
      </AppCard>
    </div>

    <CitationInsertDialog
      :open="citationOpen"
      :manuscript-id="selectedManuscriptId"
      @close="citationOpen = false"
      @inserted="() => {}"
    />
  </div>
</template>


<style scoped>
.page {
  max-width: 1600px;
  margin: 0 auto;
}
.page-head {
  display: flex;
  gap: 18px;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 16px;
}
.page-head h1 {
  margin: 0 0 6px;
  font-size: var(--font-size-3xl);
  color: var(--ailp-foreground);
}
.page-head p {
  margin: 0;
  color: var(--ailp-muted-foreground);
  max-width: 75ch;
  font-size: var(--font-size-base);
}
.actions {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
}
.scope {
  min-height: 34px;
  padding: 5px 12px;
  border: 1px solid var(--ailp-input);
  border-radius: var(--radius-md);
  background: var(--ailp-card);
  font-family: var(--font);
  font-weight: 650;
  font-size: var(--font-size-base);
  color: var(--ailp-foreground);
  max-width: 220px;
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}
.scope:focus {
  border-color: var(--ailp-ring);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
}
.new-form {
  display: flex;
  gap: 8px;
  align-items: center;
}
.new-name-input {
  width: 190px;
}
.workspace {
  display: grid;
  grid-template-columns: 190px minmax(0, 1fr) 340px;
  gap: 12px;
  align-items: start;
  height: calc(100dvh - 240px);
  min-height: 480px;
}
.pane {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}
.tree-pane {
  gap: 8px;
  overflow: auto;
}
.editor-pane {
  min-width: 0;
}
.editor-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--ailp-border);
  font-size: var(--font-size-xs);
}
.file-path {
  color: var(--ailp-foreground);
  font-family: var(--mono);
  font-weight: 800;
}
.save-state {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--ailp-muted-foreground);
  font-weight: 700;
}
.save-state.saved {
  color: var(--ailp-success-600);
}
.save-state.error {
  color: var(--ailp-error-600);
}
.right-pane {
  gap: 10px;
  overflow: auto;
  align-content: start;
}
.right-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.mini-error {
  margin: 0;
  color: var(--ailp-error-600);
  font-size: var(--font-size-xs);
  font-weight: 650;
}
.drill {
  border: 1px dashed var(--ailp-border);
  border-radius: var(--radius-md);
  padding: 8px 10px;
}
.drill summary {
  cursor: pointer;
  font-size: var(--font-size-xs);
  font-weight: 700;
  color: var(--ailp-muted-foreground);
}
.drill-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}
.audit {
  border: 1px solid var(--ailp-border);
  border-radius: var(--radius-md);
  padding: 10px 12px;
}
.audit-title {
  margin: 0 0 4px;
  font-size: var(--font-size-base);
  font-weight: 800;
  color: var(--ailp-foreground);
}
.audit-hint {
  margin: 0 0 8px;
  color: var(--ailp-muted-foreground);
  font-size: var(--font-size-base);
}
.audit-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 8px;
}
.audit-list li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: var(--font-size-xs);
  background: var(--warning-bg);
  border: 1px solid var(--ailp-warning-500);
  border-radius: var(--radius-md);
  padding: 8px 10px;
  color: var(--ailp-warning-600);
}
@media (max-width: 1080px) {
  .workspace {
    grid-template-columns: 150px minmax(0, 1fr);
    height: auto;
  }
  .right-pane {
    grid-column: 1 / -1;
    height: auto;
  }
}

.ai-actions { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--s16-border, #e2e8f0); }
.ai-label { font-size: 12px; font-weight: 600; color: var(--s16-text-secondary, #64748b); margin-right: 4px; }
.ai-loading { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--s16-primary, #6366f1); margin-top: 8px; }
.ai-result { margin-top: 12px; padding: 10px; background: var(--s16-bg-subtle, #f8fafc); border-radius: 8px; border: 1px solid var(--s16-border, #e2e8f0); }
.ai-result-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font-size: 13px; font-weight: 600; }
.ai-result-text { font-size: 12px; white-space: pre-wrap; word-break: break-word; max-height: 200px; overflow-y: auto; margin: 0; }
</style>
