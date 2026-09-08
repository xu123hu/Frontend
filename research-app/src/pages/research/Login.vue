<script setup lang="ts">
/**
 * 登录页（黄金链路一 TC-F01-01/02）。
 * 流程：输入手机号 → 获取验证码 → 输入验证码 → 登录 → 回跳 redirect。
 * 状态覆盖：提交中 / 字段校验错误 / 验证码错误可重试 / 账户禁用 / 探测降级（离线）提示。
 * 交互基线：F0 原型手机号 + OTP 结构 1:1 保留，接入真实会话用例。
 */
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useSession } from '@features/auth/use-session';
import { ApiError } from '@app/api/client';
import { config } from '@app/config';
import { isOidcCallback } from '@features/auth/oidc';
import { AppButton, AppCard, AppInput } from '@shared/ui';

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

  // 三端统一平台登录（真实部署）：本页不再展示登录 UI，直接整页转发平台登录页。
  if (config.identityMode === 'platform' && !config.useMock) {
    goPlatformLogin();
  }
});

// 平台统一登录完成回跳：平台登录页在当前页设置了会话 cookie，探测结束后自动进入工作台。
watch(
  () => session.isAuthenticated.value,
  (authenticated) => {
    if (authenticated) void router.replace(redirectTarget.value);
  },
);

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

/** 平台统一登录：跳回平台登录页（保留 research 深链 redirect）。 */
function goPlatformLogin(): void {
  const redirect =
    typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/research')
      ? route.query.redirect
      : '/research/home';
  const url = new URL('/login', window.location.origin);
  url.searchParams.set('redirect', redirect);
  window.location.assign(url.toString());
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
    <span
      class="bg-blob blob-a"
      aria-hidden="true"
    />
    <span
      class="bg-blob blob-b"
      aria-hidden="true"
    />
    <main
      role="main"
      class="login-shell"
    >
      <AppCard
        variant="portal"
        padding="lg"
        class="login-card"
      >
        <h1>智学数研 · 科研端</h1>
        <p class="muted">
          面向数学科研的证据原生智能科研操作系统
        </p>

        <p
          v-if="session.probeDegraded.value"
          class="notice warning"
          role="alert"
        >
          网络连接不可用或服务暂时无法访问，登录功能可能受限。
        </p>
        <p
          v-if="config.useMock && !config.oidcEnabled"
          class="notice info"
          role="note"
        >
          演示环境：账号 13800000001，验证码 888888。
        </p>

        <div
          v-if="config.identityMode === 'platform'"
          class="form"
        >
          <p class="muted">
            科研端与平台共用统一身份：使用平台手机号账号登录（选择"科研端"身份），
            无需单独的科研账号。
          </p>
          <AppButton
            block
            size="lg"
            @click="goPlatformLogin"
          >
            使用平台统一账号登录
          </AppButton>
        </div>

        <template
          v-else-if="config.oidcEnabled"
          class="form"
        >
          <p class="muted">
            本环境使用统一身份登录（Keycloak）。演示账号：alice / alice_dev_only。
          </p>
          <div
            v-if="oidcError"
            class="form-error"
            role="alert"
          >
            <span>{{ oidcError.message }}</span>
            <AppButton
              v-if="oidcError.retryable"
              variant="danger"
              size="sm"
              @click="startOidcLogin"
            >
              重试
            </AppButton>
          </div>
          <AppButton
            block
            size="lg"
            :loading="oidcProcessing"
            @click="startOidcLogin"
          >
            {{ oidcProcessing ? '正在跳转统一身份…' : '使用统一身份登录' }}
          </AppButton>
        </template>

        <form
          v-else
          class="form"
          novalidate
          @submit.prevent="step === 'phone' ? sendOtp() : submitLogin()"
        >
          <AppInput
            v-if="step === 'phone'"
            id="phone"
            v-model="phone"
            label="手机号"
            type="text"
            name="phone"
            placeholder="请输入手机号"
            :error="fieldError?.field === 'phone' ? fieldError.message : undefined"
          />

          <template v-else>
            <AppInput
              id="otp"
              v-model="otp"
              label="验证码"
              type="text"
              name="otp"
              placeholder="6 位验证码"
              :error="fieldError?.field === 'otp' ? fieldError.message : undefined"
            >
              <template #suffix>
                <AppButton
                  variant="secondary"
                  size="sm"
                  :disabled="otpCountdown > 0"
                  @click="sendOtp"
                >
                  {{ otpCountdown > 0 ? `${otpCountdown}s 后重发` : '重新发送' }}
                </AppButton>
              </template>
            </AppInput>
            <AppButton
              variant="ghost"
              size="sm"
              class="back-link"
              @click="backToPhone"
            >
              更换手机号
            </AppButton>
          </template>

          <div
            v-if="formError"
            class="form-error"
            role="alert"
          >
            <span>{{ formError.message }}</span>
            <AppButton
              v-if="formError.retryable"
              variant="danger"
              size="sm"
              @click="step === 'phone' ? sendOtp() : submitLogin()"
            >
              重试
            </AppButton>
          </div>

          <AppButton
            block
            size="lg"
            type="submit"
            :loading="submitting"
          >
            {{ submitting ? '处理中…' : step === 'phone' ? '获取验证码' : '登录' }}
          </AppButton>
        </form>
      </AppCard>
    </main>
  </div>
</template>

<style scoped>
.login {
  position: relative;
  min-height: 100vh;
  display: grid;
  place-items: center;
  overflow: hidden;
  padding: 20px;
  background:
    radial-gradient(circle at 18% 20%, var(--ailp-primary-100), transparent 34%),
    radial-gradient(circle at 82% 72%, var(--ailp-accent-100), transparent 32%),
    var(--ailp-background);
}
.blob-a {
  width: 420px;
  height: 420px;
  left: -120px;
  top: -100px;
  background: var(--ailp-primary-300);
}
.blob-b {
  width: 360px;
  height: 360px;
  right: -100px;
  bottom: -120px;
  background: var(--ailp-accent-300);
}
.login-shell {
  position: relative;
  z-index: 1;
  width: min(460px, 100%);
}
.login-card {
  display: grid;
  gap: 12px;
}
.login-card h1 {
  margin: 0;
  font-size: var(--font-size-xl);
  color: var(--ailp-foreground);
}
.muted {
  margin: 0;
  font-size: var(--font-size-base);
  color: var(--ailp-muted-foreground);
}
.notice {
  margin: 0;
  padding: 10px 12px;
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
}
.notice.warning {
  background: var(--warning-bg);
  border: 1px solid var(--ailp-warning-500);
  color: var(--ailp-warning-600);
}
.notice.info {
  background: var(--ailp-primary-50);
  border: 1px solid var(--ailp-primary-200);
  color: var(--ailp-primary-700);
}
.form {
  display: grid;
  gap: 12px;
  margin-top: 8px;
}
.form-error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin: 0;
  padding: 10px 12px;
  background: var(--danger-bg);
  border: 1px solid var(--ailp-error-500);
  border-radius: var(--radius-md);
  color: var(--ailp-error-600);
  font-size: var(--font-size-base);
}
.back-link {
  justify-self: start;
}
</style>
