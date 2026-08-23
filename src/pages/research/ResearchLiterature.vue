<template>
  <div class="rs-page rs-literature">
    <!-- 三栏布局 -->
    <div class="rs-three-col">
      <!-- 左栏：集合导航 -->
      <aside class="rs-col-left">
        <!-- 顶部搜索 -->
        <div class="rs-sidebar-search">
          <div class="rs-input rs-input-sm rs-input-icon">
            <svg class="rs-input-icon-left" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              v-model="searchQuery"
              type="text"
              placeholder="搜索文献..."
              @input="onSearch"
            />
          </div>
        </div>

        <div class="rs-sidebar-nav">
          <!-- 智能视图分组 -->
          <div class="rs-nav-section">
            <div class="rs-nav-label">智能视图</div>
            <div
              v-for="view in smartViews"
              :key="view.id"
              class="rs-nav-item"
              :class="{ active: activeCollection === view.id }"
              @click="selectCollection(view.id)"
            >
              <span class="rs-nav-item-icon">{{ view.icon }}</span>
              <span class="rs-nav-item-text">{{ view.name }}</span>
              <span class="rs-nav-item-badge">{{ view.count }}</span>
            </div>
          </div>

          <!-- 我的文集分组 -->
          <div class="rs-nav-section">
            <div class="rs-nav-label">我的文集</div>
            <div
              v-for="col in manualCollections"
              :key="col.id"
              class="rs-nav-item"
              :class="{ active: activeCollection === col.id }"
              @click="selectCollection(col.id)"
            >
              <svg class="rs-nav-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
              </svg>
              <span class="rs-nav-item-text">{{ col.name }}</span>
              <span class="rs-nav-item-badge">{{ col.count }}</span>
            </div>
            <div class="rs-nav-item rs-nav-item-new" @click="createCollection">
              <svg class="rs-nav-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              <span class="rs-nav-item-text">新建文集</span>
            </div>
          </div>

          <!-- 标签分组 -->
          <div class="rs-nav-section">
            <div class="rs-nav-label">标签</div>
            <div class="rs-tag-cloud">
              <span
                v-for="tag in hotTags"
                :key="tag"
                class="rs-tag rs-tag-brand rs-tag-cloud-item"
                @click="filterByTag(tag)"
              >
                {{ tag }}
              </span>
            </div>
          </div>
        </div>
      </aside>

      <!-- 中栏：文献列表 -->
      <main class="rs-col-main">
        <!-- 顶部工具栏 -->
        <div class="rs-list-toolbar">
          <div class="rs-list-toolbar-left">
            <h2 class="rs-list-title">{{ currentCollectionName }}</h2>
            <span class="rs-list-count">{{ filteredPapers.length }} 篇</span>
          </div>
          <div class="rs-list-toolbar-center">
            <div class="rs-select rs-select-sm">
              <select v-model="sortBy" @change="onSortChange">
                <option value="date">按添加时间</option>
                <option value="citations">按引用数</option>
                <option value="year">按年份</option>
                <option value="title">按标题</option>
              </select>
              <svg class="rs-select-caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </div>
          </div>
          <div class="rs-list-toolbar-right">
            <div class="rs-view-toggle">
              <button
                class="rs-view-btn"
                :class="{ active: viewMode === 'list' }"
                @click="viewMode = 'list'"
                title="列表视图"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="8" y1="6" x2="21" y2="6"/>
                  <line x1="8" y1="12" x2="21" y2="12"/>
                  <line x1="8" y1="18" x2="21" y2="18"/>
                  <line x1="3" y1="6" x2="3.01" y2="6"/>
                  <line x1="3" y1="12" x2="3.01" y2="12"/>
                  <line x1="3" y1="18" x2="3.01" y2="18"/>
                </svg>
              </button>
              <button
                class="rs-view-btn"
                :class="{ active: viewMode === 'card' }"
                @click="viewMode = 'card'"
                title="卡片视图"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="3" width="7" height="7"/>
                  <rect x="14" y="3" width="7" height="7"/>
                  <rect x="14" y="14" width="7" height="7"/>
                  <rect x="3" y="14" width="7" height="7"/>
                </svg>
              </button>
            </div>
            <button class="rs-btn rs-btn-primary rs-btn-sm" @click="onImport">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              导入
            </button>
          </div>
        </div>

        <!-- 筛选芯片条 -->
        <div class="rs-chip-group">
          <button
            v-for="chip in filterChips"
            :key="chip.value"
            class="rs-chip"
            :class="{ active: readFilter === chip.value }"
            @click="readFilter = chip.value"
          >
            {{ chip.label }}
          </button>
        </div>

        <!-- 文献列表 -->
        <div class="rs-paper-list">
          <!-- 加载态 -->
          <div v-if="loading" class="rs-list-loading">
            <div class="rs-loading-spinner"></div>
            <p>加载中...</p>
          </div>

          <template v-else>
            <div
              v-for="paper in filteredPapers"
              :key="paper.id"
              class="rs-paper-row"
              :class="{ active: selectedPaper?.id === paper.id }"
              @click="selectPaper(paper)"
            >
            <div class="rs-paper-main">
              <h3 class="rs-paper-title">{{ paper.title }}</h3>
              <div class="rs-paper-authors">{{ paper.authors.join(', ') }}</div>
              <div class="rs-paper-venue">
                <span class="rs-paper-venue-name">{{ paper.venue }}</span>
                <span class="rs-paper-venue-year">· {{ paper.year }}</span>
              </div>
              <div class="rs-paper-tags">
                <span
                  v-for="tag in paper.tags.slice(0, 3)"
                  :key="tag"
                  class="rs-tag rs-tag-brand"
                >
                  {{ tag }}
                </span>
              </div>
              <div class="rs-paper-meta">
                <span class="rs-paper-meta-item">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                  {{ paper.citations }} 引用
                </span>
                <span class="rs-paper-meta-item">
                  <span
                    class="rs-status-dot"
                    :class="{
                      'rs-status-read': paper.readStatus === 'read',
                      'rs-status-reading': paper.readStatus === 'reading',
                      'rs-status-unread': paper.readStatus === 'unread',
                    }"
                  ></span>
                  {{ readStatusText(paper.readStatus) }}
                </span>
                <span class="rs-paper-meta-item rs-paper-added">
                  {{ formatAddedAt(paper.addedAt) }} 导入
                </span>
              </div>
            </div>
            <div class="rs-paper-actions">
              <button
                class="rs-paper-action-btn"
                :class="{ starred: paper.isStarred }"
                @click.stop="toggleStar(paper)"
                title="收藏"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
              </button>
              <button
                class="rs-paper-action-btn rs-btn-extract"
                @click.stop="extractEvidence(paper)"
                title="提取证据"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                  <polyline points="10 9 9 9 8 9"/>
                </svg>
              </button>
            </div>
          </div>

            <div v-if="filteredPapers.length === 0" class="rs-empty-state">
              <div class="rs-empty-icon">📭</div>
              <p class="rs-empty-text">暂无匹配的文献</p>
            </div>
          </template>
        </div>
      </main>

      <!-- 右栏：文献详情 -->
      <aside class="rs-col-right" v-if="selectedPaper">
        <!-- 详情头部 -->
        <div class="rs-detail-header">
          <button class="rs-detail-close" @click="selectedPaper = null">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
          <span
            class="rs-badge"
            :class="{
              'rs-badge-success': selectedPaper.readStatus === 'read',
              'rs-badge-warning': selectedPaper.readStatus === 'reading',
              'rs-badge-info': selectedPaper.readStatus === 'unread',
            }"
          >
            {{ readStatusText(selectedPaper.readStatus) }}
          </span>
        </div>

        <div class="rs-detail-scroll">
          <!-- 论文信息 -->
          <div class="rs-detail-section">
            <h2 class="rs-detail-title">{{ selectedPaper.title }}</h2>
            <div class="rs-detail-authors">
              <a
                v-for="(author, idx) in selectedPaper.authors"
                :key="idx"
                href="#"
                class="rs-detail-author"
              >{{ author }}</a>
            </div>
            <div class="rs-detail-venue">
              {{ selectedPaper.venue }} · {{ selectedPaper.year }}
            </div>
            <div class="rs-detail-citations">
              <div class="rs-citation-count">
                <strong>{{ selectedPaper.citations }}</strong>
                <span>次引用</span>
              </div>
              <div class="rs-citation-trend">
                <svg viewBox="0 0 100 30" preserveAspectRatio="none" class="rs-trend-svg">
                  <polyline
                    points="0,25 15,22 30,18 45,20 60,12 75,8 90,5 100,3"
                    fill="none"
                    stroke="var(--rs-brand-400)"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                  <polygon
                    points="0,30 0,25 15,22 30,18 45,20 60,12 75,8 90,5 100,3 100,30"
                    fill="url(#trendGradient)"
                    opacity="0.3"
                  />
                  <defs>
                    <linearGradient id="trendGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stop-color="var(--rs-brand-400)"/>
                      <stop offset="100%" stop-color="transparent"/>
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </div>
          </div>

          <div class="rs-divider"></div>

          <!-- 摘要 -->
          <div class="rs-detail-section">
            <h3 class="rs-detail-section-title">摘要</h3>
            <p class="rs-detail-abstract" :class="{ expanded: abstractExpanded }">
              {{ selectedPaper.abstract }}
            </p>
            <button class="rs-detail-expand-link" @click="abstractExpanded = !abstractExpanded">
              {{ abstractExpanded ? '收起' : '展开全部' }}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" :class="{ rotated: abstractExpanded }">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>
          </div>

          <div class="rs-divider"></div>

          <!-- 关键信息 -->
          <div class="rs-detail-section">
            <h3 class="rs-detail-section-title">关键信息</h3>
            <div class="rs-detail-info-list">
              <div class="rs-detail-info-item">
                <span class="rs-detail-info-label">DOI</span>
                <span class="rs-detail-info-value">10.xxxx/{{ selectedPaper.id }}</span>
              </div>
              <div class="rs-detail-info-item">
                <span class="rs-detail-info-label">链接</span>
                <a href="#" class="rs-detail-info-link">查看原文 →</a>
              </div>
            </div>
            <div class="rs-detail-keywords">
              <span class="rs-detail-keywords-label">关键词</span>
              <div class="rs-detail-keywords-tags">
                <span
                  v-for="tag in selectedPaper.tags"
                  :key="tag"
                  class="rs-tag rs-tag-brand"
                >{{ tag }}</span>
              </div>
            </div>
            <div class="rs-detail-collection-info">
              <span class="rs-detail-info-label">所属文集</span>
              <span class="rs-detail-info-value">{{ currentCollectionName }}</span>
            </div>
          </div>

          <div class="rs-divider"></div>

          <!-- 我的笔记 -->
          <div class="rs-detail-section">
            <div class="rs-detail-section-header">
              <h3 class="rs-detail-section-title">我的笔记</h3>
              <button class="rs-btn rs-btn-ghost rs-btn-sm" @click="addNote">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                添加笔记
              </button>
            </div>
            <div class="rs-note-list">
              <div
                v-for="note in paperNotes"
                :key="note.id"
                class="rs-note-item"
              >
                <div class="rs-note-header">
                  <span class="rs-note-page">p.{{ note.page }}</span>
                  <span class="rs-note-time">{{ note.time }}</span>
                </div>
                <p class="rs-note-content">{{ note.content }}</p>
              </div>
              <div v-if="paperNotes.length === 0" class="rs-note-empty">
                暂无笔记，点击上方按钮添加
              </div>
            </div>
          </div>

          <div class="rs-divider"></div>

          <!-- 提取的证据 -->
          <div class="rs-detail-section">
            <div class="rs-detail-section-header">
              <h3 class="rs-detail-section-title">提取的证据</h3>
              <button class="rs-btn rs-btn-primary rs-btn-sm" @click="extractEvidence(selectedPaper)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
                提取证据
              </button>
            </div>
            <div class="rs-evidence-list">
              <div
                v-for="ev in paperEvidence"
                :key="ev.id"
                class="rs-evidence-item"
              >
                <div class="rs-evidence-type">
                  <span class="rs-badge" :class="'rs-badge-' + ev.typeColor">{{ ev.typeLabel }}</span>
                </div>
                <p class="rs-evidence-content">{{ ev.content }}</p>
                <div class="rs-evidence-meta">
                  <span>{{ ev.confidence }}% 置信度</span>
                </div>
              </div>
              <div v-if="!selectedPaper.hasEvidence" class="rs-evidence-empty">
                尚未提取证据，点击"提取证据"开始分析
              </div>
            </div>
          </div>

          <div class="rs-divider"></div>

          <!-- 相关文献 -->
          <div class="rs-detail-section">
            <h3 class="rs-detail-section-title">相关文献</h3>
            <div class="rs-related-list">
              <div
                v-for="paper in relatedPapers"
                :key="paper.id"
                class="rs-related-item"
                @click="selectPaper(paper)"
              >
                <h4 class="rs-related-title">{{ paper.title }}</h4>
                <div class="rs-related-meta">
                  <span>{{ paper.authors[0] }} 等</span>
                  <span>· {{ paper.year }}</span>
                  <span>· {{ paper.citations }} 引用</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useToastStore } from '@/stores/toast'
import { researchLiteratureApi } from '@/api/research'
import type { Paper, LiteratureCollection } from '@/types/research'

const toastStore = useToastStore()

// 扩展 Paper 类型以支持收藏状态
type PaperWithStar = Paper & { isStarred?: boolean }

// 状态管理
const collections = ref<LiteratureCollection[]>([])
const papers = ref<PaperWithStar[]>([])
const selectedPaper = ref<Paper | null>(null)
const activeCollection = ref('gnn-path')
const searchQuery = ref('')
const readFilter = ref('all')
const sortBy = ref('date')
const loading = ref(false)
const viewMode = ref<'list' | 'card'>('list')
const abstractExpanded = ref(false)

// 智能视图数据
const smartViews = [
  { id: 'all', name: '全部文献', count: 127, icon: '📚' },
  { id: 'recent', name: '最近添加', count: 12, icon: '🕐' },
  { id: 'unread', name: '未读', count: 45, icon: '📖' },
  { id: 'todo', name: '待整理', count: 8, icon: '📋' },
]

// 热门标签
const hotTags = ['convergence', 'GNN', 'RL', 'graph-theory', 'attention', 'embedding']

// 筛选芯片
const filterChips = [
  { value: 'all', label: '全部' },
  { value: 'read', label: '已读' },
  { value: 'unread', label: '未读' },
  { value: 'evidence', label: '有证据' },
  { value: 'notes', label: '有笔记' },
  { value: 'high-cited', label: '高被引' },
]

// 模拟笔记数据
const paperNotes = ref([
  {
    id: 'n1',
    page: 3,
    time: '2 天前',
    content: '多头注意力机制的设计思路很有启发性，可以借鉴到我们的路网建模中。',
  },
  {
    id: 'n2',
    page: 7,
    time: '1 周前',
    content: '实验部分的基线对比不够充分，缺少与最新 ST-GCN 变体的比较。',
  },
])

// 模拟证据数据
const paperEvidence = ref([
  {
    id: 'e1',
    typeLabel: '定理',
    typeColor: 'primary',
    content: '在满足节点度有界的图结构上，GAT 的注意力权重收敛到唯一稳定点。',
    confidence: 92,
  },
  {
    id: 'e2',
    typeLabel: '数值',
    typeColor: 'success',
    content: '在 PeMSD7 数据集上，MAE 降低 12.3%，RMSE 降低 8.7%。',
    confidence: 95,
  },
])

// 计算属性：手动文集列表
const manualCollections = computed(() => {
  return collections.value.filter(c => c.type === 'manual')
})

// 计算属性：当前文集名称
const currentCollectionName = computed(() => {
  const smartView = smartViews.find(v => v.id === activeCollection.value)
  if (smartView) return smartView.name
  const col = collections.value.find(c => c.id === activeCollection.value)
  return col?.name || '全部文献'
})

// 计算属性：过滤和排序后的论文列表
const filteredPapers = computed(() => {
  let result = [...papers.value] as PaperWithStar[]

  // 搜索过滤
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(p =>
      p.title.toLowerCase().includes(q) ||
      p.authors.some(a => a.toLowerCase().includes(q)) ||
      p.tags.some(t => t.toLowerCase().includes(q))
    )
  }

  // 阅读状态过滤
  if (readFilter.value === 'read') {
    result = result.filter(p => p.readStatus === 'read')
  } else if (readFilter.value === 'unread') {
    result = result.filter(p => p.readStatus === 'unread')
  } else if (readFilter.value === 'evidence') {
    result = result.filter(p => p.hasEvidence)
  } else if (readFilter.value === 'notes') {
    result = result.filter(p => p.id === 'p1' || p.id === 'p2') // 模拟有笔记的论文
  } else if (readFilter.value === 'high-cited') {
    result = result.filter(p => p.citations >= 200)
  }

  // 排序
  if (sortBy.value === 'date') {
    result.sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime())
  } else if (sortBy.value === 'citations') {
    result.sort((a, b) => b.citations - a.citations)
  } else if (sortBy.value === 'year') {
    result.sort((a, b) => b.year - a.year)
  } else if (sortBy.value === 'title') {
    result.sort((a, b) => a.title.localeCompare(b.title))
  }

  return result
})

// 相关文献
const relatedPapers = computed(() => {
  if (!selectedPaper.value) return []
  return papers.value
    .filter(p => p.id !== selectedPaper.value!.id)
    .filter(p => p.tags.some(t => selectedPaper.value!.tags.includes(t)))
    .slice(0, 3)
})

// 方法
function readStatusText(status: string) {
  const map: Record<string, string> = {
    read: '已读',
    reading: '在读',
    unread: '未读',
  }
  return map[status] || status
}

function formatAddedAt(dateStr: string) {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return '今天'
  if (days === 1) return '昨天'
  if (days < 7) return `${days} 天前`
  if (days < 30) return `${Math.floor(days / 7)} 周前`
  return `${Math.floor(days / 30)} 月前`
}

async function loadCollections() {
  try {
    const data = await researchLiteratureApi.collections()
    collections.value = data as LiteratureCollection[]
  } catch (e) {
    console.error('加载文集失败', e)
  }
}

async function loadPapers() {
  loading.value = true
  try {
    const data = await researchLiteratureApi.list({ collectionId: activeCollection.value })
    papers.value = (data as { items: Paper[] }).items || (data as Paper[])
    // 添加收藏状态
    papers.value = papers.value.map(p => ({ ...p, isStarred: false }))
  } catch (e) {
    console.error('加载文献失败', e)
  } finally {
    loading.value = false
  }
}

function selectCollection(id: string) {
  activeCollection.value = id
  selectedPaper.value = null
  loadPapers()
}

async function selectPaper(paper: Paper) {
  selectedPaper.value = paper
  abstractExpanded.value = false
  // 加载详情（模拟）
  try {
    const detail = await researchLiteratureApi.detail(paper.id)
    if (detail) {
      selectedPaper.value = detail as Paper
    }
  } catch (e) {
    // 忽略，使用已有数据
  }
}

function onSearch() {
  // 搜索通过 computed 自动过滤
}

function onSortChange() {
  // 排序通过 computed 自动处理
}

function filterByTag(tag: string) {
  searchQuery.value = tag
  toastStore.show(`已筛选标签: ${tag}`, 'info')
}

function toggleStar(paper: PaperWithStar) {
  paper.isStarred = !paper.isStarred
  toastStore.show(
    paper.isStarred ? '已添加到收藏' : '已取消收藏',
    paper.isStarred ? 'success' : 'info'
  )
}

function extractEvidence(paper: Paper | null) {
  if (!paper) return
  toastStore.show('正在提取证据，请稍候...', 'info')
  // 模拟提取过程
  setTimeout(() => {
    paper.hasEvidence = true
    toastStore.show('证据提取完成', 'success')
  }, 1500)
}

function onImport() {
  toastStore.show('导入功能开发中', 'info')
}

function createCollection() {
  toastStore.show('新建文集功能开发中', 'info')
}

function addNote() {
  toastStore.show('添加笔记功能开发中', 'info')
}

// 初始化
onMounted(async () => {
  await Promise.all([loadCollections(), loadPapers()])
  // 默认选中第一篇
  if (papers.value.length > 0) {
    selectedPaper.value = papers.value[0]
  }
})
</script>

<style scoped>
/* ============================================================
   三栏布局
   ============================================================ */
.rs-three-col {
  display: grid;
  grid-template-columns: 220px 1fr 340px;
  height: calc(100vh - var(--rs-topbar-height));
  min-height: 0;
  background: var(--rs-bg-base);
}

.rs-three-col:has(.rs-col-right:not(:empty)) {
  /* 右栏存在时保持三栏 */
}

/* ============================================================
   左栏：集合导航
   ============================================================ */
.rs-col-left {
  background: var(--rs-bg-surface);
  border-right: 1px solid var(--rs-border-subtle);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.rs-sidebar-search {
  padding: 12px;
  border-bottom: 1px solid var(--rs-border-subtle);
}

.rs-sidebar-nav {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 8px 10px 16px;
}

.rs-sidebar-nav::-webkit-scrollbar {
  width: 4px;
}

.rs-sidebar-nav::-webkit-scrollbar-thumb {
  background: transparent;
  border-radius: 2px;
}

.rs-sidebar-nav:hover::-webkit-scrollbar-thumb {
  background: var(--rs-border-default);
}

.rs-nav-section {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-top: 16px;
}

.rs-nav-section:first-child {
  margin-top: 0;
}

.rs-nav-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--rs-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 8px 10px 4px;
}

.rs-nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: var(--rs-radius-md);
  cursor: pointer;
  transition: all var(--rs-transition-fast);
  color: var(--rs-text-secondary);
  font-size: 13px;
  position: relative;
}

.rs-nav-item:hover {
  background: var(--rs-bg-hover);
  color: var(--rs-text-primary);
}

.rs-nav-item.active {
  background: var(--rs-brand-500-soft);
  color: var(--rs-brand-300);
  font-weight: 500;
}

.rs-nav-item.active::before {
  content: '';
  position: absolute;
  left: -10px;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 20px;
  background: var(--rs-brand-400);
  border-radius: 0 2px 2px 0;
}

.rs-nav-item-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

.rs-nav-item-text {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rs-nav-item-badge {
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  background: var(--rs-bg-surface-3);
  border-radius: var(--rs-radius-full);
  font-size: 11px;
  font-weight: 500;
  color: var(--rs-text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.rs-nav-item.active .rs-nav-item-badge {
  background: var(--rs-brand-500-soft-2);
  color: var(--rs-brand-300);
}

.rs-nav-item-new {
  color: var(--rs-text-muted);
  border: 1px dashed var(--rs-border-default);
  margin-top: 4px;
}

.rs-nav-item-new:hover {
  color: var(--rs-brand-400);
  border-color: var(--rs-brand-500-soft-2);
  background: var(--rs-brand-500-soft);
}

/* 标签云 */
.rs-tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 4px 10px;
}

.rs-tag-cloud-item {
  cursor: pointer;
  transition: all var(--rs-transition-fast);
}

.rs-tag-cloud-item:hover {
  background: var(--rs-brand-500-soft-2);
  transform: translateY(-1px);
}

/* ============================================================
   输入框样式
   ============================================================ */
.rs-input {
  position: relative;
  display: flex;
  align-items: center;
}

.rs-input input {
  width: 100%;
  height: 34px;
  padding: 0 12px;
  background: var(--rs-bg-surface-2);
  border: 1px solid var(--rs-border-subtle);
  border-radius: var(--rs-radius-md);
  color: var(--rs-text-primary);
  font-size: 13px;
  outline: none;
  transition: all var(--rs-transition-fast);
}

.rs-input input::placeholder {
  color: var(--rs-text-muted);
}

.rs-input input:focus {
  border-color: var(--rs-brand-500);
  background: var(--rs-bg-surface-3);
}

.rs-input-sm input {
  height: 30px;
  font-size: 12px;
}

.rs-input-icon input {
  padding-left: 34px;
}

.rs-input-icon-left {
  position: absolute;
  left: 10px;
  width: 16px;
  height: 16px;
  color: var(--rs-text-muted);
  pointer-events: none;
}

/* ============================================================
   选择器样式
   ============================================================ */
.rs-select {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.rs-select select {
  appearance: none;
  -webkit-appearance: none;
  height: 30px;
  padding: 0 28px 0 10px;
  background: var(--rs-bg-surface-2);
  border: 1px solid var(--rs-border-subtle);
  border-radius: var(--rs-radius-md);
  color: var(--rs-text-secondary);
  font-size: 12px;
  cursor: pointer;
  outline: none;
  transition: all var(--rs-transition-fast);
}

.rs-select select:hover {
  border-color: var(--rs-border-default);
  color: var(--rs-text-primary);
}

.rs-select select:focus {
  border-color: var(--rs-brand-500);
}

.rs-select-caret {
  position: absolute;
  right: 8px;
  width: 14px;
  height: 14px;
  color: var(--rs-text-muted);
  pointer-events: none;
}

.rs-select-sm select {
  height: 28px;
  font-size: 12px;
}

/* ============================================================
   中栏：文献列表
   ============================================================ */
.rs-col-main {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background: var(--rs-bg-base);
}

/* 顶部工具栏 */
.rs-list-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  border-bottom: 1px solid var(--rs-border-subtle);
  background: var(--rs-bg-surface);
  gap: 16px;
}

.rs-list-toolbar-left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.rs-list-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--rs-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rs-list-count {
  font-size: 12px;
  color: var(--rs-text-muted);
  background: var(--rs-bg-surface-2);
  padding: 2px 8px;
  border-radius: var(--rs-radius-full);
  flex-shrink: 0;
}

.rs-list-toolbar-center {
  flex-shrink: 0;
}

.rs-list-toolbar-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

/* 视图切换 */
.rs-view-toggle {
  display: flex;
  background: var(--rs-bg-surface-2);
  border: 1px solid var(--rs-border-subtle);
  border-radius: var(--rs-radius-md);
  padding: 2px;
  gap: 2px;
}

.rs-view-btn {
  width: 26px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--rs-radius-sm);
  color: var(--rs-text-muted);
  transition: all var(--rs-transition-fast);
}

.rs-view-btn:hover {
  color: var(--rs-text-secondary);
  background: var(--rs-bg-hover);
}

.rs-view-btn.active {
  background: var(--rs-brand-500-soft);
  color: var(--rs-brand-400);
}

.rs-view-btn svg {
  width: 16px;
  height: 16px;
}

/* 筛选芯片条 */
.rs-chip-group {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 20px;
  border-bottom: 1px solid var(--rs-border-subtle);
  background: var(--rs-bg-surface);
  overflow-x: auto;
}

.rs-chip-group::-webkit-scrollbar {
  height: 0;
}

.rs-chip {
  flex-shrink: 0;
  height: 26px;
  padding: 0 12px;
  font-size: 12px;
  font-weight: 500;
  color: var(--rs-text-secondary);
  background: var(--rs-bg-surface-2);
  border: 1px solid var(--rs-border-subtle);
  border-radius: var(--rs-radius-full);
  cursor: pointer;
  transition: all var(--rs-transition-fast);
}

.rs-chip:hover {
  border-color: var(--rs-border-default);
  color: var(--rs-text-primary);
}

.rs-chip.active {
  background: var(--rs-brand-500-soft);
  border-color: var(--rs-brand-500-soft-2);
  color: var(--rs-brand-300);
}

/* 文献列表 */
.rs-paper-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 8px 12px;
}

.rs-paper-list::-webkit-scrollbar {
  width: 8px;
}

.rs-paper-list::-webkit-scrollbar-track {
  background: transparent;
}

.rs-paper-list::-webkit-scrollbar-thumb {
  background: var(--rs-border-default);
  border-radius: 4px;
}

.rs-paper-list::-webkit-scrollbar-thumb:hover {
  background: var(--rs-border-strong);
}

.rs-paper-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  margin-bottom: 6px;
  background: var(--rs-bg-surface);
  border: 1px solid var(--rs-border-subtle);
  border-radius: var(--rs-radius-lg);
  cursor: pointer;
  transition: all var(--rs-transition-fast);
  position: relative;
  border-left: 3px solid transparent;
}

.rs-paper-row:hover {
  border-color: var(--rs-border-default);
  background: var(--rs-bg-surface-2);
}

.rs-paper-row.active {
  border-left-color: var(--rs-brand-400);
  background: var(--rs-brand-500-soft);
  border-color: var(--rs-brand-500-soft-2);
}

.rs-paper-main {
  flex: 1;
  min-width: 0;
}

.rs-paper-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--rs-text-primary);
  line-height: 1.4;
  margin-bottom: 4px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.rs-paper-row.active .rs-paper-title {
  color: var(--rs-brand-200);
}

.rs-paper-authors {
  font-size: 12px;
  color: var(--rs-text-secondary);
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rs-paper-venue {
  font-size: 12px;
  color: var(--rs-text-muted);
  margin-bottom: 8px;
}

.rs-paper-venue-name {
  font-style: italic;
}

.rs-paper-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
}

.rs-paper-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 11px;
  color: var(--rs-text-muted);
}

.rs-paper-meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.rs-paper-meta-item svg {
  width: 13px;
  height: 13px;
}

.rs-status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  display: inline-block;
}

.rs-status-read {
  background: var(--rs-success);
}

.rs-status-reading {
  background: var(--rs-warning);
}

.rs-status-unread {
  background: var(--rs-text-dim);
}

/* 文献操作按钮 */
.rs-paper-actions {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex-shrink: 0;
  opacity: 0;
  transition: opacity var(--rs-transition-fast);
}

.rs-paper-row:hover .rs-paper-actions,
.rs-paper-row.active .rs-paper-actions {
  opacity: 1;
}

.rs-paper-action-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--rs-radius-sm);
  color: var(--rs-text-muted);
  transition: all var(--rs-transition-fast);
}

.rs-paper-action-btn:hover {
  background: var(--rs-bg-hover);
  color: var(--rs-text-secondary);
}

.rs-paper-action-btn svg {
  width: 16px;
  height: 16px;
}

.rs-paper-action-btn.starred {
  color: var(--rs-brand-400);
}

.rs-paper-action-btn.starred svg {
  fill: var(--rs-brand-400);
}

.rs-paper-action-btn.rs-btn-extract:hover {
  color: var(--rs-brand-400);
  background: var(--rs-brand-500-soft);
}

/* 空状态 */
.rs-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: var(--rs-text-muted);
}

.rs-empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.rs-empty-text {
  font-size: 14px;
}

/* 加载态 */
.rs-list-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  gap: 12px;
  color: var(--rs-text-muted);
}

.rs-loading-spinner {
  width: 28px;
  height: 28px;
  border: 3px solid var(--rs-border-default);
  border-top-color: var(--rs-brand-400);
  border-radius: 50%;
  animation: rs-spin 0.8s linear infinite;
}

@keyframes rs-spin {
  to { transform: rotate(360deg); }
}

/* ============================================================
   右栏：文献详情
   ============================================================ */
.rs-col-right {
  background: var(--rs-bg-surface);
  border-left: 1px solid var(--rs-border-subtle);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.rs-detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--rs-border-subtle);
  flex-shrink: 0;
}

.rs-detail-close {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--rs-radius-md);
  color: var(--rs-text-muted);
  transition: all var(--rs-transition-fast);
}

.rs-detail-close:hover {
  background: var(--rs-bg-hover);
  color: var(--rs-text-secondary);
}

.rs-detail-close svg {
  width: 16px;
  height: 16px;
}

.rs-detail-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 0;
}

.rs-detail-scroll::-webkit-scrollbar {
  width: 6px;
}

.rs-detail-scroll::-webkit-scrollbar-track {
  background: transparent;
}

.rs-detail-scroll::-webkit-scrollbar-thumb {
  background: var(--rs-border-default);
  border-radius: 3px;
}

.rs-detail-section {
  padding: 16px 20px;
}

.rs-detail-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--rs-text-primary);
  line-height: 1.4;
  margin-bottom: 10px;
}

.rs-detail-authors {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 0;
  margin-bottom: 8px;
}

.rs-detail-author {
  font-size: 13px;
  color: var(--rs-brand-400);
  text-decoration: underline;
  text-decoration-color: var(--rs-brand-500-soft-2);
  text-underline-offset: 2px;
}

.rs-detail-author:hover {
  color: var(--rs-brand-300);
}

.rs-detail-authors .rs-detail-author:not(:last-child)::after {
  content: ',';
  color: var(--rs-text-muted);
  margin-right: 2px;
}

.rs-detail-venue {
  font-size: 12px;
  color: var(--rs-text-secondary);
  font-style: italic;
  margin-bottom: 12px;
}

.rs-detail-citations {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  background: var(--rs-bg-surface-2);
  border-radius: var(--rs-radius-md);
}

.rs-citation-count {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.rs-citation-count strong {
  font-size: 20px;
  font-weight: 700;
  color: var(--rs-brand-400);
  line-height: 1;
}

.rs-citation-count span {
  font-size: 11px;
  color: var(--rs-text-muted);
}

.rs-citation-trend {
  width: 80px;
  height: 30px;
}

.rs-trend-svg {
  width: 100%;
  height: 100%;
}

/* 分割线 */
.rs-divider {
  height: 1px;
  background: var(--rs-border-subtle);
  margin: 0 20px;
}

/* 区块标题 */
.rs-detail-section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--rs-text-primary);
  margin-bottom: 10px;
}

.rs-detail-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.rs-detail-section-header .rs-detail-section-title {
  margin-bottom: 0;
}

/* 摘要 */
.rs-detail-abstract {
  font-size: 13px;
  color: var(--rs-text-secondary);
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 8px;
}

.rs-detail-abstract.expanded {
  -webkit-line-clamp: unset;
  display: block;
}

.rs-detail-expand-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--rs-brand-400);
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  transition: color var(--rs-transition-fast);
}

.rs-detail-expand-link:hover {
  color: var(--rs-brand-300);
}

.rs-detail-expand-link svg {
  width: 14px;
  height: 14px;
  transition: transform var(--rs-transition-fast);
}

.rs-detail-expand-link svg.rotated {
  transform: rotate(180deg);
}

/* 关键信息列表 */
.rs-detail-info-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.rs-detail-info-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
}

.rs-detail-info-label {
  color: var(--rs-text-muted);
}

.rs-detail-info-value {
  color: var(--rs-text-secondary);
  font-family: var(--rs-font-mono);
  font-size: 11px;
}

.rs-detail-info-link {
  color: var(--rs-brand-400);
  font-size: 12px;
}

.rs-detail-info-link:hover {
  color: var(--rs-brand-300);
}

.rs-detail-keywords {
  margin-bottom: 12px;
}

.rs-detail-keywords-label {
  display: block;
  font-size: 12px;
  color: var(--rs-text-muted);
  margin-bottom: 6px;
}

.rs-detail-keywords-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.rs-detail-collection-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  padding-top: 8px;
  border-top: 1px solid var(--rs-border-subtle);
}

/* 笔记列表 */
.rs-note-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.rs-note-item {
  padding: 10px 12px;
  background: var(--rs-bg-surface-2);
  border-radius: var(--rs-radius-md);
  border-left: 2px solid var(--rs-brand-500);
}

.rs-note-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.rs-note-page {
  font-size: 11px;
  font-weight: 600;
  color: var(--rs-brand-400);
  background: var(--rs-brand-500-soft);
  padding: 1px 6px;
  border-radius: var(--rs-radius-sm);
}

.rs-note-time {
  font-size: 11px;
  color: var(--rs-text-muted);
}

.rs-note-content {
  font-size: 12px;
  color: var(--rs-text-secondary);
  line-height: 1.5;
}

.rs-note-empty {
  font-size: 12px;
  color: var(--rs-text-muted);
  text-align: center;
  padding: 16px;
}

/* 证据列表 */
.rs-evidence-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.rs-evidence-item {
  padding: 10px 12px;
  background: var(--rs-bg-surface-2);
  border-radius: var(--rs-radius-md);
}

.rs-evidence-type {
  margin-bottom: 6px;
}

.rs-evidence-content {
  font-size: 12px;
  color: var(--rs-text-secondary);
  line-height: 1.5;
  margin-bottom: 6px;
}

.rs-evidence-meta {
  font-size: 11px;
  color: var(--rs-text-muted);
}

.rs-evidence-empty {
  font-size: 12px;
  color: var(--rs-text-muted);
  text-align: center;
  padding: 16px;
}

/* 相关文献 */
.rs-related-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.rs-related-item {
  padding: 10px 12px;
  background: var(--rs-bg-surface-2);
  border-radius: var(--rs-radius-md);
  cursor: pointer;
  transition: all var(--rs-transition-fast);
}

.rs-related-item:hover {
  background: var(--rs-bg-surface-3);
  border-color: var(--rs-border-default);
}

.rs-related-title {
  font-size: 12px;
  font-weight: 500;
  color: var(--rs-text-primary);
  line-height: 1.4;
  margin-bottom: 4px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.rs-related-meta {
  font-size: 11px;
  color: var(--rs-text-muted);
  display: flex;
  gap: 4px;
}

/* 标签 */
.rs-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: var(--rs-radius-sm);
  font-size: 11px;
  font-weight: 500;
  line-height: 1.5;
}

.rs-tag-brand {
  background: var(--rs-brand-500-soft);
  color: var(--rs-brand-300);
  border: 1px solid var(--rs-brand-500-soft-2);
}
</style>
