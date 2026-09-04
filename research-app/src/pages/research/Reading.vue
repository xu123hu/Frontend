<script setup lang="ts">
/**
 * PDF 阅读器（黄金链路二：证据定位 + 批注/笔记，TC-F02-08/09/12）。
 *
 * - 渲染：pdfjs-dist；证据跳转（路由 query ?page=&bbox=）滚动到页并高亮 bbox。
 * - 批注：文本层划选 → quoted_text（契约必填）+ page_index + bbox（scale 归一）→ 入库。
 * - 锚定失效（needs_reanchor）显式警示；无全文（metadata_only/restricted）不渲染假页面。
 * - 笔记独立子对象；刷新后批注/笔记从服务端重放（TC-F02-09 持久化）。
 */
import { computed, onBeforeUnmount, onMounted, ref, watch, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ArrowLeft, MessageSquareText, NotebookPen, TriangleAlert, Trash2, Languages } from 'lucide-vue-next';
import * as pdfjsLib from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import Boundary from '@shared/ui/Boundary.vue';
import Skeleton from '@shared/ui/Skeleton.vue';
import TranslationPane from '@widgets/TranslationPane/TranslationPane.vue';
import {
  useLiteratureItem,
  useAnnotations,
  useNotes,
  useCreateAnnotation,
  useDeleteAnnotation,
  useCreateNote,
} from '@features/literature/queries';
import { pdfUrl } from '@features/literature/api';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

const route = useRoute();
const router = useRouter();
const itemId = computed(() => String(route.params.id ?? ''));

/** 阅读模式：批注/笔记 或 阅读与翻译（06 §5 步骤 1：从文献条目进入，非孤立工具页）。 */
const readMode = ref<'annotate' | 'translate'>('annotate');

const itemQuery = useLiteratureItem(itemId);
const item = computed(() => itemQuery.data.value);

const annotationsQuery = useAnnotations(itemId);
const notesQuery = useNotes(itemId);
const createAnnotationMutation = useCreateAnnotation(itemId);
const deleteAnnotationMutation = useDeleteAnnotation(itemId);
const createNoteMutation = useCreateNote(itemId);

const noFullText = computed(
  () => item.value && (item.value.full_text_availability !== 'available' || !item.value.pdf_artifact_id),
);

// ---------- pdf.js 渲染 ----------
const pdfError = ref<string | null>(null);
const pdfLoading = ref(true);
const pageCount = ref(0);
const SCALE = 1.4;
const pageContainers = ref<Map<number, HTMLElement>>(new Map());
const pdfDoc = ref<pdfjsLib.PDFDocumentProxy | null>(null);
let cleanupFns: Array<() => void> = [];

function setPageEl(page: number, el: HTMLElement | null): void {
  if (el) pageContainers.value.set(page, el);
  else pageContainers.value.delete(page);
}

const TEXT_LAYER_STYLE =
  '.textLayer{position:absolute;inset:0;overflow:hidden;line-height:1;text-align:initial;forced-color-adjust:none;transform-origin:0 0;}' +
  '.textLayer span,.textLayer br{color:transparent;position:absolute;white-space:pre;cursor:text;transform-origin:0% 0%;}' +
  '.textLayer ::selection{background:rgba(82,114,220,0.35);}';

function injectTextLayerStyle(): void {
  if (document.getElementById('pdf-text-layer-style')) return;
  const style = document.createElement('style');
  style.id = 'pdf-text-layer-style';
  style.textContent = TEXT_LAYER_STYLE;
  document.head.appendChild(style);
}

async function renderPdf(): Promise<void> {
  if (!item.value?.pdf_artifact_id) return;
  pdfError.value = null;
  pdfLoading.value = true;
  try {
    injectTextLayerStyle();
    const doc = await pdfjsLib.getDocument({ url: pdfUrl(item.value.pdf_artifact_id), withCredentials: true }).promise;
    pdfDoc.value = doc;
    pageCount.value = doc.numPages;
    // 必须先结束 loading 让 .pages 容器挂载（v-else 分支），
    // 否则下方循环拿到的 pageContainers 全为空 → 渲染出空白页框。
    pdfLoading.value = false;
    await nextTick();
    for (let p = 1; p <= Math.min(doc.numPages, 30); p++) {
      const host = pageContainers.value.get(p);
      if (!host) continue;
      const page = await doc.getPage(p);
      const viewport = page.getViewport({ scale: SCALE });
      const canvas = document.createElement('canvas');
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      canvas.style.width = `${viewport.width}px`;
      canvas.style.display = 'block';
      const canvasHost = host.querySelector<HTMLElement>('.canvas-host')!;
      canvasHost.appendChild(canvas);
      await page.render({ canvasContext: canvas.getContext('2d')!, viewport }).promise;
      // 文本层（v4：TextLayer 类；容错旧 renderTextLayer API）
      const textHost = host.querySelector<HTMLElement>('.text-host')!;
      // pdf.js v4 的 TextLayer 不负责给容器加类名（官方 viewer 由 TextLayerBuilder 加），
      // 必须显式加 textLayer 类，否则 .textLayer span 定位样式与划选均失效。
      textHost.classList.add('textLayer');
      const tc = await page.getTextContent();
      // pdfjs-dist 4.10.38 固定版本：TextLayer 类为唯一文本层 API
      // （v4 已移除 renderTextLayer，不写不可达的 legacy 兜底）。
      const tl = new pdfjsLib.TextLayer({ textContentSource: tc, container: textHost, viewport });
      await tl.render();
      // pdf.js v4 TextLayer 依赖 --scale-factor CSS 变量定位文本 span；
      // 画布/文本层按 viewport 像素 1:1，宿主固定宽度（窄屏横向滚动），
      // 保证划选 bbox 的归一数学（÷SCALE）与展示一致。
      textHost.style.width = `${viewport.width}px`;
      textHost.style.height = `${viewport.height}px`;
      host.style.width = `${viewport.width}px`;
      host.style.setProperty('--scale-factor', String(viewport.scale));
      cleanupFns.push(() => canvas.remove());
    }
  } catch (err) {
    pdfError.value = err instanceof Error ? `PDF 渲染失败：${err.message}` : 'PDF 渲染失败。';
  } finally {
    pdfLoading.value = false;
  }
}

// ---------- 证据跳转（TC-F02-08） ----------
const highlightBbox = ref<[number, number, number, number] | null>(null);
const activePage = ref<number | null>(null);

async function jumpToEvidence(): Promise<void> {
  const pageQ = route.query.page ? Number(route.query.page) : null;
  const bboxQ = typeof route.query.bbox === 'string' && route.query.bbox ? (route.query.bbox.split(',').map(Number) as [number, number, number, number]) : null;
  if (!pageQ || Number.isNaN(pageQ)) return;
  activePage.value = pageQ;
  highlightBbox.value = bboxQ && bboxQ.length === 4 && bboxQ.every((n) => !Number.isNaN(n)) ? bboxQ : null;
  await nextTick();
  pageContainers.value.get(pageQ)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/** 译文段落 → 定位原文块（TC-F03-05）：滚动到对应页。 */
function locateTranslationBlock(_blockId: string, page: number): void {
  activePage.value = page;
  void nextTick(() => pageContainers.value.get(page)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
}

// ---------- 划选批注（TC-F02-09） ----------
const selectionDraft = ref<{ page: number; text: string; bbox: [number, number, number, number] } | null>(null);
const annoComment = ref('');
const annoError = ref<string | null>(null);

function onMouseUp(): void {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed) return;
  const text = sel.toString().trim();
  if (text.length < 2) return;
  const range = sel.getRangeAt(0);
  const host = (range.commonAncestorContainer instanceof Element
    ? range.commonAncestorContainer
    : range.commonAncestorContainer.parentElement
  )?.closest('.page-wrap');
  if (!host) return;
  const page = Number((host as HTMLElement).dataset.page);
  if (!page) return;
  const hostRect = (host as HTMLElement).getBoundingClientRect();
  const rect = range.getBoundingClientRect();
  // bbox 归一到 SCALE=1 的 PDF 视口坐标（ Locator 草案：page_index + bbox 四元组）
  const bbox: [number, number, number, number] = [
    Math.round((rect.left - hostRect.left) / SCALE),
    Math.round((rect.top - hostRect.top) / SCALE),
    Math.round((rect.right - hostRect.left) / SCALE),
    Math.round((rect.bottom - hostRect.top) / SCALE),
  ];
  selectionDraft.value = { page, text, bbox };
  annoComment.value = '';
  annoError.value = null;
}

async function saveAnnotation(): Promise<void> {
  if (!selectionDraft.value) return;
  annoError.value = null;
  try {
    const created = await createAnnotationMutation.mutateAsync({
      page_index: selectionDraft.value.page,
      bbox: selectionDraft.value.bbox,
      quoted_text: selectionDraft.value.text,
      anchor_status: 'anchored',
      comment: annoComment.value.trim(),
    });
    annotationsQuery.refetch();
    selectionDraft.value = null;
    void created;
  } catch (err) {
    annoError.value = err instanceof Error ? err.message : '批注保存失败。';
  }
}

function discardSelection(): void {
  selectionDraft.value = null;
  window.getSelection()?.removeAllRanges();
}

async function removeAnnotation(annoId: string): Promise<void> {
  try {
    await deleteAnnotationMutation.mutateAsync(annoId);
  } catch (err) {
    annoError.value = err instanceof Error ? err.message : '删除批注失败。';
  }
}

// ---------- 笔记 ----------
const noteDraft = ref('');
const noteError = ref<string | null>(null);

async function saveNote(): Promise<void> {
  if (!noteDraft.value.trim()) return;
  noteError.value = null;
  try {
    await createNoteMutation.mutateAsync(noteDraft.value.trim());
    noteDraft.value = '';
  } catch (err) {
    noteError.value = err instanceof Error ? err.message : '笔记保存失败。';
  }
}

/** 证据卡跳转高亮框（bbox × SCALE 定位到页面容器）。 */
function highlightStyle(bbox: [number, number, number, number]): Record<string, string> {
  return {
    left: `${bbox[0] * SCALE}px`,
    top: `${bbox[1] * SCALE}px`,
    width: `${(bbox[2] - bbox[0]) * SCALE}px`,
    height: `${(bbox[3] - bbox[1]) * SCALE}px`,
  };
}

watch(
  () => [itemId.value, noFullText.value] as const,
  async ([id, noFull]) => {
    if (id && !noFull) {
      await renderPdf();
      await jumpToEvidence();
    }
  },
  { immediate: true },
);

onMounted(() => document.addEventListener('mouseup', onMouseUp));
onBeforeUnmount(() => {
  document.removeEventListener('mouseup', onMouseUp);
  for (const fn of cleanupFns) fn();
  try {
    void pdfDoc.value?.destroy();
  } catch {
    // pdf.js 内部状态竞态（加载未完成即卸载）不阻断卸载。
  }
  pdfDoc.value = null;
});

function goBack(): void {
  void router.push({ name: 'literature' });
}
</script>

<template>
  <div class="page reading">
    <header class="page-head">
      <div class="title-wrap">
        <button
          class="btn"
          type="button"
          @click="goBack"
        >
          <ArrowLeft :size="14" />
          返回文献库
        </button>
        <div>
          <h1>{{ item?.title ?? '文献阅读' }}</h1>
          <p v-if="item">
            {{ item.authors.join('、') }} <template v-if="item.year">
              · {{ item.year }}
            </template>
            <template v-if="item.venue">
              · {{ item.venue }}
            </template>
          </p>
        </div>
      </div>
      <div class="mode-switch">
        <button
          type="button"
          class="btn"
          :class="{ primary: readMode === 'annotate' }"
          :aria-pressed="readMode === 'annotate'"
          @click="readMode = 'annotate'"
        >
          <MessageSquareText :size="13" />
          批注 / 笔记
        </button>
        <button
          type="button"
          class="btn"
          :class="{ primary: readMode === 'translate' }"
          :aria-pressed="readMode === 'translate'"
          @click="readMode = 'translate'"
        >
          <Languages :size="13" />
          阅读与翻译
        </button>
      </div>
    </header>

    <Skeleton
      v-if="itemQuery.isPending.value"
      label="文献加载中"
    />
    <Boundary
      v-else-if="itemQuery.isError.value"
      tone="danger"
      title="文献加载失败"
    >
      {{ itemQuery.error.value?.message }}
    </Boundary>

    <Boundary
      v-else-if="noFullText"
      tone="warning"
      title="无全文可读"
    >
      该条目全文状态为「{{ item!.full_text_availability }}」，仅保留元数据，不渲染假页面。
      可通过三源检索寻找可获得的全文来源。
    </Boundary>

    <div
      v-else
      class="reader-grid"
    >
      <!-- PDF 主体 -->
      <section
        class="pdf-pane"
        aria-label="PDF 阅读区"
      >
        <Skeleton
          v-if="pdfLoading"
          label="PDF 渲染中"
        />
        <Boundary
          v-else-if="pdfError"
          tone="danger"
          title="PDF 打开失败"
        >
          {{ pdfError }}
        </Boundary>
        <div
          v-else
          class="pages"
        >
          <div
            v-for="p in Math.min(pageCount, 30)"
            :key="p"
            :ref="(el) => setPageEl(p, el as HTMLElement)"
            class="page-wrap"
            :data-page="p"
          >
            <div class="canvas-host" />
            <div class="text-host" />
            <div
              v-if="activePage === p && highlightBbox"
              class="evidence-highlight"
              :style="highlightStyle(highlightBbox)"
            />
            <span class="page-num">{{ p }} / {{ pageCount }}</span>
          </div>
        </div>
      </section>

      <!-- 批注 / 笔记 或 阅读与翻译 侧栏 -->
      <aside
        class="side-pane"
        :aria-label="readMode === 'translate' ? '译文与保真' : '批注与笔记'"
      >
        <template v-if="readMode === 'annotate'">
          <!-- 划选批注草稿 -->
          <div
            v-if="selectionDraft"
            class="draft"
            role="form"
            aria-label="新建批注"
          >
            <p class="side-title">
              <MessageSquareText :size="13" />
              新批注（第 {{ selectionDraft.page }} 页）
            </p>
            <blockquote class="quote">
              “{{ selectionDraft.text.slice(0, 160) }}{{ selectionDraft.text.length > 160 ? '…' : '' }}”
            </blockquote>
            <textarea
              v-model="annoComment"
              rows="2"
              placeholder="批注（可选）"
              aria-label="批注内容"
            />
            <p
              v-if="annoError"
              class="mini-error"
              role="alert"
            >
              {{ annoError }}
            </p>
            <div class="draft-actions">
              <button
                type="button"
                class="btn primary"
                :disabled="createAnnotationMutation.isPending.value"
                @click="saveAnnotation"
              >
                保存批注
              </button>
              <button
                type="button"
                class="btn"
                @click="discardSelection"
              >
                取消
              </button>
            </div>
          </div>
          <p
            v-else
            class="hint"
          >
            在正文划选文字即可创建批注；批注携带引文原文与 bbox，锚点失效会显式警示。
          </p>

          <div class="anno-list-block">
            <p class="side-title">
              批注（{{ annotationsQuery.data.value?.length ?? 0 }}）
            </p>
            <p
              v-if="annotationsQuery.isError.value"
              class="mini-error"
              role="alert"
            >
              {{ annotationsQuery.error.value?.message }}
            </p>
            <ul class="anno-list">
              <li
                v-for="a in annotationsQuery.data.value ?? []"
                :key="a.id"
                class="anno"
                :class="{ broken: a.anchor_status === 'needs_reanchor' }"
              >
                <p
                  v-if="a.anchor_status === 'needs_reanchor'"
                  class="anchor-warn"
                  role="alert"
                >
                  <TriangleAlert :size="11" />
                  锚点已失效，按引文哈希回退展示
                </p>
                <blockquote class="quote">
                  “{{ a.quoted_text.slice(0, 100) }}{{ a.quoted_text.length > 100 ? '…' : '' }}”
                </blockquote>
                <p
                  v-if="a.comment"
                  class="anno-comment"
                >
                  {{ a.comment }}
                </p>
                <div class="anno-foot">
                  <span>p{{ a.page_index ?? '?' }} · {{ new Date(a.created_at).toLocaleDateString('zh-CN') }}</span>
                  <button
                    type="button"
                    class="icon-btn"
                    :aria-label="`删除批注 ${a.id}`"
                    @click="removeAnnotation(a.id)"
                  >
                    <Trash2 :size="12" />
                  </button>
                </div>
              </li>
            </ul>
            <p
              v-if="(annotationsQuery.data.value?.length ?? 0) === 0 && !annotationsQuery.isError.value"
              class="empty-hint"
            >
              暂无批注。
            </p>
          </div>

          <div class="notes-block">
            <p class="side-title">
              <NotebookPen :size="13" />
              笔记（{{ notesQuery.data.value?.length ?? 0 }}）
            </p>
            <form
              class="note-form"
              @submit.prevent="saveNote"
            >
              <textarea
                v-model="noteDraft"
                rows="2"
                placeholder="写下随读笔记…"
                aria-label="笔记内容"
              />
              <button
                type="submit"
                class="btn"
                :disabled="!noteDraft.trim() || createNoteMutation.isPending.value"
              >
                保存笔记
              </button>
            </form>
            <p
              v-if="noteError"
              class="mini-error"
              role="alert"
            >
              {{ noteError }}
            </p>
            <ul class="note-list">
              <li
                v-for="n in notesQuery.data.value ?? []"
                :key="n.id"
                class="note"
              >
                {{ n.content }}
              </li>
            </ul>
          </div>
        </template>
        <TranslationPane
          v-else
          :item-id="itemId"
          :active="readMode === 'translate'"
          @locate-block="locateTranslationBlock"
        />
      </aside>
    </div>
  </div>
</template>

<style scoped>
.page.reading {
  max-width: 1460px;
  margin: 0 auto;
}
.page-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}
.title-wrap {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}
.mode-switch {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: flex-end;
}
.title-wrap h1 {
  font-size: var(--font-size-2xl);
  margin: 0 0 4px;
}
.title-wrap p {
  margin: 0;
  color: var(--text-muted);
  font-size: var(--font-size-sm);
}
.reader-grid {
  display: grid;
  /* minmax(0,1fr)：防止 857px 宽的 PDF 页把布局视口撑破（390px 端点击错位） */
  grid-template-columns: minmax(0, 1fr) 300px;
  gap: 12px;
  align-items: start;
}
.pdf-pane {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 14px;
  min-height: 560px;
}
.pages {
  display: grid;
  gap: 16px;
  overflow-x: auto;
}
.page-wrap {
  position: relative;
  margin: 0 auto;
  box-shadow: 0 1px 4px rgba(15, 32, 52, 0.12);
}
.canvas-host {
  position: relative;
}
.text-host {
  position: absolute;
  inset: 0;
  overflow: hidden;
  transform-origin: 0 0;
}
.text-host :deep(span) {
  transform: scale(1);
}
.evidence-highlight {
  position: absolute;
  background: rgba(240, 173, 78, 0.35);
  border: 1.5px solid #b97f1c;
  border-radius: 3px;
  pointer-events: none;
  z-index: 5;
}
.page-num {
  position: sticky;
  bottom: 6px;
  float: right;
  font-size: var(--font-size-xs);
  color: var(--text-muted);
  background: var(--surface);
  padding: 1px 7px;
  border-radius: 999px;
  border: 1px solid var(--border);
}
.side-pane {
  display: grid;
  gap: 12px;
  align-content: start;
}
.hint,
.empty-hint {
  margin: 0;
  color: var(--text-muted);
  font-size: var(--font-size-xs);
}
.side-title {
  margin: 0 0 6px;
  font-size: var(--font-size-xs);
  font-weight: 800;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: 5px;
}
.draft,
.anno-list-block,
.notes-block {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 10px;
}
.quote {
  margin: 0 0 6px;
  padding: 5px 9px;
  border-left: 3px solid var(--primary);
  background: var(--subtle-bg);
  border-radius: 0 6px 6px 0;
  font-size: var(--font-size-xs);
  color: var(--text);
}
.draft textarea,
.note-form textarea {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: 7px;
  padding: 6px 9px;
  font-size: var(--font-size-xs);
  font-family: inherit;
  resize: vertical;
}
.draft-actions {
  display: flex;
  gap: 7px;
  margin-top: 7px;
}
.anno-list,
.note-list {
  list-style: none;
  margin: 6px 0 0;
  padding: 0;
  display: grid;
  gap: 7px;
}
.anno {
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 7px 9px;
}
.anno.broken {
  border-color: #ead29e;
  background: var(--warning-bg);
}
.anchor-warn {
  margin: 0 0 5px;
  display: flex;
  align-items: center;
  gap: 4px;
  color: #92400e;
  font-size: var(--font-size-xs);
  font-weight: 800;
}
.anno-comment {
  margin: 4px 0 0;
  font-size: var(--font-size-xs);
}
.anno-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 5px;
  font-size: 10px;
  color: var(--text-muted);
}
.note-form {
  display: grid;
  gap: 6px;
}
.note {
  border-top: 1px solid var(--border);
  padding-top: 6px;
  font-size: var(--font-size-xs);
  white-space: pre-wrap;
}
.mini-error {
  margin: 6px 0 0;
  color: var(--danger);
  font-size: var(--font-size-xs);
  font-weight: 650;
}
.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
}
.icon-btn:hover {
  background: var(--subtle-bg);
  color: var(--danger);
}
.btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-height: 32px;
  padding: 5px 11px;
  border: 1px solid var(--border);
  border-radius: 7px;
  background: var(--surface);
  font-weight: 650;
  font-size: var(--font-size-sm);
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
@media (max-width: 1080px) {
  .reader-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
