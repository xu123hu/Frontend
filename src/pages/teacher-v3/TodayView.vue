<template>
  <div class="tv3-today-ai" data-testid="tv3-today">
    <div class="tv3-ai-bg-blob tv3-ai-bg-blob--1"></div>
    <div class="tv3-ai-bg-blob tv3-ai-bg-blob--2"></div>
    <div class="tv3-ai-bg-blob tv3-ai-bg-blob--3"></div>

    <div class="tv3-ai-wrap">
      <div class="tv3-ai-welcome">
        <p class="tv3-ai-welcome__sub">{{ greeting }}，{{ today?.teacher.name || '李老师' }} 👋</p>
        <h1 class="tv3-ai-welcome__title">今天想<span class="tv3-gradient-text">做点什么</span>？</h1>
        <p class="tv3-ai-welcome__desc">备课、课件 PPT、题目入库、组卷批改，一句话交给 AI</p>
      </div>

      <div class="tv3-ai-input-wrap">
        <div class="tv3-ai-input-glow">
          <div class="tv3-ai-input-card">
            <textarea v-model="inputText" placeholder="描述你的任务，例如：帮我备《椭圆及其标准方程》第 1 课时，或把这道题拍照入库" rows="1" class="tv3-ai-textarea" @keydown.enter.exact.prevent="onSend"></textarea>
            <div class="tv3-ai-input-bar">
              <button class="tv3-ai-icon-btn" title="添加附件">
                <n-icon :size="16"><AttachOutline /></n-icon>
              </button>
              <div class="tv3-ai-chips">
                <button v-for="c in capabilityChips" :key="c.key" class="tv3-ai-chip" @click="onChipClick(c)">
                  <n-icon :size="14"><component :is="c.icon" /></n-icon>
                  <span>{{ c.label }}</span>
                </button>
              </div>
              <button class="tv3-ai-send-btn" @click="onSend" title="发送">
                <n-icon :size="18"><SendOutline /></n-icon>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="tv3-ai-context">
        <button v-for="ctx in contextPills" :key="ctx.key" class="tv3-ai-ctx-pill">
          <n-icon :size="13"><component :is="ctx.icon" /></n-icon>
          <span>{{ ctx.label }}</span>
          <n-icon :size="12"><ChevronDownOutline /></n-icon>
        </button>
      </div>

      <div class="tv3-ai-section tv3-ai-recommend">
        <h2 class="tv3-ai-rec-title">为你推荐</h2>
        <div class="tv3-ai-rec-list">
          <button v-for="(rec, i) in recommendedPrompts" :key="i" class="tv3-ai-rec-item" @click="applyPrompt(rec.text)">
            <div class="tv3-ai-rec-icon" :style="{ background: rec.iconBg }">
              <n-icon :size="16" :style="{ color: rec.iconColor }"><component :is="rec.icon" /></n-icon>
            </div>
            <span class="tv3-ai-rec-text">{{ rec.text }}</span>
          </button>
        </div>
      </div>

      <div class="tv3-ai-section">
        <div class="tv3-ai-section-head">
          <h2 class="tv3-ai-section-title">AI 能力库</h2>
          <router-link to="/teacher-v3/slides" class="tv3-ai-section-more">
            查看全部技能 <n-icon :size="14"><ChevronForwardOutline /></n-icon>
          </router-link>
        </div>
        <div class="tv3-ai-cap-grid">
          <router-link v-for="cap in capabilityCards" :key="cap.key" :to="cap.path" class="tv3-ai-cap-card">
            <div class="tv3-ai-cap-icon" :style="{ background: cap.iconBg }">
              <n-icon :size="22" :style="{ color: cap.iconColor }"><component :is="cap.icon" /></n-icon>
            </div>
            <h3 class="tv3-ai-cap-title">{{ cap.title }}</h3>
            <p class="tv3-ai-cap-desc">{{ cap.desc }}</p>
          </router-link>
        </div>
      </div>

      <div class="tv3-ai-section">
        <div class="tv3-ai-today-card">
          <div class="tv3-ai-today-head">
            <div class="tv3-ai-today-head-left">
              <h2 class="tv3-ai-section-title">今日教学</h2>
              <span class="tv3-ai-today-sub">{{ todayDate }} · {{ schedule.length }} 节课 · {{ todos.length }} 项待办</span>
            </div>
            <router-link to="/teacher-v3/today" class="tv3-ai-section-more">
              进入工作台 <n-icon :size="14"><ChevronForwardOutline /></n-icon>
            </router-link>
          </div>
          <div class="tv3-ai-schedule-grid">
            <div v-for="(s, i) in schedule" :key="i" class="tv3-ai-sch-item" :data-status="s.status">
              <div class="tv3-ai-sch-top">
                <span class="tv3-ai-sch-time">{{ s.time }}</span>
                <span class="tv3-ai-sch-tag" :class="statusTagClass(s.status)">{{ statusLabel(s.status) }}</span>
              </div>
              <p class="tv3-ai-sch-topic">{{ s.topic }}</p>
              <p class="tv3-ai-sch-class">{{ s.class_name }}</p>
              <div v-if="s.missing?.length" class="tv3-ai-sch-missing">
                <router-link v-if="s.missing.some(m => m.includes('课件'))" to="/teacher-v3/slides" class="tv3-ai-mini-btn">去补课件</router-link>
                <router-link v-if="s.missing.some(m => m.includes('题'))" to="/teacher-v3/quiz" class="tv3-ai-mini-btn tv3-ai-mini-btn--warn">去组卷</router-link>
              </div>
            </div>
          </div>
          <div v-if="todos.length" class="tv3-ai-todo-row">
            <span class="tv3-ai-todo-label">
              <n-icon :size="14"><CheckmarkCircleOutline /></n-icon> 待办
            </span>
            <div class="tv3-ai-todo-chips">
              <span v-for="t in todos" :key="t.id" class="tv3-ai-todo-chip" :data-kind="t.kind">{{ t.text }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="tv3-ai-section">
        <div class="tv3-ai-section-head">
          <div class="tv3-ai-recent-tabs">
            <h2 class="tv3-ai-section-title">最近工作</h2>
            <div class="tv3-ai-tab-group">
              <button v-for="t in recentTabs" :key="t.key" class="tv3-ai-tab-btn" :class="{ 'is-active': recentTab === t.key }" @click="recentTab = t.key">{{ t.label }}</button>
            </div>
          </div>
          <router-link to="/teacher-v3/prep" class="tv3-ai-section-more">
            查看全部 <n-icon :size="14"><ChevronForwardOutline /></n-icon>
          </router-link>
        </div>
        <div class="tv3-ai-recent-list">
          <div v-for="(item, i) in recentItems" :key="i" class="tv3-ai-recent-item">
            <div class="tv3-ai-recent-icon" :style="{ background: item.iconBg }">
              <n-icon :size="18" class="tv3-ai-recent-icon-inner"><component :is="item.icon" /></n-icon>
            </div>
            <div class="tv3-ai-recent-main">
              <h3 class="tv3-ai-recent-title">{{ item.title }}</h3>
              <div class="tv3-ai-recent-meta">
                <span class="tv3-ai-recent-tag">{{ item.classTag }}</span>
                <span class="tv3-ai-recent-tag" :style="{ background: item.typeTagBg, color: item.typeTagColor }">{{ item.typeTag }}</span>
                <span class="tv3-ai-recent-dot">·</span>
                <span class="tv3-ai-recent-time">{{ item.time }}</span>
              </div>
            </div>
            <div class="tv3-ai-recent-right">
              <span class="tv3-ai-status-tag" :class="statusClass(item.status)">{{ item.statusLabel }}</span>
              <n-icon :size="16" class="tv3-ai-recent-arrow"><ChevronForwardOutline /></n-icon>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { NIcon } from 'naive-ui'
import {
  AttachOutline, SendOutline, BookOutline, EaselOutline, ScanOutline,
  DocumentTextOutline, ClipboardOutline, MicOutline, AppsOutline,
  PeopleOutline, PricetagOutline, TimeOutline,
  ChevronDownOutline, ChevronForwardOutline, CheckmarkCircleOutline,
  FileTrayFullOutline,
} from '@vicons/ionicons5'
import { v3Api } from '@/api/teacherV3'
import type { V3TodayData } from '@/types/teacherV3'

const today = ref<V3TodayData | null>(null)
const schedule = computed(() => today.value?.schedule ?? [])
const todos = computed(() => today.value?.todos ?? [])
const greeting = computed(() => new Date().getHours() < 12 ? '上午好' : new Date().getHours() < 18 ? '下午好' : '晚上好')
const todayDate = computed(() => {
  const d = new Date()
  return d.getMonth() + 1 + '月' + d.getDate() + '日 周' + '日一二三四五六'[d.getDay()]
})

const inputText = ref('')
const recentTab = ref('all')

onMounted(async () => {
  try {
    const r = await v3Api.catalog.today()
    today.value = r.data
  } catch (e) {}
})

const capabilityChips = [
  { key: 'prep', label: '备课教案', icon: BookOutline, path: '/teacher-v3/prep' },
  { key: 'slides', label: '生成课件 PPT', icon: EaselOutline, path: '/teacher-v3/slides' },
  { key: 'bank', label: '题目入库', icon: ScanOutline, path: '/teacher-v3/bank' },
  { key: 'quiz', label: '智能组卷', icon: DocumentTextOutline, path: '/teacher-v3/quiz' },
  { key: 'assign', label: '批改作业', icon: ClipboardOutline, path: '/teacher-v3/assign' },
  { key: 'voice', label: '语音公式', icon: MicOutline, path: '' },
  { key: 'more', label: '更多', icon: AppsOutline, path: '' },
]

const contextPills = [
  { key: 'book', label: '人教A版 · 选修一', icon: BookOutline },
  { key: 'chapter', label: '第2章 圆锥曲线', icon: FileTrayFullOutline },
  { key: 'class', label: '高二(5)班', icon: PeopleOutline },
  { key: 'type', label: '新授课', icon: PricetagOutline },
  { key: 'duration', label: '40 分钟', icon: TimeOutline },
]

const recommendedPrompts = [
  { text: '备《椭圆及其标准方程》第 1 课时，生成教案 + 课件', icon: BookOutline, iconBg: 'rgba(79, 70, 229, 0.1)', iconColor: '#4f46e5' },
  { text: '把昨天课上拍的 3 道立体几何题识别整理入库', icon: ScanOutline, iconBg: 'rgba(139, 92, 246, 0.1)', iconColor: '#7c3aed' },
  { text: '出一份《圆锥曲线》单元测试卷，附详细解析', icon: DocumentTextOutline, iconBg: 'rgba(245, 158, 11, 0.1)', iconColor: '#d97706' },
]

const capabilityCards = [
  { key: 'prep', title: '备课教案', desc: '选教材章节或上传往年教案，生成可逐块修改的规范教案', icon: BookOutline, iconBg: 'linear-gradient(135deg, rgba(79,70,229,0.1), rgba(99,102,241,0.1))', iconColor: '#4f46e5', path: '/teacher-v3/prep' },
  { key: 'slides', title: '生成课件 PPT', desc: '大纲确认后逐页生成，公式与图形可直接编辑', icon: EaselOutline, iconBg: 'linear-gradient(135deg, rgba(6,182,212,0.1), rgba(34,211,238,0.1))', iconColor: '#06b6d4', path: '/teacher-v3/slides' },
  { key: 'bank', title: '题目入库', desc: '拍照或粘贴题目，识别校对后按知识点入库', icon: ScanOutline, iconBg: 'linear-gradient(135deg, rgba(139,92,246,0.1), rgba(167,139,250,0.1))', iconColor: '#8b5cf6', path: '/teacher-v3/bank' },
  { key: 'quiz', title: '智能组卷', desc: '按知识点与难度选题组卷，自动附答案解析', icon: DocumentTextOutline, iconBg: 'linear-gradient(135deg, rgba(245,158,11,0.1), rgba(251,191,36,0.1))', iconColor: '#f59e0b', path: '/teacher-v3/quiz' },
]

const recentTabs = [
  { key: 'all', label: '全部' },
  { key: 'prep', label: '教案' },
  { key: 'slides', label: '课件' },
  { key: 'bank', label: '题库' },
]

const recentItems = [
  { title: '椭圆及其标准方程（第1课时）· 教案', classTag: '高二(5)班', typeTag: '新授课', typeTagBg: 'rgba(79, 70, 229, 0.08)', typeTagColor: '#4f46e5', time: '昨天', status: 'draft', statusLabel: '草稿', icon: BookOutline, iconBg: 'linear-gradient(135deg, #4f46e5, #7c3aed)' },
  { title: '导数的几何意义 · 课件（12 页）', classTag: '高二(3)班', typeTag: '讲练结合', typeTagBg: 'rgba(6, 182, 212, 0.1)', typeTagColor: '#0891b2', time: '2天前', status: 'done', statusLabel: '已完成', icon: EaselOutline, iconBg: 'linear-gradient(135deg, #06b6d4, #0e7490)' },
  { title: '圆锥曲线 · 题目入库 8 道', classTag: '含 2 道变式', typeTag: '知识点校对完成', typeTagBg: 'rgba(139, 92, 246, 0.1)', typeTagColor: '#7c3aed', time: '3天前', status: 'done', statusLabel: '已入库', icon: ScanOutline, iconBg: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' },
]

function onSend() {
  if (!inputText.value.trim()) return
  console.log('send:', inputText.value)
}

function onChipClick(c: { key: string; path: string }) {
  if (c.path) window.location.hash = c.path
}

function applyPrompt(text: string) {
  inputText.value = text
}

function statusLabel(s: string) {
  return s === 'done' ? '已完成' : s === 'next' ? '下一节' : '待上'
}

function statusTagClass(s: string) {
  return { 'is-done': s === 'done', 'is-next': s === 'next', 'is-pending': s !== 'done' && s !== 'next' }
}

function statusClass(s: string) {
  return { 'is-warn': s === 'draft', 'is-ok': s === 'done' }
}
</script>

<style scoped>
.tv3-today-ai {
  position: relative;
  margin: -22px;
  padding: 22px;
  min-height: calc(100vh - var(--tv3-topbar-h) - 44px);
  background: var(--tv3-bg);
  overflow: hidden;
}
.tv3-ai-bg-blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.35;
  pointer-events: none;
}
.tv3-ai-bg-blob--1 { width: 500px; height: 500px; background: #c7d2fe; top: -150px; left: -100px; }
.tv3-ai-bg-blob--2 { width: 400px; height: 400px; background: #a5f3fc; top: 200px; right: -100px; opacity: 0.25; }
.tv3-ai-bg-blob--3 { width: 600px; height: 600px; background: #e0e7ff; bottom: -200px; left: 30%; opacity: 0.4; }

.tv3-ai-wrap {
  position: relative;
  z-index: 1;
  max-width: 820px;
  margin: 0 auto;
  padding: 24px 0 40px;
}

.tv3-ai-welcome { text-align: center; margin-bottom: 32px; animation: tv3-ai-fade 0.7s ease-out both; }
.tv3-ai-welcome__sub { font-size: 14px; color: var(--tv3-ink3); margin: 0 0 10px; }
.tv3-ai-welcome__title { font-size: 40px; font-weight: 800; color: var(--tv3-ink); margin: 0 0 10px; letter-spacing: -0.5px; line-height: 1.2; }
.tv3-ai-welcome__desc { font-size: 15px; color: var(--tv3-ink3); margin: 0; }
.tv3-gradient-text {
  background: linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
}

.tv3-ai-input-wrap { margin-bottom: 24px; animation: tv3-ai-fade 0.7s ease-out 0.1s both; }
.tv3-ai-input-glow {
  position: relative;
  border-radius: 28px;
  padding: 2px;
  background: linear-gradient(135deg, rgba(79, 70, 229, 0.4), rgba(6, 182, 212, 0.4), rgba(79, 70, 229, 0.4));
  background-size: 200% 200%;
  animation: tv3-ai-shimmer 4s linear infinite;
}
.tv3-ai-input-glow::before {
  content: ""; position: absolute; inset: -6px; border-radius: 34px;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(6, 182, 212, 0.15));
  filter: blur(16px); z-index: -1; animation: tv3-ai-pulse 3s ease-in-out infinite;
}
.tv3-ai-input-card { background: #fff; border-radius: 26px; padding: 20px 24px; }
.tv3-ai-textarea {
  width: 100%; resize: none; border: none; outline: none; background: transparent;
  color: var(--tv3-ink); font-size: 14.5px; line-height: 1.7; font-family: inherit;
  min-height: 28px; max-height: 200px;
}
.tv3-ai-textarea::placeholder { color: #94a3b8; }
.tv3-ai-input-bar {
  display: flex; align-items: center; gap: 8px;
  margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--tv3-line);
}
.tv3-ai-icon-btn {
  width: 34px; height: 34px; border-radius: 8px; border: none;
  background: var(--tv3-bg2); color: var(--tv3-ink3); cursor: pointer;
  display: grid; place-items: center; flex-shrink: 0; transition: all 0.15s ease;
}
.tv3-ai-icon-btn:hover { background: rgba(79, 70, 229, 0.08); color: #4f46e5; }
.tv3-ai-chips { display: flex; align-items: center; gap: 6px; flex: 1; overflow-x: auto; scrollbar-width: none; }
.tv3-ai-chips::-webkit-scrollbar { display: none; }
.tv3-ai-chip {
  display: flex; align-items: center; gap: 5px; padding: 6px 12px;
  border-radius: 999px; border: none; background: var(--tv3-bg2); color: var(--tv3-ink3);
  font-size: 12px; font-weight: 500; white-space: nowrap; cursor: pointer;
  transition: all 0.15s ease; font-family: inherit;
}
.tv3-ai-chip:hover { background: rgba(79, 70, 229, 0.08); color: #4f46e5; }
.tv3-ai-send-btn {
  width: 40px; height: 40px; border-radius: 12px; border: none;
  background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%); color: #fff;
  cursor: pointer; display: grid; place-items: center; flex-shrink: 0;
  transition: all 0.15s ease; box-shadow: 0 4px 14px rgba(79, 70, 229, 0.3);
}
.tv3-ai-send-btn:hover { transform: scale(1.05); }
.tv3-ai-send-btn:active { transform: scale(0.95); }

.tv3-ai-context {
  display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 8px;
  margin-bottom: 36px; animation: tv3-ai-fade 0.7s ease-out 0.1s both;
}
.tv3-ai-ctx-pill {
  display: flex; align-items: center; gap: 5px; padding: 6px 13px;
  border-radius: 999px; border: 1px solid var(--tv3-line);
  background: rgba(255, 255, 255, 0.7); backdrop-filter: blur(8px);
  color: var(--tv3-ink3); font-size: 12px; cursor: pointer;
  transition: all 0.15s ease; font-family: inherit; white-space: nowrap;
}
.tv3-ai-ctx-pill:hover { border-color: rgba(79, 70, 229, 0.4); color: var(--tv3-ink); }

.tv3-ai-section { margin-bottom: 36px; animation: tv3-ai-fade 0.7s ease-out 0.2s both; }
.tv3-ai-section-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.tv3-ai-section-title { font-size: 17px; font-weight: 700; color: var(--tv3-ink); margin: 0; }
.tv3-ai-section-more {
  display: flex; align-items: center; gap: 3px; font-size: 12.5px;
  color: #4f46e5; text-decoration: none; font-weight: 500; transition: color 0.15s ease;
}
.tv3-ai-section-more:hover { color: #4338ca; }

.tv3-ai-rec-title { font-size: 13px; font-weight: 600; margin: 0 0 10px; color: var(--tv3-ink); }
.tv3-ai-rec-list { display: flex; flex-direction: column; gap: 9px; }
.tv3-ai-rec-item {
  display: flex; align-items: center; gap: 12px; padding: 12px 16px;
  border-radius: 12px; border: 1px solid var(--tv3-line);
  background: rgba(255, 255, 255, 0.8); backdrop-filter: blur(8px);
  text-align: left; cursor: pointer; transition: all 0.2s ease; font-family: inherit;
}
.tv3-ai-rec-item:hover {
  border-color: rgba(79, 70, 229, 0.35);
  box-shadow: 0 8px 24px -8px rgba(79, 70, 229, 0.15); transform: translateY(-1px);
}
.tv3-ai-rec-icon { width: 30px; height: 30px; border-radius: 8px; display: grid; place-items: center; flex-shrink: 0; }
.tv3-ai-rec-text { font-size: 13px; color: var(--tv3-ink); line-height: 1.5; }

.tv3-ai-cap-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
.tv3-ai-cap-card {
  display: block; padding: 18px; border-radius: 16px; border: 1px solid var(--tv3-line);
  background: rgba(255, 255, 255, 0.8); backdrop-filter: blur(8px);
  text-decoration: none; color: inherit; cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}
.tv3-ai-cap-card:hover {
  transform: translateY(-4px); border-color: rgba(79, 70, 229, 0.3);
  box-shadow: 0 16px 32px -10px rgba(79, 70, 229, 0.18), 0 8px 16px -5px rgba(6, 182, 212, 0.1);
}
.tv3-ai-cap-icon {
  width: 44px; height: 44px; border-radius: 12px; display: grid; place-items: center;
  margin-bottom: 14px; transition: transform 0.25s ease;
}
.tv3-ai-cap-card:hover .tv3-ai-cap-icon { transform: scale(1.1); }
.tv3-ai-cap-title { font-size: 14.5px; font-weight: 700; color: var(--tv3-ink); margin: 0 0 6px; }
.tv3-ai-cap-desc { font-size: 12px; color: var(--tv3-ink3); line-height: 1.6; margin: 0; }

.tv3-ai-today-card {
  border-radius: 16px; border: 1px solid var(--tv3-line);
  background: rgba(255, 255, 255, 0.8); backdrop-filter: blur(8px); padding: 20px;
}
.tv3-ai-today-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.tv3-ai-today-head-left { display: flex; align-items: baseline; gap: 12px; }
.tv3-ai-today-sub { font-size: 12px; color: var(--tv3-ink3); }
.tv3-ai-schedule-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.tv3-ai-sch-item { padding: 12px 14px; border-radius: 12px; background: var(--tv3-bg2); }
.tv3-ai-sch-item[data-status='next'] {
  background: linear-gradient(90deg, rgba(79, 70, 229, 0.08), transparent 60%);
  border: 1px solid rgba(79, 70, 229, 0.2);
}
.tv3-ai-sch-item[data-status='done'] { opacity: 0.6; }
.tv3-ai-sch-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
.tv3-ai-sch-time { font-size: 13px; font-weight: 700; color: var(--tv3-ink); font-family: var(--tv3-font-num); }
.tv3-ai-sch-tag {
  padding: 2px 8px; border-radius: 999px; font-size: 10.5px; font-weight: 600;
  background: var(--tv3-slate-soft); color: var(--tv3-slate);
}
.tv3-ai-sch-tag.is-done { background: rgba(16, 185, 129, 0.1); color: #059669; }
.tv3-ai-sch-tag.is-next { background: rgba(79, 70, 229, 0.1); color: #4f46e5; }
.tv3-ai-sch-topic {
  font-size: 13px; font-weight: 600; color: var(--tv3-ink); margin: 0 0 3px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.tv3-ai-sch-class { font-size: 11px; color: var(--tv3-ink3); margin: 0; }
.tv3-ai-sch-missing { display: flex; gap: 6px; margin-top: 8px; flex-wrap: wrap; }
.tv3-ai-mini-btn {
  padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 500;
  background: rgba(79, 70, 229, 0.1); color: #4f46e5; text-decoration: none;
  transition: background 0.15s ease;
}
.tv3-ai-mini-btn:hover { background: rgba(79, 70, 229, 0.18); }
.tv3-ai-mini-btn--warn { background: rgba(245, 158, 11, 0.1); color: #d97706; }
.tv3-ai-mini-btn--warn:hover { background: rgba(245, 158, 11, 0.18); }

.tv3-ai-todo-row {
  display: flex; align-items: center; gap: 10px; margin-top: 12px;
  padding-top: 12px; border-top: 1px solid var(--tv3-line); flex-wrap: wrap;
}
.tv3-ai-todo-label { display: flex; align-items: center; gap: 5px; font-size: 12px; color: var(--tv3-ink3); flex-shrink: 0; }
.tv3-ai-todo-chips { display: flex; gap: 6px; flex-wrap: wrap; flex: 1; }
.tv3-ai-todo-chip {
  padding: 4px 11px; border-radius: 999px; font-size: 11px; font-weight: 500;
  background: rgba(245, 158, 11, 0.1); color: #d97706;
}
.tv3-ai-todo-chip[data-kind='prep'] { background: rgba(79, 70, 229, 0.08); color: #4f46e5; }
.tv3-ai-todo-chip[data-kind='grade'] { background: rgba(239, 68, 68, 0.08); color: #dc2626; }

.tv3-ai-recent-tabs { display: flex; align-items: center; gap: 12px; }
.tv3-ai-tab-group { display: flex; gap: 2px; background: var(--tv3-bg2); border-radius: 8px; padding: 2px; }
.tv3-ai-tab-btn {
  padding: 4px 11px; border-radius: 6px; border: none; background: transparent;
  color: var(--tv3-ink3); font-size: 11.5px; font-weight: 500; cursor: pointer;
  transition: all 0.15s ease; font-family: inherit;
}
.tv3-ai-tab-btn.is-active {
  background: #fff; color: #4f46e5; font-weight: 600; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}
.tv3-ai-recent-list { display: flex; flex-direction: column; gap: 10px; }
.tv3-ai-recent-item {
  display: flex; align-items: center; gap: 14px; padding: 16px 18px;
  border-radius: 12px; border: 1px solid var(--tv3-line);
  background: rgba(255, 255, 255, 0.8); backdrop-filter: blur(8px);
  cursor: pointer; transition: all 0.2s ease;
}
.tv3-ai-recent-item:hover {
  border-color: rgba(79, 70, 229, 0.3); box-shadow: 0 8px 24px -8px rgba(79, 70, 229, 0.15);
}
.tv3-ai-recent-icon {
  width: 42px; height: 42px; border-radius: 12px; display: grid; place-items: center;
  color: #fff; flex-shrink: 0; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
.tv3-ai-recent-icon-inner { color: #fff; }
.tv3-ai-recent-main { flex: 1; min-width: 0; }
.tv3-ai-recent-title {
  font-size: 14px; font-weight: 600; color: var(--tv3-ink); margin: 0 0 5px;
  transition: color 0.15s ease;
}
.tv3-ai-recent-item:hover .tv3-ai-recent-title { color: #4f46e5; }
.tv3-ai-recent-meta { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.tv3-ai-recent-tag {
  padding: 2px 8px; border-radius: 5px; font-size: 10.5px; font-weight: 500;
  background: var(--tv3-bg2); color: var(--tv3-ink3);
}
.tv3-ai-recent-dot { color: var(--tv3-ink4); font-size: 11px; }
.tv3-ai-recent-time { font-size: 11px; color: var(--tv3-ink3); }
.tv3-ai-recent-right { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
.tv3-ai-status-tag { padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 600; }
.tv3-ai-status-tag.is-warn { background: rgba(245, 158, 11, 0.1); color: #d97706; }
.tv3-ai-status-tag.is-ok { background: rgba(16, 185, 129, 0.1); color: #059669; }
.tv3-ai-recent-arrow { color: var(--tv3-ink4); transition: all 0.15s ease; }
.tv3-ai-recent-item:hover .tv3-ai-recent-arrow { color: #4f46e5; transform: translateX(2px); }

@keyframes tv3-ai-fade {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes tv3-ai-shimmer {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
@keyframes tv3-ai-pulse {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 0.8; }
}

@media (max-width: 1100px) {
  .tv3-ai-cap-grid { grid-template-columns: repeat(2, 1fr); }
  .tv3-ai-schedule-grid { grid-template-columns: 1fr; }
}
@media (max-width: 640px) {
  .tv3-ai-welcome__title { font-size: 30px; }
  .tv3-ai-cap-grid { grid-template-columns: 1fr; }
}
</style>

