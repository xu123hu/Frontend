/**
 * AsyncState<T> 包装器。
 *
 * 目的：每个异步数据源（API 拉取、SSE 事件、文件解析）都返回这个统一类型，
 * 让组件只需关注状态语义，而不需要各自维护 loading/error/data 三态。
 *
 * F0 阶段：纯类型 + 构造器；与 TanStack Query 的整合放在 F1。
 */
import { AsyncState, type AsyncStateType } from './async-state';

export interface AsyncData<T> {
  readonly state: AsyncStateType;
  readonly data: T | null;
  readonly error: { code: string; message: string; retryable: boolean } | null;
  readonly progress: { current: number; total: number; unit: string; message: string } | null;
  readonly lastUpdatedAt: number | null;
}

export function initial<T>(): AsyncData<T> {
  return { state: AsyncState.INITIAL, data: null, error: null, progress: null, lastUpdatedAt: null };
}

export function loading<T>(): AsyncData<T> {
  return { state: AsyncState.LOADING, data: null, error: null, progress: null, lastUpdatedAt: Date.now() };
}

export function empty<T>(): AsyncData<T> {
  return { state: AsyncState.EMPTY, data: null, error: null, progress: null, lastUpdatedAt: Date.now() };
}

export function succeeded<T>(data: T): AsyncData<T> {
  return { state: AsyncState.SUCCEEDED, data, error: null, progress: null, lastUpdatedAt: Date.now() };
}

export function failed<T>(
  error: { code: string; message: string; retryable: boolean },
): AsyncData<T> {
  return {
    state: error.retryable ? AsyncState.RETRYABLE : AsyncState.NOT_RETRYABLE,
    data: null,
    error,
    progress: null,
    lastUpdatedAt: Date.now(),
  };
}

export function running<T>(progress: AsyncData<T>['progress'] = null, partial: T | null = null): AsyncData<T> {
  return { state: AsyncState.RUNNING, data: partial, error: null, progress, lastUpdatedAt: Date.now() };
}

export function partial<T>(partialData: T, progress: AsyncData<T>['progress']): AsyncData<T> {
  return { state: AsyncState.PARTIAL, data: partialData, error: null, progress, lastUpdatedAt: Date.now() };
}

export function waitingForApproval<T>(): AsyncData<T> {
  return { state: AsyncState.WAITING_FOR_APPROVAL, data: null, error: null, progress: null, lastUpdatedAt: Date.now() };
}

export function offline<T>(): AsyncData<T> {
  return { state: AsyncState.OFFLINE, data: null, error: null, progress: null, lastUpdatedAt: Date.now() };
}

export function forbidden<T>(message = 'forbidden'): AsyncData<T> {
  return {
    state: AsyncState.FORBIDDEN,
    data: null,
    error: { code: 'forbidden', message, retryable: false },
    progress: null,
    lastUpdatedAt: Date.now(),
  };
}
