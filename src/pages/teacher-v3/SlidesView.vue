<template>
  <!-- ================= 列表视图 ================= -->
  <div v-if="view === 'list'" data-testid="tv3-slides-list">
    <div class="tv3-hero" style="margin-bottom: 18px">
      <div style="display: flex; gap: 26px; align-items: center">
        <div style="flex: 1">
          <div class="tv3-hero__title">课件工坊</div>
          <div class="tv3-hero__sub">三个入口生成课件 · 生成前先选模板 · 所有数学元素结构化可编辑</div>
        </div>
        <div style="display: flex; gap: 10px">
          <button class="tv3-btn tv3-btn--gold" data-testid="tv3-entry-photo" @click="openNew('photo')">📷 拍照出课件</button>
          <button class="tv3-btn tv3-btn--ghost-ai" data-testid="tv3-entry-topic" @click="openNew('topic')">✦ 主题生成</button>
          <button class="tv3-btn" data-testid="tv3-entry-plan" @click="openNew('plan')">↗ 教案直通</button>
        </div>
      </div>
    </div>

    <div class="tv3-card">
      <div class="tv3-card__head">
        <span class="tv3-card__title">我的课件</span>
        <span class="tv3-card__sub">{{ decks.length }} 份</span>
        <div class="tv3-card__spacer" />
        <span class="tv3-tag tv3-tag--gold">原图锚定</span>
        <span class="tv3-tag tv3-tag--primary">结构化元素</span>
      </div>
      <div class="tv3-card__body" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 12px">
        <div v-for="d in decks" :key="d.id" class="tv3-qcard tv3-card" style="cursor: pointer; padding: 14px" @click="openDeck(d.id)">
          <div style="display: flex; align-items: center; gap: 8px">
            <span class="tv3-tag" :class="d.source === 'photo' ? 'tv3-tag--gold' : d.source === 'lesson-push' ? 'tv3-tag--ok' : 'tv3-tag--primary'">{{ sourceLabel(d.source) }}</span>
            <span style="font-size: 10.5px; color: var(--tv3-ink3)">{{ d.updated_at }}</span>
          </div>
          <div style="font-size: 14.5px; font-weight: 700; margin: 8px 0 4px">{{ d.title }}</div>
          <div style="font-size: 12px; color: var(--tv3-ink3)">{{ d.class_name }} · {{ d.slide_count }} 页 · 模板 {{ templateName(d.template_id) }}</div>
        </div>
      </div>
    </div>
  </div>

  <!-- ================= 新建：主题 / 拍照 / 教案直通 ================= -->
  <div v-else-if="view === 'new'" class="tv3-card" style="max-width: 1060px; margin: 0 auto" data-testid="tv3-slides-new">
    <div class="tv3-card__head">
      <button class="tv3-btn tv3-btn--sm" @click="view = 'list'">← 返回</button>
      <span class="tv3-card__title">{{ newMode === 'photo' ? '拍照出课件' : newMode === 'topic' ? '主题生成课件' : '教案直通课件' }}</span>
      <div class="tv3-card__spacer" />
      <span class="tv3-tag tv3-tag--gold">红线：AI 只出草稿，教师审定后生效</span>
    </div>

    <div class="tv3-card__body">
      <!-- 第 1 步：来源信息 -->
      <div v-if="step === 1">
        <template v-if="newMode === 'photo'">
          <div class="tv3-form-label">① 上传原题照片（学生作业 / 教辅 / 黑板）</div>
          <div
            class="tv3-photo-drop" :class="{ 'is-over': photoDragOver }"
            data-testid="tv3-photo-drop"
            @dragover.prevent="photoDragOver = true" @dragleave="photoDragOver = false" @drop.prevent="onPhotoDrop"
            @click="fileInput?.click()"
          >
            <template v-if="photos.length">
              <img v-for="(p, i) in photos" :key="i" :src="p" class="tv3-photo-thumb" alt="原题照片">
              <div class="tv3-photo-add">＋</div>
            </template>
            <template v-else>
              <div style="font-size: 34px">📷</div>
              <div style="font-size: 13.5px; font-weight: 600; margin-top: 6px">点击或拖入照片</div>
              <div style="font-size: 12px; color: var(--tv3-ink3); margin-top: 3px">原图将永久锚定在课件中，供核验对照</div>
            </template>
          </div>
          <input ref="fileInput" type="file" accept="image/*" multiple hidden @change="onFileChange">

          <div class="tv3-form-label" style="margin-top: 16px">② 识别范围</div>
          <div class="tv3-newgrid">
            <VisualChoiceCard v-for="c in scopeCards" :key="c.name" kind="photo" :swatch="c.swatch" :selected="form.scope === c.value" :name="c.name" :fit="c.fit" :note="c.note" @select="form.scope = c.value" />
          </div>

          <div class="tv3-form-label" style="margin-top: 16px">③ 生成模式</div>
          <div class="tv3-newgrid">
            <VisualChoiceCard v-for="c in modeCards" :key="c.name" kind="deck" :swatch="c.swatch" :selected="form.mode === c.value" :name="c.name" :fit="c.fit" :note="c.note" @select="form.mode = c.value" />
          </div>

          <div class="tv3-form-label" style="margin-top: 16px">④ 字号档（长解答自动分页，不缩小内容）</div>
          <div class="tv3-newgrid" style="grid-template-columns: repeat(3, 1fr)">
            <VisualChoiceCard v-for="c in fontCards" :key="c.name" kind="font" :swatch="c.swatch" :font-px="c.px" :selected="form.font_tier === c.value" :name="c.name" :note="c.note" @select="form.font_tier = c.value" />
          </div>
          <label style="display: inline-flex; gap: 7px; align-items: center; margin-top: 14px; font-size: 13px; cursor: pointer">
            <input type="checkbox" v-model="form.margin_notes" style="accent-color: var(--tv3-gold)"> 边注模式（原图旁生成可编辑边注）
          </label>
        </template>

        <template v-else-if="newMode === 'topic'">
          <div class="tv3-form-label">① 课题与班级</div>
          <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 10px">
            <input v-model="form.topic" class="tv3-input" placeholder="例如：椭圆及其标准方程（第1课时）" data-testid="tv3-topic-input">
            <select v-model="form.class_id" class="tv3-input">
              <option v-for="c in classes" :key="c.class_id" :value="c.class_id">{{ c.name }}</option>
            </select>
          </div>
        </template>

        <template v-else>
          <div class="tv3-form-label">① 选择已确认的教案（沿用环节结构）</div>
          <div v-for="p in plans" :key="p.id" class="tv3-row" :class="{ 'is-selected': form.plan_id === p.id }" style="cursor: pointer" @click="form.plan_id = p.id">
            <span class="tv3-tag" :class="p.confirmed ? 'tv3-tag--ok' : 'tv3-tag--warn'">{{ p.confirmed ? '已确认' : '草稿' }}</span>
            <div style="flex: 1">
              <div style="font-size: 13.5px; font-weight: 600">{{ p.topic }}</div>
              <div style="font-size: 11.5px; color: var(--tv3-ink3)">{{ p.lesson_type }} · {{ p.section_count }} 个环节</div>
            </div>
          </div>
        </template>

        <div style="display: flex; justify-content: flex-end; margin-top: 18px">
          <button class="tv3-btn tv3-btn--primary" :disabled="!canNext" data-testid="tv3-new-next" @click="step = 2">下一步：选择模板 →</button>
        </div>
      </div>

      <!-- 第 2 步：模板选择（自渲染样张） -->
      <div v-else-if="step === 2">
        <div class="tv3-form-label">选择课件模板 <span style="color: var(--tv3-ink4); font-weight: 400">· {{ templates.length }} 套主题可换肤 · 生成后仍可换</span></div>
        <div class="tv3-newgrid" style="grid-template-columns: repeat(auto-fill, minmax(240px, 1fr))">
          <VisualChoiceCard
            v-for="t in templates" :key="t.id"
            kind="deck" :swatch="t.swatch" :selected="form.template_id === t.id"
            :badge="t.style === 'academic' ? '荐' : ''"
            :name="t.name" :pages="[1, 2, 3, 4, 5]" :fit="t.recommended_for" :note="`覆盖 ${t.page_kinds.length} 类版式`"
            :testid="`tv3-tpl-${t.id}`"
            @select="form.template_id = t.id"
          />
        </div>
        <div style="display: flex; justify-content: space-between; margin-top: 18px">
          <button class="tv3-btn" @click="step = 1">← 上一步</button>
          <button class="tv3-btn tv3-btn--gold" :disabled="!form.template_id" data-testid="tv3-new-generate" @click="startGenerate">
            {{ newMode === 'photo' ? '开始识别并生成' : '开始生成' }}
          </button>
        </div>
      </div>

      <!-- 第 3 步：SSE 生成进度（识别块实时可见可改） -->
      <div v-else-if="step === 3" data-testid="tv3-generating">
        <div class="tv3-progress" style="margin-bottom: 14px"><div class="tv3-progress__bar" :style="{ width: genProgress + '%' }" /></div>
        <div style="font-size: 13px; color: var(--tv3-ink2); margin-bottom: 12px" data-testid="tv3-gen-stage">{{ genStage }}</div>
        <div v-if="genBlocks.length" class="tv3-recog">
          <div v-for="(b, i) in genBlocks" :key="i" class="tv3-recog__block" data-testid="tv3-recog-block">
            <span class="tv3-tag" :class="b.type === 'figure' ? 'tv3-tag--gold' : 'tv3-tag--primary'">
              {{ b.type === 'stem' ? '题干' : b.type === 'figure' ? '图形' : '解答步骤' }}
            </span>
            <div v-if="b.latex" class="tv3-recog__latex" v-html="renderLatex(b.latex)" />
            <div v-else-if="b.text" class="tv3-recog__text">{{ b.text }}</div>
            <div v-else class="tv3-recog__text" style="color: var(--tv3-ink3)">[图形区域 · 建议重建为结构化图形]</div>
            <span class="tv3-recog__conf">置信度 {{ (b.confidence * 100).toFixed(0) }}%</span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- ================= 五区编辑器 ================= -->
  <div v-else-if="view === 'editor' && deck" class="tv3-editor" data-testid="tv3-editor">
    <!-- 区① 顶栏 -->
    <div class="tv3-editor__topbar">
      <button class="tv3-btn tv3-btn--sm" data-testid="tv3-editor-back" @click="view = 'list'">← 课件库</button>
      <input v-model="deck.title" class="tv3-editor__title-input" data-testid="tv3-deck-title">
      <span class="tv3-tag" :class="deck.source === 'photo' ? 'tv3-tag--gold' : 'tv3-tag--primary'">{{ sourceLabel(deck.source) }}</span>
      <span class="tv3-tag">{{ templateName(deck.template_id) }}</span>
      <span v-if="deck.photo_context" class="tv3-tag tv3-tag--gold" title="原图已锚定">⚓ 原图 ×{{ deck.photo_context.photos }}</span>
      <div class="tv3-card__spacer" />
      <button class="tv3-btn tv3-btn--sm tv3-btn--ghost-ai" data-testid="tv3-ai-element" @click="runAiElement">✦ AI 优化本页</button>
      <button class="tv3-btn tv3-btn--sm tv3-btn--gold" data-testid="tv3-photo-insert" @click="photoOpen = true">📷 拍照插入</button>
      <button class="tv3-btn tv3-btn--sm" @click="saveDeck" data-testid="tv3-save">保存</button>
      <button class="tv3-btn tv3-btn--sm" @click="addSlide">＋ 页</button>
      <button class="tv3-btn tv3-btn--sm tv3-btn--primary" data-testid="tv3-present" @click="presenting = true">▶ 预演</button>
      <button class="tv3-btn tv3-btn--sm" @click="exportDeck">导出</button>
    </div>

    <div class="tv3-editor__main">
      <!-- 区② 大纲 -->
      <aside class="tv3-editor__outline" :style="{ width: outlineW + 'px' }">
        <div class="tv3-resizer" title="拖拽调整宽度" @mousedown="startResize($event, 'outline')" />
        <div
          v-for="(s, i) in deck.slides" :key="s.id"
          class="tv3-outline__slide" :class="{ 'is-active': i === slideIdx }"
          data-testid="tv3-outline-slide"
          @click="slideIdx = i; selectedId = ''"
        >
          <SlideCanvasV3 :slide="s" :width="146" thumb />
          <span class="tv3-outline__no">{{ i + 1 }}</span>
          <div v-if="s.anchor_bar" class="tv3-outline__anchor" :title="s.anchor_bar">⚓ 续页</div>
          <div class="tv3-outline__fillbar" :style="fillBarStyle(s)" />
          <button v-if="deck.slides.length > 1" class="tv3-outline__del" title="删除本页" @click.stop="deleteSlide(i)">×</button>
        </div>
        <button class="tv3-btn tv3-btn--sm" style="justify-content: center" @click="addSlide">＋ 新页</button>
      </aside>

      <!-- 区③ 画布 -->
      <div class="tv3-editor__canvas-wrap">
        <SlideCanvasV3
          :slide="currentSlide" :width="860" editable
          :selected-id="selectedId"
          testid="tv3-main-canvas"
          @select-element="selectedId = $event"
          @delete-element="deleteElementById"
          @move-element="onElementMoved"
          @drop-latex="onDropLatex"
        />
        <div class="tv3-editor__hint">点击元素选中 · 拖动移动 · 右上角 × 或 Delete 删除 · 图形/函数/立体图走绘图工作台</div>
      </div>

      <!-- 区④ 属性面板 -->
      <aside class="tv3-editor__props" :style="{ width: propsW + 'px' }">
        <div class="tv3-resizer" title="拖拽调整宽度" @mousedown="startResize($event, 'props')" />
        <div v-if="!selectedEl" class="tv3-props__empty">
          <div style="font-size: 30px; margin-bottom: 8px">🎛</div>
          <div>选中画布中的元素后</div>
          <div>在此编辑属性</div>
          <div style="margin-top: 12px; font-size: 11.5px; color: var(--tv3-ink3)">数学元素（公式/图形）编辑后即时重渲染，保持结构化存储</div>
        </div>

        <template v-else>
          <div class="tv3-props__head">
            <span class="tv3-tag" :class="isMathEl(selectedEl) ? 'tv3-tag--gold' : ''">{{ typeLabel(selectedEl.type) }}</span>
            <span v-if="selectedEl.teacher_confirmed" class="tv3-tag tv3-tag--ok">已确认</span>
            <div class="tv3-card__spacer" />
            <button class="tv3-btn tv3-btn--sm" @click="confirmElement">✓ 确认</button>
          </div>

          <!-- text 属性 -->
          <template v-if="selectedEl.type === 'text'">
            <div class="tv3-form-label">内容（支持 $..$ 内联公式）</div>
            <textarea v-model="(selectedEl as any).html" class="tv3-textarea" rows="4" style="font-size: 12.5px" />
            <div class="mx-slider"><span class="mx-slider__label">字号</span><input type="range" min="14" max="48" step="1" :value="(selectedEl as any).font_size" @input="(selectedEl as any).font_size = Number(($event.target as HTMLInputElement).value)"><span class="mx-slider__value">{{ (selectedEl as any).font_size }}pt</span></div>
            <div class="mx-slider"><span class="mx-slider__label">颜色</span><input type="color" :value="(selectedEl as any).color || '#16233b'" style="width: 44px; height: 26px; border: none; background: none" @input="(selectedEl as any).color = ($event.target as HTMLInputElement).value"><label style="font-size: 11.5px; display: inline-flex; gap: 4px; align-items: center; margin-left: 8px"><input type="checkbox" :checked="!!(selectedEl as any).bold" style="accent-color: var(--tv3-gold)" @change="(selectedEl as any).bold = ($event.target as HTMLInputElement).checked">加粗</label></div>
          </template>

          <!-- formula 属性：MathLive 编辑 -->
          <template v-else-if="selectedEl.type === 'formula'">
            <div class="tv3-form-label">公式（MathLive 可视化编辑 · 键盘点按或拖入结构）</div>
            <MathField ref="propsMathField" v-model="(selectedEl as any).latex" :font-size="22" testid="tv3-props-mathfield" @focus="mathFieldHot = true" @blur="mathFieldHot = false" />
            <div class="mx-slider" style="margin-top: 10px"><span class="mx-slider__label">字号</span><input type="range" min="14" max="40" step="1" :value="(selectedEl as any).font_size" @input="(selectedEl as any).font_size = Number(($event.target as HTMLInputElement).value)"><span class="mx-slider__value">{{ (selectedEl as any).font_size }}pt</span></div>
            <label style="display: inline-flex; gap: 6px; align-items: center; font-size: 12px; cursor: pointer"><input type="checkbox" :checked="!!(selectedEl as any).display" style="accent-color: var(--tv3-gold)" @change="(selectedEl as any).display = ($event.target as HTMLInputElement).checked">独立行（display）</label>
          </template>

          <!-- geometry 属性：参数滑杆 -->
          <template v-else-if="selectedEl.type === 'geometry'">
            <div class="tv3-form-label">图形参数（拖滑杆实时联动）</div>
            <div v-for="sp in geoParams(selectedEl)" :key="sp.key" class="mx-slider">
              <span class="mx-slider__label" :title="sp.label">{{ sp.label }}</span>
              <input type="range" :min="sp.min" :max="sp.max" :step="sp.step" :value="(selectedEl.params[sp.key] ?? sp.def)" @input="setGeoParam(selectedEl, sp.key, Number(($event.target as HTMLInputElement).value))">
              <span class="mx-slider__value">{{ selectedEl.params[sp.key] ?? sp.def }}</span>
            </div>
            <div v-for="tg in geoToggles(selectedEl)" :key="tg.key" class="mx-geo__toggle" style="font-size: 12px">
              <input type="checkbox" :checked="(selectedEl.toggles?.[tg.key] ?? tg.def)" style="accent-color: var(--tv3-gold)" @change="setGeoToggle(selectedEl, tg.key, ($event.target as HTMLInputElement).checked)">{{ tg.label }}
            </div>
            <div v-if="selectedEl.recipe_id" class="tv3-tag tv3-tag--gold" style="margin-top: 8px">⚙ 来自构造配方 {{ selectedEl.recipe_id }}</div>
          </template>

          <!-- image 属性：绘图配方可重开 -->
          <template v-else-if="selectedEl.type === 'image'">
            <template v-if="(selectedEl as any).draw_recipe">
              <div class="tv3-form-label">绘图配方（结构化可重开）</div>
              <div style="font-size: 12px; color: var(--tv3-ink3); margin-bottom: 10px; line-height: 1.7">
                含 {{ (selectedEl as any).draw_recipe.records.length }} 条结构化记录（画笔/直线/圆/规整图形）。<br>重开工作台可继续修改，修改后回写本元素。
              </div>
              <button class="tv3-btn tv3-btn--sm tv3-btn--gold" data-testid="tv3-reopen-draw" @click="reopenDraw(selectedEl as any)">↺ 重开绘图编辑</button>
            </template>
            <div v-else style="font-size: 12.5px; color: var(--tv3-ink3)">普通图片元素，无结构化配方。</div>
          </template>

          <!-- anchorPhoto 属性：升级链路 -->
          <template v-else-if="selectedEl.type === 'anchorPhoto'">
            <div class="tv3-form-label">原图升级（P1）</div>
            <div style="font-size: 12px; color: var(--tv3-ink3); margin-bottom: 8px">原图永久保留；升级为结构化图形后仍可对照核验。</div>
            <button class="tv3-btn tv3-btn--sm" data-testid="tv3-rebuild-btn" @click="loadRebuildCandidates">查看重建候选</button>
            <div v-for="c in rebuildCandidates" :key="c.id" class="tv3-row" style="margin-top: 6px; cursor: pointer" @click="applyRebuild(selectedEl, c)">
              <span class="tv3-tag" :class="c.passed_validation ? 'tv3-tag--ok' : 'tv3-tag--danger'">{{ c.passed_validation ? '通过校验' : '未通过' }}</span>
              <div style="flex: 1; min-width: 0">
                <div style="font-size: 12.5px; font-weight: 600">{{ presetNameOf(c.preset_id) }}</div>
                <div style="font-size: 11px; color: var(--tv3-ink3)">{{ c.match_note }}</div>
              </div>
            </div>
          </template>

          <template v-else>
            <div style="font-size: 12.5px; color: var(--tv3-ink3)">该元素类型无额外属性。</div>
          </template>

          <!-- 通用几何属性 -->
          <div class="tv3-props__geom">
            <div class="tv3-form-label">位置与尺寸（1280×720 逻辑坐标）</div>
            <div class="tv3-props__grid">
              <label>X<input type="number" class="tv3-input" :value="selectedEl.left" @change="selectedEl.left = Number(($event.target as HTMLInputElement).value)"></label>
              <label>Y<input type="number" class="tv3-input" :value="selectedEl.top" @change="selectedEl.top = Number(($event.target as HTMLInputElement).value)"></label>
              <label>W<input type="number" class="tv3-input" :value="selectedEl.width" @change="selectedEl.width = Number(($event.target as HTMLInputElement).value)"></label>
              <label>H<input type="number" class="tv3-input" :value="selectedEl.height" @change="selectedEl.height = Number(($event.target as HTMLInputElement).value)"></label>
            </div>
          </div>
          <button class="tv3-btn tv3-btn--sm" style="margin-top: 10px; color: var(--tv3-rose); border-color: var(--tv3-rose-border)" @click="deleteElement">删除元素</button>
        </template>

        <!-- AI diff 审定（R5：不覆写，逐条采纳） -->
        <div v-if="aiDiffs.length" class="tv3-props__aidiff">
          <div class="tv3-ai-badge" style="margin-bottom: 8px">AI 建议待审定</div>
          <div v-for="(d, i) in aiDiffs" :key="i" class="tv3-aidiff__item">
            <div style="font-size: 12px">{{ d.reason }}</div>
            <div class="tv3-aidiff__actions">
              <button class="tv3-btn tv3-btn--sm tv3-btn--primary" @click="adoptDiff(i)">采纳</button>
              <button class="tv3-btn tv3-btn--sm" @click="aiDiffs.splice(i, 1)">忽略</button>
            </div>
          </div>
        </div>
      </aside>
    </div>

    <!-- 区⑤ 元素坞：公式键盘 + 绘图工作台入口（几何图形统一走绘图工作台） -->
    <div class="tv3-editor__dock">
      <div class="tv3-editor__docktabs">
        <span style="font-size: 12.5px; font-weight: 700; color: var(--tv3-ink)">⌨ 公式键盘</span>
        <button class="tv3-btn tv3-btn--sm tv3-btn--gold" data-testid="tv3-open-drawboard" @click="openDrawBoard()">📐 绘图工作台</button>
        <span style="font-size: 11px; color: var(--tv3-ink3)">键盘点按插入公式，可拖到公式上包裹结构（如 √ 拖到 3 上） · 几何/函数/立体图形在绘图工作台画好插入</span>
      </div>
      <div style="padding: 0 10px 6px">
        <MathKeyboard @insert="onKbdInsert" />
      </div>
    </div>

    <!-- 预演覆盖层 -->
    <div v-if="presenting" class="tv3-present" data-testid="tv3-present-overlay">
      <div class="tv3-present__bar">
        <span style="font-weight: 700">{{ deck.title }}</span>
        <span class="tv3-tag tv3-tag--gold">放映态：图形可拖点 · 函数图参数实时联动</span>
        <div class="tv3-card__spacer" />
        <button class="tv3-btn tv3-btn--sm" @click="presentIdx = Math.max(0, presentIdx - 1)">←</button>
        <span style="font-family: var(--tv3-font-num); font-size: 13px">{{ presentIdx + 1 }} / {{ deck.slides.length }}</span>
        <button class="tv3-btn tv3-btn--sm" @click="presentIdx = Math.min(deck.slides.length - 1, presentIdx + 1)">→</button>
        <button class="tv3-btn tv3-btn--sm tv3-btn--primary" data-testid="tv3-present-exit" @click="presenting = false">退出预演</button>
      </div>
      <div class="tv3-present__stage">
        <SlideCanvasV3 :slide="deck.slides[presentIdx]" :width="1120" presenting />
      </div>
    </div>

    <!-- 绘图工作台（函数绘图 / 自由画布 / 手写公式） -->
    <DrawBoard v-model:open="drawOpen" :reopen="drawReopen" @insert="onDrawInsert" />

    <!-- 拍照插入（P2）：扫描增强 + 图片素材/公式识别/手写原样三选一 -->
    <PhotoInsertPanel v-model:open="photoOpen" @insert="onPhotoInsert" />
  </div>
</template>

<script setup lang="ts">
/**
 * SlidesView —— 课件工坊（SPEC §5 全链路）
 * 三入口：主题生成（SSE）/ 拍照出课件（SSE，原图锚定）/ 教案直通
 * 五区：顶栏 · 大纲 · 画布 · 属性面板 · 元素坞（公式键盘+绘图工作台入口）
 * 红线落实：AI 草稿待确认（teacher_confirmed）、原图锚定不可删、分页不缩内容（fill_rate 可视）
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { v3Api, type V3DeckSummary, type V3PlanSummary } from '@/api/teacherV3'
import { FIGURE_PRESETS, type FigurePresetDef } from '@/components/mathx/presets'
import { cleanPlaceholder, renderLatex } from '@/components/mathx/latex'
import SlideCanvasV3 from '@/components/teacherV3/SlideCanvasV3.vue'
import MathField from '@/components/mathx/MathField.vue'
import MathKeyboard from '@/components/mathx/MathKeyboard.vue'
import VisualChoiceCard from '@/components/mathx/VisualChoiceCard.vue'
import DrawBoard, { type DrawReopen } from '@/components/mathx/draw/DrawBoard.vue'
import PhotoInsertPanel from '@/components/mathx/PhotoInsertPanel.vue'
import type { V3DrawInsert } from '@/components/mathx/draw/drawCore'
import type { V3ClassInfo, V3Deck, V3Element, V3FigureRebuildCandidate, V3Slide } from '@/types/teacherV3'

type View = 'list' | 'new' | 'editor'

const view = ref<View>('list')
const newMode = ref<'photo' | 'topic' | 'plan'>('photo')
const step = ref(1)

const decks = ref<V3DeckSummary[]>([])
const classes = ref<V3ClassInfo[]>([])
const plans = ref<V3PlanSummary[]>([])
const deck = ref<V3Deck | null>(null)
const slideIdx = ref(0)
const selectedId = ref('')
const presenting = ref(false)
const presentIdx = ref(0)
const mathFieldHot = ref(false)

/* 大纲/属性面板宽度可拖拽（localStorage 持久化） */
const outlineW = ref(Number(localStorage.getItem('tv3-outline-w')) || 168)
const propsW = ref(Number(localStorage.getItem('tv3-props-w')) || 264)
function startResize(ev: MouseEvent, which: 'outline' | 'props') {
  ev.preventDefault()
  const startX = ev.clientX
  const startW = which === 'outline' ? outlineW.value : propsW.value
  const wRef = which === 'outline' ? outlineW : propsW
  const onMove = (e2: MouseEvent) => {
    const delta = which === 'outline' ? e2.clientX - startX : startX - e2.clientX
    wRef.value = Math.round(Math.max(which === 'outline' ? 132 : 240, Math.min(which === 'outline' ? 300 : 560, startW + delta)))
  }
  const onUp = () => {
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onUp)
    document.body.style.cursor = ''
    localStorage.setItem(which === 'outline' ? 'tv3-outline-w' : 'tv3-props-w', String(wRef.value))
  }
  document.body.style.cursor = 'col-resize'
  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp)
}
const rebuildCandidates = ref<V3FigureRebuildCandidate[]>([])
const aiDiffs = ref<{ op: string; after?: V3Element; element_id?: string; reason?: string }[]>([])

const photos = ref<string[]>([])
const photoDragOver = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const propsMathField = ref<InstanceType<typeof MathField> | null>(null)

const form = ref({
  topic: '双曲线及其标准方程（第1课时）',
  class_id: 'c2-05',
  plan_id: '',
  scope: 'stem+solution' as 'stem' | 'stem+solution' | 'stem+keypoints',
  mode: 'full-solution' as 'blank-board' | 'full-solution' | 'keypoints',
  template_id: 'tpl-academic-blue',
  font_tier: 'standard' as 'compact' | 'standard' | 'large',
  margin_notes: true,
})

const genProgress = ref(0)
const genStage = ref('')
const genBlocks = ref<{ type: string; latex?: string; text?: string; confidence: number }[]>([])
let sseCtrl: { abort: () => void } | null = null

const templates = ref<{ id: string; name: string; style: string; swatch: { bg: string; primary: string; accent: string; light: boolean }; page_kinds: string[]; recommended_for: string }[]>([])
/* V3.3：模板兜底——即使接口加载失败也始终渲染多套主题，杜绝「只有一档/空白」 */
const DECK_TEMPLATE_FALLBACK: typeof templates.value = [
  { id: 'tpl-academic-blue', name: '学术蓝·严谨版', style: 'academic', swatch: { bg: '#0f4787', primary: '#0f4787', accent: '#c99735', light: true }, page_kinds: ['cover', 'definition', 'derivation', 'example', 'summary'], recommended_for: '新授课·概念课' },
  { id: 'tpl-chalkboard', name: '黑板绿·手写感', style: 'chalkboard', swatch: { bg: '#1e3a2f', primary: '#2d5546', accent: '#e8c56a', light: false }, page_kinds: ['cover', 'derivation', 'example', 'keypoints'], recommended_for: '推导课·习题课' },
  { id: 'tpl-geometric', name: '几何灰·图纸感', style: 'geometric', swatch: { bg: '#eceff4', primary: '#37474f', accent: '#e65100', light: true }, page_kinds: ['cover', 'definition', 'variation', 'blank'], recommended_for: '立体几何·图形密集课' },
  { id: 'tpl-classic-navy', name: '经典藏青·正式', style: 'classic', swatch: { bg: '#12264d', primary: '#c2a75a', accent: '#e3c877', light: false }, page_kinds: ['cover', 'review', 'summary'], recommended_for: '公开课·示范课' },
  { id: 'tpl-minimal-white', name: '极简白·留白', style: 'minimal', swatch: { bg: '#ffffff', primary: '#23272e', accent: '#3b82c4', light: true }, page_kinds: ['cover', 'definition', 'example', 'blank'], recommended_for: '复习课·概念梳理' },
]

const scopeCards = [
  { value: 'stem', name: '仅题干', swatch: { bg: '#ffffff', primary: '#0f4787', accent: '#c99735', light: true }, fit: '课堂即讲即用', note: '只识别题目，解答教师现场写' },
  { value: 'stem+solution', name: '题干 + 解答', swatch: { bg: '#ffffff', primary: '#0f4787', accent: '#c99735', light: true }, fit: '例题精讲', note: '完整解答步骤，自动分页' },
  { value: 'stem+keypoints', name: '题干 + 关键步骤', swatch: { bg: '#ffffff', primary: '#0f4787', accent: '#c99735', light: true }, fit: '作业讲评', note: '只保留关键步骤，留白给学生' },
] as const
const modeCards = [
  { value: 'blank-board', name: '板书留白', swatch: { bg: '#1e3a2f', primary: '#2d5546', accent: '#e8c56a', light: false }, fit: '推导课', note: '只出结构与题干，过程课堂生成' },
  { value: 'full-solution', name: '完整解答', swatch: { bg: '#0a3568', primary: '#0f4787', accent: '#c99735', light: true }, fit: '自学/复习', note: '解答完整呈现，逐页展开' },
  { value: 'keypoints', name: '要点提炼', swatch: { bg: '#f4f4f2', primary: '#37474f', accent: '#e65100', light: true }, fit: '讲评课', note: '错因+关键步骤卡片' },
] as const
const fontCards = [
  { value: 'compact', px: 18, name: '紧凑档', swatch: { bg: '#ffffff', primary: '#37474f', accent: '#0e9488', light: true }, note: '信息密度高，教室后排慎用' },
  { value: 'standard', px: 22, name: '标准档', swatch: { bg: '#ffffff', primary: '#0f4787', accent: '#c99735', light: true }, note: '推荐：一般教室' },
  { value: 'large', px: 26, name: '大字号', swatch: { bg: '#ffffff', primary: '#b45309', accent: '#dc2646', light: true }, note: '阶梯教室 / 视力关注班级' },
] as const

const currentSlide = computed<V3Slide>(() => deck.value?.slides[slideIdx.value] ?? { id: 'empty', layout: 'blank', elements: [] })
const selectedEl = computed<V3Element | null>(() => currentSlide.value.elements.find((e) => e.id === selectedId.value) ?? null)

const canNext = computed(() => {
  if (newMode.value === 'photo') return photos.value.length > 0
  if (newMode.value === 'topic') return form.value.topic.trim().length > 1
  return !!form.value.plan_id
})

/* ---------- 工具 ---------- */
const sourceLabel = (s: string) => (s === 'photo' ? '拍照生成' : s === 'lesson-push' ? '教案直通' : s === 'review-notes' ? '讲评笔记' : '主题生成')
const templateName = (id: string) => templates.value.find((t) => t.id === id)?.name || id
const typeLabel = (t: string) => ({ text: '文本', formula: '公式', geometry: '几何图形', functionPlot: '函数图像', dynamicDemo: '动态演示', image: '图片', anchorPhoto: '原图锚定', pageNo: '页码' } as Record<string, string>)[t] || t
const isMathEl = (e: V3Element) => ['formula', 'geometry', 'functionPlot', 'dynamicDemo'].includes(e.type)
const presetNameOf = (id?: string) => FIGURE_PRESETS.find((p) => p.id === id)?.name || '自定义构造'

const geoParams = (e: Extract<V3Element, { type: 'geometry' }>) => FIGURE_PRESETS.find((p) => p.id === e.preset_id)?.params || []
const geoToggles = (e: Extract<V3Element, { type: 'geometry' }>) => FIGURE_PRESETS.find((p) => p.id === e.preset_id)?.toggles || []
function setGeoParam(e: Extract<V3Element, { type: 'geometry' }>, key: string, v: number) { e.params = { ...e.params, [key]: v } }
function setGeoToggle(e: Extract<V3Element, { type: 'geometry' }>, key: string, v: boolean) { e.toggles = { ...(e.toggles || {}), [key]: v } }

function defaultParams(p: FigurePresetDef) {
  const o: Record<string, number> = {}
  for (const sp of p.params) o[sp.key] = sp.def
  return o
}
function fillBarStyle(s: V3Slide) {
  const r = s.fill_rate ?? 0.5
  return { width: `${Math.round(r * 100)}%`, background: r > 0.92 ? 'var(--tv3-rose)' : r > 0.6 ? 'var(--tv3-teal)' : 'var(--tv3-amber)' }
}

/* ---------- 数据加载 ---------- */
onMounted(async () => {
  const [d, c, p, t] = await Promise.all([
    v3Api.decks.list().then((r) => r.data.items).catch(() => []),
    v3Api.catalog.classes().then((r) => r.data.items).catch(() => []),
    v3Api.plans.list().then((r) => r.data.items).catch(() => []),
    v3Api.catalog.deckTemplates().then((r) => r.data.items).catch(() => []),
  ])
  decks.value = d
  classes.value = c
  plans.value = p
  templates.value = (t && t.length ? t : DECK_TEMPLATE_FALLBACK) as typeof templates.value
})

async function openDeck(id: string) {
  try {
    const r = await v3Api.decks.get(id)
    deck.value = r.data
    slideIdx.value = 0
    selectedId.value = ''
    view.value = 'editor'
  } catch { /* mock 不可用 */ }
}

/* ---------- 新建流程 ---------- */
function openNew(mode: 'photo' | 'topic' | 'plan') {
  newMode.value = mode
  step.value = 1
  genProgress.value = 0
  genStage.value = ''
  genBlocks.value = []
  view.value = 'new'
}

function onFileChange(ev: Event) {
  const files = (ev.target as HTMLInputElement).files
  if (!files) return
  void readPhotos(files)
}
function onPhotoDrop(ev: DragEvent) {
  photoDragOver.value = false
  const files = ev.dataTransfer?.files
  if (files?.length) void readPhotos(files)
}
function readPhotos(files: FileList) {
  const imgs = [...files].filter((f) => f.type.startsWith('image/')).slice(0, 6)
  for (const f of imgs) {
    const rd = new FileReader()
    rd.onload = () => { if (typeof rd.result === 'string') photos.value.push(rd.result) }
    rd.readAsDataURL(f)
  }
}

async function startGenerate() {
  step.value = 3
  genProgress.value = 4
  genBlocks.value = []
  const onEvent = (event: string, data: any) => {
    if (event === 'meta') { genStage.value = '已接收任务，开始处理…'; genProgress.value = 10 }
    else if (event === 'photo') { genStage.value = `接收原图 ${data.index + 1}：${data.note}`; genProgress.value = Math.min(24, genProgress.value + 8) }
    else if (event === 'block') { genBlocks.value.push(data); genProgress.value = Math.min(82, genProgress.value + 7); genStage.value = `识别块 ${genBlocks.value.length}：${data.type === 'figure' ? '图形区域' : '公式/文本'}` }
    else if (event === 'outline') { genStage.value = `生成大纲：${data.items?.join(' / ') || ''}`; genProgress.value = 38 }
    else if (event === 'slide') { genStage.value = `草稿页 ${data.index + 1}（未确认）`; genProgress.value = Math.min(86, 40 + data.index * 9) }
    else if (event === 'paginate') { genStage.value = `分页引擎：${data.note}`; genProgress.value = 90 }
    else if (event === 'done') {
      genProgress.value = 100
      genStage.value = '完成，正在打开编辑器…'
      window.setTimeout(() => openDeck(data.deck_id), 500)
    }
  }
  try {
    if (newMode.value === 'photo') {
      sseCtrl = v3Api.recognition.photoIngest(
        { photos: photos.value, question_label: `${form.value.class_id === 'c2-05' ? '高二(5)班' : '高二(3)班'}例题（拍照）`, config: { scope: form.value.scope, mode: form.value.mode, template_id: form.value.template_id, font_tier: form.value.font_tier, margin_notes: form.value.margin_notes } },
        onEvent,
      )
    } else if (newMode.value === 'plan') {
      genStage.value = '以教案环节结构生成课件骨架…'
      const r = await v3Api.plans.pushToDeck(form.value.plan_id, { template_id: form.value.template_id })
      genProgress.value = 100
      genStage.value = '教案已直通为课件，正在打开…'
      window.setTimeout(() => openDeck(r.data.deck_id), 400)
    } else {
      sseCtrl = v3Api.generation.deck({ topic: form.value.topic, class_id: form.value.class_id, template_id: form.value.template_id }, onEvent)
    }
  } catch {
    genStage.value = '生成失败（mock 服务未启动？用 VITE_USE_MOCK=1 npm run dev）'
  }
}

/* ---------- 编辑器操作 ---------- */
function addSlide() {
  if (!deck.value) return
  const s: V3Slide = {
    id: `sl-${Date.now()}`,
    layout: 'blank',
    elements: [
      { id: `e${Date.now()}`, type: 'text', left: 70, top: 52, width: 600, height: 50, z: 1, html: '新页标题', font_size: 28, bold: true, color: '#0a3568' },
      { id: `p${Date.now()}`, type: 'pageNo', left: 1180, top: 680, width: 60, height: 30, z: 1, no: deck.value.slides.length + 1 },
    ],
  }
  deck.value.slides.splice(slideIdx.value + 1, 0, s)
  slideIdx.value += 1
}
function deleteSlide(i: number) {
  if (!deck.value || deck.value.slides.length <= 1) return
  deck.value.slides.splice(i, 1)
  if (slideIdx.value >= deck.value.slides.length) slideIdx.value = deck.value.slides.length - 1
}
function onElementMoved(id: string, left: number, top: number) {
  const el = currentSlide.value.elements.find((e) => e.id === id)
  if (el) { el.left = left; el.top = top }
}
function onDropLatex(p: { latex: string; left: number; top: number }) {
  addFormulaElement(cleanPlaceholder(p.latex), p.left, p.top)
  // 存清洗值（KaTeX 可渲染），随后把原始模板塞进属性面板 MathField：教师光标落槽立即输入
  nextTick(() => { if (selectedEl.value?.type === 'formula') propsMathField.value?.insert(p.latex) })
}
function addFormulaElement(latex: string, left = 480, top = 320) {
  if (!deck.value) return
  const el: V3Element = { id: `e${Date.now()}`, type: 'formula', left, top, width: 420, height: 56, z: 5, latex, font_size: 22, display: false, teacher_confirmed: false }
  currentSlide.value.elements.push(el)
  selectedId.value = el.id
}
function addGeometry(p: FigurePresetDef) {
  if (!deck.value) return
  const el: V3Element = { id: `e${Date.now()}`, type: 'geometry', left: 720, top: 160, width: 460, height: 400, z: 3, preset_id: p.id, params: defaultParams(p), teacher_confirmed: false }
  currentSlide.value.elements.push(el)
  selectedId.value = el.id
}
function onFigDrag(ev: DragEvent, p: FigurePresetDef) {
  ev.dataTransfer?.setData('mx/preset', p.id)
}
function onKbdInsert(k: { latex: string }) {
  if (selectedEl.value?.type === 'formula') {
    propsMathField.value?.insert(k.latex)
  } else {
    addFormulaElement(cleanPlaceholder(k.latex), 480, 320)
    nextTick(() => propsMathField.value?.insert(k.latex))
  }
}
function confirmElement() {
  if (selectedEl.value) selectedEl.value.teacher_confirmed = !selectedEl.value.teacher_confirmed
}
function deleteElement() {
  if (!selectedId.value) return
  deleteElementById(selectedId.value)
}
function deleteElementById(id: string) {
  const i = currentSlide.value.elements.findIndex((e) => e.id === id)
  if (i >= 0) currentSlide.value.elements.splice(i, 1)
  if (selectedId.value === id) selectedId.value = ''
}
async function saveDeck() {
  if (!deck.value) return
  try {
    await v3Api.decks.patch(deck.value.id, { title: deck.value.title, template_id: deck.value.template_id })
    await v3Api.decks.patchSlide(deck.value.id, currentSlide.value.id, { elements: currentSlide.value.elements })
    genStage.value = '已保存'
  } catch { /* mock */ }
}
async function exportDeck() {
  if (!deck.value) return
  try { await v3Api.decks.export(deck.value.id, 'pptx') } catch { /* mock */ }
}

/* ---------- 原图重建（P1 升级链路） ---------- */
async function loadRebuildCandidates() {
  try {
    const r = await v3Api.recognition.rebuildCandidates({ region: { x: 0, y: 0, w: 1, h: 1 }, photo_id: 'p0' })
    rebuildCandidates.value = r.data.candidates
  } catch { rebuildCandidates.value = [] }
}
function applyRebuild(anchor: Extract<V3Element, { type: 'anchorPhoto' }>, c: V3FigureRebuildCandidate) {
  if (!c.passed_validation || !c.preset_id) return
  const def = FIGURE_PRESETS.find((p) => p.id === c.preset_id)
  if (!def) return
  const near = currentSlide.value.elements.find((e) => e.type === 'geometry' && Math.abs(e.left - anchor.left) < 700 && e.top > anchor.top)
  if (near && near.type === 'geometry') {
    near.preset_id = c.preset_id
    near.params = { ...c.params }
    selectedId.value = near.id
  } else {
    const el: V3Element = { id: `e${Date.now()}`, type: 'geometry', left: Math.min(900, anchor.left + anchor.width + 30), top: anchor.top, width: 420, height: 320, z: 3, preset_id: c.preset_id, params: { ...c.params }, teacher_confirmed: false }
    currentSlide.value.elements.push(el)
    selectedId.value = el.id
  }
  anchor.upgrade_state = 'rebuilt'
  anchor.upgrade_target = c.preset_id
}

/* ---------- 绘图工作台（P1：函数绘图 / 自由画布 / 手写公式） ---------- */
const drawOpen = ref(false)
const drawReopen = ref<DrawReopen | null>(null)
const photoOpen = ref(false)

function onPhotoInsert(p: { kind: 'image' | 'formula' | 'anchorPhoto'; src?: string; latex?: string }) {
  if (!deck.value) return
  if (p.kind === 'formula') {
    addFormulaElement(cleanPlaceholder(p.latex || ''), 480, 320)
    return
  }
  const src = p.src || ''
  const el: V3Element = p.kind === 'image'
    ? { id: `e${Date.now()}`, type: 'image', left: 300, top: 180, width: 560, height: 360, z: 4, src, alt: '拍照素材（已扫描增强）' }
    : { id: `e${Date.now()}`, type: 'anchorPhoto', left: 300, top: 180, width: 560, height: 360, z: 4, src, upgrade_state: 'none' }
  currentSlide.value.elements.push(el)
  selectedId.value = el.id
}

function openDrawBoard() {
  drawReopen.value = null
  drawOpen.value = true
}
function reopenDraw(el: Extract<V3Element, { type: 'image' }>) {
  if (!el.draw_recipe?.records?.length) return
  drawReopen.value = { mode: 'free', records: el.draw_recipe.records, elementId: el.id }
  drawOpen.value = true
}
function onDrawInsert(p: V3DrawInsert, elementId?: string) {
  if (elementId) {
    const el = currentSlide.value.elements.find((e) => e.id === elementId)
    if (!el) return
    if (p.type === 'image' && el.type === 'image') {
      el.src = p.src
      el.draw_recipe = { records: p.records }
      el.height = Math.min(620, Math.round(el.width * p.aspect))
    } else if (p.type === 'formula' && el.type === 'formula') {
      el.latex = p.latex
    } else if (p.type === 'functionPlot' && el.type === 'functionPlot') {
      el.expr = p.expr
      el.params = p.params
      el.domain = p.domain
    }
    selectedId.value = el.id
    return
  }
  if (p.type === 'functionPlot') {
    const el: V3Element = { id: `e${Date.now()}`, type: 'functionPlot', left: 380, top: 110, width: 560, height: 430, z: 3, expr: p.expr, params: p.params, domain: p.domain, live_sliders: true, teacher_confirmed: false }
    currentSlide.value.elements.push(el)
    selectedId.value = el.id
  } else if (p.type === 'formula') {
    addFormulaElement(p.latex, 470, 300)
  } else {
    const w = 470
    const h = Math.min(620, Math.round(w * p.aspect))
    const el: V3Element = { id: `e${Date.now()}`, type: 'image', left: 400, top: Math.max(50, Math.round(360 - h / 2)), width: w, height: h, z: 3, src: p.src, alt: '绘图工作台图形', draw_recipe: { records: p.records }, teacher_confirmed: false }
    currentSlide.value.elements.push(el)
    selectedId.value = el.id
  }
}

/* ---------- AI 元素级建议（R5） ---------- */
async function runAiElement() {
  if (!deck.value) return
  aiDiffs.value = []
  try {
    await v3Api.generation.aiElement(deck.value.id, { slide_id: currentSlide.value.id, hint: '结合本页考点优化' }, (event, data) => {
      if (event === 'suggest') genStage.value = data.note
      if (event === 'diff') aiDiffs.value = data.diffs
    })
  } catch { /* mock */ }
}
function adoptDiff(i: number) {
  const d = aiDiffs.value[i]
  if (!d) return
  if (d.op === 'add' && d.after) {
    const el = JSON.parse(JSON.stringify(d.after)) as V3Element
    currentSlide.value.elements.push(el)
    selectedId.value = el.id
  } else if (d.op === 'remove' && d.element_id) {
    const idx = currentSlide.value.elements.findIndex((e) => e.id === d.element_id)
    if (idx >= 0) currentSlide.value.elements.splice(idx, 1)
  }
  aiDiffs.value.splice(i, 1)
}

/* ---------- 键盘：Delete 删除选中元素 ---------- */
function onKeydown(ev: KeyboardEvent) {
  if (view.value !== 'editor' || presenting.value) return
  const tag = (ev.target as HTMLElement)?.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'MATH-FIELD' || (ev.target as HTMLElement)?.isContentEditable) return
  if (ev.key === 'Delete' || ev.key === 'Backspace') {
    if (selectedId.value) { ev.preventDefault(); deleteElement() }
  }
  if (ev.key === 'Escape') selectedId.value = ''
}
onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => { window.removeEventListener('keydown', onKeydown); sseCtrl?.abort() })
</script>

<style scoped>
.tv3-newgrid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.tv3-photo-drop {
  border: 2px dashed var(--tv3-line); border-radius: var(--tv3-radius-lg);
  min-height: 150px; display: flex; align-items: center; justify-content: center; gap: 10px;
  padding: 16px; cursor: pointer; background: #fbfcfe; transition: all 0.15s ease;
}
.tv3-photo-drop.is-over { border-color: var(--tv3-gold); background: var(--tv3-gold-soft); }
.tv3-photo-thumb { height: 120px; border-radius: 8px; border: 1px solid var(--tv3-line); object-fit: contain; }
.tv3-photo-add {
  width: 120px; height: 120px; border-radius: 8px; border: 1.5px dashed var(--tv3-line);
  display: grid; place-items: center; font-size: 26px; color: var(--tv3-ink3);
}
.tv3-recog { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 8px; }
.tv3-recog__block {
  border: 1px solid var(--tv3-line); border-radius: 10px; padding: 10px 12px; background: #fff;
  display: flex; flex-direction: column; gap: 6px;
}
.tv3-recog__latex { font-size: 15px; overflow-x: auto; }
.tv3-recog__text { font-size: 12.5px; color: var(--tv3-ink2); line-height: 1.5; }
.tv3-recog__conf { font-size: 10.5px; color: var(--tv3-ink3); font-family: var(--tv3-font-num); }
.tv3-editor__title-input {
  border: 1px solid transparent; border-radius: 8px; font-size: 14.5px; font-weight: 700;
  padding: 5px 10px; width: 320px; background: transparent; color: var(--tv3-ink); outline: none;
}
.tv3-editor__title-input:hover, .tv3-editor__title-input:focus { border-color: var(--tv3-line); background: #fff; }
.tv3-editor__hint { position: absolute; bottom: 8px; left: 50%; transform: translateX(-50%); font-size: 11px; color: var(--tv3-ink3); white-space: nowrap; }
.tv3-editor__docktabs { display: flex; align-items: center; gap: 12px; padding: 8px 12px 0; }
.tv3-editor__dock { height: 216px; }
.tv3-outline__del {
  position: absolute; right: 3px; top: 3px; z-index: 5; width: 18px; height: 18px;
  border-radius: 50%; border: none; background: rgba(220, 38, 70, 0.85); color: #fff;
  font-size: 11px; cursor: pointer; display: none; place-items: center; line-height: 1;
}
.tv3-outline__slide:hover .tv3-outline__del { display: grid; }
.tv3-props__empty { text-align: center; color: var(--tv3-ink3); font-size: 12.5px; padding: 46px 18px; line-height: 1.7; }
.tv3-props__head { display: flex; align-items: center; gap: 8px; padding: 12px 14px; border-bottom: 1px solid var(--tv3-line2); }
.tv3-editor__props > * { padding-left: 14px; padding-right: 14px; }
.tv3-editor__props .tv3-form-label, .tv3-editor__props .mx-slider, .tv3-editor__props .tv3-props__geom { padding-left: 0; padding-right: 0; }
.tv3-props__geom { margin-top: 16px; padding-top: 12px; border-top: 1px dashed var(--tv3-line); }
.tv3-props__grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
.tv3-props__grid label { font-size: 11px; color: var(--tv3-ink3); display: flex; flex-direction: column; gap: 3px; }
.tv3-props__aidiff { margin-top: 18px; padding: 12px 14px; border-radius: 10px; background: var(--tv3-ai-soft); border: 1px solid var(--tv3-ai-border); }
.tv3-aidiff__item { background: #fff; border-radius: 8px; padding: 8px 10px; margin-top: 6px; }
.tv3-aidiff__actions { display: flex; gap: 6px; margin-top: 6px; }
.tv3-present {
  position: fixed; inset: 0; z-index: 200; background: rgba(7, 26, 50, 0.96);
  display: flex; flex-direction: column;
}
.tv3-present__bar {
  display: flex; align-items: center; gap: 12px; padding: 10px 20px; color: #fff; font-size: 13.5px;
}
.tv3-present__stage { flex: 1; display: grid; place-items: center; padding-bottom: 20px; }
.tv3-editor__props { padding-top: 0; }
.tv3-editor__props > .tv3-props__head { margin: 0 -14px; }

/* 面板宽度拖拽手柄：大纲贴右边、属性面板贴左边 */
.tv3-editor__outline, .tv3-editor__props { position: relative; }
.tv3-editor__outline > .tv3-resizer { position: absolute; top: 0; right: 0; bottom: 0; width: 7px; cursor: col-resize; z-index: 6; padding: 0; }
.tv3-editor__props > .tv3-resizer { position: absolute; top: 0; left: 0; bottom: 0; width: 7px; cursor: col-resize; z-index: 6; padding: 0; }
.tv3-resizer::after {
  content: ''; position: absolute; top: 0; bottom: 0; left: 3px; width: 1.5px;
  background: transparent; transition: background 0.15s ease;
}
.tv3-resizer:hover::after { background: var(--tv3-gold); }
</style>
