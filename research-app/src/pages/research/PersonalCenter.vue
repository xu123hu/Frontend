<script setup lang="ts">
/**
 * 个人中心（黄金链路一 TC-F01-07）：账户信息 + 偏好读写。
 * 偏好持久化在服务端（GET/PATCH /me/preferences，CR-F1-04 契约草案），刷新后保留；
 * 禁止写入 localStorage（F0 占位说明的既定约束）。
 * 状态：加载 / 加载失败可重试 / 保存中 / 保存成功 / 保存失败可重试。
 */
import { ref, watch, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import Boundary from '@shared/ui/Boundary.vue';
import Skeleton from '@shared/ui/Skeleton.vue';
import DataSourceBadge from '@shared/ui/DataSourceBadge.vue';
import { usePreferences, usePatchPreferences } from '@features/preferences/use-preferences';
import { useSession } from '@features/auth/use-session';
import { ApiError } from '@app/api/client';

const router = useRouter();
const session = useSession();
const prefsQuery = usePreferences();
const patchMutation = usePatchPreferences();

const language = ref<'zh-CN' | 'en-US'>('zh-CN');
const timezone = ref('Asia/Shanghai');
const notifyEmail = ref(false);
const notifyInApp = ref(true);

const loaded = ref(false);
const saveState = ref<'idle' | 'saving' | 'saved' | 'failed'>('idle');
const saveError = ref<string | null>(null);
let savedTimer: ReturnType<typeof setTimeout> | null = null;

watch(
  prefsQuery.data,
  (prefs) => {
    if (prefs && !loaded.value) {
      language.value = prefs.language;
      timezone.value = prefs.timezone;
      notifyEmail.value = prefs.notifications.email;
      notifyInApp.value = prefs.notifications.in_app;
      loaded.value = true;
    }
  },
  { immediate: true },
);

async function save(): Promise<void> {
  saveState.value = 'saving';
  saveError.value = null;
  try {
    await patchMutation.mutateAsync({
      language: language.value,
      timezone: timezone.value,
      notifications: { email: notifyEmail.value, in_app: notifyInApp.value },
    });
    saveState.value = 'saved';
    if (savedTimer) clearTimeout(savedTimer);
    savedTimer = setTimeout(() => {
      saveState.value = 'idle';
    }, 2500);
  } catch (err) {
    saveState.value = 'failed';
    saveError.value = err instanceof ApiError ? err.message : '保存失败，请重试。';
  }
}

async function signOut(): Promise<void> {
  await session.logout();
  await router.replace({ name: 'login' });
}

onBeforeUnmount(() => {
  if (savedTimer) clearTimeout(savedTimer);
});
</script>

<template>
  <div class="page">
    <header class="page-head">
      <div>
        <h1>个人中心</h1>
        <p>账户偏好、通知、隐私与记忆管理。</p>
      </div>
      <DataSourceBadge />
    </header>

    <section
      class="panel"
      aria-label="账户信息"
    >
      <h2>账户</h2>
      <template v-if="session.account.value">
        <dl class="facts">
          <div><dt>显示名</dt><dd>{{ session.account.value.display_name }}</dd></div>
          <div>
            <dt>手机号</dt><dd class="mono">
              {{ session.account.value.phone_masked || "—（统一身份账户）" }}
            </dd>
          </div>
          <div>
            <dt>租户 ID</dt><dd class="mono">
              {{ session.account.value.tenant_id }}
            </dd>
          </div>
        </dl>
        <button
          class="btn"
          type="button"
          @click="signOut"
        >
          退出登录
        </button>
      </template>
      <p
        v-else
        class="muted small"
      >
        账户信息不可用（{{ session.status.value }}）。
      </p>
    </section>

    <section
      class="panel"
      aria-label="偏好设置"
    >
      <h2>偏好</h2>
      <Skeleton
        v-if="prefsQuery.isPending.value"
        label="偏好加载中"
      />
      <Boundary
        v-else-if="prefsQuery.isError.value"
        tone="danger"
        title="偏好加载失败"
      >
        {{ prefsQuery.error.value?.message }}
        <button
          class="retry"
          type="button"
          @click="prefsQuery.refetch()"
        >
          重试
        </button>
      </Boundary>

      <form
        v-else
        class="form"
        @submit.prevent="save"
      >
        <div class="field">
          <label for="pref-language">界面语言</label>
          <select
            id="pref-language"
            v-model="language"
          >
            <option value="zh-CN">
              简体中文
            </option>
            <option value="en-US">
              English
            </option>
          </select>
        </div>
        <div class="field">
          <label for="pref-timezone">时区</label>
          <select
            id="pref-timezone"
            v-model="timezone"
          >
            <option value="Asia/Shanghai">
              Asia/Shanghai（北京时间）
            </option>
            <option value="UTC">
              UTC
            </option>
          </select>
        </div>
        <fieldset class="field">
          <legend>通知</legend>
          <label class="check">
            <input
              v-model="notifyInApp"
              type="checkbox"
            >
            站内通知（任务完成、审批请求）
          </label>
          <label class="check">
            <input
              v-model="notifyEmail"
              type="checkbox"
            >
            邮件通知
          </label>
        </fieldset>

        <p
          v-if="saveState === 'saved'"
          class="ok"
          role="status"
        >
          已保存 ✓
        </p>
        <p
          v-if="saveState === 'failed'"
          class="form-error"
          role="alert"
        >
          {{ saveError }}
          <button
            type="button"
            class="retry"
            @click="save"
          >
            重试
          </button>
        </p>

        <div class="foot">
          <button
            class="btn primary"
            type="submit"
            :disabled="saveState === 'saving'"
          >
            {{ saveState === 'saving' ? '保存中…' : '保存偏好' }}
          </button>
        </div>
      </form>
    </section>

    <Boundary
      tone="info"
      title="隐私与长期记忆"
    >
      当前演示版本不写入长期个人记忆。正式部署启用后，用户可查看、编辑或删除自己的记忆记录。
    </Boundary>
  </div>
</template>

<style scoped>
.page {
  max-width: 860px;
  margin: 0 auto;
  display: grid;
  gap: 16px;
}
.page-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}
.page-head h1 {
  font-size: var(--font-size-3xl);
  margin: 0 0 6px;
}
.page-head p {
  margin: 0;
  color: var(--text-muted);
}
.panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r);
  padding: 18px;
}
.panel h2 {
  margin: 0 0 12px;
  font-size: var(--font-size-lg);
}
.facts {
  margin: 0 0 14px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 10px;
}
.facts dt {
  font-size: var(--font-size-xs);
  color: var(--text-muted);
  font-weight: 700;
}
.facts dd {
  margin: 2px 0 0;
  font-size: var(--font-size-sm);
  word-break: break-all;
}
.form {
  display: grid;
  gap: 14px;
}
.field {
  display: grid;
  gap: 5px;
}
.field label,
.field legend {
  font-size: var(--font-size-sm);
  font-weight: 700;
}
.field select {
  max-width: 320px;
  border: 1px solid var(--border);
  border-radius: 7px;
  padding: 8px 9px;
  font: inherit;
  background: #fff;
}
fieldset.field {
  border: 1px solid var(--border);
  border-radius: 7px;
  padding: 10px 12px;
}
.check {
  display: flex;
  gap: 7px;
  align-items: center;
  font-size: var(--font-size-sm);
  font-weight: 500;
  margin-top: 4px;
}
.ok {
  margin: 0;
  color: var(--success);
  font-size: var(--font-size-sm);
  font-weight: 700;
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
.foot {
  display: flex;
  justify-content: flex-end;
}
.btn {
  min-height: 34px;
  padding: 6px 13px;
  border: 1px solid var(--border);
  border-radius: 7px;
  background: var(--surface);
  font-weight: 650;
  cursor: pointer;
}
.btn.primary {
  background: var(--primary);
  border-color: var(--primary);
  color: #fff;
}
.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
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
}
.muted {
  color: var(--text-muted);
}
.small {
  font-size: var(--font-size-xs);
}
.mono {
  font-family: var(--mono);
}
</style>
