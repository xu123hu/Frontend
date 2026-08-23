<template>
  <!-- 用户右气泡 -->
  <div v-if="msg.role === 'user'" class="msg-row user">
    <div class="user-col">
      <div class="bubble user-bubble">
        <div v-if="msg.attachments?.length" class="ub-atts">
          <AttachmentThumb v-for="a in msg.attachments" :key="a.file_id || a.name" :attachment="a" />
        </div>
        <!-- 内联编辑态（M2 §4.2：textarea 保存调 edit 端点） -->
        <div v-if="editing" class="ub-edit">
          <textarea ref="editTaRef" v-model="editDraft" class="ub-edit-ta" rows="3" maxlength="4000"></textarea>
          <div class="ub-edit-btns">
            <button class="btn btn-sm ub-edit-cancel" @click="cancelEdit">取消</button>
            <button class="btn btn-sm ub-edit-save" :disabled="!editDraft.trim()" @click="saveEdit">保存并发送</button>
          </div>
        </div>
        <MarkdownView v-else :text="msg.text" />
      </div>
      <!-- 用户消息操作条（hover 显示；编辑中隐藏） -->
      <div v-if="!editing" class="msg-actions user-actions">
        <button class="act" title="复制" @click="onCopy">
          <UiIcon :name="copied ? 'check' : 'copy'" :size="14" />
        </button>
        <button class="act" title="编辑并重新发送" @click="startEdit">
          <UiIcon name="edit" :size="14" />
        </button>
        <span v-if="msg.createdAt" class="act-time">{{ fmtHm(msg.createdAt) }}</span>
      </div>
    </div>
  </div>

  <!-- AI 左气泡 -->
  <div v-else class="msg-row ai">
    <div class="ai-avatar">π</div>
    <div class="ai-col">
      <!-- 过程提示（status 事件，可折叠） -->
      <details v-if="msg.statuses.length" class="status-bar" :open="msg.status === 'streaming'">
        <summary>
          <span v-if="msg.status === 'streaming'" class="spinner"></span>
          {{ msg.statuses[msg.statuses.length - 1].text || '处理中…' }}
          <span class="sb-count">{{ msg.statuses.length }} 条过程</span>
        </summary>
        <div class="sb-list">
          <div v-for="(s, i) in msg.statuses" :key="i" class="sb-item">
            <span v-if="s.stage" class="tag gray sb-stage">{{ stageName(s.stage) }}</span>{{ s.text }}
          </div>
        </div>
      </details>

      <!-- 思考过程（M2 重构：thinking 事件流式累积，可折叠面板） -->
      <details v-if="msg.thinking" class="thinking-bar" :open="msg.status === 'streaming'">
        <summary>
          <span v-if="msg.status === 'streaming' && !msg.text" class="spinner"></span>
          🧠 模型思考过程
          <span class="sb-count">{{ Math.round((msg.thinking || '').length / 2) }} 字</span>
        </summary>
        <div class="thinking-content">{{ msg.thinking }}</div>
      </details>

      <div class="bubble ai-bubble glass-card">
        <!-- clarify 意图确认 / 附件未就绪提示 -->
        <div v-if="msg.clarify" class="clarify-box">
          <div class="clarify-q">{{ msg.clarify.question }}</div>
          <div v-if="msg.clarify.options.length" class="clarify-opts">
            <button
              v-for="(o, i) in msg.clarify.options"
              :key="i"
              class="clarify-chip"
              @click="$emit('clarify', o)"
            >
              {{ o }}
            </button>
          </div>
        </div>

        <!-- 正文 markdown：增量流式渲染（4.1；历史消息同一管线一次性渲染） -->
        <IncrementalMarkdown v-if="msg.text" :text="msg.text" :streaming="msg.status === 'streaming'" />
        <div v-if="!msg.text && !msg.clarify && msg.status === 'streaming'" class="typing">
          <span class="spinner"></span> 思考中…
        </div>

        <!-- F11 graph block -->
        <GraphBlock v-if="msg.graph" :graph="msg.graph" />

        <!-- F13 可视化讲解图形卡（figure 事件，可多次：图形随讲解步骤逐步出现） -->
        <MathFigure
          v-for="(f, fi) in msg.figures"
          :key="'fig' + fi"
          :figure="f"
          :streaming="msg.status === 'streaming'"
        />

        <!-- card 事件按类型分发 -->
        <template v-for="(c, ci) in msg.cards" :key="ci">
          <QuizSetCard
            v-if="cardType(c) === 'quiz_set'"
            :card="c"
            @enter="$emit('quizEnter', $event)"
            @explain="(...args) => $emit('quizExplain', ...args)"
            @wrong="(...args) => $emit('quizWrong', ...args)"
            @answered="(...args) => $emit('quizAnswered', ...args)"
            @more="(...args) => $emit('quizMore', ...args)"
            @chain-action="$emit('quizChainAction', $event, c)"
          />
          <div v-else-if="cardType(c) === 'socratic_hint'" class="soc-tag">
            💡 提示 · 第 {{ c.level }} 级{{ hintLevelZh(c) ? `（${hintLevelZh(c)}）` : '' }}
          </div>
          <div v-else-if="cardType(c) === 'socratic_start'" class="soc-tag">
            🧭 引导式解题 · 共 {{ c.steps_count || '?' }} 步{{ c.difficulty ? ` · 难度「${difficultyName(c.difficulty)}」` : '' }}
          </div>
          <SocraticCompleteCard
            v-else-if="cardType(c) === 'socratic_complete'"
            :card="c"
            @act="$emit('completeAction', { type: $event, card: c })"
          />
          <div v-else-if="cardType(c) === 'socratic_degraded'" class="soc-tag orange">⚠️ 引导服务降级中，按普通对话继续</div>
          <!-- socratic_confirm_answer / socratic_progress：由下方确认条/操作区承接，不重复渲染 -->
          <GenericCard v-else-if="!['socratic_confirm_answer', 'socratic_progress'].includes(cardType(c))" :card="c" />
        </template>

        <!-- 防泄题「直接看答案」二次确认条（ADR-033） -->
        <div v-if="msg.answerConfirm && !msg.confirmDismissed && msg.status === 'done'" class="confirm-bar">
          <div class="cb-text">⚠️ 直接查看答案会失去逐步引导的机会，确定要看完整解答吗？</div>
          <div class="cb-btns">
            <button class="btn btn-sm btn-danger" @click="$emit('answerConfirm', msg)">确认查看完整解答</button>
            <button class="btn btn-sm" @click="$emit('thinkMore', msg)">我再想想</button>
          </div>
        </div>

        <!-- v1.4 功能直达按钮卡（open_page action：AI 先回答确认语，用户主动点击才跳转；
             替代迭代14 的静默跳页——对齐「AI 回答 + 按钮」的主流交互） -->
        <div v-if="msg.action && msg.action.kind === 'open_page'" class="action-card">
          <button class="action-btn" @click="$emit('action', msg.action)">
            🚀 {{ msg.action.label || '立即前往' }}
          </button>
        </div>

        <!-- notice / 未知 block 占位 -->
        <div v-for="(n, i) in msg.notices" :key="'n' + i" class="notice-bar">{{ n }}</div>
        <div v-for="(b, i) in msg.unknownBlocks" :key="'u' + i" class="unknown-block">
          暂不支持的内容类型：{{ b.type || '未知' }}
        </div>

        <!-- 引用来源卡片（阶段 6B：SourceCard 展示 title/url/snippet/retrieved_at，缺失字段回退 source） -->
        <div v-if="msg.citations.length" class="citations">
          <SourceCard
            v-for="c in msg.citations"
            :key="c.n"
            :c="c"
            :open="expandedCite === c.n"
            @toggle="expandedCite = expandedCite === c.n ? 0 : c.n"
          />
        </div>

        <!-- 搜索降级提示（阶段 6B：web_search 工具降级结果透传） -->
        <div v-if="msg.degraded" class="degraded-bar">⚠️ {{ degradedText }}</div>

        <!-- 底部徽标行（tokens/耗时已挪入操作条 meta 的 title tooltip，不再常驻） -->
        <div v-if="hasFoot" class="msg-foot">
          <span v-if="msg.badge" class="tag cyan">{{ badgeText }}</span>
          <span v-if="msg.interrupted || msg.status === 'aborted'" class="tag orange">已中断</span>
          <span v-if="msg.status === 'error'" class="tag red">{{ msg.errorText || '出错了' }}</span>
        </div>
      </div>

      <!-- AI 消息操作条（M2 §4.2：复制｜重新生成｜版本导航｜👍👎｜时间戳+模型徽标） -->
      <div v-if="msg.status === 'done' || msg.status === 'aborted' || msg.status === 'error'" class="msg-actions">
        <button class="act" :title="copied ? '已复制' : '复制'" @click="onCopy">
          <UiIcon :name="copied ? 'check' : 'copy'" :size="14" />
        </button>
        <button class="act" title="重新生成" @click="$emit('regenerate', msg)">
          <UiIcon name="refresh" :size="14" />
        </button>

        <!-- 版本导航 ◀ 1/2 ▶（versions.count>1 时显示） -->
        <template v-if="msg.versions && msg.versions.count > 1">
          <button
            class="act" title="上一个版本" :disabled="msg.versions.index <= 1"
            @click="switchVersion(msg.versions.index - 1)"
          >
            <UiIcon name="chevron-left" :size="14" />
          </button>
          <span class="ver-ind">{{ msg.versions.index }}/{{ msg.versions.count }}</span>
          <button
            class="act" title="下一个版本" :disabled="msg.versions.index >= msg.versions.count"
            @click="switchVersion(msg.versions.index + 1)"
          >
            <UiIcon name="chevron-right" :size="14" />
          </button>
        </template>

        <button
          class="act" :class="{ on: msg.feedback === 'up' }" title="有帮助"
          @click="$emit('feedback', msg, 'up', '')"
        >
          <UiIcon name="thumbs-up" :size="14" />
        </button>
        <button
          class="act" :class="{ on: msg.feedback === 'down' }" title="有问题"
          @click="onThumbsDown"
        >
          <UiIcon name="thumbs-down" :size="14" />
        </button>

        <!-- hover 显现：时间戳 + 模型徽标（tokens/耗时挪进 title tooltip） -->
        <span class="act-meta" :title="metaTooltip">
          {{ fmtHm(msg.createdAt) }}<template v-if="msg.skill"> · {{ skillTitle }}</template>
        </span>

        <!-- 引导技能专属操作（会话已结束则隐藏，防止结束后动作掉状态机） -->
        <template v-if="msg.skill === 'socratic_solver' && !tutorDone">
          <button class="act hint" @click="$emit('tutorAction', 'hint')">来点提示</button>
          <button class="act hint" @click="$emit('tutorAction', 'answer')">直接看答案</button>
        </template>
      </div>

      <!-- 点踩原因弹层（M2 §4.2：reason 随 feedback 持久化） -->
      <div v-if="downOpen" class="down-pop glass-card">
        <div class="down-title">回答哪里有问题？（可不填直接提交）</div>
        <textarea
          v-model="downReason" class="down-ta" rows="2" maxlength="500"
          placeholder="如：步骤跳跃看不懂 / 答案算错了 / 公式渲染异常…"
        ></textarea>
        <div class="down-btns">
          <button class="btn btn-sm" @click="downOpen = false">取消</button>
          <button class="btn btn-primary btn-sm" @click="submitDown">提交反馈</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, ref } from 'vue'
import MarkdownView from '@/components/MarkdownView.vue'
import IncrementalMarkdown from './IncrementalMarkdown.vue'
import GraphBlock from './GraphBlock.vue'
import MathFigure from './MathFigure.vue'
import QuizSetCard from './QuizSetCard.vue'
import GenericCard from './GenericCard.vue'
import SocraticCompleteCard from './SocraticCompleteCard.vue'
import AttachmentThumb from './AttachmentThumb.vue'
import SourceCard from './SourceCard.vue'
import UiIcon from '@/components/common/UiIcon.vue'
import { HINT_LEVEL_ZH, fmtHm } from './messageModel'
import { skillByKey } from '@/config/skills'
import { difficultyName } from '@/components/student/labels'
import { copyText } from '@/utils/markdown'

const props = defineProps({
  msg: { type: Object, required: true },
})
const emit = defineEmits([
  'clarify', 'regenerate', 'feedback', 'quizEnter', 'quizExplain', 'quizWrong', 'quizAnswered', 'quizMore', 'quizChainAction', 'tutorAction',
  'answerConfirm', 'thinkMore', 'edit', 'versionSwitch', 'action', 'completeAction',
])

const expandedCite = ref(0)

// 搜索降级文案（阶段 6B）：优先透传 message，否则按 error_code 映射
const DEGRADED_ZH = {
  confirmation_required: '本地知识库未检索到相关内容，联网搜索需先授权',
}
const degradedText = computed(() => {
  const d = props.msg.degraded
  if (!d) return ''
  return d.message || DEGRADED_ZH[d.error_code] || '服务降级，已按本地知识库作答'
})

/* ===== 复制 ===== */
const copied = ref(false)
async function onCopy() {
  const ok = await copyText(props.msg.text || '')
  if (ok) {
    copied.value = true
    setTimeout(() => { copied.value = false }, 1200)
  }
}

/* ===== 用户消息内联编辑 ===== */
const editing = ref(false)
const editDraft = ref('')
const editTaRef = ref(null)
function startEdit() {
  editDraft.value = props.msg.text
  editing.value = true
  nextTick(() => editTaRef.value?.focus())
}
function cancelEdit() { editing.value = false }
function saveEdit() {
  const t = editDraft.value.trim()
  if (!t) return
  editing.value = false
  emit('edit', props.msg, t)
}

/* ===== 版本导航 ===== */
function switchVersion(newIndex) {
  const v = props.msg.versions
  if (!v || newIndex < 1 || newIndex > v.count) return
  const targetId = v.ids?.[newIndex - 1]
  if (targetId) emit('versionSwitch', props.msg, targetId)
}

/* ===== 👎 原因弹层 ===== */
const downOpen = ref(false)
const downReason = ref('')
function onThumbsDown() {
  if (props.msg.feedback === 'down') {
    emit('feedback', props.msg, 'down', '') // 再点取消点踩
    return
  }
  downReason.value = props.msg.feedbackReason || ''
  downOpen.value = !downOpen.value
}
function submitDown() {
  downOpen.value = false
  emit('feedback', props.msg, 'down', downReason.value.trim())
}

/* ===== 展示计算 ===== */
const skillTitle = computed(() => {
  try { return props.msg.skill ? skillByKey(props.msg.skill).title : '' } catch { return props.msg.skill }
})

// tokens/耗时 → 操作条 meta 的 tooltip（不再常驻小字）
const metaTooltip = computed(() => {
  const parts = []
  if (props.msg.createdAt) parts.push(fmtHm(props.msg.createdAt))
  if (props.msg.skill) parts.push(skillTitle.value)
  if (props.msg.usage) parts.push(`tokens ${props.msg.usage.tokens_in}/${props.msg.usage.tokens_out}`)
  if (props.msg.latencyMs) parts.push(`${props.msg.latencyMs}ms`)
  return parts.join(' · ')
})

const hasFoot = computed(
  () => props.msg.badge || props.msg.interrupted
    || props.msg.status === 'aborted' || props.msg.status === 'error'
)

const badgeText = computed(() => {
  const b = props.msg.badge
  if (b === 'web_supplement') return '🌐 联网补充'
  return b
})

function cardType(c) {
  return c?.type || c?.card_type || ''
}

// 引导会话已结束（消息内含 socratic_complete 完成卡）：
// 隐藏「来点提示/直接看答案」——结束后点动作会掉出状态机幻觉出题（M2.2 修复），
// 后续学习出口由完成卡按钮行（举一反三/错题本/学情，v1.4）承接
const tutorDone = computed(
  () => (props.msg.cards || []).some((c) => cardType(c) === 'socratic_complete')
)
function hintLevelZh(c) {
  return HINT_LEVEL_ZH[c.level] || ''
}

// 迭代15 L1-4：过程条 stage 英文 key 中文化（程序员词汇不暴露给学生）
const STAGE_ZH = {
  kb_search: '查题库',
  solving: '分析题目',
  guiding: '准备提问',
  generating: '生成中',
  verifying: '校验中',
  judging: '判分中',
  file: '文件解析',
}
function stageName(stage) {
  return STAGE_ZH[stage] || stage
}
</script>

<style scoped>
.msg-row { display: flex; margin-bottom: var(--space-4); }
.msg-row.user { justify-content: flex-end; }
.user-col { display: flex; flex-direction: column; align-items: flex-end; max-width: 78%; }
.bubble { max-width: 100%; padding: var(--space-3) var(--space-4); font-size: var(--text-sm); }
.user-bubble {
  background: var(--primary);
  color: #fff; border-radius: var(--radius-lg) var(--radius-lg) var(--radius-sm) var(--radius-lg);
  box-shadow: var(--shadow-sm);
}
.user-bubble :deep(.md-body) { color: #fff; }
.user-bubble :deep(.md-body code) { background: rgba(255, 255, 255, 0.18); color: #fff; }
.ub-atts { display: flex; flex-wrap: wrap; gap: var(--space-2); margin-bottom: var(--space-2); }
/* 内联编辑 */
.ub-edit-ta {
  width: 100%; min-width: 320px; border: none; outline: none; resize: vertical;
  background: rgba(255, 255, 255, 0.14); color: #fff; border-radius: var(--radius-md);
  padding: var(--space-2) var(--space-3); font-family: var(--font); font-size: var(--text-sm); line-height: 1.6;
}
.ub-edit-ta::placeholder { color: rgba(255, 255, 255, 0.6); }
.ub-edit-btns { display: flex; justify-content: flex-end; gap: var(--space-2); margin-top: var(--space-2); }
.ub-edit-cancel { background: transparent; border-color: rgba(255, 255, 255, 0.4); color: #fff; }
.ub-edit-cancel:hover { background: rgba(255, 255, 255, 0.12); color: #fff; border-color: rgba(255, 255, 255, 0.6); }
.ub-edit-save { background: #fff; border-color: #fff; color: var(--primary); }
.ub-edit-save:hover:not(:disabled) { background: var(--bg-subtle); color: var(--primary-hover); }

.msg-row.ai { justify-content: flex-start; }
.ai-avatar {
  width: 32px; height: 32px; border-radius: var(--radius-md); flex-shrink: 0; margin-right: var(--space-2);
  background: var(--primary); color: #fff;
  display: flex; align-items: center; justify-content: center; font-weight: var(--font-semibold); font-size: var(--text-sm);
  font-family: var(--font-serif);
}
.ai-col { max-width: 82%; min-width: 0; }
.ai-bubble { border-radius: var(--radius-sm) var(--radius-lg) var(--radius-lg) var(--radius-lg); padding: var(--space-3) var(--space-4); background: var(--bg-white); border: 1px solid var(--border); }
.typing { color: var(--text-muted); font-size: var(--text-sm); display: flex; align-items: center; gap: var(--space-2); }

.status-bar { margin-bottom: var(--space-2); font-size: var(--text-xs); color: var(--text-muted); }
.status-bar summary {
  cursor: pointer; display: flex; align-items: center; gap: var(--space-2); list-style: none;
  padding: var(--space-1) var(--space-3); border-radius: var(--radius-full); background: var(--bg-white);
  border: 1px solid var(--border); width: fit-content; max-width: 100%;
}
.sb-count { color: var(--primary); margin-left: var(--space-1); }
.sb-list { padding: var(--space-2) var(--space-3); display: flex; flex-direction: column; gap: var(--space-1); }
.sb-item { display: flex; align-items: center; gap: var(--space-2); }
.sb-stage { font-size: 10px; }

/* M2 重构：模型思考过程面板 */
.thinking-bar { margin-bottom: var(--space-2); font-size: var(--text-xs); color: var(--text-muted); }
.thinking-bar summary {
  cursor: pointer; display: flex; align-items: center; gap: var(--space-2); list-style: none;
  padding: var(--space-1) var(--space-3); border-radius: var(--radius-full); background: var(--bg-white);
  border: 1px dashed var(--primary-border); width: fit-content; max-width: 100%; color: var(--primary);
}
.thinking-content {
  padding: var(--space-2) var(--space-3); white-space: pre-wrap; word-break: break-word;
  font-family: var(--font); line-height: 1.7; max-height: 320px; overflow-y: auto;
  background: var(--bg-white); border: 1px dashed var(--border); border-radius: var(--radius-sm);
  margin-top: var(--space-1); color: var(--text-muted);
}

.clarify-box { margin-bottom: var(--space-2); }
.clarify-q { font-size: var(--text-sm); margin-bottom: var(--space-2); }
.clarify-opts { display: flex; flex-wrap: wrap; gap: var(--space-2); }
.clarify-chip {
  padding: var(--space-2) var(--space-4); border-radius: var(--radius-full); font-size: var(--text-xs); cursor: pointer;
  border: 1px solid var(--primary-border); color: var(--primary); background: var(--primary-subtle);
  transition: all 0.15s; font-family: var(--font);
}
.clarify-chip:hover { background: var(--primary); color: #fff; }

.soc-tag {
  margin-top: 8px; font-size: 12px; color: var(--primary); background: #EEF1FF;
  border-radius: var(--radius-sm); padding: 4px 10px; width: fit-content;
}
.soc-tag.green { color: #059669; background: #ecfdf5; }
.soc-tag.orange { color: #d97706; background: #fffbeb; }

.confirm-bar {
  margin-top: 10px; padding: 10px 12px; border-radius: var(--radius-md);
  border: 1px solid rgba(245, 158, 11, 0.4); background: #fffbeb;
}
.cb-text { font-size: 13px; color: #92400e; margin-bottom: 8px; }
.cb-btns { display: flex; gap: 8px; }

/* v1.4 功能直达按钮卡（蓝紫渐变主按钮，对齐愿景 token） */
.action-card { margin-top: 12px; display: flex; gap: 8px; }
.action-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 10px 20px; border-radius: var(--radius-md); border: none; cursor: pointer;
  background: linear-gradient(135deg, var(--primary, #5b5bd6) 0%, #7c7ce0 100%);
  color: #fff; font-size: 14px; font-weight: 600; letter-spacing: 0.02em;
  box-shadow: 0 2px 10px rgba(91, 91, 214, 0.28);
  transition: transform var(--transition-fast), box-shadow var(--transition-fast);
}
.action-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 16px rgba(91, 91, 214, 0.38); }
.action-btn:active { transform: translateY(0); }

.notice-bar {
  margin-top: 8px; font-size: 12px; color: var(--text-secondary);
  background: #f1f5f9; border-radius: var(--radius-sm); padding: 4px 10px;
}
.unknown-block {
  margin-top: 8px; font-size: 12px; color: var(--text-muted);
  background: #f1f5f9; border-radius: var(--radius-sm); padding: 4px 10px; font-style: italic;
}

.citations { margin-top: 10px; display: flex; flex-wrap: wrap; gap: 6px; }

.degraded-bar {
  margin-top: 10px; font-size: 12px; color: #92400e;
  background: var(--warn-bg); border: 1px solid var(--warn-border);
  border-radius: var(--radius-sm); padding: 6px 10px; line-height: 1.6;
}

.msg-foot { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: 10px; }

/* ===== 操作条（AI + 用户共用；hover 显现） ===== */
.msg-actions {
  display: flex; align-items: center; gap: 2px; margin-top: 4px;
  opacity: 0; transition: opacity var(--transition-fast);
}
.msg-row:hover .msg-actions, .msg-actions:focus-within { opacity: 1; }
.user-actions { justify-content: flex-end; }
.act {
  border: none; background: none; cursor: pointer; color: var(--text-muted);
  width: 26px; height: 26px; border-radius: var(--radius-sm); transition: all 0.15s;
  display: inline-flex; align-items: center; justify-content: center;
}
.act:hover:not(:disabled) { background: rgba(138, 90, 86, 0.1); color: var(--primary); }
.act:disabled { opacity: 0.35; cursor: not-allowed; }
.act.on { color: var(--primary); background: rgba(138, 90, 86, 0.12); }
.act.hint { width: auto; padding: 0 var(--space-2); font-size: 12px; color: var(--primary); font-family: var(--font); }
.ver-ind { font-size: 11px; color: var(--text-muted); padding: 0 2px; user-select: none; }
.act-time { font-size: 11px; color: var(--text-muted); padding: 0 var(--space-1); user-select: none; }
.act-meta {
  font-size: 11px; color: var(--text-muted); padding: 0 var(--space-1);
  user-select: none; cursor: default; white-space: nowrap;
}

/* 👎 原因弹层 */
.down-pop { margin-top: 6px; padding: var(--space-3); max-width: 380px; }
.down-title { font-size: var(--text-xs); color: var(--text-secondary); margin-bottom: var(--space-2); }
.down-ta {
  width: 100%; border: 1px solid var(--border); border-radius: var(--radius-md); outline: none;
  padding: var(--space-2) var(--space-3); font-family: var(--font); font-size: var(--text-xs);
  resize: vertical; background: var(--bg-white); color: var(--text-primary);
}
.down-ta:focus { border-color: var(--primary); box-shadow: 0 0 0 3px var(--primary-subtle); }
.down-btns { display: flex; justify-content: flex-end; gap: var(--space-2); margin-top: var(--space-2); }

/* 触屏无 hover：操作条常显（降低透明度代替完全隐藏） */
@media (hover: none) {
  .msg-actions { opacity: 0.75; }
}
</style>
