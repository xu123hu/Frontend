/**
 * 本地确定性候选题库（Fixture 层）。
 * 职责：为主流程（POST /teacher/quizzes/generate）与逐题「换一题/重新生成/找相似题」
 * 提供真实感、可复现、按知识点×难度分布的题目供给，并在池不足时用参数化变式补足题量。
 * 真实后端提供 /teacher/quizzes 单题替换与 AI 组卷后，本层退化为本地 adapter。
 */
import type { QuizQuestion } from '@/types/teacher'

export interface BankQuestion {
  q_type: QuizQuestion['q_type']
  difficulty: QuizQuestion['difficulty']
  kp_code: string
  kp_name: string
  question_text: string
  options?: string[]
  answer: string
  answer_analysis: string
  /** 真题来源（本地兜底题缺省 → 如实标注「本地样例」）；供溯源徽标使用 */
  source?: string
  source_ref?: string
}

/** 出题可配置参数（与 /teacher/quizzes/generate 请求体对齐） */
export interface QuizBuildParams {
  /** 知识点名称或 code 数组；决定出题范围。留空则在全部题库出题 */
  knowledge_points?: string[]
  count: number
  /** 题型份数（可只给部分：choice/blank/text） */
  question_types?: { choice?: number; blank?: number; text?: number }
  /** 难度比例（0~1，不足 1 则按给定比例归一） */
  difficulty?: { easy?: number; medium?: number; hard?: number }
  exclude_hashes?: string[]
}

// ===== 题库（跨知识点，内容真实可用） =====
const BANK: BankQuestion[] = [
  // ---- 函数的单调性 MATH-101 ----
  { q_type: 'choice', difficulty: 'easy', kp_code: 'MATH-101', kp_name: '函数的单调性', question_text: '函数 $f(x)=x^2-2x$ 的单调递减区间是？', options: ['$(-\\infty,1]$', '$[1,+\\infty)$', '$(-\\infty,2]$', '$[2,+\\infty)$'], answer: 'A', answer_analysis: '求导 $f\'(x)=2x-2$，令 $f\'(x)<0$ 得 $x<1$，故递减区间为 $(-\\infty,1]$。' },
  { q_type: 'choice', difficulty: 'easy', kp_code: 'MATH-101', kp_name: '函数的单调性', question_text: '下列函数中，在 $(0,+\\infty)$ 上单调递增的是？', options: ['$f(x)=-x$', '$f(x)=x^2$', '$f(x)=\\frac1x$', '$f(x)=-x^2$'], answer: 'B', answer_analysis: '$x^2$ 在正区间单调递增；$-x$ 与 $\\frac1x$ 递减，$-x^2$ 先增后减。' },
  { q_type: 'choice', difficulty: 'easy', kp_code: 'MATH-101', kp_name: '函数的单调性', question_text: '函数 $f(x)=-x^2+4x$ 的单调递增区间是？', options: ['$(-\\infty,2]$', '$[2,+\\infty)$', '$(-\\infty,-2]$', '$[0,+\\infty)$'], answer: 'A', answer_analysis: '开口向下的抛物线，对称轴 $x=2$，左侧递增，故为 $(-\\infty,2]$。' },
  { q_type: 'blank', difficulty: 'easy', kp_code: 'MATH-101', kp_name: '函数的单调性', question_text: '函数 $f(x)=x^3$ 在 $\\mathbb{R}$ 上是单调____函数。（填“增”或“减”）', answer: '增', answer_analysis: '$f\'(x)=3x^2\\ge 0$，仅在 $x=0$ 取等，故 $f(x)$ 在 $\\mathbb{R}$ 上单调递增。' },
  { q_type: 'blank', difficulty: 'medium', kp_code: 'MATH-101', kp_name: '函数的单调性', question_text: '函数 $f(x)=x^3-3x$ 在区间 $(1,+\\infty)$ 上是单调____函数。', answer: '增', answer_analysis: '$f\'(x)=3x^2-3=3(x-1)(x+1)>0$ 当 $x>1$，故单调递增。' },
  { q_type: 'blank', difficulty: 'medium', kp_code: 'MATH-101', kp_name: '函数的单调性', question_text: '若 $f(x)=x^3+ax$ 在 $\\mathbb{R}$ 上单调递增，则实数 $a$ 的取值范围是____。', answer: '$a\\ge 0$', answer_analysis: '$f\'(x)=3x^2+a\\ge 0$ 恒成立 $\\Rightarrow a\\ge 0$。' },
  { q_type: 'text', difficulty: 'hard', kp_code: 'MATH-101', kp_name: '函数的单调性', question_text: '已知 $f(x)=x^3-3x$，判断并证明其在 $\\mathbb{R}$ 上的单调区间。', answer: '减区间 $(-1,1)$，增区间 $(-\\infty,-1)$ 与 $(1,+\\infty)$', answer_analysis: '$f\'(x)=3(x^2-1)$，列表分析符号即可：$x<-1$ 递增，$-1<x<1$ 递减，$x>1$ 递增。' },
  { q_type: 'text', difficulty: 'hard', kp_code: 'MATH-101', kp_name: '函数的单调性', question_text: '已知函数 $f(x)=x^3-ax$ 在 $[1,+\\infty)$ 单调递增，求 $a$ 的取值范围。', answer: '$a\\le 3$', answer_analysis: '$f\'(x)=3x^2-a\\ge 0$ 在 $[1,+\\infty)$ 恒成立，即 $a\\le 3x^2$ 对 $x\\ge1$ 恒成立，$3x^2$ 最小为 $3$，故 $a\\le 3$。' },
  { q_type: 'choice', difficulty: 'medium', kp_code: 'MATH-101', kp_name: '函数的单调性', question_text: '函数 $f(x)=x^3-3x$ 的单调递减区间是？', options: ['$(-1,1)$', '$(-\\infty,-1)$', '$(1,+\\infty)$', '$\\mathbb{R}$'], answer: 'A', answer_analysis: '$f\'(x)=3(x^2-1)<0$ 当 $-1<x<1$。' },
  { q_type: 'choice', difficulty: 'medium', kp_code: 'MATH-101', kp_name: '函数的单调性', question_text: '若 $f(x)=x^3+ax$ 在 $\\mathbb{R}$ 上单调递增，实数 $a$ 的取值范围是？', options: ['$a\\ge 0$', '$a\\le 0$', '$a>0$', '$a<0$'], answer: 'A', answer_analysis: '$f\'(x)=3x^2+a\\ge 0$ 恒成立 $\\Rightarrow a\\ge 0$。' },

  // ---- 函数的奇偶性 MATH-102 ----
  { q_type: 'choice', difficulty: 'easy', kp_code: 'MATH-102', kp_name: '函数的奇偶性', question_text: '下列函数中为偶函数的是？', options: ['$f(x)=x^2$', '$f(x)=x^3$', '$f(x)=x+1$', '$f(x)=\\frac1x$'], answer: 'A', answer_analysis: '$f(-x)=(-x)^2=x^2=f(x)$，故为偶函数；其余三者为奇函数或非奇非偶。' },
  { q_type: 'blank', difficulty: 'easy', kp_code: 'MATH-102', kp_name: '函数的奇偶性', question_text: '若 $f(x)$ 是偶函数且 $f(2)=3$，则 $f(-2)$ 的值为____。', answer: '3', answer_analysis: '偶函数满足 $f(-x)=f(x)$，故 $f(-2)=f(2)=3$。' },
  { q_type: 'choice', difficulty: 'medium', kp_code: 'MATH-102', kp_name: '函数的奇偶性', question_text: '若 $f(x)=x^2+bx$ 是偶函数，则 $b$ 的值为？', options: ['$0$', '$1$', '$2$', '$-1$'], answer: 'A', answer_analysis: '偶函数不含奇次项，$f(x)=x^2+bx$ 需 $b=0$。' },
  { q_type: 'blank', difficulty: 'medium', kp_code: 'MATH-102', kp_name: '函数的奇偶性', question_text: '若 $f(x)=ax^3+bx+c$ 是奇函数，则常数 $c$ 的值为____。', answer: '0', answer_analysis: '奇函数 $f(0)=0$（必过原点），即 $a\\cdot0+b\\cdot0+c=0$，故 $c=0$。' },

  // ---- 函数的基本性质 MATH-103 ----
  { q_type: 'choice', difficulty: 'easy', kp_code: 'MATH-103', kp_name: '函数的基本性质', question_text: '函数 $f(x)=|x|$ 的值域是？', options: ['$[0,+\\infty)$', '$(-\\infty,0]$', '$\\mathbb{R}$', '$[0,1]$'], answer: 'A', answer_analysis: '$|x|\\ge 0$ 且可取到任意非负实数，值域为 $[0,+\\infty)$。' },
  { q_type: 'blank', difficulty: 'medium', kp_code: 'MATH-103', kp_name: '函数的基本性质', question_text: '函数 $f(x)=\\frac1x$ 在区间 $(0,+\\infty)$ 上是单调____函数。', answer: '减', answer_analysis: '任取 $0<x_1<x_2$，$f(x_1)-f(x_2)=\\frac{1}{x_1}-\\frac{1}{x_2}=\\frac{x_2-x_1}{x_1x_2}>0$，故单调递减。' },
  { q_type: 'text', difficulty: 'medium', kp_code: 'MATH-103', kp_name: '函数的基本性质', question_text: '判断并证明函数 $f(x)=x+\\frac1x$ 在区间 $(1,+\\infty)$ 上的单调性。', answer: '单调递增', answer_analysis: '任取 $1<x_1<x_2$，$f(x_2)-f(x_1)=(x_2-x_1)(1-\\frac{1}{x_1x_2})>0$（因 $x_1x_2>1$），故单调递增。' },
  { q_type: 'text', difficulty: 'hard', kp_code: 'MATH-103', kp_name: '函数的基本性质', question_text: '求函数 $f(x)=x^2-2x+3$ 在闭区间 $[0,3]$ 上的最大、最小值。', answer: '最大值 $6$，最小值 $2$', answer_analysis: '对称轴 $x=1\\in[0,3]$，$f(1)=2$；端点 $f(0)=3,\\ f(3)=6$。比较得最小 $2$、最大 $6$。' },

  // ---- 集合与函数 MATH-001 ----
  { q_type: 'choice', difficulty: 'easy', kp_code: 'MATH-001', kp_name: '集合', question_text: '已知 $A=\\{1,2,3\\}$，$B=\\{2,3,4\\}$，则 $A\\cap B$ 为？', options: ['$\\{2,3\\}$', '$\\{1,2,3,4\\}$', '$\\{1,4\\}$', '$\\varnothing$'], answer: 'A', answer_analysis: '交集取两集合共同元素 $2,3$。' },
  { q_type: 'blank', difficulty: 'easy', kp_code: 'MATH-001', kp_name: '集合', question_text: '已知 $A=\\{1,2\\}$，$B=\\{2,3,4\\}$，则 $A\\cup B$ 的元素个数为____。', answer: '4', answer_analysis: '并集 $\\{1,2,3,4\\}$，共 $4$ 个元素。' },
  { q_type: 'choice', difficulty: 'medium', kp_code: 'MATH-001', kp_name: '集合', question_text: '集合 $A=\\{x\\mid x^2-3x+2=0\\}$ 等于？', options: ['$\\{1,2\\}$', '$\\{-1,-2\\}$', '$\\{1,-2\\}$', '$\\varnothing$'], answer: 'A', answer_analysis: '$x^2-3x+2=(x-1)(x-2)=0$，两根为 $1,2$。' },
  { q_type: 'text', difficulty: 'medium', kp_code: 'MATH-001', kp_name: '集合', question_text: '已知 $A=\\{x\\mid x>1\\}$，$B=\\{x\\mid x\\le 3\\}$，求 $A\\cup B$ 与 $A\\cap B$。', answer: '$A\\cup B=\\mathbb{R}$，$A\\cap B=(1,3]$', answer_analysis: '$A$ 为 $(1,+\\infty)$，$B$ 为 $(-\\infty,3]$；并集覆盖全实数，交集为 $(1,3]$。' },
]

/** 范围/知识点 → 题库 kp_code 集合（供页面按范围限定出题） */
export const SCOPE_TO_KP: Record<string, { code: string; name: string }[]> = {
  monotonicity: [{ code: 'MATH-101', name: '函数的单调性' }],
  parity: [{ code: 'MATH-102', name: '函数的奇偶性' }],
  basic: [{ code: 'MATH-103', name: '函数的基本性质' }],
  chapter1: [
    { code: 'MATH-001', name: '集合' },
    { code: 'MATH-101', name: '函数的单调性' },
    { code: 'MATH-102', name: '函数的奇偶性' },
    { code: 'MATH-103', name: '函数的基本性质' },
  ],
}

/** 仅单调性题库（Back-compat：逐题“换一题”仍可用；新逻辑走 BANK） */
export const MONOTONICITY_BANK: BankQuestion[] = BANK.filter((q) => q.kp_code === 'MATH-101')

/** 取与目标知识点/难度匹配、且未被排除的候选题（本地 Fallback） */
export function replacementCandidates(
  kpCode: string | undefined,
  difficulty: QuizQuestion['difficulty'],
  excludeTexts: string[],
): BankQuestion[] {
  return BANK.filter(
    (q) => q.difficulty === difficulty && (!kpCode || q.kp_code === kpCode) && !excludeTexts.includes(q.question_text),
  )
}

/** 选择题乱序重排并对齐答案字母（打破“答案恒为 B”，增强真实感）；mulberry32 真乱序、确定性可复现 */
function shuffleChoice(q: BankQuestion, seed: string): BankQuestion {
  const opts = q.options ? [...q.options] : []
  if (opts.length < 2) return q
  const orig = q.answer.trim().toUpperCase()
  const origIdx = orig.charCodeAt(0) - 65
  const correct = origIdx >= 0 && origIdx < opts.length ? opts[origIdx] : q.answer
  // 确定性 PRNG（基于 seed）
  let h = 1779033703
  for (let k = 0; k < seed.length; k++) { h = Math.imul(h ^ seed.charCodeAt(k), 3432918353); h = (h << 13) | (h >>> 19) }
  const rand = () => {
    h = (h + 0x6D2B79F5) | 0
    let t = Math.imul(h ^ (h >>> 15), 1 | h)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const shuffled = [...opts]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  const newLetter = String.fromCharCode(65 + shuffled.indexOf(correct))
  return { ...q, options: shuffled, answer: newLetter }
}

/** 参数化变式：池耗尽时按系数簇生成真正不同的单调性题，保证题量足额且内容真实 */
function parametricMonotonicity(label: number): BankQuestion {
  const base = (label % 6) - 3 // a ∈ {-3..2}
  const a = base || 1
  const kp: BankQuestion = {
    q_type: (label % 3 === 0 ? 'choice' : label % 3 === 1 ? 'blank' : 'text') as BankQuestion['q_type'],
    difficulty: ('easy' as const),
    kp_code: 'MATH-101', kp_name: '函数的单调性',
    question_text: `设函数 $f(x)=x^3+${a}x$，请写出其单调递增区间（情形 ${label}）。`,
    options: ['$(-\\infty,-\\sqrt{-\\frac{a}{3}})\\cup(\\sqrt{-\\frac{a}{3}},+\\infty)$', '$(-\\infty,+\\infty)$', '$(-\\infty,0)$', '$(0,+\\infty)$'],
    answer: 'B',
    answer_analysis: `当 $a\\ge 0$ 时 $f'(x)=3x^2+${3 * a}\\ge0$，$f(x)$ 在 $\\mathbb{R}$ 上恒递增；当 $a<0$ 分为三段，两侧单调递增。`,
  }
  return shuffleChoice(kp, `param-${label}`)
}

/** 按参数从题库抽取 count 道题（D1：足额、不静默减题），并乱序选项 */
export function buildQuizSet(params: QuizBuildParams): BankQuestion[] {
  const count = Math.max(1, params.count)
  const scopeCodes = new Set(
    (params.knowledge_points || []).flatMap((kp) => {
      const hit = BANK.find((q) => q.kp_name === kp || q.kp_code === kp)
      return hit ? [hit.kp_code] : []
    }),
  )
  const pool = scopeCodes.size ? BANK.filter((q) => scopeCodes.has(q.kp_code)) : [...BANK]

  // 难度比例 → 每档目标题数（容缺省，全部按给定比例归一）
  const easy = params.difficulty?.easy ?? 0.4
  const medium = params.difficulty?.medium ?? 0.4
  const hard = params.difficulty?.hard ?? 0.2
  const rTotal = easy + medium + hard
  const re = rTotal > 0 ? easy : 0.4
  const rm = rTotal > 0 ? medium : 0.4
  const rh = rTotal > 0 ? hard : 0.2
  const denom = re + rm + rh
  const slots: Array<'easy' | 'medium' | 'hard'> = []
  const diffOrder: Array<'easy' | 'medium' | 'hard'> = ['easy', 'medium', 'hard']
  let remaining = count
  for (const d of diffOrder) {
    const base = d === 'easy' ? re : d === 'medium' ? rm : rh
    const n = d === 'hard' ? remaining : Math.round(count * (base / denom))
    for (let i = 0; i < n && remaining > 0; i++) { slots.push(d); remaining-- }
  }
  while (slots.length < count) slots.push('easy')

  const used = new Set<string>()
  const chosen: BankQuestion[] = []
  for (let i = 0; i < count; i++) {
    const wantDiff = slots[i]
    // 优先：范围内 + 目标难度 + 不同题干
    let pick = pool.find((q) => q.difficulty === wantDiff && !used.has(q.question_text))
    // 其次：范围内任一不同题干
    if (!pick) pick = pool.find((q) => !used.has(q.question_text))
    if (pick) {
      used.add(pick.question_text)
      chosen.push(shuffleChoice(pick, `gen-${i}`))
      continue
    }
    // 池耗尽：参数化变式补足（保证足额，不静默减题）
    let k = i
    let variant = parametricMonotonicity(k)
    while (used.has(variant.question_text)) { k += 1; variant = parametricMonotonicity(k) }
    used.add(variant.question_text)
    chosen.push(variant)
  }
  return chosen
}