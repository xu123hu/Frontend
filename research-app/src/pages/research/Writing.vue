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
import { Plus, BookOpen, Play, FlaskConical, Save } from 'lucide-vue-next';
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
          <input
            v-model="newName"
            type="text"
            placeholder="新建文稿名称…"
            aria-label="新文稿名称"
          >
          <button
            type="submit"
            class="btn"
            :disabled="!newName.trim() || createMutation.isPending.value"
          >
            <Plus :size="14" />
            新建
          </button>
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
      <aside
        class="pane tree-pane"
        aria-label="文稿文件"
      >
        <WritingFileTree
          :files="files"
          :active-path="activePath"
          @select="activePath = $event"
        />
      </aside>

      <!-- 中：编辑器 -->
      <section
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
      </section>

      <!-- 右：编译 + AI diff + 引用 -->
      <aside
        class="pane right-pane"
        aria-label="编译与修订"
      >
        <div class="right-actions">
          <button
            type="button"
            class="btn primary"
            @click="startCompile()"
          >
            <Play :size="14" />
            编译 PDF
          </button>
          <button
            type="button"
            class="btn"
            @click="citationOpen = true"
          >
            <BookOpen :size="14" />
            插入引用
          </button>
          <button
            type="button"
            class="btn"
            :aria-label="`证据检查${auditOpen ? '收起' : '展开'}`"
            @click="auditOpen = !auditOpen"
          >
            <FlaskConical :size="14" />
            证据检查
          </button>
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
            <button
              type="button"
              class="mini-btn"
              @click="startCompile('missing_resource')"
            >
              缺失资源
            </button>
            <button
              type="button"
              class="mini-btn"
              @click="startCompile('unsafe_command')"
            >
              不安全命令
            </button>
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
            以下句子暂无可追溯证据，可「补证」或「降级措辞」（AI 管家生成侧 F4 收口）。
          </p>
          <ul class="audit-list">
            <li
              v-for="s in ['未来工作将引入稳健标准误与更细粒度协变量']"
              :key="s"
            >
              <span>「{{ s }}」</span>
              <button
                type="button"
                class="mini-btn"
              >
                请求补证
              </button>
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
      </aside>
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
  justify-content: flex-end;
}
.scope {
  min-height: 34px;
  padding: 5px 9px;
  border: 1px solid var(--border);
  border-radius: 7px;
  background: var(--surface);
  font-weight: 650;
  color: var(--text);
  max-width: 200px;
}
.new-form {
  display: flex;
  gap: 6px;
  align-items: center;
}
.new-form input {
  min-height: 34px;
  width: 180px;
  padding: 5px 10px;
  border: 1px solid var(--border);
  border-radius: 7px;
  font-size: var(--font-size-sm);
}
.btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-height: 34px;
  padding: 6px 11px;
  border: 1px solid var(--border);
  border-radius: 7px;
  background: var(--surface);
  font-weight: 650;
  color: var(--text);
  cursor: pointer;
}
.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.btn.primary {
  background: var(--primary);
  border-color: var(--primary);
  color: #fff;
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
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  height: 100%;
}
.tree-pane {
  padding: 10px;
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
  padding: 7px 10px;
  border-bottom: 1px solid var(--border);
  font-size: var(--font-size-xs);
}
.file-path {
  font-family: var(--mono);
  font-weight: 800;
}
.save-state {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--text-muted);
  font-weight: 700;
}
.save-state.saved {
  color: #1c6a4a;
}
.save-state.error {
  color: var(--danger);
}
.right-pane {
  padding: 10px;
  gap: 10px;
  overflow: auto;
  align-content: start;
}
.right-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.mini-error {
  margin: 0;
  color: var(--danger);
  font-size: var(--font-size-xs);
  font-weight: 650;
}
.drill {
  border: 1px dashed var(--border);
  border-radius: 7px;
  padding: 6px 8px;
}
.drill summary {
  cursor: pointer;
  font-size: var(--font-size-xs);
  font-weight: 700;
  color: var(--text-muted);
}
.drill-actions {
  display: flex;
  gap: 6px;
  margin-top: 6px;
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
.audit {
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 8px 10px;
}
.audit-title {
  margin: 0 0 3px;
  font-size: var(--font-size-sm);
  font-weight: 800;
}
.audit-hint {
  margin: 0 0 6px;
  color: var(--text-muted);
  font-size: var(--font-size-xs);
}
.audit-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 5px;
}
.audit-list li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: var(--font-size-xs);
  background: var(--warning-bg);
  border-radius: 6px;
  padding: 5px 8px;
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
</style>
