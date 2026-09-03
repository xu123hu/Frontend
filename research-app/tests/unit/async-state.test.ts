import { describe, it, expect } from 'vitest';
import {
  AsyncState,
  ALL_ASYNC_STATES,
  ALLOWED_TRANSITIONS,
  STATE_TONE,
  canTransition,
  assertTransition,
  IllegalStateTransitionError,
} from '@shared/state/async-state';

describe('AsyncState 强制 15 状态枚举', () => {
  it('完整 15 个状态', () => {
    expect(ALL_ASYNC_STATES).toHaveLength(15);
  });

  it('每个状态在 STATE_TONE 中有映射', () => {
    for (const s of ALL_ASYNC_STATES) {
      expect(STATE_TONE[s]).toBeTruthy();
    }
  });

  it('SUCCEEDED 是终态', () => {
    expect(ALLOWED_TRANSITIONS[AsyncState.SUCCEEDED]).toEqual([]);
  });

  it('CANCELLED 是终态', () => {
    expect(ALLOWED_TRANSITIONS[AsyncState.CANCELLED]).toEqual([]);
  });

  it('FORBIDDEN 是终态', () => {
    expect(ALLOWED_TRANSITIONS[AsyncState.FORBIDDEN]).toEqual([]);
  });

  it('FAILED 必须落到 retryable 或 not_retryable', () => {
    expect(ALLOWED_TRANSITIONS[AsyncState.FAILED]).toEqual([
      AsyncState.RETRYABLE,
      AsyncState.NOT_RETRYABLE,
    ]);
  });

  it('canTransition 接受自环', () => {
    expect(canTransition(AsyncState.INITIAL, AsyncState.INITIAL)).toBe(true);
  });

  it('canTransition 拒绝 SUCCEEDED → RUNNING', () => {
    expect(canTransition(AsyncState.SUCCEEDED, AsyncState.RUNNING)).toBe(false);
  });

  it('canTransition 接受 INITIAL → LOADING', () => {
    expect(canTransition(AsyncState.INITIAL, AsyncState.LOADING)).toBe(true);
  });

  it('canTransition 接受 RUNNING → WAITING_FOR_APPROVAL', () => {
    expect(canTransition(AsyncState.RUNNING, AsyncState.WAITING_FOR_APPROVAL)).toBe(true);
  });

  it('assertTransition 在非法转移时抛错', () => {
    expect(() => assertTransition(AsyncState.SUCCEEDED, AsyncState.RUNNING)).toThrow(
      IllegalStateTransitionError,
    );
  });

  it('assertTransition 在合法转移时静默通过', () => {
    expect(() => assertTransition(AsyncState.LOADING, AsyncState.RUNNING)).not.toThrow();
  });
});
