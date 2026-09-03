<template>
  <div data-testid="tv3-assign">
    <!-- 作业列表 -->
    <div v-if="!assignment" class="tv3-card">
      <div class="tv3-card__head">
        <span class="tv3-card__title">作业与批改</span>
        <span class="tv3-card__sub">按题聚类 · 原图对照 · AI 起草反馈教师审定</span>
      </div>
      <div class="tv3-card__body" style="display: flex; flex-direction: column; gap: 8px">
        <div v-for="a in assignments" :key="a.id" class="tv3-row" style="cursor: pointer" @click="openAssignment(a.id)">
          <span class="tv3-tag tv3-tag--primary">{{ a.class_name }}</span>
          <div style="flex: 1">
            <div style="font-size: 14px; font-weight: 600">{{ a.title }}</div>
            <div style="font-size: 11.5px; color: var(--tv3-ink3)">提交 {{ a.submitted }}/{{ a.total }} · 已批 {{ a.graded }}</div>
          </div>
          <div class="tv3-fillbar" style="max-width: 180px"><div class="tv3-fillbar__bar" :class="a.graded / Math.max(1, a.submitted) > 0.9 ? 'tv3-fillbar__bar--ok' : 'tv3-fillbar__bar--warn'" :style="{ width: (a.graded / Math.max(1, a.submitted)) * 100 + '%' }" /></div>
          <span style="color: var(--tv3-ink4)">›</span>
        </div>
      </div>
    </div>

    <!-- 批改工作区 -->
    <template v-else>
      <div class="tv3-card" style="margin-bottom: 14px">
        <div class="tv3-card__head">
          <button class="tv3-btn tv3-btn--sm" @click="assignment = null">← 作业列表</button>
          <span class="tv3-card__title">{{ assignment.title }}</span>
          <span class="tv3-tag">{{ assignment.submitted }}/{{ assignment.total }} 提交</span>
          <span class="tv3-tag tv3-tag--ok">{{ assignment.graded }} 已批</span>
          <div class="tv3-card__spacer" />
          <button class="tv3-btn tv3-btn--sm tv3-btn--gold" data-testid="tv3-review-pack" @click="genReview">✦ 生成讲评课件</button>
        </div>
        <div class="tv3-card__body" style="display: flex; align-items: center; gap: 14px">
          <div class="tv3-seg" data-testid="tv3-grading-seg">
            <button class="tv3-seg__btn" :class="{ 'is-active': gview === 'byQuestion' }" @click="gview = 'byQuestion'">按题聚类</button>
            <button class="tv3-seg__btn" :class="{ 'is-active': gview === 'byStudent' }" @click="gview = 'byStudent'">按人</button>
            <button class="tv3-seg__btn" :class="{ 'is-active': gview === 'byTier' }" @click="gview = 'byTier'">分层</button>
          </div>
          <span style="font-size: 12px; color: var(--tv3-ink3)">AI 错因标签已预标注（ai-flag），教师核对原图后确认</span>
          <div v-if="reviewProgress < 100 && reviewProgress > 0" style="flex: 1; max-width: 260px">
            <div class="tv3-progress"><div class="tv3-progress__bar" :style="{ width: reviewProgress + '%' }" /></div>
            <div style="font-size: 11px; color: var(--tv3-ink3); margin-top: 3px" data-testid="tv3-review-stage">{{ reviewStage }}</div>
          </div>
          <span v-else-if="reviewDone" class="tv3-tag tv3-tag--ok">讲评课件已生成 → 课件工坊</span>
        </div>
      </div>

      <!-- ============ 视图1：按题聚类 ============ -->
      <div v-if="gview === 'byQuestion'" class="tv3-grading" data-testid="tv3-byquestion">
        <div style="width: 380px; flex-shrink: 0; display: flex; flex-direction: column; gap: 8px">
          <div
            v-for="q in assignment.questions" :key="q.q_no"
            class="tv3-card tv3-qcard" :class="{ 'is-open': openQ === q.q_no }"
            style="padding: 12px" data-testid="tv3-qcard"
            @click="openQ = openQ === q.q_no ? -1 : q.q_no"
          >
            <div style="display: flex; align-items: center; gap: 10px">
              <div class="tv3-ring" :style="{ '--p': q.accuracy * 100, '--rc': q.accuracy > 0.75 ? 'var(--tv3-teal)' : q.accuracy > 0.5 ? 'var(--tv3-amber)' : 'var(--tv3-rose)' }">
                <span class="tv3-ring__num">{{ Math.round(q.accuracy * 100) }}</span>
              </div>
              <div style="flex: 1; min-width: 0">
                <div style="font-size: 13px; font-weight: 700">第 {{ q.q_no }} 题 <span style="font-weight: 400; color: var(--tv3-ink3)">满分 {{ q.full_score }}</span></div>
                <div style="font-size: 11px; color: var(--tv3-ink3); white-space: nowrap; overflow: hidden; text-overflow: ellipsis" v-html="renderLatex(q.stem_latex)" />
              </div>
            </div>
            <div style="margin-top: 8px" class="tv3-errbar">
              <div
                v-for="(e, i) in q.error_dist" :key="i" class="tv3-errbar__seg"
                :title="`${e.tag} × ${e.count}`"
                :style="{ width: (e.count / Math.max(...q.error_dist.map((x) => x.count), 1)) * 100 + '%', background: ERR_COLORS[i % ERR_COLORS.length] }"
              />
            </div>
            <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-top: 6px">
              <span v-for="(e, i) in q.error_dist" :key="i" class="tv3-tag" :style="{ fontSize: '10px' }">{{ e.tag }} ×{{ e.count }}</span>
            </div>
          </div>
        </div>

        <!-- 聚类详情 -->
        <div style="flex: 1; min-width: 0" v-if="openQ >= 0">
          <div class="tv3-card">
            <div class="tv3-card__head">
              <span class="tv3-card__title">第 {{ openQ }} 题 · 答案聚类</span>
              <span class="tv3-card__sub">同类答案聚合，一次批一类</span>
            </div>
            <div class="tv3-card__body">
              <!-- 题干（可编辑，MathLive） -->
              <div class="tv3-form-label">题干（点击可编辑 · 结构化公式）</div>
              <MathField :model-value="currentQ?.stem_latex" readonly :font-size="17" style="margin-bottom: 14px" />
              <div v-if="!currentQ">无数据</div>

              <div v-for="c in currentQ?.clusters || []" :key="c.id" class="tv3-cluster" :data-kind="c.kind">
                <div class="tv3-cluster__head">
                  <span class="tv3-tag" :class="kindClass(c.kind)">{{ kindLabel(c.kind) }}</span>
                  <span v-if="c.tag" class="tv3-tag tv3-tag--warn">{{ c.tag }}</span>
                  <span style="font-family: var(--tv3-font-num); font-size: 13px; font-weight: 700">{{ c.count }} 人</span>
                  <div class="tv3-card__spacer" />
                  <button class="tv3-btn tv3-btn--sm tv3-btn--primary" @click="expandCluster = expandCluster === c.id ? '' : c.id">
                    {{ expandCluster === c.id ? '收起样例' : '查看样例' }}
                  </button>
                </div>
                <div v-if="expandCluster === c.id" class="tv3-cluster__samples">
                  <div v-for="(s, si) in c.sample" :key="si" class="tv3-cluster__sample">
                    <!-- 原图对照（红线 R4：原图始终在生成内容旁） -->
                    <div class="tv3-sample__photo">
                      <img :src="samplePhoto(s.photo_region, c.kind)" alt="学生答卷原图">
                      <div class="tv3-sample__region" :style="regionStyle(s.photo_region)" />
                      <span class="tv3-sample__name">{{ s.student }} · {{ s.score }}/{{ currentQ?.full_score }}</span>
                    </div>
                    <!-- 识别步骤（可校正状态） -->
                    <div class="tv3-sample__steps">
                      <div style="font-size: 11px; color: var(--tv3-ink3); margin-bottom: 4px">识别步骤（点击公式可进入编辑）</div>
                      <div v-for="(st, ti) in s.recognized_steps" :key="ti" class="tv3-sample__step">
                        <span class="tv3-stepflag" :data-status="st.status">{{ st.status === 'ok' ? '✓' : st.status === 'ai-flag' ? '⚑ AI 标注' : '✎ 已校正' }}</span>
                        <span class="tv3-sample__latex" v-html="renderLatex(st.latex)" />
                      </div>
                      <div v-if="!s.recognized_steps.length" style="font-size: 12px; color: var(--tv3-ink4)">（空白卷 · 未作答）</div>
                      <!-- 反馈：AI 起草教师审定 -->
                      <div class="tv3-form-label" style="margin-top: 8px">评语（AI 起草 · 教师审定后生效）</div>
                      <textarea v-model="s.feedback" class="tv3-textarea" rows="2" style="font-size: 12px" placeholder="AI 将按聚类错因起草，可修改" />
                    </div>
                  </div>
                  <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px">
                    <button class="tv3-btn tv3-btn--sm tv3-btn--gold" :data-testid="`tv3-confirm-cluster-${c.id}`" @click="confirmCluster(c)">
                      ✓ 确认批注（应用到 {{ c.count }} 人）
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ============ 视图2：按人 ============ -->
      <div v-else-if="gview === 'byStudent'" class="tv3-card" data-testid="tv3-bystudent">
        <div class="tv3-card__head">
          <span class="tv3-card__title">按学生查看</span>
          <span class="tv3-card__sub">{{ students.length }} 名学生 · 分数来自已批题目</span>
        </div>
        <div class="tv3-card__body" style="overflow-x: auto">
          <table class="tv3-table">
            <thead>
              <tr>
                <th style="text-align: left">学生</th>
                <th v-for="q in assignment.questions" :key="q.q_no">第 {{ q.q_no }} 题</th>
                <th>总分</th>
                <th style="text-align: left">错因标签</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="st in students" :key="st.name">
                <td style="font-weight: 600">{{ st.name }}</td>
                <td v-for="q in assignment.questions" :key="q.q_no" class="tv3-table__score" :data-tone="scoreTone(st.scores[q.q_no], q.full_score)">{{ st.scores[q.q_no] ?? '—' }}</td>
                <td style="font-family: var(--tv3-font-num); font-weight: 700">{{ st.total }}</td>
                <td><span v-for="t in st.weak" :key="t" class="tv3-tag tv3-tag--danger" style="font-size: 10px; margin-right: 4px">{{ t }}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ============ 视图3：分层 ============ -->
      <div v-else class="tv3-card" data-testid="tv3-bytier">
        <div class="tv3-card__head">
          <span class="tv3-card__title">分层视图</span>
          <span class="tv3-card__sub">A 掌握扎实 / B 基本掌握 / C 需重点辅导</span>
        </div>
        <div class="tv3-card__body" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px">
          <div v-for="t in assignment.tiers" :key="t.tier" class="tv3-tier" :data-tier="t.tier">
            <div class="tv3-tier__head">
              <span class="tv3-tier__badge">{{ t.tier }}</span>
              <div>
                <div style="font-size: 13px; font-weight: 700">{{ t.label }}</div>
                <div style="font-size: 11.5px; color: var(--tv3-ink3)">平均正确率 {{ Math.round(t.accuracy * 100) }}%</div>
              </div>
            </div>
            <div class="tv3-tier__students">
              <div v-for="s in t.students" :key="s.name" class="tv3-tier__student">
                <span style="font-weight: 600">{{ s.name }}</span>
                <span style="font-family: var(--tv3-font-num); color: var(--tv3-ink3)">{{ s.avg }}</span>
                <div style="flex: 1" />
                <span v-for="w in s.weak_tags" :key="w" class="tv3-tag tv3-tag--danger" style="font-size: 10px">{{ w }}</span>
              </div>
            </div>
            <div class="tv3-tier__action">
              <button class="tv3-btn tv3-btn--sm" @click="pushTierTask(t.tier)">按层布置变式作业</button>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
/**
 * AssignView —— 作业与批改（SPEC §7 三视图）
 * byQuestion：按题聚类（correct/partial/wrong/blank），样例区原图对照 + 识别步骤可校正 + AI 评语审定
 * byStudent：按人汇总（题目 × 学生分数矩阵 + 错因标签）
 * byTier：A/B/C 分层 + 按层布置变式作业
 * 讲评课件：SSE 逐题生成（错误率 → 讲评页），完成后跳转提示
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { v3Api } from '@/api/teacherV3'
import { renderLatex } from '@/components/mathx/latex'
import MathField from '@/components/mathx/MathField.vue'
import type { V3GradingAssignment, V3GradingView } from '@/types/teacherV3'

const assignments = ref<{ id: string; title: string; class_id: string; class_name: string; submitted: number; total: number; graded: number; updated_at: string }[]>([])
const assignment = ref<V3GradingAssignment | null>(null)
const gview = ref<V3GradingView>('byQuestion')
const openQ = ref(-1)
const expandCluster = ref('')
const reviewProgress = ref(0)
const reviewStage = ref('')
const reviewDone = ref(false)
let sseCtrl: { abort: () => void } | null = null

const ERR_COLORS = ['#dc2646', '#b45309', '#7c3aed', '#0e9488', '#64748b', '#0f4787']
const PHOTO_BASE = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 160"><rect width="300" height="160" fill="#fdfaf2"/>` +
  `<text x="16" y="30" font-family="KaiTi,serif" font-size="14" fill="#3a352c">解：f'(x)=3x²−6x=3x(x−2)</text>` +
  `<text x="16" y="62" font-family="KaiTi,serif" font-size="14" fill="#3a352c">令 f'(x)&lt;0</text>` +
  `<text x="16" y="94" font-family="KaiTi,serif" font-size="14" fill="#7a2d2d">∴ 0＜x＜−2</text>` +
  `<text x="16" y="132" font-family="KaiTi,serif" font-size="14" fill="#3a352c">答：递减区间为(0,−2)</text>` +
  `<text x="150" y="152" font-size="9" fill="#b9ac8f" text-anchor="middle">· 学生手写卷面（mock）·</text></svg>`)

const currentQ = computed(() => assignment.value?.questions.find((q) => q.q_no === openQ.value) ?? null)

const students = computed(() => {
  if (!assignment.value) return []
  const map = new Map<string, { name: string; scores: Record<number, number>; weak: string[] }>()
  for (const q of assignment.value.questions) {
    for (const c of q.clusters) {
      for (const s of c.sample) {
        if (!map.has(s.student)) map.set(s.student, { name: s.student, scores: {}, weak: [] })
        const st = map.get(s.student)!
        st.scores[q.q_no] = s.score
        if (c.tag && !st.weak.includes(c.tag)) st.weak.push(c.tag)
      }
    }
  }
  for (const t of assignment.value.tiers) {
    for (const s of t.students) {
      if (!map.has(s.name)) map.set(s.name, { name: s.name, scores: {}, weak: s.weak_tags })
    }
  }
  return [...map.values()].map((s) => ({ ...s, total: Object.values(s.scores).reduce((a, b) => a + b, 0) }))
    .sort((a, b) => b.total - a.total)
})

onMounted(async () => {
  try {
    const r = await v3Api.grading.assignments()
    assignments.value = r.data.items
  } catch { /* mock */ }
})
onBeforeUnmount(() => sseCtrl?.abort())

async function openAssignment(id: string) {
  try {
    const r = await v3Api.grading.assignment(id)
    assignment.value = r.data
    openQ.value = r.data.questions[0]?.q_no ?? -1
    expandCluster.value = ''
  } catch { /* mock */ }
}

const kindLabel = (k: string) => ({ correct: '全对', partial: '部分正确', wrong: '典型错误', blank: '空白' } as Record<string, string>)[k] || k
const kindClass = (k: string) => ({ correct: 'tv3-tag--ok', partial: 'tv3-tag--warn', wrong: 'tv3-tag--danger', blank: '' } as Record<string, string>)[k] || ''
const samplePhoto = (_r: unknown, kind: string) => (kind === 'blank' ? PHOTO_BASE.replace('0＜x＜−2', '（未作答）') : PHOTO_BASE)
const regionStyle = (r: { x: number; y: number; w: number; h: number }) => ({
  left: `${r.x * 100}%`, top: `${r.y * 100}%`, width: `${r.w * 100}%`, height: `${r.h * 100}%`,
})
const scoreTone = (v: number | undefined, full: number) => (v === undefined ? 'none' : v / full > 0.8 ? 'good' : v / full > 0.5 ? 'mid' : 'bad')

async function confirmCluster(c: { id: string; sample: { feedback?: string }[] }) {
  if (!assignment.value) return
  const fb = c.sample[0]?.feedback || ''
  try { await v3Api.grading.confirmCluster(assignment.value.id, c.id, { feedback: fb }) } catch { /* mock */ }
}

async function genReview() {
  if (!assignment.value) return
  reviewProgress.value = 4
  reviewStage.value = '统计错误分布…'
  try {
    sseCtrl = v3Api.grading.reviewPack(assignment.value.id, (event, data) => {
      if (event === 'meta') { reviewStage.value = `${data.questions} 题待生成讲评页`; reviewProgress.value = 10 }
      else if (event === 'slide') {
        reviewStage.value = `第 ${data.q_no} 题：正确率 ${Math.round(data.accuracy * 100)}%，主错因「${data.top_error}」`
        reviewProgress.value = Math.min(92, 10 + (data.index + 1) * 26)
      } else if (event === 'done') {
        reviewProgress.value = 100
        reviewDone.value = true
        reviewStage.value = '完成'
      }
    })
  } catch { reviewStage.value = '生成失败（mock 未启动）' }
}

function pushTierTask(tier: 'A' | 'B' | 'C') {
  const label = tier === 'A' ? '挑战变式（B、C 组同学可选做）' : tier === 'B' ? '巩固变式（针对步骤缺失）' : '基础重练 + 面批预约'
  reviewStage.value = `已按 ${tier} 层布置：${label}`
}
</script>

<style scoped>
.tv3-cluster { border: 1px solid var(--tv3-line); border-radius: 12px; padding: 10px 12px; margin-bottom: 10px; }
.tv3-cluster[data-kind='correct'] { background: linear-gradient(90deg, var(--tv3-teal-soft), transparent 60%); }
.tv3-cluster[data-kind='wrong'] { background: linear-gradient(90deg, var(--tv3-rose-soft), transparent 60%); }
.tv3-cluster[data-kind='blank'] { opacity: 0.85; }
.tv3-cluster__head { display: flex; align-items: center; gap: 8px; }
.tv3-cluster__samples { margin-top: 10px; display: flex; flex-direction: column; gap: 10px; }
.tv3-cluster__sample { display: flex; gap: 14px; padding: 10px; background: #fff; border: 1px solid var(--tv3-line2); border-radius: 10px; }
.tv3-sample__photo { position: relative; width: 260px; flex-shrink: 0; border-radius: 8px; overflow: hidden; border: 1px solid var(--tv3-gold-border); background: #fffdf6; }
.tv3-sample__photo img { width: 100%; display: block; }
.tv3-sample__region { position: absolute; border: 2px solid var(--tv3-gold); border-radius: 4px; box-shadow: 0 0 0 200px rgba(201, 151, 53, 0.08); pointer-events: none; }
.tv3-sample__name {
  position: absolute; left: 6px; top: 6px; font-size: 11px; font-weight: 700;
  background: rgba(10, 53, 104, 0.82); color: #fff; border-radius: 6px; padding: 1px 8px;
}
.tv3-sample__steps { flex: 1; min-width: 0; }
.tv3-sample__step { display: flex; align-items: center; gap: 8px; padding: 4px 0; }
.tv3-stepflag { font-size: 10.5px; font-weight: 700; white-space: nowrap; }
.tv3-stepflag[data-status='ok'] { color: var(--tv3-teal); }
.tv3-stepflag[data-status='ai-flag'] { color: var(--tv3-ai); }
.tv3-stepflag[data-status='corrected'] { color: var(--tv3-amber); }
.tv3-sample__latex { font-size: 14px; overflow-x: auto; }
.tv3-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.tv3-table th { padding: 8px 10px; text-align: center; font-size: 11.5px; color: var(--tv3-ink3); border-bottom: 1px solid var(--tv3-line); white-space: nowrap; }
.tv3-table td { padding: 8px 10px; text-align: center; border-bottom: 1px solid var(--tv3-line2); }
.tv3-table__score { font-family: var(--tv3-font-num); font-weight: 600; }
.tv3-table__score[data-tone='good'] { color: var(--tv3-teal); }
.tv3-table__score[data-tone='mid'] { color: var(--tv3-amber); }
.tv3-table__score[data-tone='bad'] { color: var(--tv3-rose); }
.tv3-tier { border: 1px solid var(--tv3-line); border-radius: 14px; padding: 14px; background: #fff; }
.tv3-tier[data-tier='A'] { border-top: 3px solid var(--tv3-teal); }
.tv3-tier[data-tier='B'] { border-top: 3px solid var(--tv3-amber); }
.tv3-tier[data-tier='C'] { border-top: 3px solid var(--tv3-rose); }
.tv3-tier__head { display: flex; gap: 10px; align-items: center; margin-bottom: 10px; }
.tv3-tier__badge {
  width: 34px; height: 34px; border-radius: 10px; color: #fff; font-size: 16px; font-weight: 800;
  display: grid; place-items: center;
}
.tv3-tier[data-tier='A'] .tv3-tier__badge { background: var(--tv3-teal); }
.tv3-tier[data-tier='B'] .tv3-tier__badge { background: var(--tv3-amber); }
.tv3-tier[data-tier='C'] .tv3-tier__badge { background: var(--tv3-rose); }
.tv3-tier__students { display: flex; flex-direction: column; gap: 6px; }
.tv3-tier__student { display: flex; align-items: center; gap: 8px; font-size: 12.5px; padding: 5px 8px; border-radius: 8px; background: var(--tv3-bg2); }
.tv3-tier__action { margin-top: 10px; display: flex; justify-content: flex-end; }
</style>
