/**
 * 写作域实体（LaTeX 文稿/文件/编译/AI diff）。
 *
 * 契约依据（CR-F3-01..04 推导，待 Agent 2 冻结）：
 * - M4 §8.5 LaTeX 写作：文件树、CodeMirror、编译、错误定位、润色逐条 diff。
 * - 02 §4 通用字段：UUIDv7、tenant_id、version 乐观锁、RFC 3339。
 * - 冻结引用：ResearchRun/RunEvent/Artifact 直接取自 M0 openapi。
 */

/** 文稿（项目内一个 LaTeX 项目）。 */
export interface Manuscript {
  id: string;
  tenant_id: string;
  project_id: string;
  name: string;
  /** 文件树（main.tex / sections/ / references.bib ...）。 */
  file_ids: string[];
  version: number;
  created_at: string;
  updated_at: string;
}

/** 文稿内单个文件（LaTeX 源码 / .bib / 配置）。 */
export interface ManuscriptFile {
  id: string;
  manuscript_id: string;
  /** 相对路径，如 main.tex、sections/intro.tex、references.bib。 */
  path: string;
  content: string;
  /** 乐观锁版本。 */
  version: number;
  updated_at: string;
}

/** 编译 run 视图（run_type=writing，冻结 ResearchRun/Artifact）。 */
export interface CompileRun {
  run_id: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';
  /** 0-100（SSE step.progress）。 */
  progress: number | null;
  stageMessage: string | null;
  /** 编译日志文本（草案端点）。 */
  log: string | null;
  /** 引擎版本（Tectonic）。 */
  engine: string | null;
  /** 输入哈希（Artifact 输入快照）。 */
  input_hash: string | null;
  /** 编译产物 PDF artifact id（成功后）。 */
  pdf_artifact_id: string | null;
  /** 结构化错误（失败后，前端行级定位）。 */
  errors: CompileError[];
}

export interface CompileError {
  file: string;
  line: number | null;
  /** 如 Undefined control sequence / File not found。 */
  kind: string;
  message: string;
  /** 不安全命令检测。 */
  unsafe_command: boolean;
}

/** AI 改写建议（AI 生成内容只能作为差异修订，逐项接受/拒绝）。 */
export interface AiSuggestion {
  id: string;
  manuscript_id: string;
  file_path: string;
  /** 原文行区间（1-based）。 */
  line_from: number;
  line_to: number;
  original: string;
  suggested: string;
  reason: string;
  risk: string;
  status: 'pending' | 'accepted' | 'rejected';
  decided_at: string | null;
}

/** 引用插入视图（候选仅来自已核验 CitationRecord，CR-F3-04）。 */
export interface CitationCandidate {
  item_id: string;
  citation_key: string;
  title: string;
  authors: string[];
  year: number | null;
  venue: string | null;
  /** 是否已在文稿 references.bib 中。 */
  already_in_bib: boolean;
}
