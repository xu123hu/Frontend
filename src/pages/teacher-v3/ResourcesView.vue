<template>
  <div class="tv3-resources-shell" data-testid="tv3-resources">
    <TeacherPageHeader title="资源中心" subtitle="教材、课件与模板统一管理" icon="📁" />

    <div class="tv3-resources-v2">
      <!-- 左侧分类导航 -->
      <aside class="rv2-sidebar">
        <div class="rv2-sidebar__head">
          <div class="rv2-logo">
            <span class="rv2-logo__icon">📚</span>
            <span class="rv2-logo__text">资源中心</span>
          </div>
          <button class="rv2-new-folder" title="新建文件夹">＋</button>
      </div>

      <!-- 一级导航 -->
      <nav class="rv2-nav">
        <button
          v-for="nav in navItems" :key="nav.key"
          class="rv2-nav__item" :class="{ 'is-active': activeNav === nav.key }"
          @click="activeNav = nav.key"
        >
          <span class="rv2-nav__icon">{{ nav.icon }}</span>
          <span class="rv2-nav__label">{{ nav.label }}</span>
          <span class="rv2-nav__count">{{ nav.count }}</span>
        </button>
      </nav>

      <!-- 分隔线 -->
      <div class="rv2-divider"></div>

      <!-- 我的文件夹 -->
      <div class="rv2-section">
        <div class="rv2-section__head">
          <span class="rv2-section__title">我的文件夹</span>
          <button class="rv2-section__more" title="管理">⋯</button>
        </div>
        <div class="rv2-folders">
          <button
            v-for="f in folders" :key="f.id"
            class="rv2-folder" :class="{ 'is-active': activeFolder === f.id }"
            @click="activeFolder = f.id"
          >
            <span class="rv2-folder__icon">📁</span>
            <span class="rv2-folder__name">{{ f.name }}</span>
            <span class="rv2-folder__count">{{ f.count }}</span>
          </button>
        </div>
      </div>

      <div class="rv2-divider"></div>

      <!-- 标签筛选 -->
      <div class="rv2-section">
        <div class="rv2-section__head">
          <span class="rv2-section__title">资源类型</span>
        </div>
        <div class="rv2-tags">
          <button
            v-for="t in typeTags" :key="t.id"
            class="rv2-tag" :class="{ 'is-active': typeFilter === t.id }"
            :data-type="t.id"
            @click="typeFilter = typeFilter === t.id ? '' : t.id"
          >
            <span class="rv2-tag__dot"></span>
            {{ t.label }}
          </button>
        </div>
      </div>

      <div class="rv2-divider"></div>

      <!-- 学科标签 -->
      <div class="rv2-section">
        <div class="rv2-section__head">
          <span class="rv2-section__title">学科</span>
        </div>
        <div class="rv2-tags rv2-tags--compact">
          <button
            v-for="s in subjectTags" :key="s"
            class="rv2-tag rv2-tag--sm" :class="{ 'is-active': subjectFilter === s }"
            @click="subjectFilter = subjectFilter === s ? '' : s"
          >
            {{ s }}
          </button>
        </div>
      </div>
    </aside>

    <!-- 主内容区 -->
    <main class="rv2-main">
      <!-- 顶部工具栏 -->
      <header class="rv2-toolbar">
        <div class="rv2-toolbar__left">
          <h1 class="rv2-toolbar__title">{{ currentNavTitle }}</h1>
          <span class="rv2-toolbar__count">{{ filteredResources.length }} 项资源</span>
        </div>

        <div class="rv2-toolbar__right">
          <!-- 搜索框 -->
          <div class="rv2-search">
            <span class="rv2-search__icon">🔍</span>
            <input v-model="searchQuery" class="rv2-search__input" placeholder="搜索资源名称、标签、知识点…" />
            <button v-if="searchQuery" class="rv2-search__clear" @click="searchQuery = ''">×</button>
          </div>

          <!-- 筛选器 -->
          <select v-model="gradeFilter" class="rv2-select" data-testid="rv2-grade-filter">
            <option value="">全部年级</option>
            <option v-for="g in grades" :key="g" :value="g">{{ g }}</option>
          </select>

          <select v-model="sortBy" class="rv2-select">
            <option value="updated">最近更新</option>
            <option value="name">按名称</option>
            <option value="size">按大小</option>
          </select>

          <!-- 视图切换 -->
          <div class="rv2-view-toggle">
            <button class="rv2-view-btn" :class="{ 'is-active': viewMode === 'grid' }" @click="viewMode = 'grid'" title="网格视图">▦</button>
            <button class="rv2-view-btn" :class="{ 'is-active': viewMode === 'list' }" @click="viewMode = 'list'" title="列表视图">☰</button>
          </div>

          <!-- AI 解析状态按钮 -->
          <button class="rv2-btn rv2-btn--ghost rv2-btn--icon" @click="showAiPanel = true" title="AI 解析中心">
            <span class="rv2-btn__icon">🤖</span>
            <span v-if="processingCount > 0" class="rv2-btn__badge">{{ processingCount }}</span>
          </button>

          <!-- 上传按钮 -->
          <button class="rv2-btn rv2-btn--primary" @click="showUpload = true">
            <span class="rv2-btn__icon">＋</span>
            上传资源
          </button>
        </div>
      </header>

      <!-- 快捷操作区 -->
      <div class="rv2-quick-actions">
        <button class="rv2-quick-card" @click="showUpload = true">
          <div class="rv2-quick-card__icon">📤</div>
          <div class="rv2-quick-card__title">上传文件</div>
          <div class="rv2-quick-card__desc">PPT / PDF / 视频 / 图片</div>
        </button>

        <button class="rv2-quick-card rv2-quick-card--scan" @click="showScan = true">
          <div class="rv2-quick-card__icon">📷</div>
          <div class="rv2-quick-card__title">拍照扫描</div>
          <div class="rv2-quick-card__desc">试卷 · 去手写 · 智能增强</div>
        </button>

        <button class="rv2-quick-card rv2-quick-card--folder">
          <div class="rv2-quick-card__icon">📁</div>
          <div class="rv2-quick-card__title">新建文件夹</div>
          <div class="rv2-quick-card__desc">分类管理你的资源</div>
        </button>

        <button class="rv2-quick-card rv2-quick-card--ai" @click="showAiPanel = true">
          <div class="rv2-quick-card__icon">🤖</div>
          <div class="rv2-quick-card__title">AI 解析中心</div>
          <div class="rv2-quick-card__desc">{{ processingCount }} 个正在解析</div>
        </button>
      </div>

      <!-- 构造配方库（保留原有特色） -->
      <section v-if="activeNav === 'mine'" class="rv2-section-card">
        <div class="rv2-section-card__head">
          <div>
            <span class="rv2-section-card__title">⚙ 构造配方库</span>
            <span class="rv2-section-card__sub">参数化构造步骤复用 · 一键插入课件</span>
          </div>
          <span class="rv2-badge rv2-badge--gold">教学团队复用</span>
        </div>
        <div class="rv2-recipes">
          <div v-for="r in recipes" :key="r.id" class="rv2-recipe" :data-testid="`tv3-recipe-${r.id}`">
            <div class="rv2-recipe__thumb" v-html="recipeSvg(r)" />
            <div class="rv2-recipe__body">
              <div class="rv2-recipe__name">
                <span>{{ r.name }}</span>
                <span class="rv2-tag rv2-tag--sm" :class="r.school_shared ? 'rv2-tag--ok' : ''">
                  {{ r.school_shared ? '校共享' : '私有' }}
                </span>
              </div>
              <div class="rv2-recipe__meta">{{ r.author }} · 被用 {{ r.usage_count }} 次</div>
              <div class="rv2-recipe__note">{{ r.note }}</div>
              <div class="rv2-recipe__actions">
                <button class="rv2-btn rv2-btn--sm rv2-btn--gold" @click="useRecipe(r)">插入课件</button>
                <span class="rv2-recipe__params">{{ r.params.length }} 个可调参数</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 资源列表 -->
      <section class="rv2-resources">
        <!-- 分类分组标题 -->
        <template v-if="!typeFilter">
          <div v-for="group in groupedResources" :key="group.type" class="rv2-res-group">
            <div class="rv2-res-group__head">
              <span class="rv2-res-group__label" :data-type="group.type">{{ group.label }}</span>
              <span class="rv2-res-group__count">{{ group.list.length }} 项</span>
            </div>
            <div v-if="viewMode === 'grid'" class="rv2-grid">
              <div v-for="item in group.list" :key="item.id" class="rv2-res-card" @click="openItem(item)">
                <div class="rv2-res-card__thumb" :data-type="item.type">
                  <span class="rv2-res-card__icon">{{ typeIcon(item.type) }}</span>
                  <span v-if="item.status === 'processing'" class="rv2-res-card__status">
                    <span class="rv2-spinner"></span> 解析中
                  </span>
                </div>
                <div class="rv2-res-card__body">
                  <div class="rv2-res-card__title">{{ item.name }}</div>
                  <div class="rv2-res-card__meta">
                    <span>{{ item.subject }}</span>
                    <span v-if="item.chapter"> · {{ item.chapter }}</span>
                  </div>
                  <div class="rv2-res-card__footer">
                    <span class="rv2-res-card__owner">{{ item.owner }}</span>
                    <span class="rv2-res-card__date">{{ fmtDate(item.updated_at) }}</span>
                  </div>
                  <div v-if="item.tags?.length" class="rv2-res-card__tags">
                    <span v-for="(t, i) in item.tags.slice(0, 3)" :key="i" class="rv2-mini-tag">{{ t }}</span>
                    <span v-if="item.tags.length > 3" class="rv2-mini-tag rv2-mini-tag--more">+{{ item.tags.length - 3 }}</span>
                  </div>
                </div>
              </div>
            </div>
            <div v-else class="rv2-list">
              <div v-for="item in group.list" :key="item.id" class="rv2-list-item" @click="openItem(item)">
                <span class="rv2-list-item__icon" :data-type="item.type">{{ typeIcon(item.type) }}</span>
                <div class="rv2-list-item__main">
                  <div class="rv2-list-item__name">{{ item.name }}</div>
                  <div class="rv2-list-item__meta">
                    {{ item.subject }}<template v-if="item.chapter"> · {{ item.chapter }}</template> · {{ item.owner }}
                  </div>
                </div>
                <div class="rv2-list-item__tags">
                  <span v-for="(t, i) in item.tags?.slice(0, 2)" :key="i" class="rv2-mini-tag">{{ t }}</span>
                </div>
                <span class="rv2-list-item__size">{{ formatSize(item.size_bytes) }}</span>
                <span class="rv2-list-item__date">{{ fmtDate(item.updated_at) }}</span>
                <button v-if="item.shared" class="rv2-list-item__shared" title="已共享">🔗</button>
              </div>
            </div>
          </div>
        </template>

        <!-- 单一类型平铺 -->
        <template v-else>
          <div v-if="viewMode === 'grid'" class="rv2-grid">
            <div v-for="item in filteredResources" :key="item.id" class="rv2-res-card" @click="openItem(item)">
              <div class="rv2-res-card__thumb" :data-type="item.type">
                <span class="rv2-res-card__icon">{{ typeIcon(item.type) }}</span>
                <span v-if="item.status === 'processing'" class="rv2-res-card__status">
                  <span class="rv2-spinner"></span> 解析中
                </span>
              </div>
              <div class="rv2-res-card__body">
                <div class="rv2-res-card__title">{{ item.name }}</div>
                <div class="rv2-res-card__meta">
                  <span>{{ item.subject }}</span>
                  <span v-if="item.chapter"> · {{ item.chapter }}</span>
                </div>
                <div class="rv2-res-card__footer">
                  <span class="rv2-res-card__owner">{{ item.owner }}</span>
                  <span class="rv2-res-card__date">{{ fmtDate(item.updated_at) }}</span>
                </div>
                <div v-if="item.tags?.length" class="rv2-res-card__tags">
                  <span v-for="(t, i) in item.tags.slice(0, 3)" :key="i" class="rv2-mini-tag">{{ t }}</span>
                  <span v-if="item.tags.length > 3" class="rv2-mini-tag rv2-mini-tag--more">+{{ item.tags.length - 3 }}</span>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="rv2-list">
            <div v-for="item in filteredResources" :key="item.id" class="rv2-list-item" @click="openItem(item)">
              <span class="rv2-list-item__icon" :data-type="item.type">{{ typeIcon(item.type) }}</span>
              <div class="rv2-list-item__main">
                <div class="rv2-list-item__name">{{ item.name }}</div>
                <div class="rv2-list-item__meta">
                  {{ item.subject }}<template v-if="item.chapter"> · {{ item.chapter }}</template> · {{ item.owner }}
                </div>
              </div>
              <div class="rv2-list-item__tags">
                <span v-for="(t, i) in item.tags?.slice(0, 2)" :key="i" class="rv2-mini-tag">{{ t }}</span>
              </div>
              <span class="rv2-list-item__size">{{ formatSize(item.size_bytes) }}</span>
              <span class="rv2-list-item__date">{{ fmtDate(item.updated_at) }}</span>
              <button v-if="item.shared" class="rv2-list-item__shared" title="已共享">🔗</button>
            </div>
          </div>
        </template>

        <!-- 空状态 -->
        <TeacherLoading v-if="resLoading" />
        <TeacherEmptyState
          v-else-if="!filteredResources.length"
          :title="resources.length ? '没有匹配的资源' : '资源库为空'"
          :desc="resources.length ? '换个筛选条件试试，或上传新的资源。' : '上传教材/课件/模板，AI 将自动解析入库。'"
          cta="上传资源"
          icon="📁"
          @cta-click="showUpload = true"
        />
      </section>
    </main>

    <!-- 上传面板 -->
    <ResourceUploadPanel
      :visible="showUpload"
      @close="showUpload = false"
      @open-scan="showScan = true; showUpload = false"
      @view-processing="showAiPanel = true; showUpload = false"
    />

    <!-- 拍照扫描向导 -->
    <PhotoScanWizard
      :visible="showScan"
      @close="showScan = false"
      @complete="onScanComplete"
    />

    <!-- AI 解析面板 -->
    <AiProcessingPanel
      :visible="showAiPanel"
      @close="showAiPanel = false"
    />
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * ResourcesView V2 —— 资源中心全新改版
 * 设计参考：希沃资源中心 + 学科网 + 百度网盘
 *
 * 核心变化：
 * 1. 左侧分类导航（一级导航 + 文件夹 + 类型标签 + 学科标签）
 * 2. 顶部工具栏（搜索 + 多维筛选 + 视图切换 + 上传入口）
 * 3. 快捷操作卡片（上传/拍照扫描/新建文件夹/AI解析中心）
 * 4. 资源网格/列表双视图
 * 5. 集成上传面板、拍照扫描、AI 解析状态
 * 6. 保留构造配方库特色功能
 */
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { v3Api } from '@/api/teacherV3'
import { TeacherPageHeader, TeacherEmptyState, TeacherLoading } from '@/components/teacherV3/common'
import { FIGURE_PRESETS } from '@/components/mathx/presets'
import type { V3Recipe } from '@/types/teacherV3'
import ResourceUploadPanel from '@/components/teacherV3/ResourceUploadPanel.vue'
import PhotoScanWizard from '@/components/teacherV3/PhotoScanWizard.vue'
import AiProcessingPanel from '@/components/teacherV3/AiProcessingPanel.vue'

const router = useRouter()

// ===== 状态 =====
const showUpload = ref(false)
const showScan = ref(false)
const showAiPanel = ref(false)
const viewMode = ref<'grid' | 'list'>('grid')
const activeNav = ref('mine')
const activeFolder = ref('')
const typeFilter = ref('')
const subjectFilter = ref('')
const gradeFilter = ref('')
const searchQuery = ref('')
const sortBy = ref('updated')

// ===== 数据 =====
const recipes = ref<V3Recipe[]>([])
const resLoading = ref(true)
const resources = ref<Array<{
  id: string
  name: string
  type: 'deck' | 'plan' | 'paper' | 'photo-bank' | 'video' | 'audio' | 'figure-recipe'
  subject: string
  chapter?: string
  owner: string
  updated_at: string
  shared: boolean
  size_bytes: number
  status: 'ready' | 'processing' | 'failed'
  tags?: string[]
}>>([])

// ===== 导航配置 =====
const navItems = [
  { key: 'mine', icon: '📁', label: '我的资源', count: 0 },
  { key: 'school', icon: '🏫', label: '校本资源', count: 0 },
  { key: 'public', icon: '🌐', label: '公共资源', count: 0 },
  { key: 'starred', icon: '⭐', label: '收藏夹', count: 0 },
  { key: 'recent', icon: '⏱️', label: '最近使用', count: 0 },
  { key: 'trash', icon: '🗑️', label: '回收站', count: 0 },
]

const folders = [
  { id: 'f1', name: '高一数学', count: 24 },
  { id: 'f2', name: '高二数学', count: 18 },
  { id: 'f3', name: '高三复习', count: 32 },
  { id: 'f4', name: '竞赛专题', count: 8 },
]

const typeTags = [
  { id: 'deck', label: '课件' },
  { id: 'plan', label: '教案' },
  { id: 'paper', label: '试卷' },
  { id: 'photo-bank', label: '拍照题库' },
  { id: 'video', label: '视频' },
  { id: 'audio', label: '音频' },
  { id: 'figure-recipe', label: '构造配方' },
]

const subjectTags = ['数学', '语文', '英语', '物理', '化学', '生物', '历史', '地理', '政治']

const grades = ['高一', '高二', '高三', '七年级', '八年级', '九年级']

// ===== 计算属性 =====
const currentNavTitle = computed(() => navItems.find((n) => n.key === activeNav.value)?.label || '我的资源')

const filteredResources = computed(() => {
  let list = resources.value
  if (typeFilter.value) list = list.filter((r) => r.type === typeFilter.value)
  if (subjectFilter.value) list = list.filter((r) => r.subject === subjectFilter.value)
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase()
    list = list.filter((r) =>
      r.name.toLowerCase().includes(q) ||
      r.subject.toLowerCase().includes(q) ||
      r.tags?.some((t) => t.toLowerCase().includes(q))
    )
  }
  // 排序
  if (sortBy.value === 'name') list = [...list].sort((a, b) => a.name.localeCompare(b.name))
  else if (sortBy.value === 'size') list = [...list].sort((a, b) => b.size_bytes - a.size_bytes)
  return list
})

const groupedResources = computed(() => {
  const map = new Map<string, typeof resources.value>()
  for (const r of filteredResources.value) {
    if (!map.has(r.type)) map.set(r.type, [])
    map.get(r.type)!.push(r)
  }
  const typeOrder = ['deck', 'plan', 'paper', 'photo-bank', 'video', 'audio', 'figure-recipe']
  return typeOrder
    .filter((t) => map.has(t))
    .map((t) => ({
      type: t,
      label: typeTags.find((tag) => tag.id === t)?.label || t,
      list: map.get(t)!,
    }))
})

const processingCount = computed(() => resources.value.filter((r) => r.status === 'processing').length)

// ===== 方法 =====
function typeIcon(t: string): string {
  const map: Record<string, string> = {
    deck: '📽️', plan: '📝', paper: '📄', 'photo-bank': '📷',
    video: '🎬', audio: '🎵', 'figure-recipe': '⚙️',
  }
  return map[t] || '📎'
}

function fmtDate(iso: string): string {
  if (!iso || iso === '刚刚') return iso || ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return String(iso).slice(0, 10)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  if (bytes < 1024 * 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + ' MB'
  return (bytes / 1024 / 1024 / 1024).toFixed(1) + ' GB'
}

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

function openItem(it: typeof resources.value[0]) {
  if (it.type === 'deck' || it.type === 'photo-bank') void router.push('/teacher-v3/slides')
  else if (it.type === 'plan') void router.push('/teacher-v3/prep')
  else void router.push('/teacher-v3/slides')
}

function onScanComplete(data: { name: string; pages: number }) {
  showScan.value = false
  // 模拟添加到资源列表
  resources.value.unshift({
    id: 'scan-' + Date.now(),
    name: data.name,
    type: 'photo-bank',
    subject: '数学',
    chapter: '扫描入库',
    owner: '我',
    updated_at: '刚刚',
    shared: false,
    size_bytes: data.pages * 800 * 1024,
    status: 'processing',
    tags: ['拍照入库', `${data.pages}页`, '待解析'],
  })
}

// ===== 初始化（M3 接真：资源来自 catalog/resources；演示数据在演示服务端 fixture 中） =====
onMounted(async () => {
  try {
    const [rc, rs] = await Promise.all([
      v3Api.catalog.recipes().then((r) => r.data.items).catch(() => []),
      v3Api.catalog.resources().then((r) => r.data.items).catch(() => []),
    ])
  recipes.value = rc
  // V3ResourceItem（契约）→ 视图条目：size/status/tags 为呈现层默认值，真实数据以后端为准
  resources.value = (rs as Array<Record<string, unknown>>).map((x) => ({
    id: String(x.id),
    name: String(x.name),
    type: x.kind as typeof resources.value[number]['type'],
    subject: String(x.subject || ''),
    chapter: x.chapter ? String(x.chapter) : undefined,
    owner: String(x.owner || ''),
    updated_at: String(x.updated_at || ''),
    shared: !!x.shared,
    size_bytes: 0,
    status: 'ready' as const,
    tags: [],
  }))
  // 导航计数一律来自真实列表，不再伪造「校本 128 / 收藏 12」
    navItems[0].count = resources.value.length
    navItems[1].count = resources.value.filter((r) => r.shared).length
    navItems[2].count = 0
    navItems[3].count = 0
    navItems[4].count = 0
  } finally {
    resLoading.value = false
  }
})
</script>

<style scoped>
/* ==========================================================================
   整体布局
   ========================================================================== */
.tv3-resources-shell {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin: -22px;
  padding: 22px;
  height: calc(100vh - var(--tv3-topbar-h));
  box-sizing: border-box;
  background: var(--teacher-bg-gradient);
}
.tv3-resources-v2 {
  display: flex;
  flex: 1;
  min-height: 0;
  background: var(--teacher-bg-gradient);
  overflow: hidden;
}

/* ==========================================================================
   左侧边栏
   ========================================================================== */
.rv2-sidebar {
  width: 240px;
  flex-shrink: 0;
  background:
    radial-gradient(360px 280px at 100% -8%, rgba(6, 182, 212, 0.10) 0%, transparent 55%),
    radial-gradient(320px 260px at -8% 108%, rgba(79, 70, 229, 0.08) 0%, transparent 55%),
    #ffffff;
  border-right: 1px solid var(--tv3-line);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.rv2-sidebar__head {
  display: flex;
  align-items: center;
  padding: 16px 14px;
  gap: 8px;
}

.rv2-logo {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.rv2-logo__icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%);
  display: grid;
  place-items: center;
  font-size: 16px;
  flex-shrink: 0;
}

.rv2-logo__text {
  font-size: 15px;
  font-weight: 700;
  color: var(--tv3-ink);
}

.rv2-new-folder {
  width: 28px;
  height: 28px;
  border: 1px solid var(--tv3-line, #e5e9f0);
  background: #fff;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
  color: var(--tv3-primary);
  display: grid;
  place-items: center;
  transition: all .15s ease;
}
.rv2-new-folder:hover {
  border-color: var(--tv3-gold, #06b6d4);
  color: var(--tv3-gold, #06b6d4);
  background: var(--tv3-gold-soft, #fdf6e8);
}

/* 一级导航 */
.rv2-nav {
  padding: 4px 10px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.rv2-nav__item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  border: none;
  background: transparent;
  border-radius: 8px;
  cursor: pointer;
  text-align: left;
  transition: all .15s ease;
}
.rv2-nav__item:hover {
  background: rgba(129, 140, 248, 0.16);
}
.rv2-nav__item.is-active {
  background: linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%);
  border: 1px solid transparent;
  font-weight: 600;
  box-shadow: 0 6px 16px -6px rgba(79, 70, 229, 0.45);
}
.rv2-nav__item.is-active .rv2-nav__label {
  color: #fff;
}

.rv2-nav__icon { font-size: 16px; flex-shrink: 0; }
.rv2-nav__label {
  flex: 1;
  font-size: 13px;
  color: var(--tv3-ink2);
  min-width: 0;
}
.rv2-nav__count {
  font-size: 11px;
  color: var(--tv3-ink3);
  background: var(--tv3-bg2);
  padding: 1px 7px;
  border-radius: 999px;
  flex-shrink: 0;
}
.rv2-nav__item.is-active .rv2-nav__count {
  background: linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%);
  color: #fff;
}

/* 分隔线 */
.rv2-divider {
  height: 1px;
  background: var(--tv3-line, #e5e9f0);
  margin: 10px 14px;
}

/* 区块 */
.rv2-section {
  padding: 0 10px 12px;
}

.rv2-section__head {
  display: flex;
  align-items: center;
  padding: 4px 8px 8px;
}

.rv2-section__title {
  font-size: 11px;
  font-weight: 700;
  color: var(--tv3-ink3, #8899aa);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  flex: 1;
}

.rv2-section__more {
  border: none;
  background: none;
  font-size: 14px;
  color: var(--tv3-ink3, #8899aa);
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 4px;
}
.rv2-section__more:hover { background: var(--tv3-bg2, #f0f4f8); }

/* 文件夹列表 */
.rv2-folders {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.rv2-folder {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  text-align: left;
  transition: all .15s ease;
}
.rv2-folder:hover { background: var(--tv3-bg2, #f0f4f8); }
.rv2-folder.is-active {
  background: var(--tv3-primary-soft);
  color: var(--tv3-primary);
}

.rv2-folder__icon { font-size: 14px; flex-shrink: 0; }
.rv2-folder__name {
  flex: 1;
  font-size: 12.5px;
  color: var(--tv3-ink2);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.rv2-folder.is-active .rv2-folder__name { color: var(--tv3-navy, #4f46e5); font-weight: 600; }
.rv2-folder__count {
  font-size: 10.5px;
  color: var(--tv3-ink3, #8899aa);
  flex-shrink: 0;
}

/* 标签组 */
.rv2-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 0 4px;
}
.rv2-tags--compact { gap: 4px; }

.rv2-tag {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border: 1px solid var(--tv3-line, #e5e9f0);
  background: #fff;
  border-radius: 999px;
  font-size: 11.5px;
  cursor: pointer;
  color: var(--tv3-ink2, #4a5568);
  transition: all .15s ease;
}
.rv2-tag--sm { padding: 3px 8px; font-size: 11px; }
.rv2-tag:hover {
  border-color: var(--tv3-primary-border, #a5b4fc);
  background: var(--tv3-primary-soft, #e8f0fb);
}
.rv2-tag.is-active {
  border-color: var(--tv3-gold, #06b6d4);
  background: linear-gradient(135deg, var(--tv3-gold-soft, #fdf6e8), #fff);
  color: var(--tv3-gold-deep, #b8862e);
  font-weight: 600;
}

.rv2-tag__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--tv3-ink3, #8899aa);
}
.rv2-tag.is-active .rv2-tag__dot { background: var(--tv3-gold, #06b6d4); }

/* ==========================================================================
   主内容区
   ========================================================================== */
.rv2-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 顶部工具栏 */
.rv2-toolbar {
  display: flex;
  align-items: center;
  padding: 14px 20px;
  background: #fff;
  border-bottom: 1px solid var(--tv3-line2, #e5e9f0);
  gap: 12px;
  flex-shrink: 0;
}

.rv2-toolbar__left {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.rv2-toolbar__title {
  font-size: 17px;
  font-weight: 700;
  color: var(--tv3-ink, #1a2332);
  margin: 0;
}

.rv2-toolbar__count {
  font-size: 12px;
  color: var(--tv3-ink3, #8899aa);
  background: var(--tv3-bg2, #f0f4f8);
  padding: 2px 8px;
  border-radius: 999px;
}

.rv2-toolbar__right {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

/* 搜索框 */
.rv2-search {
  position: relative;
  width: 260px;
}

.rv2-search__icon {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 12px;
  color: var(--tv3-ink3, #8899aa);
  pointer-events: none;
}

.rv2-search__input {
  width: 100%;
  height: 34px;
  padding: 0 30px 0 32px;
  border: 1px solid var(--tv3-line, #e5e9f0);
  border-radius: 8px;
  font-size: 12.5px;
  background: var(--tv3-bg2, #f0f4f8);
  outline: none;
  transition: all .15s ease;
}
.rv2-search__input:focus {
  border-color: var(--tv3-navy, #4f46e5);
  background: #fff;
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.08);
}

.rv2-search__clear {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  width: 18px;
  height: 18px;
  border: none;
  border-radius: 50%;
  background: var(--tv3-ink3, #8899aa);
  color: #fff;
  font-size: 11px;
  cursor: pointer;
  display: grid;
  place-items: center;
  opacity: 0.6;
}
.rv2-search__clear:hover { opacity: 1; }

/* 下拉选择 */
.rv2-select {
  height: 34px;
  padding: 0 10px;
  border: 1px solid var(--tv3-line, #e5e9f0);
  border-radius: 8px;
  font-size: 12px;
  color: var(--tv3-ink2, #4a5568);
  background: #fff;
  cursor: pointer;
  outline: none;
  transition: all .15s ease;
}
.rv2-select:hover { border-color: var(--tv3-primary-border, #a5b4fc); }
.rv2-select:focus {
  border-color: var(--tv3-navy, #4f46e5);
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.08);
}

/* 视图切换 */
.rv2-view-toggle {
  display: flex;
  border: 1px solid var(--tv3-line, #e5e9f0);
  border-radius: 8px;
  overflow: hidden;
}

.rv2-view-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: #fff;
  cursor: pointer;
  font-size: 14px;
  color: var(--tv3-ink3, #8899aa);
  display: grid;
  place-items: center;
  transition: all .15s ease;
}
.rv2-view-btn:hover { background: var(--tv3-bg2, #f0f4f8); color: var(--tv3-ink2, #4a5568); }
.rv2-view-btn.is-active {
  background: var(--tv3-primary-soft, #e8f0fb);
  color: var(--tv3-navy, #4f46e5);
}

/* 按钮 */
.rv2-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 14px;
  border: 1px solid var(--tv3-line, #e5e9f0);
  border-radius: 8px;
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  background: #fff;
  color: var(--tv3-ink2, #4a5568);
  transition: all .15s ease;
  white-space: nowrap;
}
.rv2-btn:hover {
  border-color: var(--tv3-primary-border, #a5b4fc);
  background: var(--tv3-primary-soft, #e8f0fb);
  color: var(--tv3-navy, #4f46e5);
}
:root {
  --rv2-btn-var: 1;
}
.rv2-btn--primary {
  background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
  border-color: #4f46e5;
  color: #fff;
  font-weight: 600;
  box-shadow: 0 4px 14px rgba(79, 70, 229, 0.3);
}
.rv2-btn--primary:hover {
  background: linear-gradient(135deg, #4338ca 0%, #4f46e5 100%);
  color: #fff;
  box-shadow: 0 6px 16px rgba(79, 70, 229, 0.4);
  transform: translateY(-1px);
}
.rv2-btn--ghost { background: transparent; }
.rv2-btn--sm { height: 28px; padding: 0 10px; font-size: 11.5px; }
.rv2-btn--gold {
  background: linear-gradient(135deg, var(--tv3-gold-soft, #fdf6e8), #fff);
  border-color: var(--tv3-gold-border, #e8d5a8);
  color: var(--tv3-gold-deep, #b8862e);
}
.rv2-btn--icon {
  position: relative;
  width: 36px;
  padding: 0;
  justify-content: center;
}
.rv2-btn__badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  background: var(--tv3-rose, #e05a5a);
  color: #fff;
  font-size: 10px;
  font-weight: 600;
  border-radius: 999px;
  display: grid;
  place-items: center;
}

/* 快捷操作区 */
.rv2-quick-actions {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  padding: 16px 20px 8px;
}

.rv2-quick-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  padding: 16px;
  border: 1px solid var(--tv3-line, #e5e9f0);
  border-radius: 12px;
  background: #fff;
  cursor: pointer;
  transition: all .2s ease;
  text-align: left;
}
.rv2-quick-card:hover {
  border-color: var(--tv3-primary-border, #a5b4fc);
  box-shadow: 0 4px 16px rgba(79, 70, 229, 0.1);
  transform: translateY(-2px);
}

.rv2-quick-card__icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: var(--tv3-primary-soft, #e8f0fb);
  color: var(--tv3-navy, #4f46e5);
  display: grid;
  place-items: center;
  font-size: 20px;
  margin-bottom: 4px;
}

.rv2-quick-card--scan .rv2-quick-card__icon {
  background: linear-gradient(135deg, #e0f2fe, #bae6fd);
  color: #0369a1;
}
.rv2-quick-card--folder .rv2-quick-card__icon {
  background: linear-gradient(135deg, #fef3c7, #fde68a);
  color: #b45309;
}
.rv2-quick-card--ai .rv2-quick-card__icon {
  background: linear-gradient(135deg, #ede9fe, #ddd6fe);
  color: #6d28d9;
}

.rv2-quick-card__title {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--tv3-ink, #1a2332);
}

.rv2-quick-card__desc {
  font-size: 11.5px;
  color: var(--tv3-ink3, #8899aa);
}

/* 区块卡片 */
.rv2-section-card {
  margin: 12px 20px;
  padding: 16px 18px;
  background: #fff;
  border: 1px solid var(--tv3-line2, #e5e9f0);
  border-radius: 12px;
}

.rv2-section-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.rv2-section-card__title {
  font-size: 14px;
  font-weight: 700;
  color: var(--tv3-ink, #1a2332);
}

.rv2-section-card__sub {
  font-size: 12px;
  color: var(--tv3-ink3, #8899aa);
  margin-left: 8px;
}

.rv2-badge {
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 10.5px;
  font-weight: 600;
}
.rv2-badge--gold {
  background: var(--tv3-gold-soft, #fdf6e8);
  color: var(--tv3-gold-deep, #b8862e);
  border: 1px solid var(--tv3-gold-border, #e8d5a8);
}

/* 配方卡片 */
.rv2-recipes {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 10px;
}

.rv2-recipe {
  display: flex;
  gap: 10px;
  border: 1px solid var(--tv3-line, #e5e9f0);
  border-radius: 10px;
  padding: 10px;
  background: #fff;
  transition: all .15s ease;
}
.rv2-recipe:hover {
  border-color: var(--tv3-gold-border, #e8d5a8);
  box-shadow: 0 2px 10px rgba(212, 165, 74, 0.15);
}

.rv2-recipe__thumb {
  width: 100px;
  height: 68px;
  border-radius: 8px;
  flex-shrink: 0;
  background: #fbfcfe;
  border: 1px solid var(--tv3-line2, #e5e9f0);
  overflow: hidden;
}
.rv2-recipe__thumb :deep(svg) { width: 100%; height: 100%; }

.rv2-recipe__body { flex: 1; min-width: 0; }

.rv2-recipe__name {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 700;
  color: var(--tv3-ink, #1a2332);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rv2-recipe__meta {
  font-size: 11px;
  color: var(--tv3-ink3, #8899aa);
  margin-top: 2px;
}

.rv2-recipe__note {
  font-size: 11.5px;
  color: var(--tv3-ink2, #4a5568);
  line-height: 1.5;
  margin-top: 4px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.rv2-recipe__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}

.rv2-recipe__params {
  font-size: 10.5px;
  color: var(--tv3-ink3, #8899aa);
}

.rv2-tag {
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 600;
  border: 1px solid var(--tv3-line, #e5e9f0);
  color: var(--tv3-ink3, #8899aa);
  flex-shrink: 0;
}
.rv2-tag--sm { padding: 1px 6px; font-size: 9.5px; }
.rv2-tag--ok {
  background: #ecfdf5;
  border-color: #a7f3d0;
  color: #047857;
}

/* ==========================================================================
   资源列表区
   ========================================================================== */
.rv2-resources {
  flex: 1;
  overflow-y: auto;
  padding: 0 20px 20px;
}

.rv2-res-group { margin-bottom: 20px; }

.rv2-res-group__head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  padding-top: 4px;
}

.rv2-res-group__label {
  font-size: 12.5px;
  font-weight: 700;
  color: var(--tv3-ink2, #4a5568);
  padding: 3px 10px;
  background: var(--tv3-bg2, #f0f4f8);
  border-radius: 999px;
}
.rv2-res-group__label[data-type='deck'] { background: #e8f0fb; color: #4f46e5; }
.rv2-res-group__label[data-type='plan'] { background: #e6f5f3; color: #0e9488; }
.rv2-res-group__label[data-type='paper'] { background: #fdf3e3; color: #b45309; }
.rv2-res-group__label[data-type='photo-bank'] { background: #f3e8ff; color: #6d28d9; }
.rv2-res-group__label[data-type='video'] { background: #fdf1ef; color: #b1382c; }
.rv2-res-group__label[data-type='audio'] { background: #ecfdf5; color: #047857; }

.rv2-res-group__count {
  font-size: 11px;
  color: var(--tv3-ink3, #8899aa);
}

/* 网格视图 */
.rv2-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}

.rv2-res-card {
  background: #fff;
  border: 1px solid var(--tv3-line, #e5e9f0);
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: all .2s ease;
}
.rv2-res-card:hover {
  border-color: var(--tv3-primary-border, #a5b4fc);
  box-shadow: 0 4px 16px rgba(79, 70, 229, 0.12);
  transform: translateY(-2px);
}

.rv2-res-card__thumb {
  height: 120px;
  background: linear-gradient(135deg, #f0f4f8, #e2e8f0);
  display: grid;
  place-items: center;
  position: relative;
  font-size: 42px;
}
.rv2-res-card__thumb[data-type='deck'] { background: linear-gradient(135deg, #e8f0fb, #c9def4); color: #4f46e5; }
.rv2-res-card__thumb[data-type='plan'] { background: linear-gradient(135deg, #e6f5f3, #b9e0dc); color: #0e9488; }
.rv2-res-card__thumb[data-type='paper'] { background: linear-gradient(135deg, #fdf3e3, #f3ddb4); color: #b45309; }
.rv2-res-card__thumb[data-type='photo-bank'] { background: linear-gradient(135deg, #f3e8ff, #d8c9f5); color: #6d28d9; }
.rv2-res-card__thumb[data-type='video'] { background: linear-gradient(135deg, #fdf1ef, #eec7c2); color: #b1382c; }
.rv2-res-card__thumb[data-type='audio'] { background: linear-gradient(135deg, #ecfdf5, #a7f3d0); color: #047857; }
.rv2-res-card__thumb[data-type='figure-recipe'] { background: linear-gradient(135deg, #fdf6e8, #e8d5a8); color: #b8862e; }

.rv2-res-card__icon {
  font-size: 38px;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));
}

.rv2-res-card__status {
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 3px 8px;
  background: rgba(255,255,255,0.95);
  border-radius: 999px;
  font-size: 10.5px;
  font-weight: 600;
  color: var(--tv3-gold-deep, #b8862e);
  display: flex;
  align-items: center;
  gap: 4px;
  backdrop-filter: blur(4px);
}

.rv2-spinner {
  display: inline-block;
  width: 10px;
  height: 10px;
  border: 2px solid var(--tv3-gold, #06b6d4);
  border-top-color: transparent;
  border-radius: 50%;
  animation: rv2-spin 0.8s linear infinite;
}
@keyframes rv2-spin { to { transform: rotate(360deg); } }

.rv2-res-card__body {
  padding: 10px 12px 12px;
}

.rv2-res-card__title {
  font-size: 13px;
  font-weight: 600;
  color: var(--tv3-ink, #1a2332);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rv2-res-card__meta {
  font-size: 11px;
  color: var(--tv3-ink3, #8899aa);
  margin-top: 3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rv2-res-card__footer {
  display: flex;
  justify-content: space-between;
  margin-top: 6px;
  font-size: 10.5px;
  color: var(--tv3-ink3, #8899aa);
}

.rv2-res-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 8px;
}

.rv2-mini-tag {
  padding: 1px 6px;
  background: var(--tv3-bg2, #f0f4f8);
  color: var(--tv3-ink2, #4a5568);
  font-size: 10px;
  border-radius: 4px;
  flex-shrink: 0;
}
.rv2-mini-tag--more {
  background: transparent;
  color: var(--tv3-ink3, #8899aa);
}

/* 列表视图 */
.rv2-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.rv2-list-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: #fff;
  border: 1px solid var(--tv3-line, #e5e9f0);
  border-radius: 10px;
  cursor: pointer;
  transition: all .15s ease;
}
.rv2-list-item:hover {
  border-color: var(--tv3-primary-border, #a5b4fc);
  background: var(--tv3-primary-soft, #e8f0fb);
}

.rv2-list-item__icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  font-size: 18px;
  flex-shrink: 0;
  background: var(--tv3-bg2, #f0f4f8);
}
.rv2-list-item__icon[data-type='deck'] { background: #e8f0fb; color: #4f46e5; }
.rv2-list-item__icon[data-type='plan'] { background: #e6f5f3; color: #0e9488; }
.rv2-list-item__icon[data-type='paper'] { background: #fdf3e3; color: #b45309; }
.rv2-list-item__icon[data-type='photo-bank'] { background: #f3e8ff; color: #6d28d9; }
.rv2-list-item__icon[data-type='video'] { background: #fdf1ef; color: #b1382c; }
.rv2-list-item__icon[data-type='audio'] { background: #ecfdf5; color: #047857; }

.rv2-list-item__main {
  flex: 1;
  min-width: 0;
}

.rv2-list-item__name {
  font-size: 13px;
  font-weight: 600;
  color: var(--tv3-ink, #1a2332);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rv2-list-item__meta {
  font-size: 11.5px;
  color: var(--tv3-ink3, #8899aa);
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rv2-list-item__tags {
  display: flex;
  gap: 4px;
  width: 120px;
  flex-shrink: 0;
}

.rv2-list-item__size {
  font-size: 11.5px;
  color: var(--tv3-ink3, #8899aa);
  font-family: var(--tv3-font-num, monospace);
  width: 70px;
  text-align: right;
  flex-shrink: 0;
}

.rv2-list-item__date {
  font-size: 11.5px;
  color: var(--tv3-ink3, #8899aa);
  width: 70px;
  text-align: right;
  flex-shrink: 0;
}

.rv2-list-item__shared {
  border: none;
  background: none;
  font-size: 14px;
  cursor: pointer;
  padding: 2px;
  flex-shrink: 0;
}

/* 空状态 */
.rv2-empty {
  text-align: center;
  padding: 60px 20px;
}

.rv2-empty__icon {
  font-size: 48px;
  margin-bottom: 12px;
  opacity: 0.6;
}

.rv2-empty__title {
  font-size: 15px;
  font-weight: 600;
  color: var(--tv3-ink2, #4a5568);
  margin-bottom: 6px;
}

.rv2-empty__desc {
  font-size: 12.5px;
  color: var(--tv3-ink3, #8899aa);
  margin-bottom: 16px;
}
</style>
