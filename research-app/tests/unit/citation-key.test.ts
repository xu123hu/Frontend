/**
 * citation-key 单测：引用 key 生成与冲突去重。
 * 红线（CR-F3-04）：引用 key 只能来自已核验 CitationRecord。
 */
import { describe, expect, it } from 'vitest';
import { citationKeyFromItem, dedupeCitationKey } from '@shared/lib/citation-key';

describe('citationKeyFromItem', () => {
  it('作者姓-年份-标题首词', () => {
    const key = citationKeyFromItem({
      authors: ['Stephen W. Raudenbush', 'Anthony S. Bryk'],
      year: 2002,
      title: 'Hierarchical Linear Models: Applications and Data Analysis Methods',
    });
    expect(key).toBe('raudenbush2002-hierarchical-linear-models');
  });

  it('无作者 → anon；无年份 → 0', () => {
    expect(citationKeyFromItem({ authors: [], year: null, title: 'A Note' })).toBe('anon0-a-note');
  });

  it('重音符号归一化', () => {
    expect(citationKeyFromItem({ authors: ['László Lovász'], year: 2011, title: 'Constructive approximation' })).toBe('lovasz2011-constructive-approximation');
  });
});

describe('dedupeCitationKey', () => {
  it('无冲突返回原 key', () => {
    expect(dedupeCitationKey('raudenbush2002', new Set(['bryk1998']))).toBe('raudenbush2002');
  });

  it('冲突追加数字后缀', () => {
    expect(dedupeCitationKey('raudenbush2002', new Set(['raudenbush2002', 'raudenbush20022']))).toBe('raudenbush20023');
  });
});
