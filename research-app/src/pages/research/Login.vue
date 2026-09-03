<script setup lang="ts">
import Boundary from '@shared/ui/Boundary.vue';
</script>

<template>
  <div class="login">
    <main class="login-card" role="main">
      <h1>智学数研 · 科研端</h1>
      <p class="muted">面向数学科研的证据原生智能科研操作系统</p>
      <Boundary tone="info" title="登录流程占位">
        F0 阶段：登录页骨架。F1 阶段接入 OIDC 短期 access token + HttpOnly cookie
        refresh token；OTP 输入由 @headlessui/vue 提供无障碍基线。
      </Boundary>
      <form class="form" @submit.prevent>
        <div class="field">
          <label for="phone">手机号</label>
          <input id="phone" type="tel" placeholder="请输入手机号" autocomplete="tel" />
        </div>
        <div class="field">
          <label for="otp">验证码</label>
          <input id="otp" type="text" inputmode="numeric" placeholder="6 位验证码" autocomplete="one-time-code" />
        </div>
        <button class="btn primary" type="submit" disabled>登录（F0 占位，未接入）</button>
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
  color: var(--muted);
  margin: 0;
  font-size: var(--font-size-sm);
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
  border: 1px solid var(--line-2);
  border-radius: 7px;
  padding: 8px 9px;
  background: #fff;
}
.btn.primary {
  min-height: 36px;
  padding: 8px 12px;
  background: var(--primary);
  border: 1px solid var(--primary);
  color: #fff;
  border-radius: 7px;
  font-weight: 700;
  cursor: pointer;
}
</style>
