import { describe, it, expect } from 'vitest';
import { initial, loading, succeeded, failed, partial, running, forbidden, offline, empty, waitingForApproval } from '@shared/state/async-data';
import { AsyncState } from '@shared/state/async-state';

describe('AsyncData<T> 构造器', () => {
  it('initial 状态 = INITIAL', () => {
    expect(initial<number>().state).toBe(AsyncState.INITIAL);
  });

  it('loading 状态 = LOADING', () => {
    expect(loading<number>().state).toBe(AsyncState.LOADING);
  });

  it('empty 状态 = EMPTY', () => {
    expect(empty<number>().state).toBe(AsyncState.EMPTY);
  });

  it('succeeded 带 data', () => {
    const r = succeeded({ id: 1 });
    expect(r.state).toBe(AsyncState.SUCCEEDED);
    expect(r.data).toEqual({ id: 1 });
  });

  it('failed(retryable=true) → RETRYABLE', () => {
    const r = failed<number>({ code: 'timeout', message: '超时', retryable: true });
    expect(r.state).toBe(AsyncState.RETRYABLE);
  });

  it('failed(retryable=false) → NOT_RETRYABLE', () => {
    const r = failed<number>({ code: 'forbidden', message: '无权限', retryable: false });
    expect(r.state).toBe(AsyncState.NOT_RETRYABLE);
  });

  it('partial 携带 progress + data', () => {
    const r = partial({ step: 1 }, { current: 1, total: 5, unit: 'doc', message: '解析中' });
    expect(r.state).toBe(AsyncState.PARTIAL);
    expect(r.progress?.current).toBe(1);
  });

  it('running 携带 progress', () => {
    const r = running({ current: 3, total: 10, unit: 'page', message: '渲染' });
    expect(r.state).toBe(AsyncState.RUNNING);
  });

  it('waitingForApproval', () => {
    expect(waitingForApproval<number>().state).toBe(AsyncState.WAITING_FOR_APPROVAL);
  });

  it('forbidden 携带错误信息', () => {
    const r = forbidden<number>();
    expect(r.state).toBe(AsyncState.FORBIDDEN);
    expect(r.error?.code).toBe('forbidden');
  });

  it('offline', () => {
    expect(offline<number>().state).toBe(AsyncState.OFFLINE);
  });
});
