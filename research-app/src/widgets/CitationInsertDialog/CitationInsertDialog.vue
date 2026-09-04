<script setup lang="ts">
/**
 * 引用插入弹窗（TC-F04-03 / GJ4-02-F）：
 * 候选仅来自已核验 CitationRecord（CR-F3-04）；插入 \cite{key} 并更新 references.bib。
 * 红线：不能自由生成 \cite key；未核验条目不出现。
 */
import { ref, computed, watch } from 'vue';
import { Search, Plus, Check, TriangleAlert } from 'lucide-vue-next';
import { useCitationCandidates, useInsertCitation } from '@features/writing/queries';
import Skeleton from '@shared/ui/Skeleton.vue';
import Boundary from '@shared/ui/Boundary.vue';
import { useDialogA11y } from '@shared/lib/use-dialog-a11y';

const props = defineProps<{ open: boolean; manuscriptId: string }>();
const emit = defineEmits<{ close: []; inserted: [citationKey: string] }>();

const dialogRoot = ref<HTMLDivElement | null>(null);
const searchInput = ref<HTMLInputElement | null>(null);
useDialogA11y(dialogRoot, computed(() => props.open), () => emit('close'), () => searchInput.value);

const candidatesQuery = useCitationCandidates(computed(() => props.manuscriptId));
const insertMutation = useInsertCitation(computed(() => props.manuscriptId));

const q = ref('');
const filtered = computed(() => {
  const list = candidatesQuery.data.value ?? [];
  const kw = q.value.trim().toLowerCase();
  if (!kw) return list;
  return list.filter((c) => c.title.toLowerCase().includes(kw) || c.authors.some((a) => a.toLowerCase().includes(kw)));
});
const insertError = ref<string | null>(null);

watch(
  () => props.open,
  (open) => {
    if (open) {
      q.value = '';
      insertError.value = null;
    }
  },
);

async function insert(itemId: string): Promise<void> {
  insertError.value = null;
  try {
    const res = await insertMutation.mutateAsync(itemId);
    emit('inserted', res.citation_key);
    emit('close');
  } catch (err) {
    insertError.value = err instanceof Error ? err.message : '引用插入失败。';
  }
}
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
        aria-label="插入引用"
      >
        <header class="head">
          <h2>插入引用（仅已核验文献）</h2>
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
            @submit.prevent
          >
            <input
              ref="searchInput"
              v-model="q"
              type="search"
              placeholder="按题名 / 作者筛选"
              aria-label="筛选引用候选"
            >
            <Search
              :size="14"
              class="search-ico"
            />
          </form>

          <Skeleton
            v-if="candidatesQuery.isPending.value"
            label="引用候选加载中"
          />
          <Boundary
            v-else-if="candidatesQuery.isError.value"
            tone="danger"
            title="引用候选加载失败"
          >
            {{ candidatesQuery.error.value?.message }}
          </Boundary>
          <p
            v-else-if="filtered.length === 0"
            class="empty"
          >
            暂无已核验引用候选。请先在文献库导入并核验文献。
          </p>
          <ul
            v-else
            class="cand-list"
          >
            <li
              v-for="c in filtered"
              :key="c.item_id"
              class="cand"
            >
              <div class="cand-main">
                <p class="cand-title">
                  {{ c.title }}
                  <TriangleAlert
                    v-if="c.already_in_bib"
                    :size="12"
                    class="in-bib"
                    aria-label="已在 references.bib 中"
                  />
                </p>
                <p class="cand-meta">
                  {{ c.authors.slice(0, 2).join(', ') }}{{ c.authors.length > 2 ? ' 等' : '' }} · {{ c.year ?? '—' }}
                  <template v-if="c.venue">
                    · {{ c.venue }}
                  </template>
                </p>
                <p class="cand-key">
                  <code>\cite{{ '{' }}{{ c.citation_key }}{{ '}' }}</code>
                  <span v-if="c.already_in_bib">（已存在）</span>
                </p>
              </div>
              <button
                type="button"
                class="btn primary"
                :disabled="insertMutation.isPending.value"
                :aria-label="`插入 ${c.title}`"
                @click="insert(c.item_id)"
              >
                <Check :size="13" />
                插入
              </button>
            </li>
          </ul>
          <p
            v-if="insertError"
            class="mini-error"
            role="alert"
          >
            {{ insertError }}
          </p>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(23, 43, 77, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
  padding: 16px;
}
.dialog {
  background: var(--app-bg);
  border: 1px solid var(--border);
  border-radius: 12px;
  width: 560px;
  max-width: 100%;
  max-height: 78vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 18px 48px rgba(23, 43, 77, 0.18);
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
  font-size: var(--font-size-base);
}
.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--surface);
  color: var(--text-muted);
  cursor: pointer;
}
.body {
  padding: 12px 16px 16px;
  overflow: auto;
  display: grid;
  gap: 10px;
}
.search-bar {
  position: relative;
}
.search-bar input {
  width: 100%;
  min-height: 34px;
  padding: 5px 10px 5px 32px;
  border: 1px solid var(--border);
  border-radius: 7px;
  font-size: var(--font-size-sm);
}
.search-ico {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
}
.empty {
  margin: 0;
  color: var(--text-muted);
  font-size: var(--font-size-xs);
}
.cand-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 8px;
}
.cand {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 9px 11px;
  background: var(--surface);
}
.cand-main {
  flex: 1;
  min-width: 0;
}
.cand-title {
  margin: 0 0 3px;
  font-weight: 700;
  font-size: var(--font-size-sm);
  display: flex;
  align-items: center;
  gap: 5px;
}
.in-bib {
  color: var(--warning);
  flex-shrink: 0;
}
.cand-meta {
  margin: 0;
  font-size: var(--font-size-xs);
  color: var(--text-muted);
}
.cand-key {
  margin: 4px 0 0;
  font-size: var(--font-size-xs);
}
.cand-key code {
  font-family: var(--mono);
  background: var(--subtle-bg);
  padding: 1px 6px;
  border-radius: 5px;
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
  cursor: pointer;
}
.btn.primary {
  background: var(--primary);
  border-color: var(--primary);
  color: #fff;
}
.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.mini-error {
  margin: 0;
  color: var(--danger);
  font-size: var(--font-size-xs);
  font-weight: 650;
}
</style>
