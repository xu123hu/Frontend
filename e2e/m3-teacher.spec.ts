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
      count: 8,
      insufficient: true,
    })
    expect(insufficient.data.validation).toMatchObject({ requested_count: 8, available_count: 6 })
    expect(insufficient.data.content.question_type_distribution).toEqual({ choice: 2, blank: 1, solution: 3 })
    expect(insufficient.data.validation.slot_fulfillment).toEqual(expect.arrayContaining([
      expect.objectContaining({ question_type: 'choice', requested: expect.any(Number), fulfilled: expect.any(Number), relaxed: 0 }),
      expect.objectContaining({ question_type: 'text', difficulty: 'easy', requested: expect.any(Number), fulfilled: expect.any(Number), relaxed: 0 }),
    ]))
    const choice = insufficient.data.content.items.find((item: any) => item.q_type === 'choice')
    expect(choice).toMatchObject({
      options: { A: '递增区间' }, answer: 'A', analysis: expect.any(String), difficulty: expect.any(String),
    })
    expect(insufficient.data).toMatchObject({ degraded: true })
    expect(insufficient.data.warnings).toContain('题库仅有 6/8 道严格命中题，请调整知识点范围、题型或题量后再发布。')
    await expect(page.getByRole('button', { name: '确认并发布给学生' })).toBeDisabled()

    await page.getByLabel('题量').fill('6')
    const sufficientResponse = page.waitForResponse((response) =>
      response.url().includes('/api/teacher/quizzes/generate') && response.request().method() === 'POST',
    )
    await page.getByRole('button', { name: '✨ 生成试卷' }).click()
    const sufficient = await (await sufficientResponse).json()
    expect(sufficient.data.content).toMatchObject({ count: 6, insufficient: false })
    expect(sufficient.data.validation).toMatchObject({ requested_count: 6, available_count: 6 })
    expect(sufficient.data.content.question_type_distribution).toEqual({ choice: 1, blank: 1, solution: 4 })
    expect(sufficient.data).toMatchObject({ degraded: false, warnings: [] })
    await expect(page.getByText('A. 递增区间')).toBeVisible()
    await expect(page.getByText('标准答案：A')).toBeVisible()
    await expect(page.getByText(/解析：令 f/).first()).toBeVisible()
    await expect(page.getByRole('button', { name: '确认并发布给学生' })).toBeEnabled()

    const publishResponse = page.waitForResponse((response) =>
      /\/api\/teacher\/assignments\/[^/]+\/publish$/.test(new URL(response.url()).pathname)
        && response.request().method() === 'POST',
    )
    await page.getByRole('button', { name: '确认并发布给学生' }).click()
    const published = await (await publishResponse).json()
    expect(published.data.status).toBe('published')
  })

  test('grading: question-focused workspace requires an explicit teacher decision', async ({ page }) => {
    await presetMock(page, TEACHER_USER)
    await page.goto('/teacher/grading?submission_item_id=si-2')
    await expect(page.getByRole('heading', { name: '函数的单调性', exact: true })).toBeVisible()
    await expect(page.getByText('正确求导')).toBeVisible()
    await page.getByRole('button', { name: '教师明确给分' }).click()
    await page.getByLabel('最终得分').fill('3')
    await page.getByRole('button', { name: '确认并下一份', exact: true }).click()
    await expect(page.getByText('教师确认已写入')).toBeVisible()

  })

  test('classroom mode toggles through the accessible pressed control', async ({ page }) => {
    await presetMock(page, TEACHER_USER)
    await page.goto('/teacher/classroom')

    await expect(page.getByText('课堂模式未开启')).toBeVisible()
    const modeToggle = page.locator('[aria-pressed="false"]')
    await expect(modeToggle).toHaveCount(1)
    const enabledResponse = page.waitForResponse((response) =>
      new URL(response.url()).pathname === '/api/teacher/classes/c1/classroom-mode'
        && response.request().method() === 'POST',
    )
    await modeToggle.click()
    const enabled = await (await enabledResponse).json()
    expect(enabled.data.enabled).toBe(true)
    await expect(page.getByText('课堂模式已开启')).toBeVisible()
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
