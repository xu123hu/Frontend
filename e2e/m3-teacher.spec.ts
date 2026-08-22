import { test, expect } from '@playwright/test'

const TEACHER_USER = { nickname: '王老师', roles: [{ role: 'teacher' }], active_role: 'teacher', grade: '' }
const STUDENT_USER = { nickname: '小婷', roles: [{ role: 'student' }], active_role: 'student', grade: '高二（3）班' }

async function presetMock(page: import('@playwright/test').Page, user: typeof TEACHER_USER) {
  await page.addInitScript((mockUser) => {
    localStorage.setItem('ma_token', 'mock-token-teacher-preview')
    localStorage.setItem('ma_user', JSON.stringify(mockUser))
  }, user)
}

test.describe('M3 teacher frontend journeys (mock)', () => {
  test('teacher root routes to the teacher workspace', async ({ page }) => {
    await presetMock(page, TEACHER_USER)
    await page.goto('/')

    await expect(page).toHaveURL(/\/teacher\/today/)
    await expect(page.getByRole('heading', { name: /王老师/ })).toBeVisible()
    await expect(page.getByRole('navigation', { name: '教师工作台导航' })).toBeVisible()
  })

  test('monotonicity quiz blocks publication while strict inventory is insufficient, then publishes after reducing count', async ({ page }) => {
    await presetMock(page, TEACHER_USER)
    await page.goto('/teacher/assign')
    await expect(page.getByLabel('班级')).toHaveValue('c1')
    await page.getByLabel('范围').selectOption('monotonicity')

    const insufficientResponse = page.waitForResponse((response) =>
      response.url().includes('/api/teacher/quizzes/generate') && response.request().method() === 'POST',
    )
    await page.getByRole('button', { name: '✨ 生成试卷' }).click()
    const insufficient = await (await insufficientResponse).json()
    expect(insufficient.data.content).toMatchObject({
      knowledge_points: ['MATH-003'],
      insufficient: true,
      requested_count: 8,
      available_count: 6,
    })
    expect(insufficient.data).toMatchObject({ degraded: true })
    expect(insufficient.data.warnings).toContain('题库严格命中题不足：请求 8 题，当前可用 6 题。')
    await expect(page.getByRole('button', { name: '确认并发布给学生' })).toBeDisabled()

    await page.getByLabel('题量').fill('6')
    const sufficientResponse = page.waitForResponse((response) =>
      response.url().includes('/api/teacher/quizzes/generate') && response.request().method() === 'POST',
    )
    await page.getByRole('button', { name: '✨ 生成试卷' }).click()
    const sufficient = await (await sufficientResponse).json()
    expect(sufficient.data.content).toMatchObject({ insufficient: false, requested_count: 6, available_count: 6 })
    expect(sufficient.data).toMatchObject({ degraded: false, warnings: [] })
    await expect(page.getByRole('button', { name: '确认并发布给学生' })).toBeEnabled()

    const publishResponse = page.waitForResponse((response) =>
      /\/api\/teacher\/assignments\/[^/]+\/publish$/.test(new URL(response.url()).pathname)
        && response.request().method() === 'POST',
    )
    await page.getByRole('button', { name: '确认并发布给学生' }).click()
    const published = await (await publishResponse).json()
    expect(published.data.status).toBe('published')
  })

  test('grading shows teacher-only question context and requires an explicit confirmation', async ({ page }) => {
    await presetMock(page, TEACHER_USER)
    await page.goto('/teacher/grading')

    await expect(page.getByText('作业：函数的单调性巩固练习')).toBeVisible()
    await expect(page.getByText('已知函数 f(x)=x³−3x，求其单调递增区间。')).toBeVisible()
    await expect(page.getByText('A. (-∞, -1) ∪ (1, +∞)')).toBeVisible()
    await expect(page.getByText('标准答案（仅教师可见）')).toBeVisible()
    await expect(page.getByText('(-∞, -1) ∪ (1, +∞)', { exact: true })).toBeVisible()
    await expect(page.getByText('答案解析（仅教师可见）')).toBeVisible()
    await expect(page.getByText('求导得到 f′(x)=3x²−3，并按临界点 -1、1 判断符号。')).toBeVisible()
    const confirmationResponse = page.waitForResponse((response) =>
      /\/api\/teacher\/grading\/[^/]+\/confirm$/.test(new URL(response.url()).pathname)
        && response.request().method() === 'POST',
    )
    await page.getByRole('button', { name: '接受建议并确认' }).click()
    const confirmation = await (await confirmationResponse).json()
    expect(confirmation.data.decision).toBe('accepted')
  })

  test('student role cannot enter teacher workspace', async ({ page }) => {
    await presetMock(page, STUDENT_USER)
    await page.goto('/teacher/today')
    await expect(page).toHaveURL(/\/overview/)
  })

  test('mock returns 40901 on a stale artifact version', async ({ request }) => {
    const headers = { Authorization: 'Bearer mock-token-teacher-preview' }
    const adapt = await request.post('/api/teacher/lessons/adapt', {
      headers,
      data: { class_id: 'c1', topic: '试讲', requirements: 'x' },
    })
    const artifact = (await adapt.json()).data
    const first = await request.put(`/api/teacher/artifacts/${artifact.artifact_id}`, {
      headers,
      data: { version: 1, content: artifact.content },
    })
    expect(first.status()).toBe(200)

    const stale = await request.put(`/api/teacher/artifacts/${artifact.artifact_id}`, {
      headers,
      data: { version: 1, content: artifact.content },
    })
    expect(stale.status()).toBe(409)
    expect((await stale.json()).code).toBe(40901)
  })
})
