/**
 * 会话状态 store：认证态与当前账户。
 * 只保存认证事实（session/account），不复制服务端列表数据（02 §2 / ui store 约定）。
 */
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Account, SessionStatus } from '@entities/session/types';

export const useSessionStore = defineStore('session', () => {
  const status = ref<SessionStatus>('probing');
  const account = ref<Account | null>(null);
  /** 会话探测单飞：守卫与页面共享同一次 GET /auth/me。 */
  let probePromise: Promise<void> | null = null;

  const isAuthenticated = computed(() => status.value === 'authenticated');

  function setAuthenticated(next: Account): void {
    account.value = next;
    status.value = 'authenticated';
  }
  function setAnonymous(): void {
    account.value = null;
    status.value = 'anonymous';
  }

  /** 单飞探测：并发调用共享一次请求；结果由调用方写入。 */
  function probe(executor: () => Promise<void>): Promise<void> {
    if (!probePromise) {
      probePromise = executor().finally(() => {
        probePromise = null;
      });
    }
    return probePromise;
  }

  return {
    status,
    account,
    isAuthenticated,
    setAuthenticated,
    setAnonymous,
    probe,
  };
});
