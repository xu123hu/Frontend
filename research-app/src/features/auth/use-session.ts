/**
 * 会话用例：探测、登录、登出。
 * 探测失败分类：unauthorized → anonymous；network/offline → anonymous 但携带 degraded 标记，
 * 由登录页展示离线提示（不静默）。
 */
import { computed, ref } from 'vue';
import { useSessionStore } from '@app/stores/session';
import { ApiError } from '@app/api/client';
import { fetchMe, login as loginApi, logout as logoutApi, requestOtp } from './api';
import type { Account } from '@entities/session/types';

export function useSession() {
  const store = useSessionStore();

  /** 探测降级原因（null=探测正常），供登录页横幅展示。 */
  const probeDegraded = ref<string | null>(null);

  /** 应用启动/守卫调用：单飞探测 GET /auth/me。 */
  async function probeSession(): Promise<void> {
    await store.probe(async () => {
      probeDegraded.value = null;
      try {
        const account = await fetchMe();
        store.setAuthenticated(account);
      } catch (err) {
        store.setAnonymous();
        if (err instanceof ApiError && err.kind === 'unauthorized') {
          return; // 正常未登录
        }
        // 网络/服务异常：无法证明未登录 → 登录页显示降级横幅。
        probeDegraded.value = err instanceof ApiError ? err.kind : 'network';
      }
    });
  }

  async function sendOtp(phone: string): Promise<void> {
    await requestOtp(phone);
  }

  async function login(phone: string, otpCode: string): Promise<Account> {
    const account = await loginApi(phone, otpCode);
    store.setAuthenticated(account);
    return account;
  }

  async function logout(): Promise<void> {
    try {
      await logoutApi();
      store.setAnonymous();
    } catch (err) {
      if (err instanceof ApiError && err.kind === 'unauthorized') {
        // 服务端会话已失效：本地同步清除。
        store.setAnonymous();
        return;
      }
      // 网络/服务失败：保留本地会话事实并把错误交给调用方（不伪装登出成功）。
      throw err;
    }
  }

  return {
    status: computed(() => store.status),
    account: computed(() => store.account),
    isAuthenticated: computed(() => store.isAuthenticated),
    probeDegraded,
    probeSession,
    sendOtp,
    login,
    logout,
  };
}
