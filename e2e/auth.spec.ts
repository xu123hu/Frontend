import { expect, test } from '@playwright/test'

test.describe('unified authentication journeys', () => {
  test('student SMS registration completes onboarding without storing access tokens', async ({ page }) => {
    await page.goto('/register')
    await page.getByLabel('手机号').fill('13800000000')
    await page.getByRole('button', { name: '获取验证码' }).click()
    await expect(page.getByText('演示环境验证码：123456')).toBeVisible()
    await page.getByLabel('短信验证码').fill('123456')
    await page.getByText('我已阅读并同意').click()
    await page.getByRole('button', { name: '注册并继续' }).click()
    await expect(page).toHaveURL(/\/onboarding\/student/)
    await page.getByLabel('姓名或昵称').fill('小数同学')
    await page.getByLabel('年级').fill('高二')
    await page.getByRole('button', { name: '进入学习空间' }).click()
    await expect(page).toHaveURL(/\/overview/)

    const stored = await page.evaluate(() => ({
      local: localStorage.getItem('ma_token'),
      session: sessionStorage.getItem('ma_token'),
    }))
    expect(stored).toEqual({ local: null, session: null })
  })

  test('authenticated student submits a teacher application and sees pending review', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('ma_user', JSON.stringify({ active_role: 'student' }))
    })
    await page.goto('/identity/apply')
    await page.getByLabel('学校或机构').fill('示例中学')
    await page.getByLabel('任教学段').fill('高中')
    await page.getByRole('button', { name: '提交审核' }).click()
    await expect(page).toHaveURL(/\/identity\/pending/)
    await expect(page.getByText('审核中')).toBeVisible()
  })

  test('login entry has SMS/password modes and no privileged role selector', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('tab', { name: '短信验证码' })).toBeVisible()
    await expect(page.getByRole('tab', { name: '密码登录' })).toBeVisible()
    await expect(page.locator('select[name="role"]')).toHaveCount(0)
  })
})
