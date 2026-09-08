<template>
  <!-- ============ V3.4 二次备课共备桌：左来源桌 / 中连续共备稿 / 右上下文助手 ============ -->
  <div class="tv3-dw" data-testid="tv3-desk-root">
    <!-- 顶栏：返回 / 课题上下文 / 保存状态 / 撤销 / 演示开关 -->
    <header class="tv3-dw__bar">
      <button class="tv3-btn tv3-btn--sm" data-testid="tv3-desk-back" @click="$emit('back')">← 教案首页</button>
      <span class="tv3-dw__topic" :title="lesson?.topic">{{ lesson?.topic }}</span>
      <span class="tv3-tag">{{ lesson?.className }}</span>
      <span class="tv3-tag" :title="lesson?.chapter">{{ lesson?.textbookVersion }} · {{ shortChapter }}</span>
      <span class="tv3-tag tv3-tag--gold" :title="lesson?.classNote">班情（演示）：{{ shortNote }}</span>
      <span class="tv3-tag" :title="lesson?.originLabel">{{ lesson?.originLabel }}</span>
      <div class="tv3-card__spacer" />

      <!-- 保存状态：不是 toast，是常驻状态文字 + 可复查记录 -->
      <span class="tv3-dw__save" :class="{ 'is-error': desk.state.saveStatus === 'error' }" data-testid="tv3-desk-save-status">
        <template v-if="desk.state.saveStatus === 'saving'">保存中…</template>
        <template v-else-if="desk.state.saveStatus === 'saved'">本机演示保存 · {{ desk.state.lastSavedAt || '刚保存' }}</template>
        <template v-else>{{ desk.state.saveError || '保存失败' }}</template>
      </span>
      <details class="tv3-dw__log" data-testid="tv3-desk-save-log">
        <summary>最近修改记录</summary>
        <div class="tv3-dw__log-panel">
          <div v-for="(l, i) in desk.state.saveLog" :key="i" class="tv3-dw__log-row">{{ l.ts }} · {{ l.summary }}</div>
          <div v-if="!desk.state.saveLog.length" style="color: var(--tv3-ink3)">暂无记录</div>
        </div>
      </details>
      <button class="tv3-btn tv3-btn--sm" data-testid="tv3-desk-save-now" title="立即写入本机演示存储" @click="desk.saveNow()">保存</button>
      <button class="tv3-btn tv3-btn--sm" data-testid="tv3-desk-undo" :disabled="!desk.state.undo.length"
        :title="lastUndoLabel ? `撤销：${lastUndoLabel}` : '没有可撤销的操作'" @click="onUndo">
        ↩ 撤销<span v-if="desk.state.undo.length">（{{ desk.state.undo.length }}）</span>
      </button>
      <details class="tv3-dw__demo">
        <summary data-testid="tv3-demo-toggle-btn">演示控制</summary>
        <div class="tv3-dw__demo-panel">
          <div class="tv3-dw__demo-title">原型专用演示开关（诚实模拟失败态，不影响真实内容）</div>
          <label class="tv3-dw__demo-row"><input type="checkbox" data-testid="tv3-demo-ai-fail" :checked="desk.state.demoFailures.ai" @change="desk.setDemoFailure('ai', ($event.target as HTMLInputElement).checked)" /> 模拟 AI/建议服务失败</label>
          <label class="tv3-dw__demo-row"><input type="checkbox" data-testid="tv3-demo-res-fail" :checked="desk.state.demoFailures.resource" @change="desk.setDemoFailure('resource', ($event.target as HTMLInputElement).checked)" /> 模拟资源/来源服务失败</label>
          <label class="tv3-dw__demo-row"><input type="checkbox" data-testid="tv3-demo-save-fail" :checked="desk.state.demoFailures.save" @change="desk.setDemoFailure('save', ($event.target as HTMLInputElement).checked)" /> 模拟本机保存失败</label>
          <button class="tv3-btn tv3-btn--sm tv3-btn--danger" data-testid="tv3-demo-reset" @click="onReset">重置演示数据（重新开始）</button>
        </div>
      </details>
      <button class="tv3-btn tv3-btn--sm" data-testid="tv3-desk-left-toggle" @click="leftOpen = !leftOpen">{{ leftOpen ? '收起来源桌' : '展开来源桌' }}</button>
      <button class="tv3-btn tv3-btn--sm" data-testid="tv3-desk-right-toggle" @click="rightOpen = !rightOpen">{{ rightOpen ? '收起助手' : '展开助手' }}</button>
    </header>

    <div v-if="lesson" class="tv3-dw__cols">
      <!-- ============ 左栏：教材、旧课与来源桌 ============ -->
      <aside v-if="leftOpen" class="tv3-dw__left" data-testid="tv3-desk-left">
        <div class="tv3-dw__left-head">来源桌 <span class="tv3-dw__left-sub">优先级：我的旧课 → 备课组共案 → 演示资源 → 外部引用</span></div>
        <div class="tv3-dw__src-list">
          <button v-for="s in lesson.sources" :key="s.id" class="tv3-dw__src" :class="{ 'is-active': openSrcId === s.id }"
            :data-testid="`tv3-src-item-${s.id}`" @click="openSrcId = openSrcId === s.id ? '' : s.id">
            <span class="tv3-tag" :class="srcTagClass(s.status)" style="font-size: 10px; flex-shrink: 0">{{ srcStatusLabel(s.status) }}</span>
            <span class="tv3-dw__src-name">{{ s.name }}</span>
            <span class="tv3-dw__src-loc">{{ s.sourceLabel }} · {{ s.locator }}</span>
          </button>
        </div>

        <!-- 来源详情：页级定位 / 批注 / 选区引用 -->
        <div v-if="openSrc" class="tv3-dw__src-detail" data-testid="tv3-src-detail">
          <div class="tv3-dw__src-detail-head">
            <b style="font-size: 12.5px">{{ openSrc.name }}</b>
            <span class="tv3-tag" style="font-size: 10px">{{ openSrc.sourceLabel }}</span>
          </div>
          <div v-if="openSrc.note" class="tv3-dw__src-note">{{ openSrc.note }}</div>

          <template v-if="openSrc.pages?.length && !srcLoadFailed">
            <div class="tv3-dw__pages">
              <button v-for="(p, i) in openSrc.pages" :key="p.id" class="tv3-dw__page-tab" :class="{ 'is-active': srcPageIdx === i }"
                :data-testid="`tv3-src-page-${i}`" @click="srcPageIdx = i">{{ p.label }}</button>
            </div>
            <!-- 清单1：教材升主区——大图阅读入口（正文占中栏，侧栏只留目录/速览） -->
            <button v-if="openSrc.kind === 'textbook-demo'" class="tv3-btn tv3-btn--sm tv3-btn--gold" style="width: 100%; justify-content: center"
              data-testid="tv3-src-read-big" @click="openReading(openSrc.id)">📖 大图阅读《{{ openSrc.pages[srcPageIdx].label }}》（占中栏）</button>
            <div class="tv3-dw__page-body" data-testid="tv3-src-body" @mouseup="onSelectInSource">
              <div class="tv3-dw__page-tagline">【{{ openSrc.sourceLabel }}】速览 · 正文请用大图阅读</div>
              <div class="tv3-dw__page-text" v-html="renderRich(openSrc.pages[srcPageIdx].body)" />
              <!-- 选区浮动条：引用到备课稿 -->
              <div v-if="selText" class="tv3-dw__selbar" data-testid="tv3-src-selbar" @mousedown.prevent>
                <span class="tv3-dw__selbar-text">已选 {{ selText.length }} 字</span>
                <button class="tv3-btn tv3-btn--sm tv3-btn--gold" data-testid="tv3-src-quote-btn" @click="quoteSelection">引用到备课稿</button>
                <button class="tv3-btn tv3-btn--sm" @click="clearSel">取消</button>
              </div>
            </div>
            <!-- 页级批注（仅本机演示保存） -->
            <div class="tv3-dw__anno">
              <div class="tv3-dw__anno-label">页级批注（仅本机演示保存）</div>
              <textarea class="tv3-textarea" rows="2" style="font-size: 12px" :value="lesson.pageNotes[openSrc.pages[srcPageIdx].id] || ''"
                :data-testid="`tv3-src-note-${srcPageIdx}`" placeholder="例如：这页的思考题今年要用……"
                @input="desk.setPageNote(openSrc.pages[srcPageIdx].id, ($event.target as HTMLTextAreaElement).value)" />
            </div>
          </template>

          <template v-else-if="srcLoadFailed">
            <div class="tv3-dw__src-fail" data-testid="tv3-src-load-fail">
              来源内容加载失败（演示开关打开）。共备稿内容不受影响。
              <div style="display: flex; gap: 6px; margin-top: 6px">
                <button class="tv3-btn tv3-btn--sm" data-testid="tv3-src-retry" @click="retrySrc">重试</button>
                <button class="tv3-btn tv3-btn--sm tv3-btn--primary" @click="clearSel(); focusEditor()">继续手写</button>
              </div>
            </div>
          </template>

          <div v-else-if="openSrc.status === 'missing'" class="tv3-dw__src-missing" data-testid="tv3-src-missing">
            来源材料缺失：{{ openSrc.note || '文件未上传' }}。可继续用其他来源或手写。
          </div>
          <div v-else-if="openSrc.status === 'unverified'" class="tv3-dw__src-missing" data-testid="tv3-src-unverified">
            外部来源未核验：不展示伪装正文，也无法加载内容。可将其作为线索，取用会带「未核验」标记。
          </div>
        </div>
        <div v-else class="tv3-dw__src-hint">点击上方来源查看内容；选中文字后可「引用到备课稿」。</div>
      </aside>

      <!-- ============ 中栏：连续共备稿（文档流）/ 教材大图阅读（二选一占用） ============ -->
      <!-- 教材大图阅读：正文整页版式占中栏（清单1），选区引用与批注照常可用 -->
      <section v-if="readingMode && readingSrc && readingPage" class="tv3-dw__center tv3-dw__reader" data-testid="tv3-desk-reader">
        <div class="tv3-dw__center-head">
          <button class="tv3-btn tv3-btn--sm" data-testid="tv3-reader-close" @click="closeReading">✕ 返回共备稿</button>
          <b style="font-size: 13px">{{ readingSrc.name }}</b>
          <span class="tv3-tag" style="font-size: 10px">{{ readingSrc.sourceLabel }}</span>
          <div class="tv3-card__spacer" />
          <button v-for="(p, i) in readingSrc.pages" :key="p.id" class="tv3-dw__page-tab" :class="{ 'is-active': readingPageIdx === i }"
            :data-testid="`tv3-reader-page-${i}`" @click="readingPageIdx = i; clearSel()">{{ p.label }}</button>
        </div>
        <div class="tv3-dw__reader-page" @mouseup="onSelectInSource">
          <div class="tv3-dw__reader-body">
            <div class="tv3-dw__reader-title">{{ readingPage.label }}</div>
            <div class="tv3-dw__reader-text" data-testid="tv3-reader-text" v-html="renderRich(readingPage.body)" />
            <div v-if="readingPage.figure" class="tv3-dw__reader-fig" data-testid="tv3-reader-fig" v-html="readingPage.figure" />
            <div class="tv3-dw__reader-note">选区出现后可「引用到备课稿」；演示材料说明：{{ readingSrc.note }}</div>
            <div v-if="selText" class="tv3-dw__selbar" data-testid="tv3-reader-selbar" @mousedown.prevent>
              <span class="tv3-dw__selbar-text">已选 {{ selText.length }} 字</span>
              <button class="tv3-btn tv3-btn--sm tv3-btn--gold" data-testid="tv3-reader-quote-btn" @click="quoteSelectionFrom(readingSrc.id, readingPage.label)">引用到备课稿</button>
              <button class="tv3-btn tv3-btn--sm" @click="clearSel">取消</button>
            </div>
          </div>
          <!-- 页级批注（大图阅读内同样可用，仅本机演示保存） -->
          <div class="tv3-dw__anno" style="max-width: 780px; margin: 10px auto 0; width: 100%">
            <div class="tv3-dw__anno-label">这页的备课批注（仅本机演示保存）</div>
            <textarea class="tv3-textarea" rows="2" style="font-size: 12.5px" :value="lesson.pageNotes[readingPage.id] || ''"
              data-testid="tv3-reader-note" placeholder="例如：这页定义今年用对比情境引入……"
              @input="desk.setPageNote(readingPage.id, ($event.target as HTMLTextAreaElement).value)" />
          </div>
        </div>
      </section>

      <section v-else class="tv3-dw__center" data-testid="tv3-desk-center">
        <div class="tv3-dw__center-head">
          <b>连续共备稿</b>
          <span style="font-size: 11px; color: var(--tv3-ink3)">普通文字随时写；语义块按需加；上次停留：{{ lesson.lastStop || '未记录' }}</span>
          <div class="tv3-card__spacer" />
          <span class="tv3-tag" style="font-size: 10px">{{ lesson.blocks.length }} 个块</span>
        </div>

        <div v-if="!lesson.blocks.length" class="tv3-dw__blank" data-testid="tv3-desk-blank">
          空白共备稿：从左侧来源选中文字「引用到备课稿」，或直接在下方加一个段落开始写普通文字（不必先选类型）。
        </div>

        <div class="tv3-dw__blocks" data-testid="tv3-desk-blocks">
          <article v-for="(b, i) in lesson.blocks" :key="b.id" class="tv3-dw__block" :class="{ 'is-selected': selectedBlockId === b.id, 'is-locked': b.locked }"
            :data-testid="`tv3-desk-block-${b.id}`"
            @dragover.prevent @drop.prevent="onDrop($event, i)" @click="selectBlock(b.id)">
            <div class="tv3-dw__block-bar">
              <span class="tv3-dw__drag" :data-testid="`tv3-block-drag-${b.id}`" draggable="true" title="拖动重排" @dragstart="onDragStart($event, b.id)" @click.stop>⋮⋮</span>
              <span class="tv3-tag" :class="blockTagClass(b.type)" :data-testid="`tv3-desk-block-type-${b.id}`">{{ DESK_BLOCK_LABELS[b.type] }}</span>
              <span v-if="b.origin === 'quote'" class="tv3-tag" style="font-size: 10px">引用</span>
              <span v-if="b.origin === 'suggestion'" class="tv3-tag tv3-tag--ai" style="font-size: 10px">建议采用</span>
              <span v-if="b.origin === 'resource'" class="tv3-tag tv3-tag--gold" style="font-size: 10px">资源取用</span>
              <div class="tv3-card__spacer" />
              <button class="tv3-dw__mini" :data-testid="`tv3-block-formula-${b.id}`" title="在光标处插入公式（行内编辑，不打断写作）" @click.stop="ftexRefs[b.id]?.insertFormulaInline()">ƒ 公式</button>
              <button class="tv3-dw__mini" :data-testid="`tv3-block-lock-${b.id}`" :title="b.locked ? '解除锁定' : '锁定（AI 与批量操作不覆盖）'" @click.stop="desk.toggleLock(b.id)">{{ b.locked ? '已锁定' : '锁定' }}</button>
              <button class="tv3-dw__mini" :data-testid="`tv3-block-del-${b.id}`" :disabled="b.locked" :title="b.locked ? '锁定块不可删除，请先解锁' : '删除本块'" @click.stop="desk.removeBlock(b.id)">删除</button>
            </div>
            <!-- 引用来源行 -->
            <div v-if="b.sourceRefId" class="tv3-dw__block-src" :data-testid="`tv3-desk-block-src-${b.id}`">
              来源：{{ sourceNameOf(b) }}<template v-if="b.sourceLocator"> · {{ b.sourceLocator }}</template>
            </div>
            <FormulaTextEditor v-if="!b.locked" :ref="(el) => setFtexRef(el as unknown as Ftex | null, b.id)"
              :model-value="b.text" :testid="`tv3-desk-block-text-${b.id}`" :placeholder="`写${DESK_BLOCK_LABELS[b.type]}内容；可直接写普通文字，公式用输入台插入光标处`"
              @update:model-value="desk.editBlockText(b.id, $event)" @focus="onBlockFocus(b.id)" />
            <div v-else class="tv3-dw__lockedtext" v-html="renderRich(b.text)" />
          </article>
        </div>

        <!-- 显式新增语义块（普通文字默认进"段落"，不强迫先选类型） -->
        <div class="tv3-dw__addbar" data-testid="tv3-desk-addbar">
          <span style="font-size: 11px; color: var(--tv3-ink3)">新增块：</span>
          <button v-for="t in ADD_TYPES" :key="t" class="tv3-btn tv3-btn--sm" :data-testid="`tv3-add-${t}`" @click="addBlock(t)">＋{{ DESK_BLOCK_LABELS[t] }}</button>
        </div>
      </section>

      <!-- ============ 右栏：当前选区的上下文助手（默认围绕选中块） ============ -->
      <aside v-if="rightOpen" class="tv3-dw__right" data-testid="tv3-desk-right">
        <div class="tv3-dw__rtabs">
          <button v-for="t in RTABS" :key="t.key" class="tv3-dw__rtab" :class="{ 'is-active': rightTab === t.key }"
            :data-testid="`tv3-rtab-${t.key}`" @click="rightTab = t.key">{{ t.label }}</button>
        </div>

        <!-- ① AI / 演示建议：选区驱动 + 上下文可见 + diff + 接受/拒绝/撤销 -->
        <div v-if="rightTab === 'ai'" class="tv3-dw__rpane" data-testid="tv3-rpane-ai">
          <div class="tv3-dw__ctxbox" data-testid="tv3-ai-context">
            <b style="font-size: 11.5px">AI / 演示助手正在使用的上下文</b>
            <div class="tv3-dw__ctxrow">课题：{{ lesson.topic }} · {{ lesson.className }}</div>
            <div class="tv3-dw__ctxrow">选中块：{{ selectedBlock ? DESK_BLOCK_LABELS[selectedBlock.type] + ' · ' + excerpt(selectedBlock.text) : '未选中（点击左侧共备稿某一块）' }}</div>
            <div class="tv3-dw__ctxrow">来源：{{ selectedBlock?.sourceRefId ? sourceNameOf(selectedBlock) : '演示教材页 P38–41（演示）' }}</div>
            <div class="tv3-dw__ctxrow">本班备注（演示）：{{ excerpt(plain(lesson.classNote), 30) }}</div>
          </div>

          <!-- 清单4：空态给教师有用的起点，而不是开发腔提示 -->
          <div v-if="!selectedBlock" class="tv3-dw__start" data-testid="tv3-ai-startpoints">
            <div class="tv3-dw__start-card">
              <div class="tv3-dw__start-title">去年这节课，学生卡在哪（课后记 · 演示）</div>
              <div class="tv3-dw__start-body">{{ lastYearNote }}</div>
            </div>
            <div class="tv3-dw__start-card">
              <div class="tv3-dw__start-title">本班要注意什么（班情 · 演示）</div>
              <div class="tv3-dw__start-body">{{ excerpt(plain(lesson.classNote), 46) }}</div>
            </div>
            <div class="tv3-dw__start-title" style="margin-top: 2px">今晚可以从这里开始：</div>
            <button class="tv3-btn tv3-btn--sm tv3-btn--primary" data-testid="tv3-start-read-textbook" @click="openReading('src-textbook-demo')">📖 先读教材 P38 定义（大图）</button>
            <button class="tv3-btn tv3-btn--sm tv3-btn--primary" data-testid="tv3-start-take-chain" @click="takeCommonPlanChain">⎘ 取备课组共案的问题链起稿</button>
            <div class="tv3-dw__rhint">选中稿中任意一块后，这里会围绕它给局部建议；不会默认生成整份教案。</div>
          </div>
          <template v-else>
            <div class="tv3-dw__rlabel">对当前块可用的局部动作</div>
            <div class="tv3-dw__acts">
              <button v-for="a in actionsFor(selectedBlock)" :key="a.action" class="tv3-btn tv3-btn--sm" :data-testid="`tv3-ai-act-${a.action}`"
                :disabled="gen.status === 'running'" @click="runSuggestion(a)">{{ a.actionLabel }}</button>
              <span v-if="!actionsFor(selectedBlock).length" class="tv3-dw__rhint">该块类型暂无局部动作——可手动编辑或从资源取用。</span>
            </div>

            <div v-if="gen.status === 'running'" class="tv3-dw__gen" data-testid="tv3-ai-running">
              <span class="tv3-pulse-dot" />正在按上述上下文生成「{{ gen.actionLabel }}」…
              <button class="tv3-btn tv3-btn--sm" data-testid="tv3-ai-cancel" @click="cancelGen">取消</button>
            </div>
            <div v-if="gen.status === 'error'" class="tv3-dw__gen is-error" data-testid="tv3-ai-error">
              ⚠ {{ gen.err }}
              <button class="tv3-btn tv3-btn--sm" @click="gen.status = 'idle'">关闭</button>
            </div>

            <!-- diff 卡片 -->
            <div v-for="s in pendingSuggestions" :key="s.id" class="tv3-dw__sugg" :data-testid="`tv3-sugg-${s.id}`">
              <div class="tv3-dw__sugg-head">
                <span class="tv3-tag" :class="s.basis === 'ai-demo' ? 'tv3-tag--ai' : 'tv3-tag--gold'" style="font-size: 10px">
                  {{ s.basis === 'ai-demo' ? '演示建议（本机 Mock）' : '班情依据（演示）' }}
                </span>
                <b style="font-size: 12.5px">{{ s.title }}</b>
              </div>
              <div class="tv3-dw__sugg-why">{{ s.reason }}</div>
              <div v-if="s.pathOptions" class="tv3-dw__paths">
                <label v-for="p in s.pathOptions" :key="p.id" class="tv3-dw__path" :data-testid="`tv3-sugg-path-${s.id}-${p.id}`">
                  <input type="radio" :name="`path-${s.id}`" :checked="s.chosenPathId === p.id" @change="desk.choosePath(s.id, p.id)" />
                  <span><b>{{ p.title }}</b>（约 {{ p.minutes }} 分钟）<br /><span style="color: var(--tv3-ink3)">{{ p.fit }}</span><br />{{ p.keyQuestions[0] }}</span>
                </label>
              </div>
              <div class="tv3-dw__diff">
                <div class="tv3-dw__diff-col">
                  <div class="tv3-dw__diff-tag tv3-dw__diff-tag--before">{{ s.before ? '原文（受影响块）' : '（新增块，无原文覆盖）' }}</div>
                  <div class="tv3-dw__diff-body" v-html="s.before ? renderRich(s.before) : '—'" />
                </div>
                <div class="tv3-dw__diff-col">
                  <div class="tv3-dw__diff-tag tv3-dw__diff-tag--after">建议后</div>
                  <div class="tv3-dw__diff-body" data-testid="tv3-sugg-after" v-html="renderRich(s.after)" />
                </div>
              </div>
              <div v-if="s.needVerify" class="tv3-dw__verify" data-testid="tv3-sugg-verify">⚠ 含数学结论 / 变式，需教师核验后使用</div>
              <div class="tv3-dw__sugg-foot">
                <button class="tv3-btn tv3-btn--sm tv3-btn--primary" :data-testid="`tv3-sugg-accept-${s.id}`"
                  :disabled="isTargetLocked(s)" :title="isTargetLocked(s) ? '锁定块不执行覆盖，请先解锁' : '接受后写入共备稿，可撤销'" @click="acceptSugg(s)">
                  接受修改
                </button>
                <button class="tv3-btn tv3-btn--sm" :data-testid="`tv3-sugg-reject-${s.id}`" @click="desk.rejectSuggestion(s.id)">拒绝</button>
              </div>
            </div>

            <div v-if="justApplied" class="tv3-dw__applied" data-testid="tv3-sugg-applied">
              ✓ {{ justApplied }} ——已写入共备稿。
              <button class="tv3-btn tv3-btn--sm" data-testid="tv3-sugg-undolast" @click="onUndo">撤销</button>
            </div>
          </template>
        </div>

        <!-- ② 资源候选：≤3 条 + 可用状态 + 局部取用 -->
        <div v-else-if="rightTab === 'resource'" class="tv3-dw__rpane" data-testid="tv3-rpane-resource">
          <div class="tv3-dw__rlabel">围绕当前块（{{ selectedBlock ? DESK_BLOCK_LABELS[selectedBlock.type] : '未选中' }}）的候选 · 最多 3 条</div>
          <div v-if="res.status === 'loading'" class="tv3-dw__gen"><span class="tv3-pulse-dot" />正在按当前块找资源… <button class="tv3-btn tv3-btn--sm" data-testid="tv3-res-cancel" @click="cancelRes">取消</button></div>
          <div v-else-if="res.status === 'error'" class="tv3-dw__gen is-error" data-testid="tv3-res-error">
            ⚠ 资源服务失败（演示开关打开）。已写内容不受影响。
            <div style="display: flex; gap: 6px; margin-top: 6px">
              <button class="tv3-btn tv3-btn--sm" data-testid="tv3-res-retry" @click="loadResources()">重试</button>
              <button class="tv3-btn tv3-btn--sm tv3-btn--primary" data-testid="tv3-res-handwrite-err" @click="focusEditor()">继续手写</button>
            </div>
          </div>
          <template v-else>
            <div v-if="!selectedBlock" class="tv3-dw__rhint">选中一个块后按块找资源。</div>
            <div v-else-if="!res.items.length" class="tv3-dw__rhint" data-testid="tv3-res-empty">
              该块暂无匹配的候选资源。可以继续手写，或手动插入一条引用块。
              <div style="display: flex; gap: 6px; margin-top: 8px">
                <button class="tv3-btn tv3-btn--sm tv3-btn--primary" data-testid="tv3-res-handwrite" @click="focusEditor()">继续手写</button>
                <button class="tv3-btn tv3-btn--sm" data-testid="tv3-res-manual" @click="insertManualQuote">手动插入引用块</button>
              </div>
            </div>
            <div v-for="(c, i) in res.items" :key="c.id" class="tv3-dw__res" :data-testid="`tv3-res-item-${i}`">
              <div class="tv3-dw__res-head">
                <b style="font-size: 12.5px">{{ c.name }}</b>
                <span class="tv3-tag" :class="c.availability === 'available' ? 'tv3-tag--ok' : 'tv3-tag--warn'" style="font-size: 10px">
                  {{ c.availabilityLabel }}<template v-if="c.availability === 'unverified'"> · 未核验</template>
                </span>
              </div>
              <div class="tv3-dw__res-meta">{{ c.layerLabel }} · {{ c.locator }}</div>
              <div class="tv3-dw__res-why">为什么推荐：{{ c.why }}</div>
              <div class="tv3-dw__res-preview" v-html="renderRich(c.preview)" />
              <div v-if="c.note" class="tv3-dw__res-note">{{ c.note }}</div>
              <button class="tv3-btn tv3-btn--sm tv3-btn--gold" :data-testid="`tv3-res-take-${i}`"
                :disabled="c.availability === 'stale'" :title="c.availability === 'stale' ? '来源失效，取用不可用' : `只取这一段，插入当前块之后（可撤销）`"
                @click="takeResource(c)">
                {{ c.takeLabel }} → 插入共备稿
              </button>
            </div>
            <div v-if="resJustTaken" class="tv3-dw__applied" data-testid="tv3-res-taken">✓ {{ resJustTaken }}<button class="tv3-btn tv3-btn--sm" @click="onUndo">撤销</button></div>
          </template>
        </div>

        <!-- ③ 本班调整备注 -->
        <div v-else-if="rightTab === 'note'" class="tv3-dw__rpane" data-testid="tv3-rpane-note">
          <div class="tv3-dw__rlabel">本班班情（演示数据 · 可改）</div>
          <textarea class="tv3-textarea" rows="4" style="font-size: 12px" :value="lesson.classNote" data-testid="tv3-classnote-ta"
            @input="desk.setClassNote(($event.target as HTMLTextAreaElement).value)" />
          <div class="tv3-dw__rlabel" style="margin-top: 10px">把修改理由写进共备稿（明年同课还能看到为什么这么改）</div>
          <button class="tv3-btn tv3-btn--sm tv3-btn--primary" data-testid="tv3-classnote-insert" @click="insertClassNote">
            ＋写入「本班调整理由」块
          </button>
          <div class="tv3-dw__rhint" style="margin-top: 6px">理由块带「本班调整理由」标签：提纲中以标签标出供备课对照，课件候选页不会把它当教学内容投影。</div>
        </div>

        <!-- ④ 上课提纲预览 -->
        <div v-else-if="rightTab === 'outline'" class="tv3-dw__rpane" data-testid="tv3-rpane-outline">
          <div class="tv3-dw__rlabel">上课提纲（由共备稿实时投影）</div>
          <div v-if="!outline.length" class="tv3-dw__rhint">共备稿还是空的——写点内容后这里会生成提纲。</div>
          <ol class="tv3-dw__outline" data-testid="tv3-proj-outline">
            <li v-for="o in outline" :key="o.blockId" class="tv3-dw__outline-row">
              <span class="tv3-tag" style="font-size: 10px" :class="blockTagClass(o.type)">{{ o.label }}</span>
              <span class="tv3-dw__outline-text">{{ o.summary }}</span>
            </li>
          </ol>
          <div class="tv3-dw__rfoot">提纲为本地投影视图；规范教案导出为待接入能力（IFC）。</div>
        </div>

        <!-- ⑤ 课件候选预览（1–3 页本地投影，不伪造导出） -->
        <div v-else-if="rightTab === 'deck'" class="tv3-dw__rpane" data-testid="tv3-rpane-deck">
          <div class="tv3-dw__rlabel">课件候选（本地投影视图 · 未生成 PPTX 文件）</div>
          <button v-if="!lesson.projections" class="tv3-btn tv3-btn--sm tv3-btn--primary" data-testid="tv3-proj-deck-build" @click="rebuildDeck">
            按当前共备稿生成 1–3 页候选预览
          </button>
          <template v-else>
            <div style="display: flex; gap: 6px; align-items: center; margin-bottom: 6px">
              <span style="font-size: 10.5px; color: var(--tv3-ink3)">构建于 {{ lesson.projections.builtAt }}</span>
              <button class="tv3-btn tv3-btn--sm" data-testid="tv3-proj-deck-rebuild" @click="rebuildDeck">按最新稿重建</button>
            </div>
            <div v-for="(c, i) in lesson.projections.deckCandidates" :key="c.id" class="tv3-dw__cand" :class="{ 'is-disabled': !c.usable }" :data-testid="`tv3-cand-${i}`">
              <div class="tv3-dw__res-head">
                <b style="font-size: 12.5px">{{ c.title }}</b>
                <span class="tv3-tag" :class="c.usable ? 'tv3-tag--ok' : 'tv3-tag--warn'" style="font-size: 10px" :data-testid="`tv3-cand-usable-${i}`">{{ c.usable ? '可用' : '不可用' }}</span>
              </div>
              <div v-if="c.note" class="tv3-dw__res-note">{{ c.note }}</div>
              <div v-for="(pg, k) in c.pages" :key="k" class="tv3-dw__cand-page" :data-testid="`tv3-cand-page-${i}-${k}`">
                <div class="tv3-dw__cand-page-title">{{ pg.title }}</div>
                <div v-for="(ln, j) in pg.lines" :key="j" class="tv3-dw__cand-line">· {{ ln }}</div>
                <div v-if="!pg.lines.length" class="tv3-dw__cand-line" style="color: var(--tv3-ink4)">（无对应内容）</div>
              </div>
            </div>
            <div class="tv3-dw__rfoot" data-testid="tv3-deck-honest">
              这是可追溯的本地投影视图（每页标注来源块），不是已导出课件；「推送课件」为待接入能力（IFC）。
            </div>
          </template>
          <div v-if="!lesson.blocks.length" class="tv3-dw__rhint">共备稿为空：课件候选为空属正常，写内容后可生成。</div>
        </div>

        <!-- ⑥ 完成检查 -->
        <div v-else class="tv3-dw__rpane" data-testid="tv3-rpane-check">
          <div class="tv3-dw__rlabel">完成检查（明天的课还差什么）</div>
          <div class="tv3-dw__checks" data-testid="tv3-check-list">
            <div v-for="c in checks" :key="c.key" class="tv3-dw__check" :data-testid="`tv3-check-${c.key}`">
              <span :class="c.done ? 'tv3-dw__ok' : 'tv3-dw__todo'">{{ c.done ? '✓' : '✗' }}</span>
              <span>{{ c.label }}<template v-if="c.detail">（{{ c.detail }}）</template></span>
            </div>
          </div>
          <div class="tv3-dw__rfoot">检查项只对照共备稿内容，不代表"可上课"的最终判断——上课与否由教师决定。</div>
        </div>
      </aside>
    </div>

    <!-- 公式入口：主路径是块工具条「ƒ 公式」（行内编辑，不打断写作）；底部 dock 仅手写/语音等高级捕获 -->
    <footer class="tv3-dw__dock">
      <span style="font-size: 11.5px; color: var(--tv3-ink3); flex: 1" data-testid="tv3-desk-dock-hint">
        公式：点正文直接写文字，点块工具条「ƒ 公式」在光标处插入（行内编辑）；也可键入 $x^2$ 回车成公式
      </span>
      <button class="tv3-btn tv3-btn--sm tv3-btn--ghost-ai" data-testid="tv3-desk-dock-open" @click="dockOpen = true">✦ 数学输入台（手写 / 语音）</button>
    </footer>
    <MathCaptureDock :open="dockOpen" :target-label="dockTarget" smart-for="conic" @close="dockOpen = false" @insert="onDockInsert" />
  </div>
</template>

<script setup lang="ts">
/**
 * V3.4 二次备课共备桌（三栏工作台，可折叠）。
 * 左：来源桌（旧课/共案/演示教材页/班情/外部）——页级定位、批注、选区引用；
 * 中：连续共备稿——文档流 + 语义块，编辑/新增/删除/拖动重排/锁定/撤销；教材大图阅读二选一占用中栏；
 * 右：当前选区助手——AI/演示建议（diff+接受拒绝撤销）、资源候选（≤3 局部取用）、
 *     班情备注、提纲预览、课件候选预览（本地投影）、完成检查。
 * 所有失败态有诚实出口；持久化为本机演示保存（prepDesk.ts）。
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import FormulaTextEditor from '@/components/mathx/FormulaTextEditor.vue'
import MathCaptureDock from '@/components/mathx/MathCaptureDock.vue'
import { renderRich } from '@/components/mathx/latex'
import { updateTv3Context } from '@/stores/teacherContext'
import {
  usePrepDesk, DESK_BLOCK_LABELS, buildOutline, buildDeckCandidates, buildCompletionChecks,
  type DeskBlock, DeskBlockType, DeskSuggestion,
} from './prepDesk'
import { buildSuggestionsFor, buildResourcesFor, type DeskResourceCandidate } from './prepDeskData'

defineEmits<{ (e: 'back'): void }>()

const desk = usePrepDesk()
const lesson = desk.activeLesson

/* ---------- 选中块 ---------- */
const selectedBlockId = ref('')
const selectedBlock = computed(() => lesson.value?.blocks.find((b) => b.id === selectedBlockId.value) || null)
function selectBlock(id: string) {
  selectedBlockId.value = id
  desk.setStop(id)
}
function onBlockFocus(id: string) { selectedBlockId.value = id; desk.setStop(id) }

/* ---------- 块操作 ---------- */
const ADD_TYPES: DeskBlockType[] = ['text', 'core-question', 'example', 'checkpoint', 'class-note']
function addBlock(t: DeskBlockType) {
  const text = t === 'class-note' ? '本班调整理由：（把这次为这个班改动的理由写在这里，明年同课还能看到。）' : ''
  const nb = desk.insertBlock(selectedBlockId.value || null, { type: t, text, origin: 'manual' })
  selectedBlockId.value = nb.id
  scrollSoon(nb.id)
}
function onDragStart(e: DragEvent, id: string) { e.dataTransfer?.setData('text/plain', id) }
function onDrop(e: DragEvent, toIndex: number) {
  const id = e.dataTransfer?.getData('text/plain')
  if (id) desk.moveBlock(id, toIndex)
}
function sourceNameOf(b: DeskBlock): string {
  return lesson.value?.sources.find((s) => s.id === b.sourceRefId)?.name || b.sourceLocator || '外部来源'
}

/* ---------- 左栏来源桌 ---------- */
const leftOpen = ref(true)
const openSrcId = ref('')
const srcPageIdx = ref(0)
const openSrc = computed(() => lesson.value?.sources.find((s) => s.id === openSrcId.value) || null)
watch(openSrcId, () => { srcPageIdx.value = 0; clearSel() })
const srcLoadFailed = computed(() => desk.state.demoFailures.resource && !!openSrc.value?.pages?.length)
function retrySrc() { /* 演示：关闭失败开关即可重试成功 */ desk.setDemoFailure('resource', false) }
function srcStatusLabel(s: string) {
  return s === 'ok' ? '在库' : s === 'missing' ? '缺失' : s === 'unverified' ? '未核验' : '失效'
}
function srcTagClass(s: string) {
  return s === 'ok' ? 'tv3-tag--ok' : 'tv3-tag--warn'
}
const selText = ref('')
function onSelectInSource(e: MouseEvent) {
  // 指针落在引用浮动条内不重算（mousedown.prevent 已阻止清选区，这里兜底）
  if ((e.target as HTMLElement)?.closest?.('[data-testid="tv3-src-selbar"], [data-testid="tv3-reader-selbar"]')) return
  const sel = window.getSelection()
  const text = sel?.toString().trim() || ''
  selText.value = text.length > 2 ? text : ''
}
function clearSel() { selText.value = ''; window.getSelection()?.removeAllRanges() }
function quoteSelection() {
  if (!openSrc.value || !openSrc.value.pages) return
  quoteSelectionFrom(openSrc.value.id, openSrc.value.pages[srcPageIdx.value].label)
}
function quoteSelectionFrom(srcId: string, pageLabel: string) {
  const src = lesson.value?.sources.find((s) => s.id === srcId)
  if (!src) return
  const nb = desk.insertQuote(srcId, `${src.name} · ${pageLabel}`, selText.value, selectedBlockId.value || null)
  clearSel()
  if (nb) { selectedBlockId.value = nb.id; scrollSoon(nb.id); readingMode.value = false }
}
function excerpt(s: string, n = 24) {
  const flat = s.replace(/\s+/g, ' ').trim()
  return flat.length > n ? flat.slice(0, n) + '…' : flat
}
/** 展示型摘要一律剥掉 $..$ 定界符（教师不见 LaTeX 源码） */
const plain = (t: string) => t.replace(/\$([^$]*)\$/g, '$1')

/* ---------- 教材大图阅读（清单1：教材升主区） ---------- */
const readingMode = ref(false)
const readingSrcId = ref('')
const readingPageIdx = ref(0)
const readingSrc = computed(() => lesson.value?.sources.find((s) => s.id === readingSrcId.value) || null)
const readingPage = computed(() => readingSrc.value?.pages?.[Math.min(readingPageIdx.value, (readingSrc.value?.pages?.length ?? 1) - 1)] || null)
function openReading(srcId: string) {
  const src = lesson.value?.sources.find((s) => s.id === srcId)
  if (!src?.pages?.length) return
  // 资源失败演示态：不开大图，走左栏失败面板（诚实出口）
  if (desk.state.demoFailures.resource) { openSrcId.value = srcId; srcPageIdx.value = 0; return }
  readingSrcId.value = srcId
  readingPageIdx.value = 0
  readingMode.value = true
  rightOpen.value = false   // 读教材时助手让位（教师可再手动展开）
  clearSel()
}
function closeReading() { readingMode.value = false; clearSel() }

/* ---------- 右栏 ---------- */
/* 空白稿时右栏默认收起：先让教师看到教材与写作区，选中/有内容后再展开（清单2） */
const rightOpen = ref((lesson.value?.blocks.length ?? 0) > 0)
const rightTab = ref<'ai' | 'resource' | 'note' | 'outline' | 'deck' | 'check'>('ai')
const RTABS = [
  { key: 'ai' as const, label: '建议' },
  { key: 'resource' as const, label: '资源' },
  { key: 'note' as const, label: '班情' },
  { key: 'outline' as const, label: '提纲' },
  { key: 'deck' as const, label: '课件' },
  { key: 'check' as const, label: '检查' },
]

/* ---------- AI / 演示建议 ---------- */
interface GenState { status: 'idle' | 'running' | 'error'; actionLabel: string; err: string }
const gen = ref<GenState>({ status: 'idle', actionLabel: '', err: '' })
let genToken = 0
const justApplied = ref('')
function actionsFor(b: DeskBlock): DeskSuggestion[] {
  if (!lesson.value) return []
  return buildSuggestionsFor(b, lesson.value)
}
function runSuggestion(s: DeskSuggestion) {
  const token = ++genToken
  gen.value = { status: 'running', actionLabel: s.actionLabel, err: '' }
  window.setTimeout(() => {
    if (token !== genToken) return           // 已取消
    if (desk.state.demoFailures.ai) {
      gen.value = { status: 'error', actionLabel: s.actionLabel, err: '演示服务失败（演示开关打开）——共备稿内容未受影响，可继续手写或重试。' }
      return
    }
    desk.trackSuggestion({ ...s, id: `sg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` })
    gen.value = { status: 'idle', actionLabel: '', err: '' }
  }, 450)
}
function cancelGen() { genToken++; gen.value = { status: 'idle', actionLabel: '', err: '' } }
const pendingSuggestions = computed(() =>
  selectedBlock.value ? (lesson.value?.suggestions.filter((s) => s.targetBlockId === selectedBlock.value!.id && s.status === 'pending') || []) : [])
function isTargetLocked(s: DeskSuggestion): boolean {
  return !!lesson.value?.blocks.find((b) => b.id === s.targetBlockId)?.locked
}
function acceptSugg(s: DeskSuggestion) {
  desk.acceptSuggestion(s.id)
  justApplied.value = `已接受「${s.title}」`
  window.setTimeout(() => { justApplied.value = '' }, 6000)
}

/* ---------- 资源候选 ---------- */
const res = ref<{ status: 'idle' | 'loading' | 'ready' | 'error'; items: DeskResourceCandidate[] }>({ status: 'idle', items: [] })
let resToken = 0
const resJustTaken = ref('')
function loadResources() {
  if (!selectedBlock.value) { res.value = { status: 'ready', items: [] }; return }
  const token = ++resToken
  res.value = { status: 'loading', items: [] }
  window.setTimeout(() => {
    if (token !== resToken) return
    if (desk.state.demoFailures.resource) { res.value = { status: 'error', items: [] }; return }
    res.value = { status: 'ready', items: buildResourcesFor(selectedBlock.value!) }
  }, 350)
}
function cancelRes() { resToken++; res.value = { status: 'idle', items: [] } }
watch([selectedBlockId, rightTab], ([, tab]) => { if (tab === 'resource') loadResources() })
function takeResource(c: DeskResourceCandidate) {
  if (c.availability === 'stale') return
  const nb = desk.insertBlock(selectedBlockId.value || null, {
    type: c.takeType, text: c.takeText, origin: 'resource',
    sourceRefId: c.sourceRefId, sourceLocator: c.sourceRefId ? undefined : `${c.layerLabel} · ${c.locator}`,
  })
  selectedBlockId.value = nb.id
  scrollSoon(nb.id)
  resJustTaken.value = `已把「${c.name}」只取一段插入共备稿（来源已标注）`
  window.setTimeout(() => { resJustTaken.value = '' }, 6000)
}
function focusEditor() {
  const id = selectedBlockId.value || lesson.value?.blocks[lesson.value.blocks.length - 1]?.id || ''
  if (!id) return
  selectedBlockId.value = id
  void nextTick(() => {
    const surface = document.querySelector<HTMLElement>(`[data-testid="tv3-desk-block-text-${id}"] .ftex__surface`)
    surface?.click()
    surface?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  })
}
function insertManualQuote() {
  const nb = desk.insertBlock(selectedBlockId.value || null, {
    type: 'quote', text: '【手动引用】（补：名称 / 来源类别 / 页码定位 / 适用说明）', origin: 'manual',
  })
  selectedBlockId.value = nb.id
  scrollSoon(nb.id)
}
function insertClassNote() {
  const nb = desk.insertBlock(selectedBlockId.value || null, {
    type: 'class-note',
    text: `本班调整理由：结合班情「${excerpt(lesson.value?.classNote || '', 20)}」，本课调整为……（写明为什么这么改）`,
    origin: 'manual',
  })
  selectedBlockId.value = nb.id
  scrollSoon(nb.id)
  rightTab.value = 'ai'
}

/* ---------- 右栏空态：从去年课与班情给起点（清单4） ---------- */
const lastYearNote = computed(() => {
  const src = lesson.value?.sources.find((s) => s.kind === 'old-lesson' && s.pages?.length)
  const page = src?.pages?.find((p) => p.id.includes('3')) || src?.pages?.[src.pages.length - 1]
  return page ? excerpt(page.body.replace(/\s+/g, ' '), 52) : '（去年课后记未上传）'
})
/** 取备课组共案问题链：把共案引入问题链插入为第一块核心问题（真实落稿动作） */
function takeCommonPlanChain() {
  const plan = lesson.value?.sources.find((s) => s.kind === 'common-plan')
  const page = plan?.pages?.[0]
  const chain = page ? page.body.split('\n').filter((l) => l.trim()).slice(1, 4).map((l) => l.trim()).join('\n') : ''
  if (!chain) return
  const nb = desk.insertBlock(null, { type: 'core-question', text: chain, origin: 'resource', sourceRefId: plan?.id, sourceLocator: page ? `${plan.name} · ${page.label}` : undefined })
  selectedBlockId.value = nb.id
  scrollSoon(nb.id)
}

/* ---------- 投影 / 检查 ---------- */
const outline = computed(() => (lesson.value ? buildOutline(lesson.value) : []))
const checks = computed(() => (lesson.value ? buildCompletionChecks(lesson.value) : []))
function rebuildDeck() {
  if (!lesson.value) return
  lesson.value.projections = {
    builtAt: new Date().toLocaleString('zh-CN', { hour12: false }),
    outline: buildOutline(lesson.value),
    deckCandidates: buildDeckCandidates(lesson.value),
  }
  desk.saveNow('生成课件候选预览')
}

/* ---------- 撤销 / 演示控制 ---------- */
const lastUndoLabel = computed(() => desk.state.undo[desk.state.undo.length - 1]?.label || '')
function onUndo() {
  const label = desk.undoTop()
  if (label) justApplied.value = `已撤销：${label}`
}
function onReset() {
  if (!window.confirm('重置演示数据？当前本机保存的共备稿会被重建为演示初始状态。')) return
  desk.resetAll()
}

/* ---------- 数学输入台 ---------- */
const dockOpen = ref(false)
type Ftex = { insertAtCaret: (latex: string) => void; insertFormulaInline: () => void }
const ftexRefs: Record<string, Ftex | null> = {}
function setFtexRef(el: Ftex | null, key: string) { if (el) ftexRefs[key] = el }
const dockTarget = computed(() =>
  selectedBlock.value ? `共备稿 > ${DESK_BLOCK_LABELS[selectedBlock.value.type]} > 光标处` : '未选中块')
function onDockInsert(latex: string) {
  if (selectedBlock.value) ftexRefs[selectedBlock.value.id]?.insertAtCaret(latex)
  dockOpen.value = false
}
function scrollSoon(blockId: string) {
  void nextTick(() => document.querySelector(`[data-testid="tv3-desk-block-${blockId}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' }))
}

/* ---------- 样式辅助 ---------- */
function blockTagClass(t: DeskBlockType): string {
  if (t === 'core-question') return 'tv3-tag--primary'
  if (t === 'example') return 'tv3-tag--gold'
  if (t === 'checkpoint') return 'tv3-tag--ok'
  if (t === 'class-note') return 'tv3-tag--gold'
  if (t === 'quote') return 'tv3-tag--warn'
  return ''
}

/* ---------- 管家上下文 ---------- */
watch(lesson, (l) => {
  updateTv3Context({
    route: '/teacher-v3/prep',
    topic: l?.topic,
    class_name: l?.className,
    selection: selectedBlock.value ? { type: 'text', summary: `共备稿「${DESK_BLOCK_LABELS[selectedBlock.value.type]}」块` } : undefined,
  })
})
const shortChapter = computed(() => excerpt(lesson.value?.chapter || '', 16))
const shortNote = computed(() => excerpt(plain((lesson.value?.classNote || '').replace('本班班情（演示备注）：', '')), 18))

/* 刷新/关页前把防抖中的编辑立即落盘（600ms 窗口内的编辑不丢） */
function flushOnLeave() { desk.saveNow('离开前保存') }
onMounted(() => window.addEventListener('beforeunload', flushOnLeave))
onBeforeUnmount(() => window.removeEventListener('beforeunload', flushOnLeave))
</script>

<style scoped>
.tv3-dw { display: flex; flex-direction: column; gap: 8px; }
.tv3-dw__bar { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; padding: 8px 10px; background: var(--tv3-card, #fff); border: 1px solid var(--tv3-line); border-radius: 12px; }
.tv3-dw__topic { font-size: 14.5px; font-weight: 700; max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tv3-dw__save { font-size: 11.5px; color: var(--tv3-teal, #0e9488); white-space: nowrap; }
.tv3-dw__save.is-error { color: #b1382c; font-weight: 600; }
.tv3-dw__log summary, .tv3-dw__demo summary { font-size: 11.5px; color: var(--tv3-ink3); cursor: pointer; user-select: none; white-space: nowrap; }
.tv3-dw__log-panel, .tv3-dw__demo-panel {
  position: absolute; right: 10px; top: 44px; z-index: 60; width: 300px; padding: 10px 12px;
  background: var(--tv3-card, #fff); border: 1px solid var(--tv3-line); border-radius: 12px; box-shadow: var(--tv3-shadow-md, 0 8px 24px rgba(15, 40, 80, 0.14));
}
.tv3-dw__log { position: relative; }
.tv3-dw__demo { position: relative; }
.tv3-dw__log-row { font-size: 11px; color: var(--tv3-ink2); line-height: 1.8; border-bottom: 1px dashed var(--tv3-line); }
.tv3-dw__demo-title { font-size: 11px; font-weight: 700; color: var(--tv3-ink2); margin-bottom: 6px; }
.tv3-dw__demo-row { display: flex; gap: 6px; align-items: center; font-size: 12px; padding: 3px 0; }
.tv3-dw__demo-panel .tv3-btn--danger { margin-top: 8px; width: 100%; justify-content: center; }
/* 弹性三栏：中栏永远吃掉全部剩余宽度；任一栏收起即把宽度归还给中栏（清单2） */
.tv3-dw__cols { display: flex; gap: 10px; align-items: stretch; height: calc(100vh - 205px); min-height: 430px; }
@media (max-width: 1200px) { .tv3-dw__left { width: 240px; } .tv3-dw__right { width: 280px; } }
.tv3-dw__left, .tv3-dw__right { flex: 0 0 auto; width: 300px; overflow-y: auto; height: 100%; background: var(--tv3-card, #fff); border: 1px solid var(--tv3-line); border-radius: 12px; padding: 10px; display: flex; flex-direction: column; gap: 8px; }
.tv3-dw__right { width: 330px; }
.tv3-dw__center { flex: 1 1 0; min-width: 0; overflow-y: auto; height: 100%; background: var(--tv3-bg2, #f4f6fa); border: 1px solid var(--tv3-line); border-radius: 12px; padding: 10px; display: flex; flex-direction: column; gap: 8px; }
.tv3-dw__left-head { font-size: 12.5px; font-weight: 700; display: flex; flex-direction: column; gap: 2px; }
.tv3-dw__left-sub { font-size: 10px; color: var(--tv3-ink4); font-weight: 400; }
.tv3-dw__src-list { display: flex; flex-direction: column; gap: 5px; }
.tv3-dw__src { display: flex; flex-direction: column; gap: 2px; align-items: flex-start; text-align: left; padding: 7px 9px; border: 1px solid var(--tv3-line); border-radius: 10px; background: var(--tv3-bg2, #f4f6fa); cursor: pointer; }
.tv3-dw__src.is-active { border-color: var(--tv3-primary, #4f46e5); background: #fff; }
.tv3-dw__src-name { font-size: 12px; font-weight: 600; line-height: 1.5; }
.tv3-dw__src-loc { font-size: 10.5px; color: var(--tv3-ink3); }
.tv3-dw__src-detail { border: 1px solid var(--tv3-line); border-radius: 10px; padding: 8px; display: flex; flex-direction: column; gap: 6px; background: #fff; }
.tv3-dw__src-detail-head { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
.tv3-dw__src-note { font-size: 10.5px; color: var(--tv3-gold-deep, #0e7490); background: var(--tv3-gold-soft, #fdf6e3); border-radius: 8px; padding: 5px 8px; line-height: 1.6; }
.tv3-dw__pages { display: flex; gap: 4px; flex-wrap: wrap; }
.tv3-dw__page-tab { font-size: 10.5px; padding: 2px 8px; border-radius: 999px; border: 1px solid var(--tv3-line); background: var(--tv3-bg2, #f4f6fa); cursor: pointer; }
.tv3-dw__page-tab.is-active { background: var(--tv3-primary, #4f46e5); color: #fff; border-color: var(--tv3-primary, #4f46e5); }
.tv3-dw__page-body { position: relative; border: 1px solid var(--tv3-line); border-radius: 10px; background: #f8fafc; padding: 10px 12px; font-size: 12.5px; line-height: 1.9; max-height: 200px; overflow-y: auto; }
.tv3-dw__page-tagline { font-size: 10px; color: var(--tv3-ink4); margin-bottom: 4px; }
.tv3-dw__page-text { white-space: pre-wrap; user-select: text; }
.tv3-dw__selbar { position: sticky; bottom: 0; display: flex; gap: 6px; align-items: center; margin-top: 6px; padding: 6px 8px; background: #fff; border: 1px solid var(--tv3-gold, #0891b2); border-radius: 10px; }
.tv3-dw__selbar-text { font-size: 11px; color: var(--tv3-ink3); flex: 1; }
.tv3-dw__anno-label { font-size: 10.5px; color: var(--tv3-ink3); margin-bottom: 2px; }
.tv3-dw__src-missing, .tv3-dw__src-fail { font-size: 11.5px; color: #a34b40; background: #fdf3f3; border: 1px solid #f0c9c6; border-radius: 10px; padding: 8px 10px; line-height: 1.7; }
.tv3-dw__src-hint { font-size: 11px; color: var(--tv3-ink3); line-height: 1.7; }
.tv3-dw__center-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.tv3-dw__blank { font-size: 12.5px; color: var(--tv3-ink2); background: #fff; border: 1px dashed var(--tv3-line); border-radius: 12px; padding: 18px; line-height: 1.8; text-align: center; }
.tv3-dw__blocks { display: flex; flex-direction: column; gap: 8px; }
.tv3-dw__block { background: #fff; border: 1px solid var(--tv3-line); border-radius: 12px; padding: 8px 12px 10px; cursor: default; }
.tv3-dw__block.is-selected { border-color: var(--tv3-primary, #4f46e5); box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.14); }
.tv3-dw__block.is-locked { background: #fbfbf8; }
.tv3-dw__block-bar { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
.tv3-dw__drag { cursor: grab; color: var(--tv3-ink4); font-size: 13px; letter-spacing: -1px; padding: 0 4px; user-select: none; }
.tv3-dw__mini { font-size: 10.5px; padding: 1px 7px; border: 1px solid var(--tv3-line); border-radius: 8px; background: #fff; color: var(--tv3-ink2); cursor: pointer; }
.tv3-dw__mini:disabled { opacity: 0.45; cursor: not-allowed; }
.tv3-dw__block-src { font-size: 10.5px; color: var(--tv3-gold-deep, #0e7490); background: var(--tv3-gold-soft, #fdf6e3); border-radius: 8px; padding: 3px 8px; margin-bottom: 4px; display: inline-block; }
.tv3-dw__lockedtext { font-size: 13px; line-height: 1.8; color: var(--tv3-ink2); white-space: pre-wrap; }
.tv3-dw__addbar { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; padding: 8px 10px; background: #fff; border: 1px dashed var(--tv3-line); border-radius: 12px; position: sticky; bottom: 0; }
.tv3-dw__rtabs { display: flex; gap: 3px; flex-wrap: wrap; }
.tv3-dw__rtab { font-size: 11.5px; padding: 3px 9px; border-radius: 999px; border: 1px solid var(--tv3-line); background: var(--tv3-bg2, #f4f6fa); cursor: pointer; }
.tv3-dw__rtab.is-active { background: var(--tv3-primary, #4f46e5); color: #fff; border-color: var(--tv3-primary, #4f46e5); }
.tv3-dw__rpane { display: flex; flex-direction: column; gap: 8px; }
.tv3-dw__rlabel { font-size: 11.5px; font-weight: 700; color: var(--tv3-ink2); }
.tv3-dw__rhint { font-size: 11.5px; color: var(--tv3-ink3); line-height: 1.7; }
.tv3-dw__rfoot { font-size: 10.5px; color: var(--tv3-ink4); line-height: 1.6; border-top: 1px dashed var(--tv3-line); padding-top: 6px; }
.tv3-dw__ctxbox { background: var(--tv3-bg2, #f4f6fa); border: 1px solid var(--tv3-line); border-radius: 10px; padding: 8px 10px; display: flex; flex-direction: column; gap: 3px; }
.tv3-dw__ctxrow { font-size: 11px; color: var(--tv3-ink2); line-height: 1.6; }
.tv3-dw__acts { display: flex; gap: 6px; flex-wrap: wrap; }
.tv3-dw__gen { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--tv3-ink2); background: var(--tv3-bg2, #f4f6fa); border-radius: 10px; padding: 8px 10px; }
.tv3-dw__gen.is-error { color: #a34b40; background: #fdf3f3; border: 1px solid #f0c9c6; }
.tv3-dw__sugg { border: 1px solid var(--tv3-line); border-radius: 12px; padding: 9px 11px; display: flex; flex-direction: column; gap: 6px; background: #fff; }
.tv3-dw__sugg-head { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
.tv3-dw__sugg-why { font-size: 11px; color: var(--tv3-ink3); line-height: 1.7; }
.tv3-dw__paths { display: flex; flex-direction: column; gap: 5px; }
.tv3-dw__path { display: flex; gap: 6px; font-size: 11.5px; line-height: 1.6; padding: 6px 8px; border: 1px solid var(--tv3-line); border-radius: 8px; cursor: pointer; }
.tv3-dw__diff { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
.tv3-dw__diff-tag { font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 6px 6px 0 0; }
.tv3-dw__diff-tag--before { background: #f3e9e7; color: #a34b40; }
.tv3-dw__diff-tag--after { background: #e3efe9; color: #1c6b4a; }
.tv3-dw__diff-body { border: 1px solid var(--tv3-line); border-top: none; border-radius: 0 0 8px 8px; padding: 6px 8px; font-size: 11.5px; line-height: 1.7; min-height: 38px; max-height: 150px; overflow-y: auto; white-space: pre-wrap; background: #fff; }
.tv3-dw__verify { font-size: 11px; color: #0e7490; background: var(--tv3-gold-soft, #fdf6e3); border-radius: 8px; padding: 4px 8px; }
.tv3-dw__sugg-foot { display: flex; gap: 6px; }
.tv3-dw__applied { display: flex; gap: 8px; align-items: center; font-size: 12px; color: #1c6b4a; background: #e9f6f1; border: 1px solid #bfe3d4; border-radius: 10px; padding: 6px 10px; }
.tv3-dw__res { border: 1px solid var(--tv3-line); border-radius: 12px; padding: 9px 11px; display: flex; flex-direction: column; gap: 5px; background: #fff; }
.tv3-dw__res-head { display: flex; gap: 6px; align-items: center; justify-content: space-between; flex-wrap: wrap; }
.tv3-dw__res-meta { font-size: 10.5px; color: var(--tv3-ink3); }
.tv3-dw__res-why { font-size: 11px; color: var(--tv3-ink2); line-height: 1.6; }
.tv3-dw__res-preview { font-size: 11.5px; background: var(--tv3-bg2, #f4f6fa); border-radius: 8px; padding: 6px 8px; line-height: 1.7; }
.tv3-dw__res-note { font-size: 10.5px; color: #a34b40; line-height: 1.6; }
.tv3-dw__cand { border: 1px solid var(--tv3-line); border-radius: 12px; padding: 9px 11px; display: flex; flex-direction: column; gap: 6px; background: #fff; }
.tv3-dw__cand.is-disabled { opacity: 0.62; }
.tv3-dw__cand-page { border: 1px dashed var(--tv3-line); border-radius: 10px; padding: 6px 9px; background: #fbfcfe; }
.tv3-dw__cand-page-title { font-size: 11px; font-weight: 700; color: var(--tv3-primary, #4f46e5); margin-bottom: 3px; }
.tv3-dw__cand-line { font-size: 11px; color: var(--tv3-ink2); line-height: 1.7; }
.tv3-dw__outline { margin: 0; padding-left: 0; list-style: none; display: flex; flex-direction: column; gap: 5px; counter-reset: ol; }
.tv3-dw__outline-row { display: flex; gap: 6px; align-items: flex-start; font-size: 11.5px; line-height: 1.6; padding: 4px 6px; background: #fff; border: 1px solid var(--tv3-line); border-radius: 8px; counter-increment: ol; }
.tv3-dw__outline-row::before { content: counter(ol); font-size: 10px; color: var(--tv3-ink4); min-width: 14px; text-align: right; }
.tv3-dw__outline-text { flex: 1; min-width: 0; color: var(--tv3-ink2); }
.tv3-dw__checks { display: flex; flex-direction: column; gap: 5px; }
.tv3-dw__check { display: flex; gap: 7px; align-items: center; font-size: 12px; color: var(--tv3-ink2); }
.tv3-dw__ok { color: #1c6b4a; font-weight: 700; }
.tv3-dw__todo { color: #a34b40; font-weight: 700; }
.tv3-dw__dock { display: flex; gap: 10px; align-items: center; padding: 7px 12px; background: var(--tv3-card, #fff); border: 1px solid var(--tv3-line); border-radius: 12px; }
/* 教材大图阅读（清单1）：整页版式占中栏，阅读列 780px、15px/2.1 行距 */
.tv3-dw__reader-page { flex: 1; display: flex; flex-direction: column; align-items: center; overflow-y: auto; padding: 4px 6px 10px; }
.tv3-dw__reader-body { width: 100%; max-width: 780px; background: #f8fafc; border: 1px solid var(--tv3-line); border-radius: 14px; padding: 26px 34px 18px; position: relative; }
.tv3-dw__reader-title { font-size: 16px; font-weight: 800; color: var(--tv3-ink, #16233b); margin-bottom: 12px; }
.tv3-dw__reader-text { font-size: 15px; line-height: 2.1; color: var(--tv3-ink2); white-space: pre-wrap; user-select: text; }
.tv3-dw__reader-fig { max-width: 460px; margin: 16px auto 4px; background: #fff; border: 1px solid var(--tv3-line); border-radius: 12px; padding: 10px; }
.tv3-dw__reader-fig :deep(svg) { width: 100%; height: auto; display: block; }
.tv3-dw__reader-note { margin-top: 14px; font-size: 11px; color: var(--tv3-ink4); line-height: 1.7; border-top: 1px dashed var(--tv3-line); padding-top: 8px; }
/* 右栏空态起点卡（清单4） */
.tv3-dw__start { display: flex; flex-direction: column; gap: 8px; }
.tv3-dw__start-card { background: var(--tv3-bg2, #f4f6fa); border: 1px solid var(--tv3-line); border-radius: 10px; padding: 8px 10px; }
.tv3-dw__start-title { font-size: 11.5px; font-weight: 700; color: var(--tv3-ink2); margin-bottom: 4px; }
.tv3-dw__start-body { font-size: 12px; color: var(--tv3-ink2); line-height: 1.8; }
.tv3-dw__start .tv3-btn { justify-content: center; }
</style>
