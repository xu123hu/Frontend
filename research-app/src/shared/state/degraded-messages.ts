/**
 * 错误/降级文案（与 08 §6 静默降级门禁一致）。
 *
 * 任何"失败 → 假成功"或"网络错误 → fallback 数据"在此被显式禁制。
 * UI 必须从这些文案中选一条展示。
 */

export const DEGRADED_TONE_LABELS: Record<string, string> = {
  source_unavailable: '来源不可用',
  local_engine: '本地引擎',
  browser_local: '浏览器离线',
  unavailable: '暂不可运行',
  formal_pending: '形式化待确认',
  insufficient_evidence: '证据不足',
  network_error: '网络错误',
  forbidden: '无权限',
  parse_failed: '解析失败',
  timeout: '已超时',
  conflict: '存在冲突',
  retracted: '来源已撤稿',
};

export function degradedLabel(code: string): string {
  return DEGRADED_TONE_LABELS[code] ?? code;
}
