<template>
  <div class="dcx-shell">
    <!-- ===== 顶栏：品牌 / 课程进度 / 计时 / 播控 / 全屏 / 导出 / 报告 ===== -->
    <header class="dcx-top">
      <div class="dcx-brand" @click="goBack" title="返回学生端">
        <span class="dcx-logo">🎓</span>
        <b>教学双师课堂</b>
      </div>
      <template v-if="playing">
        <span class="dcx-vline"></span>
        <div class="dcx-course">
          <span class="dcx-course-name" :title="session.title">{{ session.title }}</span>
          <span class="dcx-pagechip">{{ curIndex + 1 }} / {{ session.slides.length }}</span>
          <div class="dcx-section-wrap">
            <button class="dcx-section" @click.stop="outlinePop = !outlinePop">
              {{ currentOutlineTitle }}<i>▾</i>
            </button>
            <div v-if="outlinePop" class="dcx-pop" @click.stop>
              <div
                v-for="(o, i) in session.outlines" :key="o.order || i"
                class="dcx-pop-item" :class="{ on: i === curIndex }"
                @click="jumpTo(i); outlinePop = false"
              >{{ String(i + 1).padStart(2, '0') }} · {{ o.title }}</div>
            </div>
          </div>
        </div>
      </template>
      <span v-else class="dcx-course-sub">主讲授课 + AI 助教 · 真实课堂</span>

      <div class="dcx-top-right">
        <template v-if="playing">
          <span class="dcx-timer">⏱ {{ clockLabel }}</span>
          <button class="dcx-round" :class="{ on: speaking }" :title="speaking ? '暂停朗读' : '朗读本页'" @click="toggleSpeak">{{ speaking ? '⏸' : '▶' }}</button>
          <button class="dcx-round" title="停止朗读" @click="stopSpeak">⏹</button>
        </template>
        <button class="dcx-tbtn solid" @click="toggleFullscreen">⛶ 全屏课堂</button>
        <button class="dcx-tbtn" :disabled="!playing" @click="exportCourseware">⤓ 导出课件</button>
        <button class="dcx-tbtn" :disabled="!playing" @click="reportOpen = true">📄 课堂报告</button>
        <button
          v-if="playing && (originQuestion.text || originQuestion.fileId)"
          class="dcx-tbtn" :class="{ on: originOpen }" @click="originOpen = !originOpen"
        >原题</button>
        <div class="dcx-settings">
          <button class="dcx-round" title="朗读设置" @click="settingsOpen = !settingsOpen">⚙</button>
          <div v-if="settingsOpen" class="dcx-menu" @click.stop>
            <div class="dcx-menu-row">
              <span>讲课文音色</span>
              <select v-model="ttsVoice" class="dcx-input">
                <option value="xiaoxiao">晓晓（女·温柔）</option>
                <option value="yunxi">云希（男·阳光）</option>
                <option value="yunyang">云扬（男·播音）</option>
                <option value="xiaoyi">晓伊（女·活泼）</option>
              </select>
            </div>
            <div class="dcx-menu-row">
              <span>朗读声音</span>
              <select v-model="currentVoiceName" class="dcx-input" @change="onVoiceSelect">
                <option value="">系统默认</option>
                <option v-for="v in listChineseVoices(voices)" :key="v.voiceURI" :value="v.name">{{ v.name }}</option>
              </select>
            </div>
            <div class="dcx-menu-row">
              <span>朗读语速</span>
              <select v-model="speakRate" class="dcx-input">
                <option :value="0.8">0.8×</option>
                <option :value="1">1×</option>
                <option :value="1.25">1.25×</option>
              </select>
            </div>
            <label class="dcx-menu-row check"><input v-model="autoRead" type="checkbox" /> 翻页自动朗读</label>
          </div>
        </div>
        <span class="dcx-avatar" title="我"><img :src="studentAvatar" alt="我" style="width: 100%; height: 100%; object-fit: cover; display: block" /></span>
      </div>
    </header>
    <div v-if="settingsOpen || outlinePop" class="dcx-clickmask" @click="settingsOpen = false; outlinePop = false"></div>

    <!-- ===== 原题浮层 ===== -->
    <div v-if="originOpen && (originQuestion.text || originQuestion.imgUrl)" class="dcx-origin">
      <div class="dcx-origin-head">
        <b>📄 原题{{ originQuestion.filename ? ' · ' + originQuestion.filename : '' }}</b>
        <button class="dcx-ghost" @click="originOpen = false">✕</button>
      </div>
      <div class="dcx-origin-body">
        <MarkdownView v-if="originQuestion.text" :text="originQuestion.text" />
        <img v-if="originQuestion.imgUrl" :src="originQuestion.imgUrl" alt="原题图片" class="dcx-origin-img" />
      </div>
    </div>

    <!-- ===== 课堂主体（三栏） ===== -->
    <div v-if="playing" class="dcx-body">
      <!-- 左：课程大纲 / 课堂回顾 / 进度 / 课程目标 -->
      <aside class="dcx-left">
        <div class="dcx-card">
          <div class="dcx-card-title"><span class="dcx-tico">📋</span> 课程大纲</div>
          <div class="dcx-outline">
            <div
              v-for="(o, i) in session.outlines" :key="o.order || i"
              class="dcx-oitem" :class="{ active: i === curIndex, done: i < curIndex }"
              @click="jumpTo(i)"
            >
              <span class="dcx-ono">{{ i + 1 }}</span>
              <span class="dcx-ot">{{ o.title }}</span>
              <span v-if="i < curIndex" class="dcx-ock">✓</span>
            </div>
          </div>
          <button class="dcx-side-link" @click="newClassroom">＋ 新建课堂</button>
        </div>
        <div class="dcx-card dcx-links">
          <button class="dcx-side-link big" @click="reviewOpen = true">🗂 课堂回顾</button>
          <button class="dcx-side-link big" @click="router.push('/graph')">🕸 知识图谱</button>
        </div>
        <div class="dcx-card">
          <div class="dcx-learned">本节课已学 {{ learnedMinutes }} 分钟</div>
          <div class="dcx-bar"><div class="dcx-fill" :style="{ width: pg }"></div></div>
        </div>
        <div v-if="sections.goals.length" class="dcx-card">
          <div class="dcx-card-title"><span class="dcx-tico">🎯</span> 课程目标</div>
          <div v-for="(g, gi) in sections.goals" :key="gi" class="dcx-goal"><i>✓</i>{{ g }}</div>
        </div>
      </aside>

      <!-- 中：当前讲解 + 白板页签 -->
      <main class="dcx-center">
        <div v-if="session.status === 'generating'" class="dcx-state">
          <span class="dcx-spinner"></span>
          <div>
            <b>AI 正在备课…</b>
            <p>先搭大纲，再逐页写内容与图形（{{ session.slide_count }} 页 · {{ modeLabel(session.mode) }}），完成后自动进入课堂。</p>
          </div>
        </div>
        <div v-else-if="session.status === 'failed'" class="dcx-state err">
          <b>课堂生成失败</b>
          <p>{{ session.error || '请稍后重试' }}</p>
          <button class="dcx-btn primary" @click="retryFailed(session)">↻ 重新生成</button>
        </div>
        <template v-else-if="currentSlide">
          <span class="dcx-current-tag">当前讲解</span>
          <div class="dcx-lesson">
            <h1 class="dcx-ltitle">
              {{ currentSlide.title }}
              <small v-if="currentSlide.subtitle">{{ currentSlide.subtitle }}</small>
            </h1>

            <div class="dcx-lgrid" :class="{ 'no-fig': !sections.figures.length }">
              <div class="dcx-lmain">
                <!-- 定理 / 概念框 -->
                <div v-for="(t, ti) in sections.theorems" :key="'t' + ti" class="dcx-theorem">
                  <div class="dcx-theorem-head">
                    <span class="dcx-badge blue">定理</span>
                    <b v-if="t.title">{{ t.title }}</b>
                  </div>
                  <LatexText :text="t.body" class="dcx-theorem-body" />
                </div>
                <!-- 讲解段落 -->
                <p v-for="(b, bi) in sections.lecture" :key="'p' + bi" class="dcx-para">{{ b.text }}</p>
                <!-- 例题（解 + 分步板书） -->
                <div v-for="(ex, ei) in sections.examples" :key="'e' + ei" class="dcx-example">
                  <div class="dcx-theorem-head">
                    <span class="dcx-badge green">例题</span>
                    <LatexText :text="ex.question" class="dcx-exq" />
                  </div>
                  <div v-if="ex.analysis" class="dcx-sol">
                    <span class="dcx-solmark">解</span>
                    <div class="dcx-solsteps">
                      <div v-for="(st, si) in splitSteps(ex.analysis)" :key="si" class="dcx-step">
                        <LatexText :text="st" />
                      </div>
                    </div>
                  </div>
                  <div v-if="ex.answer" class="dcx-answer">
                    <b>结论</b>
                    <LatexText :text="wrapLatex(ex.answer)" />
                  </div>
                </div>
                <!-- 数据表格（如单调性讨论表） -->
                <table v-for="(tb, tbi) in sections.tables" :key="'tb' + tbi" class="dcx-table">
                  <caption v-if="tb.caption">{{ tb.caption }}</caption>
                  <thead>
                    <tr><th v-for="(h, hi) in tb.headers" :key="hi"><LatexText :text="h" /></th></tr>
                  </thead>
                  <tbody>
                    <tr v-for="(row, ri) in tb.rows" :key="ri">
                      <td v-for="(c, ci) in row" :key="ci"><LatexText :text="c" /></td>
                    </tr>
                  </tbody>
                </table>
                <!-- 结论 / 易错 -->
                <div v-for="(n, ni) in sections.summary" :key="'n' + ni" class="dcx-conclusion">
                  <i>💡</i><LatexText :text="n.text" />
                </div>
                <!-- 教材关联（仅在有真实出处时出现） -->
                <div v-if="sections.textbook && (sections.textbook.citations || []).length" class="dcx-textbook">
                  📚 教材关联：
                  <span v-for="(c, ci) in sections.textbook.citations" :key="ci" class="dcx-tcite">
                    {{ [c.book, c.volume, c.section, c.subsection].filter(Boolean).join(' · ') || c.title }}
                  </span>
                </div>
              </div>

              <!-- 图形列 -->
              <div v-if="sections.figures.length" class="dcx-lfig">
                <template v-for="(f, fi) in sections.figures" :key="'f' + fi">
                  <MathFigure3D v-if="f.kind === 'geometry'" :figure="f.figure" :caption="f.caption" />
                  <template v-else-if="f.kind === 'plot2d'">
                    <div v-if="f.caption" class="dcx-figcap">📈 {{ f.caption }}</div>
                    <GraphBlock :graph="toGraphBlock(f)" />
                  </template>
                  <template v-else-if="f.kind === 'ggb' && f.ggb">
                    <DynamicFigureViewer :items="[f.ggb]" :label="f.caption || '交互图形'" :height="320" />
                  </template>
                </template>
              </div>
            </div>

            <!-- AI 主讲讲稿 -->
            <div class="dcx-teach">
              <div class="dcx-tavatar lead"><img :src="teacherAvatar" alt="AI主讲" style="width: 100%; height: 100%; object-fit: cover; display: block" /></div>
              <div class="dcx-tbubble">
                <div class="dcx-tbhead">
                  <span class="dcx-tbname">AI主讲</span>
                  <span v-if="speaking" class="dcx-tbstate"><i class="dcx-wave"><b v-for="n in 18" :key="n"></b></i>讲解中</span>
                </div>
                <p class="dcx-tbtext">{{ currentSlide.narration || '本页讲解要点：' + sections.goals.join('；') }}</p>
              </div>
              <div class="dcx-tutor-mini">
                <div class="dcx-tavatar ai"><img :src="tutorAvatar" alt="AI助教" style="width: 100%; height: 100%; object-fit: cover; display: block" /></div>
                <b>AI助教</b>
                <em>在线 · 待回答</em>
                <button class="dcx-mini-ask" @click="focusAsk">提问</button>
              </div>
            </div>
          </div>

          <!-- 白板 / 公式工具 / 笔记 -->
          <div class="dcx-board">
            <div class="dcx-btabs">
              <button :class="{ on: boardTab === 'wb' }" @click="boardTab = 'wb'">白板推导</button>
              <button :class="{ on: boardTab === 'tools' }" @click="boardTab = 'tools'">公式工具</button>
              <button :class="{ on: boardTab === 'notes' }" @click="boardTab = 'notes'">课堂笔记</button>
              <span v-if="boardTab === 'wb' && sections.formulas.length" class="dcx-bthint">板书已随讲解自动写入 ↓ 可直接手写批注</span>
            </div>
            <div v-show="boardTab === 'wb'" class="dcx-wb">
              <div v-if="sections.formulas.length" class="dcx-wbsteps">
                <div
                  v-for="(f, fi) in visibleWbSteps" :key="fi"
                  class="dcx-wbstep" :class="{ now: fi === boardRevealed - 1 }"
                >
                  <span class="dcx-wbno">{{ fi + 1 }}</span>
                  <LatexText :text="'$' + (f.latex || '') + '$'" />
                </div>
              </div>
              <p v-else class="dcx-wbempty">本页板书会随讲解自动写入；也可以直接在下方手写推导。</p>
              <WhiteboardCanvas :page="curIndex" />
            </div>
            <div v-show="boardTab === 'tools'" class="dcx-tools">
              <p class="dcx-toolstip">本课全部公式（点击复制，可粘贴到笔记或提问）</p>
              <button
                v-for="(f, fi) in sessionFormulas" :key="fi" class="dcx-fchip"
                :title="'点击复制：' + f.latex"
                @click="copyFormula(f.latex)"
              ><LatexText :text="'$' + (f.latex || '') + '$'" /></button>
              <p v-if="!sessionFormulas.length" class="dcx-wbempty">本课暂无公式。</p>
            </div>
            <div v-show="boardTab === 'notes'" class="dcx-notes">
              <textarea
                v-model="notes" class="dcx-input dcx-notes-area"
                placeholder="写下本页关键结论、自己的推导思路…（云端自动保存）"
                @input="saveNotes"
              ></textarea>
            </div>
          </div>

          <!-- 页脚：掌握标记 + 翻页 -->
          <div class="dcx-foot">
            <div class="dcx-foot-l">
              <span class="dcx-foot-q">这页掌握了吗？</span>
              <button class="dcx-chipbtn" :class="{ ok: selfCheck === 'ok' }" @click="markCheck('ok')">✅ 记住了</button>
              <button class="dcx-chipbtn" :class="{ again: selfCheck === 'again' }" @click="markCheck('again')">🔁 要重听</button>
            </div>
            <div class="dcx-foot-mid">
              <div class="dcx-bar slim"><div class="dcx-fill" :style="{ width: pg }"></div></div>
              <span>第 {{ curIndex + 1 }} / {{ session.slides.length }} 页 · {{ currentSlide.minutes || 3 }} 分钟</span>
            </div>
            <div class="dcx-foot-r">
              <button class="dcx-btn" :disabled="curIndex === 0" @click="go(-1)">⟨ 上一页</button>
              <button v-if="curIndex < session.slides.length - 1" class="dcx-btn primary" @click="go(1)">下一页 ⟩</button>
              <button v-else class="dcx-btn primary" @click="reportOpen = true">✓ 学完本课</button>
            </div>
          </div>
        </template>
      </main>

      <!-- 右：AI助教答疑 + 分层练习 -->
      <aside class="dcx-right">
        <div class="dcx-card dcx-tutor">
          <div class="dcx-card-title">
            <span class="dcx-tico">💬</span> AI助教答疑
            <button class="dcx-ghost" title="重新开始对话" @click="resetTutor">↻</button>
          </div>
          <div class="dcx-upload" @click="photoInput?.click()">
            <span class="dcx-upico">☁️</span>
            <span class="dcx-uptxt">
              <b>上传我的题目</b>
              <small>拍照 / 截图 / 粘贴题目，AI助教为你讲解</small>
            </span>
          </div>
          <input ref="photoInput" type="file" accept="image/*" class="dcx-hidden" @change="onPhotoPicked" />
          <div v-if="photoResult" class="dcx-upload-confirm">
            <textarea v-model="photoResult.text" class="dcx-input" rows="3"></textarea>
            <div class="dcx-upload-actions">
              <button class="dcx-btn" @click="photoResult = null">取消</button>
              <button class="dcx-btn primary" @click="askTutorPhoto">🤖 让助教讲解</button>
            </div>
          </div>
          <div ref="chatListRef" class="dcx-msgs">
            <div v-if="!chatAsk.messages.value.length" class="dcx-msg-tip">
              没听懂？直接提问（自动携带本页上下文）；或点「🎯 随堂小测」来一道题。
            </div>
            <MessageBubble v-for="m in chatAsk.messages.value" :key="m.key" :msg="m" @quiz-answered="onQAnswer" />
            <div v-if="chatAsk.streaming.value" class="dcx-thinking"><span></span><span></span><span></span> AI 思考中…</div>
          </div>
          <div class="dcx-quick">
            <button class="dcx-qchip" @click="quickQuiz">🎯 随堂小测</button>
            <button class="dcx-qchip" @click="ask('这一页我没听懂，请讲细一点并给例子。')">🤔 没听懂</button>
            <button class="dcx-qchip" @click="ask('请总结本课要点并告诉我最易错的地方。')">📌 本课小结</button>
          </div>
          <div class="dcx-askrow">
            <input v-model="askDraft" class="dcx-input" placeholder="继续追问…" @keyup.enter="ask()" />
            <button class="dcx-send" :disabled="chatAsk.streaming.value" @click="ask()">➤</button>
          </div>
        </div>

        <div v-if="practice" class="dcx-card dcx-practice">
          <div class="dcx-card-title"><span class="dcx-tico">🏋️</span> 分层练习</div>
          <div class="dcx-tiers">
            <button
              v-for="t in TIERS" :key="t.key"
              class="dcx-tier" :class="{ on: practiceTier === t.key, empty: !(practice[t.key] || []).length }"
              @click="switchTier(t.key)"
            >{{ t.label }}</button>
          </div>
          <template v-if="currentPracticeQ">
            <div class="dcx-pq"><LatexText :text="wrapLatex(currentPracticeQ.question)" /></div>
            <div class="dcx-popts">
              <button
                v-for="(op, oi) in currentPracticeQ.options" :key="oi"
                class="dcx-popt" :class="optClass(oi)" :disabled="practicePicked !== null"
                @click="answerPractice(oi)"
              >
                <b>{{ 'ABCD'[oi] }}</b>
                <span><LatexText :text="wrapLatex(op)" /></span>
                <i v-if="practicePicked !== null && oi === currentPracticeQ.answer">✓</i>
                <i v-else-if="practicePicked === oi" class="bad">✗</i>
              </button>
            </div>
            <div v-if="practicePicked !== null && currentPracticeQ.analysis" class="dcx-pa">
              <b>解析</b><LatexText :text="currentPracticeQ.analysis" />
            </div>
          </template>
          <p v-else class="dcx-pempty">本档题目已练完，切换一档试试～</p>
          <div class="dcx-pfoot">
            <div class="dcx-ring" :style="ringStyle"><span>{{ practiceAccuracyLabel }}%</span></div>
            <span class="dcx-pcount">{{ Math.min(practiceIndex + 1, tierQuestions.length) }} / {{ tierQuestions.length }}</span>
            <button class="dcx-btn primary" :disabled="!tierQuestions.length" @click="nextPractice">下一题</button>
          </div>
        </div>
      </aside>
    </div>

    <!-- ===== 创建 / 历史视图 ===== -->
    <main v-else class="dcx-page">
      <!-- 创建/入口 -->
      <div v-if="view === 'home'" class="dcx-home">
        <div class="dcx-hero">
          <h1>AI 双师课堂</h1>
          <p>输入知识点 / 拍照上传题目 / 上传教案文档，主讲 AI 生成可交互课件；立体几何自动生成可旋转 3D 图，圆锥曲线自动绘制焦点三角形，数学结论经独立校验。</p>
        </div>
        <div v-if="generatingSession" class="dcx-state">
          <span class="dcx-spinner"></span>
          <div class="dcx-state-main">AI 正在备课：先搭大纲，再逐页写内容（{{ generatingSession.slide_count || '-' }} 页 · {{ modeLabel(generatingSession.mode) }}）…</div>
          <button class="dcx-btn" @click="showGenerating">查看进度 →</button>
        </div>
        <div class="dcx-entries">
          <section class="dcx-entry">
            <div class="dcx-entry-head">✍️ 输入主题生成课堂</div>
            <textarea v-model="genTopic" class="dcx-input dcx-topic" rows="3" placeholder="例如：讨论函数 f(x)=x³−3x 的单调性；或：椭圆的焦点三角形与内心" />
            <div class="dcx-entry-config">
              <label>课堂模式
                <select v-model="genMode" class="dcx-input">
                  <option value="sync">同步课堂</option>
                  <option value="topic">专题精讲</option>
                  <option value="review">考前复习</option>
                </select>
              </label>
              <label>页数
                <select v-model="genSlides" class="dcx-input">
                  <option :value="8">8 页</option>
                  <option :value="10">10 页</option>
                  <option :value="12">12 页</option>
                  <option :value="15">15 页</option>
                </select>
              </label>
            </div>
            <button class="dcx-btn primary lg" :disabled="generating || !genTopic.trim()" @click="createFromTopic">▶ 开始生成课堂</button>
          </section>
          <section class="dcx-entry">
            <div class="dcx-entry-head">📷 拍照 / 上传题目</div>
            <p class="dcx-tip">调用现有 OCR 识别题目文字，可编辑修正后生成针对性讲解课堂。</p>
            <input ref="homePhotoInput" type="file" accept="image/*" class="dcx-hidden" @change="onPhotoPicked" />
            <button class="dcx-btn lg" :disabled="upload.uploading.value" @click="homePhotoInput?.click()">
              {{ upload.uploading.value ? upload.stageText.value : '📷 选择题目照片' }}
            </button>
            <div v-if="photoResult" class="dcx-confirm">
              <div class="dcx-confirm-title">识别结果（可编辑，确认后生成课堂）</div>
              <textarea v-model="photoResult.text" class="dcx-input dcx-topic" rows="5" />
              <div class="dcx-confirm-foot">
                <span class="dcx-file-name">📎 {{ photoResult.filename }}</span>
                <button class="dcx-btn primary" :disabled="generating" @click="createFromPhoto">✓ 确认题意并生成课堂</button>
              </div>
            </div>
          </section>
          <section class="dcx-entry">
            <div class="dcx-entry-head">📄 上传教案 / PPT / PDF / DOCX</div>
            <p class="dcx-tip">解析课件内容生成课堂；支持 PDF、Word、PPT、纯文本与 Markdown。</p>
            <input ref="fileInput" type="file" accept=".pdf,.docx,.pptx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain,text/markdown" class="dcx-hidden" @change="onFilePicked" />
            <button class="dcx-btn lg" :disabled="upload.uploading.value" @click="fileInput?.click()">
              {{ upload.uploading.value ? upload.stageText.value : '📂 选择教案文件' }}
            </button>
            <div v-if="fileResult" class="dcx-confirm">
              <div class="dcx-confirm-title">解析结果（确认标题与要点后生成课堂）</div>
              <input v-model="fileResult.title" class="dcx-input" placeholder="课堂标题" />
              <textarea v-model="fileResult.text" class="dcx-input dcx-topic" rows="4" title="将作为课堂生成的内容上下文" />
              <div class="dcx-confirm-foot">
                <span class="dcx-file-name">📎 {{ fileResult.filename }}</span>
                <button class="dcx-btn primary" :disabled="generating" @click="createFromFile">✓ 确认并生成课堂</button>
              </div>
            </div>
          </section>
        </div>
        <div v-if="recentSessions.length" class="dcx-recent">
          <div class="dcx-recent-title">最近课堂</div>
          <div v-for="s in recentSessions" :key="s.session_id" class="dcx-recent-item" @click="continueSession(s)">
            <span class="dcx-recent-icon">{{ sourceTypeMeta(s.source_type).icon }}</span>
            <div class="dcx-recent-txt">
              <div class="dcx-recent-name">{{ s.title }}</div>
              <div class="dcx-recent-sub">{{ s.status === 'ready' ? `已学 ${progressOf(s)} / ${s.slide_count} 页` : s.status === 'failed' ? '生成失败' : '生成中…' }}</div>
            </div>
            <span class="dcx-recent-go">继续 →</span>
          </div>
        </div>
      </div>

      <!-- 历史课堂 -->
      <div v-else class="dcx-history">
        <div class="dcx-history-head">
          <h2>🗂 历史课堂</h2>
          <div class="dcx-filters">
            <span v-for="f in statusFilters" :key="f.value" class="dcx-filter" :class="{ on: statusFilter === f.value }" @click="statusFilter = f.value; loadHistory()">{{ f.label }}</span>
          </div>
        </div>
        <div v-if="historyLoading" class="dcx-state"><span class="dcx-spinner"></span> 加载中…</div>
        <div v-else-if="!historyItems.length" class="dcx-state empty">还没有课堂记录，去创建一节吧 📘</div>
        <div v-else class="dcx-history-list">
          <div v-for="s in historyItems" :key="s.session_id" class="dcx-hitem">
            <div class="dcx-hmain" @click="continueSession(s)">
              <span class="dcx-hicon">{{ sourceTypeMeta(s.source_type).icon }}</span>
              <div class="dcx-hbody">
                <div class="dcx-htitle">{{ s.title }}</div>
                <div class="dcx-hsub">{{ fmtTime(s.created_at) }} · {{ modeLabel(s.mode) }} · {{ s.slide_count }} 页 · {{ sourceTypeMeta(s.source_type).label }}</div>
                <div class="dcx-bar slim"><div class="dcx-fill" :style="{ width: percent(progressIndex(s) + 1, s.slide_count) + '%' }"></div></div>
              </div>
              <div class="dcx-hactions">
                <button v-if="s.status === 'ready'" class="dcx-btn" @click.stop="continueSession(s)">▶ 继续学习</button>
                <button v-if="s.status === 'failed'" class="dcx-btn" @click.stop="retryFailed(s)">↻ 重新生成</button>
                <button v-if="s.status === 'generating'" class="dcx-btn" @click.stop="continueSession(s)">… 生成中</button>
                <button class="dcx-btn" title="复制为新课堂" @click.stop="cloneSession(s)">⧉</button>
                <button class="dcx-btn danger" title="删除" @click.stop="deleteSession(s)">🗑</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- ===== 课堂报告 ===== -->
    <div v-if="reportOpen" class="dcx-modal-mask" @click.self="reportOpen = false">
      <div class="dcx-modal">
        <div class="dcx-modal-head">
          <b>📄 课堂报告</b>
          <button class="dcx-ghost" @click="reportOpen = false">✕</button>
        </div>
        <div class="dcx-report-grid">
          <div class="dcx-rstat"><b>{{ curIndex + 1 }} / {{ session.slides.length }}</b><span>学习进度（页）</span></div>
          <div class="dcx-rstat"><b>{{ clockLabel }}</b><span>本课用时</span></div>
          <div class="dcx-rstat"><b>{{ learnedMinutes }} 分钟</b><span>按大纲计已学</span></div>
          <div class="dcx-rstat"><b>{{ okPages }} 页</b><span>已标记掌握</span></div>
          <div class="dcx-rstat"><b>{{ qaCount }} 条</b><span>助教问答</span></div>
          <div class="dcx-rstat"><b>{{ practiceAccuracyLabel }}%</b><span>分层练习正确率</span></div>
        </div>
        <div v-if="practice" class="dcx-report-tier">
          <div v-for="t in TIERS" :key="t.key" class="dcx-rtrow">
            <span>{{ t.label }}</span>
            <b>{{ practiceStats[t.key]?.correct || 0 }} / {{ practiceStats[t.key]?.total || 0 }}</b>
            <div class="dcx-bar slim"><div class="dcx-fill" :style="{ width: tierAccuracy(t.key) + '%' }"></div></div>
          </div>
        </div>
        <div class="dcx-report-notes" v-if="notes">
          <b>课堂笔记</b>
          <p>{{ notes.slice(0, 500) }}</p>
        </div>
        <div class="dcx-modal-foot">
          <button class="dcx-btn" @click="exportReport">⤓ 导出报告</button>
          <button class="dcx-btn primary" @click="reportOpen = false">继续上课</button>
        </div>
      </div>
    </div>

    <!-- ===== 课堂回顾 ===== -->
    <div v-if="reviewOpen" class="dcx-modal-mask" @click.self="reviewOpen = false">
      <div class="dcx-modal">
        <div class="dcx-modal-head">
          <b>🗂 课堂回顾</b>
          <button class="dcx-ghost" @click="reviewOpen = false">✕</button>
        </div>
        <div v-if="!historyItems.length" class="dcx-state empty">暂无历史课堂</div>
        <div class="dcx-review-list">
          <div v-for="s in historyItems" :key="s.session_id" class="dcx-recent-item" @click="continueSession(s); reviewOpen = false">
            <span class="dcx-recent-icon">{{ sourceTypeMeta(s.source_type).icon }}</span>
            <div class="dcx-recent-txt">
              <div class="dcx-recent-name">{{ s.title }}</div>
              <div class="dcx-recent-sub">{{ fmtTime(s.created_at) }} · 已学 {{ progressOf(s) }} / {{ s.slide_count }} 页</div>
            </div>
            <span class="dcx-recent-go">回顾 →</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { api, ApiError } from '@/api/client'
import { useChat } from '@/composables/useChat'
import { useToastStore } from '@/stores/toast'
import MessageBubble from '@/components/chat/MessageBubble.vue'
import LatexText from '@/components/LatexText.vue'
import WhiteboardCanvas from '@/components/student/WhiteboardCanvas.vue'
import MathFigure3D from '@/components/chat/MathFigure3D.vue'
import GraphBlock from '@/components/chat/GraphBlock.vue'
import DynamicFigureViewer from '@/components/DynamicFigureViewer.vue'
import { classroomApi, filesApi } from '@/api'
import MarkdownView from '@/components/MarkdownView.vue'
import { SKILL_ID_BY_KEY } from '@/config/skills'
import { useClassroomUpload, confirmClassroomPhotoParseQuality } from '@/composables/useClassroomUpload'
import { ensureVoices, pickChineseVoice, listChineseVoices, textToSpeech, getPreferredVoice, setPreferredVoice } from '@/utils/classroomTts'
import teacherAvatar from '@/assets/dual/teacher.svg'
import tutorAvatar from '@/assets/dual/tutor.svg'
import studentAvatar from '@/assets/dual/student.svg'
import {
  groupSlideSections, splitSolutionSteps, practiceAccuracy, verificationMeta, sourceTypeMeta,
  deriveSourceTitle, percent, fmtClock, fmtTime,
} from '@/utils/dualClassroom'

const toast = useToastStore()
const router = useRouter()

/* ===== 视图状态 ===== */
const view = ref('home') // home | history | player(由 session+currentSlide 驱动)
const loading = ref(true)
const error = ref('')
const session = ref(null)
const generating = ref(false)
const curIndex = ref(0)

const playing = computed(() => view.value === 'player-p' && !!session.value?.slides?.length)
const currentSlide = computed(() => (playing.value ? session.value.slides[curIndex.value] : null))
const sections = computed(() => groupSlideSections(currentSlide.value || {}))
const pg = computed(() => percent(curIndex.value + 1, session.value?.slides?.length || 1))

const MODE_LABELS = { sync: '同步课堂', review: '考前复习', topic: '专题精讲' }
function modeLabel(m) { return MODE_LABELS[m] || m || '课堂' }
const currentOutlineTitle = computed(() => {
  const o = session.value?.outlines?.[curIndex.value]
  return o?.title ? `概念讲解：${o.title}` : modeLabel(session.value?.mode)
})

/* ===== 原题浮层 ===== */
const originOpen = ref(false)
const originImgError = ref(false)
const originQuestion = computed(() => {
  const sr = session.value?.source_ref || {}
  const text = String(sr.source_text || sr.extracted_text || sr.content || '').trim()
  const fileId = sr.file_id ? String(sr.file_id) : ''
  return { text: text.slice(0, 2000), fileId, filename: String(sr.filename || ''), imgUrl: originImgUrl.value }
})
const originImgUrl = ref('')
watch(() => session.value?.source_ref?.file_id, async (fid) => {
  originImgUrl.value = ''
  originImgError.value = false
  if (!fid) return
  try {
    const d = await filesApi.contentUrl(String(fid))
    if (d?.url) originImgUrl.value = d.url
  } catch { /* 原图拉取失败静默：浮层仍显示题干 */ }
})

/* ===== 顶栏弹出层 ===== */
const outlinePop = ref(false)
const settingsOpen = ref(false)
const reportOpen = ref(false)
const reviewOpen = ref(false)

/* ===== 创建配置 ===== */
const genMode = ref('sync')
const genSlides = ref(10)
const genTopic = ref('')

/* ===== 拍题 / 教案上传 ===== */
const upload = useClassroomUpload(toast)
const photoInput = ref(null)
const homePhotoInput = ref(null)
const fileInput = ref(null)
const photoResult = ref(null)
const fileResult = ref(null)

function resetSourceForms() {
  photoResult.value = null
  fileResult.value = null
}
/** 拍题：选中图片 → OCR → 可编辑识别结果（顶栏上传框与创建页共用） */
async function onPhotoPicked(e) {
  const raw = e.target.files?.[0]
  e.target.value = ''
  if (!raw) return
  const r = await upload.selectAndParse(raw)
  if (r) photoResult.value = {
    filename: r.filename, file_id: r.fileId, text: r.text || '', parseQuality: r.parseQuality,
  }
}
/** 教案：选中文档 → 解析 → 标题/正文可编辑 */
async function onFilePicked(e) {
  const raw = e.target.files?.[0]
  e.target.value = ''
  if (!raw) return
  const r = await upload.selectAndParse(raw)
  if (r) {
    const desc = (r.text || '').slice(0, 3000)
    fileResult.value = {
      filename: r.filename, file_id: r.fileId,
      title: deriveSourceTitle(r.text, raw.name.replace(/\.(pdf|docx|pptx|txt|md)$/i, '')),
      text: desc,
    }
  }
}
/** 助教讲解拍题（右栏上传框） */
function askTutorPhoto() {
  const text = (photoResult.value?.text || '').trim()
  if (!text) { toast.error('识别结果为空'); return }
  photoResult.value = null
  ask(`请讲解这道题（给出思路与完整解答步骤）：${text}`)
}

/* ===== 生成课堂通用入口 ===== */
async function createFromTopic() {
  if (generating.value) return
  const payload = { slide_count: Number(genSlides.value), mode: genMode.value, topic: genTopic.value.trim() }
  await createSession(payload, 'topic', null)
}
async function createFromPhoto() {
  const text = (photoResult.value?.text || '').trim()
  if (!text) { toast.error('识别结果为空，请先确认题目内容'); return }
  await createSession(
    { slide_count: Number(genSlides.value), mode: genMode.value, topic: text },
    'photo',
    {
      filename: photoResult.value.filename,
      file_id: photoResult.value.file_id,
      status: 'recognized',
      parse_quality: confirmClassroomPhotoParseQuality(photoResult.value.parseQuality),
    },
  )
}
async function createFromFile() {
  if (!fileResult.value) return
  const title = (fileResult.value.title || '').trim()
  const body = (fileResult.value.text || '').trim()
  if (!title && !body) { toast.error('请先填写课堂标题'); return }
  const payload = {
    slide_count: Number(genSlides.value), mode: genMode.value,
    topic: title || deriveSourceTitle(body),
    description: body ? `以下为本节课件（教案/文档）内容，请围绕它组织讲解：\n${body}` : undefined,
  }
  await createSession(payload, 'file', { filename: fileResult.value.filename, file_id: fileResult.value.file_id, status: 'parsed' })
}

async function createSession(payload, sourceType, sourceRef) {
  if (generating.value) return
  generating.value = true
  try {
    if (sourceType !== 'topic') payload.source_type = sourceType
    if (sourceRef) payload.source_ref = sourceRef
    const s = await classroomApi.createSession(payload)
    const d = s?.data || s
    session.value = d
    generatingSession.value = d
    curIndex.value = 0
    resetSourceForms()
    view.value = 'player-p'
    pollSession(d.session_id)
    toast.success('课堂生成已启动，稍等片刻…')
  } catch (e) {
    toast.error(e?.message || '生成失败，请稍后重试')
  } finally {
    generating.value = false
  }
}

/* ===== 轮询生成进度 ===== */
const generatingSession = ref(null)
let pollTimer = null
async function pollSession(id) {
  clearTimeout(pollTimer)
  const tick = async () => {
    try {
      const s = await classroomApi.session(id)
      const d = s?.data || s
      if (session.value?.session_id === id) session.value = d
      if (generatingSession.value?.session_id === id) generatingSession.value = d
      if (d.status === 'ready' || d.status === 'failed') {
        if (d.status === 'ready') { toast.success('课堂生成完成'); if (view.value === 'player-p') syncFromDetail(d) }
        else toast.error(d.error || '课堂生成失败')
        return
      }
    } catch { /* 网络抖动继续轮询 */ }
    pollTimer = setTimeout(tick, 2500)
  }
  pollTimer = setTimeout(tick, 2000)
}

/* ===== 历史课堂 ===== */
const historyItems = ref([])
const historyLoading = ref(false)
const statusFilter = ref('')
const statusFilters = [
  { label: '全部', value: '' },
  { label: '已完成', value: 'ready' },
  { label: '生成中', value: 'generating' },
  { label: '失败', value: 'failed' },
]
const recentSessions = computed(() => historyItems.value.filter((s) => s.status !== 'failed').slice(0, 5))

async function loadHistory() {
  historyLoading.value = true
  try {
    const list = await classroomApi.sessions(statusFilter.value ? { status: statusFilter.value, limit: 50 } : { limit: 50 })
    const items = (list?.data || list)?.items || []
    historyItems.value = items
  } catch (e) {
    toast.error(e?.message || '历史课堂加载失败')
  } finally {
    historyLoading.value = false
  }
}

function progressIndex(s) {
  const idx = s.progress?.slide_index
  return Number.isInteger(idx) ? idx : -1
}
function progressOf(s) { const i = progressIndex(s); return i >= 0 ? i + 1 : 0 }
function okPages() {
  const pc = session.value?.progress?.page_check
  return pc && typeof pc === 'object' ? Object.values(pc).filter((v) => v === 'ok').length : 0
}
function syncFromDetail(d) {
  session.value = d
  if (Number.isInteger(d.progress?.slide_index) && d.progress.slide_index < (d.slides?.length || 0)) {
    curIndex.value = d.progress.slide_index
  } else curIndex.value = 0
  notes.value = d.notes || ''
  practiceTier.value = 'basic'
  practiceIndex.value = 0
  practicePicked.value = null
  resetTimer(d.session_id)
}
async function continueSession(s) {
  if (s.status === 'generating') {
    session.value = s
    generatingSession.value = s
    view.value = 'player-p'
    pollSession(s.session_id)
    return
  }
  try {
    const detail = await classroomApi.session(s.session_id)
    const d = detail?.data || detail
    if (d?.status === 'ready' && d.slides?.length) {
      syncFromDetail(d)
      view.value = 'player-p'
      return
    }
    toast.info('该课堂内容不完整，可删除后重新生成')
  } catch (e) {
    toast.error(e?.message || '加载课堂失败')
  }
}
async function retryFailed(s) {
  toast.info('正在基于原标题重新生成…')
  try {
    const res = await classroomApi.createSession({ topic: s.title, slide_count: s.slide_count, mode: s.mode || 'sync' })
    const d = res?.data || res
    view.value = 'player-p'
    session.value = d
    generatingSession.value = d
    curIndex.value = 0
    pollSession(d.session_id)
    loadHistory()
  } catch (e) { toast.error(e?.message || '重新生成失败') }
}
async function cloneSession(s) {
  if (!window.confirm(`复制课堂「${s.title}」为新课？`)) return
  try {
    const res = await classroomApi.cloneSession(s.session_id)
    const d = res?.data || res
    toast.success('已复制为新课，正在生成…')
    view.value = 'player-p'
    session.value = d
    generatingSession.value = d
    curIndex.value = 0
    pollSession(d.session_id)
    loadHistory()
  } catch (e) { toast.error(e?.message || '复制失败') }
}
async function deleteSession(s) {
  if (!window.confirm(`确定删除课堂「${s.title}」？删除后可在后台保留但不再展示。`)) return
  try {
    await classroomApi.deleteSession(s.session_id)
    historyItems.value = historyItems.value.filter((x) => x.session_id !== s.session_id)
    toast.success('已删除')
  } catch (e) { toast.error(e?.message || '删除失败') }
}

function toggleHistory() {
  if (view.value === 'history') { view.value = session.value ? 'player-p' : 'home' }
  else { view.value = 'history'; loadHistory() }
}
function newClassroom() {
  view.value = 'home'
  session.value = null
  generatingSession.value = null
  curIndex.value = 0
  if ('speechSynthesis' in window) window.speechSynthesis.cancel()
}
function showGenerating() { view.value = 'player-p' }
function goBack() { router.push('/overview') }

/* ===== 播放控制 ===== */
function jumpTo(i) {
  if (i === curIndex.value) return
  stopSpeak()
  curIndex.value = i
  syncProgress()
}
function go(delta) {
  const next = curIndex.value + delta
  if (next < 0 || next >= (session.value?.slides?.length || 0)) return
  curIndex.value = next
  syncProgress()
  if (speaking.value || (autoRead.value && !speaking.value)) speak()
}
function toggleReveal(i) {
  const n = new Set(revealed.value)
  if (n.has(i)) n.delete(i); else n.add(i)
  revealed.value = n
}
const revealed = ref(new Set())
const selfCheck = ref('')
const checkCounts = ref({ ok: 0, again: 0 })
function markCheck(v) {
  if (selfCheck.value === v) return
  if (selfCheck.value) checkCounts.value[selfCheck.value] = Math.max(0, checkCounts.value[selfCheck.value] - 1)
  selfCheck.value = v
  checkCounts.value[v] += 1
  syncProgress({ page_check: { [curIndex.value]: v } })
  if (v === 'again') toast.info('🔁 已标记重听，课后记得回看')
}
watch(curIndex, () => { revealed.value = new Set(); selfCheck.value = '' })

/* ===== 进度 / 笔记持久化 ===== */
let progressTimer = null
function syncProgress(extra = {}) {
  clearTimeout(progressTimer)
  progressTimer = setTimeout(async () => {
    const sid = session.value?.session_id
    if (!sid) return
    try {
      await classroomApi.updateProgress(sid, { slide_index: curIndex.value, ...extra })
    } catch { /* 静默失败，不阻断学习 */ }
  }, 800)
}
const notes = ref('')
let notesTimer = null
function saveNotes() {
  clearTimeout(notesTimer)
  notesTimer = setTimeout(async () => {
    const sid = session.value?.session_id
    if (!sid) return
    try { await classroomApi.updateNotes(sid, notes.value) } catch { /* 离线降级 */ }
  }, 1000)
}

/* ===== 课堂计时（自动计时 + 本地断点续记） ===== */
const elapsedSec = ref(0)
let timerHandle = null
const clockLabel = computed(() => fmtClock(elapsedSec.value))
function timerKey(sid) { return `dcx-timer-${sid || 'none'}` }
function resetTimer(sid) {
  try { elapsedSec.value = Number(localStorage.getItem(timerKey(sid))) || 0 } catch { elapsedSec.value = 0 }
}
function startTimer() {
  clearInterval(timerHandle)
  timerHandle = setInterval(() => {
    elapsedSec.value += 1
    if (elapsedSec.value % 15 === 0) persistTimer()
  }, 1000)
}
function persistTimer() {
  const sid = session.value?.session_id
  if (!sid) return
  try { localStorage.setItem(timerKey(sid), String(elapsedSec.value)) } catch { /* 隐私模式静默 */ }
}
watch(playing, (on) => { if (on) startTimer(); else { clearInterval(timerHandle); persistTimer() } })

/* ===== 已学分钟（按大纲累计） ===== */
const learnedMinutes = computed(() => {
  const os = session.value?.outlines || []
  let m = 0
  for (let i = 0; i <= Math.min(curIndex.value, os.length - 1); i++) m += Number(os[i]?.minutes) || 0
  return m || curIndex.value * 3
})

/* ===== 全屏 ===== */
const fullscreen = ref(false)
async function toggleFullscreen() {
  try {
    if (document.fullscreenElement) { await document.exitFullscreen(); fullscreen.value = false }
    else { await document.documentElement.requestFullscreen(); fullscreen.value = true }
  } catch { /* 浏览器不支持 */ }
}

/* ===== 朗读设置 ===== */
const speakRate = ref(1)
const autoRead = ref(false)
const speaking = ref(false)
const voices = ref([])
const currentVoiceName = ref(getPreferredVoice() || '')
const preferredVoice = ref(getPreferredVoice())
// 后端神经语音音色（OpenMAIC 同款晓晓为默认）
const ttsVoice = ref('xiaoxiao')
const ttsAudio = ref(null)
const ttsUrl = ref('')

/* ===== Action 化播放（OpenMAIC wb_draw 时序对齐）：
   讲稿朗读时，白板板书按讲解节奏逐条出现并高亮当前条；停止/静默态全部展开 ===== */
const boardRevealed = ref(-1) // -1 = 全部展开（默认/停止态）
let boardTimer = null
const visibleWbSteps = computed(() => {
  const steps = sections.value.formulas
  if (boardRevealed.value < 0) return steps
  return steps.slice(0, boardRevealed.value)
})
function startBoardReveal(spokenText) {
  const total = sections.value.formulas.length
  if (total < 2) return
  // 朗读时长按字数估算（≈0.22s/字，下限 8s），板书均分出现
  const duration = Math.max(8, String(spokenText || '').length * 0.22) * 1000
  const per = duration / (total + 1)
  boardRevealed.value = 0
  let i = 0
  clearInterval(boardTimer)
  boardTimer = setInterval(() => {
    i += 1
    boardRevealed.value = i
    if (i >= total) { clearInterval(boardTimer); boardRevealed.value = -1 }
  }, per)
}
function stopBoardReveal() {
  clearInterval(boardTimer)
  boardRevealed.value = -1
}

async function loadVoices() {
  const list = await ensureVoices()
  voices.value = list
  setTimeout(async () => {
    const list2 = await ensureVoices(800)
    if (list2.length > list.length) voices.value = list2
  }, 500)
}
function onVoiceSelect() {
  preferredVoice.value = currentVoiceName.value
  setPreferredVoice(currentVoiceName.value)
  if (speaking.value) { window.speechSynthesis?.cancel(); setTimeout(() => speak(), 50) }
}
function speak() {
  if (!('speechSynthesis' in window)) { toast.info('当前浏览器不支持语音朗读'); return }
  const t = currentSlide.value?.narration
  if (!t) return
  stopSpeak()
  speaking.value = true
  startBoardReveal(textToSpeech(t))
  // 优先走后端神经语音（OpenMAIC 同款晓晓音色）；失败回退浏览器 TTS
  fetch('/api/classroom/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: t, voice: ttsVoice.value }),
  })
    .then(async (resp) => {
      if (!resp.ok) throw new Error('tts unavailable')
      const blob = await resp.blob()
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      ttsAudio.value = audio
      ttsUrl.value = url
      audio.onended = () => {
        speaking.value = false
        cleanupTtsAudio()
        if (autoRead.value && curIndex.value < (session.value?.slides?.length || 0) - 1) {
          curIndex.value += 1
          syncProgress()
          speak()
        }
      }
      audio.onerror = () => { speaking.value = false; cleanupTtsAudio() }
      return audio.play()
    })
    .catch(() => fallbackBrowserSpeak(t))
}
function fallbackBrowserSpeak(t) {
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(textToSpeech(t))
  u.lang = 'zh-CN'
  u.rate = speakRate.value
  u.pitch = 1.08
  const v = pickChineseVoice(voices.value, preferredVoice.value)
  if (v) u.voice = v
  u.onend = () => {
    speaking.value = false
    if (autoRead.value && curIndex.value < (session.value?.slides?.length || 0) - 1) {
      curIndex.value += 1
      syncProgress()
      speak()
    }
  }
  u.onerror = () => { speaking.value = false }
  window.speechSynthesis.speak(u)
  speaking.value = true
}
function cleanupTtsAudio() {
  if (ttsAudio.value) { ttsAudio.value.pause(); ttsAudio.value = null }
  if (ttsUrl.value) { URL.revokeObjectURL(ttsUrl.value); ttsUrl.value = '' }
}
function toggleSpeak() {
  if (speaking.value) { stopSpeak() }
  else speak()
}
function stopSpeak() {
  window.speechSynthesis?.cancel()
  cleanupTtsAudio()
  stopBoardReveal()
  speaking.value = false
}

/* ===== 页内 AI 助教（携带当前课程/页/步骤上下文） ===== */
const askDraft = ref('')
const chatAsk = useChat({
  workspace: 'student',
  manageConversations: false,
  sendThinking: true,
  hooks: { resolveSkills: (keys) => (keys || []).map((k) => SKILL_ID_BY_KEY[k] || k) },
})
function ensureConv() {
  if (!chatAsk.activeConvId.value) return chatAsk.createConversation('student').catch(() => {})
  return Promise.resolve()
}
function buildContext() {
  return session.value
    ? `我现在在第 ${curIndex.value + 1} 页「${currentSlide.value?.title || ''}」，正在学习「${session.value.title}」。请结合这一页的讲解为我答疑。`
    : ''
}
function ask(t) {
  const text = (typeof t === 'string' ? t : askDraft.value || '').trim()
  if (!text || chatAsk.streaming.value) return
  askDraft.value = ''
  ensureConv().then(() => chatAsk.doSend(buildContext() + text, { skills: [] }))
}
function resetTutor() {
  if (!window.confirm('清空当前助教对话，重新开始？')) return
  chatAsk.messages.value = []
  toast.info('已重新开始对话')
}
function focusAsk() {
  askDraft.value = askDraft.value || '这一页我没听懂，请再讲一遍并举例。'
  nextTick(() => document.querySelector('.dcx-askrow input')?.focus())
}
function quickQuiz() {
  const base = currentSlide.value?.title ? `基于「${currentSlide.value.title}」(第 ${curIndex.value + 1} 页)` : '基于本课'
  const text = base + '出一道高中数学选择题（给出选项与解析），适合课堂随堂小测。'
  if (chatAsk.streaming.value) return
  ensureConv().then(() => chatAsk.doSend(text, { skills: ['smart_quiz'] }))
}
function onQAnswer(p) { toast.info(p?.feedback === 'correct' ? '答对啦！' : '看下解析，再试一次') }
const chatListRef = ref(null)
watch(
  () => chatAsk.messages.value.length + (chatAsk.streaming.value ? 1 : 0),
  () => nextTick(() => { const el = chatListRef.value; if (el) el.scrollTop = el.scrollHeight }),
)

/* ===== QA 摘要持久化 ===== */
let lastQaCount = 0
watch(
  () => chatAsk.messages.value.length,
  () => {
    const sid = session.value?.session_id
    const msgs = chatAsk.messages.value
    if (!sid || msgs.length <= lastQaCount) return
    for (let i = lastQaCount; i < msgs.length; i++) {
      const m = msgs[i]
      if (!m || typeof m !== 'object') continue
      const role = m.role === 'user' ? 'user' : 'assistant'
      const text = m.text ? String(m.text).slice(0, 2000) : ''
      if (!text) continue
      classroomApi.appendQa(sid, { role, text }).catch(() => {})
    }
    lastQaCount = msgs.length
  },
)
const qaCount = computed(() => chatAsk.messages.value.length)

/* ===== 白板页签 / 公式工具 ===== */
const boardTab = ref('wb')
const sessionFormulas = computed(() => {
  const out = []
  for (const sld of session.value?.slides || []) {
    for (const b of sld?.blocks || []) {
      if (b && b.kind === 'latex' && b.latex) out.push({ latex: String(b.latex) })
    }
  }
  return out.slice(0, 20)
})
async function copyFormula(latex) {
  try {
    await navigator.clipboard.writeText(String(latex))
    toast.success('公式已复制')
  } catch { toast.error('复制失败，请手动选择') }
}

/* ===== plot2d 适配 / LaTeX 包裹 ===== */
function toGraphBlock(b) {
  const x0 = Number.isFinite(+b.x0) ? +b.x0 : -4
  const x1 = Number.isFinite(+b.x1) ? +b.x1 : 4
  const elements = [{ kind: 'functiongraph', parents: [b.expr] }]
  if (Array.isArray(b.marks)) {
    for (const m of b.marks) {
      if (Number.isFinite(+m.x)) elements.push({ kind: 'point', parents: [+m.x, 0] })
    }
  }
  return {
    schema: {
      graph_type: 'function_plot',
      elements,
      board: { boundingbox: [x0, 5, x1, -5] },
    },
  }
}
function wrapLatex(t) {
  const s = String(t || '')
  return s && !/[$\\]/.test(s) && /[-+^=]/.test(s) ? `$${s}$` : s
}
function splitSteps(t) { return splitSolutionSteps(t) }

/* ===== 分层练习 ===== */
const TIERS = [
  { key: 'basic', label: '基础' },
  { key: 'advanced', label: '进阶' },
  { key: 'challenge', label: '挑战' },
]
const practice = computed(() => {
  const p = session.value?.practice
  return p && typeof p === 'object' ? p : null
})
const practiceStats = computed(() => session.value?.practice_stats || {})
const practiceTier = ref('basic')
const practiceIndex = ref(0)
const practicePicked = ref(null)
const tierQuestions = computed(() => practice.value?.[practiceTier.value] || [])
const currentPracticeQ = computed(() => tierQuestions.value[practiceIndex.value] || null)
const practiceAccuracyLabel = computed(() => practiceAccuracy(practiceStats.value))
const ringStyle = computed(() => {
  const deg = Math.round(360 * practiceAccuracyLabel.value / 100)
  return {
    background: `conic-gradient(#22c55e ${deg}deg, #e2e8f0 ${deg}deg)`,
  }
})
function switchTier(key) {
  if (practiceTier.value === key) return
  practiceTier.value = key
  practiceIndex.value = 0
  practicePicked.value = null
}
function optClass(oi) {
  if (practicePicked.value === null || !currentPracticeQ.value) return ''
  if (oi === currentPracticeQ.value.answer) return 'right'
  if (oi === practicePicked.value) return 'wrong'
  return 'dim'
}
async function answerPractice(oi) {
  if (practicePicked.value !== null || !currentPracticeQ.value) return
  practicePicked.value = oi
  const correct = oi === currentPracticeQ.value.answer
  const sid = session.value?.session_id
  if (!sid) return
  try {
    const r = await classroomApi.answerPractice(sid, {
      tier: practiceTier.value,
      question_index: practiceIndex.value,
      correct,
    })
    const stats = r?.practice_stats || r?.data?.practice_stats
    if (stats && session.value) session.value.practice_stats = stats
  } catch { /* 统计失败不阻断答题 */ }
  if (!correct && currentPracticeQ.value?.analysis) toast.info('答错了，看一眼解析再下一题吧')
}
function nextPractice() {
  if (!tierQuestions.value.length) return
  practicePicked.value = null
  practiceIndex.value = (practiceIndex.value + 1) % tierQuestions.value.length
}
function tierAccuracy(key) {
  const t = practiceStats.value?.[key] || {}
  const total = Number(t.total) || 0
  const correct = Number(t.correct) || 0
  return total ? Math.round((correct / total) * 100) : 0
}

/* ===== 导出课件 / 导出报告 ===== */
function exportCourseware() {
  const s = session.value
  if (!s?.slides?.length) return
  const esc = (t) => String(t || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const slideHtml = s.slides.map((sld) => {
    const rows = (sld.blocks || []).map((b) => {
      if (b.kind === 'text') return `<p>${esc(b.text)}</p>`
      if (b.kind === 'theorem') return `<div class="thm"><b>${esc(b.title || '定理')}</b><p>${esc(b.body)}</p></div>`
      if (b.kind === 'latex') return `<div class="formula">$$${esc(b.latex)}$$</div>`
      if (b.kind === 'example') {
        return `<div class="ex"><b>例题</b><p>${esc(b.question)}</p><p>解：${esc(b.analysis)}</p><p>答：${esc(b.answer)}</p></div>`
      }
      if (b.kind === 'table') {
        const head = (b.headers || []).map((h) => `<th>${esc(h)}</th>`).join('')
        const body = (b.rows || []).map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')
        return `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`
      }
      if (b.kind === 'note') return `<div class="note">💡 ${esc(b.text)}</div>`
      if (b.kind === 'plot2d') return `<div class="fig">📈 ${esc(b.caption || b.expr || '')}</div>`
      if (b.kind === 'geometry') return `<div class="fig">🧊 ${esc(b.caption || '几何图形（交互版见课堂页面）')}</div>`
      return ''
    }).join('')
    return `<section><h2>第 ${sld.order} 页 · ${esc(sld.title)}</h2><p class="sub">${esc(sld.subtitle || '')}</p>${rows}</section>`
  }).join('')
  const w = window.open('', '_blank')
  if (!w) { toast.error('浏览器拦截了导出窗口'); return }
  w.document.write(`<!doctype html><html lang="zh"><head><meta charset="utf-8"><title>${esc(s.title)} · 导出课件</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"><\/script>
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js" onload="renderMathInElement(document.body,{delimiters:[{left:'$$',right:'$$',display:true},{left:'$',right:'$',display:false}]});window.print()"><\/script>
<style>body{font-family:'PingFang SC','Microsoft YaHei',sans-serif;max-width:860px;margin:24px auto;padding:0 16px;color:#111827;line-height:1.8}
h1{text-align:center}h2{border-bottom:2px solid #2f6bff;padding-bottom:6px;margin-top:36px}
.sub{color:#64748b}.thm{border:1px solid #bfdbfe;background:#eff6ff;border-radius:8px;padding:10px 14px}
.ex{border:1px solid #bbf7d0;background:#f0fdf4;border-radius:8px;padding:10px 14px}
.note{background:#fffbeb;border-radius:8px;padding:8px 12px}.formula{text-align:center}
table{border-collapse:collapse;margin:10px auto}th,td{border:1px solid #cbd5e1;padding:6px 14px;text-align:center}
.fig{color:#475569;border:1px dashed #cbd5e1;border-radius:8px;padding:8px 12px}
section{page-break-after:always}</style></head><body>
<h1>${esc(s.title)}</h1><p style="text-align:center;color:#64748b">${esc(modeLabel(s.mode))} · 共 ${s.slides.length} 页</p>
${slideHtml}</body></html>`)
  w.document.close()
}
function exportReport() {
  const lines = [
    `课堂报告：${session.value?.title || ''}`,
    `学习进度：第 ${curIndex.value + 1} / ${session.value?.slides?.length || 0} 页`,
    `本课用时：${clockLabel.value}`,
    `已标记掌握：${okPages()} 页`,
    `助教问答：${qaCount.value} 条`,
    `分层练习正确率：${practiceAccuracyLabel.value}%`,
    '',
    notes.value ? `课堂笔记：\n${notes.value}` : '',
  ].filter(Boolean)
  const w = window.open('', '_blank')
  if (!w) return
  w.document.write(`<pre style="font-family:inherit;font-size:15px;white-space:pre-wrap;line-height:1.9">${lines.join('\n').replace(/</g, '&lt;')}</pre>`)
  w.document.close()
  w.print()
}

/* ===== 键盘 / 生命周期 ===== */
function onKey(e) {
  if (e.key === 'ArrowRight') go(1)
  else if (e.key === 'ArrowLeft') go(-1)
  else if (e.key === 'Escape') { settingsOpen.value = false; outlinePop.value = false; reportOpen.value = false; reviewOpen.value = false }
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    await loadHistory()
    // 自动回显最近一个 ready 会话（含继续学习进度）
    const mine = historyItems.value.filter((s) => s.status === 'ready')
    if (mine.length) {
      const hit = mine[0]
      const detail = await classroomApi.session(hit.session_id)
      const d = detail?.data || detail
      if (d?.status === 'ready' && d.slides?.length) {
        syncFromDetail(d)
        view.value = 'player-p'
      }
    }
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : '加载失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  load()
  loadVoices()
  window.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => {
  clearTimeout(pollTimer)
  clearTimeout(progressTimer)
  clearTimeout(notesTimer)
  clearInterval(timerHandle)
  persistTimer()
  window.speechSynthesis?.cancel()
  window.removeEventListener('keydown', onKey)
})
</script>

<style scoped>
.dcx-shell {
  height: 100vh; display: flex; flex-direction: column; overflow: hidden;
  background: #eef2f8; color: #0f172a;
  font-family: 'PingFang SC', 'Microsoft YaHei', 'Segoe UI', sans-serif;
}
.dcx-hidden { display: none; }
button { font-family: inherit; }

/* ===== 顶栏 ===== */
.dcx-top {
  display: flex; align-items: center; gap: 14px; padding: 0 18px; height: 58px; flex-shrink: 0;
  background: #fff; border-bottom: 1px solid #e5eaf3; position: relative; z-index: 42;
}
.dcx-brand { display: flex; align-items: center; gap: 8px; cursor: pointer; user-select: none; }
.dcx-logo {
  width: 34px; height: 34px; border-radius: 10px; display: grid; place-items: center; font-size: 17px;
  background: linear-gradient(135deg, #2f6bff, #6d9bff); color: #fff; box-shadow: 0 3px 10px rgba(47, 107, 255, .35);
}
.dcx-brand b { font-size: 16px; letter-spacing: .5px; }
.dcx-vline { width: 1px; height: 24px; background: #e5eaf3; }
.dcx-course { display: flex; align-items: center; gap: 10px; min-width: 0; }
.dcx-course-name { font-size: 14.5px; font-weight: 800; max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dcx-pagechip { font-size: 12px; font-weight: 800; color: #2f6bff; background: #eef3ff; border-radius: 8px; padding: 3px 9px; }
.dcx-course-sub { font-size: 12px; color: #94a3b8; }
.dcx-section-wrap { position: relative; }
.dcx-section {
  border: none; background: transparent; font-size: 12.5px; font-weight: 700; color: #64748b;
  cursor: pointer; display: flex; align-items: center; gap: 5px; padding: 5px 8px; border-radius: 8px;
}
.dcx-section:hover { background: #f1f5fb; color: #2f6bff; }
.dcx-section i { font-style: normal; font-size: 10px; }
.dcx-pop {
  position: absolute; top: calc(100% + 8px); left: 0; z-index: 60; min-width: 240px; max-height: 380px; overflow-y: auto;
  background: #fff; border: 1px solid #e5eaf3; border-radius: 12px; box-shadow: 0 12px 32px rgba(15, 23, 42, .14); padding: 8px;
}
.dcx-pop-item { padding: 8px 10px; font-size: 12.5px; border-radius: 8px; cursor: pointer; }
.dcx-pop-item:hover { background: #f1f5fb; }
.dcx-pop-item.on { background: #2f6bff; color: #fff; font-weight: 800; }
.dcx-top-right { margin-left: auto; display: flex; align-items: center; gap: 9px; }
.dcx-timer {
  font-variant-numeric: tabular-nums; font-weight: 800; font-size: 13px; color: #e8f0ff;
  background: #1e293b; border-radius: 9px; padding: 7px 12px; letter-spacing: 1px;
}
.dcx-round {
  width: 34px; height: 34px; border-radius: 50%; border: 1px solid #e5eaf3; background: #fff; cursor: pointer;
  font-size: 13px; color: #334155; display: grid; place-items: center; transition: all .15s ease;
}
.dcx-round:hover { border-color: #2f6bff; color: #2f6bff; }
.dcx-round.on { background: #eef3ff; border-color: #2f6bff; color: #2f6bff; }
.dcx-tbtn {
  border: 1px solid #e5eaf3; background: #fff; color: #334155; border-radius: 9px; padding: 8px 14px;
  font-size: 12.5px; font-weight: 700; cursor: pointer; transition: all .15s ease; white-space: nowrap;
}
.dcx-tbtn:hover:not(:disabled) { border-color: #2f6bff; color: #2f6bff; }
.dcx-tbtn:disabled { opacity: .45; cursor: not-allowed; }
.dcx-tbtn.on { background: #eef3ff; border-color: #2f6bff; color: #2f6bff; }
.dcx-tbtn.solid { background: #2f6bff; border-color: #2f6bff; color: #fff; box-shadow: 0 3px 10px rgba(47, 107, 255, .3); }
.dcx-tbtn.solid:hover { filter: brightness(1.06); color: #fff; }
.dcx-avatar {
  width: 34px; height: 34px; border-radius: 50%; overflow: hidden; flex-shrink: 0;
  background: linear-gradient(135deg, #dbe7ff, #f3e8ff); border: 1px solid #e5eaf3;
}
.dcx-avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }
.dcx-settings { position: relative; }
.dcx-menu {
  position: absolute; right: 0; top: calc(100% + 8px); z-index: 61; min-width: 250px;
  background: #fff; border: 1px solid #e5eaf3; border-radius: 12px; box-shadow: 0 12px 32px rgba(15, 23, 42, .14);
  padding: 14px; display: flex; flex-direction: column; gap: 11px;
}
.dcx-menu-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; font-size: 12.5px; font-weight: 700; color: #475569; }
.dcx-menu-row select { width: 150px; height: 32px; }
.dcx-menu-row.check { cursor: pointer; justify-content: flex-start; gap: 8px; }
.dcx-clickmask { position: fixed; inset: 0; z-index: 41; }

/* ===== 原题浮层 ===== */
.dcx-origin {
  position: fixed; top: 66px; right: 18px; z-index: 55; width: 380px; max-height: 60vh;
  background: #fff; border: 1px solid #e5eaf3; border-radius: 14px; box-shadow: 0 16px 40px rgba(15, 23, 42, .16);
  display: flex; flex-direction: column; overflow: hidden;
}
.dcx-origin-head { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; border-bottom: 1px solid #eef1f5; font-size: 13px; }
.dcx-origin-body { padding: 12px 14px; overflow-y: auto; font-size: 13px; line-height: 1.75; }
.dcx-origin-img { max-width: 100%; border-radius: 8px; margin-top: 8px; }

/* ===== 三栏主体 ===== */
.dcx-body {
  flex: 1; min-height: 0; display: grid; gap: 14px; padding: 14px 16px;
  grid-template-columns: 232px minmax(0, 1fr) 332px;
}
.dcx-left, .dcx-right { display: flex; flex-direction: column; gap: 12px; overflow-y: auto; padding-bottom: 4px; }
.dcx-center { min-width: 0; overflow-y: auto; padding: 26px 6px 12px 2px; position: relative; display: flex; flex-direction: column; }
.dcx-card {
  background: #fff; border: 1px solid #e9edf5; border-radius: 14px; padding: 14px;
  box-shadow: 0 1px 3px rgba(15, 23, 42, .04);
}
.dcx-card-title { display: flex; align-items: center; gap: 7px; font-size: 13.5px; font-weight: 800; margin-bottom: 10px; }
.dcx-card-title .dcx-ghost { margin-left: auto; }
.dcx-tico { font-size: 14px; }

/* 左栏大纲 */
.dcx-outline { display: flex; flex-direction: column; gap: 2px; }
.dcx-oitem {
  display: flex; align-items: center; gap: 9px; padding: 7px 8px; border-radius: 9px; cursor: pointer;
  font-size: 12.5px; color: #475569; transition: background .12s ease;
}
.dcx-oitem:hover { background: #f1f5fb; }
.dcx-oitem.active { background: #2f6bff; color: #fff; font-weight: 800; box-shadow: 0 3px 10px rgba(47, 107, 255, .3); }
.dcx-oitem.done { color: #94a3b8; }
.dcx-ono {
  width: 20px; height: 20px; border-radius: 50%; display: grid; place-items: center; flex-shrink: 0;
  font-size: 10.5px; font-weight: 800; background: #f1f5f9; color: #64748b;
}
.dcx-oitem.active .dcx-ono { background: rgba(255, 255, 255, .22); color: #fff; }
.dcx-ot { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dcx-ock { color: #22c55e; font-weight: 900; }
.dcx-oitem.done .dcx-ock { color: #16a34a; }
.dcx-links { display: flex; flex-direction: column; gap: 4px; padding: 8px; }
.dcx-side-link {
  border: none; background: transparent; text-align: left; font-size: 12.5px; font-weight: 700; color: #475569;
  padding: 8px 10px; border-radius: 9px; cursor: pointer; width: 100%;
}
.dcx-side-link:hover { background: #eef3ff; color: #2f6bff; }
.dcx-side-link.big { font-size: 13px; padding: 10px 12px; }
.dcx-learned { font-size: 12px; font-weight: 700; color: #475569; margin-bottom: 8px; }
.dcx-goal { display: flex; align-items: flex-start; gap: 7px; font-size: 12px; color: #475569; line-height: 1.6; padding: 3px 0; }
.dcx-goal i { color: #22c55e; font-style: normal; font-weight: 900; }

/* 进度条 */
.dcx-bar { height: 8px; background: #e9edf5; border-radius: 999px; overflow: hidden; }
.dcx-bar.slim { height: 6px; }
.dcx-fill { height: 100%; background: linear-gradient(90deg, #2f6bff, #6d9bff); border-radius: 999px; transition: width .35s ease; }

/* ===== 中央讲解卡 ===== */
.dcx-current-tag {
  position: absolute; top: 8px; left: 4px; z-index: 2;
  background: #2f6bff; color: #fff; font-size: 12.5px; font-weight: 800; padding: 6px 16px;
  border-radius: 999px 999px 999px 4px; box-shadow: 0 4px 12px rgba(47, 107, 255, .32);
}
.dcx-lesson {
  background: #fff; border: 1px solid #e9edf5; border-radius: 16px; padding: 24px 26px 18px;
  box-shadow: 0 1px 3px rgba(15, 23, 42, .04), 0 6px 20px rgba(15, 23, 42, .04);
  flex: 1 0 auto; display: flex; flex-direction: column;
}
.dcx-lgrid { flex: 1 0 auto; }
.dcx-ltitle { margin: 0 0 16px; font-size: 22px; font-weight: 900; color: #111827; display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }
.dcx-ltitle small { font-size: 12.5px; color: #94a3b8; font-weight: 600; }
.dcx-lgrid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 46%); gap: 20px; align-items: start; }
.dcx-lgrid.no-fig { grid-template-columns: minmax(0, 1fr); }
.dcx-lfig { display: flex; flex-direction: column; gap: 12px; min-width: 0; }
.dcx-figcap { font-size: 12.5px; font-weight: 700; color: #475569; }

/* 定理框 */
.dcx-theorem {
  border: 1px solid #cfe0ff; background: linear-gradient(160deg, #f4f8ff, #fff); border-radius: 12px;
  padding: 13px 16px; margin-bottom: 12px;
}
.dcx-theorem-head { display: flex; align-items: center; gap: 9px; margin-bottom: 7px; flex-wrap: wrap; }
.dcx-theorem-head b { font-size: 14.5px; color: #1e3a8a; }
.dcx-theorem-body { font-size: 13.5px; line-height: 1.9; color: #1f2937; }
.dcx-badge {
  flex-shrink: 0; font-size: 11.5px; font-weight: 800; color: #fff; border-radius: 7px; padding: 3px 10px;
}
.dcx-badge.blue { background: #2f6bff; }
.dcx-badge.green { background: #16a34a; }
.dcx-para { font-size: 13.5px; line-height: 1.9; color: #1f2937; margin: 0 0 10px; }

/* 例题 */
.dcx-example { border: 1px solid #bbe7c9; background: linear-gradient(160deg, #f2fbf5, #fff); border-radius: 12px; padding: 13px 16px; margin-bottom: 12px; }
.dcx-exq { font-size: 13.5px; font-weight: 700; color: #14532d; }
.dcx-sol { display: flex; gap: 10px; margin-top: 10px; }
.dcx-solmark {
  flex-shrink: 0; width: 24px; height: 24px; border-radius: 7px; background: #16a34a; color: #fff;
  font-size: 12.5px; font-weight: 900; display: grid; place-items: center; margin-top: 1px;
}
.dcx-solsteps { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6px; }
.dcx-step { font-size: 13px; line-height: 1.85; color: #1f2937; padding-left: 2px; }
.dcx-answer { display: flex; align-items: baseline; gap: 8px; margin-top: 9px; padding: 8px 12px; background: #ecfdf3; border-radius: 9px; font-size: 13.5px; color: #14532d; }
.dcx-answer b { color: #16a34a; flex-shrink: 0; }

/* 表格 */
.dcx-table { border-collapse: collapse; margin: 4px 0 14px; width: 100%; font-size: 12.5px; }
.dcx-table caption { font-size: 12px; font-weight: 700; color: #64748b; margin-bottom: 5px; }
.dcx-table th, .dcx-table td { border: 1px solid #d7dfeb; padding: 7px 10px; text-align: center; }
.dcx-table th { background: #f4f7fc; font-weight: 800; color: #334155; }

/* 结论 */
.dcx-conclusion {
  display: flex; gap: 8px; align-items: flex-start; background: #fffbeb; border: 1px solid #fde68a;
  border-radius: 10px; padding: 9px 13px; font-size: 13px; color: #78350f; line-height: 1.7; margin-bottom: 8px;
}
.dcx-textbook { font-size: 12px; color: #1e40af; background: #f0f6ff; border-radius: 9px; padding: 8px 12px; line-height: 1.8; }
.dcx-tcite { display: inline-block; background: #e3eeff; border-radius: 999px; padding: 1px 9px; margin: 2px 4px 0 0; }

/* AI 主讲行 */
.dcx-teach {
  display: flex; align-items: center; gap: 13px; margin-top: 18px; padding: 14px 15px;
  background: linear-gradient(120deg, #f6f9ff, #fdfdff); border: 1px solid #e3ecff; border-radius: 14px;
}
.dcx-tavatar {
  width: 52px; height: 52px; border-radius: 50%; overflow: hidden; flex-shrink: 0;
  background: linear-gradient(135deg, #dbeafe, #ede9fe); border: 2px solid #fff; box-shadow: 0 3px 10px rgba(15, 23, 42, .12);
}
.dcx-tavatar img { width: 100%; height: 100%; object-fit: cover; display: block; }
.dcx-tavatar.ai { width: 46px; height: 46px; }
.dcx-tavatar.lead { width: 56px; height: 56px; }
.dcx-tbubble { flex: 1; min-width: 0; background: #fff; border: 1px solid #e9edf5; border-radius: 12px; padding: 11px 14px; }
.dcx-tbhead { display: flex; align-items: center; gap: 10px; margin-bottom: 5px; }
.dcx-tbname { font-size: 12.5px; font-weight: 800; color: #2f6bff; }
.dcx-tbstate { display: flex; align-items: center; gap: 7px; font-size: 11px; font-weight: 700; color: #16a34a; }
.dcx-wave { display: inline-flex; align-items: flex-end; gap: 2px; height: 12px; }
.dcx-wave b {
  width: 2.5px; border-radius: 2px; background: #2f6bff; animation: dcxw 1s ease-in-out infinite;
}
.dcx-wave b:nth-child(odd) { height: 6px; animation-delay: .12s; }
.dcx-wave b:nth-child(3n) { height: 11px; animation-delay: .25s; }
.dcx-wave b:nth-child(4n) { height: 8px; animation-delay: .4s; }
@keyframes dcxw { 0%, 100% { transform: scaleY(.5); } 50% { transform: scaleY(1.25); } }
.dcx-tbtext { margin: 0; font-size: 13px; line-height: 1.85; color: #334155; }
.dcx-tutor-mini {
  display: flex; flex-direction: column; align-items: center; gap: 3px; flex-shrink: 0; width: 104px;
  background: #fff; border: 1px solid #e9edf5; border-radius: 12px; padding: 10px 8px;
}
.dcx-tutor-mini b { font-size: 12px; }
.dcx-tutor-mini em { font-style: normal; font-size: 10.5px; color: #16a34a; font-weight: 700; }
.dcx-mini-ask {
  margin-top: 4px; border: 1px solid #cfe0ff; background: #eef3ff; color: #2f6bff; font-size: 11.5px;
  font-weight: 800; border-radius: 999px; padding: 4px 14px; cursor: pointer;
}
.dcx-mini-ask:hover { background: #2f6bff; color: #fff; }

/* ===== 白板页签 ===== */
.dcx-board {
  margin-top: 14px; background: #fff; border: 1px solid #e9edf5; border-radius: 14px; overflow: hidden;
  flex: 1 1 auto; display: flex; flex-direction: column; min-height: 340px;
}
.dcx-btabs { display: flex; align-items: center; gap: 4px; padding: 8px 12px 0; border-bottom: 1px solid #eef1f5; }
.dcx-btabs button {
  border: none; background: transparent; font-size: 13px; font-weight: 700; color: #64748b;
  padding: 9px 16px; cursor: pointer; border-radius: 9px 9px 0 0; border-bottom: 2.5px solid transparent;
}
.dcx-btabs button.on { color: #2f6bff; border-bottom-color: #2f6bff; background: #f6f9ff; }
.dcx-bthint { margin-left: auto; font-size: 11px; color: #94a3b8; padding-bottom: 8px; }
.dcx-wb { padding: 14px 16px 16px; display: flex; flex-direction: column; gap: 12px; flex: 1; }
.dcx-wbsteps { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 8px; }
.dcx-wbstep {
  display: flex; align-items: baseline; gap: 9px; background: #fbfdff; border: 1px solid #edf1f7;
  border-radius: 9px; padding: 9px 12px; font-size: 13.5px; overflow-x: auto;
}
.dcx-wbno {
  flex-shrink: 0; width: 19px; height: 19px; border-radius: 50%; background: #2f6bff; color: #fff;
  font-size: 10.5px; font-weight: 800; display: grid; place-items: center; transform: translateY(3px);
}
.dcx-wbempty { margin: 0; font-size: 12.5px; color: #94a3b8; }
.dcx-tools { padding: 14px 16px 16px; display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.dcx-toolstip { width: 100%; margin: 0 0 2px; font-size: 12px; color: #94a3b8; }
.dcx-fchip { border: 1px solid #e5eaf3; background: #fbfdff; border-radius: 9px; padding: 9px 13px; cursor: pointer; font-size: 13.5px; }
.dcx-fchip:hover { border-color: #2f6bff; background: #f6f9ff; }
.dcx-notes { padding: 14px 16px 16px; }
.dcx-notes-area { width: 100%; min-height: 150px; resize: vertical; line-height: 1.8; }

/* ===== 页脚 ===== */
.dcx-foot {
  display: flex; align-items: center; gap: 16px; margin-top: 14px; background: #fff;
  border: 1px solid #e9edf5; border-radius: 14px; padding: 12px 18px;
}
.dcx-foot-l { display: flex; align-items: center; gap: 8px; }
.dcx-foot-q { font-size: 12px; font-weight: 700; color: #64748b; }
.dcx-chipbtn {
  border: 1px solid #e5eaf3; background: #fff; border-radius: 999px; padding: 6px 13px; cursor: pointer;
  font-size: 12px; font-weight: 700; color: #475569;
}
.dcx-chipbtn.ok { background: #ecfdf3; border-color: #86efac; color: #15803d; }
.dcx-chipbtn.again { background: #fff7ed; border-color: #fdba74; color: #c2410c; }
.dcx-foot-mid { flex: 1; display: flex; align-items: center; gap: 12px; min-width: 140px; }
.dcx-foot-mid .dcx-bar { flex: 1; }
.dcx-foot-mid span { font-size: 11.5px; color: #94a3b8; white-space: nowrap; }
.dcx-foot-r { display: flex; gap: 8px; }

/* ===== 右栏：助教 ===== */
.dcx-tutor { display: flex; flex-direction: column; gap: 10px; flex: 1 0 auto; }
.dcx-upload {
  display: flex; align-items: center; gap: 11px; border: 1.5px dashed #bcd0f7; background: #f5f9ff;
  border-radius: 12px; padding: 11px 13px; cursor: pointer; transition: all .15s ease;
}
.dcx-upload:hover { border-color: #2f6bff; background: #eef3ff; }
.dcx-upico { font-size: 20px; }
.dcx-uptxt { display: flex; flex-direction: column; gap: 1px; }
.dcx-uptxt b { font-size: 13px; color: #2f6bff; }
.dcx-uptxt small { font-size: 11px; color: #94a3b8; }
.dcx-upload-confirm { display: flex; flex-direction: column; gap: 8px; }
.dcx-upload-actions { display: flex; gap: 8px; justify-content: flex-end; }
.dcx-msgs {
  flex: 1 1 auto; min-height: 140px; max-height: 46vh; overflow-y: auto; display: flex; flex-direction: column; gap: 8px;
  border-top: 1px dashed #eef1f5; border-bottom: 1px dashed #eef1f5; padding: 10px 2px;
}
.dcx-msg-tip { font-size: 12px; color: #94a3b8; line-height: 1.7; }
.dcx-thinking { display: flex; align-items: center; gap: 4px; font-size: 12px; color: #94a3b8; padding: 4px 2px; }
.dcx-thinking span { width: 6px; height: 6px; border-radius: 50%; background: #2f6bff; animation: dcxblink 1.2s infinite; }
.dcx-thinking span:nth-child(2) { animation-delay: .2s; }
.dcx-thinking span:nth-child(3) { animation-delay: .4s; }
@keyframes dcxblink { 0%, 80%, 100% { opacity: .25; transform: scale(.8); } 40% { opacity: 1; transform: scale(1); } }
.dcx-quick { display: flex; flex-wrap: wrap; gap: 6px; }
.dcx-qchip {
  border: 1px solid #e5eaf3; background: #fff; border-radius: 999px; font-size: 12px; padding: 6px 12px;
  cursor: pointer; color: #475569; font-weight: 600;
}
.dcx-qchip:hover { border-color: #2f6bff; color: #2f6bff; background: #f6f9ff; }
.dcx-askrow { display: flex; gap: 8px; }
.dcx-askrow .dcx-input { flex: 1; }
.dcx-send {
  width: 38px; height: 38px; border-radius: 10px; border: none; background: #2f6bff; color: #fff;
  font-size: 15px; cursor: pointer; box-shadow: 0 3px 10px rgba(47, 107, 255, .3);
}
.dcx-send:disabled { opacity: .5; cursor: not-allowed; }
.dcx-send:hover:not(:disabled) { filter: brightness(1.08); }

/* ===== 右栏：分层练习 ===== */
.dcx-practice { display: flex; flex-direction: column; gap: 10px; }
.dcx-tiers { display: flex; gap: 6px; }
.dcx-tier {
  flex: 1; border: 1px solid #e5eaf3; background: #f8fafc; border-radius: 8px; padding: 7px 0;
  font-size: 12.5px; font-weight: 800; color: #64748b; cursor: pointer; transition: all .15s ease;
}
.dcx-tier.on { background: #2f6bff; border-color: #2f6bff; color: #fff; box-shadow: 0 3px 10px rgba(47, 107, 255, .28); }
.dcx-tier.empty { opacity: .45; }
.dcx-pq { font-size: 13.5px; font-weight: 700; color: #1f2937; line-height: 1.8; }
.dcx-popts { display: flex; flex-direction: column; gap: 7px; }
.dcx-popt {
  display: flex; align-items: center; gap: 9px; text-align: left; border: 1px solid #e5eaf3; background: #fbfdff;
  border-radius: 10px; padding: 9px 12px; cursor: pointer; font-size: 13px; color: #334155; transition: all .13s ease;
}
.dcx-popt b {
  flex-shrink: 0; width: 21px; height: 21px; border-radius: 50%; background: #eef2f8; color: #64748b;
  font-size: 11px; font-weight: 800; display: grid; place-items: center;
}
.dcx-popt span { flex: 1; min-width: 0; }
.dcx-popt i { font-style: normal; font-weight: 900; color: #16a34a; }
.dcx-popt i.bad { color: #dc2626; }
.dcx-popt:hover:not(:disabled) { border-color: #2f6bff; }
.dcx-popt.right { border-color: #86efac; background: #f0fdf4; }
.dcx-popt.right b { background: #16a34a; color: #fff; }
.dcx-popt.wrong { border-color: #fca5a5; background: #fef2f2; }
.dcx-popt.wrong b { background: #dc2626; color: #fff; }
.dcx-popt.dim { opacity: .55; }
.dcx-pa { background: #f6f9ff; border: 1px solid #dbe7ff; border-radius: 10px; padding: 9px 12px; font-size: 12.5px; color: #334155; line-height: 1.75; }
.dcx-pa b { color: #2f6bff; margin-right: 6px; }
.dcx-pempty { font-size: 12.5px; color: #94a3b8; text-align: center; padding: 12px 0; }
.dcx-pfoot { display: flex; align-items: center; gap: 10px; }
.dcx-ring {
  width: 46px; height: 46px; border-radius: 50%; display: grid; place-items: center; flex-shrink: 0;
}
.dcx-ring span {
  width: 36px; height: 36px; border-radius: 50%; background: #fff; display: grid; place-items: center;
  font-size: 10.5px; font-weight: 900; color: #16a34a;
}
.dcx-pcount { flex: 1; font-size: 12px; font-weight: 700; color: #64748b; }

/* ===== 创建/历史（非播放态） ===== */
.dcx-page { flex: 1; overflow-y: auto; padding: 22px clamp(16px, 4vw, 48px); }
.dcx-home, .dcx-history { max-width: 1180px; margin: 0 auto; display: flex; flex-direction: column; gap: 18px; }
.dcx-hero {
  background: linear-gradient(120deg, #eef3ff, #fdfbff 55%, #f0faff);
  border: 1px solid #dbe7ff; border-radius: 20px; padding: 24px 28px;
}
.dcx-hero h1 { margin: 0; font-size: 23px; font-weight: 900; color: #0f172a; }
.dcx-hero p { margin: 9px 0 0; font-size: 13px; line-height: 1.8; color: #475569; max-width: 860px; }
.dcx-state {
  background: #fff; border: 1px dashed #cbd5e1; border-radius: 16px; padding: 22px 20px;
  display: flex; align-items: center; justify-content: center; gap: 12px; font-size: 13.5px; color: #475569;
}
.dcx-state b { font-size: 15px; }
.dcx-state p { margin: 5px 0 0; font-size: 12.5px; color: #94a3b8; }
.dcx-state.err { flex-direction: column; text-align: center; border-color: #fecaca; }
.dcx-state.empty { color: #94a3b8; }
.dcx-state-main { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.dcx-spinner {
  width: 16px; height: 16px; border-radius: 50%; flex-shrink: 0;
  border: 2px solid rgba(47, 107, 255, .25); border-top-color: #2f6bff; animation: dcxsp .8s linear infinite;
}
@keyframes dcxsp { to { transform: rotate(360deg); } }
.dcx-entries { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px; }
.dcx-entry {
  background: #fff; border: 1px solid #e9edf5; border-radius: 18px; padding: 18px 20px;
  display: flex; flex-direction: column; gap: 12px; box-shadow: 0 1px 3px rgba(15, 23, 42, .04);
}
.dcx-entry-head { font-size: 15px; font-weight: 800; }
.dcx-tip { font-size: 12px; color: #94a3b8; line-height: 1.65; margin: 0; }
.dcx-topic { width: 100%; font-size: 13px; line-height: 1.65; resize: vertical; }
.dcx-entry-config { display: flex; gap: 10px; }
.dcx-entry-config label { display: flex; flex-direction: column; gap: 5px; font-size: 11.5px; font-weight: 700; color: #475569; }
.dcx-entry-config .dcx-input { height: 36px; }
.dcx-confirm { border-top: 1px dashed #eef1f5; padding-top: 12px; display: flex; flex-direction: column; gap: 10px; }
.dcx-confirm-title { font-size: 12px; font-weight: 800; color: #475569; }
.dcx-confirm-foot { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
.dcx-confirm-foot .dcx-btn { flex: 1 1 auto; min-width: 150px; }
.dcx-file-name { font-size: 11px; color: #94a3b8; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dcx-recent { background: #fff; border: 1px solid #e9edf5; border-radius: 16px; padding: 16px 18px; }
.dcx-recent-title { font-size: 13px; font-weight: 800; margin-bottom: 10px; }
.dcx-recent-item { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 12px; cursor: pointer; border: 1px solid transparent; }
.dcx-recent-item:hover { background: #f6f9ff; border-color: #dbe7ff; }
.dcx-recent-icon { font-size: 16px; }
.dcx-recent-txt { flex: 1; min-width: 0; }
.dcx-recent-name { font-size: 13px; font-weight: 700; }
.dcx-recent-sub { font-size: 11px; color: #94a3b8; }
.dcx-recent-go { font-size: 12px; font-weight: 800; color: #2f6bff; }
.dcx-history-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.dcx-history-head h2 { margin: 0; font-size: 19px; font-weight: 900; }
.dcx-filters { display: flex; gap: 8px; }
.dcx-filter {
  font-size: 12px; font-weight: 700; color: #475569; border: 1px solid #e5eaf3; border-radius: 999px;
  padding: 6px 14px; cursor: pointer;
}
.dcx-filter.on { background: #2f6bff; border-color: #2f6bff; color: #fff; }
.dcx-history-list { display: flex; flex-direction: column; gap: 10px; }
.dcx-hitem { background: #fff; border: 1px solid #e9edf5; border-radius: 16px; overflow: hidden; }
.dcx-hmain { display: flex; align-items: center; gap: 14px; padding: 15px 18px; cursor: pointer; }
.dcx-hmain:hover { background: #f8faff; }
.dcx-hicon { font-size: 20px; width: 36px; text-align: center; }
.dcx-hbody { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 7px; }
.dcx-htitle { font-size: 14px; font-weight: 800; }
.dcx-hsub { font-size: 11.5px; color: #94a3b8; }
.dcx-hactions { display: flex; gap: 6px; flex-shrink: 0; }

/* ===== 弹窗 ===== */
.dcx-modal-mask {
  position: fixed; inset: 0; z-index: 80; background: rgba(15, 23, 42, .45);
  display: grid; place-items: center; padding: 20px; backdrop-filter: blur(2px);
}
.dcx-modal {
  width: min(560px, 100%); max-height: 82vh; overflow-y: auto; background: #fff; border-radius: 18px;
  box-shadow: 0 24px 64px rgba(15, 23, 42, .3); padding: 20px 22px; display: flex; flex-direction: column; gap: 14px;
}
.dcx-modal-head { display: flex; align-items: center; justify-content: space-between; font-size: 16px; }
.dcx-report-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.dcx-rstat { background: #f8faff; border: 1px solid #e9edf5; border-radius: 12px; padding: 12px; display: flex; flex-direction: column; gap: 3px; }
.dcx-rstat b { font-size: 17px; color: #2f6bff; }
.dcx-rstat span { font-size: 11px; color: #94a3b8; }
.dcx-report-tier { display: flex; flex-direction: column; gap: 8px; }
.dcx-rtrow { display: flex; align-items: center; gap: 12px; font-size: 12.5px; color: #475569; }
.dcx-rtrow span { width: 40px; flex-shrink: 0; }
.dcx-rtrow b { width: 56px; text-align: right; flex-shrink: 0; font-variant-numeric: tabular-nums; }
.dcx-rtrow .dcx-bar { flex: 1; }
.dcx-report-notes { background: #f8faff; border-radius: 12px; padding: 12px 14px; font-size: 12.5px; color: #475569; }
.dcx-report-notes p { margin: 6px 0 0; white-space: pre-wrap; line-height: 1.75; }
.dcx-modal-foot { display: flex; justify-content: flex-end; gap: 10px; }
.dcx-review-list { display: flex; flex-direction: column; gap: 4px; max-height: 56vh; overflow-y: auto; }

/* ===== 通用按钮/输入 ===== */
.dcx-btn {
  border: 1px solid #e5eaf3; background: #fff; color: #334155; border-radius: 9px; padding: 8px 15px;
  font-size: 12.5px; font-weight: 700; cursor: pointer; transition: all .15s ease; white-space: nowrap;
}
.dcx-btn:hover:not(:disabled) { border-color: #2f6bff; color: #2f6bff; }
.dcx-btn:disabled { opacity: .45; cursor: not-allowed; }
.dcx-btn.primary {
  background: #2f6bff; border-color: #2f6bff; color: #fff; box-shadow: 0 3px 10px rgba(47, 107, 255, .28);
}
.dcx-btn.primary:hover:not(:disabled) { filter: brightness(1.07); color: #fff; }
.dcx-btn.lg { padding: 11px 18px; font-size: 13.5px; }
.dcx-ghost {
  border: none; background: #f1f5f9; color: #475569; border-radius: 8px; padding: 5px 10px;
  font-size: 12px; cursor: pointer; font-weight: 700;
}
.dcx-ghost:hover { background: #e2e8f0; }
.dcx-input {
  border: 1px solid #d7dfeb; border-radius: 9px; padding: 8px 11px; font: inherit; font-size: 13px;
  background: #fff; color: #0f172a;
}
.dcx-input:focus { outline: 2px solid #dbe7ff; border-color: #2f6bff; }

/* ===== 响应式 ===== */
@media (max-width: 1280px) {
  .dcx-body { grid-template-columns: 208px minmax(0, 1fr); }
  .dcx-right { grid-column: 1 / -1; display: grid; grid-template-columns: 1fr 1fr; align-items: start; }
}
@media (max-width: 900px) {
  .dcx-body { grid-template-columns: 1fr; overflow-y: auto; }
  .dcx-center { overflow: visible; }
  .dcx-right { grid-template-columns: 1fr; }
  .dcx-lgrid { grid-template-columns: 1fr; }
  .dcx-course-name { max-width: 130px; }
  .dcx-tbtn { padding: 8px 10px; }
}
</style>
