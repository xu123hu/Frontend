<template>
  <div id="tv2-quiz" class="tv2-quiz">
    <!-- 顶栏 -->
    <div class="tv2-card tv2-quiz__topbar">
      <div class="tv2-card__body tv2-quiz__topbar-row">
        <div class="tv2-quiz__title">
          <b>{{ paper ? paper.title : '智能组卷' }}</b>
          <span class="tv2-card__sub" v-if="paper">{{ sceneLabel(paper.scene) }} · {{ paper.items.length }} 题 · {{ paper.total_score }} 分 · {{ paper.duration_minutes }} 分钟</span>
          <span class="tv2-card__sub" v-else>知识点树 · 学情驱动选题 · A4 仿真预览</span>
        </div>
        <div class="tv2-quiz__topbar-actions">
          <button v-if="paper" class="tv2-btn" type="button" data-testid="tv2-quiz-back" @click="paper = null">‹ 返回调整</button>
          <button v-if="paper" class="tv2-btn" type="button" :class="{ 'is-on': showKey }" data-testid="tv2-quiz-key" @click="showKey = !showKey">{{ showKey ? '隐藏答案' : '显示答案' }}</button>
          <button v-if="paper" class="tv2-btn tv2-btn--primary" type="button" data-testid="tv2-quiz-publish" @click="publish">发布为作业 →</button>
        </div>
      </div>
    </div>

    <div v-if="error" class="tv2-error" role="alert">{{ error }} <button class="tv2-btn tv2-btn--sm" type="button" @click="init">重试</button></div>

    <!-- 三区主体 -->
    <div class="tv2-quiz__body">
      <!-- 左：知识点树 -->
      <aside class="tv2-card tv2-quiz__tree">
        <div class="tv2-card__head">
          <div class="tv2-card__title">知识点树</div>
          <div class="tv2-card__sub">已选 {{ selectedKps.length }} 个</div>
        </div>
        <div class="tv2-card__body tv2-quiz__tree-body">
          <div v-for="book in tree" :key="book.code" class="tv2-kp__book">
            <button class="tv2-kp__book-head" type="button" @click="expanded.has(book.code) ? expanded.delete(book.code) : expanded.add(book.code)">
              <span class="tv2-kp__caret" :class="{ 'is-open': expanded.has(book.code) }">▸</span>{{ book.name }}
            </button>
            <div v-if="expanded.has(book.code)">
              <div v-for="ch in book.children || []" :key="ch.code" class="tv2-kp__ch">
                <button class="tv2-kp__ch-head" type="button" @click="expanded.has(ch.code) ? expanded.delete(ch.code) : expanded.add(ch.code)">
                  <span class="tv2-kp__caret" :class="{ 'is-open': expanded.has(ch.code) }">▸</span>{{ ch.name }}
                </button>
                <div v-if="expanded.has(ch.code)">
                  <button
                    v-for="kp in ch.children || []" :key="kp.code"
                    class="tv2-kp__leaf" :class="{ 'is-on': selectedKps.includes(kp.code) }"
                    type="button" :data-testid="`tv2-kp-${kp.code}`"
                    @click="toggleKp(kp.code)"
                  >
                    <span class="tv2-kp__check" :class="{ 'is-on': selectedKps.includes(kp.code) }">{{ selectedKps.includes(kp.code) ? '✓' : '' }}</span>
                    <span class="tv2-kp__name">{{ kp.name }}</span>
                    <span v-if="kp.error_rate" class="tv2-kp__heat" :style="heatStyle(kp.error_rate)">{{ Math.round(kp.error_rate * 100) }}%</span>
                    <span class="tv2-kp__count">{{ kp.question_count ?? 0 }} 题</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <!-- 中：题库检索 / A4 试卷预览 -->
      <main class="tv2-quiz__main">
        <!-- 检索模式 -->
        <template v-if="!paper">
          <div class="tv2-card tv2-quiz__search">
            <div class="tv2-card__body tv2-quiz__search-row">
              <input v-model="keyword" class="tv2-input tv2-quiz__search-input" type="text" placeholder="搜索题干 / 知识点关键词…" data-testid="tv2-quiz-search" @keyup.enter="loadQuestions" />
              <div class="tv2-quiz__filters">
                <button v-for="d in ['basic', 'medium', 'hard']" :key="d" class="tv2-quiz__chip" :class="[`is-${d}`, { 'is-on': diffFilter === d }]" type="button" @click="diffFilter = diffFilter === d ? '' : d; loadQuestions()">
                  {{ { basic: '基础', medium: '中档', hard: '压轴' }[d] }}
                </button>
                <span class="tv2-quiz__filters-sep" />
                <button v-for="t in ['choice', 'fill', 'solution']" :key="t" class="tv2-quiz__chip" :class="{ 'is-on': typeFilter === t }" type="button" @click="typeFilter = typeFilter === t ? '' : t; loadQuestions()">
                  {{ { choice: '选择', fill: '填空', solution: '解答' }[t] }}
                </button>
              </div>
              <span class="tv2-card__sub" style="margin-left: auto; white-space: nowrap">{{ questions.total }} 道候选题</span>
            </div>
          </div>

          <div v-if="loadingQuestions" class="tv2-quiz__loading">检索题库中…</div>
          <div v-else-if="!questions.items.length" class="tv2-card"><div class="tv2-card__body tv2-empty" style="padding: 48px 0">
            <div class="tv2-empty__title">该筛选下暂无题目</div>
            <div class="tv2-empty__desc">左侧换选知识点，或到资源中心上传校本习题集补充题源（审核通过后自动进入本检索池）。</div>
            <RouterLink to="/teacher-v2/resources" class="tv2-btn">去资源中心上传 →</RouterLink>
          </div></div>
          <div v-else class="tv2-quiz__qlist">
            <QuestionCard v-for="q in questions.items" :key="q.question_id" :question="q" compact :show-answer="false">
              <template #actions>
                <span v-if="q.class_error_rate" class="tv2-qcard__err">本班错误率 {{ Math.round(q.class_error_rate * 100) }}%</span>
              </template>
            </QuestionCard>
          </div>
        </template>

        <!-- A4 试卷模式 -->
        <template v-else>
          <!-- 缺口提示 -->
          <div v-if="paper.gaps.length" class="tv2-quiz__gaps" role="alert" data-testid="tv2-quiz-gaps">
            <b>题量缺口</b>
            <div v-for="(g, i) in paper.gaps" :key="i" class="tv2-quiz__gap-row">
              <span class="tv2-quiz__gap-kp">{{ g.kp_name }}</span>
              <span>需 {{ g.requested }} 题 / 库存 {{ g.available }} 题 — {{ g.action }}</span>
            </div>
          </div>

          <div class="tv2-quiz__a4" data-testid="tv2-quiz-paper">
            <!-- 试卷头 -->
            <header class="tv2-quiz__paper-head">
              <div class="tv2-quiz__paper-school">明德实验中学 · 高二数学</div>
              <h1 class="tv2-quiz__paper-title">{{ paper.title }}</h1>
              <div class="tv2-quiz__paper-meta">
                <span>班级 ________</span><span>姓名 ________</span><span>学号 ________</span>
                <span>满分 {{ paper.total_score }} 分</span><span>时长 {{ paper.duration_minutes }} 分钟</span>
              </div>
              <div class="tv2-quiz__paper-note">注意：本卷共三部分；请在各题答题区域内作答，超出无效。</div>
            </header>

            <!-- 分大题 -->
            <section v-for="grp in grouped" :key="grp.label" class="tv2-quiz__paper-sec">
              <div class="tv2-quiz__sec-title">
                {{ ['一', '二', '三'][grp.index] }}、{{ grp.label }}
                <span class="tv2-quiz__sec-note">（共 {{ grp.items.length }} 题 · 每题 {{ unitScore(grp.type) }} 分 · 共 {{ grp.items.length * unitScore(grp.type) }} 分）</span>
              </div>
              <article v-for="item in grp.items" :key="item.seq" class="tv2-quiz__pitem">
                <div class="tv2-quiz__pitem-head">
                  <span class="tv2-quiz__pitem-seq">{{ item.seq }}.</span>
                  <div class="tv2-quiz__pitem-tools">
                    <button class="tv2-btn tv2-btn--sm" type="button" :disabled="swapping === item.seq" :data-testid="`tv2-swap-${item.seq}`" @click="swap(item.seq)">
                      {{ swapping === item.seq ? '换题中…' : '✦ 换一题' }}
                    </button>
                  </div>
                </div>
                <QuestionCard :question="item.question" :seq="0" :show-answer="showKey" :show-analysis="showKey" />
                <div v-if="item.question.q_type === 'solution'" class="tv2-quiz__blank" :style="{ height: '150px' }" />
              </article>
            </section>

            <footer class="tv2-quiz__paper-foot">—— 第 {{ paper.paper_id.slice(-2) }} 号卷 · 智能组卷生成 · 教师可逐题替换 ——</footer>
          </div>
        </template>
      </main>

      <!-- 右：参数面板 -->
      <aside class="tv2-quiz__panel">
        <section class="tv2-card">
          <div class="tv2-card__head"><div class="tv2-card__title">组卷参数</div><div class="tv2-card__sub">改动后重新组卷</div></div>
          <div class="tv2-card__body">
            <div class="tv2-quiz__field-label">场景</div>
            <div class="tv2-quiz__scene-row">
              <button v-for="s in sceneDefs" :key="s.value" class="tv2-quiz__scene" :class="{ 'is-on': scene === s.value }" type="button" @click="scene = s.value">
                <b>{{ s.label }}</b><span>{{ s.hint }}</span>
              </button>
            </div>

            <div class="tv2-quiz__field-label">题型数量</div>
            <div v-for="t in typeDefs" :key="t.value" class="tv2-quiz__stepper">
              <span class="tv2-quiz__stepper-label">{{ t.label }}</span>
              <div class="tv2-quiz__stepper-ctl">
                <button class="tv2-quiz__step-btn" type="button" :disabled="counts[t.value] <= 0" @click="counts[t.value]--">−</button>
                <span class="tv2-quiz__step-num">{{ counts[t.value] }}</span>
                <button class="tv2-quiz__step-btn" type="button" :disabled="counts[t.value] >= 12" @click="counts[t.value]++">＋</button>
              </div>
              <span class="tv2-quiz__stepper-score">{{ counts[t.value] * unitScore(t.value) }} 分</span>
            </div>

            <div class="tv2-quiz__field-label">难度分布</div>
            <div class="tv2-quiz__ratios">
              <button v-for="r in ratioDefs" :key="r.key" class="tv2-quiz__ratio" :class="{ 'is-on': ratioKey === r.key }" type="button" @click="applyRatio(r)">
                <div class="tv2-quiz__ratio-bar">
                  <span class="rb-basic" :style="{ flex: r.value.basic }" />
                  <span class="rb-medium" :style="{ flex: r.value.medium }" />
                  <span class="rb-hard" :style="{ flex: r.value.hard }" />
                </div>
                <b>{{ r.label }}</b>
                <span>{{ r.value.basic }} : {{ r.value.medium }} : {{ r.value.hard }}</span>
              </button>
            </div>

            <div class="tv2-quiz__calc">
              <div class="tv2-quiz__calc-row"><span>总题量</span><b>{{ totalCount }} 题</b></div>
              <div class="tv2-quiz__calc-row"><span>预估总分</span><b>{{ totalScore }} 分</b></div>
              <div class="tv2-quiz__calc-row"><span>覆盖知识点</span><b>{{ selectedKps.length || '未选择' }}</b></div>
            </div>

            <button class="tv2-btn tv2-btn--ai tv2-btn--lg tv2-quiz__compose" type="button" :disabled="composing || !selectedKps.length" data-testid="tv2-quiz-compose" @click="compose">
              {{ composing ? '智能选题中…' : '✦ AI 智能组卷' }}
            </button>
            <p v-if="!selectedKps.length" class="tv2-quiz__hint">请先在左侧勾选至少 1 个知识点</p>
          </div>
        </section>

        <!-- 学情建议（链路卡 B 入口） -->
        <section class="tv2-card" v-if="advice">
          <div class="tv2-card__head"><div class="tv2-card__title"><span class="tv2-ai-badge tv2-ai-badge--sm">✦</span>学情选题建议</div><div class="tv2-card__sub">来自本班最近测练</div></div>
          <div class="tv2-card__body">
            <div v-for="a in advice" :key="a.text" class="tv2-quiz__advice">
              <span class="tv2-kp__heat" :style="heatStyle(a.error_rate)">{{ Math.round(a.error_rate * 100) }}%</span>
              <div>
                <b>{{ a.name }}</b>
                <p>{{ a.text }}</p>
              </div>
            </div>
            <RouterLink to="/teacher-v2/insights" class="tv2-quiz__advice-link">查看完整学情洞察 →</RouterLink>
          </div>
        </section>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import QuestionCard from '@/components/teacherV2/QuestionCard.vue'
import { v2Api } from '@/api/teacherV2'
import { useToastStore } from '@/stores/toast'
import type { V2KpNode, V2Paper, V2Question } from '@/types/teacherV2'

const route = useRoute()
const router = useRouter()
const toast = useToastStore()

const tree = ref<V2KpNode[]>([])
const selectedKps = ref<string[]>([])
const expanded = ref(new Set(['XBX1', 'XBX1-3']))
const questions = reactive<{ items: V2Question[]; total: number }>({ items: [], total: 0 })
const keyword = ref('')
const diffFilter = ref('')
const typeFilter = ref('')
const loadingQuestions = ref(false)
const error = ref('')

const paper = ref<V2Paper | null>(null)
const showKey = ref(false)
const composing = ref(false)
const swapping = ref(0)

const sceneDefs = [
  { value: 'exam' as const, label: '单元测验', hint: '90 分钟 · 纸笔' },
  { value: 'quiz' as const, label: '当堂检测', hint: '40 分钟 · 课堂' },
  { value: 'homework' as const, label: '课后作业', hint: '35 分钟 · 分层' },
]
const typeDefs = [
  { value: 'choice' as const, label: '选择题' },
  { value: 'fill' as const, label: '填空题' },
  { value: 'solution' as const, label: '解答题' },
]
const ratioDefs = [
  { key: 'base', label: '基础巩固', value: { basic: 5, medium: 3, hard: 2 } },
  { key: 'std', label: '标准单元卷', value: { basic: 3, medium: 5, hard: 2 } },
  { key: 'adv', label: '强化提升', value: { basic: 2, medium: 4, hard: 4 } },
]

const scene = ref<'exam' | 'quiz' | 'homework'>('exam')
const counts = reactive({ choice: 6, fill: 4, solution: 2 })
const ratio = reactive({ basic: 3, medium: 5, hard: 2 })
const ratioKey = ref('std')

const unitScore = (t: string) => ({ choice: 5, fill: 5, solution: 12 }[t] || 5)
const totalCount = computed(() => counts.choice + counts.fill + counts.solution)
const totalScore = computed(() => counts.choice * 5 + counts.fill * 5 + counts.solution * 12)
const sceneLabel = (s: string) => sceneDefs.find((x) => x.value === s)?.label || s

const grouped = computed(() => {
  if (!paper.value) return []
  const defs: { type: 'choice' | 'fill' | 'solution'; label: string }[] = [
    { type: 'choice', label: '选择题' }, { type: 'fill', label: '填空题' }, { type: 'solution', label: '解答题' },
  ]
  return defs
    .map((d, index) => ({ ...d, index, items: paper.value!.items.filter((it) => it.question.q_type === d.type) }))
    .filter((g) => g.items.length)
})

/* 学情建议：基于所选叶子的错误率 */
const allLeaves = computed<V2KpNode[]>(() => {
  const out: V2KpNode[] = []
  const walk = (nodes: V2KpNode[]) => nodes.forEach((n) => { if (n.children?.length) walk(n.children); else out.push(n) })
  walk(tree.value)
  return out
})
const advice = computed(() => allLeaves.value
  .filter((k) => selectedKps.value.includes(k.code) && (k.error_rate || 0) >= 0.3)
  .sort((a, b) => (b.error_rate || 0) - (a.error_rate || 0))
  .slice(0, 3)
  .map((k) => ({
    name: k.name,
    error_rate: k.error_rate || 0,
    text: (k.error_rate || 0) >= 0.5
      ? `错误率过半，建议压轴档加 1 题针对训练，讲评时配错因对比。`
      : `错误率偏高，建议保留中档题占比并加入 1 题基础变式巩固概念。`,
  })))

function heatStyle(rate: number) {
  const hot = Math.min(1, Math.max(0, rate))
  const hue = 150 - hot * 150
  return { background: `hsl(${hue}, 78%, 92%)`, color: `hsl(${hue}, 72%, 32%)` }
}

function toggleKp(code: string) {
  const i = selectedKps.value.indexOf(code)
  if (i >= 0) selectedKps.value.splice(i, 1)
  else selectedKps.value.push(code)
}

async function init() {
  error.value = ''
  try {
    const treeRes = await v2Api.kpTree()
    tree.value = treeRes.data.tree
    // 从 insights 错因聚类跳入：?kp=KP-JD,KP-TY
    const preset = String(route.query.kp || '').split(',').filter(Boolean)
    if (preset.length) selectedKps.value = preset
    else selectedKps.value = ['KP-TY', 'KP-BZ']
    await loadQuestions()
  } catch (e: any) {
    error.value = e?.message || '加载失败'
  }
}

watch(selectedKps, () => { loadQuestions() }, { deep: true })

async function loadQuestions() {
  loadingQuestions.value = true
  try {
    const res = await v2Api.questions({
      kp_code: selectedKps.value.join(',') || undefined,
      difficulty: diffFilter.value || undefined,
      q_type: typeFilter.value || undefined,
      q: keyword.value.trim() || undefined,
    })
    questions.items = res.data.items
    questions.total = res.data.total
  } catch (e: any) {
    error.value = e?.message || '题库检索失败'
  } finally {
    loadingQuestions.value = false
  }
}

function applyRatio(r: typeof ratioDefs[number]) {
  ratioKey.value = r.key
  ratio.basic = r.value.basic
  ratio.medium = r.value.medium
  ratio.hard = r.value.hard
}

async function compose() {
  if (!selectedKps.value.length) return
  composing.value = true
  error.value = ''
  try {
    const res = await v2Api.compose({
      title: '',
      kp_codes: selectedKps.value,
      counts: { ...counts },
      difficulty_ratio: { ...ratio },
      scene: scene.value,
    })
    paper.value = res.data
    showKey.value = false
    toast.success(`组卷完成：${res.data.items.length} 题 · ${res.data.total_score} 分`)
    if (res.data.gaps.length) toast.warning(`有 ${res.data.gaps.length} 处题量缺口，已在卷面标注`)
  } catch (e: any) {
    error.value = e?.message || '组卷失败'
  } finally {
    composing.value = false
  }
}

async function swap(seq: number) {
  if (!paper.value) return
  swapping.value = seq
  try {
    const res = await v2Api.swapItem(paper.value.paper_id, seq)
    const idx = paper.value.items.findIndex((it) => it.seq === seq)
    if (idx >= 0) paper.value.items[idx] = res.data.item
    toast.success(`第 ${seq} 题已替换（${res.data.item.question.kp_name} · ${res.data.item.question.source === 'school' ? '校本' : res.data.item.question.source === 'ai_variant' ? 'AI 变式' : '官方'}）`)
  } catch (e: any) {
    toast.error(e?.message || '换题失败')
  } finally {
    swapping.value = 0
  }
}

function publish() {
  if (!paper.value) return
  router.push({
    path: '/teacher-v2/assign',
    query: { paper_id: paper.value.paper_id, title: paper.value.title },
  })
}

onMounted(init)
</script>

<style scoped>
.tv2-quiz { display: flex; flex-direction: column; gap: 14px; }
.tv2-quiz__topbar-row { display: flex; align-items: center; gap: 16px; }
.tv2-quiz__title b { font-size: 16px; }
.tv2-quiz__title span { display: block; margin-top: 3px; }
.tv2-quiz__topbar-actions { margin-left: auto; display: flex; gap: 8px; }
.tv2-quiz__topbar-actions .is-on { border-color: var(--tv2-primary); color: var(--tv2-primary); background: var(--tv2-primary-soft); }

.tv2-quiz__body { display: grid; grid-template-columns: 248px minmax(0, 1fr) 300px; gap: 14px; align-items: start; }

/* ===== 左：知识点树 ===== */
.tv2-quiz__tree { position: sticky; top: 12px; }
.tv2-quiz__tree-body { padding: 8px 6px !important; max-height: calc(100vh - 200px); overflow-y: auto; }
.tv2-kp__book-head, .tv2-kp__ch-head {
  width: 100%; display: flex; align-items: center; gap: 5px; text-align: left;
  background: none; border: none; cursor: pointer; padding: 6px 8px; border-radius: 7px;
  font-size: 12.5px; color: var(--tv2-ink2); font-weight: 600;
}
.tv2-kp__book-head:hover, .tv2-kp__ch-head:hover { background: var(--tv2-bg2); }
.tv2-kp__ch-head { padding-left: 18px; font-weight: 500; }
.tv2-kp__caret { transition: transform .15s; color: var(--tv2-ink3); display: inline-block; width: 12px; }
.tv2-kp__caret.is-open { transform: rotate(90deg); }
.tv2-kp__leaf {
  width: 100%; display: flex; align-items: center; gap: 7px; text-align: left;
  background: none; border: none; cursor: pointer; padding: 6px 8px 6px 32px; border-radius: 7px;
  font-size: 12.5px; color: var(--tv2-ink); transition: background .12s;
}
.tv2-kp__leaf:hover { background: var(--tv2-bg2); }
.tv2-kp__leaf.is-on { background: var(--tv2-primary-soft); color: var(--tv2-primary-deep); font-weight: 600; }
.tv2-kp__check {
  width: 15px; height: 15px; border-radius: 4px; border: 1.5px solid var(--tv2-ink4);
  display: inline-grid; place-items: center; font-size: 10px; color: #fff; flex-shrink: 0;
}
.tv2-kp__check.is-on { background: var(--tv2-primary); border-color: var(--tv2-primary); }
.tv2-kp__name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tv2-kp__heat {
  font-size: 10.5px; font-weight: 700; border-radius: 5px; padding: 1px 5px;
  font-family: var(--tv2-font-num); flex-shrink: 0;
}
.tv2-kp__count { font-size: 10.5px; color: var(--tv2-ink3); flex-shrink: 0; }

/* ===== 中：检索 ===== */
.tv2-quiz__search-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.tv2-quiz__search-input { flex: 1; min-width: 220px; }
.tv2-input {
  height: 34px; border: 1px solid var(--tv2-line); border-radius: 8px; padding: 0 12px;
  font-size: 13px; color: var(--tv2-ink); background: var(--tv2-card); outline: none; font-family: inherit;
}
.tv2-input:focus { border-color: var(--tv2-primary); box-shadow: 0 0 0 3px var(--tv2-primary-soft); }
.tv2-quiz__filters { display: flex; align-items: center; gap: 6px; }
.tv2-quiz__filters-sep { width: 1px; height: 16px; background: var(--tv2-line); margin: 0 4px; }
.tv2-quiz__chip {
  border: 1px solid var(--tv2-line); background: var(--tv2-card); border-radius: 999px;
  padding: 3px 11px; font-size: 12px; color: var(--tv2-ink2); cursor: pointer; transition: all .12s;
}
.tv2-quiz__chip:hover { border-color: var(--tv2-primary-border); color: var(--tv2-primary); }
.tv2-quiz__chip.is-on { background: var(--tv2-primary-soft); border-color: var(--tv2-primary); color: var(--tv2-primary); font-weight: 600; }
.tv2-quiz__chip.is-basic.is-on { background: var(--tv2-teal-soft); border-color: var(--tv2-teal); color: var(--tv2-teal); }
.tv2-quiz__chip.is-medium.is-on { background: var(--tv2-primary-soft); border-color: var(--tv2-primary); color: var(--tv2-primary); }
.tv2-quiz__chip.is-hard.is-on { background: var(--tv2-rose-soft); border-color: var(--tv2-rose); color: var(--tv2-rose); }
.tv2-quiz__loading { padding: 40px; text-align: center; color: var(--tv2-ink3); font-size: 13px; }
.tv2-quiz__qlist { display: flex; flex-direction: column; gap: 10px; }

/* ===== 中：A4 试卷 ===== */
.tv2-quiz__gaps {
  background: var(--tv2-amber-soft); border: 1px solid var(--tv2-amber-border); border-radius: var(--tv2-radius);
  padding: 12px 16px; font-size: 12.5px; color: var(--tv2-amber);
}
.tv2-quiz__gaps > b { display: block; margin-bottom: 6px; font-size: 13px; }
.tv2-quiz__gap-row { display: flex; gap: 10px; padding: 3px 0; }
.tv2-quiz__gap-kp { font-weight: 600; min-width: 0; }
.tv2-quiz__a4 {
  background: #fff; border-radius: 4px; padding: 44px 52px;
  box-shadow: var(--tv2-shadow-lg); max-width: 820px; margin: 0 auto; width: 100%;
  color: #1f2937;
}
.tv2-quiz__paper-head { text-align: center; border-bottom: 2px solid #1f2937; padding-bottom: 14px; margin-bottom: 20px; }
.tv2-quiz__paper-school { font-size: 12px; letter-spacing: 4px; color: #6b7280; }
.tv2-quiz__paper-title { font-size: 21px; letter-spacing: 6px; margin: 8px 0 10px; font-family: 'Noto Serif SC', serif; }
.tv2-quiz__paper-meta { display: flex; justify-content: center; gap: 18px; font-size: 12.5px; color: #374151; flex-wrap: wrap; }
.tv2-quiz__paper-note { margin-top: 8px; font-size: 11.5px; color: #6b7280; }
.tv2-quiz__paper-sec { margin-bottom: 18px; }
.tv2-quiz__sec-title { font-size: 14.5px; font-weight: 700; margin-bottom: 10px; }
.tv2-quiz__sec-note { font-size: 12px; font-weight: 400; color: #6b7280; }
.tv2-quiz__pitem { position: relative; padding: 4px 0 14px; border-bottom: 1px dashed #e5e7eb; margin-bottom: 12px; }
.tv2-quiz__pitem:last-child { border-bottom: none; }
.tv2-quiz__pitem-head { display: flex; align-items: center; }
.tv2-quiz__pitem-seq { display: none; }
.tv2-quiz__pitem-tools { position: absolute; top: -4px; right: 0; opacity: 0; transition: opacity .15s; z-index: 2; }
.tv2-quiz__pitem:hover .tv2-quiz__pitem-tools { opacity: 1; }
.tv2-quiz__pitem :deep(.tv2-qcard) { border: none; padding: 0 74px 0 0; background: transparent; }
.tv2-quiz__pitem :deep(.tv2-qcard__head) { padding-left: 22px; }
.tv2-quiz__pitem :deep(.tv2-qcard__seq) { display: none; }
.tv2-quiz__pitem :deep(.tv2-qcard__stem), .tv2-quiz__pitem :deep(.tv2-qcard__options) { padding-left: 22px; }
.tv2-quiz__blank { margin: 10px 0 0 22px; border-bottom: 1px solid #f3f4f6; background: linear-gradient(#fff 90%, #fafbfc); }
.tv2-quiz__paper-foot { text-align: center; font-size: 10.5px; color: #9ca3af; margin-top: 24px; letter-spacing: 2px; }

/* ===== 右：参数面板 ===== */
.tv2-quiz__panel { display: flex; flex-direction: column; gap: 14px; position: sticky; top: 12px; }
.tv2-quiz__field-label { font-size: 11.5px; color: var(--tv2-ink3); font-weight: 600; letter-spacing: 1px; margin: 14px 0 8px; }
.tv2-quiz__field-label:first-child { margin-top: 0; }
.tv2-quiz__scene-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
.tv2-quiz__scene {
  border: 1px solid var(--tv2-line); background: var(--tv2-card); border-radius: 9px; padding: 8px 6px;
  cursor: pointer; text-align: center; transition: all .12s;
}
.tv2-quiz__scene b { display: block; font-size: 12.5px; color: var(--tv2-ink); }
.tv2-quiz__scene span { display: block; font-size: 10px; color: var(--tv2-ink3); margin-top: 3px; }
.tv2-quiz__scene:hover { border-color: var(--tv2-primary-border); }
.tv2-quiz__scene.is-on { border-color: var(--tv2-primary); background: var(--tv2-primary-soft); }
.tv2-quiz__scene.is-on b { color: var(--tv2-primary); }
.tv2-quiz__stepper { display: flex; align-items: center; gap: 10px; padding: 5px 0; }
.tv2-quiz__stepper-label { font-size: 12.5px; color: var(--tv2-ink2); flex: 1; }
.tv2-quiz__stepper-ctl { display: flex; align-items: center; gap: 0; border: 1px solid var(--tv2-line); border-radius: 8px; overflow: hidden; }
.tv2-quiz__step-btn {
  width: 26px; height: 26px; border: none; background: var(--tv2-bg2); cursor: pointer;
  font-size: 14px; color: var(--tv2-ink2); line-height: 1;
}
.tv2-quiz__step-btn:hover:not(:disabled) { background: var(--tv2-primary-soft); color: var(--tv2-primary); }
.tv2-quiz__step-btn:disabled { opacity: .4; cursor: not-allowed; }
.tv2-quiz__step-num { width: 34px; text-align: center; font-size: 13px; font-weight: 700; font-family: var(--tv2-font-num); }
.tv2-quiz__stepper-score { font-size: 11.5px; color: var(--tv2-ink3); width: 44px; text-align: right; font-family: var(--tv2-font-num); }
.tv2-quiz__ratios { display: flex; flex-direction: column; gap: 7px; }
.tv2-quiz__ratio {
  display: flex; align-items: center; gap: 10px; border: 1px solid var(--tv2-line); border-radius: 9px;
  background: var(--tv2-card); padding: 7px 11px; cursor: pointer; transition: all .12s;
}
.tv2-quiz__ratio:hover { border-color: var(--tv2-primary-border); }
.tv2-quiz__ratio.is-on { border-color: var(--tv2-primary); background: var(--tv2-primary-soft); }
.tv2-quiz__ratio-bar { display: flex; width: 52px; height: 8px; border-radius: 4px; overflow: hidden; flex-shrink: 0; }
.tv2-quiz__ratio-bar span { display: block; }
.rb-basic { background: var(--tv2-teal); }
.rb-medium { background: var(--tv2-primary); }
.rb-hard { background: var(--tv2-rose); }
.tv2-quiz__ratio b { font-size: 12px; }
.tv2-quiz__ratio span { font-size: 10.5px; color: var(--tv2-ink3); font-family: var(--tv2-font-num); }
.tv2-quiz__calc { margin-top: 14px; border-top: 1px dashed var(--tv2-line); padding-top: 10px; }
.tv2-quiz__calc-row { display: flex; justify-content: space-between; font-size: 12.5px; color: var(--tv2-ink2); padding: 3px 0; }
.tv2-quiz__calc-row b { font-family: var(--tv2-font-num); color: var(--tv2-ink); }
.tv2-quiz__compose { width: 100%; margin-top: 12px; }
.tv2-quiz__hint { font-size: 11.5px; color: var(--tv2-ink3); text-align: center; margin-top: 8px; }
.tv2-quiz__advice { display: flex; gap: 10px; align-items: flex-start; padding: 8px 0; border-bottom: 1px dashed var(--tv2-line2); }
.tv2-quiz__advice:last-of-type { border-bottom: none; }
.tv2-quiz__advice b { font-size: 12.5px; display: block; }
.tv2-quiz__advice p { font-size: 11.5px; color: var(--tv2-ink2); line-height: 1.6; margin: 3px 0 0; }
.tv2-quiz__advice .tv2-kp__heat { margin-top: 2px; }
.tv2-quiz__advice-link { display: block; margin-top: 8px; font-size: 12px; color: var(--tv2-primary); text-decoration: none; }

@media (max-width: 1280px) {
  .tv2-quiz__body { grid-template-columns: 218px minmax(0, 1fr); }
  .tv2-quiz__panel { grid-column: 1 / -1; position: static; flex-direction: row; flex-wrap: wrap; }
  .tv2-quiz__panel > section { flex: 1; min-width: 320px; }
}
</style>
