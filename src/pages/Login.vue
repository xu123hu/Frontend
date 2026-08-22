<template>
  <main class="auth-page">
    <section class="auth-intro">
      <div class="brand-mark">π</div>
      <p class="eyebrow">智学数研</p>
      <h1>一个账号，连接学习、教学与科研</h1>
      <p>先安全登录平台，再按需要申请教师或科研人员身份。高权限身份统一由管理员审核。</p>
      <ul><li>学生个性化学习与成长画像</li><li>教师备课、课堂与评价闭环</li><li>科研推导验证与知识协作</li></ul>
    </section>
    <section class="auth-card" aria-labelledby="login-title">
      <p class="eyebrow">统一身份认证</p>
      <h2 id="login-title">欢迎回来</h2>
      <div class="tabs" role="tablist" aria-label="登录方式">
        <button role="tab" :aria-selected="mode === 'sms'" :class="{ active: mode === 'sms' }" @click="mode = 'sms'">短信验证码</button>
        <button role="tab" :aria-selected="mode === 'password'" :class="{ active: mode === 'password' }" @click="mode = 'password'">密码登录</button>
      </div>
      <form @submit.prevent="submit">
        <PhoneField v-model="phone" :error="phoneError" />
        <OtpField v-if="mode === 'sms'" v-model="code" :phone="phone" purpose="login" @challenge="challengeId = $event" @error="showError" />
        <PasswordField v-else v-model="password" />
        <label class="remember"><input v-model="remember" type="checkbox" /> 在这台设备上保持登录</label>
        <p v-if="error" class="error" role="alert">{{ error }}</p>
        <button class="btn btn-primary submit" :disabled="loading || !canSubmit">{{ loading ? '正在验证…' : '安全登录' }}</button>
      </form>
      <p class="register"><RouterLink to="/account/password">忘记密码？</RouterLink> · <RouterLink to="/account/deletion/cancel">取消账号注销</RouterLink></p>
      <p class="register">第一次使用？<RouterLink to="/register">注册新账号</RouterLink></p>
      <p class="terms">登录即表示你同意平台服务协议与隐私政策。</p>
    </section>
  </main>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import OtpField from '@/components/auth/OtpField.vue'
import PasswordField from '@/components/auth/PasswordField.vue'
import PhoneField from '@/components/auth/PhoneField.vue'
import { useAuthStore } from '@/stores/auth'

const router = useRouter(); const route = useRoute(); const auth = useAuthStore()
const mode = ref('sms'); const phone = ref(''); const code = ref(''); const password = ref('')
const challengeId = ref(''); const remember = ref(false); const loading = ref(false); const error = ref('')
const phoneError = computed(() => phone.value && !/^1[3-9]\d{9}$/.test(phone.value) ? '请输入有效的 11 位手机号' : '')
const canSubmit = computed(() => !phoneError.value && /^1[3-9]\d{9}$/.test(phone.value) && (mode.value === 'sms' ? code.value.length === 6 && !!challengeId.value : password.value.length >= 1))
const errorCopy = { AUTH_PASSWORD_INVALID: '手机号或密码不正确', AUTH_PASSWORD_LOCKED: '失败次数过多，请 15 分钟后再试', AUTH_CHALLENGE_EXPIRED: '验证码已过期，请重新获取', AUTH_CHALLENGE_INVALID: '验证码不正确' }
function showError(value) { error.value = errorCopy[value?.errorKey] || value?.message || '操作失败，请稍后重试' }
async function submit() {
  if (!canSubmit.value || loading.value) return
  loading.value = true; error.value = ''
  try {
    const data = mode.value === 'sms'
      ? await auth.loginSms({ phone: phone.value, challenge_id: challengeId.value, code: code.value, remember: remember.value })
      : await auth.loginPassword({ phone: phone.value, password: password.value, remember: remember.value })
    await router.push(data.onboarding_required ? '/onboarding/student' : (route.query.redirect || '/'))
  } catch (value) { showError(value) } finally { loading.value = false }
}
</script>

<style scoped>
.auth-page { min-height: 100vh; display: grid; grid-template-columns: minmax(320px, 1fr) minmax(380px, 500px); gap: 72px; align-items: center; padding: 64px max(6vw, 32px); background: radial-gradient(circle at 12% 12%, #fef3c7, transparent 36%), linear-gradient(145deg, #f8fafc, #fff7ed); }
.auth-intro { max-width: 650px; }
.brand-mark { width: 54px; height: 54px; display: grid; place-items: center; border-radius: 17px; color: white; font: 900 28px Georgia; background: linear-gradient(135deg, var(--brand), var(--brand2)); box-shadow: var(--shadow-lg); margin-bottom: 24px; }
.eyebrow { color: var(--brand-deep); font-weight: 800; letter-spacing: .08em; font-size: 12px; text-transform: uppercase; }
.auth-intro h1 { font-size: clamp(34px, 4vw, 58px); line-height: 1.12; letter-spacing: -.04em; margin: 10px 0 18px; }
.auth-intro > p { color: var(--ink2); font-size: 17px; max-width: 580px; }
.auth-intro ul { list-style: none; display: grid; gap: 10px; margin-top: 30px; color: var(--ink2); }
.auth-intro li::before { content: '✓'; color: var(--ok); font-weight: 900; margin-right: 10px; }
.auth-card { background: rgba(255,255,255,.94); border: 1px solid rgba(226,232,240,.9); border-radius: 26px; padding: 36px; box-shadow: 0 24px 70px rgba(15,23,42,.12); backdrop-filter: blur(18px); }
.auth-card h2 { font-size: 28px; margin: 4px 0 22px; }
.tabs { display: grid; grid-template-columns: 1fr 1fr; padding: 4px; background: var(--bg2); border-radius: 12px; margin-bottom: 24px; }
.tabs button { border: 0; padding: 10px; border-radius: 9px; background: transparent; color: var(--ink2); cursor: pointer; font-weight: 600; }
.tabs button.active { background: white; color: var(--ink); box-shadow: var(--shadow-sm); }
.remember { display: flex; gap: 8px; align-items: center; color: var(--ink2); font-size: 13px; margin: 4px 0 16px; }
.submit { width: 100%; height: 46px; font-weight: 700; }
.error { padding: 9px 12px; background: var(--err-bg); color: var(--err-deep); border-radius: 9px; margin-bottom: 12px; font-size: 13px; }
.register { text-align: center; margin-top: 20px; color: var(--ink2); }.register a { color: var(--brand-deep); font-weight: 700; }.terms { text-align: center; color: var(--ink3); font-size: 11px; margin-top: 10px; }
@media (max-width: 820px) { .auth-page { grid-template-columns: 1fr; padding: 28px 18px; gap: 28px; }.auth-intro ul { display: none; }.auth-intro h1 { font-size: 32px; }.auth-card { padding: 26px 22px; } }
</style>
