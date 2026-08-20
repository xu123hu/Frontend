import { test, expect } from '@playwright/test'

const STUDENT_USER = { nickname: '小婷', roles: [{ role: 'student' }], active_role: 'student', grade: '高二（3）班' }

const STUDENT_ROUTES = [
  '/overview', '/dialog', '/practice', '/errors', '/report', '/graph',
  '/exam', '/class', '/tasks', '/dual', '/resource', '/profile',
]

test.describe('student regression (no white screen on mock)', () => {
  for (const route of STUDENT_ROUTES) {
    test(`route ${route} mounts without white screen`, async ({ page }) => {
      await page.addInitScript((u) => {
        localStorage.setItem('ma_token', 'mock-token-preview')
        localStorage.setItem('ma_user', JSON.stringify(u))
      }, STUDENT_USER)
      await page.goto(route)
      await page.waitForSelector('#app')
      const count = await page.locator('#app').evaluate((el: Element) => el.children.length)
      expect(count).toBeGreaterThan(0)
    })
  }

  test('web search opt-in toggle stays hidden (feature flag fail-closed)', async ({ page }) => {
    await page.addInitScript((u) => {
      localStorage.setItem('ma_token', 'mock-token-preview')
      localStorage.setItem('ma_user', JSON.stringify(u))
    }, STUDENT_USER)
    await page.goto('/dialog')
    await page.waitForSelector('#app')
    await expect(page.getByPlaceholder(/联网|搜索/i)).toHaveCount(0)
  })
})