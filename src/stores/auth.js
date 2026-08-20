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
  },
  actions: {
    async smsCode(phone) {
      return authApi.smsCode(phone)
    },
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
