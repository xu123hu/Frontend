<template>
  <div class="pgn">
    <div class="ailp-blob" style="width:500px;height:500px;background:#c7d2fe;top:-150px;left:-100px"></div>
    <div class="ailp-blob" style="width:400px;height:400px;background:#a5f3fc;top:300px;right:-100px;opacity:0.3"></div>
    <div class="pgn-main">
      <div class="pgn-center ailp-fade">
        <div class="pgn-icon">
          <div class="pgn-icon__ring" />
          <div class="pgn-icon__pulse" />
          <div class="pgn-icon__pulse" style="animation-delay:1s" />
          <div class="pgn-icon__core">✦</div>
        </div>
        <h2>AI 正在为你生成教案...</h2>
        <p>{{ chain.brief?.topic }} · {{ chain.brief?.courseType }} · {{ chain.brief?.duration }}分钟</p>
        <p class="ailp-honest" style="margin-top:10px">原型：演示进度流 + 确定性大纲编排（真实生成属后端 M2）</p>

        <div class="pgn-card">
          <div v-for="(s, i) in STEPS" :key="s.name" class="pgn-step" :class="stepCls(i)">
            <div class="pgn-step__dot" :class="stepCls(i)">
              <span v-if="i < current">✓</span>
              <i v-else-if="i === current" class="pgn-step__live" />
              <span v-else class="pgn-step__pendingdot" />
            </div>
            <div class="pgn-step__body">
              <div class="pgn-step__row">
                <b :class="{ 'is-active': i === current, 'is-done': i < current }">{{ s.name }}</b>
                <span v-if="i < current" class="pgn-step__state is-done">已完成</span>
                <span v-else-if="i === current" class="pgn-step__state is-run">生成中</span>
              </div>
              <div v-if="i === current" class="pgn-step__bar"><i /></div>
            </div>
          </div>
          <div class="pgn-eta">⏱ 预计还需 <b>{{ remaining }}</b> 秒（演示计时）</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * PrepGenerating —— AI 生成中（P，用户定稿 HTML 移植）
 * 六步演示进度（分析教材→…→板书作业），期间真实调用 generation/planOutline，
 * 完成后 setOutline 进入大纲确认。诚实标注：进度为演示流。
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { v3Api } from '@/api/teacherV3'
import { setOutline, usePrepChain } from './prepChain'

const chain = usePrepChain()
const STEPS = [
  { name: '分析教材与知识点' },
  { name: '匹配教案模板结构' },
  { name: '生成教学目标与重难点' },
  { name: '设计教学过程各环节' },
  { name: '选配例题与习题' },
  { name: '生成板书与作业设计' },
]
const current = ref(0)
const remaining = ref(10)
let timer: number | undefined
let etaTimer: number | undefined
let done = false

const stepCls = (i: number) => (i < current.value ? 'completed' : i === current.value ? 'current' : 'pending')

onMounted(async () => {
  /* 真实请求与演示进度并行：outline 返回后随进度走完进入确认页 */
  const req = (async () => {
    try {
      const r = await v3Api.generation.planOutline({
        topic: chain.brief?.topic || '未命名备课',
        class_id: chain.brief?.classId || 'c2-05',
        lesson_type: chain.brief?.courseType || '新授课',
        template_id: chain.brief?.templateId || 'lt-explorer',
        textbook_version: chain.brief?.textbook,
        chapter: chain.brief?.chapter,
        duration: chain.brief?.duration,
        requirements: chain.brief?.requirements,
        extra_requirements: chain.brief?.requirements.join('；'),
        example_source: 'bank',
      } as any)
      return r.data
    } catch {
      return null
    }
  })()

  timer = window.setInterval(() => {
    if (current.value < STEPS.length - 1) current.value += 1
    else if (!done) {
      done = true
      window.clearInterval(timer)
      window.clearInterval(etaTimer)
      void req.then((data) => {
        const d = (data || {
          topic: chain.brief?.topic, duration: chain.brief?.duration || 45, total_minutes: 45,
          sections: [], notes: ['mock 未启动：已回退演示大纲'],
        }) as any
        setOutline({
          topic: d.topic, duration: d.duration, sections: d.sections || [], total_minutes: d.total_minutes,
          notes: d.notes || [], objectives: d.objectives, keypoints: d.keypoints,
          blackboard: d.blackboard, homework: d.homework,
        })
      })
    }
  }, 1100)
  etaTimer = window.setInterval(() => { if (remaining.value > 0) remaining.value -= 1 }, 1000)
})
onBeforeUnmount(() => { window.clearInterval(timer); window.clearInterval(etaTimer) })
void computed
</script>

<style scoped>
.pgn { min-height: calc(100vh - 56px); display: flex; align-items: flex-start; justify-content: center; }
.pgn-main { width: 100%; max-width: 640px; padding: 60px 24px 60px; }
.pgn-center { text-align: center; }
.pgn-icon { position: relative; width: 110px; height: 110px; margin: 0 auto 26px; }
.pgn-icon__ring { position: absolute; inset: -12px; border-radius: 50%; background: conic-gradient(from 0deg, rgba(79, 70, 229, 0.12), rgba(6, 182, 212, 0.4), rgba(139, 92, 246, 0.3), rgba(79, 70, 229, 0.12)); filter: blur(8px); animation: ailp-spin 8s linear infinite; }
.pgn-icon__pulse { position: absolute; inset: -18px; border-radius: 50%; border: 2px solid rgba(99, 102, 241, 0.3); animation: ailp-pulse 2s ease-out infinite; }
.pgn-icon__core { position: absolute; inset: 0; border-radius: 50%; display: grid; place-items: center; font-size: 40px; color: #fff; background: linear-gradient(135deg, #4f46e5, #7c3aed 50%, #06b6d4); box-shadow: 0 8px 32px rgba(79, 70, 229, 0.4); animation: ailp-pulse 2.4s ease-in-out infinite; }
.pgn-center h2 { font-size: 26px; font-weight: 800; margin-bottom: 8px; }
.pgn-center > p { color: var(--ailp-gray-500); font-size: 14px; }
.pgn-card { margin-top: 30px; background: rgba(255, 255, 255, 0.9); border: 1px solid var(--ailp-gray-200); border-radius: 18px; box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08); padding: 18px; text-align: left; display: flex; flex-direction: column; gap: 4px; }
.pgn-step { display: flex; align-items: center; gap: 13px; padding: 12px 14px; border-radius: 13px; }
.pgn-step.completed { background: rgba(16, 185, 129, 0.06); }
.pgn-step.current { background: linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(6, 182, 212, 0.06)); border: 1px solid rgba(99, 102, 241, 0.16); }
.pgn-step.pending { opacity: 0.5; }
.pgn-step__dot { width: 26px; height: 26px; border-radius: 50%; display: grid; place-items: center; flex-shrink: 0; font-size: 11px; color: #fff; background: var(--ailp-gray-200); position: relative; }
.pgn-step__dot.completed { background: var(--ailp-success-500); }
.pgn-step__dot.current { background: linear-gradient(135deg, #4f46e5, #06b6d4); }
.pgn-step__live { width: 8px; height: 8px; border-radius: 50%; background: #fff; animation: ailp-progress-dot 1.3s ease-in-out infinite; }
.pgn-step__pendingdot { width: 6px; height: 6px; border-radius: 50%; background: var(--ailp-gray-400); }
.pgn-step__body { flex: 1; }
.pgn-step__row { display: flex; align-items: center; justify-content: space-between; }
.pgn-step__row b { font-size: 13px; color: var(--ailp-gray-500); font-weight: 600; }
.pgn-step__row b.is-active { color: var(--ailp-primary-700); }
.pgn-step__row b.is-done { color: var(--ailp-gray-800); }
.pgn-step__state { font-size: 11px; font-weight: 600; }
.pgn-step__state.is-done { color: var(--ailp-success-600); }
.pgn-step__state.is-run { color: var(--ailp-primary-600); }
.pgn-step__bar { height: 4px; border-radius: 2px; background: var(--ailp-gray-100); overflow: hidden; margin-top: 8px; }
.pgn-step__bar i { display: block; height: 100%; width: 55%; border-radius: 2px; background: linear-gradient(90deg, #4f46e5, #06b6d4); position: relative; overflow: hidden; }
.pgn-step__bar i::after { content: ''; position: absolute; inset: 0; background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.5), transparent); background-size: 200% 100%; animation: ailp-shimmer 1.8s linear infinite; }
.pgn-eta { margin-top: 16px; padding-top: 14px; border-top: 1px solid var(--ailp-gray-200); text-align: center; font-size: 12.5px; color: var(--ailp-gray-500); }
.pgn-eta b { color: var(--ailp-primary-600); }
</style>
