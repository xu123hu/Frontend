<template>
  <div class="ailp-root" data-testid="tv3-prep-center">
    <PrepHome v-if="chain.stage === 'home'" @nav="onNav" />
    <PrepFromTextbook v-else-if="chain.stage === 'textbook'" @back="gotoStage('home')" />
    <PrepUpload v-else-if="chain.stage === 'upload'" @back="gotoStage('home')" />
    <PrepGenerating v-else-if="chain.stage === 'generating'" />
    <PrepOutlineConfirm v-else-if="chain.stage === 'outline'" @back="gotoStage('home')" />
    <PrepEditor v-else-if="chain.stage === 'editor'" @back="gotoStage('home')" />
  </div>
</template>

<script setup lang="ts">
/**
 * PrepCenterView —— 备课中心整链路（P，按用户定稿 HTML 重建；IFC-P-a）
 * 链路：对话首页 → 从教材开始 / 上传资料 / 模板库 → AI 生成 → 大纲确认 → 备课编辑器。
 * 设计语言：ailp 令牌（靛蓝/青渐变），scoped 在 .ailp-root，不影响 V3 全局体系。
 * 旧 PrepView.vue 保留未删（并行批次测试仍挂它），仅摘除路由——死代码待清理。
 * 诚实红线：AI 生成进度为演示流；上传解析置信度为演示样例（页面带标注）。
 */
import './ailp.css'
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { usePrepChain, gotoStage } from './prepChain'
import PrepHome from './PrepHome.vue'
import PrepFromTextbook from './PrepFromTextbook.vue'
import PrepUpload from './PrepUpload.vue'
import PrepGenerating from './PrepGenerating.vue'
import PrepOutlineConfirm from './PrepOutlineConfirm.vue'
import PrepEditor from './PrepEditor.vue'

const chain = usePrepChain()
const router = useRouter()

function onNav(target: 'textbook' | 'upload' | 'templates' | 'continue') {
  if (target === 'templates') { router.push('/teacher-v3/prep-templates'); return }
  if (target === 'continue') { gotoStage('textbook'); return }
  gotoStage(target)
}

onMounted(() => {
  /* 生成流程恢复：链状态为模块级（prepChain），切换页面不丢——
     保留 generating/outline（进行中/待确认大纲），只有无效态才回 home。 */
  if (chain.stage !== 'home' && chain.stage !== 'editor'
      && chain.stage !== 'generating' && chain.stage !== 'outline') gotoStage('home')
})
</script>
