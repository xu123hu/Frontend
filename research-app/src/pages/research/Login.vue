<script setup lang="ts">
/**
 * 登录页（黄金链路一 TC-F01-01/02）。
 * 流程：输入手机号 → 获取验证码 → 输入验证码 → 登录 → 回跳 redirect。
 * 状态覆盖：提交中 / 字段校验错误 / 验证码错误可重试 / 账户禁用 / 探测降级（离线）提示。
 * 交互基线：F0 原型手机号 + OTP 结构 1:1 保留，接入真实会话用例。
 */
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useSession } from '@features/auth/use-session';
import { ApiError } from '@app/api/client';
import { config } from '@app/config';
import { isOidcCallback } from '@features/auth/oidc';

const route = useRoute();
const router = useRouter();
const session = useSession();

const phone = ref('');
const otp = ref('');
const step = ref<'phone' | 'otp'>('phone');
const submitting = ref(false);
const fieldError = ref<{ field: 'phone' | 'otp'; message: string } | null>(null);
const formError = ref<{ message: string; retryable: boolean } | null>(null);
const otpCountdown = ref(0);
let countdownTimer: ReturnType<typeof setInterval> | null = null;

/** 统一身份（OIDC）：回调处理中 / 发起跳转中 / 错误。 */
const oidcProcessing = ref(false);
const oidcError = ref<{ message: string; retryable: boolean } | null>(null);

const redirectTarget = computed(() => {
  const target = route.query.redirect;
  return typeof target === 'string' && target.startsWith('/research') ? target : '/research/home';
});

onMounted(() => {
  // 统一身份回调（?code&state）：换令牌 → 拉账户 → 回跳。
  if (isOidcCallback(route.query as Record<string, unknown>)) {
    void handleOidcCallback();
    return;
  }
  // 已认证由守卫跳转；此处仅负责探测降级横幅。
  void session.probeSession();
});

async function handleOidcCallback(): Promise<void> {
  oidcProcessing.value = true;
  oidcError.value = null;
  try {
    await session.completeOidc(route.query as Record<string, unknown>);
    await router.replace(redirectTarget.value);
  } catch (err) {
    oidcError.value = {
      message: err instanceof Error ? err.message : '统一身份登录失败，请重试。',
      retryable: true,
    };
    // 清掉地址栏一次性 code/state，允许用户重新发起登录。
    await router.replace({ name: 'login', query: route.query.redirect ? { redirect: route.query.redirect } : {} });
  } finally {
    oidcProcessing.value = false;
  }
}

async function startOidcLogin(): Promise<void> {
  oidcProcessing.value = true;
  oidcError.value = null;
  try {
    await session.beginOidc(redirectTarget.value);
    // 成功路径整页跳转 Keycloak，不会返回此处。
  } catch (err) {
    oidcProcessing.value = false;
    oidcError.value = {
      message: err instanceof Error ? err.message : '统一身份未配置，请联系管理员。',
      retryable: false,
    };
  }
}

function startCountdown(seconds = 60): void {
  otpCountdown.value = seconds;
  countdownTimer = setInterval(() => {
    otpCountdown.value -= 1;
    if (otpCountdown.value <= 0 && countdownTimer) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }
  }, 1000);
}

async function sendOtp(): Promise<void> {
  fieldError.value = null;
  formError.value = null;
  if (!/^1\d{10}$/.test(phone.value)) {
    fieldError.value = { field: 'phone', message: '请输入 11 位手机号。' };
    return;
  }
  submitting.value = true;
  try {
    await session.sendOtp(phone.value);
    step.value = 'otp';
    startCountdown(60);
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.kind === 'rate_limited') {
        formError.value = { message: '验证码发送过于频繁，请稍后再试。', retryable: true };
        startCountdown(30);
      } else if (err.kind === 'network') {
        formError.value = { message: err.message, retryable: true };
      } else if (err.kind === 'validation') {
        fieldError.value = { field: 'phone', message: err.message };
      } else {
        formError.value = { message: err.message, retryable: err.retryable };
      }
    } else {
      formError.value = { message: '发送失败，请重试。', retryable: true };
    }
  } finally {
    submitting.value = false;
  }
}

async function submitLogin(): Promise<void> {
  fieldError.value = null;
  formError.value = null;
  if (!/^\d{6}$/.test(otp.value)) {
    fieldError.value = { field: 'otp', message: '请输入 6 位数字验证码。' };
    return;
  }
  submitting.value = true;
  try {
    await session.login(phone.value, otp.value);
    await router.replace(redirectTarget.value);
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.kind === 'validation' && err.fieldErrors.otp_code) {
        fieldError.value = { field: 'otp', message: err.fieldErrors.otp_code };
      } else if (err.kind === 'forbidden') {
        formError.value = { message: '该账户不可用，请联系管理员。', retryable: false };
      } else {
        formError.value = { message: err.message, retryable: err.retryable };
      }
    } else {
      formError.value = { message: '登录失败，请重试。', retryable: true };
    }
  } finally {
    submitting.value = false;
  }
}

function backToPhone(): void {
  step.value = 'phone';
  otp.value = '';
  formError.value = null;
  fieldError.value = null;
}
</script>

<template>
  <div class="login">
    <main
      class="login-card"
      role="main"
    >
      <h1>智学数研 · 科研端</h1>
      <p class="muted">
        面向数学科研的证据原生智能科研操作系统
      </p>

      <p
        v-if="session.probeDegraded.value"
        class="degraded"
        role="alert"
      >
        网络连接不可用或服务暂时无法访问，登录功能可能受限。
      </p>
      <p
        v-if="config.useMock && !config.oidcEnabled"
        class="mock-hint"
        role="note"
      >
        演示环境：账号 13800000001，验证码 888888。
      </p>

      <div
        v-if="config.oidcEnabled"
        class="form"
      >
        <p class="muted">
          本环境使用统一身份登录（Keycloak）。演示账号：alice / alice_dev_only。
        </p>
        <p
          v-if="oidcError"
          class="form-error"
          role="alert"
        >
          <span>{{ oidcError.message }}</span>
          <button
            v-if="oidcError.retryable"
            type="button"
            class="retry"
            @click="startOidcLogin"
          >
            重试
          </button>
        </p>
        <button
          class="btn primary"
          type="button"
          :disabled="oidcProcessing"
          @click="startOidcLogin"
        >
          {{ oidcProcessing ? '正在跳转统一身份…' : '使用统一身份登录' }}
        </button>
      </div>

      <form
        v-else
        class="form"
        novalidate
        @submit.prevent="step === 'phone' ? sendOtp() : submitLogin()"
      >
        <div
          v-if="step === 'phone'"
          class="field"
        >
          <label for="phone">手机号</label>
          <input
            id="phone"
            v-model="phone"
            type="tel"
            placeholder="请输入手机号"
            autocomplete="tel"
            :aria-invalid="fieldError?.field === 'phone'"
            :aria-describedby="fieldError?.field === 'phone' ? 'phone-error' : undefined"
          >
          <p
            v-if="fieldError?.field === 'phone'"
            id="phone-error"
            class="error"
            role="alert"
          >
            {{ fieldError.message }}
          </p>
        </div>

        <template v-else>
          <div class="field">
            <label for="otp">验证码</label>
            <div class="otp-row">
              <input
                id="otp"
                ref="otpInput"
                v-model="otp"
                type="text"
                inputmode="numeric"
                maxlength="6"
                placeholder="6 位验证码"
                autocomplete="one-time-code"
                :aria-invalid="fieldError?.field === 'otp'"
                :aria-describedby="fieldError?.field === 'otp' ? 'otp-error' : undefined"
              >
              <button
                type="button"
                class="btn resend"
                :disabled="otpCountdown > 0"
                @click="sendOtp"
              >
                {{ otpCountdown > 0 ? `${otpCountdown}s 后重发` : '重新发送' }}
              </button>
            </div>
            <p
              v-if="fieldError?.field === 'otp'"
              id="otp-error"
              class="error"
              role="alert"
            >
              {{ fieldError.message }}
            </p>
          </div>
          <button
            type="button"
            class="link"
            @click="backToPhone"
          >
            更换手机号
          </button>
        </template>

        <p
          v-if="formError"
          class="form-error"
          role="alert"
        >
          <span>{{ formError.message }}</span>
          <button
            v-if="formError.retryable"
            type="button"
            class="retry"
            @click="step === 'phone' ? sendOtp() : submitLogin()"
          >
            重试
          </button>
        </p>

        <button
          class="btn primary"
          type="submit"
          :disabled="submitting"
        >
          {{ submitting ? '处理中…' : step === 'phone' ? '获取验证码' : '登录' }}
        </button>
      </form>
    </main>
  </div>
</template>

<style scoped>
.login {
  min-height: 100vh;
  display: grid;
  place-items: center;
  background: var(--app-bg);
  padding: 20px;
}
.login-card {
  width: min(420px, 100%);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r);
  box-shadow: var(--shadow);
  padding: 24px;
  display: grid;
  gap: 12px;
}
.login-card h1 {
  font-size: var(--font-size-xl);
  margin: 0;
}
.muted {
  color: var(--text-muted);
  margin: 0;
  font-size: var(--font-size-sm);
}
.degraded,
.mock-hint {
  margin: 0;
  font-size: var(--font-size-xs);
  border-radius: 7px;
  padding: 8px 10px;
}
.degraded {
  background: var(--warning-bg);
  border: 1px solid #ead29e;
  color: #8a5b00;
}
.mock-hint {
  background: var(--info-bg);
  border: 1px solid #c7d9e8;
  color: var(--primary);
}
.form {
  display: grid;
  gap: 12px;
  margin-top: 8px;
}
.field {
  display: grid;
  gap: 5px;
}
.field label {
  font-size: var(--font-size-sm);
  font-weight: 700;
}
.field input {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: 7px;
  padding: 8px 9px;
  background: #fff;
  font: inherit;
}
.field input[aria-invalid='true'] {
  border-color: var(--danger);
}
.otp-row {
  display: flex;
  gap: 8px;
}
.otp-row input {
  flex: 1;
}
.btn {
  min-height: 36px;
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: 7px;
  background: var(--surface);
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}
.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.btn.primary {
  background: var(--primary);
  border: 1px solid var(--primary);
  color: #fff;
}
.btn.primary:hover:not(:disabled) {
  background: var(--primary-hover);
}
.btn.resend {
  white-space: nowrap;
  font-weight: 650;
}
.link {
  border: 0;
  background: none;
  color: var(--primary);
  font-size: var(--font-size-sm);
  cursor: pointer;
  text-align: left;
  padding: 0;
  justify-self: start;
}
.error {
  margin: 0;
  color: var(--danger);
  font-size: var(--font-size-xs);
  display: flex;
  align-items: center;
  gap: 4px;
}
.error::before {
  content: '⚠';
}
.form-error {
  margin: 0;
  padding: 9px 11px;
  background: var(--danger-bg);
  border: 1px solid #e6c0bc;
  border-radius: 7px;
  color: var(--danger);
  font-size: var(--font-size-sm);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.retry {
  border: 1px solid var(--danger);
  background: #fff;
  color: var(--danger);
  border-radius: 6px;
  padding: 2px 9px;
  font-size: var(--font-size-xs);
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
}
</style>
