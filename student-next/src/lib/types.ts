/** 与共享契约对齐的前端类型（contracts/api-contracts.md v1.0 + event-contracts v1.0-rc1） */

export interface QuestionImage {
  image_url: string;
  hires_url?: string;
  caption?: string;
  width?: number;
  height?: number;
}

export type ChatStatus = "idle" | "connecting" | "streaming" | "error";

/** event-contracts §3 wait_for_input 的追问 */
export interface PendingQuestion {
  id: string;
  prompt: string;
  kind: "text" | "choice";
  options?: { label: string }[];
}

/** event-contracts §3 sources 的引用 */
export interface SourceRef {
  title: string;
  locator: string;
  url?: string;
  snippet?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  /** 流式/定稿文本（仅拼接 call_kind="answer" 的 delta） */
  text: string;
  /** 题目/图形图片卡（quiz_item.stem_images、figure blocks） */
  images: QuestionImage[];
  /** stage/tool/progress 的过程标签 */
  steps: string[];
  sources: SourceRef[];
  /** wait_for_input 追问（done{waiting_input} 后显示作答卡） */
  pendingQuestion?: PendingQuestion;
  done?: boolean;
  error?: { code: string; message: string; retryable: boolean };
}

/** B2-1 知识库文档（FE 轮询进度） */
export type KbStatus = "pending" | "parsing" | "embedding" | "ready" | "failed";
export interface KbDoc {
  id: string;
  title: string;
  status: KbStatus;
  progress: number;
  page_count: number;
  error: string | null;
  created_at: number | string;
}

/** B4-1 错题记录（图片可能为 null → 文本卡兜底） */
export interface ErrorRecord {
  error_id: string;
  question_text: string | null;
  original_image_url: string | null;
  enhanced_image_url: string | null;
  kp_code: string;
  error_type: string | null;
  source_channel: "manual" | "auto_judge";
  created_at: string;
  error_cause?: string;
}

/** B4-2/B4-3 题目（options 可为 null → 文本作答兜底） */
export interface PracticeQuestion {
  question_id: string;
  source: "imported" | "bank" | "ai";
  stem_text: string;
  stem_image_url: string | null;
  images?: { url: string; page_no?: number }[];
  options?: Record<string, string> | null;
  kp_codes: string[];
  difficulty: string;
  ai_mock?: boolean;
}

/** B2-2 图谱（v1 无 mastery 字段，FE 已增补请求） */
export interface GraphNode {
  id: string;
  code: string;
  name: string;
  path: string;
  source: string;
}
export interface GraphEdge {
  src: string;
  dst: string;
  edge_type: string;
  weight?: number;
  source?: string;
  evidence?: string | null;
}

/** B4-3 试卷 */
export interface ExamPaper {
  paper_id: string;
  title: string;
  year: number | null;
  question_count: number;
  source_import_id?: string | null;
}
export interface ExamItem {
  position: number;
  question_id: string;
  source: string;
  stem_text: string;
  stem_image_url: string | null;
  options?: Record<string, string> | null;
  kp_codes?: string[];
  difficulty?: string;
}
export interface ExamPaperDetail {
  paper_id: string;
  title: string;
  year: number | null;
  items: ExamItem[];
}

/** B4-5 双师讲义 slide blocks */
export interface SlideBlock {
  kind: "text" | "latex" | "example" | "figure_ref";
  content?: string;
  analysis?: string[];
  artifact_url?: string;
  artifact_type?: string;
  expr?: string;
}
export interface Slide {
  index: number;
  blocks: SlideBlock[];
  kp_path?: string[];
  total?: number;
}
