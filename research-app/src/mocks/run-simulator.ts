/**
 * document_parse run 事件脚本模拟器（M0 冻结 RunEvent 结构）。
 *
 * POST /runs {run_type:"document_parse", input_artifact_ids:[uploadId]} 后，
 * 按上传记录的 failureCode 生成事件脚本：
 * - 正常路径：run.created → run.started → step.progress(解析页数) ×N →
 *   step.started(chunking) → artifact.created(parsed_document) → run.completed
 * - 失败路径：… → run.failed（zip_bomb/corrupted_pdf 不可重试；parse_failed 可重试）
 *
 * 这条链路走的是 M0 冻结契约（非草案）：字段名/枚举与 m0-schema.gen.d.ts 严格对齐。
 */
import type { RunEventDraft, RunEventView } from '@shared/lib/sse';

export interface EventFrame {
  frame: RunEventView & { __delayMs: number };
}

export function buildDocumentParseEvents(runId: string, upload: { name: string; failureCode: string | null; itemId: string | null; sizeBytes: number }): { frame: RunEventView; delayMs: number }[] {
  const seqBase = { run_id: runId, actor_id: 'svc-document', actor_type: 'service' as const, trace_id: `trace-${runId.slice(0, 8)}` };
  let seq = 1;
  const now = Date.now();
  const at = (offset: number) => new Date(now + offset).toISOString();

  const frames: { frame: RunEventView; delayMs: number }[] = [];
  const push = (frame: RunEventDraft, delayMs: number) => {
    frames.push({ frame: { ...seqBase, ...frame, sequence: seq++ }, delayMs });
  };
  const eid = () => `evt-${crypto.randomUUID().slice(0, 12)}`;

  push({ event_id: eid(), event_type: 'run.created', occurred_at: at(0), step_id: null, error: null, progress: null, artifact_ids: [] }, 80);
  push({ event_id: eid(), event_type: 'run.started', occurred_at: at(100), step_id: 'parse', error: null, progress: null, artifact_ids: [] }, 120);

  if (upload.failureCode) {
    const nonRetryable = upload.failureCode === 'zip_bomb' || upload.failureCode === 'corrupted_pdf';
    const messages: Record<string, string> = {
      zip_bomb: '检测到解压炸弹特征（压缩率异常），已终止处理。',
      corrupted_pdf: 'PDF 结构损坏（xref 表无法恢复），无法解析。',
      parse_failed: '解析服务超时，请重试。',
    };
    push({ event_id: eid(), event_type: 'run.failed', occurred_at: at(400), step_id: 'parse', error: { code: upload.failureCode, message: messages[upload.failureCode] ?? '解析失败', retryable: !nonRetryable }, progress: null, artifact_ids: [] }, 150);
    return frames;
  }

  const pageCount = Math.max(3, Math.min(24, Math.round(upload.sizeBytes / 400_000) || 8));
  for (let page = 1; page <= pageCount; page++) {
    push(
      {
        event_id: eid(),
        event_type: 'step.progress',
        occurred_at: at(400 + page * 60),
        step_id: 'parse',
        error: null,
        progress: { current: page, total: pageCount, unit: '页', message: `解析第 ${page}/${pageCount} 页` },
        artifact_ids: [],
      },
      Math.max(60, 900 / pageCount),
    );
  }
  push({ event_id: eid(), event_type: 'step.started', occurred_at: at(600), step_id: 'chunking', error: null, progress: null, artifact_ids: [], payload: { step: 'chunking' } }, 140);
  push({ event_id: eid(), event_type: 'artifact.created', occurred_at: at(800), step_id: 'chunking', error: null, progress: null, artifact_ids: [`art-parsed-${runId.slice(0, 8)}`], payload: { artifact_type: 'parsed_document' } }, 120);
  push({ event_id: eid(), event_type: 'run.completed', occurred_at: at(950), step_id: null, error: null, progress: null, artifact_ids: [`art-parsed-${runId.slice(0, 8)}`], payload: { item_id: upload.itemId ?? '' } }, 100);
  return frames;
}

/** 服务端已完成的运行（刷新恢复场景）：直接给完整成功脚本。 */
export function buildCompletedRunEvents(runId: string, itemId: string): { frame: RunEventView; delayMs: number }[] {
  return buildDocumentParseEvents(runId, { name: 'seed.pdf', failureCode: null, itemId, sizeBytes: 3_200_000 });
}

/** 翻译 run 事件脚本（run_type=translation，06 §5：进度+预算、公式屏蔽恢复、保真）。
 * 事件 payload 携带 artifact_id（translation 产物）与 item_id。 */
export function buildTranslationEvents(runId: string, input: { itemId: string; unitCount: number }): { frame: RunEventView; delayMs: number }[] {
  const seqBase = { run_id: runId, actor_id: 'svc-translation', actor_type: 'service' as const, trace_id: `trace-${runId.slice(0, 8)}` };
  let seq = 1;
  const now = Date.now();
  const at = (offset: number) => new Date(now + offset).toISOString();
  const frames: { frame: RunEventView; delayMs: number }[] = [];
  const push = (frame: RunEventDraft, delayMs: number) => {
    frames.push({ frame: { ...seqBase, ...frame, sequence: seq++ }, delayMs });
  };
  const eid = () => `evt-${crypto.randomUUID().slice(0, 12)}`;

  push({ event_id: eid(), event_type: 'run.created', occurred_at: at(0), step_id: null, error: null, progress: null, artifact_ids: [] }, 80);
  push({ event_id: eid(), event_type: 'run.started', occurred_at: at(100), step_id: 'translate', error: null, progress: null, artifact_ids: [] }, 120);
  const total = Math.max(3, input.unitCount);
  for (let u = 1; u <= total; u++) {
    push(
      {
        event_id: eid(),
        event_type: 'step.progress',
        occurred_at: at(200 + u * 60),
        step_id: 'translate',
        error: null,
        progress: { current: u, total, unit: '段', message: `翻译第 ${u}/${total} 段` },
        artifact_ids: [],
      },
      Math.max(60, 900 / total),
    );
  }
  push({ event_id: eid(), event_type: 'artifact.created', occurred_at: at(800), step_id: 'translate', error: null, progress: null, artifact_ids: [`art-trans-${runId.slice(0, 8)}`], payload: { artifact_type: 'translation' } }, 120);
  push({ event_id: eid(), event_type: 'run.completed', occurred_at: at(950), step_id: null, error: null, progress: null, artifact_ids: [`art-trans-${runId.slice(0, 8)}`], payload: { item_id: input.itemId } }, 100);
  return frames;
}

/** 编译 run 事件脚本（run_type=writing，06 §6：Tectonic 编译时间线）。
 * scenario: success | missing_resource | unsafe_command（06 §6 步骤 6 两类失败）。 */
export function buildCompileEvents(
  runId: string,
  input: { manuscriptId: string; scenario: 'success' | 'missing_resource' | 'unsafe_command' },
): { frame: RunEventView; delayMs: number }[] {
  const seqBase = { run_id: runId, actor_id: 'svc-latex', actor_type: 'service' as const, trace_id: `trace-${runId.slice(0, 8)}` };
  let seq = 1;
  const now = Date.now();
  const at = (offset: number) => new Date(now + offset).toISOString();
  const frames: { frame: RunEventView; delayMs: number }[] = [];
  const push = (frame: RunEventDraft, delayMs: number) => {
    frames.push({ frame: { ...seqBase, ...frame, sequence: seq++ }, delayMs });
  };
  const eid = () => `evt-${crypto.randomUUID().slice(0, 12)}`;

  push({ event_id: eid(), event_type: 'run.created', occurred_at: at(0), step_id: null, error: null, progress: null, artifact_ids: [] }, 80);
  push({ event_id: eid(), event_type: 'run.started', occurred_at: at(100), step_id: 'compile', error: null, progress: null, artifact_ids: [] }, 120);
  for (let s = 1; s <= 3; s++) {
    push(
      {
        event_id: eid(),
        event_type: 'step.progress',
        occurred_at: at(200 + s * 70),
        step_id: 'compile',
        error: null,
        progress: { current: s, total: 3, unit: '步', message: ['XeLaTeX 引擎启动', '文档编译', 'SyncTeX 生成'][s - 1] ?? '编译中' },
        artifact_ids: [],
      },
      Math.max(70, 800 / 3),
    );
  }
  if (input.scenario === 'success') {
    push({ event_id: eid(), event_type: 'artifact.created', occurred_at: at(700), step_id: 'compile', error: null, progress: null, artifact_ids: [`art-pdf-${runId.slice(0, 8)}`], payload: { artifact_type: 'compiled_pdf' } }, 120);
    push({ event_id: eid(), event_type: 'run.completed', occurred_at: at(850), step_id: null, error: null, progress: null, artifact_ids: [`art-pdf-${runId.slice(0, 8)}`], payload: { manuscript_id: input.manuscriptId } }, 100);
    return frames;
  }
  const fail = input.scenario === 'unsafe_command'
    ? { code: 'unsafe_command', message: '检测到 \\write18（shell escape）被禁用，命令已拒绝。', retryable: false }
    : { code: 'missing_resource', message: '找不到文件 sections/intro.tex。', retryable: true };
  const payload = input.scenario === 'unsafe_command'
    ? { manuscript_id: input.manuscriptId, error: { file: 'main.tex', line: 3, kind: 'unsafe_command', message: 'shell escape 被禁用' } }
    : { manuscript_id: input.manuscriptId, error: { file: 'main.tex', line: 1, kind: 'missing_resource', message: 'File sections/intro.tex not found' } };
  push({ event_id: eid(), event_type: 'run.failed', occurred_at: at(600), step_id: 'compile', error: fail, progress: null, artifact_ids: [], payload }, 100);
  return frames;
}

/** 数学验证 run 事件脚本（run_type=math_verification，M4 §8.3 五能力独立执行）。
 * 逐层推进：L0 语法 → L1 定义域 → L2 符号 → L3 数值 → L4 反例；
 * 事件 payload 携带逐层结果摘要与反例（L4 演示一个反例发现）。 */
export function buildMathVerificationEvents(runId: string, input: { claimId: string }): { frame: RunEventView; delayMs: number }[] {
  const seqBase = { run_id: runId, actor_id: 'svc-mathverify', actor_type: 'service' as const, trace_id: `trace-${runId.slice(0, 8)}` };
  let seq = 1;
  const now = Date.now();
  const at = (offset: number) => new Date(now + offset).toISOString();
  const frames: { frame: RunEventView; delayMs: number }[] = [];
  const push = (frame: RunEventDraft, delayMs: number) => {
    frames.push({ frame: { ...seqBase, ...frame, sequence: seq++ }, delayMs });
  };
  const eid = () => `evt-${crypto.randomUUID().slice(0, 12)}`;

  push({ event_id: eid(), event_type: 'run.created', occurred_at: at(0), step_id: null, error: null, progress: null, artifact_ids: [] }, 80);
  push({ event_id: eid(), event_type: 'run.started', occurred_at: at(100), step_id: 'verify', error: null, progress: null, artifact_ids: [] }, 120);
  const layers = [
    { label: 'L0 语法', result: 'passed' },
    { label: 'L1 定义域', result: 'passed' },
    { label: 'L2 符号', result: 'passed' },
    { label: 'L3 数值', result: 'passed' },
    { label: 'L4 反例', result: 'counterexample' },
  ];
  layers.forEach((l, i) => {
    push(
      {
        event_id: eid(),
        event_type: 'step.progress',
        occurred_at: at(200 + i * 120),
        step_id: 'verify',
        error: null,
        progress: { current: i + 1, total: layers.length, unit: '层', message: `${l.label} 检查完成：${l.result}` },
        artifact_ids: [],
        payload: { layer: `L${i}`, result: l.result, claim_id: input.claimId },
      },
      Math.max(90, 900 / layers.length),
    );
  });
  push({ event_id: eid(), event_type: 'artifact.created', occurred_at: at(900), step_id: 'verify', error: null, progress: null, artifact_ids: [`art-verify-${runId.slice(0, 8)}`], payload: { artifact_type: 'verification' } }, 120);
  push({ event_id: eid(), event_type: 'run.completed', occurred_at: at(1050), step_id: null, error: null, progress: null, artifact_ids: [`art-verify-${runId.slice(0, 8)}`], payload: { claim_id: input.claimId } }, 100);
  return frames;
}

/** Lean 形式化 run 事件脚本（run_type=math_verification + mock_method=lean，CR-F4-03 草案钩子）。
 * 两段独立：lean_translation（形式化翻译忠实度）→ lean_kernel（内核状态）；
 * 演示样例与 review-db 种子对齐：翻译 partial + 内核 succeeded → 综合 partial_supported。 */
export function buildLeanEvents(runId: string, input: { claimId: string }): { frame: RunEventView; delayMs: number }[] {
  const seqBase = { run_id: runId, actor_id: 'svc-lean', actor_type: 'service' as const, trace_id: `trace-${runId.slice(0, 8)}` };
  let seq = 1;
  const now = Date.now();
  const at = (offset: number) => new Date(now + offset).toISOString();
  const frames: { frame: RunEventView; delayMs: number }[] = [];
  const push = (frame: RunEventDraft, delayMs: number) => {
    frames.push({ frame: { ...seqBase, ...frame, sequence: seq++ }, delayMs });
  };
  const eid = () => `evt-${crypto.randomUUID().slice(0, 12)}`;

  push({ event_id: eid(), event_type: 'run.created', occurred_at: at(0), step_id: null, error: null, progress: null, artifact_ids: [] }, 80);
  push({ event_id: eid(), event_type: 'run.started', occurred_at: at(100), step_id: 'lean', error: null, progress: null, artifact_ids: [] }, 120);
  push(
    {
      event_id: eid(),
      event_type: 'step.progress',
      occurred_at: at(300),
      step_id: 'lean',
      error: null,
      progress: { current: 1, total: 2, unit: '段', message: 'lean_translation 完成：形式化翻译降低断言强度（partial）' },
      artifact_ids: [],
      payload: { method: 'lean_translation', result: 'partial', claim_id: input.claimId },
    },
    300,
  );
  push(
    {
      event_id: eid(),
      event_type: 'step.progress',
      occurred_at: at(600),
      step_id: 'lean',
      error: null,
      progress: { current: 2, total: 2, unit: '段', message: 'lean_kernel 完成：内核接受，无 sorry/admit' },
      artifact_ids: [],
      payload: { method: 'lean_kernel', result: 'succeeded', claim_id: input.claimId },
    },
    300,
  );
  push({ event_id: eid(), event_type: 'artifact.created', occurred_at: at(800), step_id: 'lean', error: null, progress: null, artifact_ids: [`art-lean-${runId.slice(0, 8)}`], payload: { artifact_type: 'lean_report' } }, 120);
  push({ event_id: eid(), event_type: 'run.completed', occurred_at: at(950), step_id: null, error: null, progress: null, artifact_ids: [`art-lean-${runId.slice(0, 8)}`], payload: { claim_id: input.claimId } }, 100);
  return frames;
}

/** 研究循环 run 事件脚本（run_type=research_cycle，06 §8）。
 * 计划 → 假设生成 → 步骤执行 → 高风险审批 → 拒绝保留证据 → 完成。 */
export function buildResearchCycleEvents(runId: string, input: { question: string }): { frame: RunEventView; delayMs: number }[] {
  const seqBase = { run_id: runId, actor_id: 'svc-steward', actor_type: 'service' as const, trace_id: `trace-${runId.slice(0, 8)}` };
  let seq = 1;
  const now = Date.now();
  const at = (offset: number) => new Date(now + offset).toISOString();
  const frames: { frame: RunEventView; delayMs: number }[] = [];
  const push = (frame: RunEventDraft, delayMs: number) => {
    frames.push({ frame: { ...seqBase, ...frame, sequence: seq++ }, delayMs });
  };
  const eid = () => `evt-${crypto.randomUUID().slice(0, 12)}`;

  push({ event_id: eid(), event_type: 'run.created', occurred_at: at(0), step_id: null, error: null, progress: null, artifact_ids: [] }, 80);
  push({ event_id: eid(), event_type: 'run.started', occurred_at: at(100), step_id: 'plan', error: null, progress: null, artifact_ids: [], payload: { plan: { research_question: input.question, reasoning_policy: 'rigorous' } } }, 150);
  // 步骤 1：文献检索（独立分片可并行）
  push({ event_id: eid(), event_type: 'step.started', occurred_at: at(300), step_id: 'retrieve', error: null, progress: null, artifact_ids: [], payload: { step: 'retrieve', title: '文献检索与分片' } }, 120);
  push({ event_id: eid(), event_type: 'step.progress', occurred_at: at(420), step_id: 'retrieve', error: null, progress: { current: 3, total: 3, unit: '片', message: '3 片文献分片完成' }, artifact_ids: [] }, 200);
  push({ event_id: eid(), event_type: 'artifact.created', occurred_at: at(650), step_id: 'retrieve', error: null, progress: null, artifact_ids: [`art-src-${runId.slice(0, 8)}`], payload: { artifact_type: 'parsed_document' } }, 120);
  // 步骤 2：候选假设生成（全部标记 hypothesis）
  push({ event_id: eid(), event_type: 'step.started', occurred_at: at(800), step_id: 'hypothesis', error: null, progress: null, artifact_ids: [], payload: { step: 'hypothesis', title: '候选假设生成', hypotheses: ['假设 H1：分层模型成绩差异受学校资源影响', '假设 H2：个体层面 SES 效应跨校稳定'] } }, 200);
  // 步骤 3：高风险工具触发审批（代码执行）
  push({ event_id: eid(), event_type: 'step.started', occurred_at: at(1100), step_id: 'compute', error: null, progress: null, artifact_ids: [], payload: { step: 'compute', title: '数值复算（高风险工具）' } }, 120);
  push({ event_id: eid(), event_type: 'approval.requested', occurred_at: at(1250), step_id: 'compute', error: null, progress: null, artifact_ids: [], payload: { approval: { id: `appr-${runId.slice(0, 6)}`, risk_tier: 'high', action: 'run_python_compute', arguments_redacted: { dataset: 'schools_2024.csv', model: 'hlm_2level' }, arguments_hash: 'sha256:abc123' } } }, 300);
  // 步骤 4：用户拒绝该步（保留证据）
  push({ event_id: eid(), event_type: 'step.failed', occurred_at: at(1800), step_id: 'compute', error: { code: 'step_rejected', message: '用户拒绝数值复算步骤。', retryable: false }, progress: null, artifact_ids: [], payload: { step: 'compute', alternative_paths: ['改用已核验文献中的数值结果', '仅保留符号验证'] } }, 200);
  // 步骤 5：替代路径 → 完成
  push({ event_id: eid(), event_type: 'step.started', occurred_at: at(2100), step_id: 'symbolic', error: null, progress: null, artifact_ids: [], payload: { step: 'symbolic', title: '符号验证（替代路径）' } }, 200);
  push({ event_id: eid(), event_type: 'artifact.created', occurred_at: at(2400), step_id: 'symbolic', error: null, progress: null, artifact_ids: [`art-cycle-${runId.slice(0, 8)}`], payload: { artifact_type: 'research_report' } }, 120);
  push({ event_id: eid(), event_type: 'run.completed', occurred_at: at(2600), step_id: null, error: null, progress: null, artifact_ids: [`art-cycle-${runId.slice(0, 8)}`], payload: { research_question: input.question } }, 100);
  return frames;
}
