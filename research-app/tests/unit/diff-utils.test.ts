/**
 * shared/latex/diff-utils 单测：行 diff、hunk 聚合、建议应用。
 * 红线：AI 生成内容只能作为差异修订；拒绝不写入源文件。
 */
import { describe, expect, it } from 'vitest';
import { diffLines, toHunks, applySuggestion } from '@shared/latex/diff-utils';

describe('diffLines', () => {
  it('完全相同 → 全部 equal', () => {
    const out = diffLines('a\nb', 'a\nb');
    expect(out.every((l) => l.kind === 'equal')).toBe(true);
    expect(out).toHaveLength(2);
  });

  it('单行修改 → replace（delete + insert）', () => {
    const out = diffLines('old line', 'new line');
    expect(out.some((l) => l.kind === 'delete')).toBe(true);
    expect(out.some((l) => l.kind === 'insert')).toBe(true);
  });

  it('行号正确（1-based）', () => {
    const out = diffLines('a\nb\nc', 'a\nX\nc');
    const del = out.find((l) => l.kind === 'delete');
    const ins = out.find((l) => l.kind === 'insert');
    expect(del?.aLine).toBe(2);
    expect(ins?.bLine).toBe(2);
  });
});

describe('toHunks', () => {
  it('连续变更合并为一块', () => {
    const hunks = toHunks('line1\nline2\nline3', 'line1\nchanged2\nchanged3');
    expect(hunks).toHaveLength(1);
    expect(hunks[0]!.aStart).toBe(2);
    expect(hunks[0]!.aEnd).toBe(3);
    expect(hunks[0]!.original).toBe('line2\nline3');
    expect(hunks[0]!.suggested).toBe('changed2\nchanged3');
  });

  it('多处变更 → 多个 hunk', () => {
    const hunks = toHunks('a\nb\nc\nd', 'A\nb\nc\nD');
    expect(hunks).toHaveLength(2);
  });
});

describe('applySuggestion', () => {
  it('接受 → 应用 hunk 写入源文件', () => {
    const src = '\\section{Intro}\nold text\n\\section{Results}';
    // hunk 必须在全文上计算（仅第 2 行不同 → aStart=2）
    const hunks = toHunks('\\section{Intro}\nold text\n\\section{Results}', '\\section{Intro}\nnew text\n\\section{Results}');
    expect(hunks).toHaveLength(1);
    const out = applySuggestion(src, hunks[0]!, true);
    expect(out).toContain('new text');
    expect(out).not.toContain('old text');
    expect(out).toBe('\\section{Intro}\nnew text\n\\section{Results}');
  });

  it('拒绝 → 返回 null（不写入源文件）', () => {
    const src = 'keep me';
    const hunks = toHunks('keep me', 'replaced');
    expect(applySuggestion(src, hunks[0]!, false)).toBeNull();
  });

  it('越界行区间 → 返回原文件（不破坏）', () => {
    const src = 'a\nb';
    expect(applySuggestion(src, { id: 'h', aStart: 99, aEnd: 100, bStart: 1, bEnd: 1, original: 'x', suggested: 'y' }, true)).toBe(src);
  });
});
