/**
 * Lean 三状态综合判定单测（TC-F05-04/05 红线样例）。
 * 红线：三列独立，禁止合并为「论文正确」；任一 partial → partial_supported。
 */
import { describe, expect, it } from 'vitest';
import { claimSupportFromEvidence, computeLeanOverall } from '@features/review/lean-overall';

describe('computeLeanOverall（Lean 综合状态）', () => {
  it('翻译 partial + 内核 succeeded + 结论 partial → partial_supported（红线样例：Lean 通过 ≠ 论文正确）', () => {
    expect(computeLeanOverall('partial', 'succeeded', 'partial')).toBe('partial_supported');
  });

  it('翻译 partial 即使内核与结论全绿 → 仍 partial_supported（翻译忠实度独立判定）', () => {
    expect(computeLeanOverall('partial', 'succeeded', 'full')).toBe('partial_supported');
  });

  it('翻译 diverged → partial_supported', () => {
    expect(computeLeanOverall('diverged', 'succeeded', 'full')).toBe('partial_supported');
  });

  it('结论 unsupported → rejected（优先级最高）', () => {
    expect(computeLeanOverall('faithful', 'succeeded', 'unsupported')).toBe('rejected');
  });

  it('结论 partial → partial_supported', () => {
    expect(computeLeanOverall('faithful', 'succeeded', 'partial')).toBe('partial_supported');
  });

  it('内核 failed / timed_out → partial_supported', () => {
    expect(computeLeanOverall('faithful', 'failed', 'full')).toBe('partial_supported');
    expect(computeLeanOverall('faithful', 'timed_out', 'full')).toBe('partial_supported');
  });

  it('未运行 / 待确认语句 → pending', () => {
    expect(computeLeanOverall('not_run', 'not_run', 'not_verified')).toBe('pending');
    expect(computeLeanOverall('faithful', 'awaiting_statement_confirm', 'full')).toBe('pending');
    expect(computeLeanOverall('faithful', 'succeeded', 'not_verified')).toBe('pending');
  });

  it('全绿 → supported（仅「该主张被支持」，非论文正确）', () => {
    expect(computeLeanOverall('faithful', 'succeeded', 'full')).toBe('supported');
  });
});

describe('claimSupportFromEvidence（证据支持度 → 结论支持度）', () => {
  it('映射口径', () => {
    expect(claimSupportFromEvidence('supported')).toBe('full');
    expect(claimSupportFromEvidence('partial')).toBe('partial');
    expect(claimSupportFromEvidence('conflicting')).toBe('unsupported');
    expect(claimSupportFromEvidence('insufficient_evidence')).toBe('not_verified');
    expect(claimSupportFromEvidence('not_verified')).toBe('not_verified');
  });
});
