/**
 * 15 个强制状态枚举（与 user-journeys.md §5 对齐）
 *
 * 命名遵循契约级稳定性：未来 F1+ 阶段后端下发的 `state` 字段将收敛到这些值。
 * 不允许任意增加新值；新增必须先更新本文件并写入 handoff。
 */

export const AsyncState = {
  INITIAL: 'initial',
  EMPTY: 'empty',
  LOADING: 'loading',
  QUEUED: 'queued',
  RUNNING: 'running',
  PARTIAL: 'partial',
  WAITING_FOR_APPROVAL: 'waiting_for_approval',
  PAUSED: 'paused',
  SUCCEEDED: 'succeeded',
  FAILED: 'failed',
  RETRYABLE: 'retryable',
  NOT_RETRYABLE: 'not_retryable',
  CANCELLED: 'cancelled',
  FORBIDDEN: 'forbidden',
  OFFLINE: 'offline',
} as const;

export type AsyncStateType = (typeof AsyncState)[keyof typeof AsyncState];

export const ALL_ASYNC_STATES: readonly AsyncStateType[] = Object.values(AsyncState);

/**
 * 状态机转移规则（F0 阶段冻结）。
 *
 * 核心原则：
 * - INITIAL 只能进入 LOADING 或 EMPTY。
 * - FAILED 必须落到 RETRYABLE 或 NOT_RETRYABLE。
 * - CANCELLED 是终态，不能自动恢复。
 * - FORBIDDEN 与 OFFLINE 是终态，UI 引导用户重新登录或联网。
 */
export const ALLOWED_TRANSITIONS: Record<AsyncStateType, readonly AsyncStateType[]> = {
  initial: ['loading', 'empty', 'forbidden', 'offline'],
  empty: ['loading', 'queued'],
  loading: ['queued', 'running', 'empty', 'failed', 'forbidden', 'offline'],
  queued: ['running', 'cancelled', 'failed'],
  running: ['partial', 'waiting_for_approval', 'paused', 'succeeded', 'failed', 'cancelled'],
  partial: ['running', 'succeeded', 'failed', 'cancelled'],
  waiting_for_approval: ['running', 'cancelled', 'failed', 'forbidden'],
  paused: ['running', 'cancelled', 'failed'],
  succeeded: [],
  failed: ['retryable', 'not_retryable'],
  retryable: ['queued', 'loading', 'cancelled'],
  not_retryable: [],
  cancelled: [],
  forbidden: [],
  offline: ['loading', 'queued', 'empty'],
};

/**
 * 视觉语义：状态 → CSS class + 状态徽章 tone。
 * 与原型 index.html 中的 `status.success` / `.warning` / `.danger` / `.info` 保持一致。
 */
export const STATE_TONE: Record<AsyncStateType, 'success' | 'warning' | 'danger' | 'info' | 'muted'> = {
  initial: 'muted',
  empty: 'muted',
  loading: 'info',
  queued: 'info',
  running: 'info',
  partial: 'warning',
  waiting_for_approval: 'warning',
  paused: 'warning',
  succeeded: 'success',
  failed: 'danger',
  retryable: 'warning',
  not_retryable: 'danger',
  cancelled: 'muted',
  forbidden: 'danger',
  offline: 'warning',
};

/**
 * 简化的本地状态机工具：判断从当前状态能否转移到 next。
 */
export function canTransition(from: AsyncStateType, to: AsyncStateType): boolean {
  if (from === to) return true;
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export class IllegalStateTransitionError extends Error {
  constructor(
    public readonly from: AsyncStateType,
    public readonly to: AsyncStateType,
  ) {
    super(`Illegal state transition: ${from} -> ${to}`);
    this.name = 'IllegalStateTransitionError';
  }
}

export function assertTransition(from: AsyncStateType, to: AsyncStateType): void {
  if (!canTransition(from, to)) {
    throw new IllegalStateTransitionError(from, to);
  }
}
