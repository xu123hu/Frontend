import { defineStore } from 'pinia'
import { researchLibraryApi, researchSummary } from '@/api/researchEnd'

/**
 * 科研端共享状态：文献库（集合/标签/论文列表与筛选）、首页摘要。
 * 页面级状态留在页面内，这里只放跨页共享的：文献库筛选在返回阅读器/URL 时保留。
 */
export const useResearchStore = defineStore('researchEnd', {
  state: () => ({
    summary: null,
    summaryLoaded: false,
    collections: [],
    tags: [],
    papers: [],
    total: 0,
    page: 1,
    pageSize: 20,
    filters: { q: '', collection_id: null, tag_id: '', reading_status: '', sort: 'recently_clicked', order: 'desc' },
    loading: false,
    error: '',
  }),
  getters: {
    paperById: (s) => (id) => s.papers.find((p) => p.id === id) || null,
  },
  actions: {
    async fetchSummary() {
      try {
        this.summary = await researchSummary()
        this.summaryLoaded = true
      } catch (e) {
        this.summaryLoaded = true
        this.error = e?.message || '摘要加载失败'
      }
    },
    async fetchLibrary() {
      this.loading = true
      this.error = ''
      try {
        const params = {
          q: this.filters.q || undefined,
          collection_id: this.filters.collection_id || undefined,
          tag_id: this.filters.tag_id || undefined,
          reading_status: this.filters.reading_status || undefined,
          sort: this.filters.sort,
          order: this.filters.order,
          page: this.page,
          page_size: this.pageSize,
        }
        const data = await researchLibraryApi.listPapers(params)
        this.papers = data?.items || []
        this.total = data?.total || 0
      } catch (e) {
        this.error = e?.message || '文献库加载失败'
        this.papers = []
      } finally {
        this.loading = false
      }
    },
    async fetchCollections() {
      this.collections = await researchLibraryApi.collections()
    },
    async fetchTags() {
      this.tags = await researchLibraryApi.tags()
    },
    reset() {
      this.summary = null
      this.summaryLoaded = false
      this.collections = []
      this.tags = []
      this.papers = []
    },
  },
})