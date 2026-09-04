<script setup lang="ts">
/**
 * CodeMirror 6 LaTeX 编辑器（f3-benchmark §3.1：stex 高亮 + 自研补全 + 环境闭合）。
 * - 高亮：@codemirror/legacy-modes stex（MIT），同步加载。
 * - 补全：\cite{key}（已核验 CitationRecord）/ \ref{label} / 命令 snippet。
 * - Decoration：标记 AI diff 建议定位行（黄底）与已接受行（绿底）。
 * - 暴露 insertAtCursor / focusLine 供引用插入与编译错误定位。
 */
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { EditorState, Compartment, type Extension, type Range } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter, drawSelection, Decoration } from '@codemirror/view';
import { syntaxHighlighting, defaultHighlightStyle, bracketMatching, foldGutter, indentOnInput, StreamLanguage } from '@codemirror/language';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap } from '@codemirror/autocomplete';
import { stex } from '@codemirror/legacy-modes/mode/stex';
import { createLatexCompletion, extractLabels, type LatexCompletionContext } from '@shared/latex/completions';

const props = defineProps<{
  modelValue: string;
  /** 已核验引用 key 候选（\cite 补全）。 */
  citationKeys?: string[];
  /** AI diff 建议定位行（1-based aStart..aEnd）。 */
  suggestionLines?: Array<{ aStart: number; aEnd: number; status: 'pending' | 'accepted' }>;
}>();

const emit = defineEmits<{
  /** 内容变化（保存由父级防抖承担）。 */
  'update:modelValue': [value: string];
  /** 编辑器就绪。 */
  ready: [];
}>();

const host = ref<HTMLDivElement | null>(null);
let view: EditorView | null = null;
const decorationCompartment = new Compartment();

const completionContext = (): LatexCompletionContext => ({
  citationKeys: props.citationKeys ?? [],
  labels: extractLabels(props.modelValue),
});

function buildExtensions(): Extension[] {
  return [
    lineNumbers(),
    highlightActiveLineGutter(),
    highlightActiveLine(),
    drawSelection(),
    foldGutter(),
    bracketMatching(),
    closeBrackets(),
    indentOnInput(),
    history(),
    keymap.of([...closeBracketsKeymap, ...defaultKeymap, ...historyKeymap, ...completionKeymap, indentWithTab]),
    syntaxHighlighting(defaultHighlightStyle),
    StreamLanguage.define(stex),
    autocompletion({ override: [createLatexCompletion(completionContext)] }),
    decorationCompartment.of([]),
    EditorView.lineWrapping,
    EditorView.updateListener.of((update) => {
      if (update.docChanged) emit('update:modelValue', update.state.doc.toString());
    }),
  ];
}

onMounted(() => {
  if (!host.value) return;
  const state = EditorState.create({ doc: props.modelValue, extensions: buildExtensions() });
  view = new EditorView({ state, parent: host.value });
  emit('ready');
});

onBeforeUnmount(() => {
  view?.destroy();
  view = null;
});

// 外部内容变化（文件切换）→ 替换文档（避免循环触发 update）。
let externalSet = false;
watch(
  () => props.modelValue,
  (next) => {
    if (!view || externalSet) return;
    const current = view.state.doc.toString();
    if (next !== current) {
      externalSet = true;
      view.dispatch({ changes: { from: 0, to: current.length, insert: next } });
      requestAnimationFrame(() => {
        externalSet = false;
      });
    }
  },
);

// AI diff 定位行高亮 Decoration。
// 注意：decorateLines 返回普通扩展（不再次包裹 decorationCompartment.of），
// 否则与初始 extensions 中的 compartment.of([]) 重复使用 → RangeError: Duplicate use of compartment。
function decorateLines(lines: Array<{ aStart: number; aEnd: number; status: 'pending' | 'accepted' }>): Extension {
  if (!view) return [];
  const ranges: Range<Decoration>[] = [];
  for (const h of lines) {
    for (let ln = h.aStart; ln <= h.aEnd; ln++) {
      const line = view.state.doc.line(Math.max(1, Math.min(ln, view.state.doc.lines)));
      ranges.push(
        Decoration.line({ class: h.status === 'accepted' ? 'cm-diff-accepted' : 'cm-diff-pending' }).range(line.from),
      );
    }
  }
  return EditorView.decorations.of(Decoration.set(ranges, true));
}

watch(
  () => props.suggestionLines,
  (lines) => {
    if (!view) return;
    view.dispatch({ effects: decorationCompartment.reconfigure(decorateLines(lines ?? [])) });
  },
  { deep: true },
);

/** 在光标处插入文本（引用插入：\cite{key}）。 */
function insertAtCursor(text: string): void {
  if (!view) return;
  const sel = view.state.selection.main;
  view.dispatch({ changes: { from: sel.from, to: sel.to, insert: text } });
  view.focus();
}

/** 聚焦并滚动到指定行（编译错误定位）。 */
function focusLine(line: number): void {
  if (!view) return;
  const ln = Math.max(1, Math.min(line, view.state.doc.lines));
  const info = view.state.doc.line(ln);
  view.dispatch({ selection: { anchor: info.from }, effects: EditorView.scrollIntoView(info.from, { y: 'center' }) });
  view.focus();
}

defineExpose({ insertAtCursor, focusLine, view: () => view });
</script>

<template>
  <div
    ref="host"
    class="latex-editor"
    aria-label="LaTeX 编辑器"
    :aria-multiline="true"
  />
</template>

<style scoped>
.latex-editor {
  height: 100%;
  overflow: auto;
  font-family: var(--mono);
  font-size: 13px;
  line-height: 1.6;
  background: var(--surface);
}
:deep(.cm-editor) {
  height: 100%;
  font-family: var(--mono);
  font-size: 13px;
}
:deep(.cm-diff-pending) {
  background: rgba(242, 169, 59, 0.22);
}
:deep(.cm-diff-accepted) {
  background: rgba(37, 164, 111, 0.18);
}
</style>
