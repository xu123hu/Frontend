<script setup>
/**
 * 科研端入口（原 ResearchWorkspace 占位页升级）
 *
 * 科研端是独立工程：前端 D:/科大.../research-app（:5173，Vue3 + OIDC/Keycloak），
 * 后端 research-platform（:18010）。身份体系为 Keycloak OIDC（realm=research），
 * 与平台账号体系（手机号 + JWT）相互独立。
 * 本页负责：身份映射说明 + 真实跳转 + 明确的"独立身份"提示，绝不拿假数据冒充科研端。
 */
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const RESEARCH_URL = 'http://127.0.0.1:5173'
const openResearch = () => { location.assign(RESEARCH_URL) }
const recentErr = ref('')
</script>

<template>
  <div class="rs-entry">
    <header class="rs-top">
      <div class="rs-brand"><span class="rs-mark">ƒ</span>科研端 · 证据原生研究 OS</div>
      <button class="rs-ghost" type="button" @click="$router.push('/hub')">← 返回统一入口</button>
    </header>

    <main class="rs-body">
      <p class="rs-eyebrow">Evidence-Native Research</p>
      <h1 class="rs-title">从研究问题到可复核的成果</h1>
      <p class="rs-sub">
        科研端使用独立身份体系（Keycloak OIDC）。请用科研账号直接登录，
        登录后即回到你的项目、文献、验证与写作工作区。
      </p>

      <section class="rs-card">
        <h2>如何进入</h2>
        <ol class="rs-list">
          <li>点击下方按钮前往科研端独立地址 <code>http://127.0.0.1:5173</code>；</li>
          <li>使用科研账号（Keycloak）完成 OIDC 登录；</li>
          <li>登录后进入 <strong>项目 / 文献 / 验证 / 写作 / 评审 / 运行中心</strong> 六个工作区。</li>
        </ol>
        <button class="rs-go" type="button" @click="openResearch">前往科研端（独立身份登录） →</button>
        <p v-if="recentErr" class="rs-err" role="alert">{{ recentErr }}</p>
      </section>

      <section class="rs-card">
        <h2>身份与数据说明</h2>
        <p class="rs-note">
          科研端账号与加密会话不复制平台令牌、不默认授予管理员权限、不取消鉴权。
          两端数据隔离；跨端数据交接（如教学数据用于教育研究）按授权与去标识规则单独开通。
        </p>
      </section>

      <section class="rs-card">
        <h2>本平台「科研端」状态</h2>
        <ul class="rs-state">
          <li>项目工作台 —— 真实后端（:18010）已接通，创建 / 假设生成 / 确认与驳回 / 刷新找回可操作；</li>
          <li>文献、写作、评审、教育研究 —— 契约缺口已登记在缺陷清单，接通前如实标注，不显示假成功；</li>
          <li>运行中心 —— Temporal 运行记录可查看，按需在科研端推进真实业务活动。</li>
        </ul>
      </section>
    </main>
  </div>
</template>

<style scoped>
.rs-entry { min-height: 100vh; background: var(--ed-wash); color: var(--ed-ink); font-family: var(--ed-font-sans); }
.rs-top { display: flex; align-items: center; justify-content: space-between; padding: 14px 28px; border-bottom: 1px solid var(--ed-line); background: var(--ed-paper-warm); }
.rs-brand { display: flex; align-items: center; gap: 10px; font-weight: 700; }
.rs-mark { font-family: var(--ed-font-serif); font-size: 20px; color: var(--ed-pine); }
.rs-ghost { border: 1px solid var(--ed-line-strong); background: none; border-radius: 6px; padding: 6px 14px; color: var(--ed-ink-2); cursor: pointer; }
.rs-ghost:hover { background: var(--ed-pine-soft); }
.rs-body { max-width: 760px; margin: 0 auto; padding: 42px 24px 70px; }
.rs-eyebrow { font-size: 12px; letter-spacing: 0.18em; color: var(--ed-sienna); text-transform: uppercase; margin: 0 0 10px; }
.rs-title { font-family: var(--ed-font-serif); font-size: 27px; margin: 0 0 10px; font-weight: 600; }
.rs-sub { color: var(--ed-ink-2); margin: 0 0 26px; line-height: 1.7; font-size: 15px; }
.rs-card { background: var(--ed-paper); border: 1px solid var(--ed-line); border-radius: var(--ed-radius-lg); padding: 20px 24px; margin-bottom: 18px; box-shadow: var(--ed-shadow-panel); }
.rs-card h2 { font-size: 16px; margin: 0 0 12px; }
.rs-list { margin: 0 0 16px; padding-left: 20px; line-height: 1.9; font-size: 14px; color: var(--ed-ink-2); }
.rs-card code { background: var(--ed-paper-warm); border: 1px solid var(--ed-line); padding: 1px 6px; border-radius: 4px; font-family: var(--ed-font-mono); font-size: 12px; }
.rs-go { background: var(--ed-pine); color: #fff; border: none; border-radius: 8px; padding: 11px 20px; font-size: 15px; font-weight: 600; cursor: pointer; }
.rs-go:hover { background: var(--ed-pine-hover); }
.rs-err { color: var(--ed-err); font-size: 13px; }
.rs-note { color: var(--ed-ink-2); font-size: 14px; line-height: 1.8; margin: 0; }
.rs-state { margin: 0; padding-left: 20px; color: var(--ed-ink-2); font-size: 14px; line-height: 1.9; }
</style>