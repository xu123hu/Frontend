/** 教师端稳定错误码 → UI 处理动作映射（不解析供应商原始文本，只依赖稳定 code） */
export type TeacherErrorAction =
  | { kind: 'continue' }
  | { kind: 'redirect-login' }
  | { kind: 'clear-class-scope'; classId?: string }
  | { kind: 'version-conflict' }
  | { kind: 'confirmation-required' }
  | { kind: 'show-degraded' }
  | { kind: 'show-unavailable' }
  | { kind: 'toast' }

const KNOWN: Record<number, TeacherErrorAction> = {
  40100: { kind: 'redirect-login' },
  401: { kind: 'redirect-login' },
  40302: { kind: 'clear-class-scope' },
  40901: { kind: 'version-conflict' },
  42210: { kind: 'confirmation-required' },
  50310: { kind: 'show-degraded' },
  50311: { kind: 'show-unavailable' },
}

export function handleTeacherError(code: number, classId?: string): TeacherErrorAction {
  const base = KNOWN[code]
  if (!base) return { kind: 'toast' }
  if (base.kind === 'clear-class-scope') return { kind: 'clear-class-scope', classId }
  return base
}

const STABLE = new Set<number>(Object.keys(KNOWN).map(Number))

export function isStableTeacherError(code: number): boolean {
  return STABLE.has(code)
}