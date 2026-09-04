/**
 * shared/latex/completions 单测：环境自动闭合、label 提取。
 */
import { describe, expect, it } from 'vitest';
import { closeLatexEnvironment, extractLabels } from '@shared/latex/completions';

describe('closeLatexEnvironment', () => {
  it('begin equation 环境 → 补 end', () => {
    expect(closeLatexEnvironment('\\begin{equation}')).toBe('\n\\end{equation}');
  });
  it('非环境输入 → null', () => {
    expect(closeLatexEnvironment('\\section{Intro}')).toBeNull();
  });
});

describe('extractLabels', () => {
  it('提取全部 \\label{...}', () => {
    expect(extractLabels('\\label{sec:intro}\n\\label{eq:l1}')).toEqual(['sec:intro', 'eq:l1']);
  });
  it('无 label → 空数组', () => {
    expect(extractLabels('plain text')).toEqual([]);
  });
});
