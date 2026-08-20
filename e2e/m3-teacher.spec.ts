import { test, expect } from '@playwright/test'

const TEACHER_USER = { nickname: '王老师', roles: [{ role: 'teacher' }], active_role: 'teacher', grade: '' }
const STUDENT_USER = { nickname: '小婷', roles: [{ role: 'student' }], active_role: 'student', grade: '高二（3）班' }

async function presetMock(page, user) {
  await page.addInitScript((u) => {
    localStorage.setItem('ma_token', 'mock-token-teacher-preview')
    localStorage.setItem('ma_user', JSON.stringify(u))
  }, user)
}

test.describe('M3 teacher frontend journeys (mock)', () => {
  test('teacher root routes to today and shows insights', async ({ page }) => {
    await presetMock(page, TEACHER_USER)
    await page.goto('/')
    await expect(page).toHaveURL(/\/teacher\/today/)
    await expect(page.getByText('今日工作台')).toBeVisible()
    await expect(page.getByText('函数的单调性')).toBeVisible()
    await expect(page.getByText('应用到教案')).toBeVisible()
  })

  test('prep: adapt lesson -> confirm -> generate slides task', async ({ page }) => {
    await presetMock(page, TEACHER_USER)
    await page.goto('/teacher/prep')
    await page.locator('#prep-topic').fill('导数与单调性')
    await page.getByRole('button', { name: '改编教案' }).click()
    await expect(page.getByText('导入')).toBeVisible()
    await page.getByRole('button', { name: '确认' }).click()
    await expect(page.getByRole('button', { name: '确认教案' })).toBeVisible()
    await page.getByRole('button', { name: '确认教案' }).click()
    await expect(page.getByRole('button', { name: '生成衍生产物' })).toBeVisible()
    await page.getByRole('button', { name: '生成衍生产物' }).click()
    await expect(page.getByText(/课件任务已启动|进行中|完成/)).toBeVisible()
  })

  test('assign: generate quiz -> edit -> confirm -> create draft -> publish', async ({ page }) => {
    await presetMock(page, TEACHER_USER)
    await page.goto('/teacher/assign')
    await page.locator('#as-kp').fill('函数单调性')
    await page.getByRole('button', { name: '生成题集' }).click()
    await expect(page.getByText('题集草稿')).toBeVisible()
    await expect(page.locator('.tq').first()).toBeVisible()
    const confirmBtn = page.getByRole('button', { name: '确认题集 → 创建作业草稿' })
    await confirmBtn.click()
    await expect(page.getByRole('button', { name: '确认并创建' })).toBeVisible()
    await page.getByRole('button', { name: '确认并创建' }).click()
    await expect(page.getByRole('button', { name: '发布作业' })).toBeVisible()
    await page.getByRole('button', { name: '发布作业' }).click()
    await page.getByRole('button', { name: '发布', exact: true }).click()
    await expect(page.getByText('作业已发布')).toBeVisible()
  })

  test('grading: low-confidence item requires confirm and override', async ({ page }) => {
    await presetMock(page, TEACHER_USER)
    await page.goto('/teacher/grading')
    await expect(page.getByRole('button', { name: '低置信度' })).toBeVisible()
    await page.getByRole('button', { name: '低置信度' }).click()
    await expect(page.getByText('同学 B')).toBeVisible()
    await page.getByText('同学 B').click()
    await expect(page.getByText('批改详情')).toBeVisible()
    await expect(page.getByText(/OCR 不清或低置信度/)).toBeVisible()
    await page.locator('#g-score').fill('3')
    await page.getByRole('button', { name: '按我的分数确认' }).click()
    await page.getByRole('button', { name: '确认', exact: true }).click()
    await expect(page.getByText('已确认正式结果')).toBeVisible()
  })

  test('classroom: start mode with confirmation', async ({ page }) => {
    await presetMock(page, TEACHER_USER)
    await page.goto('/teacher/classroom')
    await page.getByRole('button', { name: '启动课堂模式' }).click()
    await page.getByRole('button', { name: '启动', exact: true }).click()
    await expect(page.getByText('课堂模式已启动')).toBeVisible()
    await expect(page.getByRole('button', { name: '停止课堂模式' })).toBeVisible()
  })

  test('classes: shows aggregated insights by default', async ({ page }) => {
    await presetMock(page, TEACHER_USER)
    await page.goto('/teacher/classes')
    await expect(page.getByText('本班导数与单调性正确率下滑')).toBeVisible()
  })

  test('resources: upload -> preprocess -> understand', async ({ page }) => {
    await presetMock(page, TEACHER_USER)
    await page.goto('/teacher/resources')
    await expect(page.getByText('材料')).toBeVisible()
  })

  test('student role cannot enter teacher workspace (redirects to overview)', async ({ page }) => {
    await presetMock(page, STUDENT_USER)
    await page.goto('/teacher/today')
    await expect(page).toHaveURL(/\/overview/)
  })

  test('mock returns 40901 on stale version (no silent overwrite)', async ({ page, request }) => {
    const headers = { Authorization: 'Bearer mock-token-teacher-preview' }
    const adapt = await request.post('/api/teacher/lessons/adapt', { headers, data: { class_id: 'c1', topic: '试讲', requirements: 'x' } })
    const art = (await adapt.json()).data
    const first = await request.put(`/api/teacher/artifacts/${art.artifact_id}`, { headers, data: { version: 1, content: art.content } })
    expect(first.status()).toBe(200)
    const stale = await request.put(`/api/teacher/artifacts/${art.artifact_id}`, { headers, data: { version: 1, content: art.content } })
    expect(stale.status()).toBe(409)
    expect((await stale.json()).code).toBe(40901)
  })
})