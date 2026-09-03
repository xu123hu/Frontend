<template>
  <div id="tv2-slides" class="tv2-slides">
    <!-- 顶栏：模板库 + 导出 -->
    <div class="tv2-card tv2-slides__topbar">
      <div class="tv2-card__body tv2-slides__topbar-row">
        <div class="tv2-slides__title">
          <b>{{ deck?.title || '生成课件' }}</b>
          <span class="tv2-card__sub" v-if="deck">{{ deck.class_name }} · {{ deck.slides.length }} 页 · v{{ deck.version }}</span>
          <span v-if="deck?.exported_at" class="tv2-tag tv2-tag--ok">已导出</span>
        </div>
        <div class="tv2-slides__tpl-mini">
          <button
            v-for="t in templates" :key="t.template_id" class="tv2-slides__tpl-chip" :class="{ 'is-active': deck?.template_id === t.template_id }"
            type="button" :title="`${t.name} · ${t.desc}`" :data-testid="`tv2-tpl-${t.template_id}`"
            @click="switchTemplate(t)"
          >
            <span class="tv2-slides__tpl-swatch" :style="{ background: t.swatch.bg }">
              <span :style="{ background: t.swatch.primary }" /><span :style="{ background: t.swatch.accent }" />
            </span>
            {{ t.name }}
          </button>
        </div>
        <div class="tv2-slides__topbar-actions">
          <button class="tv2-btn" type="button" :disabled="!deck" @click="regenPage">↻ 单页重生成</button>
          <button class="tv2-btn tv2-btn--primary" type="button" :disabled="!deck" data-testid="tv2-slides-export" @click="exportDeck('pptx')">导出 PPTX</button>
        </div>
      </div>
    </div>

    <!-- 生成进度 -->
    <div v-if="generating" class="tv2-card">
      <div class="tv2-card__body" style="display: flex; align-items: center; gap: 14px">
        <span class="tv2-ai-badge">✦ 逐页生成中</span>
        <div class="tv2-progress" style="flex: 1">
          <div class="tv2-progress__bar tv2-progress__bar--ai" :style="{ width: genProgress + '%' }" />
        </div>
        <span style="font-size: 12.5px; color: var(--tv2-ai); font-weight: 600; white-space: nowrap">{{ genLabel }}</span>
      </div>
    </div>

    <div v-if="error" class="tv2-error" role="alert">{{ error }} <button class="tv2-btn tv2-btn--sm" type="button" @click="init">重试</button></div>

    <!-- 三区主体 -->
    <div v-if="deck" class="tv2-slides__body">
      <!-- 左：大纲缩略 -->
      <aside class="tv2-slides__thumbs">
        <div
          v-for="(s, i) in deck.slides" :key="s.id"
          class="tv2-slides__thumb" :class="{ 'is-active': i === current }"
          type="button" @click="current = i"
        >
          <div class="tv2-slides__thumb-canvas"><SlideCanvas :slide="s" :template="tpl" /></div>
          <div class="tv2-slides__thumb-meta">
            <span class="tv2-slides__thumb-no">{{ i + 1 }}</span>
            <span class="tv2-slides__thumb-title">{{ s.title }}</span>
            <span class="tv2-slides__thumb-kind" :class="'k-' + s.kind">{{ kindLabel(s.kind) }}</span>
          </div>
          <button
            class="tv2-slides__thumb-del" :class="{ 'is-confirm': confirmDel === s.id }" type="button"
            :title="confirmDel === s.id ? '再次点击确认删除' : '删除本页'" :data-testid="`tv2-del-${s.id}`"
            @click.stop="onDelete(s)"
          >
            {{ confirmDel === s.id ? '确认' : '×' }}
          </button>
        </div>
        <div class="tv2-slides__add">
          <button v-if="!adding" class="tv2-slides__add-btn" type="button" data-testid="tv2-add-page" @click="adding = true">＋ 添加页面</button>
          <div v-else class="tv2-slides__add-kinds">
            <div class="tv2-slides__add-title">选择页面类型</div>
            <button
              v-for="k in kindOptions" :key="k.value" class="tv2-slides__add-kind" :class="'k-' + k.value" type="button"
              :data-testid="`tv2-add-kind-${k.value}`" @click="onAdd(k.value)"
            >{{ k.label }}</button>
            <button class="tv2-slides__add-cancel" type="button" @click="adding = false">取消</button>
          </div>
        </div>
      </aside>

      <!-- 中：画布 -->
      <main class="tv2-slides__stage" @wheel.prevent="onWheel">
        <div class="tv2-slides__canvas-wrap" data-testid="tv2-slides-canvas">
          <SlideCanvas :key="deck.slides[current]?.id + deck.template_id" :slide="deck.slides[current]" :template="tpl" />
        </div>
        <div class="tv2-slides__stage-bar">
          <button class="tv2-btn tv2-btn--sm" type="button" :disabled="current === 0" @click="current--">‹ 上一页</button>
          <span class="tv2-slides__pager">{{ current + 1 }} / {{ deck.slides.length }}</span>
          <button class="tv2-btn tv2-btn--sm" type="button" :disabled="current >= deck.slides.length - 1" @click="current++">下一页 ›</button>
          <span class="tv2-card__sub">滚轮翻页 · 16:9 · 1280×720 基准</span>
        </div>
        <p v-if="deck.slides[current]?.remark" class="tv2-slides__remark">※ {{ deck.slides[current].remark }}</p>
      </main>

      <!-- 右：属性面板 -->
      <aside class="tv2-slides__panel">
        <section class="tv2-card">
          <div class="tv2-card__head"><div class="tv2-card__title">页面信息</div><div class="tv2-card__sub">改类型自动重排内容</div></div>
          <div class="tv2-card__body">
            <div class="tv2-slides__prop-edit">
              <span>页面类型</span>
              <select
                class="tv2-select" :value="deck.slides[current]?.kind" data-testid="tv2-kind-select"
                @change="onKindChange(($event.target as HTMLSelectElement).value)"
              >
                <option v-for="k in kindOptions" :key="k.value" :value="k.value">{{ k.label }}</option>
              </select>
            </div>
            <div class="tv2-slides__prop-edit">
              <span>标题</span>
              <input v-model="titleDraft" class="tv2-input tv2-input--sm" type="text" data-testid="tv2-title-input" @keyup.enter="saveTitle" />
            </div>
            <div style="margin: 4px 0 8px; text-align: right">
              <button class="tv2-btn tv2-btn--sm tv2-btn--primary" type="button" data-testid="tv2-title-save" @click="saveTitle">保存标题</button>
            </div>
            <div class="tv2-slides__prop-row"><span>元素数</span><b>{{ deck.slides[current]?.elements.length }}</b></div>
            <div class="tv2-slides__prop-row"><span>当前模板</span><b>{{ tpl?.name }}</b></div>
          </div>
        </section>

        <section class="tv2-card">
          <div class="tv2-card__head"><div class="tv2-card__title">元素清单</div><div class="tv2-card__sub">模板与内容分离 · 换模板不丢内容</div></div>
          <div class="tv2-card__body tv2-slides__elements">
            <div v-for="el in deck.slides[current]?.elements" :key="el.id" class="tv2-slides__el">
              <span class="tv2-tag tv2-tag--slate">{{ elTypeLabel(el.type) }}</span>
              <span class="tv2-slides__el-desc">{{ elDesc(el) }}</span>
            </div>
          </div>
        </section>

        <section class="tv2-card">
          <div class="tv2-card__head"><div class="tv2-card__title">模板库</div></div>
          <div class="tv2-card__body tv2-slides__tpl-grid">
            <button
              v-for="t in templates" :key="t.template_id" class="tv2-slides__tpl-card" :class="{ 'is-active': deck.template_id === t.template_id }"
              type="button" @click="switchTemplate(t)"
            >
              <div class="tv2-slides__tpl-preview" :style="{ background: t.swatch.bg }">
                <span :style="{ background: t.swatch.primary }" /><span :style="{ background: t.swatch.accent }" />
              </div>
              <div class="tv2-slides__tpl-name">{{ t.name }}</div>
              <div class="tv2-slides__tpl-desc">{{ t.desc }}</div>
            </button>
          </div>
        </section>

        <section class="tv2-card">
          <div class="tv2-card__head"><div class="tv2-card__title">讲稿备注</div></div>
          <div class="tv2-card__body">
            <textarea v-model="remarkDraft" class="tv2-textarea" rows="4" placeholder="本页讲授要点…" />
            <div style="margin-top: 8px; display: flex; gap: 8px">
              <button class="tv2-btn tv2-btn--sm" type="button" @click="remarkDraft = deck.slides[current]?.remark || ''">还原</button>
              <button class="tv2-btn tv2-btn--sm tv2-btn--primary" type="button" @click="saveRemark">保存备注</button>
            </div>
          </div>
        </section>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import SlideCanvas from '@/components/teacherV2/SlideCanvas.vue'
import { v2Api } from '@/api/teacherV2'
import { useToastStore } from '@/stores/toast'
import { useTaskCenterStore } from '@/stores/teacherV2Tasks'
import type { V2SlideElement, V2SlideTemplate } from '@/types/teacherV2'

const route = useRoute()
const toast = useToastStore()
const taskStore = useTaskCenterStore()

const deck = ref<any>(null)
const templates = ref<V2SlideTemplate[]>([])
const current = ref(0)
const generating = ref(false)
const genProgress = ref(0)
const genLabel = ref('')
const error = ref('')
const remarkDraft = ref('')
const titleDraft = ref('')
const adding = ref(false)
const confirmDel = ref<string | null>(null)
let confirmTimer: ReturnType<typeof setTimeout> | undefined

const tpl = computed(() => templates.value.find((t) => t.template_id === deck.value?.template_id) || null)

const kindLabels: Record<string, string> = {
  cover: '封面', objective: '学习目标', explore: '探究', example: '例题', variant: '变式', summary: '小结', homework: '作业', end: '结束',
}
const kindLabel = (k?: string) => kindLabels[k || ''] || k || ''
const kindOptions = Object.entries(kindLabels).map(([value, label]) => ({ value, label }))

async function init() {
  error.value = ''
  try {
    const tplRes = await v2Api.templates()
    templates.value = tplRes.data.items

    if (route.query.generate && route.query.plan) {
      await generateDeck(String(route.query.plan))
    } else {
      const res = await v2Api.deck('deck-ellipse-001')
      deck.value = res.data
      titleDraft.value = deck.value.slides?.[0]?.title || ''
    }
  } catch (e: any) {
    error.value = e?.message || '加载失败'
  }
}

async function generateDeck(planId: string) {
  generating.value = true
  genProgress.value = 5
  genLabel.value = '读取教案结构…'
  deck.value = null
  v2Api.generateDeck({ plan_id: planId }, (event, data) => {
    if (event === 'meta') {
      genProgress.value = 12
      genLabel.value = '规划页面结构…'
    } else if (event === 'outline') {
      genProgress.value = 25
      genLabel.value = `逐页渲染 ${data.slides.length} 页…`
    } else if (event === 'page') {
      genProgress.value = 25 + Math.round((data.index / data.total) * 70)
      genLabel.value = `第 ${data.index}/${data.total} 页 · ${data.slide.title}`
      if (!deck.value) deck.value = { deck_id: data.slide ? '' : '', slides: [], template_id: 'math-theorem-dark', version: 0, title: '', class_name: '', class_id: '', plan_id: planId, exported_at: null }
      deck.value.slides.push(data.slide)
      current.value = data.index - 1
    } else if (event === 'done') {
      deck.value = data.deck
      genProgress.value = 100
      genLabel.value = '生成完成'
      generating.value = false
      current.value = 0
      titleDraft.value = deck.value.slides?.[0]?.title || ''
      remarkDraft.value = ''
      toast.success(`课件已生成：${data.deck.slides.length} 页`)
    }
  }).finished.catch(() => {
    generating.value = false
    toast.error('课件生成中断，请重试')
  })
}

async function switchTemplate(t: V2SlideTemplate) {
  if (!deck.value || deck.value.template_id === t.template_id) return
  const res = await v2Api.patchDeck(deck.value.deck_id, { template_id: t.template_id })
  deck.value = res.data
  toast.success(`已切换模板「${t.name}」· ${deck.value.slides.length} 页内容完整保留`)
}

async function regenPage() {
  if (!deck.value) return
  const slide = deck.value.slides[current.value]
  const res = await v2Api.regenerateSlide(deck.value.deck_id, slide.id)
  deck.value = res.data.deck
  toast.success(`第 ${current.value + 1} 页已重生成`)
}

async function onAdd(kind: string) {
  if (!deck.value) return
  adding.value = false
  try {
    const after = deck.value.slides[current.value]
    const res = await v2Api.addSlide(deck.value.deck_id, { kind: kind as any, after_page_id: after?.id })
    deck.value = res.data.deck
    current.value = deck.value.slides.findIndex((s: { id: string }) => s.id === res.data.slide.id)
    toast.success(`已添加「${kindLabel(kind)}」页，插入到第 ${current.value + 1} 页`)
  } catch (e: any) {
    toast.error(e?.message || '添加页面失败')
  }
}

function onDelete(slide: { id: string; title: string }) {
  if (!deck.value) return
  if (confirmDel.value !== slide.id) {
    confirmDel.value = slide.id
    clearTimeout(confirmTimer)
    confirmTimer = setTimeout(() => { confirmDel.value = null }, 2600)
    return
  }
  clearTimeout(confirmTimer)
  confirmDel.value = null
  const idx = deck.value.slides.findIndex((s: any) => s.id === slide.id)
  v2Api.deleteSlide(deck.value.deck_id, slide.id).then((res) => {
    deck.value = res.data.deck
    if (current.value >= deck.value.slides.length) current.value = deck.value.slides.length - 1
    toast.success(`已删除「${slide.title}」页`)
  }).catch((e: any) => {
    toast.error(e?.message || '删除失败')
  })
}

async function onKindChange(kind: string) {
  if (!deck.value) return
  const slide = deck.value.slides[current.value]
  if (!slide || slide.kind === kind) return
  try {
    const res = await v2Api.patchSlide(deck.value.deck_id, slide.id, { kind: kind as any })
    deck.value = res.data
    toast.success(`页面类型已改为「${kindLabel(kind)}」· 内容按新类型重排`)
  } catch (e: any) {
    toast.error(e?.message || '类型修改失败')
  }
}

async function saveTitle() {
  if (!deck.value) return
  const slide = deck.value.slides[current.value]
  if (!slide || !titleDraft.value.trim() || titleDraft.value.trim() === slide.title) return
  try {
    const res = await v2Api.patchSlide(deck.value.deck_id, slide.id, { title: titleDraft.value })
    deck.value = res.data
    toast.success('标题已保存')
  } catch (e: any) {
    toast.error(e?.message || '标题保存失败')
  }
}

async function exportDeck(format: 'pptx' | 'pdf') {
  if (!deck.value) return
  const res = await v2Api.exportDeck(deck.value.deck_id, format)
  taskStore.refresh()
  toast.info(`已发起 ${format.toUpperCase()} 导出，可在任务中心查看进度`)
}

const saveRemark = () => {
  if (!deck.value) return
  deck.value.slides[current.value].remark = remarkDraft.value
  toast.success('讲稿备注已保存')
}
watch(current, () => {
  remarkDraft.value = deck.value?.slides?.[current.value]?.remark || ''
  titleDraft.value = deck.value?.slides?.[current.value]?.title || ''
  adding.value = false
  confirmDel.value = null
})

const onWheel = (e: WheelEvent) => {
  if (!deck.value) return
  if (e.deltaY > 8 && current.value < deck.value.slides.length - 1) current.value++
  else if (e.deltaY < -8 && current.value > 0) current.value--
}

const elTypeLabels: Record<string, string> = { text: '文本', latex: '公式', functionGraph: '函数图', geometry: '几何', image: '图片', pageNo: '页码' }
const elTypeLabel = (t: string) => elTypeLabels[t] || t
function elDesc(el: V2SlideElement): string {
  if (el.type === 'text') return String(el.html).replace(/<[^>]+>/g, '').slice(0, 26)
  if (el.type === 'latex') return el.latex.slice(0, 30)
  if (el.type === 'geometry') return `${el.shape}`
  if (el.type === 'functionGraph') return `y = ${el.expr}`
  if (el.type === 'image') return el.alt || '图片'
  return `第 ${el.pageNo} 页`
}

onMounted(init)
</script>

<style scoped>
.tv2-slides { display: flex; flex-direction: column; gap: 14px; }
.tv2-slides__topbar-row { display: flex; align-items: center; gap: 14px; }
.tv2-slides__title { display: flex; align-items: baseline; gap: 9px; min-width: 0; }
.tv2-slides__title b { font-size: 15px; white-space: nowrap; }
.tv2-slides__tpl-mini { display: flex; gap: 6px; flex: 1; overflow-x: auto; padding: 2px; }
.tv2-slides__tpl-chip {
  display: flex; align-items: center; gap: 7px; border: 1px solid var(--tv2-line); border-radius: 999px;
  padding: 5px 11px 5px 5px; font-size: 12px; cursor: pointer; white-space: nowrap; background: var(--tv2-card); color: var(--tv2-ink2);
}
.tv2-slides__tpl-chip:hover { border-color: var(--tv2-primary-border); }
.tv2-slides__tpl-chip.is-active { border-color: var(--tv2-primary); color: var(--tv2-primary); font-weight: 600; background: var(--tv2-primary-soft); }
.tv2-slides__tpl-swatch { width: 26px; height: 18px; border-radius: 5px; display: flex; overflow: hidden; flex-shrink: 0; border: 1px solid rgba(0,0,0,.12); }
.tv2-slides__tpl-swatch span { flex: 1; }
.tv2-slides__topbar-actions { display: flex; gap: 8px; }

.tv2-slides__body { display: grid; grid-template-columns: 218px minmax(0, 1fr) 292px; gap: 14px; align-items: start; }
.tv2-slides__thumbs { display: flex; flex-direction: column; gap: 9px; max-height: calc(100vh - 210px); overflow-y: auto; padding-right: 2px; }
.tv2-slides__thumb { border: 2px solid transparent; border-radius: 10px; overflow: hidden; cursor: pointer; background: var(--tv2-card); box-shadow: var(--tv2-shadow-sm); }
.tv2-slides__thumb:hover { border-color: var(--tv2-primary-border); }
.tv2-slides__thumb.is-active { border-color: var(--tv2-primary); }
.tv2-slides__thumb-canvas { border-radius: 8px 8px 0 0; overflow: hidden; }
.tv2-slides__thumb-meta { display: flex; align-items: center; gap: 6px; padding: 6px 9px; }
.tv2-slides__thumb-no { font-size: 11px; font-weight: 800; color: var(--tv2-ink3); font-family: var(--tv2-font-num); }
.tv2-slides__thumb-title { flex: 1; font-size: 11.5px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tv2-slides__thumb-kind { font-size: 10px; border-radius: 4px; padding: 1px 5px; font-weight: 700; }
.tv2-slides__thumb-kind.k-cover { background: var(--tv2-primary-soft); color: var(--tv2-primary); }
.tv2-slides__thumb-kind.k-example, .tv2-slides__thumb-kind.k-variant { background: var(--tv2-teal-soft); color: var(--tv2-teal); }
.tv2-slides__thumb-kind.k-explore { background: var(--tv2-amber-soft); color: var(--tv2-amber); }
.tv2-slides__thumb-kind.k-objective, .tv2-slides__thumb-kind.k-summary, .tv2-slides__thumb-kind.k-homework { background: var(--tv2-ai-soft); color: var(--tv2-ai); }

.tv2-slides__thumb { position: relative; }
.tv2-slides__thumb-del {
  position: absolute; top: 5px; right: 5px; width: 22px; height: 22px; border-radius: 6px; border: none;
  background: rgba(15, 23, 42, 0.55); color: #fff; font-size: 13px; line-height: 1; cursor: pointer; opacity: 0;
  transition: opacity 0.15s;
}
.tv2-slides__thumb:hover .tv2-slides__thumb-del { opacity: 1; }
.tv2-slides__thumb-del:hover { background: #b91c1c; }
.tv2-slides__thumb-del.is-confirm { opacity: 1; width: auto; padding: 0 8px; font-size: 11.5px; font-weight: 700; background: #b91c1c; }
.tv2-slides__add { flex-shrink: 0; }
.tv2-slides__add-btn {
  width: 100%; border: 1.5px dashed var(--tv2-line2); border-radius: 10px; background: var(--tv2-card); color: var(--tv2-ink2);
  font-size: 12.5px; font-weight: 600; padding: 10px; cursor: pointer; transition: border-color 0.15s, color 0.15s;
}
.tv2-slides__add-btn:hover { border-color: var(--tv2-primary); color: var(--tv2-primary); }
.tv2-slides__add-kinds { display: flex; flex-wrap: wrap; gap: 5px; border: 1.5px solid var(--tv2-primary-border); border-radius: 10px; background: var(--tv2-card); padding: 9px; }
.tv2-slides__add-title { font-size: 11px; font-weight: 700; color: var(--tv2-ink3); margin-bottom: 7px; width: 100%; }
.tv2-slides__add-kind {
  border: 1px solid var(--tv2-line); border-radius: 6px; background: var(--tv2-bg2); color: var(--tv2-ink2);
  font-size: 11.5px; font-weight: 600; padding: 4px 9px; cursor: pointer;
}
.tv2-slides__add-kind:hover { border-color: var(--tv2-primary); color: var(--tv2-primary); }
.tv2-slides__add-cancel { border: none; background: none; color: var(--tv2-ink3); font-size: 11px; cursor: pointer; width: 100%; margin-top: 4px; }
.tv2-slides__add-cancel:hover { color: var(--tv2-ink); }
.tv2-slides__prop-edit { display: flex; align-items: center; gap: 8px; font-size: 12.5px; padding: 5px 0; border-bottom: 1px dashed var(--tv2-line2); }
.tv2-slides__prop-edit > span { color: var(--tv2-ink3); width: 52px; flex-shrink: 0; }
.tv2-slides__prop-edit .tv2-select, .tv2-slides__prop-edit .tv2-input { flex: 1; min-width: 0; }
.tv2-select, .tv2-input {
  border: 1px solid var(--tv2-line); border-radius: 8px; background: var(--tv2-card); color: var(--tv2-ink);
  font-size: 12.5px; padding: 6px 9px; font-family: inherit;
}
.tv2-select:focus, .tv2-input:focus { outline: none; border-color: var(--tv2-primary); box-shadow: 0 0 0 3px var(--tv2-primary-soft); }

.tv2-slides__stage { display: flex; flex-direction: column; gap: 11px; min-width: 0; }
.tv2-slides__stage-bar { display: flex; align-items: center; gap: 10px; }
.tv2-slides__pager { font-size: 13px; font-weight: 700; font-family: var(--tv2-font-num); }
.tv2-slides__remark { font-size: 12px; color: var(--tv2-ai); margin: 0; }

.tv2-slides__panel { display: flex; flex-direction: column; gap: 12px; max-height: calc(100vh - 210px); overflow-y: auto; }
.tv2-slides__prop-row { display: flex; justify-content: space-between; align-items: baseline; font-size: 12.5px; padding: 5px 0; border-bottom: 1px dashed var(--tv2-line2); }
.tv2-slides__prop-row span { color: var(--tv2-ink3); }
.tv2-slides__prop-row b { font-weight: 600; text-align: right; }
.tv2-slides__elements { display: flex; flex-direction: column; gap: 6px; }
.tv2-slides__el { display: flex; align-items: center; gap: 8px; font-size: 11.5px; }
.tv2-slides__el-desc { color: var(--tv2-ink2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: var(--tv2-font-num); }
.tv2-slides__tpl-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.tv2-slides__tpl-card { text-align: left; border: 1.5px solid var(--tv2-line); border-radius: 10px; padding: 7px; cursor: pointer; background: var(--tv2-card); }
.tv2-slides__tpl-card:hover { border-color: var(--tv2-primary-border); }
.tv2-slides__tpl-card.is-active { border-color: var(--tv2-primary); box-shadow: 0 0 0 3px var(--tv2-primary-soft); }
.tv2-slides__tpl-preview { height: 44px; border-radius: 7px; display: flex; overflow: hidden; }
.tv2-slides__tpl-preview span { flex: 1; }
.tv2-slides__tpl-name { font-size: 11.5px; font-weight: 700; margin-top: 6px; }
.tv2-slides__tpl-desc { font-size: 10.5px; color: var(--tv2-ink3); margin-top: 2px; line-height: 1.4; }
</style>
