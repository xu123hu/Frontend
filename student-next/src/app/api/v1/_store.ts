/** mock 共享内存存储（globalThis 挂载，热重载不丢）。仅 mock 模式使用。 */

export interface MockKbDoc {
  id: string;
  title: string;
  status: "pending" | "parsing" | "embedding" | "ready" | "failed";
  progress: number;
  page_count: number;
  error: string | null;
  created_at: number;
}

export interface MockErrorRecord {
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

export interface MockQuestion {
  question_id: string;
  source: "imported" | "bank" | "ai";
  stem_text: string;
  stem_image_url: string | null;
  images: { url: string; page_no?: number }[];
  options: Record<string, string> | null;
  answer: string | null;
  kp_codes: string[];
  difficulty: string;
}

const now = Date.now();
const g = globalThis as typeof globalThis & { __feMockStore?: Record<string, unknown> };

if (!g.__feMockStore) {
  g.__feMockStore = {
    kbSeq: 0,
    kbDocs: new Map<string, MockKbDoc>([
      ["d-seed1", { id: "d-seed1", title: "人教A版选修一·第2章 圆锥曲线.pdf", status: "ready", progress: 100, page_count: 46, error: null, created_at: now - 3600_000 }],
      ["d-seed2", { id: "d-seed2", title: "高一函数笔记（自整理）.pdf", status: "ready", progress: 100, page_count: 22, error: null, created_at: now - 7200_000 }],
      ["d-seed3", { id: "d-seed3", title: "导数压轴题专题.docx", status: "failed", progress: 35, page_count: 0, error: "PDF 版面解析超时", created_at: now - 86_400_000 }],
    ] as [string, MockKbDoc][]),
    errors: [
      { error_id: "e-seed1", question_text: null, original_image_url: "/mock-assets/err-conic.svg", enhanced_image_url: "/mock-assets/err-conic.svg", kp_code: "kp.conic.ellipse", error_type: "concept", source_channel: "manual", created_at: "2026-09-06", error_cause: "没讨论焦点在 y 轴的情况，m 有两解。" },
      { error_id: "e-seed2", question_text: null, original_image_url: "/mock-assets/err-parabola.svg", enhanced_image_url: "/mock-assets/err-parabola.svg", kp_code: "kp.conic.parabola", error_type: "formula", source_channel: "manual", created_at: "2026-09-05", error_cause: "焦点弦不总是对称的，应设直线代入。" },
      { error_id: "e-seed3", question_text: "已知函数 $f(x)=x^3-3x$，求其在点 $(1,-2)$ 处的切线方程。", original_image_url: null, enhanced_image_url: null, kp_code: "kp.derivative.tangent", error_type: "concept", source_channel: "auto_judge", created_at: "2026-09-04", error_cause: "把\"在点 P 处的切线\"与\"过点 P 的切线\"混淆。" },
      { error_id: "e-seed4", question_text: null, original_image_url: "/mock-assets/err-triangle.svg", enhanced_image_url: "/mock-assets/err-triangle.svg", kp_code: "kp.triangle.sine", error_type: "careless", source_channel: "manual", created_at: "2026-09-03", error_cause: "增根未检验：a<b ⇒ A<B。" },
    ] as MockErrorRecord[],
    questions: [
      { question_id: "q-m1", source: "bank", stem_text: "已知椭圆 C：x²/a²+y²/b²=1（a>b>0）过点 (2,1) 且离心率为 √3/3，求 C 的标准方程。", stem_image_url: "/mock-assets/q-conic.svg", images: [{ url: "/mock-assets/q-conic.svg", page_no: 1 }], options: { A: "x²/6 + y²/3 = 1", B: "x²/3 + y²/6 = 1", C: "x²/4 + y²/3 = 1", D: "x²/9 + y²/6 = 1" }, answer: "A", kp_codes: ["kp.conic.ellipse"], difficulty: "medium" },
      { question_id: "q-m2", source: "bank", stem_text: "抛物线 C：y²=2px（p>0）经过点 P(2, 2√2)，求焦点 F 的坐标。", stem_image_url: "/mock-assets/q-parabola.svg", images: [{ url: "/mock-assets/q-parabola.svg", page_no: 1 }], options: { A: "(1/2, 0)", B: "(1, 0)", C: "(2, 0)", D: "(0, 1)" }, answer: "A", kp_codes: ["kp.conic.parabola"], difficulty: "easy" },
      { question_id: "q-m3", source: "bank", stem_text: "求曲线 y = x³ − 3x 在点 (1, −2) 处的切线方程。", stem_image_url: "/mock-assets/q-derivative.svg", images: [{ url: "/mock-assets/q-derivative.svg", page_no: 1 }], options: { A: "y = −2", B: "y = x − 3", C: "y = −x − 1", D: "y = 3x − 5" }, answer: "A", kp_codes: ["kp.derivative.tangent"], difficulty: "medium" },
      { question_id: "q-m4", source: "bank", stem_text: "在 △ABC 中，a=2，b=√6，B=2A，求角 A 的大小。", stem_image_url: "/mock-assets/q-triangle.svg", images: [{ url: "/mock-assets/q-triangle.svg", page_no: 1 }], options: { A: "30°", B: "45°", C: "60°", D: "90°" }, answer: "A", kp_codes: ["kp.triangle.sine"], difficulty: "easy" },
      { question_id: "q-m5", source: "imported", stem_text: "双曲线 x²/4 − y²/9 = 1 的一条渐近线方程为____。", stem_image_url: null, images: [], options: null, answer: "y = ±(3/2)x", kp_codes: ["kp.conic.hyperbola"], difficulty: "easy" },
      { question_id: "q-m6", source: "imported", stem_text: "函数 f(x)=sin(2x+π/6) 的最小正周期为____。", stem_image_url: null, images: [], options: null, answer: "π", kp_codes: ["kp.trig.period"], difficulty: "easy" },
      { question_id: "q-m7", source: "bank", stem_text: "已知向量 a=(1,2)，b=(x,−1)，若 a⊥b，则 x=____。", stem_image_url: null, images: [], options: { A: "2", B: "−2", C: "1/2", D: "−1/2" }, answer: "A", kp_codes: ["kp.vector"], difficulty: "easy" },
      { question_id: "q-m8", source: "ai", stem_text: "（AI 兜底题）过抛物线 y²=4x 的焦点作弦 AB，若 |AB|=8，求弦中点到准线的距离。", stem_image_url: null, images: [], options: { A: "3", B: "4", C: "5", D: "6" }, answer: "B", kp_codes: ["kp.conic.parabola"], difficulty: "medium" },
    ] as MockQuestion[],
    chatSeq: new Map<string, number>(),
    dualSeq: new Map<string, number>(),
  };
}

export const store = g.__feMockStore as {
  kbSeq: number;
  kbDocs: Map<string, MockKbDoc>;
  errors: MockErrorRecord[];
  questions: MockQuestion[];
  chatSeq: Map<string, number>;
  dualSeq: Map<string, number>;
};
