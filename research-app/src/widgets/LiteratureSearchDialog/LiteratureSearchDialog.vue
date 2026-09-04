<script setup lang="ts">
/**
 * 三源检索弹窗（TC-F02-01/02）：OpenAlex + Crossref + arXiv 聚合检索。
 * - 命中区分元数据来源与全文可用性；retracted/expression_of_concern 负向醒目展示。
 * - 已在库（DOI 去重）提示；导入 409 duplicate_item 显式呈现。
 * - partial 降级：单源失败他源成功 → 标注具体哪源不可用，不静默（design §态矩阵）。
 */
import { ref, computed, watch } from 'vue';
import { Search, Plus, Check, TriangleAlert } from 'lucide-vue-next';
import {
  useLiteratureSearch,
  useCreateItemFromHit,
} from '@features/literature/queries';
import Skeleton from '@shared/ui/Skeleton.vue';
import Boundary from '@shared/ui/Boundary.vue';
import { useDialogA11y } from '@shared/lib/use-dialog-a11y';
import type { SearchHit } from '@entities/literature/types';

const props = defineProps<{ open: boolean; projectId: string }>();
const emit = defineEmits<{ close: []; added: [itemId: string] }>();

const dialogRoot = ref<HTMLDivElement | null>(null);
const queryInput = ref<HTMLInputElement | null>(null);
useDialogA11y(dialogRoot, computed(() => props.open), () => emit('close'), () => queryInput.value);

const q = ref('');
const submitted = ref('');
const sources = ref<string[]>(['crossref', 'openalex', 'arxiv']);
const simulateUnavailable = ref('');

const searchParams = computed(() => ({
  q: submitted.value,
  sources: sources.value,
  simulateUnavailable: simulateUnavailable.value || undefined,
}));
const enabled = computed(() => props.open && submitted.value.trim().length > 0);
const searchQuery = useLiteratureSearch(searchParams, enabled);

const createMutation = useCreateItemFromHit();
const addError = ref<string | null>(null);
const addedIds = ref<Set<string>>(new Set());
const idempotencyKey = ref('');

watch(
  () => props.open,
  (open) => {
    if (open) {
      q.value = '';
      submitted.value = '';
      addError.value = null;
      addedIds.value = new Set();
      simulateUnavailable.value = '';
      idempotencyKey.value = crypto.randomUUID();
    }
  },
);

function runSearch(): void {
  submitted.value = q.value.trim();
}

function toggleSource(s: string): void {
  const i = sources.value.indexOf(s);
  if (i >= 0) sources.value.splice(i, 1);
  else sources.value.push(s);
}

async function addToLibrary(hit: SearchHit): Promise<void> {
  addError.value = null;
  try {
    const item = await createMutation.mutateAsync({
      hit: {
        title: hit.title,
        authors: hit.authors,
        year: hit.year,
        venue: hit.venue,
        source_identifier: hit.source_identifier,
        rights_status: hit.rights_status,
        version_status: hit.version_status,
        has_full_text: hit.has_full_text,
        project_id: props.projectId,
      },
      idempotencyKey: idempotencyKey.value,
    });
    addedIds.value = new Set(addedIds.value).add(hit.source_identifier.value);
    emit('added', item.id);
  } catch (err) {
    addError.value = err instanceof Error ? err.message : '导入失败，请重试。';
  }
}

const VERSION_WARN: Record<string, string> = {
  retracted: '已撤稿',
  expression_of_concern: '编辑关注',
  updated: '有更新版本',
};
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
        aria-label="三源文献检索"
      >
        <header class="head">
          <h2>检索文献</h2>
          <button
            type="button"
            class="icon-btn"
            aria-label="关闭"
            @click="emit('close')"
          >
            <Plus
              :size="16"
              style="transform: rotate(45deg)"
            />
          </button>
        </header>

        <div class="body">
          <form
            class="search-bar"
            role="search"
            @submit.prevent="runSearch"
          >
            <input
              ref="queryInput"
              v-model="q"
              type="search"
              placeholder="按 DOI / 题名 / 作者检索"
              aria-label="检索关键词"
            >
            <button
              type="submit"
              class="btn primary"
            >
              <Search :size="14" />
              检索
            </button>
          </form>

          <div class="source-row">
            <button
              v-for="s in ['crossref', 'openalex', 'arxiv']"
              :key="s"
              type="button"
              class="src-chip"
              :aria-pressed="sources.includes(s)"
              @click="toggleSource(s)"
            >
              {{ s }}
            </button>
            <details class="drill">
              <summary>演练</summary>
              <label class="drill-row">
                模拟单源不可用
                <select
                  v-model="simulateUnavailable"
                  aria-label="选择要模拟不可用的数据源"
                >
                  <option value="">（不模拟）</option>
                  <option value="openalex">openalex</option>
                  <option value="crossref">crossref</option>
                  <option value="arxiv">arxiv</option>
                </select>
              </label>
            </details>
          </div>

          <Boundary
            v-if="searchQuery.data.value?.partial"
            tone="warning"
            title="部分数据源暂不可用"
          >
            {{ searchQuery.data.value.partial.unavailable_sources.join('、') }} 暂不可用（{{ searchQuery.data.value.partial.reason }}），以下为其余来源结果。可稍后重试该源。
          </Boundary>
          <p
            v-if="addError"
            class="add-error"
            role="alert"
          >
            {{ addError }}
          </p>

          <div class="results">
            <Skeleton
              v-if="searchQuery.isPending.value && enabled"
              label="检索结果加载中"
            />
            <Boundary
              v-else-if="searchQuery.isError.value"
              tone="danger"
              title="检索失败"
            >
              {{ searchQuery.error.value?.message }}
              <button
                type="button"
                class="retry"
                @click="searchQuery.refetch()"
              >
                重试
              </button>
            </Boundary>
            <p
              v-else-if="enabled && (searchQuery.data.value?.items.length ?? 0) === 0"
              class="empty"
              role="status"
            >
              没有命中的文献。可调整关键词或更换数据源。
            </p>
            <p
              v-else-if="!enabled"
              class="empty"
            >
              输入关键词开始检索；结果区分全文可得性，撤稿文献会醒目警示。
            </p>
            <ul
              v-else
              class="hit-list"
              aria-label="检索结果"
            >
              <li
                v-for="hit in searchQuery.data.value!.items"
                :key="`${hit.source}-${hit.source_identifier.value}`"
                class="hit"
              >
                <div class="hit-main">
                  <p class="hit-title">
                    {{ hit.title }}
                    <span
                      v-if="VERSION_WARN[hit.version_status]"
                      class="warn-chip"
                    >
                      <TriangleAlert :size="11" />
                      {{ VERSION_WARN[hit.version_status] }}
                    </span>
                  </p>
                  <p class="hit-meta">
                    {{ hit.authors.slice(0, 3).join(', ') }}{{ hit.authors.length > 3 ? ' 等' : '' }}
                    <template v-if="hit.year">
                      · {{ hit.year }}
                    </template>
                    <template v-if="hit.venue">
                      · {{ hit.venue }}
                    </template>
                  </p>
                  <p class="hit-tags">
                    <span class="tag src">{{ hit.source }}</span>
                    <span
                      class="tag"
                      :class="{ dim: !hit.has_full_text }"
                    >{{ hit.has_full_text ? '全文可得' : '仅元数据' }}</span>
                    <span
                      v-if="hit.rights_status !== 'open' && hit.rights_status !== 'unknown'"
                      class="tag dim"
                    >权利：{{ hit.rights_status }}</span>
                    <span
                      v-if="hit.already_in_library"
                      class="tag dup"
                    >已在库中</span>
                  </p>
                </div>
                <button
                  type="button"
                  class="btn"
                  :disabled="hit.already_in_library || addedIds.has(hit.source_identifier.value) || createMutation.isPending.value"
                  @click="addToLibrary(hit)"
                >
                  <Check v-if="addedIds.has(hit.source_identifier.value)" />
                  <Plus v-else />
                  {{ addedIds.has(hit.source_identifier.value) ? '已导入' : '导入' }}
                </button>
              </li>
            </ul>
          </div>
        </div>
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
  width: min(720px, 100%);
  max-height: min(84vh, 700px);
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
  align-content: start;
}
.search-bar {
  display: flex;
  gap: 7px;
}
.search-bar input {
  flex: 1;
  min-height: 36px;
  padding: 6px 11px;
  border: 1px solid var(--border);
  border-radius: 7px;
  font-size: var(--font-size-sm);
}
.source-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.src-chip {
  padding: 3px 10px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--surface);
  font-size: var(--font-size-xs);
  font-weight: 700;
  color: var(--text-muted);
  cursor: pointer;
}
.src-chip[aria-pressed='true'] {
  background: var(--primary-soft);
  border-color: var(--primary);
  color: var(--primary);
}
.drill {
  margin-left: auto;
  font-size: var(--font-size-xs);
  color: var(--text-muted);
}
.drill summary {
  cursor: pointer;
}
.drill-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
}
.add-error {
  margin: 0;
  color: var(--danger);
  font-size: var(--font-size-sm);
}
.results {
  display: grid;
  gap: 8px;
}
.empty {
  margin: 8px 0;
  color: var(--text-muted);
  font-size: var(--font-size-sm);
}
.hit-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 8px;
}
.hit {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: 9px;
}
.hit-main {
  flex: 1;
  min-width: 0;
}
.hit-title {
  margin: 0 0 3px;
  font-weight: 700;
  font-size: var(--font-size-sm);
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.warn-chip {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  color: #92400e;
  background: var(--warning-bg);
  padding: 1px 7px;
  border-radius: 999px;
  font-size: var(--font-size-xs);
  font-weight: 700;
}
.hit-meta {
  margin: 0 0 5px;
  color: var(--text-muted);
  font-size: var(--font-size-xs);
}
.hit-tags {
  margin: 0;
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
}
.tag {
  font-size: var(--font-size-xs);
  padding: 1px 7px;
  border-radius: 999px;
  background: var(--subtle-bg);
  color: var(--text);
  font-weight: 650;
}
.tag.src {
  background: var(--primary-soft);
  color: var(--primary);
}
.tag.dim {
  color: var(--text-muted);
  background: transparent;
  border: 1px dashed var(--border);
}
.tag.dup {
  background: var(--warning-bg);
  color: #664718;
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
.btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-height: 34px;
  padding: 6px 12px;
  border: 1px solid var(--border);
  border-radius: 7px;
  background: var(--surface);
  font-weight: 650;
  color: var(--text);
  cursor: pointer;
  flex-shrink: 0;
}
.btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.btn.primary {
  background: var(--primary);
  border-color: var(--primary);
  color: #fff;
}
</style>
