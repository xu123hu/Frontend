<template>
  <div data-testid="tv3-resources">
    <div class="tv3-hero" style="margin-bottom: 18px">
      <div style="display: flex; gap: 24px; align-items: center">
        <div style="flex: 1">
          <div class="tv3-hero__title">资源中心</div>
          <div class="tv3-hero__sub">课件 / 教案 / 构造配方 / 拍照题库 · 备课组共享</div>
        </div>
        <button class="tv3-btn tv3-btn--gold" data-testid="tv3-res-photo" @click="$router.push('/teacher-v3/slides')">📷 拍照入库</button>
      </div>
    </div>

    <div style="display: flex; flex-direction: column; gap: 14px">
      <!-- 构造配方库（核心特色：参数化构造步骤复用） -->
      <div class="tv3-card">
        <div class="tv3-card__head">
          <span class="tv3-card__title">⚙ 构造配方库</span>
          <span class="tv3-card__sub">把「怎么搭出来的」沉淀给备课组 · 一键插入课件</span>
          <div class="tv3-card__spacer" />
          <span class="tv3-tag tv3-tag--gold">教学团队复用</span>
        </div>
        <div class="tv3-card__body" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 10px">
          <div v-for="r in recipes" :key="r.id" class="tv3-recipe" :data-testid="`tv3-recipe-${r.id}`">
            <div class="tv3-recipe__thumb" v-html="recipeSvg(r)" />
            <div class="tv3-recipe__body">
              <div style="display: flex; align-items: center; gap: 6px">
                <span style="font-size: 13px; font-weight: 700; flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis">{{ r.name }}</span>
                <span class="tv3-tag" :class="r.school_shared ? 'tv3-tag--ok' : ''" style="font-size: 10px">{{ r.school_shared ? '校共享' : '私有' }}</span>
              </div>
              <div style="font-size: 11px; color: var(--tv3-ink3); margin-top: 2px">{{ r.author }} · 被用 {{ r.usage_count }} 次</div>
              <div style="font-size: 11.5px; color: var(--tv3-ink2); line-height: 1.6; margin-top: 4px">{{ r.note }}</div>
              <div style="display: flex; gap: 6px; margin-top: 8px">
                <button class="tv3-btn tv3-btn--sm tv3-btn--gold" :data-testid="`tv3-recipe-use-${r.id}`" @click="useRecipe(r)">插入课件</button>
                <span class="tv3-tag tv3-tag--primary" style="font-size: 10px; align-self: center">{{ r.params.length }} 个可调参数</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 资源列表（V3.2：类型分组 + 章节/课题 + 搜索） -->
      <div class="tv3-card">
        <div class="tv3-card__head">
          <span class="tv3-card__title">全部资源</span>
          <span class="tv3-card__sub">{{ baseFiltered.length }} 项</span>
          <div class="tv3-card__spacer" />
          <input v-model="search" class="tv3-input" style="width: 160px" placeholder="搜名称 / 章节 / 学科" data-testid="tv3-res-search">
          <select v-model="chapterFilter" class="tv3-input" style="width: 150px" data-testid="tv3-res-chapter">
            <option value="">全部章节 / 课题</option>
            <option v-for="c in chapterOptions" :key="c" :value="c">{{ c }}</option>
          </select>
          <div class="tv3-seg">
            <button class="tv3-seg__btn" :class="{ 'is-active': kindFilter === '' }" data-testid="tv3-res-kind-all" @click="kindFilter = ''">全部 {{ items.length }}</button>
            <button v-for="k in kinds" :key="k.id" class="tv3-seg__btn" :class="{ 'is-active': kindFilter === k.id }" :data-testid="`tv3-res-kind-${k.id}`" @click="kindFilter = k.id">{{ k.label }} {{ kindCount(k.id) }}</button>
          </div>
        </div>
        <div class="tv3-card__body" style="display: flex; flex-direction: column; gap: 12px">
          <template v-if="!kindFilter">
            <div v-for="g in groupedItems" :key="g.kind">
              <div class="tv3-form-label" style="margin-bottom: 6px" :data-testid="`tv3-res-group-${g.kind}`">
                <span class="tv3-tag tv3-tag--gold" style="font-size: 10.5px">{{ g.label }}</span> {{ g.list.length }} 项
              </div>
              <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 10px">
                <div v-for="it in g.list" :key="it.id" class="tv3-res">
                  <span class="tv3-res__icon" :data-kind="it.kind">{{ kindIcon(it.kind) }}</span>
                  <div style="flex: 1; min-width: 0">
                    <div style="font-size: 13.5px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis">{{ it.name }}</div>
                    <div style="font-size: 11.5px; color: var(--tv3-ink3); margin-top: 2px">{{ it.subject }}<template v-if="it.chapter"> · {{ it.chapter }}</template> · {{ it.owner }} · {{ it.updated_at }}</div>
                  </div>
                  <span v-if="it.shared" class="tv3-tag tv3-tag--ok" style="font-size: 10px">共享</span>
                  <button class="tv3-btn tv3-btn--sm" @click="openItem(it)">打开</button>
                </div>
              </div>
            </div>
          </template>
          <template v-else>
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 10px">
              <div v-for="it in filteredItems" :key="it.id" class="tv3-res">
                <span class="tv3-res__icon" :data-kind="it.kind">{{ kindIcon(it.kind) }}</span>
                <div style="flex: 1; min-width: 0">
                  <div style="font-size: 13.5px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis">{{ it.name }}</div>
                  <div style="font-size: 11.5px; color: var(--tv3-ink3); margin-top: 2px">{{ it.subject }}<template v-if="it.chapter"> · {{ it.chapter }}</template> · {{ it.owner }} · {{ it.updated_at }}</div>
                </div>
                <span v-if="it.shared" class="tv3-tag tv3-tag--ok" style="font-size: 10px">共享</span>
                <button class="tv3-btn tv3-btn--sm" @click="openItem(it)">打开</button>
              </div>
            </div>
          </template>
          <div v-if="!baseFiltered.length" style="text-align: center; color: var(--tv3-ink4); padding: 30px 0; font-size: 13px">当前筛选下暂无资源，换个章节或关键词试试。</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * ResourcesView —— 资源中心
 * 构造配方库（SVG 缩略 + 参数说明 + 一键插入课件）· 资源四类（课件/教案/配方/拍照题库）
 */
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { v3Api, type V3ResourceItem } from '@/api/teacherV3'
import { FIGURE_PRESETS } from '@/components/mathx/presets'
import type { V3Recipe } from '@/types/teacherV3'

const router = useRouter()
const items = ref<V3ResourceItem[]>([])
const recipes = ref<V3Recipe[]>([])
const kindFilter = ref('')
/* V3.2：分类增强 —— 类型分组 + 章节/课题筛选 + 关键词搜索 */
const chapterFilter = ref('')
const search = ref('')

const kinds = [
  { id: 'deck', label: '课件' }, { id: 'plan', label: '教案' },
  { id: 'figure-recipe', label: '配方' }, { id: 'photo-bank', label: '拍照题库' },
]
const kindCount = (id: string) => items.value.filter((i) => i.kind === id).length
const chapterOptions = computed(() => [...new Set(items.value.map((i) => i.chapter || '').filter(Boolean))].sort())
const baseFiltered = computed(() => items.value.filter((i) => {
  if (kindFilter.value && i.kind !== kindFilter.value) return false
  if (chapterFilter.value && (i.chapter || '') !== chapterFilter.value) return false
  const kw = search.value.trim()
  if (kw && !(i.name.includes(kw) || (i.chapter || '').includes(kw) || i.subject.includes(kw))) return false
  return true
}))
/* 未选类型时按类型分组展示（分类一目了然）；选了类型就是平铺列表 */
const groupedItems = computed(() => {
  const map = new Map<string, V3ResourceItem[]>()
  for (const it of baseFiltered.value) {
    if (!map.has(it.kind)) map.set(it.kind, [])
    map.get(it.kind)!.push(it)
  }
  return [...map.entries()].map(([kind, list]) => ({ kind, label: kinds.find((k) => k.id === kind)?.label || kind, list }))
})
const filteredItems = computed(() => (kindFilter.value ? baseFiltered.value : groupedItems.value.flatMap((g) => g.list)))

const kindIcon = (k: string) => ({ deck: '▤', plan: '✎', 'figure-recipe': '⚙', 'photo-bank': '📷' } as Record<string, string>)[k] || '•'

onMounted(async () => {
  const [r1, r2] = await Promise.all([
    v3Api.catalog.resources().then((r) => r.data.items).catch(() => []),
    v3Api.catalog.recipes().then((r) => r.data.items).catch(() => []),
  ])
  items.value = r1
  recipes.value = r2
})

function recipeSvg(r: V3Recipe): string {
  const presetId = r.category === 'conic' ? 'conic/ellipse-coordinate' : r.category === 'function' ? 'function/sine' : 'solid/cube-section'
  const def = FIGURE_PRESETS.find((p) => p.id === presetId)
  if (!def) return ''
  try {
    const p: Record<string, number> = {}
    for (const sp of def.params) p[sp.key] = sp.def
    return def.miniSvg(p)
  } catch { return '' }
}

function useRecipe(_r: V3Recipe) {
  void router.push('/teacher-v3/slides')
}
function openItem(it: V3ResourceItem) {
  if (it.kind === 'deck' || it.kind === 'photo-bank') void router.push('/teacher-v3/slides')
  else if (it.kind === 'plan') void router.push('/teacher-v3/prep')
  else void router.push('/teacher-v3/slides')
}
</script>

<style scoped>
.tv3-recipe { display: flex; gap: 10px; border: 1px solid var(--tv3-line); border-radius: 12px; padding: 10px; background: #fff; transition: all 0.14s ease; }
.tv3-recipe:hover { border-color: var(--tv3-gold-border); box-shadow: var(--tv3-shadow-gold); }
.tv3-recipe__thumb {
  width: 110px; height: 74px; border-radius: 8px; flex-shrink: 0;
  background: #fbfcfe; border: 1px solid var(--tv3-line2); overflow: hidden;
}
.tv3-recipe__thumb :deep(svg) { width: 100%; height: 100%; }
.tv3-recipe__body { flex: 1; min-width: 0; }
.tv3-res { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border: 1px solid var(--tv3-line); border-radius: 12px; background: #fff; }
.tv3-res__icon {
  width: 36px; height: 36px; border-radius: 10px; flex-shrink: 0;
  display: grid; place-items: center; font-size: 17px;
}
.tv3-res__icon[data-kind='deck'] { background: var(--tv3-primary-soft); color: var(--tv3-primary); }
.tv3-res__icon[data-kind='plan'] { background: var(--tv3-ai-soft); color: var(--tv3-ai); }
.tv3-res__icon[data-kind='figure-recipe'] { background: var(--tv3-gold-soft); color: var(--tv3-gold-deep); }
.tv3-res__icon[data-kind='photo-bank'] { background: var(--tv3-amber-soft); color: var(--tv3-amber); }
</style>
