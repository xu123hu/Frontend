import { NextResponse } from "next/server";
import { store } from "../../../_store";

/** Mock：GET /api/v1/exams/papers/{id}（B4-3 卷详情：逐题 stem/stem_image_url/options） */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const titles: Record<string, string> = {
    "p-seed1": "圆锥曲线单元测试（一）",
    "p-seed2": "函数与导数周测（第 3 周）",
    "p-seed3": "期中模拟卷（理科数学）",
  };
  const picks: Record<string, string[]> = {
    "p-seed1": ["q-m1", "q-m2", "q-m5", "q-m8"],
    "p-seed2": ["q-m3", "q-m6", "q-m7"],
    "p-seed3": ["q-m1", "q-m4", "q-m5", "q-m6"],
  };
  const ids = picks[id] ?? picks["p-seed1"];
  const items = ids.map((qid, i) => {
    const q = store.questions.find((x) => x.question_id === qid)!;
    return {
      position: i + 1,
      question_id: q.question_id,
      source: q.source,
      stem_text: q.stem_text,
      stem_image_url: q.stem_image_url,
      options: q.options,
      kp_codes: q.kp_codes,
      difficulty: q.difficulty,
      year: null,
    };
  });
  return NextResponse.json({ paper_id: id, title: titles[id] ?? "试卷", year: 2026, items });
}
