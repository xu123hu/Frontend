<script setup lang="ts">
/**
 * 翻译双栏右栏（TC-F03-01..06）：发起翻译 run + 译文单元流 + 保真报告。
 * - 左原 PDF 由 Reading.vue 承担；本栏为译文卡片（block_id 回链）。
 * - 翻译 run（run_type=translation）进度/预算来自 SSE；公式原样保留（KaTeX 渲染）。
 * - 公式恢复冲突标记具体块并保留原公式（role=alert），不输出整篇成功。
 */
import { computed, ref, watch } from 'vue';
import { Languages, Loader2, MapPin, TriangleAlert } from 'lucide-vue-next';
import { useActiveTranslationRun, useTranslationUnits } from '@features/translation/queries';
import FidelityReport from '@widgets/FidelityReport/FidelityReport.vue';
import Boundary from '@shared/ui/Boundary.vue';
import katex from 'katex';

const props = defineProps<{ itemId: string; active: boolean }>();
const emit = defineEmits<{ locateBlock: [blockId: string, page: number] }>();

const { mutation, activeRunId, runQuery } = useActiveTranslationRun(() => props.itemId);
const unitsQuery = useTranslationUnits(() => props.itemId);
const run = computed(() => runQuery.data.value);

// 翻译成功后才展示译文单元与保真报告（无静态假内容）。
const showResults = computed(() => run.value?.status === 'succeeded');

const transError = ref<string | null>(null);

watch(
  () => mutation.error.value,
  (e) => {
    transError.value = e instanceof Error ? e.message : null;
  },
);

function start(): void {
  transError.value = null;
  void mutation.mutateAsync().catch(() => {
    // 错误已由 watch 呈现
  });
}

function renderLatex(src: string): string {
  try {
    return katex.renderToString(src, { throwOnError: false, displayMode: true });
  } catch {
    return `<code>${src}</code>`;
  }
}
</script>

<template>
  <div
    class="translation-pane"
    aria-label="译文与保真"
  >
    <div class="head">
      <p class="title">
        <Languages :size="13" />
        译文与保真
      </p>
      <button
        type="button"
        class="btn primary"
        :disabled="mutation.isPending.value || run?.status === 'running' || run?.status === 'queued'"
        @click="start"
      >
        <Loader2
          v-if="mutation.isPending.value"
          :size="13"
          class="spin"
        />
        {{ run?.status === 'running' || run?.status === 'queued' ? '翻译中…' : '发起翻译' }}
      </button>
    </div>

    <p
      v-if="transError"
      class="mini-error"
      role="alert"
    >
      {{ transError }}
    </p>

    <div
      v-if="run && (run.status === 'queued' || run.status === 'running')"
      class="running"
    >
      <Loader2
        :size="14"
        class="spin"
      />
      <span>{{ run.stageMessage ?? '等待服务端事件' }}{{ run.progress != null ? `（${run.progress}%）` : '' }}</span>
    </div>

    <template v-if="showResults">
      <FidelityReport :run-id="activeRunId" />

      <Boundary
        v-if="unitsQuery.isError.value"
        tone="danger"
        title="译文加载失败"
      >
        {{ unitsQuery.error.value?.message }}
      </Boundary>
      <ul
        v-else-if="(unitsQuery.data.value?.length ?? 0) > 0"
        class="units"
      >
        <li
          v-for="u in unitsQuery.data.value"
          :key="u.block_id"
          class="unit"
          :class="{ broken: u.fidelity === 'partially_translated' }"
        >
          <div class="unit-head">
            <span class="page">p{{ u.page_index ?? '?' }}</span>
            <span
              v-if="u.fidelity === 'partially_translated'"
              class="warn"
              role="alert"
            >
              <TriangleAlert :size="11" />
              公式恢复冲突，原公式保留
            </span>
            <span
              v-else-if="u.fidelity === 'preserved'"
              class="ok"
            >保真 ✓</span>
          </div>
          <p
            v-if="u.translated_text"
            class="text"
          >
            {{ u.translated_text }}
          </p>
          <!-- eslint-disable vue/no-v-html -- KaTeX(throwOnError:false) 转义 HTML；latex 来自 DocumentIR 受信内容 -->
          <div
            v-if="u.latex"
            class="formula"
            v-html="renderLatex(u.latex)"
          />
          <!-- eslint-enable vue/no-v-html -->
          <p
            v-if="u.fidelity_reason"
            class="reason"
            role="alert"
          >
            {{ u.fidelity_reason }}
          </p>
          <button
            type="button"
            class="locate"
            :aria-label="`定位原文块 ${u.block_id}`"
            @click="emit('locateBlock', u.block_id, u.page_index ?? 1)"
          >
            <MapPin :size="11" />
            定位原文
          </button>
        </li>
      </ul>
      <p
        v-else
        class="empty"
      >
        暂无译文单元。
      </p>
    </template>

    <p
      v-else
      class="hint"
    >
      选择「发起翻译」，系统在后台逐段翻译（显示预算与进度）；公式、引用与 label/ref 原样保留。
    </p>
  </div>
</template>

<style scoped>
.translation-pane {
  display: grid;
  gap: 9px;
  align-content: start;
}
.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.title {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: var(--font-size-sm);
  font-weight: 800;
}
.btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-height: 30px;
  padding: 4px 10px;
  border: 1px solid var(--border);
  border-radius: 7px;
  font-size: var(--font-size-xs);
  font-weight: 700;
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
.spin {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
.mini-error {
  margin: 0;
  color: var(--danger);
  font-size: var(--font-size-xs);
  font-weight: 650;
}
.running {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 8px 10px;
  background: var(--info-bg);
  border-radius: 7px;
  color: var(--primary);
  font-size: var(--font-size-xs);
  font-weight: 700;
}
.hint {
  margin: 0;
  color: var(--text-muted);
  font-size: var(--font-size-xs);
  line-height: 1.6;
}
.units {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 8px;
}
.unit {
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 8px 10px;
  background: var(--surface);
}
.unit.broken {
  border-color: var(--warning-bg);
  background: var(--warning-bg);
}
.unit-head {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}
.page {
  font-size: 10px;
  color: var(--text-muted);
  background: var(--subtle-bg);
  padding: 0 6px;
  border-radius: 999px;
}
.warn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--ailp-warning-600);
  font-size: 10px;
  font-weight: 800;
}
.ok {
  color: var(--ailp-success-600);
  font-size: 10px;
  font-weight: 800;
}
.text {
  margin: 0;
  font-size: var(--font-size-xs);
  line-height: 1.7;
}
.formula {
  margin: 6px 0 0;
  overflow-x: auto;
  text-align: center;
}
.reason {
  margin: 5px 0 0;
  color: var(--ailp-warning-600);
  font-size: var(--font-size-xs);
}
.locate {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 6px;
  padding: 2px 8px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--surface);
  font-size: var(--font-size-xs);
  font-weight: 700;
  cursor: pointer;
}
.empty {
  margin: 0;
  color: var(--text-muted);
  font-size: var(--font-size-xs);
}
</style>
