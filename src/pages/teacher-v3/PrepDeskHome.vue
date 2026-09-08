<template>
  <!-- ============ V3.4 教案首页：本课上下文 → 三个等权起点 → 续接项 → 最近工作 ============ -->
  <div data-testid="tv3-desk-home">
    <!-- 上下文条：只帮教师确认"我现在备哪节课"，不要求先填五件套 -->
    <div class="tv3-card tv3-dh__ctx" data-testid="tv3-home-ctx">
      <div class="tv3-dh__ctx-main">
        <span class="tv3-tag tv3-tag--primary">今天<template v-if="today?.teacher.grade_group"> · {{ today.teacher.grade_group }}</template></span>
        <span v-for="(s, i) in todaySchedule" :key="i" class="tv3-dh__ctx-chip" :title="`课表 · ${s.time}`">
          {{ s.time }} {{ s.class_name }} · {{ s.topic }}<span v-if="s.missing?.length" style="color: var(--tv3-gold-deep)">（{{ s.missing[0] }}）</span>
        </span>
        <span v-if="today?.todos?.length" class="tv3-tag">待办 {{ today.todos.length }} 项</span>
        <span v-if="!today" class="tv3-tag">课表加载中…</span>
      </div>
      <span class="tv3-tag" style="font-size: 10px" title="课表与班情为演示数据，未接入真实教务">课表/班情为演示数据</span>
    </div>

    <!-- 三个视觉等权入口：尺寸/色彩/位置/交互成本一致；AI 不更大不更亮、输入默认折叠 -->
    <div class="tv3-dh__entries">
      <!-- ① 继续已有工作（本轮重点走通） -->
      <section class="tv3-dh__card" data-testid="tv3-entry-resume">
        <div class="tv3-dh__card-kicker">从旧课 / 共案出发</div>
        <h3 class="tv3-dh__card-title">继续已有工作</h3>
        <p class="tv3-dh__card-desc">打开去年的课或备课组共案，为明天的班做二次备课：原内容保留，只改要改的，每处修改留理由。</p>
        <div class="tv3-dh__card-next">
          <!-- 任务驱动（清单5）：首行锚定明天真实要上的那节课（演示课表），再给续备状态 -->
          <div v-if="!resumeLesson" class="tv3-dh__empty">暂无续备课例——可先「从教材开始」建一份空白共备稿。</div>
          <template v-else>
            <div class="tv3-dh__next-line" data-testid="tv3-resume-task">
              <span class="tv3-dh__next-dot" />{{ nextTask ? `明天 ${nextTask.time} · ${nextTask.class_name}` : '下节课时间待定' }}《{{ resumeLesson.topic }}》
            </div>
            <div class="tv3-dh__next-line tv3-dh__next-line--minor">
              <span class="tv3-dh__next-dot tv3-dh__next-dot--minor" />去年同课已就绪 · 上次停留：{{ resumeLesson.lastStop || '例题 · 例 1' }}
            </div>
            <div class="tv3-dh__next-line tv3-dh__next-line--minor">
              <span class="tv3-dh__next-dot tv3-dh__next-dot--minor" />备课组共案 v3 有 2 处变动（演示）
            </div>
          </template>
        </div>
        <button class="tv3-btn tv3-btn--primary tv3-dh__card-cta" data-testid="tv3-entry-resume-go" :disabled="!resumeLesson" @click="$emit('continue', resumeLesson!.id)">
          备明天这节课 · 打开共备桌
        </button>
      </section>

      <!-- ② 从教材开始 -->
      <section class="tv3-dh__card" data-testid="tv3-entry-textbook">
        <div class="tv3-dh__card-kicker">从教材出发</div>
        <h3 class="tv3-dh__card-title">从教材开始</h3>
        <p class="tv3-dh__card-desc">翻看教材页（当前为演示教材页），边读边把定义、例题引用进一份空白共备稿。不进入生成向导。</p>
        <div class="tv3-dh__card-next">
          <div class="tv3-dh__next-line">
            <span class="tv3-dh__next-dot" />人教A版选择性必修一 · §2.2 椭圆（演示教材页 P38–41）
          </div>
          <div class="tv3-dh__next-line tv3-dh__next-line--minor">
            <span class="tv3-dh__next-dot tv3-dh__next-dot--minor" />正式教材全文需授权后接入（IFC）
          </div>
        </div>
        <button class="tv3-btn tv3-btn--primary tv3-dh__card-cta" data-testid="tv3-entry-textbook-go" @click="$emit('textbook')">
          打开演示教材页 · 开空白共备稿
        </button>
      </section>

      <!-- ③ 让 AI 帮我起个头（可选入口：同等大小，不预选，不自动聚焦，无首页生成主按钮） -->
      <section class="tv3-dh__card" data-testid="tv3-entry-ai">
        <div class="tv3-dh__card-kicker">可选入口 <span class="tv3-tag" style="font-size: 10px">未接真实模型</span></div>
        <h3 class="tv3-dh__card-title">让 AI 帮我起个头</h3>
        <p class="tv3-dh__card-desc">描述想法或上传材料，AI 生成一份可编辑起稿；你逐步把关。适合从零开始的新课，二备请优先用左侧入口。</p>
        <div class="tv3-dh__card-next">
          <div class="tv3-dh__next-line">
            <span class="tv3-dh__next-dot" />五件套 → 大纲确认 → 逐环节成稿（本机演示链路）
          </div>
          <div class="tv3-dh__next-line tv3-dh__next-line--minor">
            <span class="tv3-dh__next-dot tv3-dh__next-dot--minor" />输入框在进入后展开，本页不预填、不聚焦
          </div>
        </div>
        <button class="tv3-btn tv3-btn--primary tv3-dh__card-cta" data-testid="tv3-prep-new" @click="$emit('ai')">
          进入 AI 起稿（可选）
        </button>
      </section>
    </div>

    <!-- 最近工作：真实下一步可直接打开；空状态如实呈现 -->
    <div class="tv3-card" style="margin-top: 14px" data-testid="tv3-home-recent">
      <div class="tv3-card__head">
        <span class="tv3-card__title">最近工作</span>
        <span class="tv3-card__sub">{{ plans.length ? `${plans.length} 份教案 · 点击继续编辑` : '暂无记录' }}</span>
      </div>
      <div class="tv3-card__body" style="display: flex; flex-direction: column; gap: 8px">
        <div v-if="!plans.length" class="tv3-dh__empty" data-testid="tv3-home-recent-empty">还没有教案记录。上面的三个入口都可以开始今天的备课。</div>
        <div v-for="p in plans" :key="p.id" class="tv3-row" style="cursor: pointer" @click="$emit('open-plan', p.id)">
          <span class="tv3-tag" :class="p.confirmed ? 'tv3-tag--ok' : 'tv3-tag--warn'">{{ p.confirmed ? '已确认' : '草稿' }}</span>
          <div style="flex: 1; min-width: 0">
            <div style="font-size: 14px; font-weight: 600">{{ p.topic }}</div>
            <div style="font-size: 11.5px; color: var(--tv3-ink3)">{{ p.lesson_type }} · {{ p.section_count }} 个环节 · 更新于 {{ p.updated_at }}</div>
          </div>
          <span style="color: var(--tv3-ink4)">›</span>
        </div>
      </div>
    </div>

    <div style="margin-top: 10px; font-size: 11px; color: var(--tv3-ink4); line-height: 1.7">
      本页为前端验证原型：续备课例、课表、班情均为演示数据（本机保存，刷新可恢复）；不宣称真实班情理解、教材授权或导出能力。
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * V3.4 教案首页（PrepDeskHome）：三等权起点 + 上下文条 + 最近工作。
 * 三卡尺寸/色彩/位置/交互成本一致；AI 卡不大不亮、输入折叠；首页无"生成教案"主按钮。
 */
import { computed, onMounted, ref } from 'vue'
import { v3Api } from '@/api/teacherV3'
import type { V3TodayData } from '@/types/teacherV3'
import { usePrepDesk } from './prepDesk'
import type { V3PlanSummary } from '@/api/teacherV3'

defineProps<{ plans: V3PlanSummary[] }>()
const emit = defineEmits<{ (e: 'continue', lessonId: string): void; (e: 'textbook'): void; (e: 'ai'): void; (e: 'open-plan', id: string): void }>()
void emit

/* M3 接真：今日课表/待办来自 catalog/today（mock 模式= 演示数据，真实模式= 服务端数据）；加载失败留空不阻塞首页 */
const today = ref<V3TodayData | null>(null)
onMounted(async () => {
  try { today.value = (await v3Api.catalog.today()).data } catch { today.value = null }
})
const todaySchedule = computed(() => today.value?.schedule || [])

const desk = usePrepDesk()
/** 续接项：默认给"去年同课"（最近更新的非空白课例） */
const resumeLesson = computed(() => {
  const real = desk.state.lessons.filter((l) => l.originLabel.includes('去年课例'))
  return real[0] || desk.state.lessons[0] || null
})

/** 任务锚定（清单5）：课表里下一节与续备课例同课题的课 */
const nextTask = computed(() => {
  const sched = todaySchedule.value
  const t = sched.find((s) => resumeLesson.value && s.topic === resumeLesson.value.topic && s.status !== 'done')
  return t || sched.find((s) => s.status !== 'done') || null
})
</script>

<style scoped>
.tv3-dh__ctx { display: flex; align-items: center; gap: 10px; padding: 10px 14px; flex-wrap: wrap; }
.tv3-dh__ctx-main { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; flex: 1; min-width: 0; }
.tv3-dh__ctx-chip {
  font-size: 11.5px; color: var(--tv3-ink2); background: var(--tv3-bg2, #f4f6fa);
  border: 1px solid var(--tv3-line); border-radius: 999px; padding: 2px 10px;
  max-width: 320px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.tv3-dh__entries { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin-top: 14px; }
@media (max-width: 1100px) { .tv3-dh__entries { grid-template-columns: 1fr; } }
.tv3-dh__card {
  display: flex; flex-direction: column; gap: 8px;
  background: var(--tv3-card, #fff); border: 1px solid var(--tv3-line); border-radius: 14px;
  border-top: 3px solid var(--tv3-primary, #4f46e5);
  padding: 14px 16px; min-height: 236px;
}
.tv3-dh__card-kicker { font-size: 11px; color: var(--tv3-ink3); display: flex; align-items: center; gap: 6px; }
.tv3-dh__card-title { margin: 0; font-size: 15.5px; font-weight: 700; color: var(--tv3-ink, #16233b); }
.tv3-dh__card-desc { margin: 0; font-size: 12px; color: var(--tv3-ink2); line-height: 1.7; flex: 1; }
.tv3-dh__card-next { display: flex; flex-direction: column; gap: 4px; padding: 8px 10px; background: var(--tv3-bg2, #f4f6fa); border-radius: 10px; }
.tv3-dh__next-line { display: flex; align-items: baseline; gap: 6px; font-size: 12px; color: var(--tv3-ink2); line-height: 1.6; }
.tv3-dh__next-line--minor { color: var(--tv3-ink3); font-size: 11.5px; }
.tv3-dh__next-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--tv3-primary, #4f46e5); flex-shrink: 0; transform: translateY(-2px); }
.tv3-dh__next-dot--minor { background: var(--tv3-ink4, #9aa5b5); }
.tv3-dh__next-sub { color: var(--tv3-ink3); font-size: 11px; }
.tv3-dh__card-cta { width: 100%; justify-content: center; }
.tv3-dh__empty { font-size: 12px; color: var(--tv3-ink3); padding: 6px 2px; line-height: 1.7; }
</style>
