import { describe, it, expect } from 'vitest'
import { router } from '@/router'

describe('teacher router contract', () => {
  const paths = [
    '/teacher/today', '/teacher/prep', '/teacher/assign', '/teacher/grading',
    '/teacher/classroom', '/teacher/classes', '/teacher/resources', '/teacher/profile',
  ]
  const sceneMap: Record<string, string> = {
    '/teacher/today': 'teacher.today',
    '/teacher/prep': 'teacher.prep',
    '/teacher/assign': 'teacher.assessment',
    '/teacher/grading': 'teacher.grading',
    '/teacher/classroom': 'teacher.classroom',
    '/teacher/classes': 'teacher.class.insights',
    '/teacher/resources': 'teacher.resources',
    '/teacher/profile': 'teacher.profile',
  }
  const v2Paths = [
    '/teacher-v2/today', '/teacher-v2/prep', '/teacher-v2/slides', '/teacher-v2/quiz',
    '/teacher-v2/assign', '/teacher-v2/classroom', '/teacher-v2/insights', '/teacher-v2/resources',
  ]
  const v3Paths = [
    '/teacher-v3/today', '/teacher-v3/prep', '/teacher-v3/slides', '/teacher-v3/bank', '/teacher-v3/quiz',
    '/teacher-v3/assign', '/teacher-v3/classroom', '/teacher-v3/insights', '/teacher-v3/resources',
  ]

  it('defines exactly the 8 legacy teacher workspaces with teacher meta and scene', () => {
    const teacherRoutes = router.getRoutes().filter((r) => r.meta?.teacher && !r.meta?.teacherV2 && !r.meta?.teacherV3)
    expect(teacherRoutes.length).toBe(8)
    const found = new Set(teacherRoutes.map((r) => r.path))
    for (const p of paths) expect(found.has(p), `missing ${p}`).toBe(true)
    for (const r of teacherRoutes) expect(r.meta.scene).toBe(sceneMap[r.path])
  })

  it('defines exactly the 8 teacher-v2 workspaces nested under TeacherV2Layout', () => {
    const v2Routes = router.getRoutes().filter((r) => r.meta?.teacherV2)
    expect(v2Routes.length).toBe(8)
    const found = new Set(v2Routes.map((r) => r.path))
    for (const p of v2Paths) expect(found.has(p), `missing ${p}`).toBe(true)
    for (const r of v2Routes) {
      expect(r.meta.teacher, `${r.path} keeps teacher role guard`).toBe(true)
      expect(r.meta.requiresRole, `${r.path} requires teacher role`).toBe('teacher')
      expect(String(r.meta.scene), `${r.path} has scene`).toMatch(/^teacher\.v2\./)
    }
  })

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

  it('each teacher route lazy-loads a component', async () => {
    const routes = router.getRoutes().filter((r) => r.meta?.teacher)
    for (const r of routes) {
      const loader = r.components?.default as unknown as () => Promise<unknown> | undefined
      expect(typeof loader).toBe('function')
      await expect((loader as () => Promise<unknown>)()).resolves.toBeTruthy()
    }
  }, 30000)

  it('keeps the official grading route on the independent V2 page tree', async () => {
    const grading = router.getRoutes().find((route) => route.path === '/teacher/grading')
    const loader = grading?.components?.default as unknown as () => Promise<{ default: { name?: string; __name?: string } }>
    const component = (await loader()).default
    expect(component.name || component.__name).toBe('TeacherGradingV2View')
  })

})
