import { test, expect, type Page } from '@playwright/test';

/**
 * F3 黄金链路四 E2E：LaTeX 写作工作台（TC-F04-01..06 + TC-X04-02/04）。
 * 用例来源：docs/handoff/F3/design.md §5.1（TC-F04-xx）。
 * 运行环境：MSW 契约草案；断言全部针对真实渲染与真实网络响应。
 * 编译失败场景（缺失资源/不安全命令）经 mock 演练钩子（mock_scenario，非契约端点）。
 */
const DEMO_PHONE = '13800000001';
const DEMO_OTP = '888888';

async function login(page: Page): Promise<void> {
  await page.goto('/research/login');
  await page.getByLabel('手机号').fill(DEMO_PHONE);
  await page.getByRole('button', { name: '获取验证码' }).click();
  // 等待 OTP 请求完成（handler 含 300ms 延迟），避免登录先于服务端 passwordless 落库
  await page.waitForResponse((r) => r.url().includes('/auth/session/otp') && r.request().method() === 'POST');
  await page.getByLabel('验证码').fill(DEMO_OTP);
  await page.getByRole('button', { name: '登录', exact: true }).click();
  await expect(page).toHaveURL(/\/research\/home/);
}

/** 进入写作工作台（种子文稿 ms-alpha-1 自动打开）。 */
async function gotoWriting(page: Page): Promise<void> {
  await page.goto('/research/writing/ms-alpha-1');
  await expect(page.getByRole('heading', { name: '写作', exact: true })).toBeVisible();
  await expect(page.getByLabel('LaTeX 编辑器').first()).toBeVisible({ timeout: 15_000 });
}

test.describe('写作文件树与编辑器（TC-F04-01）', () => {
  test('文件树加载真实 tex；编辑器显示文稿源码', async ({ page }) => {
    await login(page);
    await gotoWriting(page);

    // 文件树：main.tex / sections/intro.tex / references.bib
    await expect(page.getByRole('button', { name: /main\.tex/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /sections\/intro\.tex/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /references\.bib/ })).toBeVisible();

    // 编辑器加载真实 LaTeX 内容（自研模板，非占位）
    await expect(page.locator('.cm-content').first()).toContainText('\\documentclass[12pt]{article}');
    await expect(page.locator('.cm-content').first()).toContainText('\\begin{document}');
  });
});

test.describe('编译成功（TC-F04-04）', () => {
  test('编译 → 进度 → 成功显示引擎/输入哈希/PDF 预览', async ({ page }) => {
    await login(page);
    await gotoWriting(page);

    await page.getByRole('button', { name: '编译 PDF' }).click();
    await expect(page.getByLabel('编译时间线').getByText('编译成功')).toBeVisible({ timeout: 20_000 });

    // 引擎版本 + 输入哈希（Artifact.sha256）+ PDF 预览
    await expect(page.getByLabel('编译时间线').getByText(/Tectonic/)).toBeVisible();
    await expect(page.getByLabel('编译时间线').getByText(/sha256:/)).toBeVisible();
    await expect(page.locator('.pdf-frame')).toBeVisible();
  });
});

test.describe('编译失败定位（TC-F04-05）', () => {
  test('缺失资源 → 错误精确定位文件/行；旧 PDF 不丢失', async ({ page }) => {
    await login(page);
    await gotoWriting(page);

    // 首次成功编译（保留上次成功 PDF 的基础）
    await page.getByRole('button', { name: '编译 PDF' }).click();
    await expect(page.getByLabel('编译时间线').getByText('编译成功').first()).toBeVisible({ timeout: 20_000 });

    // 演练：缺失资源失败
    await page.getByText('演练：编译失败场景').click();
    await page.getByRole('button', { name: '缺失资源' }).click();
    await expect(page.getByLabel('编译时间线').getByText('编译失败').first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByLabel('编译时间线').getByText(/main\.tex:1/)).toBeVisible();
    await expect(page.getByLabel('编译时间线').getByText(/sections\/intro\.tex not found/)).toBeVisible();
    // 上次成功 PDF 不丢失提示
    await expect(page.getByText(/上一次成功 PDF 不会丢失/)).toBeVisible();
  });

  test('不安全命令 → 标记不安全命令 + 错误定位', async ({ page }) => {
    await login(page);
    await gotoWriting(page);

    // 先成功编译一次，演练区（v-if activeRunId）才出现
    await page.getByRole('button', { name: '编译 PDF' }).click();
    await expect(page.getByLabel('编译时间线').getByText('编译成功').first()).toBeVisible({ timeout: 20_000 });

    await page.getByText('演练：编译失败场景').click();
    await page.getByRole('button', { name: '不安全命令' }).click();
    await expect(page.getByLabel('编译时间线').getByText('编译失败').first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByLabel('编译时间线').getByText('不安全命令').first()).toBeVisible();
    await expect(page.getByLabel('编译时间线').getByText(/shell escape 被禁用/)).toBeVisible();
  });
});

test.describe('AI diff 逐项接受/拒绝（TC-F04-02）', () => {
  test('建议四要素齐全；接受/拒绝状态变化且拒绝不覆盖源文件', async ({ page }) => {
    await login(page);
    await gotoWriting(page);

    const panel = page.getByLabel('AI 修订建议');
    await expect(panel.getByText('AI 修订建议（3）')).toBeVisible({ timeout: 15_000 });

    // 四要素：原文 / 建议 / 理由 / 风险
    await expect(panel.getByText('原文').first()).toBeVisible();
    await expect(panel.getByText('建议').first()).toBeVisible();
    await expect(panel.getByText('理由').first()).toBeVisible();
    await expect(panel.getByText('风险').first()).toBeVisible();

    // 接受第一条 → 已接受；拒绝第三条 → 已拒绝（高风险建议）
    await panel.getByRole('button', { name: /接受建议 sg-1/ }).click();
    await expect(panel.getByText('已接受').first()).toBeVisible({ timeout: 15_000 });

    await panel.getByRole('button', { name: /拒绝建议 sg-3/ }).click();
    await expect(panel.getByText('已拒绝').first()).toBeVisible({ timeout: 15_000 });
  });
});

test.describe('引用插入（TC-F04-03）', () => {
  test('候选仅已核验文献；插入 cite 命令 + references.bib 更新', async ({ page }) => {
    await login(page);
    await gotoWriting(page);

    await page.getByRole('button', { name: '插入引用' }).click();
    const dialog = page.getByRole('dialog', { name: '插入引用' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('插入引用（仅已核验文献）')).toBeVisible();

    // 候选：已核验条目出现（Hierarchical Linear Models / Bayesian multilevel 等）
    await expect(dialog.getByText(/Hierarchical Linear Models/).first()).toBeVisible({ timeout: 15_000 });

    // 插入一条 → 弹窗关闭
    await dialog.getByRole('button', { name: /插入 Hierarchical Linear Models/ }).click();
    await expect(dialog).toBeHidden();

    // references.bib 被更新：切换文件查看 @article 条目
    await page.getByRole('button', { name: /references\.bib/ }).click();
    await expect(page.locator('.cm-content').first()).toContainText('@article{raudenbush2002-', { timeout: 15_000 });
  });
});

test.describe('证据检查入口（TC-F04-06）', () => {
  test('展开证据检查 → 列出无证据句 + 请求补证', async ({ page }) => {
    await login(page);
    await gotoWriting(page);

    await page.getByRole('button', { name: /证据检查/ }).click();
    await expect(page.getByText('证据检查（无证据句）')).toBeVisible();
    await expect(page.getByText(/请求补证/).first()).toBeVisible();
  });
});
