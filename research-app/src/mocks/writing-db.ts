/**
 * 写作域 MSW 内存库（CR-F3-01..04 契约草案数据）。
 *
 * 仅 dev/test；生产构建不进 bundle。UI 常驻「契约草案数据源」徽标。
 * 种子：一个真实数学建模 LaTeX 文稿（自研模板，不复制 Overleaf），
 * 含公式/引用/图表/节；references.bib 由引用插入（已核验 CitationRecord）驱动。
 */
import type { AiSuggestion, Manuscript, ManuscriptFile, CompileRun } from '@entities/writing/types';
import type { TranslationRun } from '@entities/translation/types';
import type { TenantRecord } from './db';

export interface WritingStore {
  manuscripts: Manuscript[];
  filesByManuscript: Map<string, ManuscriptFile[]>;
  suggestionsByManuscript: Map<string, AiSuggestion[]>;
  /** runId → 编译/翻译状态视图（草案端点 GET /runs/:id）。 */
  compileRuns: Map<string, Record<string, unknown>>;
}

const iso = (offsetMs: number) => new Date(Date.now() - offsetMs).toISOString();
const DAY = 86_400_000;

export function emptyWritingStore(): WritingStore {
  return { manuscripts: [], filesByManuscript: new Map(), suggestionsByManuscript: new Map(), compileRuns: new Map() };
}

/** 懒初始化写作域存储（首次命中写作端点时播种）。 */
export function writingOf(tenant: TenantRecord): WritingStore {
  if (!tenant.writing) {
    const projectId = tenant.projects[0]?.id ?? 'proj-alpha-1';
    tenant.writing = seedWritingStore(tenant.tenantId, projectId);
  }
  return tenant.writing;
}

/** 注册编译 run 状态（POST /runs run_type=writing 后调用；compileRuns 键不含前缀）。 */
export function registerCompileRun(
  store: WritingStore,
  runId: string,
  manuscriptId: string,
  scenario: 'success' | 'missing_resource' | 'unsafe_command',
): void {
  const run: CompileRun = {
    run_id: runId,
    status: 'queued',
    progress: null,
    stageMessage: '等待服务端事件',
    log: null,
    engine: 'Tectonic 0.15.0',
    input_hash: `sha256:${crypto.randomUUID().slice(0, 16)}`,
    pdf_artifact_id: null,
    errors: [],
  };
  store.compileRuns.set(runId, { ...run, _scenario: scenario, _manuscript_id: manuscriptId } as CompileRun & Record<string, unknown>);
}

/** 注册翻译 run 状态（POST /runs run_type=translation 后调用；键带 trans: 前缀）。 */
export function registerTranslationRun(store: WritingStore, runId: string, itemId: string): void {
  const run: TranslationRun = {
    run_id: runId,
    status: 'queued',
    progress: null,
    stageMessage: '等待服务端事件',
    budget: { max_runtime_seconds: 1800, max_cost_minor_units: 5000 },
    spent: { runtime_seconds: 0, cost_minor_units: 0 },
    artifact_id: null,
  };
  store.compileRuns.set(`trans:${runId}`, { ...run, _item_id: itemId } as TranslationRun & Record<string, unknown>);
}

/** 自研数学建模论文 LaTeX 模板（真实内容，非占位）。 */
export function seedMainTex(): string {
  return `\\documentclass[12pt]{article}
\\usepackage[utf8]{inputenc}
\\usepackage{amsmath,amssymb}
\\usepackage{graphicx}
\\usepackage{hyperref}
\\usepackage{geometry}
\\geometry{a4paper, margin=2.5cm}

\\title{分层线性模型下数学建模成绩差异的多层分析}
\\author{林研究员}
\\date{\\today}

\\begin{document}
\\maketitle

\\section{引言}\\label{sec:intro}
\\input{sections/intro.tex}

\\section{数据与方法}\\label{sec:method}
本研究采用两层数据结构：第一层为学生个体，第二层为学校。
层一模型刻画校内关系：
\\begin{equation}\\label{eq:l1}
  y_{ij} = \\beta_{0j} + \\beta_{1j}x_{ij} + r_{ij}, \\quad r_{ij} \\sim N(0,\\sigma^2)
\\end{equation}
层二模型刻画校间关系：
\\begin{align}
  \\beta_{0j} &= \\gamma_{00} + \\gamma_{01}W_j + u_{0j} \\label{eq:l2a} \\\\
  \\beta_{1j} &= \\gamma_{10} + u_{1j} \\label{eq:l2b}
\\end{align}

\\section{结果}\\label{sec:results}
见表~\\ref{tab:summary} 与图~\\ref{fig:model}。

\\begin{table}[h]
  \\centering
  \\caption{主要估计结果}\\label{tab:summary}
  \\begin{tabular}{lcc}
    \\hline
    参数 & 估计 & 标准误 \\\\
    \\hline
    $\\gamma_{00}$ & 68.4 & 2.1 \\\\
    $\\gamma_{01}$ & 3.2 & 0.8 \\\\
    $\\sigma^2$ & 41.7 & 3.0 \\\\
    \\hline
  \\end{tabular}
\\end{table}

\\begin{figure}[h]
  \\centering
  \\fbox{（此处插入模型示意图）}
  \\caption{两层模型结构示意}\\label{fig:model}
\\end{figure}

\\section{讨论与结论}\\label{sec:discussion}
\\input{sections/conclusion.tex}

\\bibliographystyle{plain}
\\bibliography{references}
\\end{document}
`;
}

export function seedIntroTex(): string {
  return `分层线性模型（HLM）将总方差分解为学校层与个体层两个来源，
并允许回归系数跨学校变化。该框架与 \\cite{raudenbush2002hierarchical}
的两层模型记号一致：$\\beta_{0j}$ 表示学校 $j$ 的截距，
$\\beta_{1j}$ 表示该校的斜率。
`;
}

export function seedConclusionTex(): string {
  return `分析表明学校层面的资源投入（$W_j$）与校间截距差异显著相关
（\\ref{eq:l2a}）。未来工作将引入稳健标准误与更细粒度协变量，
并考虑跨省可比性。`;
}

export function emptyBibTex(): string {
  return `% references.bib —— 引用仅来自已核验 CitationRecord（CR-F3-04）
`;
}

export function seedWritingStore(tenantId: string, projectId: string): WritingStore {
  const store = emptyWritingStore();
  const manuscript: Manuscript = {
    id: 'ms-alpha-1',
    tenant_id: tenantId,
    project_id: projectId,
    name: '分层线性模型成绩分析论文',
    file_ids: ['file-main', 'file-intro', 'file-concl', 'file-bib'],
    version: 1,
    created_at: iso(6 * DAY),
    updated_at: iso(1 * DAY),
  };
  const files: ManuscriptFile[] = [
    { id: 'file-main', manuscript_id: manuscript.id, path: 'main.tex', content: seedMainTex(), version: 3, updated_at: iso(1 * DAY) },
    { id: 'file-intro', manuscript_id: manuscript.id, path: 'sections/intro.tex', content: seedIntroTex(), version: 2, updated_at: iso(2 * DAY) },
    { id: 'file-concl', manuscript_id: manuscript.id, path: 'sections/conclusion.tex', content: seedConclusionTex(), version: 1, updated_at: iso(3 * DAY) },
    { id: 'file-bib', manuscript_id: manuscript.id, path: 'references.bib', content: emptyBibTex(), version: 1, updated_at: iso(3 * DAY) },
  ];
  const suggestions: AiSuggestion[] = [
    {
      id: 'sg-1',
      manuscript_id: manuscript.id,
      file_path: 'sections/intro.tex',
      line_from: 1,
      line_to: 4,
      original: '分层线性模型（HLM）将总方差分解为学校层与个体层两个来源，并允许回归系数跨学校变化。',
      suggested: '分层线性模型（HLM）将响应变量的总方差分解为学校层与个体层两个来源，并允许回归系数跨学校变化，从而刻画嵌套数据结构中的组间异质性。',
      reason: '补充“组间异质性”这一术语，使模型适用场景更明确。',
      risk: '低风险：仅补充表述，不改变数学含义。',
      status: 'pending',
      decided_at: null,
    },
    {
      id: 'sg-2',
      manuscript_id: manuscript.id,
      file_path: 'main.tex',
      line_from: 36,
      line_to: 38,
      original: '见表~\\ref{tab:summary} 与图~\\ref{fig:model}。',
      suggested: '估计结果汇总于表~\\ref{tab:summary}，两层模型结构见图~\\ref{fig:model}。',
      reason: '表述更正式，符合学术写作规范。',
      risk: '低风险：仅为措辞调整。',
      status: 'pending',
      decided_at: null,
    },
    {
      id: 'sg-3',
      manuscript_id: manuscript.id,
      file_path: 'sections/conclusion.tex',
      line_from: 1,
      line_to: 4,
      original: '未来工作将引入稳健标准误与更细粒度协变量，并考虑跨省可比性。',
      suggested: '建议删除“未来工作”段，以缩短篇幅聚焦实证结果。',
      reason: '结论更简洁。',
      risk: '高风险：删除内容需作者确认，且可能删去创新点声明。',
      status: 'pending',
      decided_at: null,
    },
  ];
  store.manuscripts.push(manuscript);
  store.filesByManuscript.set(manuscript.id, files);
  store.suggestionsByManuscript.set(manuscript.id, suggestions);
  return store;
}
