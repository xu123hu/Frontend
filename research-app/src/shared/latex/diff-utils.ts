/**
 * 行级 diff 纯函数（AI 改写建议 → 编辑器内逐行定位/hunk 展示）。
 *
 * 红线：AI 生成内容只能作为差异修订（06 §6 步骤 2 / M4 §8.5），
 * 本模块只计算差异与定位，不修改源文件——接受/拒绝由决策层承担。
 */

export type DiffLineKind = 'equal' | 'insert' | 'delete' | 'replace';

export interface DiffLine {
  kind: DiffLineKind;
  /** 原文行号（1-based；insert 为 null）。 */
  aLine: number | null;
  /** 建议文本行号（1-based；delete 为 null）。 */
  bLine: number | null;
  text: string;
}

/** 连续变更块（hunk）：供「逐项接受/拒绝」与编辑器 Decoration 定位。 */
export interface DiffHunk {
  id: string;
  /** 原文行区间（1-based，包含）。 */
  aStart: number;
  aEnd: number;
  /** 建议行区间（1-based，包含）。 */
  bStart: number;
  bEnd: number;
  original: string;
  suggested: string;
}

/** 行级 LCS diff（O(n*m)，用于编辑器内建议对比；n*m 受编辑器单文件尺寸约束）。 */
export function diffLines(a: string, b: string): DiffLine[] {
  const aLines = a.split('\n');
  const bLines = b.split('\n');
  const n = aLines.length;
  const m = bLines.length;
  // dp[i][j]：a[0..i) 与 b[0..j) 的 LCS 长度
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i]![j] = aLines[i] === bLines[j] ? dp[i + 1]![j + 1]! + 1 : Math.max(dp[i + 1]![j]!, dp[i]![j + 1]!);
    }
  }
  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  let aLine = 0;
  let bLine = 0;
  while (i < n && j < m) {
    if (aLines[i] === bLines[j]) {
      aLine++;
      bLine++;
      out.push({ kind: 'equal', aLine, bLine, text: aLines[i]! });
      i++;
      j++;
    } else if (dp[i + 1]![j]! >= dp[i]![j + 1]!) {
      aLine++;
      out.push({ kind: 'delete', aLine, bLine: null, text: aLines[i]! });
      i++;
    } else {
      bLine++;
      out.push({ kind: 'insert', aLine: null, bLine, text: bLines[j]! });
      j++;
    }
  }
  while (i < n) {
    aLine++;
    out.push({ kind: 'delete', aLine, bLine: null, text: aLines[i]! });
    i++;
  }
  while (j < m) {
    bLine++;
    out.push({ kind: 'insert', aLine: null, bLine, text: bLines[j]! });
    j++;
  }
  return out;
}

/** 从 diff 行序列聚合成 hunk（连续 delete/replace/insert 合并为一块）。 */
export function toHunks(original: string, suggested: string): DiffHunk[] {
  const lines = diffLines(original, suggested);
  const hunks: DiffHunk[] = [];
  let cur: DiffLine[] = [];
  let index = 0;
  const flush = (): void => {
    if (cur.length === 0) return;
    const aStart = cur.find((l) => l.aLine !== null)?.aLine ?? 0;
    const aEnd = [...cur].reverse().find((l) => l.aLine !== null)?.aLine ?? aStart;
    const bStart = cur.find((l) => l.bLine !== null)?.bLine ?? 0;
    const bEnd = [...cur].reverse().find((l) => l.bLine !== null)?.bLine ?? bStart;
    hunks.push({
      id: `hunk-${index++}`,
      aStart,
      aEnd,
      bStart,
      bEnd,
      original: cur.filter((l) => l.kind !== 'insert').map((l) => l.text).join('\n'),
      suggested: cur.filter((l) => l.kind !== 'delete').map((l) => l.text).join('\n'),
    });
    cur = [];
  };
  for (const line of lines) {
    if (line.kind === 'equal') flush();
    else cur.push(line);
  }
  flush();
  return hunks;
}

/** 接受/拒绝后建议文本是否写入源文件（决策层调用；拒绝返回 null）。 */
export function applySuggestion(originalFile: string, hunk: DiffHunk, accept: boolean): string | null {
  if (!accept) return null;
  const aLines = originalFile.split('\n');
  if (hunk.aStart < 1 || hunk.aEnd > aLines.length || hunk.aStart > hunk.aEnd) return originalFile;
  const head = aLines.slice(0, hunk.aStart - 1);
  const tail = aLines.slice(hunk.aEnd);
  return [...head, hunk.suggested, ...tail].join('\n');
}
