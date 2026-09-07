<script setup lang="ts">
/**
 * 编译时间线（TC-F04-04/05）：run_type=writing + SSE 进度轮询。
 * - 成功：PDF 预览（iframe）+ 日志 + 引擎版本 + 输入哈希。
 * - 失败：结构化错误（文件/行/命令）→ 编辑器定位；上次成功 PDF 不丢失（Artifact 不可变）。
 */
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { Loader2, FileText, CheckCircle2, AlertTriangle, TerminalSquare } from 'lucide-vue-next';
import { useCompileRun } from '@features/writing/queries';
import { compiledPdfUrl } from '@features/writing/api';
import Boundary from '@shared/ui/Boundary.vue';

const router = useRouter();

const props = defineProps<{
  runId: string | null;
  manuscriptId: string;
}>();

const emit = defineEmits<{
  /** 定位错误到编辑器（file 行）。 */
  locate: [file: string, line: number];
}>();

const compileQuery = useCompileRun(() => props.runId);
const run = computed(() => compileQuery.data.value);

const STAGE_LABELS: Record<string, string> = {
  queued: '排队中',
  running: '编译中',
  succeeded: '编译成功',
  failed: '编译失败',
  cancelled: '已取消',
};

function stageClass(status: string): string {
  return status === 'succeeded' ? 'ok' : status === 'failed' ? 'bad' : status === 'cancelled' ? 'dim' : 'run';
}
</script>

<template>
  <div
    class="compile"
    aria-label="编译时间线"
  >
    <div class="head">
      <p class="title">
        编译
      </p>
      <span
        v-if="run"
        class="stage"
        :class="stageClass(run.status)"
      >
        <Loader2
          v-if="run.status === 'running' || run.status === 'queued'"
          :size="12"
          class="spin"
        />
        <CheckCircle2
          v-else-if="run.status === 'succeeded'"
          :size="12"
        />
        <AlertTriangle
          v-else-if="run.status === 'failed'"
          :size="12"
        />
        {{ run.status ? STAGE_LABELS[run.status] ?? run.status : '未开始' }}
      </span>
      <span
        v-else
        class="stage dim"
      >
        未开始
      </span>
    </div>

    <div
      v-if="run && run.status !== 'succeeded' && run.status !== 'failed'"
      class="progress-row"
    >
      <div
        class="bar"
        role="progressbar"
        :aria-valuenow="run.progress ?? 0"
        aria-valuemin="0"
        aria-valuemax="100"
        aria-label="编译进度"
      >
        <div
          class="fill"
          :style="{ width: `${run.progress ?? 0}%` }"
        />
      </div>
      <p class="stage-msg">
        {{ run.stageMessage ?? '等待服务端事件' }}{{ run.progress != null ? `（${run.progress}%）` : '' }}
      </p>
    </div>

    <div
      v-if="run?.status === 'succeeded' && run.pdf_artifact_id"
      class="result"
    >
      <iframe
        :src="compiledPdfUrl(run.pdf_artifact_id)"
        class="pdf-frame"
        title="编译 PDF 预览"
      />
      <dl class="meta">
        <dt>引擎</dt>
        <dd>{{ run.engine ?? '—' }}</dd>
        <dt>输入哈希</dt>
        <dd><code>{{ run.input_hash ?? '—' }}</code></dd>
        <dt>日志</dt>
        <dd><code>编译完成，无错误。</code></dd>
      </dl>
    </div>

    <div
      v-else-if="run?.status === 'succeeded'"
      class="ok-msg"
    >
      <CheckCircle2 :size="14" />
      编译成功。产物 PDF 与日志已生成（<a
        class="runs-link"
        @click.prevent="router.push({ name: 'runs' })"
      >详见运行中心</a>）。
    </div>

    <div
      v-if="run?.status === 'failed'"
      class="fail"
    >
      <Boundary
        tone="danger"
        title="编译失败"
      >
        {{ run.stageMessage ?? '编译失败' }}
      </Boundary>
      <ul class="err-list">
        <li
          v-for="(e, i) in run.errors"
          :key="i"
          class="err"
        >
          <TerminalSquare :size="13" />
          <div class="err-main">
            <p class="err-line">
              {{ e.file }}{{ e.line ? `:${e.line}` : '' }} · {{ e.kind }}
              <span
                v-if="e.unsafe_command"
                class="warn-chip"
              >不安全命令</span>
            </p>
            <p class="err-msg">
              {{ e.message }}
            </p>
          </div>
          <button
            type="button"
            class="mini-btn"
            @click="emit('locate', e.file, e.line ?? 1)"
          >
            定位
          </button>
        </li>
      </ul>
      <p class="preserve">
        <FileText :size="12" />
        上一次成功 PDF 不会丢失（每次编译生成独立产物）。
      </p>
    </div>
  </div>
</template>

<style scoped>
.compile {
  display: grid;
  gap: 8px;
}
.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.title {
  margin: 0;
  font-size: var(--font-size-sm);
  font-weight: 800;
}
.stage {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: var(--font-size-xs);
  font-weight: 800;
  padding: 1px 8px;
  border-radius: 999px;
  background: var(--info-bg);
  color: var(--primary);
}
.stage.ok {
  background: var(--success-bg);
  color: #1c6a4a;
}
.stage.bad {
  background: var(--danger-bg);
  color: #a03030;
}
.stage.dim {
  background: var(--subtle-bg);
  color: var(--text-muted);
}
.spin {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
.progress-row {
  display: grid;
  gap: 4px;
}
.bar {
  height: 8px;
  border-radius: 999px;
  background: var(--subtle-bg);
  overflow: hidden;
}
.fill {
  height: 100%;
  background: var(--primary);
  border-radius: 999px;
  transition: width 0.25s ease;
}
.stage-msg {
  margin: 0;
  font-size: var(--font-size-xs);
  color: var(--text-muted);
}
.result {
  display: grid;
  gap: 8px;
}
.pdf-frame {
  width: 100%;
  height: 420px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: #fff;
}
.meta {
  display: grid;
  grid-template-columns: 72px 1fr;
  gap: 3px 8px;
  margin: 0;
  font-size: var(--font-size-xs);
}
.meta dt {
  color: var(--text-muted);
  font-weight: 700;
}
.meta dd {
  margin: 0;
  overflow-wrap: anywhere;
}
.meta code {
  font-family: var(--mono);
}
.ok-msg {
  display: flex;
  align-items: center;
  gap: 5px;
  color: #1c6a4a;
  font-size: var(--font-size-xs);
  font-weight: 700;
}
.fail {
  display: grid;
  gap: 8px;
}
.err-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 6px;
}
.err {
  display: flex;
  gap: 7px;
  align-items: flex-start;
  border: 1px solid var(--border);
  border-radius: 7px;
  padding: 7px 9px;
  background: var(--surface);
}
.err-main {
  flex: 1;
  min-width: 0;
}
.err-line {
  margin: 0;
  font-family: var(--mono);
  font-size: var(--font-size-xs);
  font-weight: 800;
  display: flex;
  align-items: center;
  gap: 5px;
}
.err-msg {
  margin: 2px 0 0;
  font-size: var(--font-size-xs);
  color: var(--text-muted);
}
.warn-chip {
  padding: 0 6px;
  border-radius: 999px;
  background: var(--warning-bg);
  color: #664718;
  font-size: 10px;
  font-weight: 800;
}
.preserve {
  display: flex;
  align-items: center;
  gap: 5px;
  margin: 0;
  color: var(--text-muted);
  font-size: var(--font-size-xs);
}
.mini-btn {
  min-height: 26px;
  padding: 2px 9px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--surface);
  font-size: var(--font-size-xs);
  font-weight: 700;
  cursor: pointer;
}

.runs-link { color: var(--s16-primary, #6366f1); cursor: pointer; text-decoration: underline; }
.runs-link:hover { opacity: 0.8; }</style>
