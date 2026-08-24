/**
 * 知识点维度教学建议（通用备课指导）。
 * 定位：当班级学情数据不足（未采集作业/周测/视频行为）时，不再显示空态
 * “班级数据不足”，而是退化为按「本课知识点」给出通用、有依据的教学建议。
 * 依据：教法通用规律 + 课程标准知识点要求（无班级统计数字，绝不虚构学情数据）。
 * 每类知识点内置"引入/辨析/练习/检测/小结"建议，并给出应安放到的环节类型（targetStepKind）。
 */
export interface KnowledgeAdvice {
  kp_name: string
  title: string
  description: string
  /** 依据来源说明：课标知识点/教法，非班级统计 */
  evidence: string
  /** 建议最相关安放到哪类环节：import/concept/example/practice/check/summary/intervention */
  targetStepKind: 'import' | 'concept' | 'example' | 'practice' | 'check' | 'summary' | 'intervention'
}

/** 知识点 → 通用教学建议池。kp 名与题库 kp_name 对齐；未知知识点进 DEFAULT_ADVICE。 */
const ADVICE_BY_KP: Record<string, KnowledgeAdvice[]> = {
  '函数的单调性': [
    { kp_name: '函数的单调性', title: '以图象先入再定义', description: '先让学生观察函数图象升降趋势，再用“随 x 增大 f(x) 增大/减小”的语言过渡到严格单调性定义，避免一上来就背判定法则。', evidence: '课标·函数概念与性质；概念形成宜先直观后抽象', targetStepKind: 'import' },
    { kp_name: '函数的单调性', title: '补一组“边界反例”辨析', description: '单调区间端点的开闭、分段衔接点处需单独检验，建议设计“x=-1 处是否同属两侧单调区间”的辨析例题，纠正常见漏判。', evidence: '本知识点高频易错点（边界与分界点）', targetStepKind: 'example' },
    { kp_name: '函数的单调性', title: '用求导法定性判断单调区间', description: '把 f\'(x)>0/<0 的符号分析与函数递增/递减一一对应，建议安排 2~3 道“求单调区间”小题即时反馈。', evidence: '高中数学·导数应用（单调性判定）', targetStepKind: 'practice' },
    { kp_name: '函数的单调性', title: '含参讨论做一处当堂检测', description: '对参数分类讨论（如 f(x)=x^3+ax 在 R 上单调递增求 a 范围）设 1 道检测题，能暴露大部分学生参数的临界取值错漏。', evidence: '该知识点进阶常见失分点（参数临界）', targetStepKind: 'check' },
  ],
  '函数的奇偶性': [
    { kp_name: '函数的奇偶性', title: '图象对称先入', description: '从 y 轴轴对称（偶）与原点中心对称（奇）出发建立概念，再落到 f(-x) 与 f(x) 的关系式，直观与代数双线并进。', evidence: '课标·函数奇偶性；以图象对称建立概念', targetStepKind: 'import' },
    { kp_name: '函数的奇偶性', title: '辨析定义域对称前提', description: '强调“定义域关于原点对称”是奇偶性的先决条件，建议安排一道“非对称定义域不具奇偶性”的反例辨析。', evidence: '奇偶性判定的首要前提（定义域对称）', targetStepKind: 'example' },
    { kp_name: '函数的奇偶性', title: '结合性质求参数', description: '利用偶函数 f(-x)=f(x)、奇函数过原点等性质反求 a、c 等参数，设计 1 道“由性质求参”当堂练。', evidence: '奇偶性应用的常见题型（性质求参）', targetStepKind: 'practice' },
  ],
  '函数的基本性质': [
    { kp_name: '函数的基本性质', title: '最值先看定义域与区间', description: '求可导/二次函数在闭区间上的最值，强调先定定义域、再在区间内求极值点并比较端点值，避免只求顶点。', evidence: '函数最值求解的完整流程（区间端点比较）', targetStepKind: 'practice' },
    { kp_name: '函数的基本性质', title: '综合小题做课堂检测', description: '综合单调性、奇偶性、最值出一道小综合题检测，观察学生能否连贯运用多个性质。', evidence: '章节综合考察（性质联动）', targetStepKind: 'check' },
  ],
  '集合': [
    { kp_name: '集合', title: '用文氏图组织交并补', description: '以文氏图先画再算，帮助学生直观完成 A∩B、A∪B、补集的运算，再过渡到“区间/不等式的集合运算”。', evidence: '集合运算的建议教法（数形结合）', targetStepKind: 'import' },
  ],
  '函数与导数': [
    { kp_name: '函数与导数', title: '导数几何意义先落地', description: '先明确 f\'(x_0) 的几何意义为切点处切线斜率，再做单调区间/切线方程练习，避免把导数只当“求导公式”。', evidence: '课标·导数的几何意义', targetStepKind: 'concept' },
  ],
}

/** 未知知识点的兜底建议（通用、适用任意数学课题） */
const DEFAULT_ADVICE: KnowledgeAdvice[] = [
  { kp_name: '通用数学', title: '先激活已有认知', description: '用一道与本课关联的旧知小问开课，激活学生已有知识，建立新旧知识连接。', evidence: '通用教学法（先行组织者）', targetStepKind: 'import' },
  { kp_name: '通用数学', title: '安排随堂即时检测', description: '在讲授 2~3 个环节后插入 1 道即时检测题，用“明确答案+快速诊断”确认多数学生掌握，避免整节课单向灌输。', evidence: '形成性评价（checking for understanding）', targetStepKind: 'check' },
  { kp_name: '通用数学', title: '本节收束成口诀/小结', description: '把本节关键结论与易错点压缩为板书小结，留 2 分钟让学生口述复述，检验学习是否内化。', evidence: '课堂小结（exit ticket）', targetStepKind: 'summary' },
]

/** 提取建议所适用的知识点。优先取 Known KP；无则对每个建议生成一次通用建议（去重）。 */
export function suggestionsForKnowledgePoints(
  kpNames: string[],
  limit = 4,
): Array<KnowledgeAdvice & { kp_name: string }> {
  const known = (kpNames || []).filter((k) => k && ADVICE_BY_KP[k]).slice(0, 3)
  const used: Array<KnowledgeAdvice & { kp_name: string }> = []
  const seen = new Set<string>()
  for (const kp of known) {
    for (const a of ADVICE_BY_KP[kp]) {
      if (seen.has(a.title)) continue
      seen.add(a.title)
      used.push(a)
      if (used.length >= limit) return used
    }
  }
  // 补足到 limit：未知/无匹配知识点时放入通用建议
  for (const a of DEFAULT_ADVICE) {
    if (seen.has(a.title)) continue
    seen.add(a.title)
    used.push(a)
    if (used.length >= limit) break
  }
  return used
}