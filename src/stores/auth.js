import { defineStore } from 'pinia'
import { authApi } from '@/api'
import { getToken, setToken, getCachedUser, setCachedUser } from '@/api/client'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: getToken(),
    user: getCachedUser(),
  }),
  getters: {
    isLoggedIn: (s) => !!s.token,
    roles: (s) => (s.user?.roles || []).map((r) => r.role),
    isAdmin: (s) => (s.user?.roles || []).some((r) => r.role === 'admin'),
    nickname: (s) => s.user?.nickname || '同学',
    /**
     * 当前角色。规则：
     *  1) 优先 user.active_role；
     *  2) 只有单个 role 时返回该 role；
     *  3) 多个 role 但缺少 active_role 时返回 null（需调用 /auth/me 刷新或要求选择角色，禁止默认取 roles[0]）。
     */
    activeRole(s) {
      const u = s.user
      if (!u) return null
      if (u.active_role) return u.active_role
      const roles = (u.roles || []).map((r) => r.role).filter(Boolean)
      if (roles.length === 0) return null
      if (roles.length === 1) return roles[0]
      return null
    },
  },
  actions: {
    async smsCode(phone) { return authApi.smsCode(phone) },
    async login(phone, code) {
      const data = await authApi.login(phone, code)
      this.token = data.token
      this.user = data.user
      setToken(data.token)
      setCachedUser(data.user)
      return data
    },
    async loginByClassCode(inviteCode, nickname) {
      const data = await authApi.loginByClassCode(inviteCode, nickname)
      this.token = data.token
      this.user = data.user
      setToken(data.token)
      setCachedUser(data.user)
      return data
    },
    async refreshMe() {
      const me = await authApi.me()
      this.user = { ...this.user, ...me }
      setCachedUser(this.user)
      return me
    },
    async switchRole(role) {
      const data = await authApi.switchRole(role)
      this.token = data.token
      setToken(data.token)
      await this.refreshMe()
    },
    logout() {
      this.token = ''
      this.user = null
      setToken('')
      setCachedUser(null)
    },
  },
})