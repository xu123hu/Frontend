/**
 * 翻译域实体（译文单元 + 公式保真报告）。
 *
 * 契约依据（CR-F3-05 推导 + M0 冻结引用）：
 * - 02 §5.8 DocumentIR.blocks：block_id/type/latex/label/references/content_hash。
 * - 02 §5.8 翻译规范：只能改变可翻译段落文本；公式/label/citation key 用稳定 ID
 *   屏蔽并恢复，恢复后比较数量、顺序、哈希和可解析结构。
 * - VerificationRecord.method=formula_fidelity（M0 冻结）。
 * - 06 §5 步骤 6：公式恢复冲突标记具体块并保留原公式，不显示整篇成功。
 */

/** 译文单元（对应 DocumentIR 一个可翻译 block）。 */
export interface TranslationUnit {
  block_id: string;
  page_index: number | null;
  /** 源语言文本（原文）。 */
  source_text: string | null;
  /** 目标语言文本（译文；公式/不可译块为 null）。 */
  translated_text: string | null;
  /** 公式原文（不可译块保留，display/inline math 均在此）。 */
  latex: string | null;
  /** 保真状态：公式/引用/图表锚点是否原样保留。 */
  fidelity: 'preserved' | 'partially_translated' | 'missing';
  /** 保真失败原因（fidelity=partially_translated 时必填，不静默）。 */
  fidelity_reason: string | null;
  /** 原文块 bbox（回链定位用）。 */
  bbox: [number, number, number, number] | null;
  /** 引用 key / label（不可译，屏蔽恢复对象）。 */
  refs: string[];
}

/** 翻译 run 视图（run_type=translation，冻结 ResearchRun）。 */
export interface TranslationRun {
  run_id: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';
  progress: number | null;
  stageMessage: string | null;
  /** 预算（冻结 ResearchRun.budget/spent）。 */
  budget: { max_runtime_seconds: number; max_cost_minor_units: number } | null;
  spent: { runtime_seconds: number; cost_minor_units: number } | null;
  /** 译文产物 artifact id（成功后）。 */
  artifact_id: string | null;
}

/** 公式保真报告（VerificationRecord.method=formula_fidelity 视图）。 */
export interface FidelityReport {
  run_id: string;
  /** 保真检查时间。 */
  checked_at: string;
  formula_count: { original: number; translated: number; consistent: boolean };
  formula_order: { consistent: boolean };
  formula_hash: { consistent: boolean };
  citation_keys: { consistent: boolean };
  label_ref: { consistent: boolean };
  /** 失败块列表（部分翻译/缺失，界面标记具体块）。 */
  failed_blocks: Array<{ block_id: string; reason: string }>;
  /** 综合状态：永不输出「整篇翻译成功」总标记，除非全部 consistent。 */
  overall: 'pass' | 'partial' | 'fail';
}
