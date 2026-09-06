<template>
  <div class="ptx">
    <header class="ptx-head">
      <div class="ptx-head__left">
        <button class="ptx-back" data-testid="ailp-tx-back" @click="emit('back')">←</button>
        <div>
          <h1>从教材开始备课</h1>
          <p>选择教材版本与课时，AI 一键生成精品教案</p>
        </div>
      </div>
      <div class="ptx-steps">
        <div class="ailp-step-dot active">1</div><span class="on">选择教材</span>
        <i class="ptx-line on" />
        <div class="ailp-step-dot">2</div><span>选择课时</span>
        <i class="ptx-line" />
        <div class="ailp-step-dot">3</div><span>确认生成</span>
      </div>
    </header>

    <main class="ptx-main">
      <!-- 左：教材版本 -->
      <aside class="ptx-books ailp-fade">
        <div class="ailp-card" style="padding:20px">
          <h2 class="ptx-sec__title">选择教材版本</h2>
          <div class="ptx-books__grid">
            <button
              v-for="b in BOOKS" :key="b.name"
              class="ptx-book" :class="{ 'is-on': book === b.name }" :data-testid="`ailp-book-${b.name}`"
              @click="book = b.name"
            >
              <span v-if="b.name === '人教A版'" class="ptx-book__badge">默认教材</span>
              <div class="ptx-book__cover">{{ b.name.slice(0, 3) }}</div>
              <h3>{{ b.name }}</h3>
              <p>{{ b.year }}年版</p>
              <small>{{ b.publisher }}</small>
            </button>
          </div>
          <button class="ptx-upload-btn" @click="toastInfo('上传自有教材重建目录：可在资源中心走「上传教材」通道（V3.3 已有）')">📤 上传自己的教材 ›</button>
        </div>
      </aside>

      <!-- 中：章节树 -->
      <div class="ptx-tree ailp-fade" style="animation-delay:0.1s">
        <div class="ailp-card" style="overflow:hidden; display:flex; flex-direction:column; height:100%">
          <div style="padding:16px 18px; border-bottom:1px solid var(--ailp-gray-200)">
            <input v-model="query" class="ptx-search" placeholder="🔍 搜索章节或课时...">
          </div>
          <div class="ptx-tree__scroll">
            <div v-for="grp in treeGroups" :key="grp.name" class="ptx-grp">
              <div class="ptx-grp__head">📂 {{ grp.name }}</div>
              <button
                v-for="les in grp.lessons" :key="les.path"
                class="ptx-lesson" :class="{ 'is-on': selected?.path === les.path }"
                :data-testid="`ailp-lesson-${les.id}`"
                @click="selected = les"
              >
                <i class="ptx-lesson__dot" />
                <span class="ptx-lesson__name">{{ les.leaf }}</span>
                <span class="ptx-lesson__btn" :class="{ 'is-on': selected?.path === les.path }">{{ selected?.path === les.path ? '已选择' : '选择' }}</span>
              </button>
            </div>
            <div v-if="!treeGroups.length" class="ptx-empty">没有匹配的章节。</div>
          </div>
        </div>
      </div>

      <!-- 右：AI 备课预览 -->
      <aside class="ptx-preview ailp-fade" style="animation-delay:0.2s">
        <div class="ailp-card" style="overflow:hidden">
          <div class="ptx-preview__head">
            <span class="ailp-tag" style="background:linear-gradient(135deg,#4f46e5,#06b6d4);color:#fff">✦ AI 备课预览</span>
          </div>
          <div style="padding:16px 18px">
            <template v-if="selected">
              <h3 class="ptx-preview__title">{{ selected.leaf }}</h3>
              <p class="ptx-preview__sub">{{ book }} · {{ selected.path.split(' ▸ ')[1] || '' }}</p>
              <div class="ptx-preview__grid">
                <div><small>预计难度</small><b>中等</b></div>
                <div><small>建议课型</small><b>{{ suggestType }}</b></div>
              </div>
              <div class="ptx-preview__objectives">
                <h4>🎯 教学目标预览</h4>
                <ol>
                  <li v-for="(o, i) in previewObjectives" :key="i">{{ o }}</li>
                </ol>
              </div>
              <div class="ptx-preview__meta">⏱ 45 分钟 · 含 PPT/学案</div>
              <button class="ailp-btn-primary ptx-cta" data-testid="ailp-tx-start" @click="start">✦ 开始备课，AI 生成教案</button>
            </template>
            <div v-else class="ptx-preview__empty">← 在章节树中选择一个课时</div>
          </div>
        </div>
        <div class="ptx-tip">💡 选择课时后，AI 将基于新课标要求自动生成完整教案、PPT 和同步练习（原型：内容源为内置演示）。</div>
      </aside>
    </main>
  </div>
</template>

<script setup lang="ts">
/**
 * PrepFromTextbook —— 从教材开始（P，用户定稿 HTML 移植）
 * 教材版本卡 + 章节树（V3_TEXTBOOK_CHAPTERS 真数据）+ 右侧 AI 备课预览 + 开始备课。
 */
import { computed, onMounted, ref } from 'vue'
import { v3Api, type V3TextbookChapters } from '@/api/teacherV3'
import { startBrief, usePrepChain } from './prepChain'
import { useToastStore } from '@/stores/toast'

const emit = defineEmits<{ (e: 'back'): void; (e: 'start'): void }>()
const chain = usePrepChain()
const toast = { info: (t: string) => useToastStore().info(t) }

const BOOKS = [
  { name: '人教A版', year: '2019', publisher: '人民教育出版社' },
  { name: '北师大版', year: '2019', publisher: '北京师范大学出版社' },
  { name: '苏教版', year: '2020', publisher: '江苏凤凰教育出版社' },
  { name: '人教B版', year: '2019', publisher: '人民教育出版社' },
]
const book = ref('人教A版')
const query = ref('')
const selected = ref<{ id: string; path: string; leaf: string } | null>(null)
const chapters = ref<V3TextbookChapters>({ textbooks: [] })

interface LessonNode { id: string; path: string; leaf: string }
const treeGroups = computed(() => {
  const tb = chapters.value.textbooks.find((t) => t.name.includes(book.value)) || chapters.value.textbooks[0]
  if (!tb) return []
  const groups = new Map<string, LessonNode[]>()
  for (const ch of tb.chapters) {
    if (query.value && !ch.path.includes(query.value.trim())) continue
    const parts = ch.path.split(' ▸ ')
    const key = parts[1] || parts[0] || '章节'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push({ id: ch.id, path: `${tb.name} ▸ ${ch.path}`, leaf: parts[parts.length - 1] })
  }
  return [...groups.entries()].map(([name, lessons]) => ({ name, lessons }))
})

const suggestType = computed(() => {
  const n = selected.value?.leaf || ''
  if (/复习|总结/.test(n)) return '复习讲评'
  if (/习题|应用/.test(n)) return '习题课'
  return '新授课'
})
const previewObjectives = computed(() => {
  const core = selected.value?.leaf.replace(/（.*?）/g, '') || '本节'
  return [
    `理解${core}的核心定义，能准确说出其中的关键条件`,
    `掌握${core}的基本方法（坐标法 / 待定系数法），会解决课本层级问题`,
    `经历${core}的形成过程，体会数形结合思想，发展数学抽象素养`,
  ]
})

function start() {
  if (!selected.value) return
  const leaf = selected.value.leaf
  startBrief({
    source: 'textbook',
    topic: leaf.includes('课时') ? leaf : `${leaf}（第1课时）`,
    textbook: book.value,
    chapter: selected.value.path,
  })
  emit('start')
}
function toastInfo(msg: string) { toast.info(msg) }

onMounted(async () => {
  try {
    const r = await v3Api.catalog.textbookChapters()
    chapters.value = r.data
    const first = chapters.value.textbooks[0]?.chapters[0]
    if (first && !selected.value) selected.value = { id: first.id, path: `${chapters.value.textbooks[0].name} ▸ ${first.path}`, leaf: first.path.split(' ▸ ').pop() || first.path }
  } catch { chapters.value = { textbooks: [] } }
})
void chain
</script>

<style scoped>
.ptx { padding-bottom: 40px; }
.ptx-head { position: relative; z-index: 5; display: flex; align-items: center; justify-content: space-between; padding: 14px 32px; border-bottom: 1px solid var(--ailp-gray-200); background: rgba(255, 255, 255, 0.7); backdrop-filter: blur(6px); }
.ptx-head__left { display: flex; align-items: center; gap: 14px; }
.ptx-back { width: 38px; height: 38px; border-radius: 12px; border: 1px solid var(--ailp-gray-200); background: #fff; cursor: pointer; font-size: 15px; }
.ptx-head h1 { font-size: 17px; font-weight: 700; }
.ptx-head p { font-size: 11.5px; color: var(--ailp-gray-500); }
.ptx-steps { display: flex; align-items: center; gap: 8px; font-size: 12.5px; color: var(--ailp-gray-500); }
.ptx-steps .on { color: var(--ailp-primary-600); font-weight: 600; }
.ptx-line { width: 40px; height: 2px; background: var(--ailp-gray-200); border-radius: 1px; }
.ptx-line.on { background: linear-gradient(90deg, var(--ailp-success-500), var(--ailp-primary-500)); }
.ptx-main { position: relative; z-index: 5; display: flex; gap: 20px; padding: 22px 32px; max-width: 1400px; margin: 0 auto; align-items: flex-start; }
.ptx-books { width: 32%; flex-shrink: 0; }
.ptx-sec__title { font-size: 15px; font-weight: 700; margin-bottom: 14px; }
.ptx-books__grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 14px; }
.ptx-book { position: relative; text-align: left; border: 1px solid var(--ailp-gray-200); background: #fff; border-radius: 12px; padding: 12px; cursor: pointer; transition: all 0.2s ease; }
.ptx-book:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(79, 70, 229, 0.1); }
.ptx-book.is-on { border-color: var(--ailp-primary-400); box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.25); }
.ptx-book__badge { position: absolute; top: 8px; left: 8px; font-size: 9.5px; font-weight: 700; color: #fff; padding: 2px 7px; border-radius: 999px; background: linear-gradient(135deg, #4f46e5, #7c3aed); }
.ptx-book.is-on::after { content: '✓'; position: absolute; top: 8px; right: 8px; width: 18px; height: 18px; border-radius: 50%; display: grid; place-items: center; color: #fff; font-size: 10px; background: linear-gradient(135deg, #4f46e5, #06b6d4); }
.ptx-book__cover { height: 44px; border-radius: 9px; display: grid; place-items: center; font-size: 12px; font-weight: 700; color: var(--ailp-primary-600); background: linear-gradient(135deg, #eef2ff, #e0e7ff); margin-bottom: 9px; }
.ptx-book h3 { font-size: 12.5px; font-weight: 700; }
.ptx-book p { font-size: 10.5px; color: var(--ailp-gray-500); }
.ptx-book small { font-size: 9.5px; color: var(--ailp-gray-400); }
.ptx-upload-btn { width: 100%; padding: 10px; border-radius: 12px; border: 1px dashed var(--ailp-gray-300); background: none; color: var(--ailp-gray-500); font-size: 12.5px; cursor: pointer; }
.ptx-tree { flex: 1; min-width: 0; }
.ptx-search { width: 100%; padding: 10px 14px; border-radius: 12px; border: 1px solid var(--ailp-gray-200); background: var(--ailp-gray-50); font-size: 13px; outline: none; }
.ptx-search:focus { border-color: var(--ailp-primary-400); }
.ptx-tree__scroll { max-height: 62vh; overflow-y: auto; padding: 10px 12px 14px; }
.ptx-grp { margin-bottom: 8px; }
.ptx-grp__head { font-size: 13px; font-weight: 700; color: var(--ailp-gray-700); padding: 8px 10px; }
.ptx-lesson { display: flex; align-items: center; gap: 9px; width: 100%; text-align: left; border: none; background: none; padding: 9px 10px 9px 26px; border-radius: 10px; cursor: pointer; }
.ptx-lesson:hover { background: var(--ailp-gray-50); }
.ptx-lesson.is-on { background: rgba(79, 70, 229, 0.07); border-left: 3px solid var(--ailp-primary-500); }
.ptx-lesson__dot { width: 6px; height: 6px; border-radius: 50%; background: var(--ailp-gray-300); flex-shrink: 0; }
.ptx-lesson.is-on .ptx-lesson__dot { background: var(--ailp-primary-500); }
.ptx-lesson__name { flex: 1; font-size: 13px; color: var(--ailp-gray-800); }
.ptx-lesson.is-on .ptx-lesson__name { color: var(--ailp-primary-700); font-weight: 600; }
.ptx-lesson__btn { font-size: 11px; font-weight: 600; padding: 4px 12px; border-radius: 8px; color: var(--ailp-primary-600); background: var(--ailp-primary-50); }
.ptx-lesson__btn.is-on { color: #fff; background: linear-gradient(135deg, #4f46e5, #06b6d4); }
.ptx-empty { text-align: center; color: var(--ailp-gray-400); font-size: 12.5px; padding: 30px 0; }
.ptx-preview { width: 300px; flex-shrink: 0; }
.ptx-preview__head { padding: 14px 16px 4px; }
.ptx-preview__title { font-size: 15px; font-weight: 700; margin-bottom: 3px; }
.ptx-preview__sub { font-size: 11px; color: var(--ailp-gray-500); margin-bottom: 12px; }
.ptx-preview__grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 14px; }
.ptx-preview__grid > div { border: 1px solid var(--ailp-gray-200); background: var(--ailp-gray-50); border-radius: 10px; padding: 9px 11px; }
.ptx-preview__grid small { display: block; font-size: 10px; color: var(--ailp-gray-400); margin-bottom: 2px; }
.ptx-preview__grid b { font-size: 12.5px; }
.ptx-preview__objectives h4 { font-size: 12.5px; font-weight: 700; margin-bottom: 8px; }
.ptx-preview__objectives ol { padding-left: 18px; display: flex; flex-direction: column; gap: 7px; }
.ptx-preview__objectives li { font-size: 11.5px; color: var(--ailp-gray-600); line-height: 1.6; }
.ptx-preview__meta { font-size: 11px; color: var(--ailp-gray-500); padding: 10px 0; border-top: 1px solid var(--ailp-gray-200); margin: 10px 0 12px; }
.ptx-cta { width: 100%; padding: 13px; border-radius: 12px; font-size: 13.5px; }
.ptx-preview__empty { color: var(--ailp-gray-400); font-size: 12.5px; text-align: center; padding: 30px 0; }
.ptx-tip { margin-top: 12px; padding: 12px 14px; border-radius: 12px; font-size: 11px; color: var(--ailp-gray-500); line-height: 1.7; background: linear-gradient(135deg, rgba(79, 70, 229, 0.06), rgba(6, 182, 212, 0.05)); border: 1px solid var(--ailp-gray-200); }
</style>
