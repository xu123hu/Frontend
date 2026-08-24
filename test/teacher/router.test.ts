import { describe, it, expect } from 'vitest'
import { router } from '@/router'

describe('teacher router contract', () => {
  const paths = [
    '/teacher/today', '/teacher/prep', '/teacher/assign', '/teacher/grading',
    '/teacher/classroom', '/teacher/classes', '/teacher/resources',
  ]
  const sceneMap: Record<string, string> = {
    '/teacher/today': 'teacher.today',
    '/teacher/prep': 'teacher.prep',
    '/teacher/assign': 'teacher.assessment',
    '/teacher/grading': 'teacher.grading',
    '/teacher/classroom': 'teacher.classroom',
    '/teacher/classes': 'teacher.class.insights',
    '/teacher/resources': 'teacher.resources',
  }

  it('defines exactly the 7 teacher workspaces with teacher meta and scene', () => {
    const teacherRoutes = router.getRoutes().filter((r) => r.meta?.teacher)
    expect(teacherRoutes.length).toBe(7)
    const found = new Set(teacherRoutes.map((r) => r.path))
    for (const p of paths) expect(found.has(p), `missing ${p}`).toBe(true)
    for (const r of teacherRoutes) expect(r.meta.scene).toBe(sceneMap[r.path])
  })

  it('each teacher route lazy-loads a component', async () => {
    const routes = router.getRoutes().filter((r) => r.meta?.teacher)
    for (const r of routes) {
      const loader = r.components?.default as unknown as () => Promise<unknown> | undefined
      expect(typeof loader).toBe('function')
      await expect((loader as () => Promise<unknown>)()).resolves.toBeTruthy()
    }
  })

  it('keeps the official grading route on the independent V2 page tree', async () => {
    const grading = router.getRoutes().find((route) => route.path === '/teacher/grading')
    const loader = grading?.components?.default as unknown as () => Promise<{ default: { name?: string; __name?: string } }>
    const component = (await loader()).default
    expect(component.name || component.__name).toBe('TeacherGradingV2View')
  })
})
