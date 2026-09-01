<template>
  <div class="view">
    <div class="greeting">
      <div class="hello">{{ nickname }}的错题本 · {{ totalErrors }} 道 · <span style="color:var(--warn-deep);">{{ dueTotal }} 道</span> 今天到期</div>
      <div class="sub">FSRS 算法根据你的作答历史算出记忆曲线——最该复习的已置顶。其它题目暂不需要复习（过早复习=浪费时间）。</div>
    </div>


<!-- 错题闪卡复习（OpenTutor 同款：3D 翻牌 + 四档评分，沉浸式浮层） -->
    <div v-if="!flashcardMode && (listTotal > 0 || dueTotal > 0)" style="margin-bottom:12px;display:flex;gap:10px;flex-wrap:wrap;">
      <button class="secondary" @click="flashcardMode = true">🎴 错题闪卡复习<template v-if="dueTotal > 0"> · 今日 {{ dueTotal }} 张到期</template></button>
    </div>

    <FlashcardReview v-if="flashcardMode" @close="onFcClose" />

    <!-- 拍错题入本（Vision03：主动收录闭环；OCR 识别题干 + 原图随记录保存） -->
    <div class="card" style="padding:14px 18px;margin-bottom:14px;">
      <div style="display:flex;align-items:center;gap:10px;">
        <strong style="font-size:14px;">📷 拍错题入本</strong>
        <span style="font-size:12px;color:var(--ink3);">把做错/不会的题拍下来自动识别题干——进本即按 FSRS 排期复习</span>
        <button v-if="!manualOpen" class="secondary" style="margin-left:auto;" @click="manualOpen = true">＋ 打开录入</button>
        <button v-else class="secondary" style="margin-left:auto;" @click="manualOpen = false">收起</button>
      </div>
      <template v-if="manualOpen">
        <textarea v-model="manual.question" class="input" rows="2" style="margin-top:10px;" placeholder="OCR 识别出的题干（可修改），或直接粘贴题目"></textarea>
        <textarea v-model="manual.note" class="input" rows="2" style="margin-top:8px;" placeholder="备注：当时怎么错的 / 卡在哪一步（选填）"></textarea>
        <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;">
          <select v-model="manual.errorType" class="input" style="flex:1;min-width:140px;">
            <option value="">错因：未分类</option>
            <option v-for="t in ERROR_TYPES" :key="t.value" :value="t.value">{{ t.label }}</option>
          </select>
          <select v-model="manual.kpCode" class="input" style="flex:1;min-width:140px;">
            <option value="">知识点：暂不标注</option>
            <option v-for="k in kpOptions" :key="k.value" :value="k.value">{{ k.label }}</option>
          </select>
        </div>
        <HomeworkPhotos v-model="manual.photos" :max="1" @ocr="onManualOcr" />
        <div style="display:flex;gap:10px;margin-top:10px;">
          <button class="primary" :disabled="manualSubmitting" @click="submitManual">📌 入本</button>
          <span style="font-size:11.5px;color:var(--ink3);align-self:center;">入本后按 FSRS 自动排期，临到期自动提醒复习</span>
        </div>
      </template>
    </div>
    <!-- FSRS 记忆稳定性热力图（独家创新） -->
    <div class="fsrs-section">
      <h4>🌡️ 记忆稳定性热力图 · {{ totalErrors }} 道错题的"会忘程度"</h4>
      <div class="sub">色越深 = 记忆越稳。<b class="ok">绿色稳定区</b>的题目系统认为你不会再忘，<b>红色衰减区</b>说明已临近期末，再不复习就会忘掉。点击格子查看具体题目。</div>
      <div v-if="heatLoading" style="padding:24px;text-align:center;color:var(--ink3);font-size:13px;">记忆曲线加载中…</div>
      <div v-else-if="heatError" style="padding:24px;text-align:center;color:var(--ink3);font-size:13px;">{{ heatError }}</div>
      <div v-else-if="heatAllEmpty" style="padding:24px;text-align:center;color:var(--ink3);font-size:13px;">
        做题后这里会长出记忆曲线 📈
        <div style="margin-top:10px;"><button class="redo-btn" style="max-width:220px;margin:0 auto;" @click="goPractice">去练一组题</button></div>
      </div>
      <div v-else style="display:flex;align-items:center;justify-content:center;gap:20px;flex-wrap:wrap;">
        <div>
          <div style="display:grid;grid-template-columns:repeat(7,18px);gap:4px;font-size:10px;color:var(--ink3);margin-bottom:4px;">
            <span v-for="d in ['一','二','三','四','五','六','日']" :key="d" class="heatmap-day">{{ d }}</span>
          </div>
          <div class="heatmap">
            <div v-for="(c, i) in heatmap" :key="i" class="heatmap-cell" :class="c.level" @click="heatTip(c)">
              <span class="cell-tip">{{ heatCellTip(c) }}</span>
            </div>
          </div>
        </div>
        <div class="legend">
          <span v-for="g in HEAT_LEGEND" :key="g.label" class="legend-item">
            <span class="swatch" :style="g.swatch"></span>{{ g.label }}
          </span>
        </div>
      </div>
    </div>

    <!-- 今日待复习队列 -->
    <div class="due-queue">
      <div class="head">
        <h4>📌 今日到期 {{ dueTotal }} 道 · 按"再不做就忘"程度排序</h4>
        <span style="font-size:11.5px;color:var(--ink3);">FSRS 算法 · 自动排期</span>
      </div>
      <div v-if="dueLoading" style="padding:20px;text-align:center;color:var(--ink3);font-size:13px;">到期队列加载中…</div>
      <div v-else-if="dueError" style="padding:20px;text-align:center;color:var(--ink3);font-size:13px;">{{ dueError }}</div>
      <div v-else-if="!dueItems.length" style="padding:24px;text-align:center;font-size:13px;">
        <div style="font-size:15px;font-weight:700;margin-bottom:4px;">🎉 今日无到期错题</div>
        <div style="color:var(--ink3);">记忆保持得很好，去练新题吧！</div>
      </div>
      <div v-else class="items">
        <div v-for="d in dueItems" :key="d.record_id" class="item" @click="openDetail(d.record_id, d.seq)">
          <div class="num">{{ String(d.seq).padStart(2, '0') }}</div>
          <div class="body">
            <div class="q"><LatexText :text="d.question_preview" /></div>
            <div class="meta">
              <span>📚 {{ d.kp_name || d.kp_code || '未标注知识点' }}</span>
              <span>📅 入本 {{ fmtMD(d.created_at) }} · 已答错 {{ d.wrong_count }} 次</span>
            </div>
          </div>
          <div class="next">{{ forgetLabel(d) }}</div>
          <div class="arrow">›</div>
        </div>
      </div>
    </div>

    <!-- 视图切换 -->
    <div class="section-head">
      <h2>错题详情 · 第 {{ String(selectedSeq).padStart(2, '0') }} 题</h2>
      <div class="view-tabs" style="margin:0;">
        <button
          v-for="t in tabs" :key="t"
          :class="{ active: activeTab === t }"
          @click="switchTab(t)"
        >{{ t }}</button>
      </div>
    </div>

    <!-- 错题卡（三段式 · Anki 风格） -->
    <div class="error-card">
      <div v-if="detailLoading" style="padding:32px;text-align:center;color:var(--ink3);font-size:13px;">错题详情加载中…</div>
      <div v-else-if="detailError" style="padding:32px;text-align:center;color:var(--ink3);font-size:13px;">{{ detailError }}</div>
      <div v-else-if="!detail" style="padding:32px;text-align:center;font-size:13px;">
        <div style="font-size:15px;font-weight:700;margin-bottom:4px;">📒 暂无错题，继续保持</div>
        <div style="color:var(--ink3);">做错的题会自动收录到这里，并附上 AI 错因分析。</div>
      </div>
      <template v-else>
        <div class="head">
          <div class="lbl">
            <span class="num">{{ String(selectedSeq).padStart(2, '0') }} / {{ totalErrors }}</span>
            <span class="topic">{{ detail.kp_name || detail.kp_code || '未标注知识点' }}</span>
            <span class="days">入本 {{ fmtMD(detail.entered_at) }} · 已答错 {{ detail.wrong_count }} 次 · 复习 {{ detail.review_count }} 次</span>
          </div>
        </div>
        <div class="body">
          <!-- 左：题目 + 正解 -->
          <div class="q-side">
            <h5>原题</h5>
            <MarkdownView class="q-text" :text="detail.question_text" />
            <div v-if="(detail.image && detail.image.length) || photoUrl" class="q-fig">
              <DynamicFigureViewer :items="figItems" :label="'题目配图'" :height="300" />
            </div>
            <button v-if="detail" class="secondary" style="margin-top:10px;display:block;" @click="genDynamicFigure" :disabled="figBusy">
              {{ figBusy ? '⏳ AI 生成动态图形中…' : (hasGgb ? '🔄 重新生成动态图形' : '🔍 生成动态图形（可拖动/旋转/缩放）') }}
            </button>
            <h5>正解 <span v-if="!detailFull" class="text-muted text-xs" style="font-weight:400;">(AI 生成中…)</span></h5>
            <div class="options" :style="reviewing ? { filter: 'blur(6px)', userSelect: 'none' } : {}">
              <div v-if="!detailFull" class="opt right" style="color:var(--ink3);">AI 正在分析题目与错因，生成详细正解…</div>
              <MarkdownView v-else class="opt right" :text="detailFull.generated_answer || '暂无正解文本'" style="display:block;" />
            </div>
            <div style="font-size:11.5px;color:var(--ink3);display:flex;gap:14px;padding-top:8px;border-top:1px dashed var(--line);">
              <span>📅 {{ detail.next_review_at ? '下次复习 ' + fmtMD(detail.next_review_at) : '已毕业，不再排期' }}</span>
              <span v-if="originZh">来源：{{ originZh }}</span>
            </div>
          </div>
          <!-- 右：错因对话化 + 巩固建议 -->
          <div class="a-side">
            <h5>AI 问诊 · 错因</h5>
            <div v-if="diagLoading" class="ai-says" style="color:var(--ink3);">AI 正在分析这道题的错因…</div>
            <div v-else-if="diag" class="ai-says">
              <div style="font-weight:700;color:var(--brand-deep);margin-bottom:6px;">「{{ diag.subtype_zh || errorTypeZh(detail.error_type) }}」· AI 诊断</div>
              <div style="white-space:pre-line;line-height:1.7;">{{ diag.diagnosis }}</div>
            </div>
            <div v-else class="ai-says">
              这道题错因类型为<b>"{{ errorTypeZh(detail.error_type) }}"</b>。
              <template v-if="detail.note">{{ detail.note }}</template>
              <template v-else>建议对照左侧正解复盘当时的思路，把关键一步写在错题卡上。</template>
              <br/><br/>
              💡 <b>巩固建议</b>：<i>{{ detail.variants_hint }}</i>
            </div>

            <!-- AI 答疑：Khanmigo 苏格拉底引导式 chat（不直给答案） -->
            <h5 style="margin-top:14px;">💬 AI 答疑 · 举一反三</h5>
            <div class="ai-tutor">
              <div v-if="!tutorHistory.length && !tutorSending" class="tutor-tip">
                卡住了？把你的思路告诉 AI（<b>不会直接给答案</b>，会一步步引导你独立解答）。
              </div>
              <div v-for="(m, i) in tutorHistory" :key="i" class="tutor-msg" :class="m.role">
                <span class="tutor-role">{{ m.role === 'user' ? '我' : '老师' }}</span>
                <div class="tutor-bubble">{{ m.content }}</div>
              </div>
              <div v-if="tutorSending" class="tutor-msg assistant">
                <span class="tutor-role">老师</span>
                <div class="tutor-bubble tutor-loading">AI 正在引导你…</div>
              </div>
              <div class="tutor-input">
                <input
                  v-model="tutorInput"
                  type="text"
                  placeholder="输入你的思路或疑问…回车发送"
                  @keyup.enter="sendTutorMsg"
                  :disabled="tutorSending"
                />
                <button
                  class="btn btn-sm btn-primary"
                  :disabled="!tutorInput.trim() || tutorSending"
                  @click="sendTutorMsg"
                >发送</button>
              </div>
            </div>

            <div class="tags">
              <span class="tag-pill err">{{ errorTypeZh(detail.error_type) }}</span>
              <span class="tag-pill warn">已答错 {{ detail.wrong_count }} 次</span>
              <span class="tag-pill purple">{{ detail.kp_name || detail.kp_code || '未标注' }}</span>
            </div>
            <!-- FSRS 稳定性区块（旧数据未回填时为 null，整块隐藏） -->
            <div v-if="detail.memory_stability != null" class="variants">
              <h6>🧠 记忆状态（FSRS）</h6>
              <ol>
                <li><b>稳定度</b> · S ≈ {{ fmtStability(detail.memory_stability) }} 天</li>
                <li><b>当前记得概率</b> · {{ pct(detail.retrievability) }}%</li>
                <li><b>记忆等级</b> · {{ levelZh(detail.fsrs_level) }}</li>
              </ol>
            </div>
            <div v-if="!reviewing" style="display:flex;gap:10px;">
              <button class="redo-btn" style="flex:1;" @click="redo">🔄 隐藏答案重做</button>
              <button class="redo-btn" style="flex:1;background:var(--brand-bg,#fff7e6);border-color:var(--brand,#f59e0b);" @click="redoWithSocratic">🎯 引导重解</button>
            </div>
            <div v-else style="display:flex;gap:10px;">
              <button class="redo-btn" style="flex:1;" :disabled="reviewSubmitting" @click="submitReview('remembered')">✅ 记住了</button>
              <button class="redo-btn" style="flex:1;background:var(--err-bg);border-color:var(--err-border);color:var(--err-deep,#b91c1c);" :disabled="reviewSubmitting" @click="submitReview('forgotten')">❌ 没记住</button>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- 错题列表（多维筛选） -->
    <div class="card" style="padding:0;overflow:hidden;">
      <div style="padding:14px 20px;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;">
        <strong style="font-size:14px;">📚 全部 {{ listTotal }} 道 · 点击展开详情</strong>
        <span style="font-size:12px;color:var(--ink3);">按入本时间倒序</span>
      </div>
      <!-- 维度取值（选中"按错因/知识点/时间/稳定度"后出现） -->
      <div v-if="activeTab !== '全部'" style="padding:10px 20px;border-bottom:1px dashed var(--line);display:flex;gap:8px;flex-wrap:wrap;">
        <button
          v-for="opt in subOptions" :key="opt.value"
          class="tag-pill"
          :class="subFilter === opt.value ? 'warn' : ''"
          style="cursor:pointer;"
          @click="switchSub(opt.value)"
        >{{ opt.label }}</button>
        <span v-if="!subOptions.length" style="font-size:12px;color:var(--ink3);">暂无可选{{ activeTab.slice(1) }}，先入本一些错题</span>
      </div>
      <div v-if="listLoading" style="padding:20px;text-align:center;color:var(--ink3);font-size:13px;">错题列表加载中…</div>
      <div v-else-if="listError" style="padding:20px;text-align:center;color:var(--ink3);font-size:13px;">{{ listError }}</div>
      <div v-else-if="!listItems.length" style="padding:24px;text-align:center;font-size:13px;color:var(--ink3);">
        {{ hasFilter ? '该条件下没有错题' : '暂无错题，继续保持 🎉' }}
      </div>
      <div v-else style="padding:8px 0;">
        <div
          v-for="(o, i) in listItems" :key="o.record_id"
          style="padding:10px 20px;display:flex;align-items:center;gap:14px;border-bottom:1px dashed var(--line);cursor:pointer;"
          :style="o.fsrs_level === 'lv4' || o.fsrs_level === 'lv3' ? { color: 'var(--ink3)' } : {}"
          @click="openDetail(o.record_id, i + 1)"
        >
          <span class="tag-pill" :class="levelTagCls(o.fsrs_level)" style="flex-shrink:0;">{{ levelZh(o.fsrs_level) }}</span>
          <LatexText style="flex:1;font-size:13px;font-weight:600;" :style="o.fsrs_level === 'lv4' || o.fsrs_level === 'lv3' ? { fontWeight: 400 } : {}" :text="o.question_preview" />
          <span style="font-size:11.5px;color:var(--ink3);">{{ o.kp_name || o.kp_code || '未标注' }} · 复习 {{ o.review_count }} 次 · 记得 {{ pct(o.retrievability) }}%</span>
          <span style="color:var(--ink3);">›</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '@/api/client'
import { butlerApi, filesApi, studentApi } from '@/api'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import LatexText from '@/components/LatexText.vue'
import MarkdownView from '@/components/MarkdownView.vue'
import HomeworkPhotos from '@/components/student/HomeworkPhotos.vue'
import FlashcardReview from '@/components/student/FlashcardReview.vue'
import DynamicFigureViewer from '@/components/DynamicFigureViewer.vue'

const router = useRouter()
const toast = useToastStore()
const auth = useAuthStore()
const nickname = computed(() => auth.nickname)

/* 热力图图例：色块 + 语义文字（色越深记忆越稳，红色为衰减临忘） */
const HEAT_LEGEND = [
  { label: '稳固', swatch: 'background:#d97706;' },
  { label: '良好', swatch: 'background:#f59e0b;' },
  { label: '模糊', swatch: 'background:#fbbf24;' },
  { label: '危险', swatch: 'background:#fde68a;' },
  { label: '遗忘', swatch: 'background:#fef2f2;border:1px solid #fecaca;' },
  { label: '刚收录', swatch: 'background:#e5e7eb;border:1px solid #d1d5db;' },
]

/* ===== 维度筛选 tabs（全部/错因/知识点/时间/稳定度 → GET /error-records/filter） ===== */
const tabs = ['全部', '按错因', '按知识点', '按时间', '按稳定度']
const activeTab = ref('全部')
const subFilter = ref('')

const ERROR_TYPES = [
  { value: 'concept', label: '概念不清' },
  { value: 'formula', label: '公式记错' },
  { value: 'calculation', label: '计算失误' },
  { value: 'logic', label: '思路错误' },
  { value: 'reading', label: '审题偏差' },
]
const STABILITY_OPTS = [
  { value: 'stable', label: '稳定区' },
  { value: 'decaying', label: '衰减中' },
  { value: 'critical', label: '临忘（衰减红）' },
]
const TIME_OPTS = [
  { value: '7', label: '近 7 天' },
  { value: '30', label: '近 30 天' },
  { value: '90', label: '近 90 天' },
]

/* ===== 状态 ===== */
const heatmap = ref([])
const heatLoading = ref(true)
const heatError = ref('')

const dueItems = ref([])
const dueTotal = ref(0)
const dueLoading = ref(true)
const dueError = ref('')

const listItems = ref([])
const listTotal = ref(0)
const listLoading = ref(true)
const listError = ref('')
const totalErrors = ref(0)
const kpOptions = ref([])

const detail = ref(null)
// 手动拍照入本的原图 URL（file_id -> /files/{id}/content 预签名 URL）
const photoUrl = ref('')
// 动态图形（AI → GeoGebra 交互构造）：渲染源 = image 列（data-URI + ggb 对象）+ 原图照片
const figBusy = ref(false)
const figItems = computed(() => {
  const arr = Array.isArray(detail.value?.image) ? detail.value.image.slice() : []
  if (photoUrl.value) arr.push(photoUrl.value)
  return arr
})
const hasGgb = computed(() =>
  Array.isArray(detail.value?.image) && detail.value.image.some((e) => e && typeof e === 'object' && e.type === 'ggb')
)
async function genDynamicFigure() {
  if (!detail.value || figBusy.value) return
  figBusy.value = true
  try {
    const data = await api.post(`/student/error-records/${detail.value.record_id}/figure`)
    if (data?.ggb) {
      toast.success(data.generated ? '动态图形已生成，可拖动/旋转/缩放 🎉' : '已展示动态图形')
      await openDetail(detail.value.record_id, selectedSeq.value)
    }
  } catch (e) {
    toast.error(`动态图形生成失败：${e?.message || '请稍后重试'}（可继续用静态图复习）`)
  } finally {
    figBusy.value = false
  }
}
const detailLoading = ref(false)
const detailError = ref('')
const selectedSeq = ref(1)
const reviewing = ref(false)
const reviewSubmitting = ref(false)
// 迭代17：AI 错因诊断（根因/记忆口诀/补救建议；接口异常回退规则模板）
const diag = ref(null)
const diagLoading = ref(false)
// 迭代17：AI 详情（正解，取代"暂无正解文本"）+ AI 答疑苏格拉底 chat
const detailFull = ref(null)
const tutorInput = ref('')
const tutorHistory = ref([])
const tutorSending = ref(false)

const heatAllEmpty = computed(() => heatmap.value.length > 0 && heatmap.value.every((c) => c.level === 'empty'))
const hasFilter = computed(() => activeTab.value !== '全部' && !!subFilter.value)

const subOptions = computed(() => {
  if (activeTab.value === '按错因') return ERROR_TYPES
  if (activeTab.value === '按知识点') return kpOptions.value
  if (activeTab.value === '按时间') return TIME_OPTS
  if (activeTab.value === '按稳定度') return STABILITY_OPTS
  return []
})

/* ===== 工具 ===== */
function fmtMD(iso) {
  if (!iso) return '--'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '--'
  return `${d.getMonth() + 1}/${d.getDate()}`
}
function pct(v) {
  return Math.round((Number(v) || 0) * 100)
}
function fmtStability(s) {
  const n = Number(s)
  return Number.isFinite(n) ? (n >= 10 ? Math.round(n) : n.toFixed(1)) : '--'
}
function errorTypeZh(t) {
  return ERROR_TYPES.find((e) => e.value === t)?.label || '未分类'
}
function levelZh(lv) {
  return { lv4: '非常稳', lv3: '稳定', lv2: '一般', lv1: '偏弱', decay: '快忘了', new: '刚收录' }[lv] || '待评估'
}
function levelTagCls(lv) {
  if (lv === 'lv4' || lv === 'lv3') return 'ok'
  if (lv === 'lv2' || lv === 'lv1') return 'warn'
  if (lv === 'decay') return 'err'
  if (lv === 'new') return 'brand'
  return 'brand'
}
function forgetLabel(d) {
  const h = Number(d.hours_to_forget)
  if (!Number.isFinite(h)) return `⚠ ${d.urgency_label || '待复习'}`
  if (h < 1) return '⚠ 1 小时内就会忘'
  if (h < 48) return `⚠ 还剩 ${Math.round(h)} 小时会忘`
  return `📍 约 ${Math.round(h / 24)} 天后会忘`
}

/* ===== 数据加载（各块独立 loading/error，互不影响） ===== */
async function loadHeatmap() {
  heatLoading.value = true
  heatError.value = ''
  try {
    const data = await api.get('/student/error-records/memory-heatmap')
    heatmap.value = data?.cells || []
  } catch (e) {
    heatError.value = `热力图加载失败：${e.message || '请稍后重试'}`
  } finally {
    heatLoading.value = false
  }
}

async function loadDue() {
  dueLoading.value = true
  dueError.value = ''
  try {
    const data = await api.get('/student/error-records/due-queue')
    dueItems.value = data?.items || []
    dueTotal.value = data?.total ?? dueItems.value.length
    if (dueItems.value.length && !detail.value) {
      openDetail(dueItems.value[0].record_id, dueItems.value[0].seq)
    }
  } catch (e) {
    dueError.value = `到期队列加载失败：${e.message || '请稍后重试'}`
  } finally {
    dueLoading.value = false
  }
}

function buildFilterQuery() {
  const q = { page: 1, size: 50 }
  if (!subFilter.value) return q
  if (activeTab.value === '按错因') q.error_type = subFilter.value
  else if (activeTab.value === '按知识点') q.kp_code = subFilter.value
  else if (activeTab.value === '按稳定度') q.stability = subFilter.value
  else if (activeTab.value === '按时间') {
    const d = new Date()
    d.setDate(d.getDate() - Number(subFilter.value))
    q.date_from = d.toISOString().slice(0, 10)
  }
  return q
}

async function loadFilter() {
  listLoading.value = true
  listError.value = ''
  try {
    const data = await api.get('/student/error-records/filter', buildFilterQuery())
    listItems.value = data?.items || []
    listTotal.value = data?.total ?? listItems.value.length
    // 无筛选时同步总错题数 + 知识点选项
    if (!hasFilter.value) {
      totalErrors.value = listTotal.value
      const map = new Map()
      listItems.value.forEach((it) => {
        if (it.kp_code && !map.has(it.kp_code)) map.set(it.kp_code, it.kp_name || it.kp_code)
      })
      kpOptions.value = [...map.entries()].map(([value, label]) => ({ value, label }))
      if (!detail.value && !dueItems.value.length && listItems.value.length) {
        openDetail(listItems.value[0].record_id, 1)
      }
    }
  } catch (e) {
    listError.value = `错题列表加载失败：${e.message || '请稍后重试'}`
  } finally {
    listLoading.value = false
  }
}

async function openDetail(recordId, seq = 1) {
  if (!recordId) return
  selectedSeq.value = seq
  reviewing.value = false
  detailLoading.value = true
  detailError.value = ''
  diag.value = null
  detailFull.value = null
  tutorHistory.value = []
  photoUrl.value = ''
  diagLoading.value = true
  try {
    detail.value = await api.get(`/student/error-records/${recordId}/detail`)
  } catch (e) {
    detail.value = null
    detailError.value = `详情加载失败：${e.message || '请稍后重试'}`
  } finally {
    detailLoading.value = false
  }
  // 手动拍照入本的原图：file_id -> 预签名内容 URL（与 AssignmentView 照片解析一致）
  if (detail.value?.file_id) {
    try {
      const d = await filesApi.contentUrl(detail.value.file_id)
      if (d?.url) photoUrl.value = d.url
    } catch { /* 图片暂不可用：不阻塞详情 */ }
  }
  // AI 错因诊断 + AI 详情（正解）best-effort，并发拉取
  Promise.allSettled([
    butlerApi.errorDiagnosis(recordId).then((d) => { diag.value = d }).catch((e) => { diag.value = null; console.warn('[ErrorsView] error-diagnosis 失败：', e?.message || e) }),
    butlerApi.errorDetail(recordId).then((d) => { detailFull.value = d }).catch((e) => { detailFull.value = null; console.warn('[ErrorsView] error-detail 失败：', e?.message || e) }),
  ]).finally(() => { diagLoading.value = false })
}

async function sendTutorMsg() {
  if (!tutorInput.value.trim() || tutorSending.value || !detail.value) return
  const msg = tutorInput.value.trim()
  tutorHistory.value = [...tutorHistory.value, { role: 'user', content: msg }]
  tutorInput.value = ''
  tutorSending.value = true
  try {
    const res = await butlerApi.errorTutor({
      recordId: detail.value.record_id,
      student_message: msg,
      history: tutorHistory.value.slice(0, -1),
    })
    tutorHistory.value = [...tutorHistory.value, { role: 'assistant', content: res.tutor_reply || '（AI 没回复）' }]
  } catch (e) {
    tutorHistory.value = [...tutorHistory.value, { role: 'assistant', content: `（暂时没回复：${e.message || '稍后重试'}）` }]
  } finally {
    tutorSending.value = false
  }
}

/* ===== 交互 ===== */
/* 格子 hover 弹层文案：等级语义 + 该格题数（空格提示无到期错题） */
function heatCellTip(c) {
  if (!c || !c.count) return '无到期错题'
  const label = { lv4: '稳固', lv3: '良好', lv2: '模糊', lv1: '危险', decay: '遗忘', new: '刚收录' }[c.level]
  return label ? `${label} · ${c.count} 题` : `${c.count} 题`
}
function heatTip(c) {
  if (!c || !c.count) return // 空格无到期错题，hover 弹层已提示
  openDetail(c.record_ids[0], selectedSeq.value)
}
function switchTab(t) {
  activeTab.value = t
  subFilter.value = ''
  loadFilter()
}
function switchSub(v) {
  subFilter.value = subFilter.value === v ? '' : v
  loadFilter()
}
function redo() {
  reviewing.value = true
  toast.info('已隐藏答案，请独立重做后选择结果 ⏱')
}
// om5 修复轮 D2：错题 → 引导重解（深链 /dialog?explain=，DialogView 已有该入口处理）
function redoWithSocratic() {
  const q = new URLSearchParams()
  q.set('explain', detail.value.question_text || '')
  if (detail.value.answer_text) q.set('answer', detail.value.answer_text)
  if (detail.value.error_type) q.set('error_type', detail.value.error_type)
  if (detail.value.kp_code) q.set('kp', detail.value.kp_code)
  if (detail.value.file_id) q.set('file_id', detail.value.file_id)
  router.push('/dialog?' + q.toString())
}
const _ORIGIN_ZH = {
  self_test: '自测练题', chat_quiz: '对话出题', socratic: '引导解题',
  mock_exam: '模拟考试', variant: '变式巩固', retry: '错题重练',
  assignment: '老师作业', manual: '手动录入',
}
const originZh = computed(() => {
  const o = detail.value.origin || (detail.value.source_channel === 'manual_photo' ? 'manual' : '')
  return _ORIGIN_ZH[o] || (detail.value.source_channel === 'auto_judge' ? '练题判分' : detail.value.source_channel)
})
async function submitReview(result) {
  if (!detail.value || reviewSubmitting.value) return
  reviewSubmitting.value = true
  try {
    const data = await api.post(`/student/error-records/${detail.value.record_id}/review`, { result })
    if (data?.graduated) {
      toast.success('🎓 这道错题已毕业，不再排期！')
    } else if (result === 'forgotten') {
      toast.info('已重置复习进度，明天再来一次 💪')
    } else {
      toast.success(`复习完成，下次复习 ${fmtMD(data?.next_review_at)}`)
    }
    reviewing.value = false
    // 复习改变了 FSRS 状态，刷新热力图 / 到期队列 / 详情
    loadHeatmap()
    loadDue()
    loadFilter()
    openDetail(detail.value.record_id, selectedSeq.value)
  } catch (e) {
    toast.error(`复习提交失败：${e.message || '请稍后重试'}`)
  } finally {
    reviewSubmitting.value = false
  }
}
function goPractice() {
  router.push('/practice')
}


/* ===== 错题闪卡复习（OpenTutor 同款沉浸复习） ===== */
const flashcardMode = ref(false)
function onFcClose() {
  flashcardMode.value = false
  loadHeatmap()
  loadDue()
  loadFilter()
}

/* ===== 拍错题入本（Vision03） ===== */
const manualOpen = ref(false)
const manualSubmitting = ref(false)
const manual = ref({ question: '', note: '', errorType: '', kpCode: '', photos: [] })
function onManualOcr(text) {
  if (text && !manual.value.question.trim()) manual.value.question = text
}
async function submitManual() {
  const q = manual.value.question.trim()
  if (!q && !manual.value.photos.length) { toast.error('请先粘贴题干或拍照'); return }
  if (manualSubmitting.value) return
  manualSubmitting.value = true
  try {
    const fileId = manual.value.photos[0]?.file_id || null
    await studentApi.createErrorRecord({
      question_text: q || '（拍照错题）',
      error_type: manual.value.errorType || null,
      kp_code: manual.value.kpCode || null,
      file_id: fileId,
      source_channel: 'manual_photo',
    })
    if (manual.value.note.trim()) {
      // 备注回写 best-effort：查重命中后 PATCH
      try {
        const rec = await api.get('/student/error-records', { q: (q || '（拍照错题）').slice(0, 40) })
        const hit = (rec?.items || []).find((r) => r.question_text === (q || '（拍照错题）'))
        if (hit) await api.patch(`/student/error-records/${hit.record_id}`, { note: manual.value.note.trim() })
      } catch { /* 备注回写失败不回影响入本 */ }
    }
    toast.success('已收录，自动排入复习队列')
    manual.value = { question: '', note: '', errorType: '', kpCode: '', photos: [] }
    manualOpen.value = false
    loadHeatmap(); loadDue(); loadFilter()
  } catch (e) { toast.error(`入本失败：${e?.message || '请稍后重试'}`) }
  finally { manualSubmitting.value = false }
}
onMounted(() => {
  loadHeatmap()
  loadDue()
  loadFilter()
})
</script>

<style scoped>
/* 图例：色块 + 文字成组排列 */
.legend-item { display: inline-flex; align-items: center; gap: 5px; font-weight: 600; }
/* 格子 hover 弹层：显示该格题数（不拦截点击，点格子仍打开详情） */
.heatmap-cell { position: relative; }
.q-fig { margin: 10px 0; text-align: center; }
.q-fig img { max-width: 100%; max-height: 260px; border: 1px solid var(--line); border-radius: 8px; background: #fff; }
.heatmap-cell .cell-tip {
  display: none;
  position: absolute;
  bottom: calc(100% + 6px);
  left: 50%;
  transform: translateX(-50%);
  padding: 3px 8px;
  background: var(--ink, #111827);
  color: #fff;
  font-size: 10.5px;
  line-height: 1.4;
  border-radius: 6px;
  white-space: nowrap;
  pointer-events: none;
  z-index: 5;
}
.heatmap-cell:hover .cell-tip { display: block; }

/* ===== AI 答疑（Khanmigo 苏格拉底 chat） ===== */
.ai-tutor { display: flex; flex-direction: column; gap: 8px; margin-top: 6px; }
.tutor-tip { color: var(--ink3); font-size: 12.5px; line-height: 1.55; padding: 6px 0; }
.tutor-msg { display: flex; flex-direction: column; gap: 3px; }
.tutor-msg.user { align-items: flex-end; }
.tutor-msg.assistant { align-items: flex-start; }
.tutor-role { font-size: 10.5px; color: var(--ink3); font-weight: 600; }
.tutor-bubble {
  max-width: 100%; padding: 8px 12px; font-size: 12.5px; line-height: 1.6;
  border-radius: 10px; word-break: break-word;
  background: var(--bg2); color: var(--ink); border: 1px solid var(--line);
}
.tutor-msg.user .tutor-bubble { background: var(--brand-soft); border-color: var(--warn-border); color: var(--ink); }
.tutor-msg.assistant .tutor-bubble { background: var(--ok-bg); border-color: var(--ok-border); }
.tutor-loading { color: var(--ink3); font-style: italic; }
.tutor-input { display: flex; gap: 6px; margin-top: 4px; }
.tutor-input input {
  flex: 1; padding: 7px 10px; font-size: 12.5px;
  border: 1px solid var(--line); border-radius: 8px;
  background: var(--card); color: var(--ink);
}
.tutor-input input:focus { outline: none; border-color: var(--brand); }
.tutor-input input:disabled { opacity: 0.5; }
</style>
