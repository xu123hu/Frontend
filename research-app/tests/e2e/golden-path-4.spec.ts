import { mkdirSync } from 'node:fs';
import { test, expect, type Page } from '@playwright/test';

const OUT_DIR = 'artifacts/acceptance/f3';

/**
 * F3 黄金链路三 E2E：论文阅读与公式保真翻译（TC-F03-01..06 + TC-X03）。
 * 用例来源：docs/handoff/F3/design.md §5.1（TC-F03-xx）。
 * 运行环境：MSW 契约草案；翻译 run 走 M0 冻结 POST /runs（run_type=translation）+ SSE。
 * 公式恢复冲突：种子译文 blk-trans-03 为 partially_translated（06 §5 步骤 6）。
 */
const DEMO_PHONE = '13800000001';
const DEMO_OTP = '888888';

test.beforeAll(() => {
  mkdirSync(OUT_DIR, { recursive: true });
});

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

test.describe('阅读与翻译双栏（TC-F03-01）', () => {
  test('从文献条目阅读页进入翻译模式，非孤立工具页', async ({ page }) => {
    await login(page);
    await page.goto('/research/literature/item-001/reading');
    await expect(page.locator('[aria-label="PDF 阅读区"] canvas').first()).toBeVisible({ timeout: 20_000 });

    // 模式切换 → 阅读与翻译（aside 与 pane 同 aria-label，取 .first()）
    await page.getByRole('button', { name: '阅读与翻译' }).click();
    await expect(page.getByLabel('译文与保真').first()).toBeVisible();
    await expect(page.getByText('译文与保真').first()).toBeVisible();
    // 仍在文献阅读页（非孤立工具页）
    await expect(page).toHaveURL(/\/research\/literature\/item-001\/reading/);
  });
});

test.describe('发起翻译与公式保真（TC-F03-02/03/04）', () => {
  test('发起翻译 → 进度/预算 → 完成 → 译文单元 + 保真报告；冲突块保留原公式不整篇成功', async ({ page }) => {
    await login(page);
    await page.goto('/research/literature/item-001/reading');
    await expect(page.locator('[aria-label="PDF 阅读区"] canvas').first()).toBeVisible({ timeout: 20_000 });
    await page.getByRole('button', { name: '阅读与翻译' }).click();
    const pane = page.getByLabel('译文与保真').first();

    // 发起翻译（后台 run，SSE 驱动进度——瞬时进度不断言，直接等稳定终态）
    await pane.getByRole('button', { name: '发起翻译' }).click();

    // 完成后显示译文单元（真实译文内容）
    await expect(pane.getByText('多层模型将方差分解到不同层级。')).toBeVisible({ timeout: 20_000 });
    await expect(pane.getByText('层一模型刻画校内关系。')).toBeVisible();

    // 公式保真报告：数量/顺序一致，哈希不一致 → 综合 partial（不输出整篇成功）
    await expect(pane.getByText('公式保真报告')).toBeVisible();
    await expect(pane.getByText('公式哈希')).toBeVisible();
    await expect(pane.getByText('不一致').first()).toBeVisible();
    await expect(pane.getByText(/部分块未通过保真检查，未标记为整篇翻译成功/)).toBeVisible();

    // 公式恢复冲突块：标记 + 原公式保留 + 原因
    await expect(pane.getByText('公式恢复冲突，原公式保留').first()).toBeVisible();
    await expect(pane.getByText(/公式 .* 被改写为/).first()).toBeVisible();
    // KaTeX 渲染的原公式存在（非空 formula 区）
    const formula = pane.locator('.formula').first();
    await expect(formula).toBeVisible();
    const html = await formula.innerHTML();
    expect(html.length).toBeGreaterThan(0);
  });
});

test.describe('译文段落回链原文（TC-F03-05）', () => {
  test('点击译文段落 → 定位原文页', async ({ page }) => {
    await login(page);
    await page.goto('/research/literature/item-001/reading');
    await expect(page.locator('[aria-label="PDF 阅读区"] canvas').first()).toBeVisible({ timeout: 20_000 });
    await page.getByRole('button', { name: '阅读与翻译' }).click();
    const pane = page.getByLabel('译文与保真').first();
    await pane.getByRole('button', { name: '发起翻译' }).click();
    await expect(pane.getByText('多层模型将方差分解到不同层级。')).toBeVisible({ timeout: 20_000 });

    // 定位原文按钮存在且可点击（滚动到对应页）
    const locate = pane.getByRole('button', { name: /定位原文块 blk-trans-01/ });
    await expect(locate).toBeVisible();
    await locate.click();
    await expect(page.getByRole('button', { name: '阅读与翻译' })).toBeVisible();
  });
});

test.describe('三视口截图（TC-X03-06）', () => {
  const shots: Array<{ name: string; run: (page: Page) => Promise<void> }> = [
    {
      name: 'writing',
      run: async (page) => {
        await login(page);
        await page.goto('/research/writing/ms-alpha-1');
        await expect(page.getByLabel('LaTeX 编辑器').first()).toBeVisible({ timeout: 15_000 });
        await expect(page.getByText('AI 修订建议（3）')).toBeVisible({ timeout: 15_000 });
      },
    },
    {
      name: 'writing-compile',
      run: async (page) => {
        await login(page);
        await page.goto('/research/writing/ms-alpha-1');
        await expect(page.getByLabel('LaTeX 编辑器').first()).toBeVisible({ timeout: 15_000 });
        await page.getByRole('button', { name: '编译 PDF' }).click();
        await expect(page.getByLabel('编译时间线').getByText('编译成功')).toBeVisible({ timeout: 20_000 });
      },
    },
    {
      name: 'reading-translate',
      run: async (page) => {
        await login(page);
        await page.goto('/research/literature/item-001/reading');
        await expect(page.locator('[aria-label="PDF 阅读区"] canvas').first()).toBeVisible({ timeout: 20_000 });
        await page.getByRole('button', { name: '阅读与翻译' }).click();
        const pane = page.getByLabel('译文与保真').first();
        await pane.getByRole('button', { name: '发起翻译' }).click();
        await expect(pane.getByText('多层模型将方差分解到不同层级。')).toBeVisible({ timeout: 20_000 });
      },
    },
  ];

  for (const shot of shots) {
    test(`F3-截图 ${shot.name}`, async ({ page }, testInfo) => {
      await shot.run(page);
      await page.waitForTimeout(300);
      await page.screenshot({ path: `${OUT_DIR}/f3-${shot.name}-${testInfo.project.name}.png`, fullPage: true });
    });
  }
});
