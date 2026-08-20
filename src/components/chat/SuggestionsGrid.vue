<template>
  <!-- 建议卡：首轮发送后收起为 slim 条（可点击展开），空会话默认展开 -->
  <div v-if="collapsed && !expanded" class="sugg-slim" @click="expanded = true">
    <span class="sugg-slim-text">💡 试试这些提问</span>
    <span class="sugg-slim-arrow">▸</span>
  </div>
  <div v-else class="sugg-wrap">
    <div v-if="collapsed" class="sugg-fold" @click="expanded = false">
      <span>收起建议</span><span class="sugg-slim-arrow">▾</span>
    </div>
    <div class="sugg-grid">
      <button v-for="s in suggestions" :key="s.text" class="sugg-chip" @click="$emit('pick', s)">
        {{ s.text }}
        <span v-if="s.skill" class="sugg-skill">{{ skillTag(s.skill) }}</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { skillByKey } from '@/config/skills'

const props = defineProps({
  /** 首轮发送后收起（由父级按 messages.length 驱动） */
  collapsed: { type: Boolean, default: false },
})
defineEmits(['pick']) // pick({ text, skill })：skill 为一次性技能覆盖（不改变点亮状态）

const expanded = ref(false)
// 新会话（collapsed 变 false）时重置为展开态
watch(() => props.collapsed, (v) => { if (!v) expanded.value = false })

// 建议卡：skill 命中的卡按对应技能做一次性覆盖（context.skills 下发，不改变点亮状态）
const suggestions = [
  { text: '分析我的错题规律', skill: '' },
  { text: '出一道极限练习题', skill: 'quiz_gen' },
  { text: '引导我解一道二次函数题', skill: 'socratic' },
  { text: '帮我复习三角函数公式', skill: 'kb_qa' },
  { text: '出一道导数中等难度题', skill: 'quiz_gen' },
  { text: '讲讲定积分的几何意义', skill: 'kb_qa' },
  { text: '我贴道题，帮我出几道变式巩固', skill: 'quiz_gen' },
  { text: '来一场 60 分钟全真模拟', skill: '' },
]

function skillTag(key) {
  return skillByKey(key).icon
}
</script>

<style scoped>
.sugg-grid { display: flex; flex-wrap: wrap; gap: var(--space-2); }
.sugg-chip {
  padding: var(--space-2) var(--space-4); border-radius: var(--radius-full); font-size: var(--text-xs); cursor: pointer;
  border: 1px solid var(--border); background: var(--bg-white); color: var(--text-secondary);
  transition: all var(--transition-fast); font-family: var(--font);
  display: inline-flex; align-items: center; gap: var(--space-1);
}
.sugg-chip:hover {
  border-color: var(--border-strong); color: var(--text-primary);
  background: var(--bg-subtle);
}
.sugg-skill {
  font-size: 10px; padding: 0 var(--space-1); border-radius: var(--radius-full);
  background: var(--primary-subtle); color: var(--primary);
}
/* slim 收起条 */
.sugg-slim {
  display: flex; align-items: center; justify-content: space-between;
  padding: var(--space-1) var(--space-3); margin: 0 var(--space-4) var(--space-2);
  border: 1px dashed var(--border); border-radius: var(--radius-full);
  font-size: var(--text-xs); color: var(--text-muted); cursor: pointer;
  transition: all var(--transition-fast); user-select: none;
}
.sugg-slim:hover { border-color: var(--border-strong); color: var(--text-secondary); background: var(--bg-subtle); }
.sugg-slim-arrow { font-size: 10px; }
.sugg-fold {
  display: flex; align-items: center; justify-content: flex-end; gap: 4px;
  padding: 0 var(--space-4) var(--space-1);
  font-size: 11px; color: var(--text-muted); cursor: pointer; user-select: none;
}
.sugg-fold:hover { color: var(--text-secondary); }
</style>
