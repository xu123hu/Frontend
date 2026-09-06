<template>
  <div class="ph">
    <div class="ailp-blob" style="width:500px;height:500px;background:#c7d2fe;top:-150px;left:-100px"></div>
    <div class="ailp-blob" style="width:400px;height:400px;background:#a5f3fc;top:200px;right:-100px;opacity:0.3"></div>
    <div class="ailp-blob" style="width:600px;height:600px;background:#e0e7ff;bottom:-200px;left:33%;opacity:0.5"></div>

    <!-- 顶部导航（备小研） -->
    <nav class="ph-nav">
      <div class="ph-nav__brand">
        <div class="ph-nav__logo">✦</div>
        <span class="ph-nav__name">备小研 <span class="ailp-gradient-text" style="font-weight:700">AI 备课</span></span>
      </div>
      <div class="ph-nav__user">
        <span class="ph-nav__bell">🔔<i /></span>
        <div class="ph-nav__avatar">李</div>
        <span class="ph-nav__uname">李老师</span>
      </div>
    </nav>

    <main class="ph-main">
      <!-- 欢迎 -->
      <div class="ph-welcome ailp-fade">
        <p class="ph-welcome__hi">下午好，李老师 👋</p>
        <h1 class="ph-welcome__title">今天想备<span class="ailp-gradient-text">什么课</span>？</h1>
        <p class="ph-welcome__sub">告诉我课题、上传资料，AI 帮你生成完整教案</p>
      </div>

      <!-- 大输入框 -->
      <div class="ph-inputwrap ailp-fade" style="animation-delay:0.1s">
        <div class="ph-input">
          <button class="ph-input__clip" title="上传资料（进入上传资料备课）" @click="emit('nav', 'upload')">📎</button>
          <textarea
            v-model="draft" rows="1" class="ph-input__ta"
            placeholder="输入课题，例如：人教A版选修一 椭圆及其标准方程 第1课时"
            data-testid="ailp-home-input"
            @keydown.enter.prevent="submit"
          />
          <button class="ph-input__send" data-testid="ailp-home-send" :disabled="!draft.trim()" @click="submit">➤</button>
        </div>
        <div class="ph-hints">
          <span>🎤 支持语音输入</span><i />
          <span>📎 拖拽文件上传</span><i />
          <button class="ph-hints__link" @click="emit('nav', 'textbook')">📖 选择教材章节</button>
        </div>
      </div>

      <!-- 快捷四卡 -->
      <div class="ph-cards ailp-fade" style="animation-delay:0.2s">
        <button class="ph-card" data-testid="ailp-card-textbook" @click="emit('nav', 'textbook')">
          <div class="ph-card__ic ph-card__ic--primary">📖</div>
          <h3>从教材开始</h3><p>选择教材版本与章节，AI 生成教案</p>
        </button>
        <button class="ph-card" data-testid="ailp-card-upload" @click="emit('nav', 'upload')">
          <div class="ph-card__ic ph-card__ic--accent">📤</div>
          <h3>上传资料</h3><p>上传知识点资料或参考教案模板</p>
        </button>
        <button class="ph-card" data-testid="ailp-card-templates" @click="emit('nav', 'templates')">
          <div class="ph-card__ic ph-card__ic--violet">🧩</div>
          <h3>选择模板</h3><p>从教案模板库选择课型模板</p>
        </button>
        <button class="ph-card" data-testid="ailp-card-continue" @click="continueDraft">
          <div class="ph-card__ic ph-card__ic--amber">↩️</div>
          <h3>继续备课</h3><p>从最近的教案草稿继续编辑</p>
        </button>
      </div>

      <!-- 最近备课 -->
      <div class="ailp-fade" style="animation-delay:0.3s">
        <div class="ph-recent__head">
          <h2>最近备课</h2>
          <button class="ph-recent__more" @click="emit('nav', 'templates')">查看全部 →</button>
        </div>
        <div class="ph-recent">
          <button v-for="p in plans.slice(0, 4)" :key="p.id" class="ph-plan" :data-testid="`ailp-plan-${p.id}`" @click="openPlan(p)">
            <div class="ph-plan__ic">{{ p.confirmed ? '✅' : '📝' }}</div>
            <div class="ph-plan__meta">
              <h3>{{ p.topic }}</h3>
              <div class="ph-plan__tags">
                <span class="ailp-tag ailp-tag--muted">{{ className(p.class_id) }}</span>
                <span class="ailp-tag ailp-tag--primary">{{ p.lesson_type }}</span>
                <span class="ph-plan__time">{{ p.updated_at }}</span>
              </div>
            </div>
            <span class="ailp-tag" :class="p.confirmed ? 'ailp-tag--ok' : 'ailp-tag--warn'">{{ p.confirmed ? '已完成' : '草稿' }}</span>
            <span class="ph-plan__chev">›</span>
          </button>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
/**
 * PrepHome —— AI 对话首页（P，用户定稿 HTML 移植）
 * 大输入框 + 快捷四卡 + 最近备课；输入提交 = 提取课题 + 带要求进「AI 生成」。
 */
import { onMounted, ref } from 'vue'
import { v3Api, type V3PlanSummary } from '@/api/teacherV3'
import { startBrief, usePrepChain, enterEditor, gotoStage } from './prepChain'

const emit = defineEmits<{ (e: 'nav', t: 'textbook' | 'upload' | 'templates' | 'continue'): void }>()

const chain = usePrepChain()
const draft = ref('')
const plans = ref<V3PlanSummary[]>([])

function extractTopic(text: string): string {
  const book = text.match(/[《「“"]([^》」”"]+)[》」”"]/)
  if (book) return book[1]
  const first = text.split(/[，。；,;.\n]/)[0].trim()
  return first.slice(0, 30) || '未命名备课'
}

function submit() {
  const t = draft.value.trim()
  if (!t) return
  startBrief({ source: 'input', topic: extractTopic(t), requirements: [t] })
}

function className(id: string) {
  return ({ 'c2-03': '高二(3)班', 'c2-05': '高二(5)班' } as Record<string, string>)[id] || id
}

async function openPlan(p: V3PlanSummary) {
  enterEditor(p.id)
}
function continueDraft() {
  const draftPlan = plans.value.find((p) => !p.confirmed) || plans.value[0]
  if (!draftPlan) { gotoStage('textbook'); return }
  void openPlan(draftPlan)
}

onMounted(async () => {
  try {
    const r = await v3Api.plans.list()
    plans.value = r.data.items
  } catch { plans.value = [] }
})
</script>

<style scoped>
.ph { padding-bottom: 60px; }
.ph-nav { position: relative; z-index: 5; display: flex; align-items: center; justify-content: space-between; padding: 14px 32px; }
.ph-nav__brand { display: flex; align-items: center; gap: 10px; }
.ph-nav__logo { width: 38px; height: 38px; border-radius: 12px; display: grid; place-items: center; color: #fff; background: linear-gradient(135deg, #4f46e5, #06b6d4); }
.ph-nav__name { font-size: 16px; font-weight: 600; }
.ph-nav__user { display: flex; align-items: center; gap: 10px; }
.ph-nav__bell { position: relative; font-size: 15px; }
.ph-nav__bell i { position: absolute; top: -2px; right: -4px; width: 7px; height: 7px; border-radius: 50%; background: var(--ailp-error-500); }
.ph-nav__avatar { width: 34px; height: 34px; border-radius: 50%; display: grid; place-items: center; color: #fff; font-size: 13px; font-weight: 600; background: linear-gradient(135deg, #818cf8, #c084fc); }
.ph-nav__uname { font-size: 13px; font-weight: 500; }
.ph-main { position: relative; z-index: 5; max-width: 900px; margin: 0 auto; padding: 36px 24px 80px; }
.ph-welcome { text-align: center; margin-bottom: 36px; }
.ph-welcome__hi { color: var(--ailp-gray-500); margin-bottom: 10px; }
.ph-welcome__title { font-size: 42px; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 12px; }
.ph-welcome__sub { color: var(--ailp-gray-500); font-size: 16px; }
.ph-inputwrap { margin-bottom: 44px; }
.ph-input {
  display: flex; align-items: flex-start; gap: 14px; background: #fff;
  border-radius: var(--ailp-radius-2xl); padding: 18px 22px;
  border: 2px solid transparent;
  background: linear-gradient(#fff, #fff) padding-box, linear-gradient(135deg, rgba(79,70,229,0.5), rgba(6,182,212,0.5), rgba(79,70,229,0.5)) border-box;
  background-size: 100% 100%, 200% 200%;
  animation: ailp-shimmer 5s linear infinite;
  box-shadow: 0 10px 30px rgba(79, 70, 229, 0.12);
}
.ph-input__clip { flex-shrink: 0; width: 42px; height: 42px; border-radius: 12px; border: none; background: var(--ailp-gray-100); cursor: pointer; font-size: 17px; }
.ph-input__clip:hover { background: var(--ailp-primary-50); }
.ph-input__ta { flex: 1; min-height: 44px; border: none; outline: none; resize: none; font-size: 15px; font-family: inherit; color: var(--ailp-gray-900); background: transparent; padding: 9px 0; }
.ph-input__ta::placeholder { color: var(--ailp-gray-400); }
.ph-input__send { flex-shrink: 0; width: 42px; height: 42px; border-radius: 12px; border: none; color: #fff; font-size: 16px; cursor: pointer; background: linear-gradient(135deg, #4f46e5, #6366f1); transition: transform 0.15s ease; }
.ph-input__send:hover:not(:disabled) { transform: scale(1.06); }
.ph-input__send:disabled { opacity: 0.5; cursor: not-allowed; }
.ph-hints { display: flex; align-items: center; justify-content: center; gap: 14px; margin-top: 14px; font-size: 13px; color: var(--ailp-gray-500); }
.ph-hints i { width: 4px; height: 4px; border-radius: 50%; background: var(--ailp-gray-300); }
.ph-hints__link { border: none; background: none; color: var(--ailp-gray-500); font-size: 13px; cursor: pointer; padding: 0; }
.ph-hints__link:hover { color: var(--ailp-primary-600); }
.ph-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 48px; }
.ph-card { text-align: left; background: rgba(255, 255, 255, 0.85); border: 1px solid var(--ailp-gray-200); border-radius: 16px; padding: 18px; cursor: pointer; transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1); }
.ph-card:hover { transform: translateY(-4px); box-shadow: 0 18px 36px rgba(79, 70, 229, 0.14); }
.ph-card__ic { width: 44px; height: 44px; border-radius: 12px; display: grid; place-items: center; font-size: 20px; margin-bottom: 14px; }
.ph-card__ic--primary { background: rgba(79, 70, 229, 0.1); }
.ph-card__ic--accent { background: rgba(6, 182, 212, 0.1); }
.ph-card__ic--violet { background: rgba(139, 92, 246, 0.12); }
.ph-card__ic--amber { background: rgba(245, 158, 11, 0.12); }
.ph-card h3 { font-size: 14px; font-weight: 700; color: var(--ailp-gray-900); margin-bottom: 5px; }
.ph-card p { font-size: 12.5px; color: var(--ailp-gray-500); line-height: 1.6; }
.ph-recent__head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.ph-recent__head h2 { font-size: 18px; font-weight: 700; }
.ph-recent__more { border: none; background: none; color: var(--ailp-primary-600); font-size: 13px; font-weight: 600; cursor: pointer; }
.ph-recent { display: flex; flex-direction: column; gap: 10px; }
.ph-plan { display: flex; align-items: center; gap: 14px; text-align: left; background: rgba(255, 255, 255, 0.85); border: 1px solid var(--ailp-gray-200); border-radius: 14px; padding: 16px 20px; cursor: pointer; transition: all 0.2s ease; width: 100%; }
.ph-plan:hover { border-color: rgba(79, 70, 229, 0.35); box-shadow: 0 6px 18px rgba(79, 70, 229, 0.1); }
.ph-plan__ic { width: 44px; height: 44px; border-radius: 12px; display: grid; place-items: center; font-size: 19px; background: linear-gradient(135deg, var(--ailp-primary-50), var(--ailp-accent-50)); flex-shrink: 0; }
.ph-plan__meta { flex: 1; min-width: 0; }
.ph-plan__meta h3 { font-size: 14px; font-weight: 700; color: var(--ailp-gray-900); margin-bottom: 4px; }
.ph-plan__tags { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--ailp-gray-400); }
.ph-plan__chev { color: var(--ailp-gray-300); font-size: 20px; }
@media (max-width: 1100px) { .ph-cards { grid-template-columns: repeat(2, 1fr); } }
</style>
