<template>
  <div id="tv2-resources" class="tv2-res">
    <!-- 顶栏 -->
    <div class="tv2-card tv2-res__topbar">
      <div class="tv2-card__body tv2-res__topbar-row">
        <div>
          <b class="tv2-res__title">资源中心</b>
          <span class="tv2-card__sub">校本题库 {{ schoolCount }} 题 · 待审候选 {{ pendingCount }} 题 · 资源 {{ items.length }} 份</span>
        </div>
        <div class="tv2-res__topbar-actions">
          <button class="tv2-btn tv2-btn--primary" type="button" data-testid="tv2-res-upload" @click="fileInput?.click()">⬆ 上传校本习题集</button>
          <input ref="fileInput" type="file" accept=".pdf,.docx,.zip" style="display: none" @change="onFile" />
        </div>
      </div>
    </div>

    <div v-if="error" class="tv2-error" role="alert">{{ error }} <button class="tv2-btn tv2-btn--sm" type="button" @click="init">重试</button></div>

    <!-- 摄取进度 -->
    <div v-if="ingesting" class="tv2-card">
      <div class="tv2-card__body" style="display: flex; align-items: center; gap: 14px">
        <span class="tv2-ai-badge">✦ 智能摄取中</span>
        <div class="tv2-progress" style="flex: 1"><div class="tv2-progress__bar tv2-progress__bar--ai" :style="{ width: ingestPct + '%' }" /></div>
        <span style="font-size: 12.5px; color: var(--tv2-ai); font-weight: 600; white-space: nowrap">{{ ingestLabel }}</span>
      </div>
    </div>

    <div class="tv2-res__body">
      <!-- 左：教材树 -->
      <aside class="tv2-card tv2-res__tree">
        <div class="tv2-card__head"><div class="tv2-card__title">教材版本</div><div class="tv2-card__sub">按目录归类</div></div>
        <div class="tv2-card__body tv2-res__tree-body">
          <button class="tv2-res__allbtn" :class="{ 'is-on': !activeNode }" type="button" @click="activeNode = ''">全部资源</button>
          <div v-for="book in tree" :key="book.code" class="tv2-res__book">
            <button class="tv2-res__book-head" type="button" @click="expanded.has(book.code) ? expanded.delete(book.code) : expanded.add(book.code)">
              <span class="tv2-res__caret" :class="{ 'is-open': expanded.has(book.code) }">▸</span>{{ book.name }}
            </button>
            <div v-if="expanded.has(book.code)">
              <button
                v-for="ch in book.children || []" :key="ch.code"
                class="tv2-res__ch" :class="{ 'is-on': activeNode === ch.code }"
                type="button" @click="activeNode = activeNode === ch.code ? '' : ch.code"
              >{{ ch.name }}</button>
            </div>
          </div>
        </div>
      </aside>

      <!-- 中：资源列表 -->
      <main class="tv2-res__main">
        <div class="tv2-card">
          <div class="tv2-card__head">
            <div class="tv2-card__title">{{ activeNodeLabel }}</div>
            <div class="tv2-card__sub">{{ filteredItems.length }} 份</div>
          </div>
          <div class="tv2-card__body">
            <div v-if="!filteredItems.length" class="tv2-empty" style="padding: 36px 0">
              <div class="tv2-empty__title">该目录暂无资源</div>
              <div class="tv2-empty__desc">上传校本习题集，审核通过后自动归入本目录。</div>
            </div>
            <div v-else class="tv2-res__list">
              <div v-for="r in filteredItems" :key="r.resource_id" class="tv2-res__item" :data-testid="`tv2-res-${r.kind}`">
                <div class="tv2-res__item-icon" :class="'k-' + r.kind">
                  {{ { question_set: '题', lesson: '案', video: '▶', doc: '文' }[r.kind] }}
                </div>
                <div class="tv2-res__item-body">
                  <div class="tv2-res__item-title">
                    <b>{{ r.title }}</b>
                    <span class="tv2-tag" :class="originClass(r.origin)">{{ { school: '校本', official: '官方', platform: '平台' }[r.origin] }}</span>
                  </div>
                  <div class="tv2-res__item-meta">
                    <span>{{ r.kp_name }}</span>
                    <span v-if="r.question_count">{{ r.question_count }} 题</span>
                    <span>{{ r.size_label }}</span>
                    <span>更新 {{ r.updated_at }}</span>
                  </div>
                </div>
                <button class="tv2-btn tv2-btn--sm" type="button">预览</button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <!-- 右：摄取审核 -->
      <aside class="tv2-res__side">
        <!-- 摄取结果说明 -->
        <section class="tv2-card" v-if="ingestResult">
          <div class="tv2-card__head">
            <div class="tv2-card__title">摄取结果</div>
            <div class="tv2-card__sub">{{ ingestResult.file_name }}</div>
          </div>
          <div class="tv2-card__body">
            <p class="tv2-res__ingest-note">
              共识别 <b>{{ ingestResult.total }}</b> 道候选题，其中 <b>{{ pendingCount }}</b> 道待人工审核。
              审核通过的题目将自动进入组卷检索池（带「校本」角标）。
            </p>
          </div>
        </section>

        <!-- 候选审核队列 -->
        <section class="tv2-card">
          <div class="tv2-card__head">
            <div class="tv2-card__title"><span class="tv2-ai-badge tv2-ai-badge--sm">✦</span>候选审核</div>
            <div class="tv2-card__sub">{{ candidates.length ? `待审 ${pendingCount} / 共 ${candidates.length}` : '暂无候选' }}</div>
          </div>
          <div class="tv2-card__body">
            <div v-if="!candidates.length" class="tv2-empty" style="padding: 28px 0">
              <div class="tv2-empty__title">还没有待审候选</div>
              <div class="tv2-empty__desc">上传校本习题集（PDF / Word / 图片包），OCR 识别后在此逐题审核。</div>
            </div>
            <div v-else class="tv2-res__cands">
              <div
                v-for="c in candidates" :key="c.candidate_id"
                class="tv2-res__cand" :class="'s-' + c.status"
                :data-testid="`tv2-cand-${c.candidate_id}`"
              >
                <div class="tv2-res__cand-head">
                  <span class="tv2-tag" :class="confClass(c.confidence)">置信度 {{ { high: '高', mid: '中', low: '低' }[c.confidence] }}</span>
                  <span class="tv2-res__cand-src">{{ c.ocr_image_hint }}</span>
                  <span v-if="c.status !== 'pending'" class="tv2-tag" :class="c.status === 'approved' ? 'tv2-tag--ok' : 'tv2-tag--err'">
                    {{ c.status === 'approved' ? '已入库' : '已驳回' }}
                  </span>
                </div>
                <QuestionCard :question="c.suggested" compact :show-answer="true" :show-analysis="false" />
                <div v-if="c.status === 'pending'" class="tv2-res__cand-actions">
                  <button class="tv2-btn tv2-btn--sm tv2-btn--danger" type="button" :data-testid="`tv2-cand-reject-${c.candidate_id}`" @click="review(c, 'reject')">驳回</button>
                  <button class="tv2-btn tv2-btn--sm tv2-btn--primary" type="button" :data-testid="`tv2-cand-approve-${c.candidate_id}`" @click="review(c, 'approve')">✓ 审核入库</button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import QuestionCard from '@/components/teacherV2/QuestionCard.vue'
import { v2Api } from '@/api/teacherV2'
import { useToastStore } from '@/stores/toast'
import { useTaskCenterStore } from '@/stores/teacherV2Tasks'
import type { V2CandidateQuestion, V2ResourceItem } from '@/types/teacherV2'

const toast = useToastStore()
const taskStore = useTaskCenterStore()

const tree = ref<any[]>([])
const items = ref<V2ResourceItem[]>([])
const candidates = ref<V2CandidateQuestion[]>([])
const activeNode = ref('')
const expanded = ref(new Set(['rjxa-xbx1']))
const error = ref('')

const fileInput = ref<HTMLInputElement>()
const ingesting = ref(false)
const ingestPct = ref(0)
const ingestLabel = ref('')
const ingestResult = ref<{ task_id: string; file_name: string; total: number } | null>(null)

const filteredItems = computed(() => {
  if (!activeNode.value) return items.value
  return items.value.filter((r) => {
    const ch = tree.value.flatMap((b) => b.children || []).find((c) => c.code === activeNode.value)
    return ch ? r.kp_name.includes(String(ch.name).replace(/[的]/g, '')) || r.kp_name.includes(ch.name) : true
  })
})
const activeNodeLabel = computed(() => {
  if (!activeNode.value) return '全部资源'
  const ch = tree.value.flatMap((b) => b.children || []).find((c) => c.code === activeNode.value)
  return ch?.name || '资源'
})
const pendingCount = computed(() => candidates.value.filter((c) => c.status === 'pending').length)
const schoolCount = computed(() => candidates.value.filter((c) => c.status === 'approved').length)

function originClass(o: string) { return { school: 'tv2-tag--info', official: 'tv2-tag--ok', platform: 'tv2-tag--slate' }[o] || 'tv2-tag--slate' }
function confClass(c: string) { return { high: 'tv2-tag--ok', mid: 'tv2-tag--warn', low: 'tv2-tag--err' }[c] || 'tv2-tag--slate' }

async function init() {
  error.value = ''
  try {
    const [res, candRes] = await Promise.all([v2Api.resources(), v2Api.candidates()])
    tree.value = res.data.tree as any[]
    items.value = res.data.items
    candidates.value = candRes.data.items
  } catch (e: any) {
    error.value = e?.message || '加载失败'
  }
}

async function onFile(e: Event) {
  const input = e.target as HTMLInputElement
  const fileName = input.files?.[0]?.name || '教研组椭圆习题集.pdf'
  input.value = ''
  ingesting.value = true
  ingestPct.value = 6
  ingestLabel.value = `上传 ${fileName}…`
  try {
    const res = await v2Api.uploadResource(fileName)
    const taskId = res.data.task_id
    // 轮询任务直到完成（摄取任务 mock 侧约 3.6s 完成）
    ingestPct.value = 20
    ingestLabel.value = 'OCR 识别题干…'
    let ticks = 0
    const timer = setInterval(async () => {
      ticks += 1
      ingestPct.value = Math.min(92, 20 + ticks * 14)
      ingestLabel.value = ticks < 3 ? 'OCR 识别题干…' : ticks < 5 ? '结构化题目与答案…' : 'AI 匹配知识点…'
      try {
        const t = await v2Api.task(taskId)
        if (t.data.status === 'succeeded') {
          clearInterval(timer)
          ingestPct.value = 100
          ingestLabel.value = '摄取完成'
          const candRes = await v2Api.candidates()
          candidates.value = candRes.data.items
          const total = candidates.value.length || 3
          ingestResult.value = { task_id: taskId, file_name: fileName, total }
          toast.success(`摄取完成：识别出 ${total} 道候选题，请在右侧审核`)
          setTimeout(() => { ingesting.value = false; ingestPct.value = 0 }, 900)
        } else if (t.data.status === 'failed') {
          clearInterval(timer)
          ingesting.value = false
          toast.error('摄取失败：文件解析异常，请检查格式')
        }
      } catch { /* 继续轮询 */ }
    }, 900)
  } catch (e: any) {
    ingesting.value = false
    toast.error(e?.message || '上传失败')
  }
}

async function review(c: V2CandidateQuestion, action: 'approve' | 'reject') {
  try {
    const res = await v2Api.reviewCandidate(c.candidate_id, action)
    const idx = candidates.value.findIndex((x) => x.candidate_id === c.candidate_id)
    if (idx >= 0) candidates.value[idx] = res.data
    if (action === 'approve') toast.success(`已入库：${res.data.suggested.kp_name} · 校本题（可在组卷中心检索到）`)
    else toast.info('已驳回该候选题')
    // 刷新任务中心徽标（无需，轮询自动）
  } catch (e: any) {
    toast.error(e?.message || '审核失败')
  }
}

/* 任务中心里出现摄取任务完成时，自动刷新候选 */
watch(() => taskStore.items.map((t) => t.status + t.task_id).join(), () => {
  if (ingestResult.value) return
  const ingestTask = taskStore.items.find((t) => t.capability === 'resources.ingest')
  if (ingestTask?.status === 'succeeded' && !candidates.value.length) init()
})

onMounted(init)
</script>

<style scoped>
.tv2-res { display: flex; flex-direction: column; gap: 14px; }
.tv2-res__topbar-row { display: flex; align-items: center; gap: 16px; }
.tv2-res__title { font-size: 16px; }
.tv2-res__topbar-row > div:first-child > span { display: block; margin-top: 3px; }
.tv2-res__topbar-actions { margin-left: auto; display: flex; gap: 8px; }
.tv2-res__body { display: grid; grid-template-columns: 224px minmax(0, 1fr) 340px; gap: 14px; align-items: start; }

/* ===== 左：教材树 ===== */
.tv2-res__tree { position: sticky; top: 12px; }
.tv2-res__tree-body { padding: 8px 8px !important; max-height: calc(100vh - 220px); overflow-y: auto; }
.tv2-res__allbtn {
  width: 100%; text-align: left; border: none; background: none; cursor: pointer;
  padding: 7px 10px; border-radius: 7px; font-size: 12.5px; color: var(--tv2-ink2); font-weight: 600;
}
.tv2-res__allbtn:hover, .tv2-res__allbtn.is-on { background: var(--tv2-primary-soft); color: var(--tv2-primary); }
.tv2-res__book-head {
  width: 100%; display: flex; align-items: center; gap: 5px; text-align: left;
  background: none; border: none; cursor: pointer; padding: 7px 8px; border-radius: 7px;
  font-size: 12px; color: var(--tv2-ink2); font-weight: 600;
}
.tv2-res__book-head:hover { background: var(--tv2-bg2); }
.tv2-res__caret { transition: transform .15s; color: var(--tv2-ink3); display: inline-block; width: 12px; }
.tv2-res__caret.is-open { transform: rotate(90deg); }
.tv2-res__ch {
  width: 100%; display: flex; text-align: left; background: none; border: none; cursor: pointer;
  padding: 6px 10px 6px 25px; border-radius: 7px; font-size: 12px; color: var(--tv2-ink2); transition: all .12s;
}
.tv2-res__ch:hover { background: var(--tv2-bg2); }
.tv2-res__ch.is-on { background: var(--tv2-primary-soft); color: var(--tv2-primary); font-weight: 600; }

/* ===== 中：资源列表 ===== */
.tv2-res__list { display: flex; flex-direction: column; }
.tv2-res__item {
  display: flex; align-items: center; gap: 13px; padding: 12px 6px;
  border-bottom: 1px dashed var(--tv2-line2);
}
.tv2-res__item:last-child { border-bottom: none; }
.tv2-res__item-icon {
  width: 38px; height: 38px; border-radius: 10px; display: grid; place-items: center;
  font-size: 14px; font-weight: 700; flex-shrink: 0;
}
.tv2-res__item-icon.k-question_set { background: var(--tv2-primary-soft); color: var(--tv2-primary); }
.tv2-res__item-icon.k-lesson { background: var(--tv2-teal-soft); color: var(--tv2-teal); }
.tv2-res__item-icon.k-video { background: var(--tv2-amber-soft); color: var(--tv2-amber); }
.tv2-res__item-icon.k-doc { background: var(--tv2-slate-soft); color: var(--tv2-slate); }
.tv2-res__item-body { flex: 1; min-width: 0; }
.tv2-res__item-title { display: flex; align-items: center; gap: 8px; }
.tv2-res__item-title b { font-size: 13.5px; }
.tv2-res__item-meta { display: flex; gap: 12px; margin-top: 5px; font-size: 11.5px; color: var(--tv2-ink3); flex-wrap: wrap; }

/* ===== 右：审核 ===== */
.tv2-res__side { display: flex; flex-direction: column; gap: 14px; position: sticky; top: 12px; }
.tv2-res__ingest-note { margin: 0; font-size: 12.5px; color: var(--tv2-ink2); line-height: 1.7; }
.tv2-res__ingest-note b { color: var(--tv2-primary); font-family: var(--tv2-font-num); }
.tv2-res__cands { display: flex; flex-direction: column; gap: 12px; }
.tv2-res__cand { border: 1px solid var(--tv2-line); border-radius: var(--tv2-radius); padding: 12px 13px; }
.tv2-res__cand.s-approved { border-color: var(--tv2-teal-border); background: linear-gradient(180deg, #f4fbfa, #fff); }
.tv2-res__cand.s-rejected { opacity: 0.6; border-color: var(--tv2-line2); }
.tv2-res__cand-head { display: flex; align-items: center; gap: 8px; margin-bottom: 9px; }
.tv2-res__cand-src { font-size: 11px; color: var(--tv2-ink3); margin-left: auto; }
.tv2-res__cand.s-approved .tv2-res__cand-src, .tv2-res__cand.s-rejected .tv2-res__cand-src { margin-left: 0; }
.tv2-res__cand-head > .tv2-tag:last-child { margin-left: auto; }
.tv2-res__cand-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 10px; }

@media (max-width: 1280px) {
  .tv2-res__body { grid-template-columns: 208px minmax(0, 1fr); }
  .tv2-res__side { grid-column: 1 / -1; position: static; }
}
</style>
