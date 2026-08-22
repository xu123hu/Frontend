const scopeKnowledgePoints: Record<string, readonly string[]> = {
  monotonicity: ['MATH-003'],
  parity: ['MATH-003'],
  basic: ['MATH-002'],
  chapter1: ['MATH-001', 'MATH-002', 'MATH-003'],
  derivative: ['MATH-004'],
}

export function resolveScopeKnowledgePoints(scope: string): string[] {
  const knowledgePoints = scopeKnowledgePoints[scope]
  if (!knowledgePoints) throw new Error(`未知知识点范围：${scope}`)
  return [...knowledgePoints]
}
