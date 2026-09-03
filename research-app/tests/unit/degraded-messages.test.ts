import { describe, it, expect } from 'vitest';
import { degradedLabel, DEGRADED_TONE_LABELS } from '@shared/state/degraded-messages';

describe('降级文案映射', () => {
  it('每条契约级降级都有中文标签', () => {
    expect(Object.keys(DEGRADED_TONE_LABELS).length).toBeGreaterThanOrEqual(10);
  });

  it('source_unavailable → 来源不可用', () => {
    expect(degradedLabel('source_unavailable')).toBe('来源不可用');
  });

  it('formal_pending → 形式化待确认', () => {
    expect(degradedLabel('formal_pending')).toBe('形式化待确认');
  });

  it('未知 code 原样返回', () => {
    expect(degradedLabel('some-new-code')).toBe('some-new-code');
  });
});
