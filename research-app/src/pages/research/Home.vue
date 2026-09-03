<script setup lang="ts">
import EmptyState from '@shared/ui/EmptyState.vue';
import Boundary from '@shared/ui/Boundary.vue';
import StatusBadge from '@shared/ui/StatusBadge.vue';
</script>

<template>
  <div class="page">
    <header class="page-head">
      <div>
        <h1>科研首页</h1>
        <p>围绕当前项目安排下一步工作，并在需要确认时保留人工决策。</p>
      </div>
      <div class="actions">
        <button class="btn" type="button">查看演示路径</button>
        <button class="btn primary" type="button">新建科研项目</button>
      </div>
    </header>

    <Boundary tone="info" title="F0 阶段占位说明">
      本页面是 F0 应用壳骨架的占位内容。真实数据接入需等待 Agent 2 的 M0 共享契约（OpenAPI + RunEvent
      SSE）冻结，并通过 Agent 6 的 R0 契约审查打 research-contracts-v0.1.0 标签后，方可生成 OpenAPI
      客户端并接入。F1 阶段将完成该页面的真实数据接入。
    </Boundary>

    <section class="panel continue-work" aria-label="继续当前工作">
      <p class="eyebrow">继续当前工作</p>
      <div class="continue-content">
        <div>
          <h2>演示项目 · 高中数学建模训练论文</h2>
          <p>作者 / 研究者 · 排版与自检。本占位说明展示信息层级与样式基线。</p>
          <div class="meta">
            <StatusBadge state="running" label="占位运行" />
            <span class="muted small">最近更新：刚刚</span>
          </div>
        </div>
        <div>
          <p class="progress-copy">项目进度 0%（占位）</p>
          <div class="progress" aria-label="项目进度 0%">
            <span style="width: 0%" />
          </div>
        </div>
      </div>
    </section>

    <EmptyState
      title="接下来要处理"
      hint="本区块展示 F1 阶段接入的项目状态、AI 管家任务和需关注项目。"
    />
  </div>
</template>

<style scoped>
.page {
  max-width: 1460px;
  margin: 0 auto;
}
.page-head {
  display: flex;
  gap: 18px;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 18px;
}
.page-head h1 {
  font-size: var(--font-size-3xl);
  line-height: 1.25;
  letter-spacing: -0.02em;
  margin: 0 0 6px;
  text-wrap: balance;
}
.page-head p {
  margin: 0;
  color: var(--text-muted);
  max-width: 75ch;
  text-wrap: pretty;
}
.actions {
  display: flex;
  gap: 7px;
  align-items: center;
  flex-wrap: wrap;
}
.btn {
  min-height: 34px;
  padding: 6px 11px;
  border: 1px solid var(--border);
  border-radius: 7px;
  background: var(--surface);
  font-weight: 650;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: var(--text);
  cursor: pointer;
}
.btn:hover {
  background: var(--subtle-bg);
  border-color: #b8c4d5;
}
.btn.primary {
  background: var(--primary);
  border-color: var(--primary);
  color: #fff;
}
.btn.primary:hover {
  background: var(--primary-hover);
}
.continue-work {
  padding: 20px;
  margin-bottom: 16px;
  background: var(--primary-soft);
  border: 1px solid #d3dffb;
  border-radius: var(--r);
}
.continue-work .eyebrow {
  margin: 0 0 5px;
  color: var(--primary);
  font-size: var(--font-size-sm);
  font-weight: 750;
}
.continue-content {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(210px, 0.42fr);
  gap: 24px;
  align-items: end;
}
.continue-content h2 {
  font-size: var(--font-size-2xl);
  margin: 0 0 5px;
}
.continue-content p {
  margin: 0;
  color: var(--muted);
  max-width: 70ch;
}
.meta {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 13px;
}
.muted {
  color: var(--muted);
}
.small {
  font-size: var(--font-size-xs);
}
.progress-copy {
  margin: 0 0 7px;
  text-align: right;
  color: var(--muted);
  font-size: var(--font-size-sm);
}
.progress {
  height: 7px;
  border-radius: 999px;
  background: #e5eaf3;
  overflow: hidden;
}
.progress span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--primary);
}
@media (max-width: 760px) {
  .continue-content {
    grid-template-columns: 1fr;
  }
  .progress-copy {
    text-align: left;
  }
}
</style>
