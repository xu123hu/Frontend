/**
 * CodeMirror 6 LaTeX 补全扩展（自研轻量 language pack 的一部分）。
 *
 * 依据 f3-benchmark §3.1：codemirror-lang-latex 为 AGPL 拒绝，采用
 * @codemirror/language-data stex 高亮 + 自研补全。范围收窄为：
 * - \cite{key} 补全（key 来自已核验 CitationRecord，红线：不能自由生成引用）
 * - \ref{label} 补全（文稿内 label）
 * - 常用命令 snippet + 环境自动闭合
 */
import { type CompletionSource, type CompletionContext, snippetCompletion } from '@codemirror/autocomplete';

/** 环境自动闭合（输入 \begin{equation} 后自动补 \end{equation}）。 */
export function closeLatexEnvironment(input: string): string | null {
  const m = input.match(/\\begin\{([^}]+)\}$/);
  return m ? `\n\\end{${m[1]}}` : null;
}

/** 常用 LaTeX 环境/命令 snippet（演示 + 提效，不自造完整语言）。 */
export const LATEX_SNIPPETS = [
  snippetCompletion('\\begin{equation}\n\t$0\n\\end{equation}', { label: 'equation', detail: '公式环境' }),
  snippetCompletion('\\begin{align}\n\t$0\n\\end{align}', { label: 'align', detail: '对齐环境' }),
  snippetCompletion('\\section{${title}}', { label: 'section', detail: '节' }),
  snippetCompletion('\\label{${label}}', { label: 'label', detail: '标签' }),
  snippetCompletion('\\begin{figure}\n\t\\includegraphics{${file}}\n\t\\caption{${caption}}\n\\end{figure}', { label: 'figure', detail: '图' }),
  snippetCompletion('\\begin{table}\n\t\\caption{${caption}}\n\t$0\n\\end{table}', { label: 'table', detail: '表' }),
];

export interface LatexCompletionContext {
  /** 引用 key 候选（来自已核验 CitationRecord）。 */
  citationKeys: string[];
  /** 文稿内 label 候选。 */
  labels: string[];
}

/**
 * 生成 CodeMirror 补全源：\cite{ 后补引用 key，\ref{ 后补 label，
 * 命令前缀补 snippet。
 */
export function createLatexCompletion(context: () => LatexCompletionContext): CompletionSource {
  return (cmContext: CompletionContext) => {
    const cmState = cmContext.state;
    const pos = cmState.selection.main.head;
    const line = cmState.doc.lineAt(pos);
    const from = pos - cmState.sliceDoc(line.from, pos).replace(/\\[a-zA-Z]*$/u, '').length;
    const prefix = cmState.sliceDoc(from, pos);
    const trimmed = prefix.replace(/^.*\\/u, '');

    if (prefix.endsWith('\\cite{')) {
      return {
        from: pos,
        options: context().citationKeys.map((k) => ({ label: k, detail: '已核验引用', type: 'constant' })),
      };
    }
    if (prefix.endsWith('\\ref{')) {
      return {
        from: pos,
        options: context().labels.map((l) => ({ label: l, detail: '文稿标签', type: 'property' })),
      };
    }
    if (prefix.includes('\\')) {
      return {
        from,
        options: LATEX_SNIPPETS.filter((s) => s.label.startsWith(trimmed)).map((s) => ({ ...s })),
      };
    }
    return null;
  };
}

/** 从源码提取 label 候选（\label{...}），纯函数可单测。 */
export function extractLabels(source: string): string[] {
  const out: string[] = [];
  const re = /\\label\{([^}]+)\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source)) !== null) out.push(m[1]!);
  return out;
}
