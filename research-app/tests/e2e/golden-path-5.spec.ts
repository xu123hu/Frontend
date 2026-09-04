import { mkdirSync } from 'node:fs';
import { test, expect, type Page } from '@playwright/test';

const OUT_DIR = 'artifacts/acceptance/f4';

/**
 * F4 黄金链路五 E2E：数学评审（TC-F05-01..06 + TC-X05）。
 * 用例来源：docs/handoff/F4/design.md §6（黄金链路五双轨用例）。
 * 运行环境：MSW 契约草案（review-db 种子：review-paper-1 + 4 主张 + cl-4 L4 反例 + cl-2 Lean partial_supported）。
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
  await page.waitForResponse((r) => r.url().includes('/auth/session/otp') && r.request().method() === 'POST');
  await page.getByLabel('验证码').fill(DEMO_OTP);
  await page.getByRole('button', { name: '登录', exact: true }).click();
  await expect(page).toHaveURL(/\/research\/home/);
}

async function openWorkspace(page: Page): Promise<void> {
  await page.goto('/research/review');
  await page.getByRole('link', { name: '分层线性模型下数学建模成绩差异的多层分析' }).click();
  await expect(page).toHaveURL(/\/research\/review\/review-paper-1/);
  await expect(page.getByText('待审主张（公式 / 定理 / 前提）')).toBeVisible();
}

test.describe('双视图切换（TC-F05-01）', () => {
  test('作者视图可见评审建议；评委视图不渲染该字段（权限裁剪语义）', async ({ page }) => {
    await login(page);
    await openWorkspace(page);

    // 作者视图（默认）：建议面板可见
    await expect(page.getByLabel('作者可见建议')).toBeVisible();
    await expect(page.getByText('建议补充稳健标准误结果')).toBeVisible();

    // 切评委视图：建议面板不渲染；mode 持久化到 query
    await page.getByRole('tab', { name: '评委视图' }).click();
    await expect(page).toHaveURL(/mode=reviewer/);
    await expect(page.getByLabel('作者可见建议')).toHaveCount(0);
    await expect(page.getByText('建议补充稳健标准误结果')).toHaveCount(0);

    // 主张仍可见（评委同样审主张）
    await expect(page.getByText('待审主张（公式 / 定理 / 前提）')).toBeVisible();

    // 回作者视图
    await page.getByRole('tab', { name: '作者视图' }).click();
    await expect(page.getByLabel('作者可见建议')).toBeVisible();
  });
});

test.describe('主张提取与修正（TC-F05-02）', () => {
  test('提取主张含类型/前提/原文引用；作者可修正表述并保存', async ({ page }) => {
    await login(page);
    await openWorkspace(page);

    // 主张卡：类型徽标 + 前提 + 原文引用
    const cl1 = page.locator('[data-claim-id="cl-1"]');
    await expect(cl1).toBeVisible();
    await expect(cl1.getByText('公式', { exact: true })).toBeVisible();
    await expect(cl1.getByText(/前提：.*中心化/)).toBeVisible();
    await expect(cl1.getByText(/原文（第 4 页）|原文（第 3 页）/)).toBeVisible();

    // 作者修正（HumanDecision 审计语义）
    await cl1.getByLabel('修正表述（HumanDecision 审计）').fill('\\gamma_{01} > 0 且显著（t=3.4, p<0.01，稳健 SE）');
    await cl1.getByRole('button', { name: '保存修正' }).click();
    await expect(cl1.getByText(/已修正（原表述：/)).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('分层验证 L0-L4（TC-F05-03）', () => {
  test('五能力独立分项：L4 反例卡含代入值/前提检查/复算，不合并总分', async ({ page }) => {
    await login(page);
    await openWorkspace(page);

    const cl4 = page.locator('[data-claim-id="cl-4"]');
    await cl4.getByRole('button', { name: '验证详情' }).click();
    const layerList = cl4.getByLabel('分层验证（L0-L4 五能力独立分项）');
    await expect(layerList).toBeVisible();

    // 五层各自独立（工具+版本+状态）
    for (const layer of ['L0', 'L1', 'L2', 'L3', 'L4']) {
      await expect(layerList.locator(`[data-layer="${layer}"]`)).toBeVisible();
    }
    await expect(layerList.locator('[data-layer="L4"]')).toContainText('反例');
    // L4 失败带 role=alert（状态不只靠颜色）
    await expect(layerList.locator('[data-layer="L4"]').getByRole('alert')).toBeVisible();

    // 反例详情三要素（summary 与 dt 文本重叠 → 全部 exact 匹配）
    await layerList.locator('[data-layer="L4"]').getByText('反例详情（代入值 / 前提检查 / 复算）').click();
    await expect(layerList.getByText('代入值', { exact: true })).toBeVisible();
    await expect(layerList.getByText('前提约束检查', { exact: true })).toBeVisible();
    await expect(layerList.getByText('复算', { exact: true })).toBeVisible();
  });
});

test.describe('Lean 三状态（TC-F05-04/05 红线样例）', () => {
  test('翻译 partial + 内核 succeeded + 结论 partial → 综合 partial_supported；不显示论文正确', async ({ page }) => {
    await login(page);
    await openWorkspace(page);

    const cl2 = page.locator('[data-claim-id="cl-2"]');
    await cl2.getByRole('button', { name: '验证详情' }).click();
    const lean = cl2.locator('[data-overall="partial_supported"]');
    await expect(lean).toBeVisible();

    // 三列独立 + 综合横幅（红线文案：通过 Lean ≠ 论文正确）
    await expect(lean.getByText(/综合状态：部分支持（partial_supported）/)).toBeVisible();
    await expect(lean.getByText(/通过 Lean ≠ 论文正确/)).toBeVisible();
    // 无 sorry/admit 检查展示
    await expect(lean.getByText(/sorry|admit/i).first()).toBeVisible();
  });
});

test.describe('修订与复核（TC-F05-06）', () => {
  test('修订时间线含 diff 与复核状态；评委可复核 pending 修订', async ({ page }) => {
    await login(page);
    await openWorkspace(page);

    const timeline = page.getByLabel('修订时间线');
    // v1 待复核 + v2 已通过（含评委备注）
    await expect(timeline.getByText('补充 L4 反例约束说明与稳健标准误')).toBeVisible();
    await expect(timeline.getByText('弱化 cl-4 主张为「部分解释」')).toBeVisible();
    await expect(timeline.getByText('评委备注：反例处理正确')).toBeVisible();

    // 作者视图无复核按钮
    await expect(timeline.getByRole('button', { name: '复核通过' })).toHaveCount(0);

    // 评委视图：pending 修订出现复核动作
    await page.getByRole('tab', { name: '评委视图' }).click();
    await expect(timeline.getByRole('button', { name: '复核通过' })).toBeVisible();
    await expect(timeline.getByRole('button', { name: '需继续修改' })).toBeVisible();
    await timeline.getByLabel('复核备注').fill('稳健 SE 列格式需统一');
    await timeline.getByRole('button', { name: '复核通过' }).click();
    await expect(timeline.getByText('评委备注：稳健 SE 列格式需统一')).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('三视口截图（TC-X05-01）', () => {
  const shots: Array<{ name: string; run: (page: Page) => Promise<void> }> = [
    {
      name: 'review-list',
      run: async (page) => {
        await login(page);
        await page.goto('/research/review');
        await expect(page.getByText('分层线性模型下数学建模成绩差异的多层分析')).toBeVisible({ timeout: 15_000 });
      },
    },
    {
      name: 'review-author',
      run: async (page) => {
        await login(page);
        await openWorkspace(page);
        const cl4 = page.locator('[data-claim-id="cl-4"]');
        await cl4.getByRole('button', { name: '验证详情' }).click();
        await expect(cl4.getByLabel('分层验证（L0-L4 五能力独立分项）')).toBeVisible({ timeout: 10_000 });
      },
    },
    {
      name: 'review-reviewer',
      run: async (page) => {
        await login(page);
        await openWorkspace(page);
        await page.getByRole('tab', { name: '评委视图' }).click();
        await expect(page.getByText('修订时间线（评委复核）')).toBeVisible({ timeout: 10_000 });
      },
    },
  ];

  for (const shot of shots) {
    test(`F4-截图 ${shot.name}`, async ({ page }, testInfo) => {
      await shot.run(page);
      await page.waitForTimeout(300);
      await page.screenshot({ path: `${OUT_DIR}/f4-${shot.name}-${testInfo.project.name}.png`, fullPage: true });
    });
  }
});
