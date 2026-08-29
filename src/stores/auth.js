import { defineStore } from 'pinia'

import { authApi } from '@/api/auth'
import { clearAccessToken, setAccessToken } from '@/api/authSession'

function deriveStatus(user) {
  if (!user) return 'anonymous'
  if (user.status === 'deletion_pending') return 'deletion_pending'
  if (['pending_review', 'needs_more_info', 'rejected'].includes(user.identity_status)) return user.identity_status
  // 学生档案引导只作用于学生身份：教师/科研没有学生引导流程，
  // 否则演示模式下自动开通的专业身份会被路由守卫强制劫到 /onboarding/student
  if (
    (!user.active_role || user.active_role === 'student') &&
    user.onboarding_status && user.onboarding_status !== 'completed'
  ) return 'onboarding'
  const active = (user.roles || []).find((item) => item.role === user.active_role)
  if (active && active.status !== 'approved') return 'pending_review'
  return 'authenticated'
}

export const useAuthStore = defineStore('auth', {
  state: () => ({ status: 'idle', user: null, bootstrapPromise: null }),
  getters: {
    isLoggedIn: (state) => ['authenticated', 'onboarding', 'pending_review', 'needs_more_info', 'rejected', 'deletion_pending'].includes(state.status),
    approvedRoleBindings: (state) => (state.user?.roles || []).filter((item) => item.status === 'approved' || item.verified === true),
    roles() { return this.approvedRoleBindings.map((item) => item.role) },
    pendingRoles: (state) => (state.user?.roles || []).filter((item) => item.status && item.status !== 'approved').map((item) => item.role),
    isAdmin() { return this.activeRole === 'admin' && this.roles.includes('admin') },
    nickname: (state) => state.user?.nickname || '同学',
    activeRole: (state) => state.user?.active_role || null,
  },
  actions: {
    applyIdentity(user) {
      this.user = user
      this.status = deriveStatus(user)
    },
    applyAuthResponse(data) {
      this.applyIdentity({ ...data.user, identity_status: data.identity_status, pending_role: data.pending_role })
      // 学生档案引导只作用于学生身份：教师/科研没有学生引导流程，
      // 否则演示模式下自动开通的专业身份会被强制打回 /onboarding/student
      const activeRole = data.user?.active_role
      if (
        data.onboarding_required && this.status === 'authenticated' &&
        (!activeRole || activeRole === 'student')
      ) this.status = 'onboarding'
    },
    async bootstrap() {
      if (this.status !== 'idle' && this.status !== 'anonymous') return
      if (this.bootstrapPromise) return this.bootstrapPromise
      this.status = 'bootstrapping'
      this.bootstrapPromise = (async () => {
        try {
          await authApi.refreshSession()
          this.applyIdentity(await authApi.me())
        } catch {
          clearAccessToken()
          this.user = null
          this.status = 'anonymous'
        } finally {
          this.bootstrapPromise = null
        }
      })()
      return this.bootstrapPromise
    },
    async loginSms(payload) {
      const data = await authApi.loginSms(payload)
      setAccessToken(data.access_token)
      this.applyAuthResponse(data)
      return data
    },
    async loginPassword(payload) {
      const data = await authApi.loginPassword(payload)
      setAccessToken(data.access_token)
      this.applyAuthResponse(data)
      return data
    },
    async registerSms(payload) {
      const data = await authApi.registerSms(payload)
      setAccessToken(data.access_token)
      this.applyAuthResponse(data)
      return data
    },
    async refreshMe() {
      const user = await authApi.me()
      this.applyIdentity(user)
      return user
    },
    async switchRole(role) {
      await authApi.switchRole(role)
      await this.refreshMe()
    },
    async logout() {
      try { await authApi.logout() } finally {
        clearAccessToken(); this.user = null; this.status = 'anonymous'
      }
    },
    async logoutAll() {
      try { await authApi.logoutAll() } finally {
        clearAccessToken(); this.user = null; this.status = 'anonymous'
      }
    },
    async smsCode(phone) { return authApi.challengeSms(phone, 'login') },
    async login(phone, code) {
      return this.loginSms({ phone, code, challenge_id: 'legacy', remember: false })
    },
    async loginByClassCode() { throw new Error('班级码免密登录已停用') },
  },
})
