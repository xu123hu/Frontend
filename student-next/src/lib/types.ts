/** 与共享契约对齐的前端类型（字段名即契约草案，见 deliverables/.../Mock拆解表.md） */

export interface QuestionImage {
  image_url: string;
  hires_url?: string;
  caption?: string;
  width?: number;
  height?: number;
}

export type ChatStatus = "idle" | "connecting" | "streaming" | "error";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  /** 流式/定稿文本 */
  text: string;
  /** 题目图片卡（图片直出，禁止转文字） */
  images: QuestionImage[];
  /** 工具调用/进度步骤 */
  steps: string[];
  done?: boolean;
  error?: { code: string; message: string; retryable: boolean };
}

export type KbStage = "upload" | "parse" | "chunk" | "embed" | "ready" | "failed";
export interface KbDoc {
  doc_id: string;
  filename: string;
  status: KbStage;
  progress: number;
  chunks?: number;
  size_hint?: string;
}

export interface ErrorRecord {
  record_id: string;
  image_url: string;
  hires_url?: string;
  kp: string;
  created_at: string;
  diagnosis?: string;
}

export interface PracticeQuestion {
  question_id: string;
  stem_image: string;
  stem_image_hires?: string;
  options?: { key: string; text: string }[];
  answer?: string;
  analysis_image?: string;
}

export interface KpItem {
  kp_code: string;
  name: string;
  mastery: number;
}

export interface GraphNode {
  kp_code: string;
  name: string;
  mastery: number;
}
export interface GraphEdge {
  source: string;
  target: string;
  relation: string;
}
export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface ExamPaper {
  paper_id: string;
  title: string;
  question_count: number;
  duration_min: number;
}

export interface ExamPaperDetail extends ExamPaper {
  questions: PracticeQuestion[];
}

/** 双师课堂画布指令（消费 B4 结构化绘图事件） */
export interface CanvasOp {
  op: "axes" | "draw" | "label" | "clear";
  /** 归一化路径点 [x,y]（0..1） */
  points?: [number, number][];
  label?: string;
  at?: [number, number];
  color?: string;
}
