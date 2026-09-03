import { describe, it, expect } from 'vitest'
import { router, roleHome } from '@/router'

describe('teacher v3 router contract', () => {
  const v3Paths = [
    '/teacher-v3/today', '/teacher-v3/prep', '/teacher-v3/slides', '/teacher-v3/bank', '/teacher-v3/quiz',
    '/teacher-v3/assign', '/teacher-v3/classroom', '/teacher-v3/insights', '/teacher-v3/resources',
  ]

  it('defines exactly the 9 teacher-v3 workspaces nested under TeacherV3Layout', () => {
    const v3Routes = router.getRoutes().filter((r) => r.meta?.teacherV3)
    expect(v3Routes.length).toBe(9)
    const found = new Set(v3Routes.map((r) => r.path))
    for (const p of v3Paths) expect(found.has(p), `missing ${p}`).toBe(true)
    for (const r of v3Routes) {
      expect(r.meta.teacher, `${r.path} keeps teacher role guard`).toBe(true)
      expect(r.meta.requiresRole, `${r.path} requires teacher role`).toBe('teacher')
      expect(String(r.meta.scene), `${r.path} has scene`).toMatch(/^teacher\.v3\./)
    }
  })

  it('no legacy V1/V2 teacher routes remain', () => {
    const legacy = router.getRoutes().filter((r) => r.meta?.teacher && !r.meta?.teacherV3)
    expect(legacy.length).toBe(0)
    const existing = new Set(router.getRoutes().map((r) => r.path))
    const gone = ['/teacher/today', '/teacher/prep', '/teacher/assign', '/teacher/grading', '/teacher-v2/today', '/teacher-v2/slides']
    for (const p of gone) expect(existing.has(p), `${p} should be removed`).toBe(false)
  })

  it('each teacher-v3 route lazy-loads a component', async () => {
    const routes = router.getRoutes().filter((r) => r.meta?.teacherV3)
    for (const r of routes) {
      const loader = r.components?.default as unknown as () => Promise<unknown> | undefined
      expect(typeof loader).toBe('function')
      await expect((loader as () => Promise<unknown>)()).resolves.toBeTruthy()
    }
  }, 30000)

  it('teacher role home lands on the v3 today page', () => {
    expect(roleHome('teacher')).toBe('/teacher-v3/today')
  })
})