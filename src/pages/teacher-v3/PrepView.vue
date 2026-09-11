<template>
  <!-- ================= 教案列表 ================= -->
  <div v-if="view === 'list'" data-testid="tv3-prep-list">
    <div class="tv3-hero" style="margin-bottom: 18px">
      <div style="display: flex; gap: 26px; align-items: center">
        <div style="flex: 1">
          <div class="tv3-hero__title">备课中心</div>
          <div class="tv3-hero__sub">教案模板 → 结构化环节 → 公式内联 → 一键推送课件</div>
        </div>
        <button class="tv3-btn tv3-btn--gold" data-testid="tv3-prep-new" @click="openNew">✦ AI 起草新教案</button>
      </div>
    </div>

    <div class="tv3-card">
      <div class="tv3-card__head">
        <span class="tv3-card__title">我的教案</span>
        <span class="tv3-card__sub">{{ plans.length }} 份</span>
      </div>
      <div class="tv3-card__body" style="display: flex; flex-direction: column; gap: 8px">
        <div v-for="p in plans" :key="p.id" class="tv3-row" style="cursor: pointer" @click="openPlan(p.id)">
          <span class="tv3-tag" :class="p.confirmed ? 'tv3-tag--ok' : 'tv3-tag--warn'">{{ p.confirmed ? '已确认' : '草稿' }}</span>
          <div style="flex: 1; min-width: 0">
            <div style="font-size: 14px; font-weight: 600">{{ p.topic }}</div>
            <div style="font-size: 11.5px; color: var(--tv3-ink3)">{{ className(p.class_id) }} · {{ p.lesson_type }} · {{ p.section_count }} 个环节</div>
          </div>
          <span v-if="p.confirmed" class="tv3-btn tv3-btn--sm tv3-btn--gold" @click.stop="openPush(p.id)">推送课件 →</span>
          <span style="color: var(--tv3-ink4)">›</span>
        </div>
      </div>
    </div>

    <div class="tv3-card" style="margin-top: 14px">
      <div class="tv3-card__head">
        <span class="tv3-card__title">教案模板库</span><span class="tv3-card__sub">生成前选择 · 决定环节 schema</span>
        <div class="tv3-card__spacer" />
        <button class="tv3-btn tv3-btn--sm tv3-btn--gold" data-testid="tv3-tpl-upload-open" @click="tplUploadOpen = !tplUploadOpen">⬆ 上传教案提炼我的模板</button>
      </div>
      <div class="tv3-card__body" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 10px">
        <VisualChoiceCard
          v-for="t in lessonTemplates" :key="t.id"
          kind="lesson" :sections="t.sections" :swatch="t.source === 'teacher_upload' ? { bg: '#eef2ff', primary: '#0e7490', accent: '#0891b2', light: true } : { bg: '#fff', primary: '#4f46e5', accent: '#0891b2', light: true }"
          :name="t.name" :fit="t.recommended_for" :note="t.source === 'teacher_upload' ? `${t.name} · 体检 ${t.quality_report?.score} 分` : t.style_tag"
        />
      </div>
      <!-- V3.1：上传教案 → 质量体检（反套话 + 栏目完整度）→ 提炼个人模板 -->
      <div v-if="tplUploadOpen" class="tv3-prep__upload" data-testid="tv3-tpl-upload">
        <div class="tv3-form-label">上传你的优质教案（docx / pdf，可多选）→ AI 体检，通过后提炼为「我的模板」</div>
        <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap">
          <label class="tv3-upload" style="min-height: 86px; min-width: 300px; flex: 1" data-testid="tv3-tpl-file" @dragover.prevent @drop.prevent="onTplDrop($event)">
            <input type="file" multiple accept=".docx,.doc,.pdf,.md" hidden @change="onTplPick($event)" data-testid="tv3-tpl-input" />
            <span v-if="!tplFiles.length">📎 点击或拖入 1-3 份教案（示例：公开课详案 / 往年教案）</span>
            <span v-else style="color: var(--tv3-ink2)">已选 {{ tplFiles.length }} 份：{{ tplFiles.join('、') }}</span>
          </label>
          <button class="tv3-btn tv3-btn--sm tv3-btn--gold" :disabled="!tplFiles.length || tplChecking" data-testid="tv3-tpl-check" @click="runTplCheck">
            {{ tplChecking ? '体检中…' : '✦ 质量体检（反套话 + 栏目完整度）' }}
          </button>
        </div>
        <div v-if="tplReports.length" class="tv3-prep__reports" data-testid="tv3-tpl-reports">
          <div v-for="(r, i) in tplReports" :key="r.file" class="tv3-prep__report" :class="{ 'is-rec': r.recommended }" :data-testid="`tv3-tpl-report-${i}`">
            <span class="tv3-tag" :class="r.recommended ? 'tv3-tag--ok' : 'tv3-tag--warn'">{{ r.score }} 分</span>
            <span style="font-size: 12.5px; font-weight: 600; min-width: 150px">{{ r.file }}</span>
            <span style="font-size: 11.5px; color: var(--tv3-ink3); flex: 1">
              栏目齐 {{ r.board_coverage.length }} 项{{ r.missing_boards.length ? ` · 缺 ${r.missing_boards.join('/')}` : ' · 栏目齐全' }}{{ r.cliche_hits.length ? ` · 套话 ${r.cliche_hits.length} 处` : ' · 无套话' }}
            </span>
            <button v-if="r.recommended" class="tv3-btn tv3-btn--sm tv3-btn--gold" :data-testid="`tv3-tpl-extract-${i}`" @click="extractTpl(r)">提炼为我的模板</button>
            <span v-else style="font-size: 11px; color: var(--tv3-ink4)">{{ r.suggestion }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- ================= 新建教案（V3.1 两段式：五件套 → 大纲确认 → 成稿） ================= -->
  <div v-else-if="view === 'new'" class="tv3-card" style="max-width: 1060px; margin: 0 auto" data-testid="tv3-prep-newflow">
    <div class="tv3-card__head">
      <button class="tv3-btn tv3-btn--sm" @click="backStep">← {{ step > 1 ? '上一步' : '返回' }}</button>
      <span class="tv3-card__title">AI 起草教案</span>
      <span class="tv3-tag" :class="step === 1 ? 'tv3-tag--primary' : ''">① 五件套</span>
      <span class="tv3-tag" :class="step === 2 ? 'tv3-tag--primary' : ''">② 确认大纲</span>
      <span class="tv3-tag" :class="step === 3 ? 'tv3-tag--primary' : ''">③ 逐环节起草</span>
      <div class="tv3-card__spacer" />
      <span class="tv3-tag tv3-tag--ai">AI 出草稿 · 教师逐步把关</span>
    </div>
    <div class="tv3-card__body">
      <!-- ① 五件套：课题/班级/课型 + 教材版本/章节/课时 + 模板 + 重难点/补充 + 例题来源 -->
      <div v-if="step === 1" data-testid="tv3-prep-form">
        <div class="tv3-form-label">课题 · 班级 · 课型 · 课时</div>
        <div style="display: grid; grid-template-columns: 2fr 1fr 1fr 90px 90px; gap: 8px">
          <input v-model="form.topic" class="tv3-input" placeholder="例如：双曲线及其标准方程（第1课时）" data-testid="tv3-plan-topic">
          <select v-model="form.class_id" class="tv3-input" data-testid="tv3-plan-class">
            <option v-for="c in classes" :key="c.class_id" :value="c.class_id">{{ c.name }}</option>
          </select>
          <select v-model="form.lesson_type" class="tv3-input" data-testid="tv3-plan-lessontype" @change="form.lesson_no = 1">
            <option>新授课</option><option>习题课</option><option>复习课</option><option>讲评课</option>
          </select>
          <input v-model.number="form.lesson_no" type="number" min="1" class="tv3-input" data-testid="tv3-plan-lessonno" title="课时序号">
          <select v-model.number="form.duration" class="tv3-input" data-testid="tv3-plan-duration" title="一节课时长">
            <option :value="40">40 分钟</option>
            <option :value="45">45 分钟</option>
          </select>
        </div>

        <div class="tv3-form-label" style="margin-top: 14px">教材版本 · 知识库章节（决定内容与例题范围）</div>
        <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-bottom: 6px">
          <span class="tv3-tag" :class="kbSource === 'knowledge_base' ? 'tv3-tag--ok' : 'tv3-tag--warn'" data-testid="tv3-kb-provenance">
            {{ kbSource === 'knowledge_base' ? '知识库目录 · 由上传教材生成' : '内置示例目录（未上传教材）' }}
          </span>
          <span v-if="kbRebuiltFrom" class="tv3-tag tv3-tag--primary" data-testid="tv3-kb-from">已按《{{ kbRebuiltFrom }}》重建</span>
          <div class="tv3-card__spacer" />
          <label class="tv3-btn tv3-btn--sm tv3-btn--ghost" style="cursor: pointer" data-testid="tv3-kb-rebuild-label">
            📚 上传教材，重建目录
            <input type="file" accept=".pdf,.docx,.jpg,.png" style="display: none" data-testid="tv3-kb-rebuild-file" @change="onTextbookFile">
          </label>
        </div>
        <div style="display: grid; grid-template-columns: 200px 1fr; gap: 8px">
          <select v-model="form.textbook_version" class="tv3-input" data-testid="tv3-plan-textbook" @change="form.chapter = chapterOptions[0]?.path || ''">
            <option v-for="t in textbookOptions" :key="t.name" :value="t.name">{{ t.name }}</option>
          </select>
          <select v-model="form.chapter" class="tv3-input" data-testid="tv3-plan-chapter">
            <option v-for="c in chapterOptions" :key="c.id" :value="c.path">{{ c.path }}</option>
          </select>
        </div>
        <div v-if="kbNote" style="font-size: 11.5px; color: var(--tv3-ink3); margin-top: 6px; line-height: 1.6" data-testid="tv3-kb-note">{{ kbNote }}</div>

        <div class="tv3-form-label" style="margin-top: 14px">想强调的重难点 · 补充要求 <span style="color: var(--tv3-ink4); font-weight: 400">（选填，写进生成依据）</span></div>
        <input v-model="form.key_points" class="tv3-input" placeholder="例如：突出两种标准方程的判别；学生易漏 2a>2c" data-testid="tv3-plan-keypoints">
        <input v-model="form.extra_requirements" class="tv3-input" style="margin-top: 8px" placeholder="补充要求（选填）：例如情境导入用行星轨道；只讲第 1 课时" data-testid="tv3-plan-extra">

        <div class="tv3-form-label" style="margin-top: 14px">例题来源</div>
        <div class="tv3-radio-row" style="flex-direction: row">
          <label class="tv3-radio"><input type="radio" value="bank" v-model="form.example_source" data-testid="tv3-plan-exsrc-bank" /> 题库检索优先<span class="tv3-radio__hint">先搜相似题，避免重复出题</span></label>
          <label class="tv3-radio"><input type="radio" value="ai" v-model="form.example_source" data-testid="tv3-plan-exsrc-ai" /> AI 配题<span class="tv3-radio__hint">题库不足时按重难点现配</span></label>
        </div>

        <div class="tv3-form-label" style="margin-top: 14px">教案模板（环节 schema）</div>
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 10px">
          <VisualChoiceCard
            v-for="t in lessonTemplates" :key="t.id"
            kind="lesson" :sections="t.sections" :swatch="t.source === 'teacher_upload' ? { bg: '#eef2ff', primary: '#0e7490', accent: '#0891b2', light: true } : { bg: '#fff', primary: '#4f46e5', accent: '#0891b2', light: true }"
            :selected="form.template_id === t.id" :name="t.name" :fit="t.recommended_for"
            :testid="`tv3-ltpl-${t.id}`" @select="form.template_id = t.id"
          />
        </div>
        <div style="display: flex; justify-content: flex-end; margin-top: 18px">
          <button class="tv3-btn tv3-btn--gold" :disabled="!form.topic.trim() || !form.template_id" data-testid="tv3-plan-generate" @click="genOutline">生成大纲（先确认环节与时长）→</button>
        </div>
      </div>

      <!-- ② 大纲确认：环节 / 分钟预算 / 目标草案 / 例题建议，全部可改 -->
      <div v-else-if="step === 2" data-testid="tv3-prep-outline">
        <div v-if="outlineLoading" style="display: flex; align-items: center; gap: 10px; padding: 30px 0; color: var(--tv3-ink3); font-size: 13px">
          <span class="tv3-pulse-dot" />正在依据五件套生成大纲…
        </div>
        <template v-else>
          <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-bottom: 10px">
            <span class="tv3-tag tv3-tag--primary">{{ outline.topic }}</span>
            <span class="tv3-tag">{{ form.lesson_type }} · {{ outline.duration }} 分钟</span>
            <span class="tv3-tag" :class="outlineTotal === outline.duration ? 'tv3-tag--ok' : 'tv3-tag--warn'">
              时长合计 {{ outlineTotal }} / {{ outline.duration }} 分钟{{ outlineTotal !== outline.duration ? '（超出或不足）' : '' }}
            </span>
            <div class="tv3-card__spacer" />
            <button class="tv3-btn tv3-btn--sm" data-testid="tv3-outline-add" @click="addOutlineRow">＋ 自定义环节</button>
          </div>
          <div class="tv3-prep__outline">
            <div v-for="(s, i) in outline.sections" :key="s.id" class="tv3-prep__orow" :data-testid="`tv3-outline-row-${i}`">
              <span class="tv3-step__dot">{{ i + 1 }}</span>
              <input v-model="s.name" class="tv3-input tv3-prep__orow-name" :data-testid="`tv3-outline-name-${i}`" />
              <input v-model.number="s.minutes" type="number" min="0" max="20" class="tv3-input tv3-prep__orow-min" :data-testid="`tv3-outline-min-${i}`" title="分钟预算" />
              <span style="font-size: 11.5px; color: var(--tv3-ink4)">分</span>
              <button class="tv3-btn tv3-btn--sm" :disabled="i === 0" :data-testid="`tv3-outline-up-${i}`" @click="moveOutline(i, -1)">↑</button>
              <button class="tv3-btn tv3-btn--sm" :disabled="i === outline.sections.length - 1" :data-testid="`tv3-outline-down-${i}`" @click="moveOutline(i, 1)">↓</button>
              <button class="tv3-btn tv3-btn--sm tv3-btn--ghost" :data-testid="`tv3-outline-del-${i}`" @click="outline.sections.splice(i, 1)">删</button>
              <input v-model="s.goal" class="tv3-input tv3-prep__orow-goal" placeholder="本环节目标（可改）" :data-testid="`tv3-outline-goal-${i}`" />
              <span v-if="s.example_suggestion" class="tv3-prep__orow-ex" :data-testid="`tv3-outline-ex-${i}`">{{ s.example_suggestion }}</span>
            </div>
          </div>
          <div class="tv3-prep__notes">
            <div class="tv3-form-label">生成依据（教师可核对）</div>
            <div v-for="(n, i) in outline.notes || []" :key="i" style="font-size: 11.5px; color: var(--tv3-ink3); line-height: 1.8">· {{ n }}</div>
          </div>
          <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 14px">
            <button class="tv3-btn" @click="step = 1">改五件套</button>
            <button class="tv3-btn tv3-btn--gold" data-testid="tv3-outline-confirm" @click="generate">✓ 确认大纲，开始起草</button>
          </div>
        </template>
      </div>

      <!-- ③ SSE 逐环节成稿 -->
      <div v-else data-testid="tv3-prep-gen">
        <div class="tv3-progress" style="margin-bottom: 10px"><div class="tv3-progress__bar" :style="{ width: genProgress + '%' }" /></div>
        <div style="font-size: 13px; color: var(--tv3-ink2)" data-testid="tv3-plan-genstage">{{ genStage }}</div>
        <div style="margin-top: 10px; display: flex; flex-direction: column; gap: 6px">
          <div v-for="(s, i) in genSections" :key="i" class="tv3-prep__genrow">
            <span class="tv3-step__dot is-done">{{ i + 1 }}</span>
            <span style="font-size: 13px; font-weight: 600">{{ s.name }}</span>
            <span style="font-size: 11.5px; color: var(--tv3-ink3)">{{ s.minutes }} 分钟</span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- ================= 教案编辑 ================= -->
  <div v-else-if="plan" data-testid="tv3-prep-editor">
    <div class="tv3-card" style="margin-bottom: 14px">
      <div class="tv3-card__head">
        <button class="tv3-btn tv3-btn--sm" @click="view = 'list'">← 教案库</button>
        <span class="tv3-card__title">{{ plan.topic }}</span>
        <span class="tv3-tag">{{ className(plan.class_id) }}</span>
        <span class="tv3-tag">{{ plan.lesson_type }}</span>
        <span class="tv3-tag tv3-tag--primary">{{ lessonTemplateName(plan.template_id) }}</span>
        <span v-if="confirmedCount === plan.sections.length" class="tv3-tag tv3-tag--ok">全部环节已确认</span>
        <div class="tv3-card__spacer" />
        <button class="tv3-btn tv3-btn--sm" @click="savePlan" data-testid="tv3-plan-save">保存</button>
        <button v-if="confirmedCount === plan.sections.length" class="tv3-btn tv3-btn--sm tv3-btn--gold" data-testid="tv3-plan-push" @click="openPush(plan.id)">推送课件 →</button>
        <span v-else class="tv3-tag tv3-tag--warn">确认全部环节后可推送</span>
      </div>
      <div class="tv3-card__body" style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px">
        <div>
          <div class="tv3-form-label">教学目标</div>
          <div v-for="(o, i) in plan.objectives" :key="i" class="tv3-prep__obj" v-html="renderRich(o)" />
          <div class="tv3-form-label" style="margin-top: 10px">重点难点</div>
          <div v-for="(o, i) in plan.key_points" :key="i" class="tv3-prep__obj" v-html="renderRich(o)" />
        </div>
        <div>
          <div class="tv3-form-label">板书设计</div>
          <div style="font-size: 12.5px; color: var(--tv3-ink2); line-height: 1.7">{{ plan.board_design_note }}</div>
          <div class="tv3-form-label" style="margin-top: 10px">分层作业</div>
          <div v-for="t in plan.homework_tiers" :key="t.tier" style="display: flex; gap: 8px; margin-bottom: 5px">
            <span class="tv3-tag" :class="t.tier === '基础' ? 'tv3-tag--ok' : t.tier === '挑战' ? 'tv3-tag--danger' : 'tv3-tag--warn'">{{ t.tier }}</span>
            <span style="font-size: 12.5px; flex: 1" v-html="renderRich(t.items.join('；'))" />
          </div>
          <div class="tv3-form-label" style="margin-top: 10px">参考资料</div>
          <div style="font-size: 11.5px; color: var(--tv3-ink3); line-height: 1.7">{{ plan.refs.join(' · ') }}</div>
        </div>
      </div>
    </div>

    <!-- 十板块（P3 重构：挂例题 + 反套话） -->
    <div v-for="(s, i) in plan.sections" :key="s.id" class="tv3-card tv3-prep__sec" :class="{ 'is-confirmed': s.confirmed, 'has-cliche': clicheOf(s).length }">
      <div class="tv3-card__head">
        <span class="tv3-step__dot" :class="s.confirmed ? 'is-done' : ''">{{ i + 1 }}</span>
        <span class="tv3-card__title">{{ s.name }}</span>
        <span class="tv3-tag">{{ s.minutes }} 分钟</span>
        <span v-if="clicheOf(s).length" class="tv3-tag tv3-tag--danger" data-testid="tv3-sec-cliche">反套话</span>
        <div class="tv3-card__spacer" />
        <button class="tv3-btn tv3-btn--sm" :data-testid="`tv3-sec-photo-${i}`" @click="openPhotoFill(i)">📷 拍照填充</button>
        <button v-if="attachable(s.id)" class="tv3-btn tv3-btn--sm" :data-testid="`tv3-sec-example-${i}`" @click="openExample(i)">
          ＋挂例题{{ (s.examples || []).length ? `（${s.examples!.length}）` : '' }}
        </button>
        <button class="tv3-btn tv3-btn--sm" :class="{ 'tv3-btn--primary': !s.confirmed }" :data-testid="`tv3-sec-confirm-${i}`" @click="s.confirmed = !s.confirmed">
          {{ s.confirmed ? '✓ 已确认（点击撤销）' : '确认本板块' }}
        </button>
      </div>

      <!-- 反套话预警（AI 草稿常犯：空话多、不含可检查的数学） -->
      <div v-if="clicheOf(s).length" class="tv3-prep__cliche" :data-testid="`tv3-cliche-${i}`">
        <div class="tv3-prep__cliche-title">⚠ 该板块偏「套话」：{{ clicheOf(s).length }} 处空话，未落到本课可检验行为</div>
        <ul class="tv3-prep__cliche-list"><li v-for="(h, k) in clicheOf(s)" :key="k">{{ h }}</li></ul>
        <button class="tv3-btn tv3-btn--sm tv3-btn--gold" :data-testid="`tv3-dejargon-${i}`" @click="dejargon(s)">
          ✦ 一键去套话（围绕课题重写）
        </button>
        <span style="font-size: 11px; color: var(--tv3-ink3)">会将本板块教师活动重写为具体可执行表述</span>
      </div>

      <div class="tv3-card__body" style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 14px">
        <!-- 拍照填充原图锚定（R8：原图永远在场，供对照纠错） -->
        <div v-if="s.photo" class="tv3-prep__photo" :data-testid="`tv3-sec-photo-anchor-${i}`">
          <img :src="s.photo.src" alt="拍照填充原图" class="tv3-prep__photo-thumb" />
          <div class="tv3-prep__photo-meta">
            <div class="tv3-form-label">拍照填充原图 <span style="color:var(--tv3-gold-deep)">识别结果已在下方，可改</span></div>
            <span style="font-size:11.5px;color:var(--tv3-ink3)">拍教材/往年教案页 → 三栏草稿已按本板块整理（R2：识别结果可编辑，非终稿）</span>
            <div style="display:flex;gap:6px;margin-top:6px">
              <button class="tv3-btn tv3-btn--sm" :data-testid="`tv3-sec-photo-clear-${i}`" @click="clearPhotoFill(s)">移除原图</button>
            </div>
          </div>
        </div>
        <div>
          <div class="tv3-form-label">教师活动 <span style="color: var(--tv3-gold-deep)">$..$ 写公式，编辑实时预览</span></div>
          <textarea
            v-model="s.teacher_activity" class="tv3-textarea" rows="4"
            :data-testid="`tv3-sec-teacher-${i}`"
            @focus="hotSection = i" @input="liveCliche(s)"
          />
          <div class="tv3-prep__preview" v-html="renderRich(s.teacher_activity)" />

          <!-- 挂例题：结构化题列表（答案随题挂载，可按板块控制是否随课件/任务下发） -->
          <div v-if="s.examples && s.examples.length" class="tv3-prep__examples" :data-testid="`tv3-examples-${i}`">
            <div class="tv3-form-label">{{ s.name }} · 已挂例题 {{ s.examples.length }} 道 <span style="color:var(--tv3-ink4);font-weight:400">（答案已随题入库，无需另传）</span></div>
            <div v-for="(ex, k) in s.examples" :key="ex.id" class="tv3-prep__example" :data-testid="`tv3-example-item-${k}`">
              <div style="display:flex;align-items:center;gap:6px;width:100%">
                <span class="tv3-tag tv3-tag--primary">{{ ex.label }}</span>
                <span v-if="ex.kp_name" class="tv3-tag" style="font-size:10px">{{ ex.kp_name }}</span>
                <span style="flex:1;min-width:0;font-size:12.5px" v-html="renderRich(ex.stem_latex)" />
                <span class="tv3-tag" :class="ex.difficulty === 'easy' ? 'tv3-tag--ok' : ex.difficulty === 'hard' ? 'tv3-tag--danger' : 'tv3-tag--warn'">{{ diffl(ex.difficulty) }}</span>
                <button class="tv3-btn tv3-btn--sm" :class="{ 'tv3-btn--primary': ex.include_answer !== false }" style="font-size:10.5px"
                  :title="ex.include_answer !== false ? '答案随题挂载：教师版含答案，学生侧按推送策略控制' : '本题不带答案下发'"
                  :data-testid="`tv3-example-ans-toggle-${i}-${k}`" @click="ex.include_answer = ex.include_answer === false">
                  {{ ex.include_answer !== false ? '含答案 ✓' : '不含答案' }}
                </button>
                <button class="tv3-btn tv3-btn--sm" style="font-size:10.5px" :data-testid="`tv3-example-ans-view-${i}-${k}`" @click="exAnswerOpen = exAnswerOpen === ex.id ? '' : ex.id">
                  {{ exAnswerOpen === ex.id ? '收起答案 ▴' : '看答案 ▾' }}
                </button>
                <button class="tv3-btn tv3-btn--sm" @click="s.examples!.splice(k, 1)">移除</button>
              </div>
              <div v-if="exAnswerOpen === ex.id" class="tv3-prep__ex-answer" :data-testid="`tv3-example-answer-${i}-${k}`">
                <div><b>答案：</b><span v-html="renderRich(ex.answer || '待补')" /></div>
                <div v-if="ex.analysis" style="margin-top:2px"><b>解析：</b><span v-html="renderRich(ex.analysis)" /></div>
              </div>
            </div>
          </div>
        </div>
        <div>
          <div class="tv3-form-label">学生活动</div>
          <textarea v-model="s.student_activity" class="tv3-textarea" rows="3" style="font-size: 12.5px" @input="liveCliche(s)" />
          <div class="tv3-form-label" style="margin-top: 8px">设计意图</div>
          <textarea v-model="s.design_intent" class="tv3-textarea" rows="2" style="font-size: 12.5px" @input="liveCliche(s)" />
        </div>
      </div>
    </div>

    <!-- 挂例题选择器（V3.2：分类筛选 + 按知识点分组 + 答案预览） -->
    <div v-if="exampleOpen >= 0" class="tv3-push" @click.self="exampleOpen = -1">
      <div class="tv3-card tv3-push__panel" data-testid="tv3-example-picker" style="max-width: 760px; width: 92vw">
        <div class="tv3-card__head">
          <span class="tv3-card__title">挂例题 · {{ plan.sections[exampleOpen].name }}</span>
          <span class="tv3-card__sub">按知识点分组 · 可先筛后挂 · 答案随题入库</span>
          <div class="tv3-card__spacer" />
          <button class="tv3-btn tv3-btn--sm" @click="exampleOpen = -1">×</button>
        </div>
        <div class="tv3-card__body">
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap" class="tv3-example__filters">
            <select v-model="exKpFilter" class="tv3-input" style="width:150px" data-testid="tv3-example-filter-kp">
              <option value="">全部知识点（{{ exampleCands.length }}）</option>
              <option v-for="k in exKpOptions" :key="k" :value="k">{{ k }}</option>
            </select>
            <select v-model="exTypeFilter" class="tv3-input" style="width:104px" data-testid="tv3-example-filter-type">
              <option value="">全部题型</option>
              <option value="choice">选择题</option>
              <option value="fill">填空题</option>
              <option value="solve">解答题</option>
            </select>
            <select v-model="exDiffFilter" class="tv3-input" style="width:104px" data-testid="tv3-example-filter-diff">
              <option value="">全部难度</option>
              <option value="easy">容易</option>
              <option value="medium">中等</option>
              <option value="hard">较难</option>
            </select>
            <span class="tv3-tag" data-testid="tv3-example-count">{{ exampleFiltered.length }} 道可挂</span>
          </div>
          <div style="display:flex;flex-direction:column;gap:8px;max-height:360px;overflow-y:auto;margin-top:10px">
            <div v-for="g in exampleGrouped" :key="g.name" style="display:flex;flex-direction:column;gap:6px">
              <div class="tv3-form-label" style="margin:2px 0 0" :data-testid="`tv3-example-group-${g.name}`">
                <span class="tv3-tag tv3-tag--gold" style="font-size:10.5px">{{ g.name }}</span> {{ g.items.length }} 题
              </div>
              <div v-for="cand in g.items" :key="cand.id" class="tv3-row" style="cursor:pointer;align-items:flex-start" :data-testid="`tv3-example-cand-${cand.id}`" @click="attachExample(cand)">
                <span class="tv3-tag" style="font-size:10px;flex-shrink:0;margin-top:2px">{{ typeLabelOf(cand.q_type) }}</span>
                <span class="tv3-tag" :class="cand.difficulty === 'easy' ? 'tv3-tag--ok' : cand.difficulty === 'hard' ? 'tv3-tag--danger' : 'tv3-tag--warn'" style="font-size:10px;flex-shrink:0;margin-top:2px">{{ diffl(cand.difficulty) }}</span>
                <div style="flex:1;min-width:0">
                  <div style="font-size:12.5px" v-html="renderRich(cand.stem_latex)" />
                  <div style="margin-top:4px">
                    <button class="tv3-btn tv3-btn--sm" style="font-size:10.5px" @click.stop="exAnswerOpen = exAnswerOpen === cand.id ? '' : cand.id">
                      {{ exAnswerOpen === cand.id ? '收起答案 ▴' : '看答案与解析 ▾' }}
                    </button>
                    <span v-if="cand.source" class="tv3-tag" style="font-size:10px">{{ cand.source }}</span>
                  </div>
                  <div v-if="exAnswerOpen === cand.id" class="tv3-prep__ex-answer" :data-testid="`tv3-example-cand-answer-${cand.id}`" @click.stop>
                    <div><b>答案：</b><span v-html="renderRich(cand.answer || '待补')" /></div>
                    <div v-if="cand.analysis" style="margin-top:2px"><b>解析：</b><span v-html="renderRich(cand.analysis)" /></div>
                  </div>
                </div>
                <span class="tv3-btn tv3-btn--sm tv3-btn--gold" style="flex-shrink:0">挂到本板块</span>
              </div>
            </div>
            <div v-if="!exampleFiltered.length" class="tv3-empty" style="padding:24px 0">当前筛选下没有可挂的题，可放宽筛选或扫描入库。</div>
          </div>
          <div style="display:flex;gap:6px;margin-top:12px;align-items:center">
            <button class="tv3-btn tv3-btn--sm" data-testid="tv3-example-scan" @click="scanExample">📷 扫描入库一道</button>
            <span style="font-size:11.5px;color:var(--tv3-ink3)">手写题拍照 → 识别 → 作为新例题挂入（含答案可后补）</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 拍照填充弹层 -->
    <div v-if="photoFillOpen >= 0" class="tv3-push" @click.self="closePhotoFill" data-testid="tv3-photo-fill-modal">
      <div class="tv3-card tv3-push__panel tv3-push__panel--photo" data-testid="tv3-photo-fill-panel">
        <div class="tv3-card__head">
          <span class="tv3-card__title">拍照填充 · {{ plan.sections[photoFillOpen]?.name }}</span>
          <div class="tv3-card__spacer" />
          <button class="tv3-btn tv3-btn--sm" @click="closePhotoFill">×</button>
        </div>
        <div class="tv3-card__body" style="display:flex;flex-direction:column;gap:12px">
          <div class="tv3-form-label">1. 拍摄/拖入教材页或往年教案 <span style="color:var(--tv3-ink3)">扫描增强可调</span></div>
          <div style="display:flex;gap:10px;align-items:flex-start">
            <label class="tv3-upload" data-testid="tv3-photo-fill-file" @dragover.prevent @drop.prevent="onPhotoDrop($event)">
              <input type="file" accept="image/*" hidden @change="onPhotoPick($event)" data-testid="tv3-photo-fill-input" />
              <span v-if="!photoSrc">{{ photoHint }}</span>
              <img v-else :src="enhancedSrc || photoSrc" :alt="'增强预览'" data-testid="tv3-photo-fill-preview" style="max-height:170px;border-radius:8px" />
            </label>
            <div style="display:flex;flex-direction:column;gap:6px;flex:1">
              <button class="tv3-btn tv3-btn--sm tv3-btn--ghost" data-testid="tv3-photo-fill-sample" @click="useSamplePhoto">用示例图</button>
              <div class="tv3-form-label" style="margin-top:2px">增强：亮度 / 对比度</div>
              <input type="range" class="tv3-range" :min="0" :max="30" v-model.number="photoBright" data-testid="tv3-photo-fill-bright" @input="applyEnhance" />
              <input type="range" class="tv3-range" :min="0" :max="70" v-model.number="photoContrast" data-testid="tv3-photo-fill-contrast" @input="applyEnhance" />
            </div>
          </div>

          <div class="tv3-form-label">2. 识别 → 三栏草稿（{{
            plan.sections[photoFillOpen]?.name }}，可编辑 R2）</div>
          <button class="tv3-btn tv3-btn--sm tv3-btn--gold" :disabled="!photoSrc || recognizing" data-testid="tv3-photo-fill-run" @click="runPhotoDraft">
            {{ recognizing ? '识别整理中…' : '✦ 识别并整理进三栏' }}
          </button>
          <div v-if="photoDraft" class="tv3-prep__draft" data-testid="tv3-photo-fill-draft">
            <div class="tv3-form-label">识别结果 · 允许修改后填入</div>
            <textarea v-model="photoDraft.teacher_activity" class="tv3-textarea" rows="2" data-testid="tv3-photo-fill-ta" />
            <textarea v-model="photoDraft.student_activity" class="tv3-textarea" rows="2" data-testid="tv3-photo-fill-sa" />
            <textarea v-model="photoDraft.design_intent" class="tv3-textarea" rows="2" data-testid="tv3-photo-fill-di" />
          </div>
          <div class="tv3-modal__foot">
            <button class="tv3-btn tv3-btn--sm" @click="closePhotoFill">取消</button>
            <button class="tv3-btn tv3-btn--sm tv3-btn--primary" :disabled="!photoDraft" data-testid="tv3-photo-fill-apply" @click="applyPhotoDraft">填入本板块</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 公式键盘（内联插入当前聚焦环节） -->
    <div class="tv3-card" style="position: sticky; bottom: 10px; z-index: 20">
      <div class="tv3-card__body" style="padding: 10px 12px">
        <div style="font-size: 11.5px; color: var(--tv3-ink3); margin-bottom: 6px">
          公式键盘 · 点按插入到「教师活动」（当前聚焦：{{ hotSection >= 0 ? `环节 ${hotSection + 1}` : '未聚焦' }}）
        </div>
        <MathKeyboard smart-for="conic" @insert="insertFormula" />
      </div>
    </div>

    <!-- 推送课件弹层 -->
    <div v-if="pushOpen" class="tv3-push" @click.self="pushOpen = false">
      <div class="tv3-card tv3-push__panel" data-testid="tv3-push-panel">
        <div class="tv3-card__head">
          <span class="tv3-card__title">推送为课件</span>
          <div class="tv3-card__spacer" />
          <button class="tv3-btn tv3-btn--sm" @click="pushOpen = false">×</button>
        </div>
        <div class="tv3-card__body">
          <div class="tv3-form-label">选择课件模板（环节 → 版式自动映射）</div>
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 8px">
            <VisualChoiceCard
              v-for="t in deckTemplates" :key="t.id"
              kind="deck" :swatch="t.swatch" :selected="pushTpl === t.id"
              :name="t.name" :fit="t.recommended_for"
              @select="pushTpl = t.id"
            />
          </div>

          <!-- V3.2：课堂任务 · 答案处理（挂题答案已随题入库，这里只定下发策略） -->
          <div class="tv3-prep__ans-policy" data-testid="tv3-push-ans-policy">
            <div class="tv3-form-label">课堂任务 · 答案处理 <span style="color:var(--tv3-ink4);font-weight:400">挂题共 {{ planAnswerCount }} 道，答案已随题入库，无需再手动传</span></div>
            <div class="tv3-radio-row">
              <label class="tv3-radio"><input type="radio" value="teacher" v-model="pushAnsMode" data-testid="tv3-push-ans-teacher" /> 教师版含答案页<span class="tv3-radio__hint">课件末尾附答案页，上课投影讲评用</span></label>
              <label class="tv3-radio"><input type="radio" value="submit" v-model="pushAnsMode" data-testid="tv3-push-ans-submit" /> 学生版不含答案 · 提交后自动公布<span class="tv3-radio__hint">对标主流作业平台：先完成再对答案</span></label>
              <label class="tv3-radio"><input type="radio" value="manual" v-model="pushAnsMode" data-testid="tv3-push-ans-manual" /> 学生版不含答案 · 我手动公布<span class="tv3-radio__hint">批改后在任务页点「公布答案」才可见</span></label>
            </div>
            <div style="display:flex;gap:10px;align-items:center;margin-top:8px;flex-wrap:wrap">
              <label class="tv3-upload" style="min-height:56px;max-width:260px;flex:1" data-testid="tv3-push-ans-upload">
                <input type="file" accept="image/*" hidden @change="onPushAnsPick" data-testid="tv3-push-ans-input" />
                <span v-if="!pushAnsImg" style="font-size:11.5px">📷 补传手写参考答案（选填，学生端随策略可见）</span>
                <img v-else :src="pushAnsImg" alt="手写参考答案" data-testid="tv3-push-ans-thumb" style="max-height:52px;border-radius:6px" />
              </label>
              <button v-if="pushAnsImg" class="tv3-btn tv3-btn--sm" @click="pushAnsImg = ''">移除</button>
              <span style="font-size:11px;color:var(--tv3-ink4)">每道挂题默认「含答案 ✓」，可在板块内逐题改为不含</span>
            </div>
          </div>

          <div style="display: flex; justify-content: flex-end; margin-top: 14px">
            <button class="tv3-btn tv3-btn--gold" :disabled="!pushTpl" data-testid="tv3-push-go" @click="doPush">生成课件并打开工坊</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * PrepView —— 备课中心（SPEC §6）
 * 教案模板（环节 schema）→ SSE 逐环节草稿 → 教师逐环节确认 → 推送课件（选模板）
 * 公式内联：教师活动支持 $..$，配 MathKeyboard 点按插入（老教师零 LaTeX 负担）
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { v3Api, type V3PlanSummary, type V3TextbookChapters } from '@/api/teacherV3'
import { renderRich } from '@/components/mathx/latex'
import { detectCliche, dejargonize } from '@/components/mathx/cliche'
import { enhanceSrcToDataUrl, SCAN_DEFAULTS } from '@/components/mathx/scanEnhance'
import MathKeyboard from '@/components/mathx/MathKeyboard.vue'
import VisualChoiceCard from '@/components/mathx/VisualChoiceCard.vue'
import { V3_TEN_BOARDS } from './tenBoards'
import type { V3ClassInfo, V3LessonPlan, V3LessonTemplate, V3PlanOutline, V3PlanSection, V3TemplateQualityReport, V3AttachedExample } from '@/types/teacherV3'

type View = 'list' | 'new' | 'editor'

const router = useRouter()
const view = ref<View>('list')
const step = ref(1)
const plans = ref<V3PlanSummary[]>([])
const classes = ref<V3ClassInfo[]>([])
const plan = ref<V3LessonPlan | null>(null)
const lessonTemplates = ref<V3LessonTemplate[]>([])
const textbookChapters = ref<V3TextbookChapters['textbooks']>([])
/* V3.3：教材目录由「知识库」驱动（上传教材重建），而非写死示例；可标记来源与调整 */
const kbSource = ref('preset')
const kbRebuiltFrom = ref('')
const kbNote = ref('')
const deckTemplates = ref<{ id: string; name: string; swatch: { bg: string; primary: string; accent: string; light: boolean }; recommended_for: string }[]>([])
const hotSection = ref(-1)
const pushOpen = ref(false)
const pushPlanId = ref('')
const pushTpl = ref('tpl-academic-blue')
/* V3.2：课堂任务答案策略（teacher=含答案页 / submit=提交后公布 / manual=手动公布）+ 手写参考答案补传 */
const pushAnsMode = ref<'teacher' | 'submit' | 'manual'>('submit')
const pushAnsImg = ref('')
const planAnswerCount = computed(() => plan.value?.sections.reduce((a, s) => a + (s.examples?.length ?? 0), 0) ?? 0)
function onPushAnsPick(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (!f) return
  const fr = new FileReader()
  fr.onload = () => { pushAnsImg.value = String(fr.result || '') }
  fr.readAsDataURL(f)
}
const genProgress = ref(0)
const genStage = ref('')
const genSections = ref<V3PlanSection[]>([])
let sseCtrl: { abort: () => void } | null = null

/* ============ V3.1 五件套表单（课题/班级/课型/课时 + 教材版本/章节 + 重难点/补充 + 例题来源） ============ */
const form = ref({
  topic: '双曲线及其标准方程（第1课时）',
  class_id: 'c2-05',
  lesson_type: '新授课',
  template_id: 'lt-explorer',
  textbook_version: '人教A版（2019）',
  chapter: '选择性必修一 ▸ 圆锥曲线 ▸ 双曲线',
  lesson_no: 1,
  duration: 45,
  key_points: '突出两种标准方程的判别；学生易漏焦点位置的判定',
  extra_requirements: '情境引入用行星轨道与 GPS 定位',
  example_source: 'bank' as 'bank' | 'ai',
})

const textbookOptions = computed(() => textbookChapters.value)
const chapterOptions = computed(() => textbookChapters.value.find((t) => t.name === form.value.textbook_version)?.chapters || [])

/* V3.3：上传教材 → AI 重建知识库目录（替代写死示例），后重塑章节下拉 */
async function onTextbookFile(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0]
  ;(e.target as HTMLInputElement).value = ''
  if (!f) return
  try {
    const r: { data: { textbooks: V3TextbookChapters['textbooks']; provenance?: string; rebuilt_from?: string; note?: string } } =
      await v3Api.catalog.textbookRebuild({ file: f.name, version: form.value.textbook_version })
    textbookChapters.value = r.data.textbooks
    kbSource.value = r.data.provenance || 'knowledge_base'
    kbRebuiltFrom.value = r.data.rebuilt_from || f.name
    kbNote.value = r.data.note || ''
    form.value.textbook_version = r.data.textbooks[0]?.name || form.value.textbook_version
    if (chapterOptions.value.length && !chapterOptions.value.some((c) => c.path === form.value.chapter)) form.value.chapter = chapterOptions.value[0].path
  } catch { kbNote.value = '教材重建失败，请稍后重试' }
}

/* ============ V3.1 两段式：大纲生成 → 教师确认/编辑 → SSE 成稿 ============ */
const outline = ref<V3PlanOutline>({ topic: '', duration: 45, sections: [], total_minutes: 0 })
const outlineLoading = ref(false)
const outlineTotal = computed(() => outline.value.sections.reduce((a, s) => a + (Number(s.minutes) || 0), 0))

async function genOutline() {
  step.value = 2
  outlineLoading.value = true
  outline.value = { topic: '', duration: form.value.duration, sections: [], total_minutes: 0 }
  try {
    const r = await v3Api.generation.planOutline({ ...form.value })
    outline.value = r.data
  } catch {
    outline.value = {
      topic: form.value.topic, duration: form.value.duration, total_minutes: 0,
      sections: V3_TEN_BOARDS.map((b) => ({ id: b.id, name: b.name, minutes: b.minutes, goal: '', example_suggestion: undefined })),
      notes: ['大纲生成失败，已回退十板块骨架，可手动调整'],
    }
  } finally { outlineLoading.value = false }
}
function addOutlineRow() {
  outline.value.sections.push({ id: `bd-custom-${Date.now()}`, name: '自定义环节', minutes: 3, goal: '', example_suggestion: undefined })
}
function moveOutline(i: number, dir: -1 | 1) {
  const arr = outline.value.sections
  const j = i + dir
  if (j < 0 || j >= arr.length) return
  const [row] = arr.splice(i, 1)
  arr.splice(j, 0, row)
}
function backStep() {
  if (step.value === 1) { view.value = 'list'; return }
  if (step.value === 3 && sseCtrl) { sseCtrl.abort(); sseCtrl = null }
  step.value = Math.max(1, step.value - 1)
}

/* ============ V3.1 个人模板：上传教案 → 质量体检 → 提炼「我的模板」 ============ */
const tplUploadOpen = ref(false)
const tplFiles = ref<string[]>([])
const tplChecking = ref(false)
const tplReports = ref<V3TemplateQualityReport[]>([])
function onTplPick(e: Event) {
  const fs = Array.from((e.target as HTMLInputElement).files || [])
  tplFiles.value = fs.slice(0, 3).map((f) => f.name)
}
function onTplDrop(e: DragEvent) {
  const fs = Array.from(e.dataTransfer?.files || [])
  tplFiles.value = fs.slice(0, 3).map((f) => f.name)
}
async function runTplCheck() {
  if (!tplFiles.value.length) return
  tplChecking.value = true
  try {
    const r = await v3Api.catalog.planTemplatesImport({ files: tplFiles.value })
    tplReports.value = r.data.reports
  } catch { tplReports.value = [] } finally { tplChecking.value = false }
}
async function extractTpl(r: V3TemplateQualityReport) {
  try {
    const t = await v3Api.catalog.planTemplatesExtract({ file: r.file, name: r.file.replace(/\.(docx?|pdf|md)$/i, '') })
    lessonTemplates.value.push(t.data)
    tplUploadOpen.value = false
  } catch { /* mock */ }
}

const confirmedCount = computed(() => plan.value?.sections.filter((s) => s.confirmed).length ?? 0)

/* ============ P3：十板块 · 挂例题 · 反套话 ============ */
const attachableBoards = new Set(V3_TEN_BOARDS.filter((b) => b.attachable).map((b) => b.id))
const exampleOpen = ref(-1)
const exampleCands = ref<V3AttachedExample[]>([])

const attachable = (id: string) => attachableBoards.has(id)
const diffl = (d: string) => ({ easy: '容易', medium: '中等', hard: '较难' } as Record<string, string>)[d] || d

/** 反套话：实时重算命中，供横向红条与 live 输入联动 */
function clicheOf(s: V3PlanSection): string[] {
  const hits = detectCliche([s.teacher_activity, s.student_activity, s.design_intent].filter(Boolean).join(' '))
  s.cliche_hits = hits
  s.cliche = hits.length > 0
  return hits
}
function liveCliche(s: V3PlanSection) { clicheOf(s) }

/** 一键去套话：把命中的空话换成围绕课题的可执行表述 */
function dejargon(s: V3PlanSection) {
  const t = plan.value?.topic || '本课题'
  s.teacher_activity = dejargonize(t, s.name, s.teacher_activity || '')
  s.design_intent = dejargonize(t, s.name, s.design_intent || '')
  s.cliche_hits = []
  s.cliche = false
  // 若重写后仍命中（非常规结构），如实保留提示而非隐瞒
  const rest = detectCliche([s.teacher_activity, s.design_intent].filter(Boolean).join(' '))
  if (rest.length) { s.cliche = true; s.cliche_hits = rest }
}

async function openExample(i: number) {
  exampleOpen.value = i
  exKpFilter.value = ''; exTypeFilter.value = ''; exDiffFilter.value = ''
  try {
    const r = await v3Api.catalog.quizQuestions()
    exampleCands.value = r.data.items.map((q) => ({
      id: q.id, label: '题库题', q_type: q.q_type === 'image' ? 'solve' : q.q_type,
      difficulty: q.difficulty, stem_latex: q.stem_latex, options: q.options, answer: q.answer,
      analysis: q.analysis, kp_name: q.kp_name, source: q.source,
    }))
  } catch { exampleCands.value = [] }
}
/* V3.2：候选题筛选（知识点/题型/难度）+ 按知识点分组，解决"全部堆在一起" */
const exKpFilter = ref('')
const exTypeFilter = ref('')
const exDiffFilter = ref('')
const exAnswerOpen = ref('')
const exKpOptions = computed(() => [...new Set(exampleCands.value.map((c) => c.kp_name || '未分类'))])
const exampleFiltered = computed(() => exampleCands.value.filter((c) => {
  if (exKpFilter.value && (c.kp_name || '未分类') !== exKpFilter.value) return false
  if (exTypeFilter.value && c.q_type !== exTypeFilter.value) return false
  if (exDiffFilter.value && c.difficulty !== exDiffFilter.value) return false
  return true
}))
const exampleGrouped = computed(() => {
  const map = new Map<string, V3AttachedExample[]>()
  for (const c of exampleFiltered.value) {
    const key = c.kp_name || '未分类'
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(c)
  }
  return [...map.entries()].map(([name, items]) => ({ name, items }))
})
const typeLabelOf = (t: string) => ({ choice: '选择', fill: '填空', solve: '解答' } as Record<string, string>)[t] || t
function attachExample(cand: V3AttachedExample) {
  if (!plan.value || exampleOpen.value < 0) return
  const s = plan.value.sections[exampleOpen.value]
  if (!s.examples) s.examples = []
  // 答案随题挂载（include_answer 默认 true；下发可见性由推送时的答案策略统一控制）
  s.examples.push({ ...cand, id: `ex-${Date.now()}-${s.examples.length}`, label: `挂题${s.examples.length + 1}`, include_answer: true })
  exampleOpen.value = -1
}
/** 扫描入库：手写/拍照题 → 识别 → 作为结构化例题挂入（R2：识别结果可编辑） */
async function scanExample() {
  if (!plan.value || exampleOpen.value < 0) return
  const s = plan.value.sections[exampleOpen.value]
  try {
    const r = await v3Api.recognition.photoToFormula({ src: 'scan-demo-photo' })
    if (!s.examples) s.examples = []
    s.examples.push({
      id: `ex-${Date.now()}`, label: '扫描题', q_type: 'solve', difficulty: 'medium',
      stem_latex: r.data.latex, answer: '待补', source: '拍照入库', kp_name: plan.value.topic, include_answer: true,
    })
    exampleOpen.value = -1
  } catch { /* mock */ }
}

/* ============ 教案板块拍照填充（P5）：拍页 → 增强预览 → 识别三栏草稿 → 填板块 ============ */
const photoFillOpen = ref(-1)
const photoSrc = ref('')
const enhancedSrc = ref('')
const photoBright = ref(SCAN_DEFAULTS.brightness)
const photoContrast = ref(SCAN_DEFAULTS.contrast)
const recognizing = ref(false)
const photoDraft = ref<{ teacher_activity: string; student_activity: string; design_intent: string } | null>(null)
const photoHint = ref('📷 拍摄或拖入教材页 / 往年教案')

function openPhotoFill(i: number) {
  photoFillOpen.value = i
  photoSrc.value = ''
  enhancedSrc.value = ''
  photoDraft.value = null
  photoHint.value = '📷 拍摄或拖入教材页 / 往年教案'
}
function closePhotoFill() { photoFillOpen.value = -1 }
/** 读取本地照片 → 原 + 增强预览（scanEnhance：亮/对比，对标扫描全能王） */
async function loadPhoto(dataUrl: string) {
  photoSrc.value = dataUrl
  enhancedSrc.value = ''
  photoDraft.value = null
  await applyEnhance()
}
function onPhotoPick(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const fr = new FileReader()
  fr.onload = () => void loadPhoto(String(fr.result || ''))
  fr.readAsDataURL(file)
}
async function onPhotoDrop(e: DragEvent) {
  const file = e.dataTransfer?.files?.[0]
  if (!file) return
  const fr = new FileReader()
  fr.onload = () => void loadPhoto(String(fr.result || ''))
  fr.readAsDataURL(file)
}
const SAMPLE_IMG =
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="420" height="200"%3E%3Crect width="420" height="200" fill="%23f4f6fa"/%3E%3Ctext x="20" y="40" font-size="18" fill="%23333"%3E1. 从实例归纳定义（%24%24双曲线%24%24）%3C/text%3E%3Ctext x="20" y="80" font-size="16" fill="%23555"%3E2. 规范建式与化简%3C/text%3E%3Ctext x="20" y="120" font-size="16" fill="%23555"%3E3. 限时检测自查%3C/text%3E%3C/svg%3E'
function useSamplePhoto() { void loadPhoto(SAMPLE_IMG) }
async function applyEnhance() {
  if (!photoSrc.value) return
  try {
    enhancedSrc.value = await enhanceSrcToDataUrl(photoSrc.value, { ...SCAN_DEFAULTS, brightness: photoBright.value, contrast: photoContrast.value })
  } catch { enhancedSrc.value = '' }
}
/** 识别并整理进三栏草稿（R2：可编辑，非终稿；R8：原图已在弹层保留） */
async function runPhotoDraft() {
  if (!plan.value || photoFillOpen.value < 0 || !photoSrc.value) return
  const s = plan.value.sections[photoFillOpen.value]
  recognizing.value = true
  try {
    const r = await v3Api.recognition.planPhotoDraft({
      src: enhancedSrc.value || photoSrc.value,
      board_name: s.name,
      topic: plan.value.topic,
    })
    photoDraft.value = { ...r.data }
  } catch { photoDraft.value = null }
  finally { recognizing.value = false }
}
/** 教师确认后填入三栏并锚定原图（R1 可编辑 / R5 草稿 / R8 原图在场） */
function applyPhotoDraft() {
  if (!plan.value || photoFillOpen.value < 0 || !photoDraft.value) return
  const s = plan.value.sections[photoFillOpen.value]
  s.teacher_activity = photoDraft.value.teacher_activity
  s.student_activity = photoDraft.value.student_activity
  s.design_intent = photoDraft.value.design_intent
  s.photo = { src: photoSrc.value, filled: true }
  clicheOf(s)
  closePhotoFill()
}
function clearPhotoFill(s: V3PlanSection) { s.photo = undefined }

const className = (id: string) => classes.value.find((c) => c.class_id === id)?.name || id
const lessonTemplateName = (id: string) => lessonTemplates.value.find((t) => t.id === id)?.name || id

onMounted(async () => {
  const [p, c, lt, dt, tbRes] = await Promise.all([
    v3Api.plans.list().then((r) => r.data.items).catch(() => []),
    v3Api.catalog.classes().then((r) => r.data.items).catch(() => []),
    v3Api.catalog.lessonTemplates().then((r) => r.data.items).catch(() => []),
    v3Api.catalog.deckTemplates().then((r) => r.data.items).catch(() => []),
    v3Api.catalog.textbookChapters().then((r) => r.data).catch(() => null),
  ])
  plans.value = p
  classes.value = c
  lessonTemplates.value = lt
  deckTemplates.value = dt
  textbookChapters.value = tbRes?.textbooks || []
  kbSource.value = tbRes?.provenance || 'preset'
  if (!chapterOptions.value.some((c) => c.path === form.value.chapter) && chapterOptions.value.length) form.value.chapter = chapterOptions.value[0].path
})
onBeforeUnmount(() => {
  /* 教案生成后台化：离开页面不中断 SSE——生成继续在后端跑并落库（done 落 plans 行），
     回列表页可见。只有用户点「上一步/取消」才 abort。 */
})

async function openPlan(id: string) {
  try {
    const r = await v3Api.plans.get(id)
    plan.value = r.data
    view.value = 'editor'
  } catch { /* mock */ }
}

function openNew() {
  step.value = 1
  genProgress.value = 0
  genStage.value = ''
  genSections.value = []
  outline.value = { topic: '', duration: form.value.duration, sections: [], total_minutes: 0 }
  view.value = 'new'
}

async function generate() {
  step.value = 3
  genProgress.value = 8
  genStage.value = '按已确认大纲逐环节起草…'
  genSections.value = []
  try {
    sseCtrl = v3Api.generation.plan(
      { ...form.value, outline: outline.value.sections.map(({ id, name, minutes, goal }) => ({ id, name, minutes, goal })) },
      (event, data) => {
        if (event === 'meta') { genStage.value = `课型：${data.lesson_type}${data.note ? ' · ' + data.note : ''}`; genProgress.value = 14 }
        else if (event === 'outline') { genStage.value = `环节结构：${data.sections.join(' → ')}`; genProgress.value = 24 }
        else if (event === 'section') {
          genSections.value.push(data.section)
          genProgress.value = Math.min(92, 24 + (data.index + 1) * (68 / Math.max(1, outline.value.sections.length)))
          genStage.value = `起草环节 ${data.index + 1}：${data.section.name}（${data.section.minutes} 分钟）`
        } else if (event === 'done') {
          genProgress.value = 100
          genStage.value = '草稿完成，正在打开…'
          window.setTimeout(() => openPlan(data.plan_id), 450)
        }
      },
    )
  } catch {
    genStage.value = '生成失败，请重试'
  }
}

function insertFormula(k: { latex: string }) {
  if (!plan.value || hotSection.value < 0) return
  const s = plan.value.sections[hotSection.value]
  const clean = k.latex.replace(/#0/g, 'a').replace(/#1/g, 'b')
  s.teacher_activity = `${s.teacher_activity}$${clean}$`.replace(/\$\$/g, '$')
}

async function savePlan() {
  if (!plan.value) return
  try { await v3Api.plans.patch(plan.value.id, JSON.parse(JSON.stringify(plan.value))) } catch { /* mock */ }
}

function openPush(planId: string) {
  pushPlanId.value = planId
  pushTpl.value = 'tpl-academic-blue'
  pushOpen.value = true
}

async function doPush() {
  try {
    await v3Api.plans.confirm(pushPlanId.value)
    await v3Api.plans.pushToDeck(pushPlanId.value, { template_id: pushTpl.value })
    pushOpen.value = false
    void router.push('/teacher-v3/slides')
  } catch { /* mock */ }
}
</script>

<style scoped>
.tv3-prep__obj {
  font-size: 12.5px; color: var(--tv3-ink2); line-height: 1.7;
  padding: 4px 0 4px 12px; position: relative;
}
.tv3-prep__obj::before {
  content: ''; position: absolute; left: 0; top: 12px;
  width: 5px; height: 5px; border-radius: 50%; background: var(--tv3-gold);
}
.tv3-prep__preview {
  margin-top: 8px; padding: 10px 12px; border-radius: 10px;
  background: var(--tv3-bg2); border: 1px dashed var(--tv3-line);
  font-size: 13px; line-height: 1.7; color: var(--tv3-ink);
}
.tv3-prep__sec.is-confirmed { border-color: var(--tv3-teal-border); }
.tv3-prep__sec { margin-bottom: 10px; }
.tv3-prep__sec.has-cliche { border-color: var(--tv3-rose-border, #e99); }
.tv3-prep__cliche {
  margin: 0 14px 10px; padding: 8px 12px; border-radius: 10px;
  background: linear-gradient(120deg, #fdf3f3, #ffefee); border: 1px solid #f0c9c6; color: #b1382c;
  display: flex; flex-direction: column; gap: 6px; align-items: flex-start;
}
.tv3-prep__cliche-title { font-size: 12.5px; font-weight: 700; }
.tv3-prep__cliche-list { margin: 0; padding-left: 16px; font-size: 11.5px; line-height: 1.6; color: #a34b40; }
.tv3-prep__examples { margin-top: 10px; display: flex; flex-direction: column; gap: 6px; }
.tv3-prep__example {
  display: flex; flex-direction: column; gap: 4px; padding: 7px 10px; border-radius: 10px;
  background: var(--tv3-bg2); border: 1px solid var(--tv3-line);
}
.tv3-prep__ex-answer {
  padding: 6px 10px; border-radius: 8px; background: var(--tv3-teal-soft, #e8f6f4);
  border: 1px dashed var(--tv3-teal, #0e9488); font-size: 12px; line-height: 1.7;
}
.tv3-prep__ans-policy {
  margin-top: 12px; padding: 10px 12px; border-radius: 10px;
  background: var(--tv3-gold-soft, #fdf6e3); border: 1px solid var(--tv3-gold-border, #e5c96a);
}
.tv3-example__filters { padding: 8px 10px; background: var(--tv3-bg2); border-radius: 10px; }
.tv3-prep__genrow { display: flex; align-items: center; gap: 10px; padding: 6px 8px; border-radius: 8px; background: var(--tv3-bg2); }
.tv3-prep__outline { display: flex; flex-direction: column; gap: 6px; }
.tv3-prep__orow {
  display: flex; align-items: center; gap: 8px; padding: 7px 10px;
  border: 1px solid var(--tv3-line); border-radius: 10px; background: var(--tv3-bg2);
  flex-wrap: wrap;
}
.tv3-prep__orow-name { width: 150px; font-weight: 600; }
.tv3-prep__orow-min { width: 62px; text-align: center; }
.tv3-prep__orow-goal { flex: 1; min-width: 260px; font-size: 12px; }
.tv3-prep__orow-ex {
  flex-basis: 100%; font-size: 11.5px; color: var(--tv3-gold-deep, #0e7490);
  background: var(--tv3-gold-soft); border-radius: 8px; padding: 4px 10px;
}
.tv3-prep__notes {
  margin-top: 12px; padding: 10px 14px; border-radius: 10px;
  background: var(--tv3-bg2); border: 1px dashed var(--tv3-line);
}
.tv3-prep__upload {
  margin: 10px 14px 14px; padding: 12px 14px; border-radius: 12px;
  background: var(--tv3-gold-soft); border: 1px dashed var(--tv3-gold, #0891b2);
  display: flex; flex-direction: column; gap: 10px;
}
.tv3-prep__reports { display: flex; flex-direction: column; gap: 6px; }
.tv3-prep__report {
  display: flex; align-items: center; gap: 10px; padding: 8px 12px;
  border-radius: 10px; background: #fff; border: 1px solid var(--tv3-line);
}
.tv3-prep__report.is-rec { border-color: var(--tv3-teal-border, #0e9488); box-shadow: 0 0 0 1px var(--tv3-teal-border, #0e9488); }
.tv3-prep__photo {
  grid-column: 1 / -1; display: flex; align-items: center; gap: 12px; padding: 8px 12px;
  border-radius: 10px; background: var(--tv3-bg2); border: 1px dashed var(--tv3-gold, #0891b2);
}
.tv3-prep__photo-thumb { max-height: 64px; max-width: 120px; border-radius: 6px; border: 1px solid var(--tv3-line); }
.tv3-prep__photo-meta { display: flex; flex-direction: column; align-items: flex-start; }
.tv3-prep__draft { display: flex; flex-direction: column; gap: 6px; border: 1px solid var(--tv3-line); border-radius: 10px; padding: 10px; background: var(--tv3-bg2); }
.tv3-upload {
  display: grid; place-items: center; text-align: center; font-size: 12.5px; color: var(--tv3-ink3);
  min-width: 220px; min-height: 120px; border: 1px dashed var(--tv3-line); border-radius: 10px;
  cursor: pointer; padding: 8px;
}
.tv3-range { width: 100%; accent-color: var(--tv3-gold, #0891b2); }
.tv3-push__panel--photo { width: 720px; }
.tv3-push {
  position: fixed; inset: 0; z-index: 120; background: rgba(10, 30, 58, 0.45);
  display: grid; place-items: center;
}
.tv3-push__panel { width: 780px; max-width: 94vw; max-height: 86vh; overflow-y: auto; }
</style>
