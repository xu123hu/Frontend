<script setup lang="ts">
/**
 * 文献库三栏浏览器（Zotero 式心智：集合 / 条目 / 详情）。
 *
 * - 集合栏：全部条目 + 集合（计数来自服务端）+ 新建集合；标签筛选来自已加载条目。
 * - 条目列表：游标分页 + 虚拟滚动（TC-F02-10 万级条目）；核验/版本状态负向展示。
 * - 批量：勾选 → 打标签/移入集合/删除；加标签与移集合可撤销（TC-F02-11），删除需二次确认不可撤销。
 * - 详情：元数据、全文可得性（TC-F02-12 不渲染假页面）、切分确认列表（TC-F02-07）、打开阅读。
 * 状态六层：骨架/空/错误可重试/成功；无静默降级。
 */
import { computed, ref, watch, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { useVirtualizer } from '@tanstack/vue-virtual';
import { Search, Trash2, BookOpen, Undo2, FolderPlus, Layers } from 'lucide-vue-next';
import Skeleton from '@shared/ui/Skeleton.vue';
import Boundary from '@shared/ui/Boundary.vue';
import EmptyState from '@shared/ui/EmptyState.vue';
import {
  useCollections,
  useCreateCollection,
  useLiteratureItemsInfinite,
  useLiteratureItem,
  useChunks,
  useConfirmChunks,
  useBatchItems,
  useDeleteItem,
  useAddToCollection,
  useRemoveFromCollection,
  literatureKeys,
} from '@features/literature/queries';
import { useQueryClient } from '@tanstack/vue-query';
import type { LitItem } from '@entities/literature/types';

const props = defineProps<{ projectId: string }>();
const emit = defineEmits<{ openSearch: []; openImport: [] }>();

const router = useRouter();
const queryClient = useQueryClient();

// ---------- 集合栏 ----------
const collectionsQuery = useCollections(props.projectId);
const collections = computed(() => collectionsQuery.data.value ?? []);
const activeCollection = ref<string>('all');
const activeTag = ref<string | null>(null);
const newCollectionName = ref('');
const createCollectionMutation = useCreateCollection(props.projectId);
const collectionError = ref<string | null>(null);

async function submitCollection(): Promise<void> {
  const name = newCollectionName.value.trim();
  if (!name) return;
  collectionError.value = null;
  try {
    await createCollectionMutation.mutateAsync(name);
    newCollectionName.value = '';
  } catch (err) {
    collectionError.value = err instanceof Error ? err.message : '集合创建失败。';
  }
}

// ---------- 条目列表（无限查询 + 虚拟滚动） ----------
const searchQ = ref('');
const searchDebounced = ref('');
let searchTimer: ReturnType<typeof setTimeout> | undefined;
watch(searchQ, (v) => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    searchDebounced.value = v.trim();
  }, 250);
});

const filters = computed(() => ({
  collection_id: activeCollection.value !== 'all' ? activeCollection.value : undefined,
  tag: activeTag.value ?? undefined,
  q: searchDebounced.value || undefined,
  limit: 200,
}));
const itemsQuery = useLiteratureItemsInfinite(() => props.projectId, filters);
const items = computed<LitItem[]>(() => itemsQuery.data.value?.pages.flatMap((p) => p.items) ?? []);

const listScrollRef = ref<HTMLElement | null>(null);
const rowVirtualizer = useVirtualizer(
  computed(() => ({
    count: items.value.length,
    getScrollElement: () => listScrollRef.value,
    estimateSize: () => 84,
    overscan: 10,
  })),
);
const totalSize = computed(() => rowVirtualizer.value.getTotalSize());
const virtualRows = computed(() => rowVirtualizer.value.getVirtualItems());

/**
 * virtual-core 3.17.8 缺陷规避（TC-F02-10 首行丢失）：
 * 初始 ResizeObserver 测量批次会级联触发 applyScrollAdjustment（每行
 * correction +84），把内部 scrollOffset 漂移到 ~totalSize，而真实
 * scrollTop 仍为 0 —— 窗口 startIndex 被钳到末尾，index 0 永久不渲染
 * （首行消失、顶部留空槽，desktop 复现）。该库的
 * shouldAdjustScrollPositionOnItemSizeChange 选项在 d.ts 中声明、
 * resizeItem 中按 this.* 读取，但构造器/setOptions 均未从 options 赋值，
 * 传入形同虚设，故只能在外部把内部状态拉回真实值：派发 scroll 事件让
 * observeElementOffset 重读 scrollTop。
 */
function resyncVirtualizerOffset(): void {
  // 双 rAF：等待本帧 ResizeObserver 测量/修正批次全部落盘后再同步。
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      listScrollRef.value?.dispatchEvent(new Event('scroll'));
    });
  });
}

watch(
  () => items.value.length,
  (n) => {
    if (n > 0) resyncVirtualizerOffset();
  },
);

function onListScroll(): void {
  const el = listScrollRef.value;
  if (!el) return;
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 400) {
    if (itemsQuery.hasNextPage.value && !itemsQuery.isFetchingNextPage.value) void itemsQuery.fetchNextPage();
  }
}

// ---------- 选择与批量 ----------
const selectedIds = ref<Set<string>>(new Set());
const detailId = ref<string | null>(null);
const allSelected = computed(() => items.value.length > 0 && items.value.every((i) => selectedIds.value.has(i.id)));

function toggleSelect(id: string): void {
  const next = new Set(selectedIds.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  selectedIds.value = next;
}
function toggleSelectAll(): void {
  selectedIds.value = allSelected.value ? new Set() : new Set(items.value.map((i) => i.id));
}

const batchMutation = useBatchItems();
const undoAction = ref<(() => void) | null>(null);
const undoMessage = ref<string | null>(null);
const batchError = ref<string | null>(null);
const confirmDelete = ref(false);

function resetUndo(): void {
  undoAction.value = null;
  undoMessage.value = null;
}

async function runBatch(tag?: string, collectionId?: string): Promise<void> {
  const ids = [...selectedIds.value];
  if (ids.length === 0) return;
  batchError.value = null;
  resetUndo();
  try {
    if (tag) {
      const res = await batchMutation.mutateAsync({ action: 'add_tag', item_ids: ids, tag });
      undoMessage.value = `已为 ${res.affected} 个条目添加标签「${tag}」`;
      undoAction.value = () => void batchMutation.mutateAsync({ action: 'remove_tag', item_ids: ids, tag });
    } else if (collectionId) {
      const res = await batchMutation.mutateAsync({ action: 'move_collection', item_ids: ids, collection_id: collectionId });
      undoMessage.value = `已将 ${res.affected} 个条目移入集合`;
      undoAction.value = () => {
        for (const id of ids) void removeMutation.mutateAsync({ collectionId, itemId: id });
      };
    }
  } catch (err) {
    batchError.value = err instanceof Error ? err.message : '批量操作失败。';
  }
}

const removeMutation = useRemoveFromCollection();

async function batchDelete(): Promise<void> {
  const ids = [...selectedIds.value];
  if (ids.length === 0) return;
  batchError.value = null;
  resetUndo();
  try {
    const res = await batchMutation.mutateAsync({ action: 'delete', item_ids: ids });
    undoMessage.value = `已删除 ${res.affected} 个条目（不可撤销）`;
    selectedIds.value = new Set();
  } catch (err) {
    batchError.value = err instanceof Error ? err.message : '批量删除失败。';
  } finally {
    confirmDelete.value = false;
  }
}

function undo(): void {
  undoAction.value?.();
  resetUndo();
}

const undoTimer = ref<ReturnType<typeof setTimeout> | undefined>(undefined);
watch(undoMessage, (m) => {
  clearTimeout(undoTimer.value);
  if (m) undoTimer.value = setTimeout(resetUndo, 8000);
});

// ---------- 详情 ----------
const detailQuery = useLiteratureItem(computed(() => detailId.value ?? ''));
const chunksQuery = useChunks(computed(() => detailId.value ?? ''));
const confirmChunksMutation = useConfirmChunks(computed(() => detailId.value ?? ''));
const deleteItemMutation = useDeleteItem();
const addToCollectionMutation = useAddToCollection();
const itemError = ref<string | null>(null);
const confirmItemDelete = ref(false);
const chunks = computed(() => chunksQuery.data.value ?? []);
const unconfirmedCount = computed(() => chunks.value.filter((c) => !c.confirmed).length);

const BLOCK_TYPE_LABELS: Record<string, string> = {
  heading: '标题',
  paragraph: '段落',
  display_math: '公式块',
  inline_math: '行内公式',
  figure: '图',
  table: '表',
  caption: '题注',
  citation: '引文',
  footnote: '脚注',
  code: '代码',
};
const VERIFICATION_LABELS: Record<string, string> = {
  verified_exact: '已核验（精确）',
  verified_fuzzy: '已核验（模糊）',
  conflicting: '核验冲突',
  not_found: '未检索到',
  source_unavailable: '源不可用',
  local_only: '仅本地',
};
const RIGHTS_LABELS: Record<string, string> = {
  open: '开放获取',
  licensed: '已授权',
  user_provided: '用户提供',
  metadata_only: '仅元数据',
  restricted: '受限',
  unknown: '未知',
};
const FULL_TEXT_LABELS: Record<string, string> = {
  available: '全文可得',
  metadata_only: '仅元数据（无全文，不渲染假页面）',
  restricted: '权限受限（无全文）',
  unknown: '全文状态未知',
};
const VERSION_WARN: Record<string, string> = {
  retracted: '已撤稿',
  expression_of_concern: '编辑关注',
  updated: '有更新版本',
};

async function confirmAllChunks(): Promise<void> {
  if (!detailId.value) return;
  itemError.value = null;
  try {
    await confirmChunksMutation.mutateAsync({ all: true });
  } catch (err) {
    itemError.value = err instanceof Error ? err.message : '入库确认失败。';
  }
}

async function confirmChunk(blockId: string): Promise<void> {
  if (!detailId.value) return;
  itemError.value = null;
  try {
    await confirmChunksMutation.mutateAsync({ block_ids: [blockId] });
  } catch (err) {
    itemError.value = err instanceof Error ? err.message : '入库确认失败。';
  }
}

async function removeItem(): Promise<void> {
  if (!detailId.value) return;
  itemError.value = null;
  try {
    await deleteItemMutation.mutateAsync(detailId.value);
    detailId.value = null;
    confirmItemDelete.value = false;
  } catch (err) {
    itemError.value = err instanceof Error ? err.message : '删除失败。';
  }
}

async function joinCollection(collectionId: string): Promise<void> {
  if (!detailId.value) return;
  itemError.value = null;
  try {
    await addToCollectionMutation.mutateAsync({ collectionId, itemId: detailId.value });
  } catch (err) {
    itemError.value = err instanceof Error ? err.message : '加入集合失败。';
  }
}

function openReading(item: LitItem): void {
  if (item.full_text_availability !== 'available' || !item.pdf_artifact_id) return; // 无全文不给假页面
  void router.push({ name: 'reading', params: { id: item.id } });
}

// 详情打开时滚动锁紧（虚拟列表内 checkbox 不受影响）
watch(detailId, async (id) => {
  if (id) {
    await nextTick();
    queryClient.invalidateQueries({ queryKey: literatureKeys.item(id) });
  }
});

const allTags = computed(() => {
  const set = new Set<string>();
  for (const item of items.value) for (const t of item.tags) set.add(t);
  return [...set].slice(0, 24);
});

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric' }).format(new Date(iso));
  } catch {
    return iso;
  }
}
</script>

<template>
  <div class="browser">
    <!-- 集合栏 -->
    <aside
      class="pane side"
      aria-label="集合与标签"
    >
      <button
        type="button"
        class="col-item"
        :class="{ active: activeCollection === 'all' && !activeTag }"
        @click="activeCollection = 'all'; activeTag = null"
      >
        <Layers :size="14" />
        <span>全部条目</span>
      </button>

      <Skeleton
        v-if="collectionsQuery.isPending.value"
        label="集合加载中"
      />
      <Boundary
        v-else-if="collectionsQuery.isError.value"
        tone="danger"
        title="集合加载失败"
      >
        {{ collectionsQuery.error.value?.message }}
      </Boundary>
      <template v-else>
        <button
          v-for="col in collections"
          :key="col.id"
          type="button"
          class="col-item"
          :class="{ active: activeCollection === col.id }"
          @click="activeCollection = col.id; activeTag = null"
        >
          <span class="col-name">{{ col.name }}</span>
          <span class="col-count">{{ col.item_count }}</span>
        </button>
      </template>

      <form
        class="new-col"
        @submit.prevent="submitCollection"
      >
        <input
          v-model="newCollectionName"
          type="text"
          placeholder="新建集合…"
          aria-label="新集合名称"
        >
        <button
          type="submit"
          class="icon-btn"
          :disabled="!newCollectionName.trim() || createCollectionMutation.isPending.value"
          aria-label="创建集合"
        >
          <FolderPlus :size="14" />
        </button>
      </form>
      <p
        v-if="collectionError"
        class="mini-error"
        role="alert"
      >
        {{ collectionError }}
      </p>

      <div
        v-if="allTags.length > 0"
        class="tag-block"
      >
        <p class="side-title">
          标签（当前已加载条目）
        </p>
        <div class="tag-cloud">
          <button
            v-for="t in allTags"
            :key="t"
            type="button"
            class="tag-chip"
            :class="{ active: activeTag === t }"
            @click="activeTag = activeTag === t ? null : t"
          >
            {{ t }}
          </button>
        </div>
      </div>
    </aside>

    <!-- 条目列表 -->
    <section
      class="pane mid"
      aria-label="条目列表"
    >
      <div class="list-toolbar">
        <div class="search-wrap">
          <Search
            :size="14"
            class="search-icon"
          />
          <input
            v-model="searchQ"
            type="search"
            placeholder="在库内检索题名 / 作者"
            aria-label="库内检索"
          >
        </div>
        <label class="select-all">
          <input
            type="checkbox"
            :checked="allSelected"
            aria-label="全选当前列表"
            @change="toggleSelectAll"
          >
          全选
        </label>
      </div>

      <div
        v-if="selectedIds.size > 0"
        class="batch-bar"
        role="toolbar"
        aria-label="批量操作"
      >
        <span class="batch-count">已选 {{ selectedIds.size }}</span>
        <button
          type="button"
          class="mini-btn"
          @click="runBatch('重点')"
        >
          打标签「重点」
        </button>
        <select
          aria-label="移入集合"
          @change="runBatch(undefined, ($event.target as HTMLSelectElement).value || undefined); ($event.target as HTMLSelectElement).value = ''"
        >
          <option value="">
            移入集合…
          </option>
          <option
            v-for="col in collections"
            :key="col.id"
            :value="col.id"
          >
            {{ col.name }}
          </option>
        </select>
        <button
          v-if="!confirmDelete"
          type="button"
          class="mini-btn danger"
          @click="confirmDelete = true"
        >
          <Trash2 :size="12" />
          删除
        </button>
        <template v-else>
          <button
            type="button"
            class="mini-btn danger"
            @click="batchDelete"
          >
            确认删除 {{ selectedIds.size }} 项
          </button>
          <button
            type="button"
            class="mini-btn"
            @click="confirmDelete = false"
          >
            取消
          </button>
        </template>
      </div>

      <div
        v-if="undoMessage"
        class="undo-bar"
        role="status"
      >
        <span>{{ undoMessage }}</span>
        <button
          v-if="undoAction"
          type="button"
          class="mini-btn"
          @click="undo"
        >
          <Undo2 :size="12" />
          撤销
        </button>
      </div>
      <p
        v-if="batchError"
        class="mini-error padded"
        role="alert"
      >
        {{ batchError }}
      </p>

      <div
        ref="listScrollRef"
        class="list-scroll"
        @scroll.passive="onListScroll"
      >
        <Skeleton
          v-if="itemsQuery.isPending.value"
          label="条目列表加载中"
        />
        <Boundary
          v-else-if="itemsQuery.isError.value"
          tone="danger"
          title="条目列表加载失败"
        >
          {{ itemsQuery.error.value?.message }}
          <button
            class="retry"
            type="button"
            @click="itemsQuery.refetch()"
          >
            重试
          </button>
        </Boundary>
        <EmptyState
          v-else-if="items.length === 0"
          title="还没有文献条目"
          hint="通过三源检索导入，或批量上传 PDF 建立个人文献库。"
        >
          <div class="empty-actions">
            <button
              type="button"
              class="btn"
              @click="emit('openSearch')"
            >
              检索文献
            </button>
            <button
              type="button"
              class="btn primary"
              @click="emit('openImport')"
            >
              批量导入 PDF
            </button>
          </div>
        </EmptyState>
        <div
          v-else
          class="virtual-body"
          :style="{ height: `${totalSize}px` }"
        >
          <div
            v-for="row in virtualRows"
            :key="items[row.index]!.id"
            :ref="(el) => rowVirtualizer.measureElement(el as HTMLElement)"
            :data-index="row.index"
            class="virtual-row"
            :style="{ transform: `translateY(${row.start}px)` }"
          >
            <div
              class="item-card"
              :class="{ selected: detailId === items[row.index]!.id }"
              role="button"
              tabindex="0"
              @click="detailId = items[row.index]!.id"
              @keydown.enter="detailId = items[row.index]!.id"
            >
              <input
                type="checkbox"
                :checked="selectedIds.has(items[row.index]!.id)"
                :aria-label="`选择 ${items[row.index]!.title}`"
                @click.stop
                @change="toggleSelect(items[row.index]!.id)"
              >
              <div class="item-main">
                <p class="item-title">
                  {{ items[row.index]!.title }}
                  <span
                    v-if="VERSION_WARN[items[row.index]!.version_status]"
                    class="warn-chip"
                  >{{ VERSION_WARN[items[row.index]!.version_status] }}</span>
                </p>
                <p class="item-meta">
                  {{ items[row.index]!.authors.slice(0, 2).join(', ') }}{{ items[row.index]!.authors.length > 2 ? ' 等' : '' }}
                  <template v-if="items[row.index]!.year">
                    · {{ items[row.index]!.year }}
                  </template>
                  <template v-if="items[row.index]!.venue">
                    · {{ items[row.index]!.venue }}
                  </template>
                </p>
                <p class="item-sub">
                  <span class="verif">{{ VERIFICATION_LABELS[items[row.index]!.verification] }}</span>
                  <span
                    v-for="t in items[row.index]!.tags.slice(0, 3)"
                    :key="t"
                    class="tag-chip mini"
                  >{{ t }}</span>
                  <span class="date">{{ formatDate(items[row.index]!.updated_at) }}</span>
                </p>
              </div>
            </div>
          </div>
        </div>
        <p
          v-if="itemsQuery.isFetchingNextPage.value"
          class="loading-more"
          role="status"
        >
          正在加载更多…
        </p>
      </div>
    </section>

    <!-- 详情栏 -->
    <aside
      class="pane detail"
      aria-label="条目详情"
    >
      <template v-if="detailId">
        <Skeleton
          v-if="detailQuery.isPending.value"
          label="详情加载中"
        />
        <Boundary
          v-else-if="detailQuery.isError.value"
          tone="danger"
          title="详情加载失败"
        >
          {{ detailQuery.error.value?.message }}
        </Boundary>
        <template v-else-if="detailQuery.data.value">
          <div class="detail-head">
            <h3>{{ detailQuery.data.value.title }}</h3>
            <div class="detail-actions">
              <button
                v-if="detailQuery.data.value.full_text_availability === 'available' && detailQuery.data.value.pdf_artifact_id"
                type="button"
                class="btn primary"
                @click="openReading(detailQuery.data.value!)"
              >
                <BookOpen :size="14" />
                阅读全文
              </button>
              <button
                type="button"
                class="btn"
                :class="{ 'confirming': confirmItemDelete }"
                @click="confirmItemDelete ? removeItem() : (confirmItemDelete = true)"
              >
                <Trash2 :size="14" />
                {{ confirmItemDelete ? '确认删除？' : '删除' }}
              </button>
            </div>
          </div>

          <p
            v-if="VERSION_WARN[detailQuery.data.value.version_status]"
            class="warn-banner"
            role="alert"
          >
            {{ VERSION_WARN[detailQuery.data.value.version_status] }}：引用前请核实版本。
          </p>
          <p
            v-if="itemError"
            class="mini-error"
            role="alert"
          >
            {{ itemError }}
          </p>

          <dl class="meta-list">
            <dt>作者</dt>
            <dd>{{ detailQuery.data.value.authors.join('、') || '—' }}</dd>
            <dt>年份 / 出处</dt>
            <dd>{{ detailQuery.data.value.year ?? '—' }} · {{ detailQuery.data.value.venue ?? '—' }}</dd>
            <dt>标识</dt>
            <dd><code>{{ detailQuery.data.value.source_identifier.scheme }}:{{ detailQuery.data.value.source_identifier.value }}</code></dd>
            <dt>核验状态</dt>
            <dd>{{ VERIFICATION_LABELS[detailQuery.data.value.verification] }}</dd>
            <dt>权利状态</dt>
            <dd>{{ RIGHTS_LABELS[detailQuery.data.value.rights_status] }}</dd>
            <dt>全文</dt>
            <dd :class="{ 'no-fulltext': detailQuery.data.value.full_text_availability !== 'available' }">
              {{ FULL_TEXT_LABELS[detailQuery.data.value.full_text_availability] }}
            </dd>
          </dl>

          <div
            v-if="detailQuery.data.value.tags.length > 0"
            class="detail-tags"
          >
            <span
              v-for="t in detailQuery.data.value.tags"
              :key="t"
              class="tag-chip mini"
            >{{ t }}</span>
          </div>

          <div class="join-block">
            <p class="side-title">
              加入集合
            </p>
            <div class="join-chips">
              <button
                v-for="col in collections"
                :key="col.id"
                type="button"
                class="tag-chip"
                :class="{ joined: detailQuery.data.value.collection_ids.includes(col.id) }"
                :disabled="detailQuery.data.value.collection_ids.includes(col.id)"
                @click="joinCollection(col.id)"
              >
                {{ col.name }}{{ detailQuery.data.value.collection_ids.includes(col.id) ? ' ✓' : '' }}
              </button>
            </div>
          </div>

          <div class="chunks-block">
            <p class="side-title">
              切分结果（{{ chunks.length }}）
              <button
                v-if="unconfirmedCount > 0"
                type="button"
                class="mini-btn"
                :disabled="confirmChunksMutation.isPending.value"
                @click="confirmAllChunks"
              >
                全部确认入库
              </button>
            </p>
            <Skeleton
              v-if="chunksQuery.isPending.value"
              label="切分结果加载中"
            />
            <p
              v-else-if="chunks.length === 0"
              class="empty-hint"
            >
              暂无切分结果（条目经批量导入解析后生成）。
            </p>
            <ul
              v-else
              class="chunk-list"
            >
              <li
                v-for="c in chunks"
                :key="c.block_id"
                class="chunk"
                :class="{ suspect: c.integrity === 'suspect' }"
              >
                <div class="chunk-head">
                  <span class="chunk-type">{{ BLOCK_TYPE_LABELS[c.type] ?? c.type }}</span>
                  <span class="chunk-page">p{{ c.page_index ?? '?' }}</span>
                  <span
                    v-if="c.integrity === 'suspect'"
                    class="warn-chip"
                  >完整性可疑</span>
                  <span
                    class="chunk-state"
                    :class="{ done: c.confirmed }"
                  >{{ c.confirmed ? '已入库' : '未确认' }}</span>
                  <button
                    v-if="!c.confirmed"
                    type="button"
                    class="mini-btn"
                    @click="confirmChunk(c.block_id)"
                  >
                    确认
                  </button>
                </div>
                <p
                  v-if="c.latex"
                  class="chunk-latex"
                >
                  <code>{{ c.latex }}</code>
                </p>
                <p
                  v-else-if="c.text"
                  class="chunk-text"
                >
                  {{ c.text }}
                </p>
                <p class="chunk-hash">
                  hash: {{ c.content_hash }}
                </p>
              </li>
            </ul>
          </div>
        </template>
      </template>
      <EmptyState
        v-else
        title="未选择条目"
        hint="点击列表中的文献查看元数据、切分结果与操作。"
      />
    </aside>
  </div>
</template>

<style scoped>
.browser {
  display: grid;
  grid-template-columns: 210px minmax(0, 1fr) 320px;
  gap: 12px;
  align-items: stretch;
  min-height: 480px;
  /* 高度必须受视口约束：否则 .list-scroll 随内容撑开永不溢出，
     虚拟滚动退化成全量渲染（TC-F02-10 万级条目红线）。 */
  height: calc(100dvh - 250px);
}
.pane {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.side,
.detail {
  padding: 10px;
  gap: 8px;
  overflow: auto;
}
.side-title {
  margin: 0;
  font-size: var(--font-size-xs);
  font-weight: 700;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}
.col-item {
  display: flex;
  align-items: center;
  gap: 7px;
  width: 100%;
  text-align: left;
  padding: 7px 9px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  font-size: var(--font-size-sm);
  font-weight: 650;
  color: var(--text);
  cursor: pointer;
}
.col-item:hover {
  background: var(--subtle-bg);
}
.col-item.active {
  background: var(--primary-soft);
  color: var(--primary);
}
.col-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.col-count {
  font-size: var(--font-size-xs);
  color: var(--text-muted);
  font-weight: 700;
}
.new-col {
  display: flex;
  gap: 5px;
  margin-top: 4px;
}
.new-col input {
  flex: 1;
  min-width: 0;
  min-height: 30px;
  padding: 4px 8px;
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: var(--font-size-xs);
}
.tag-block {
  border-top: 1px solid var(--border);
  padding-top: 8px;
  margin-top: 4px;
}
.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 6px;
}
.tag-chip {
  padding: 2px 9px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--surface);
  font-size: var(--font-size-xs);
  font-weight: 650;
  color: var(--text);
  cursor: pointer;
}
.tag-chip.active {
  background: var(--primary-soft);
  border-color: var(--primary);
  color: var(--primary);
}
.tag-chip.mini {
  padding: 0 7px;
  cursor: default;
  background: var(--subtle-bg);
  border: 0;
}
.tag-chip.joined {
  opacity: 0.7;
  cursor: default;
}
.list-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 10px;
  border-bottom: 1px solid var(--border);
}
.search-wrap {
  position: relative;
  flex: 1;
}
.search-icon {
  position: absolute;
  left: 9px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
}
.search-wrap input {
  width: 100%;
  min-height: 32px;
  padding: 5px 10px 5px 28px;
  border: 1px solid var(--border);
  border-radius: 7px;
  font-size: var(--font-size-sm);
}
.select-all {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: var(--font-size-xs);
  color: var(--text-muted);
  font-weight: 650;
  cursor: pointer;
}
.batch-bar {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 8px 10px;
  background: var(--primary-soft);
  border-bottom: 1px solid var(--border);
  flex-wrap: wrap;
}
.batch-count {
  font-size: var(--font-size-xs);
  font-weight: 800;
  color: var(--primary);
}
.batch-bar select {
  min-height: 28px;
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: var(--font-size-xs);
  background: var(--surface);
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
  color: var(--text);
  cursor: pointer;
}
.mini-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.mini-btn.danger {
  color: var(--danger);
  border-color: var(--danger-bg);
}
.undo-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 7px 10px;
  background: var(--success-bg);
  color: var(--ailp-success-600);
  font-size: var(--font-size-xs);
  font-weight: 700;
  border-bottom: 1px solid var(--border);
}
.list-scroll {
  flex: 1;
  overflow: auto;
  position: relative;
}
.virtual-body {
  position: relative;
  width: 100%;
}
.virtual-row {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  padding: 4px 8px;
}
.item-card {
  display: flex;
  gap: 9px;
  align-items: flex-start;
  padding: 8px 10px;
  border: 1px solid var(--border);
  border-radius: 9px;
  background: var(--surface);
  cursor: pointer;
}
.item-card:hover {
  border-color: var(--primary);
}
.item-card.selected {
  border-color: var(--primary);
  background: var(--primary-soft);
}
.item-main {
  flex: 1;
  min-width: 0;
}
.item-title {
  margin: 0 0 2px;
  font-weight: 700;
  font-size: var(--font-size-sm);
  display: flex;
  align-items: center;
  gap: 6px;
  overflow: hidden;
}
.item-meta,
.item-sub {
  margin: 0;
  font-size: var(--font-size-xs);
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.item-sub {
  margin-top: 3px;
}
.verif {
  font-weight: 700;
}
.warn-chip {
  display: inline-flex;
  align-items: center;
  padding: 0 7px;
  border-radius: 999px;
  background: var(--warning-bg);
  color: var(--ailp-warning-600);
  font-size: var(--font-size-xs);
  font-weight: 800;
  flex-shrink: 0;
}
.date {
  margin-left: auto;
}
.loading-more {
  text-align: center;
  color: var(--text-muted);
  font-size: var(--font-size-xs);
  padding: 8px;
  margin: 0;
}
.empty-actions {
  display: flex;
  gap: 8px;
}
.detail-head {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.detail-head h3 {
  margin: 0;
  font-size: var(--font-size-base);
  line-height: 1.4;
}
.detail-actions {
  display: flex;
  gap: 7px;
}
.warn-banner {
  margin: 0;
  padding: 7px 9px;
  background: var(--warning-bg);
  color: var(--ailp-warning-600);
  border-radius: 7px;
  font-size: var(--font-size-xs);
  font-weight: 700;
}
.meta-list {
  display: grid;
  grid-template-columns: 76px 1fr;
  gap: 4px 8px;
  margin: 4px 0 0;
  font-size: var(--font-size-xs);
}
.meta-list dt {
  color: var(--text-muted);
  font-weight: 650;
}
.meta-list dd {
  margin: 0;
  overflow-wrap: anywhere;
}
.no-fulltext {
  color: var(--ailp-warning-600);
  font-weight: 700;
}
.detail-tags {
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
}
.join-block {
  border-top: 1px solid var(--border);
  padding-top: 8px;
}
.join-chips {
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
  margin-top: 6px;
}
.chunks-block {
  border-top: 1px solid var(--border);
  padding-top: 8px;
}
.chunk-list {
  list-style: none;
  margin: 6px 0 0;
  padding: 0;
  display: grid;
  gap: 6px;
}
.chunk {
  border: 1px solid var(--border);
  border-radius: 7px;
  padding: 6px 8px;
}
.chunk.suspect {
  border-color: var(--warning-bg);
  background: var(--warning-bg);
}
.chunk-head {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--font-size-xs);
}
.chunk-type {
  font-weight: 800;
}
.chunk-page {
  color: var(--text-muted);
}
.chunk-state {
  margin-left: auto;
  color: var(--text-muted);
  font-weight: 700;
}
.chunk-state.done {
  color: var(--ailp-success-600);
}
.chunk-latex code,
.chunk-text {
  display: block;
  margin: 4px 0 0;
  font-size: var(--font-size-xs);
  color: var(--text);
  overflow-wrap: anywhere;
}
.chunk-hash {
  margin: 3px 0 0;
  font-size: 10px;
  color: var(--text-muted);
}
.empty-hint {
  color: var(--text-muted);
  font-size: var(--font-size-xs);
  margin: 6px 0 0;
}
.mini-error {
  margin: 0;
  color: var(--danger);
  font-size: var(--font-size-xs);
  font-weight: 650;
}
.mini-error.padded {
  padding: 6px 10px;
}
.retry {
  border: 0;
  background: none;
  color: var(--primary);
  font-weight: 700;
  cursor: pointer;
  padding: 0 2px;
  text-decoration: underline;
}
.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--surface);
  color: var(--text-muted);
  cursor: pointer;
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
.btn.confirming {
  color: var(--danger);
  border-color: var(--danger-bg);
}
.btn.primary {
  background: var(--primary);
  border-color: var(--primary);
  color: #fff;
}

@media (max-width: 1080px) {
  .browser {
    grid-template-columns: 170px minmax(0, 1fr);
  }
  .detail {
    grid-column: 1 / -1;
  }
}
</style>
