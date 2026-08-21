<template>
  <div class="login-wrap">
    <div class="login-card">
      <div class="logo">
        <div class="mark">π</div>
        <span>智学数研 · 学生端 v4</span>
      </div>
      <h1>欢迎回来 ✋</h1>
      <p class="sub">开发环境：先点「获取验证码」，再输入 123456 登录（或直接点击下方演示按钮）</p>

      <div class="form-item">
        <label class="form-label">手机号</label>
        <input v-model="phone" class="input" placeholder="请输入手机号" maxlength="11" />
      </div>
      <div class="form-item">
        <label class="form-label">验证码</label>
        <div style="display:flex;gap:8px;">
          <input v-model="code" class="input" placeholder="请输入验证码" maxlength="6" />
          <button class="btn" style="flex-shrink:0;" @click="sendCode">获取验证码</button>
        </div>
      </div>

      <button class="btn btn-primary" style="width:100%;height:44px;font-size:15px;font-weight:700;" :disabled="loading" @click="doLogin">
        {{ loading ? '登录中…' : '登 录' }}
      </button>
      <button class="btn demo-btn" @click="demoLogin">🧪 一键演示登录</button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const toast = useToastStore()

const phone = ref('13800000000')
const code = ref('123456')
const loading = ref(false)

async function sendCode() {
  if (!/^\d{11}$/.test(phone.value)) {
    toast.error('请输入 11 位手机号')
    return
  }
  try {
    await auth.smsCode(phone.value)
    toast.success('验证码已发送（开发环境统一为 123456，5 分钟内有效）')
  } catch (e) {
    toast.error(e?.message || '发送失败，请稍后再试')
  }
}

async function doLogin() {
  if (!/^\d{11}$/.test(phone.value)) {
    toast.error('请输入 11 位手机号')
    return
  }
  loading.value = true
  try {
    await auth.login(phone.value, code.value || '123456')
    toast.success('登录成功，欢迎回来！')
    // 经角色感知根路由分发：teacher → /teacher/today，否则 → /overview
    router.push(route.query.redirect || '/')
  } catch (e) {
    toast.error(e?.message || '登录失败')
  } finally {
    loading.value = false
  }
}

function demoLogin() {
  phone.value = '13800000000'
  code.value = '123456'
  doLogin()
}
</script>

<style scoped>
.login-wrap {
  min-height: 100vh; display: flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, #fffbeb, #fef3c7 55%, #fde68a);
  padding: 20px;
}
.login-card {
  width: 420px; max-width: 100%; background: var(--card);
  border: 1px solid var(--warn-border); border-radius: var(--radius-xl);
  padding: 36px 32px; box-shadow: var(--shadow-lg);
}
.logo { display: flex; align-items: center; gap: 10px; font-weight: 800; font-size: 16px; color: var(--ink); margin-bottom: 22px; }
.logo .mark {
  width: 32px; height: 32px; border-radius: 9px; background: linear-gradient(135deg, var(--brand), var(--brand2));
  display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 900; font-style: italic; font-size: 17px;
}
h1 { font-size: 22px; font-weight: 800; margin-bottom: 6px; }
.sub { font-size: 12.5px; color: var(--ink2); line-height: 1.6; margin-bottom: 24px; }
.demo-btn { width: 100%; margin-top: 10px; color: var(--brand-deep); }
</style>
