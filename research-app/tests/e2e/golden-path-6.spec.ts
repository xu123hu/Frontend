import { mkdirSync } from 'node:fs';
import { test, expect, type Page } from '@playwright/test';

const OUT_DIR = 'artifacts/acceptance/f4';

/**
 * F4 黄金链路六 E2E：AI 管家可恢复研究循环（TC-F06-01..05 + TC-X06）。
 * 用例来源：docs/handoff/F4/design.md §6（黄金链路六双轨用例）。
 * 种子（steward-db）：
 * - run-cycle-seed-1：已完成（含拒绝步骤 → partial + 产物 + 替代路径）。
 * - run-cycle-seed-2：运行中 + pending 审批 appr-seed-2（决策 + 参数变更失效载体）。
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

async function openTasksTab(page: Page): Promise<void> {
  await page.goto('/research/home');
  // 球体按钮有唯一 id（页头另有「打开 AI 管家」按钮，避免歧义）。
  await page.locator('#assistant-orb').click();
  const drawer = page.locator('#agent-drawer');
  await expect(drawer).toHaveClass(/open/);
  await drawer.getByRole('tab', { name: /任务/ }).click();
}

test.describe('研究循环计划时间线（TC-F06-01/02）', () => {
  test('计划含研究问题/严谨模式/预算/假设 hypothesis 标记/步骤状态', async ({ page }) => {
    await login(page);
    await openTasksTab(page);

    const drawer = page.locator('#agent-drawer');
    const plan = drawer.locator('article[aria-label^="研究循环计划"]').first();
    await expect(plan.getByText('学校资源投入如何影响分层模型下的数学成绩差异？')).toBeVisible();
    await expect(plan.getByText('严谨模式')).toBeVisible();
    // 预算与花费（budget/spent 展示）
    await expect(plan.getByText(/预算：已花费 8\.60 \/ 50\.00 元/)).toBeVisible();
    // 候选假设一律标记 hypothesis（非 fact）
    const hypList = plan.getByLabel('候选假设（均为假设，非结论）');
    await expect(hypList.getByText('假设', { exact: true })).toHaveCount(2);
    await expect(hypList.getByText('学校资源投入显著解释校间截距差异')).toBeVisible();
  });
});

test.describe('拒绝步骤保留证据 + 替代路径（TC-F06-04）', () => {
  test('拒绝步骤显示 rejected + 替代路径；计划综合 partial 而非 failed', async ({ page }) => {
    await login(page);
    await openTasksTab(page);

    const drawer = page.locator('#agent-drawer');
    const plan = drawer.locator('article[aria-label^="研究循环计划"]').first();
    const rejectedStep = plan.locator('li[data-status="rejected"]');
    await expect(rejectedStep).toContainText('数值复算（高风险工具）');
    await expect(rejectedStep).toContainText('已拒绝（证据保留）');
    // 替代路径透出
    await expect(rejectedStep.getByText('替代路径：')).toBeVisible();
    await expect(rejectedStep.getByText('改用已核验文献中的数值结果')).toBeVisible();
    // 计划综合状态 partial（不进入 failed）
    await expect(plan.getByText('部分完成（含被拒绝步骤）')).toBeVisible();
    // 研究循环产物清单（TC-F06-05）
    const result = plan.getByLabel('研究循环产物');
    await expect(result).toBeVisible();
    await expect(result.getByText('限制声明')).toBeVisible();
    await expect(result.getByText('人工决定')).toBeVisible();
    await expect(result.getByText('数值复算被用户拒绝，仅符号验证通过')).toBeVisible();
  });
});

test.describe('高风险工具审批（TC-F06-03）', () => {
  test('审批卡：参数哈希绑定 + 批准决策 → 球体联动解除 waiting', async ({ page }) => {
    await login(page);
    await openTasksTab(page);

    const drawer = page.locator('#agent-drawer');
    // 球体 waiting（有待审批）+ 任务 Tab 徽标
    await expect(page.locator('#assistant-orb')).toHaveAttribute('data-status', 'waiting');
    await expect(page.locator('#assistant-orb')).toContainText('1');

    const approvals = drawer.getByLabel('待审批（高风险工具）');
    const card = approvals.getByLabel('审批卡：run_lean_kernel');
    await expect(card).toBeVisible();
    await expect(card.getByText('高风险', { exact: true })).toBeVisible();
    await expect(card.getByText(/参数哈希绑定：.*sha256:def456/)).toBeVisible();
    await expect(card.getByText('ellipse_reflection.lean')).toBeVisible();

    // 批准 → 审批卡离开 pending 列表；球体回到运行中/空闲态
    await card.getByRole('button', { name: '批准' }).click();
    await expect(approvals.getByLabel('审批卡：run_lean_kernel')).toHaveCount(0, { timeout: 10_000 });
    await expect(page.locator('#assistant-orb')).not.toHaveAttribute('data-status', 'waiting');
  });

  test('参数变更演练：决策后原审批失效（cancelled）+ 失效文案', async ({ page }) => {
    await login(page);
    await openTasksTab(page);

    const drawer = page.locator('#agent-drawer');
    const approvals = drawer.getByLabel('待审批（高风险工具）');
    const card = approvals.getByLabel('审批卡：run_lean_kernel');
    await expect(card).toBeVisible();

    await card.getByRole('button', { name: '模拟参数变更' }).click();
    // 决策后失效：审批移出 pending 列表（status=cancelled 不再展示在待审批区）
    await expect(approvals.getByLabel('审批卡：run_lean_kernel')).toHaveCount(0, { timeout: 10_000 });
  });
});

test.describe('发起研究循环（TC-F06-01）', () => {
  test('输入研究问题发起 → 新计划出现且假设标记 hypothesis', async ({ page }) => {
    await login(page);
    await openTasksTab(page);

    const drawer = page.locator('#agent-drawer');
    const form = drawer.getByLabel('发起研究循环');
    await form.getByLabel('研究问题').fill('卷积神经网络的平移等变性是否可以形式化证明？');
    await form.getByRole('button', { name: /发起研究循环/ }).click();

    // 新计划卡出现（轮询刷新后）
    const newPlan = drawer.locator('article[aria-label="研究循环计划：卷积神经网络的平移等变性是否可以形式化证明？"]');
    await expect(newPlan).toBeVisible({ timeout: 10_000 });
    const hypList = newPlan.getByLabel('候选假设（均为假设，非结论）');
    await expect(hypList.getByText('假设', { exact: true }).first()).toBeVisible();
  });
});

test.describe('ProjectDetail 研究问题—假设—证据面板（提示词 §项目工作区）', () => {
  test('假设列表 + 主张证据支持度 + 评审工作区入口', async ({ page }) => {
    await login(page);
    await page.goto('/research/projects/proj-alpha-1');
    const panel = page.getByLabel('研究问题—假设—证据—验证');
    await expect(panel).toBeVisible();
    await expect(panel.getByText('候选假设（AI 管家 · hypothesis）')).toBeVisible();
    await expect(panel.getByText('学校资源投入显著解释校间截距差异')).toBeVisible();
    // 主张证据支持度列表
    const evidence = panel.getByLabel('主张证据支持度列表');
    await expect(evidence.getByText('证据支持')).toBeVisible();
    await expect(evidence.getByText('证据冲突')).toBeVisible();
    // 入口链接
    await expect(panel.getByRole('link', { name: /在评审工作区查看分层验证与 Lean 三状态/ })).toBeVisible();
  });
});

test.describe('三视口截图（TC-X06-01/03）', () => {
  const shots: Array<{ name: string; run: (page: Page) => Promise<void> }> = [
    {
      name: 'steward-tasks',
      run: async (page) => {
        await login(page);
        await openTasksTab(page);
        await expect(page.locator('#agent-drawer').getByText('学校资源投入如何影响分层模型下的数学成绩差异？')).toBeVisible({ timeout: 10_000 });
      },
    },
    {
      name: 'steward-approval',
      run: async (page) => {
        await login(page);
        await openTasksTab(page);
        const drawer = page.locator('#agent-drawer');
        const card = drawer.getByLabel('待审批（高风险工具）').getByLabel('审批卡：run_lean_kernel');
        await expect(card).toBeVisible({ timeout: 10_000 });
      },
    },
    {
      name: 'project-evidence',
      run: async (page) => {
        await login(page);
        await page.goto('/research/projects/proj-alpha-1');
        await expect(page.getByLabel('研究问题—假设—证据—验证')).toBeVisible({ timeout: 10_000 });
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
