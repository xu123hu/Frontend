<template>
  <div class="view">
    <div class="greeting">
      <div class="hello">你的学习版图 · <span style="color:var(--ok-deep);">{{ learnedCount }} / {{ pie.total }}</span> 已学</div>
      <div class="sub" v-if="pieError" style="color:var(--err-deep);">{{ pieError }}</div>
      <div class="sub" v-else-if="pieLoading">正在加载学习版图…</div>
      <div class="sub" v-else>高中数学 {{ chapters.length }} 大章节，{{ pie.total }} 个考点。你已学 <b>{{ learnedCount }} 个</b>，其中 <b style="color:var(--err-deep);">{{ pie.critical.count }} 个</b> 临危（红色），<b>{{ pie.mastered.count }} 个</b> 稳了（绿色）。圆=基础，菱形=进阶，六边形=拔高。</div>
    </div>

    <div class="kg-controls">
      <div class="left">
        <div class="view-switch">
          <button class="active">📚 树形</button>
          <button @click="galaxy()">🌌 星系</button>
        </div>
        <div class="shape-legend">
          <span><span class="shape-circle"></span>基础</span>
          <span><span class="shape-diamond"></span>进阶</span>
          <span><span class="shape-hex"></span>拔高</span>
        </div>
      </div>
      <div class="filters">
        <span class="filter err">🔴 {{ pie.critical.count }} 临危</span>
        <span class="filter warn">🟡 {{ pie.consolidating.count }} 巩固</span>
        <span class="filter ok">🟢 {{ pie.mastered.count }} 已稳</span>
        <span class="filter">未学 {{ pie.unlearned.count }}</span>
      </div>
    </div>

    <div class="kg-wrap">
      <div class="kg-tree">
        <div v-if="treeLoading" style="padding:24px;color:var(--ink3);font-size:13px;">正在加载知识图谱…</div>
        <div v-else-if="treeError" style="padding:24px;color:var(--err-deep);font-size:13px;">{{ treeError }}</div>
        <div v-else-if="!chapters.length" style="padding:24px;color:var(--ink3);font-size:13px;">暂无知识点数据，完成首次练习后将生成你的学习版图。</div>
        <template v-else>
          <div v-for="ch in chapters" :key="ch.chap" class="tree-section">
            <div class="head" :title="ch.chap"><span class="title">{{ ch.title }}</span><span class="count">{{ ch.count_text }}</span></div>
            <div class="tree-nodes">
              <div
                v-for="n in ch.nodes" :key="n.kp_code"
                class="tree-node"
                :class="[n.state, { selected: selected?.kp_code === n.kp_code }]"
                :title="n.kp_code"
                @click="selectNode(n, ch)"
              >
                <div class="row"><span class="shape" :class="n.shape"></span><span class="name">{{ n.name }}</span><span class="num">{{ masteryText(n.mastery) }}</span></div>
              </div>
            </div>
          </div>
        </template>
      </div>

      <div>
        <!-- ALEKS Pie -->
        <div class="kg-pie">
          <h4>🥧 我的学习版图 · ALEKS Pie</h4>
          <div v-if="pieLoading" style="padding:32px 0;text-align:center;color:var(--ink3);font-size:13px;">加载中…</div>
          <div v-else-if="pieError" style="padding:32px 0;text-align:center;color:var(--err-deep);font-size:13px;">{{ pieError }}</div>
          <div v-else-if="!pie.total" style="padding:32px 0;text-align:center;color:var(--ink3);font-size:13px;">暂无知识点，完成首次练习后生成版图。</div>
          <template v-else>
            <svg class="pie-svg" viewBox="0 0 200 200">
              <circle cx="100" cy="100" r="80" fill="#f1f5f9"/>
              <path v-if="masteredArc" :d="masteredArc" fill="#16a34a"/>
              <circle cx="100" cy="100" r="50" fill="#ffffff"/>
              <text x="100" y="95" font-size="36" font-weight="900" fill="#0f172a" text-anchor="middle" font-family="Inter">{{ masteredPct }}%</text>
              <text x="100" y="115" font-size="11" fill="#94a3b8" text-anchor="middle" font-weight="700">{{ pie.center_text }} · {{ pie.mastered.count }}/{{ pie.total }}</text>
              <text x="100" y="135" font-size="10" fill="#dc2626" text-anchor="middle" font-weight="700">距 80% 还差 {{ gapTo80 }} 节点</text>
            </svg>
            <div style="font-size:12px;color:var(--ink2);line-height:1.6;padding:10px;background:var(--bg2);border-radius:8px;margin-top:8px;">
              <template v-if="etaReady">
                💡 <b>填饼到 50%</b>约需 {{ pie.eta.to_50pct_weeks }} 周，坚持练习即可达成。<br/>
                <b>填饼到 80%</b>约需 {{ pie.eta.to_80pct_weeks }} 周——按当前节奏稳步推进。
              </template>
              <template v-else>💡 完成首次练习后给出掌握时间预测。</template>
            </div>
          </template>
        </div>

        <!-- 节点详情（当前选中） -->
        <div class="node-detail" style="margin-top:14px;">
          <div v-if="!selected" style="padding:24px;color:var(--ink3);font-size:13px;">点击左侧任意知识点，查看追根溯源与学习推荐。</div>
          <template v-else>
            <div class="head">
              <div>
                <div class="title">{{ selected.name }}</div>
                <div class="ch">{{ selected.ch }}</div>
              </div>
              <div class="level" :style="{ color: selected.levelColor }">{{ selected.masteryPct }}<small style="font-size:13px;color:var(--ink3);font-weight:600;">%</small></div>
            </div>
            <div v-if="detailLoading" style="padding:16px;color:var(--ink3);font-size:13px;">正在分析依赖链…</div>
            <div v-else-if="detailError" style="padding:16px;color:var(--err-deep);font-size:13px;">{{ detailError }}</div>
            <template v-else>
              <div class="prereq">
                <h6>📍 追根溯源 · 你之所以卡这，是因这些还没稳</h6>
                <div class="chain" v-if="chainHtml" v-html="chainHtml"></div>
                <div class="chain" v-else style="color:var(--ink2);font-size:13px;">这是基础点，没有前置依赖，直接练即可。</div>
              </div>
              <div class="next-step">
                <h6>🎯 下一步推荐</h6>
                <p>{{ recommend.reason || '建议通过练题中心针对训练，提升掌握度。' }}</p>
              </div>
              <div class="actions">
                <button class="primary" @click="goRecommend">→ {{ recommend.action_label || '开始学习' }}{{ recommend.minutes ? `（约${recommend.minutes}min）` : '' }}</button>
                <button @click="goPractice">直接练</button>
              </div>
            </template>
          </template>
        </div>

        <div class="kg-tips">
          <div class="lbl">💡 学法提示</div>
          <p>高中数学的知识是<b>"链式依赖"</b>的——<b>导数</b>依赖<b>函数</b>，<b>数列</b>依赖<b>函数</b>，<b>解析几何</b>依赖<b>函数+向量</b>。优先把红色临危节点的前置基础补稳，比直接攻难题效率高得多。</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { api, ApiError } from '@/api/client'
import { useToastStore } from '@/stores/toast'

const toast = useToastStore()
const router = useRouter()

/* ===== ALEKS 饼图：GET /api/student/knowledge-graph/pie ===== */
const emptyBucket = { count: 0, ratio: 0 }
const pie = ref({
  total: 0,
  mastered: { ...emptyBucket },
  consolidating: { ...emptyBucket },
  critical: { ...emptyBucket },
  unlearned: { ...emptyBucket },
  center_text: '',
  eta: { to_50pct_weeks: null, to_80pct_weeks: null },
})
const pieLoading = ref(true)
const pieError = ref('')

const learnedCount = computed(() => Math.max(0, pie.value.total - pie.value.unlearned.count))
const masteredPct = computed(() => (pie.value.total ? Math.round(pie.value.mastered.ratio * 100) : 0))
const gapTo80 = computed(() => Math.max(0, Math.ceil(pie.value.total * 0.8) - pie.value.mastered.count))
const etaReady = computed(() => pie.value.eta?.to_50pct_weeks != null && pie.value.eta?.to_80pct_weeks != null)

/** 顶部起笔的环形扇形 path；ratio<=0 不画，>=1 画整圆 */
const masteredArc = computed(() => {
  const r = pie.value.mastered.ratio
  if (!r || r <= 0) return ''
  if (r >= 1) {
    return 'M 100 20 A 80 80 0 1 1 99.99 20 Z'
  }
  const angle = r * 2 * Math.PI
  const x = 100 + 80 * Math.sin(angle)
  const y = 100 - 80 * Math.cos(angle)
  const large = r > 0.5 ? 1 : 0
  return `M 100 20 A 80 80 0 ${large} 1 ${x.toFixed(1)} ${y.toFixed(1)} L 100 100 Z`
})

/* ===== 章节树：GET /api/student/knowledge-graph/tree ===== */
const chapters = ref([])
const treeLoading = ref(true)
const treeError = ref('')

const STATE_COLOR = {
  mastered: 'var(--ok)',
  improving: 'var(--warn)',
  weak: 'var(--err)',
  unlearned: 'var(--ink3)',
}
const SHAPE_LABEL = { circle: '● 基础', diamond: '◆ 进阶', hex: '⬡ 拔高' }
const STATE_LABEL = { mastered: '绿', improving: '黄', weak: '红', unlearned: '未学' }

function masteryText(m) {
  return m == null ? '未学' : `${Math.round(m * 100)}%`
}

/* ===== 节点详情：deps + recommend ===== */
const selected = ref(null)
const detailLoading = ref(false)
const detailError = ref('')
const deps = ref(null)
const recommend = ref({})

const chainHtml = computed(() => {
  const chain = deps.value?.chain || []
  // 契约：chain 仅含自身 = 基础点，走"直接练"空态文案
  if (chain.length <= 1) return ''
  return chain
    .map((c) => {
      const color = c.state === 'mastered' ? 'var(--ok-deep)' : c.state === 'improving' ? 'var(--warn-deep)' : 'var(--err-deep)'
      return `<b style="color:${color};">${c.kp_name || c.kp_code}</b>（${masteryText(c.mastery)} ${STATE_LABEL[c.state] || ''}）`
    })
    .join(' <span class="arrow">→</span> ')
})

async function loadPie() {
  pieLoading.value = true
  pieError.value = ''
  try {
    pie.value = await api.get('/student/knowledge-graph/pie')
  } catch (e) {
    pieError.value = e instanceof ApiError ? `学习版图加载失败：${e.message}` : '学习版图加载失败'
  } finally {
    pieLoading.value = false
  }
}

async function loadTree() {
  treeLoading.value = true
  treeError.value = ''
  try {
    const data = await api.get('/student/knowledge-graph/tree')
    chapters.value = data?.chapters || []
    autoSelect()
  } catch (e) {
    treeError.value = e instanceof ApiError ? `知识图谱加载失败：${e.message}` : '知识图谱加载失败'
  } finally {
    treeLoading.value = false
  }
}

/** 默认选中链上最弱的非"已稳"节点（weak > improving > unlearned > 首个） */
function autoSelect() {
  for (const state of ['weak', 'improving', 'unlearned']) {
    for (const ch of chapters.value) {
      const n = ch.nodes.find((x) => x.state === state)
      if (n) return selectNode(n, ch)
    }
  }
  const ch = chapters.value[0]
  if (ch?.nodes?.length) selectNode(ch.nodes[0], ch)
}

async function selectNode(n, ch) {
  selected.value = {
    kp_code: n.kp_code,
    name: n.name,
    ch: `${ch.title} · ${SHAPE_LABEL[n.shape] || ''}`,
    masteryPct: n.mastery == null ? 0 : Math.round(n.mastery * 100),
    levelColor: STATE_COLOR[n.state] || 'var(--ink3)',
  }
  detailLoading.value = true
  detailError.value = ''
  deps.value = null
  recommend.value = {}
  try {
    const [d, r] = await Promise.all([
      api.get(`/student/knowledge-graph/nodes/${encodeURIComponent(n.kp_code)}/deps`),
      api.get(`/student/knowledge-graph/nodes/${encodeURIComponent(n.kp_code)}/recommend`),
    ])
    // 防止快速连点时的乱序覆盖
    if (selected.value?.kp_code !== n.kp_code) return
    deps.value = d
    recommend.value = r || {}
  } catch (e) {
    if (selected.value?.kp_code !== n.kp_code) return
    detailError.value = e instanceof ApiError ? `节点详情加载失败：${e.message}` : '节点详情加载失败'
  } finally {
    if (selected.value?.kp_code === n.kp_code) detailLoading.value = false
  }
}

function goRecommend() {
  const route = recommend.value?.route
  router.push(route || '/practice')
}

// 迭代18 修复：从知识图谱"直接练"带选中知识点，练题中心据此定向出题
function goPractice() {
  const kp = selected.value?.kp_code
  router.push(kp ? '/practice?kp=' + encodeURIComponent(kp) : '/practice')
}

function galaxy() {
  toast.info('🌌 星系视图（演示版）——切换回树形视图可继续浏览')
}

onMounted(() => {
  loadPie()
  loadTree()
})
</script>

<style scoped>
.tree-node.selected { outline: 2px solid var(--brand); outline-offset: 1px; }
</style>
