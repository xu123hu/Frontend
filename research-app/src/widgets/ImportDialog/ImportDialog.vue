<script setup lang="ts">
/**
 * 可视化批量导入弹窗（黄金链路二 TC-F02-03..06）。
 * - 拖拽/多选入队；非法文件立即失败+原因，不静默丢弃。
 * - 阶段：queued→uploading→parsing→chunking→completed/failed；
 *   解析进度只来自 SSE 事件（server-driven），上传进度来自真实字节流。
 * - 失败可单条重试；断网显示暂停条；刷新恢复由 useImportQueue 承担。
 */
import { ref, computed } from 'vue';
import { UploadCloud, FileText, X, RotateCcw, Trash2, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-vue-next';
import { useImportQueue } from '@features/literature/use-import-queue';
import { IMPORT_MAX_FILE_BYTES } from '@shared/lib/import-queue';
import Boundary from '@shared/ui/Boundary.vue';
import { useDialogA11y } from '@shared/lib/use-dialog-a11y';

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ close: []; imported: [itemId: string] }>();

const dialogRoot = ref<HTMLDivElement | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);
useDialogA11y(dialogRoot, computed(() => props.open), () => emit('close'), () => fileInput.value);

const queue = useImportQueue({
  onItemImported: (itemId) => emit('imported', itemId),
});

const dragOver = ref(false);
const rejectMessage = ref<string | null>(null);

const STAGE_LABELS: Record<string, string> = {
  initial: '准备中',
  queued: '排队中',
  uploading: '上传中',
  parsing: '解析中',
  chunking: '切分中',
  completed: '完成',
  failed: '失败',
};

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
}

function addFiles(list: FileList | File[] | null): void {
  if (!list) return;
  const files = Array.from(list);
  const invalid = files.filter((f) => f.size > IMPORT_MAX_FILE_BYTES);
  if (invalid.length === files.length && invalid.length > 0) {
    rejectMessage.value = `所选文件均超过 ${formatSize(IMPORT_MAX_FILE_BYTES)} 上限。`;
  } else {
    rejectMessage.value = null;
  }
  queue.enqueue(files);
}

function onDrop(event: DragEvent): void {
  dragOver.value = false;
  addFiles(event.dataTransfer?.files ?? null);
}

function onPick(event: Event): void {
  addFiles((event.target as HTMLInputElement).files);
  (event.target as HTMLInputElement).value = '';
}

const completedCount = computed(() => queue.files.value.filter((f) => f.stage === 'completed').length);
const failedCount = computed(() => queue.files.value.filter((f) => f.stage === 'failed').length);
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="overlay"
      @click.self="emit('close')"
    >
      <div
        ref="dialogRoot"
        class="dialog"
        role="dialog"
        aria-modal="true"
        aria-label="批量导入文献"
      >
        <header class="head">
          <h2>批量导入文献</h2>
          <button
            type="button"
            class="icon-btn"
            aria-label="关闭"
            @click="emit('close')"
          >
            <X :size="16" />
          </button>
        </header>

        <div class="body">
          <Boundary
            v-if="queue.offline.value"
            tone="warning"
            title="网络已断开"
          >
            队列已暂停，恢复联网后自动继续。
          </Boundary>

          <div
            class="dropzone"
            :class="{ over: dragOver }"
            role="button"
            tabindex="0"
            aria-label="拖入或点击选择 PDF 文件"
            @click="fileInput?.click()"
            @keydown.enter.prevent="fileInput?.click()"
            @keydown.space.prevent="fileInput?.click()"
            @dragover.prevent="dragOver = true"
            @dragleave="dragOver = false"
            @drop.prevent="onDrop"
          >
            <UploadCloud :size="26" />
            <p class="dz-main">
              拖入 PDF 文件，或点击选择（支持多选）
            </p>
            <p class="dz-sub">
              单个文件 ≤ {{ formatSize(IMPORT_MAX_FILE_BYTES) }}；仅支持 PDF。解析与切分参数由服务端契约给定。
            </p>
          </div>
          <input
            ref="fileInput"
            type="file"
            accept="application/pdf,.pdf"
            multiple
            class="file-input"
            aria-hidden="true"
            tabindex="-1"
            @change="onPick"
          >
          <p
            v-if="rejectMessage"
            class="reject"
            role="alert"
          >
            {{ rejectMessage }}
          </p>

          <ul
            v-if="queue.files.value.length > 0"
            class="queue"
            aria-label="导入队列"
          >
            <li
              v-for="f in queue.files.value"
              :key="f.id"
              class="file-row"
            >
              <FileText
                :size="16"
                class="file-icon"
              />
              <div class="file-main">
                <div class="file-line">
                  <span
                    class="file-name"
                    :title="f.name"
                  >{{ f.name }}</span>
                  <span class="file-size">{{ formatSize(f.sizeBytes) }}</span>
                  <span
                    class="stage"
                    :class="`stage-${f.stage}`"
                  >
                    <Loader2
                      v-if="['uploading', 'parsing', 'chunking'].includes(f.stage)"
                      :size="12"
                      class="spin"
                    />
                    <CheckCircle2
                      v-else-if="f.stage === 'completed'"
                      :size="12"
                    />
                    <AlertTriangle
                      v-else-if="f.stage === 'failed'"
                      :size="12"
                    />
                    {{ STAGE_LABELS[f.stage] ?? f.stage }}
                  </span>
                </div>
                <div
                  v-if="f.stage === 'uploading' && f.progressPercent !== null"
                  class="bar"
                  role="progressbar"
                  :aria-valuenow="f.progressPercent"
                  aria-valuemin="0"
                  aria-valuemax="100"
                  aria-label="上传进度"
                >
                  <div
                    class="bar-fill"
                    :style="{ width: `${f.progressPercent}%` }"
                  />
                </div>
                <p
                  v-if="f.stageMessage"
                  class="stage-msg"
                >
                  {{ f.stageMessage }}
                  <span v-if="f.serverDrivenProgress && f.progressPercent !== null">（{{ f.progressPercent }}%）</span>
                </p>
                <p
                  v-if="f.failure"
                  class="failure"
                  role="alert"
                >
                  {{ f.failure.message }}
                </p>
              </div>
              <div class="file-actions">
                <button
                  v-if="f.stage === 'failed' && f.failure?.retryable"
                  type="button"
                  class="icon-btn"
                  :aria-label="`重试 ${f.name}`"
                  title="重试"
                  @click="queue.retry(f.id)"
                >
                  <RotateCcw :size="14" />
                </button>
                <button
                  type="button"
                  class="icon-btn"
                  :aria-label="`移除 ${f.name}`"
                  title="移除"
                  @click="queue.remove(f.id)"
                >
                  <Trash2 :size="14" />
                </button>
              </div>
            </li>
          </ul>
          <p
            v-else
            class="empty"
          >
            队列为空。导入完成的条目将进入「全部条目」，可归入集合并添加标签。
          </p>
        </div>

        <footer class="foot">
          <span
            v-if="queue.files.value.length > 0"
            class="summary"
            role="status"
          >
            完成 {{ completedCount }} · 失败 {{ failedCount }} · 进行中 {{ queue.files.value.length - completedCount - failedCount }}
          </span>
          <div class="foot-actions">
            <button
              type="button"
              class="btn"
              :disabled="completedCount + failedCount === 0"
              @click="queue.clearFinished()"
            >
              清除已结束
            </button>
            <button
              type="button"
              class="btn primary"
              @click="emit('close')"
            >
              完成
            </button>
          </div>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 32, 52, 0.45);
  display: grid;
  place-items: center;
  z-index: 200;
  padding: 16px;
}
.dialog {
  width: min(640px, 100%);
  max-height: min(80vh, 640px);
  display: flex;
  flex-direction: column;
  background: var(--surface);
  border-radius: 12px;
  box-shadow: var(--shadow);
  overflow: hidden;
}
.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border);
}
.head h2 {
  margin: 0;
  font-size: var(--font-size-lg);
}
.body {
  padding: 14px 16px;
  overflow: auto;
  display: grid;
  gap: 10px;
}
.dropzone {
  border: 1.5px dashed var(--border);
  border-radius: 10px;
  padding: 22px 14px;
  text-align: center;
  color: var(--text-muted);
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}
.dropzone.over,
.dropzone:hover {
  border-color: var(--primary);
  background: var(--primary-soft);
}
.dz-main {
  margin: 8px 0 4px;
  font-weight: 700;
  color: var(--text);
}
.dz-sub {
  margin: 0;
  font-size: var(--font-size-xs);
}
.file-input {
  display: none;
}
.reject {
  margin: 0;
  color: var(--danger);
  font-size: var(--font-size-sm);
}
.queue {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 8px;
}
.file-row {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 9px 10px;
  border: 1px solid var(--border);
  border-radius: 9px;
}
.file-icon {
  margin-top: 2px;
  color: var(--text-muted);
  flex-shrink: 0;
}
.file-main {
  flex: 1;
  min-width: 0;
  display: grid;
  gap: 4px;
}
.file-line {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.file-name {
  font-weight: 650;
  font-size: var(--font-size-sm);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.file-size {
  color: var(--text-muted);
  font-size: var(--font-size-xs);
  flex-shrink: 0;
}
.stage {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: var(--font-size-xs);
  font-weight: 700;
  padding: 1px 8px;
  border-radius: 999px;
  flex-shrink: 0;
}
.stage-queued { background: var(--subtle-bg); color: var(--text-muted); }
.stage-upload { background: var(--info-bg); color: var(--ailp-primary-700); }
.stage-uploading { background: var(--info-bg); color: var(--ailp-primary-700); }
.stage-parsing { background: var(--info-bg); color: var(--ailp-primary-700); }
.stage-chunking { background: var(--ailp-violet-50); color: var(--ailp-violet-600); }
.stage-completed { background: var(--success-bg); color: var(--ailp-success-600); }
.stage-failed { background: var(--danger-bg); color: var(--ailp-error-600); }
.spin { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.bar {
  height: 5px;
  border-radius: 999px;
  background: var(--subtle-bg);
  overflow: hidden;
}
.bar-fill {
  height: 100%;
  background: var(--primary);
  border-radius: 999px;
  transition: width 0.2s;
}
.stage-msg {
  margin: 0;
  font-size: var(--font-size-xs);
  color: var(--text-muted);
}
.failure {
  margin: 0;
  font-size: var(--font-size-xs);
  color: var(--danger);
  font-weight: 650;
}
.empty {
  margin: 4px 0;
  color: var(--text-muted);
  font-size: var(--font-size-sm);
}
.file-actions {
  display: flex;
  gap: 4px;
}
.foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 16px;
  border-top: 1px solid var(--border);
}
.summary {
  font-size: var(--font-size-xs);
  color: var(--text-muted);
}
.foot-actions {
  display: flex;
  gap: 7px;
  margin-left: auto;
}
.btn {
  min-height: 34px;
  padding: 6px 12px;
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
.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
}
.icon-btn:hover {
  background: var(--subtle-bg);
  color: var(--text);
}
</style>
