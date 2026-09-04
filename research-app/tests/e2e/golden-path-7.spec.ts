import { mkdirSync } from 'node:fs';
import { test, expect, type Page } from '@playwright/test';

const OUT_DIR = 'artifacts/acceptance/f5';

/**
 * F5 黄金链路七 · 教育研究 E2E（收口 F4 静态占位）。
 * 契约：CR-F5-01（对齐 M4 §8.1-8.6 + §8.7）。
 * 覆盖：TC-F07-01 课题接收 → TC-F07-02 隐私预检(preflight) → TC-F07-03 快照创建 →
 * TC-F07-04 k<20 拒绝（422 PRIVACY_THRESHOLD_NOT_MET，不返回数据）→ TC-F07-05 统计分析与图表 →
 * TC-F07-06 成果回流审批。
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

async function goEducation(page: Page): Promise<void> {
  await page.goto('/research/education');
  await expect(page.getByRole('heading', { name: '教育研究' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '接收教师课题' })).toBeVisible();
}

test('教育研究五步链路：课题→预检→快照→分析→回流（TC-F07-01..06）', async ({ page }) => {
  await login(page);
  await goEducation(page);

  // TC-F07-01 接收教师课题：课题卡真实渲染（发布方/样本/阈值/数据状态）
  await expect(page.getByText('教师发布的研究课题')).toBeVisible();
  await expect(page.getByText('高一数学建模教研组')).toBeVisible();
  await expect(page.getByText('k ≥ 20')).toBeVisible();
  await expect(page.getByText('待授权')).toBeVisible();

  // 进入隐私预检（触发 M4 §8.2 preflight）
  await page.getByRole('button', { name: '查看授权与隐私预检' }).first().click();
  await expect(page.getByRole('heading', { name: '授权与隐私预检' })).toBeVisible();
  // 授权数据产品名（step 1 展示数据集）
  await expect(page.getByText(/训练论文匿名错误数据 v3/)).toBeVisible();

  // TC-F07-02 隐私预检：preflight 结果（预估行数/最小 cell_k/L1 分级）
  await expect(page.getByText('预估行数')).toBeVisible();
  await expect(page.getByText('46')).toBeVisible();
  await expect(page.getByText('L1', { exact: true })).toBeVisible();
  await expect(page.getByText('最小样本检查')).toBeVisible();

  // TC-F07-03 确认并创建快照
  await page.getByRole('button', { name: '确认并创建数据快照' }).click();
  await expect(page.getByRole('heading', { name: '创建数据快照' })).toBeVisible();
  await expect(page.getByText('数据快照已创建')).toBeVisible();
  await expect(page.getByText(/EDU-SNAP-\d+/).first()).toBeVisible();
  await expect(page.getByText('已授权')).toBeVisible();

  // TC-F07-04 k<20 拒绝：小切片 → 422 PRIVACY_THRESHOLD_NOT_MET，明确拒绝不返回数据
  await page.getByRole('button', { name: '测试 k < 20 拒绝状态' }).click();
  const rejectBoundary = page.getByText('隐私规则已阻止分析');
  await expect(rejectBoundary).toBeVisible();
  await expect(page.getByText(/低于 k < 20 的拒绝阈值/)).toBeVisible();

  // TC-F07-05 运行统计分析 → 结果与图表（估计值/警告/导出 artifact 哈希绑定）
  await page.getByRole('button', { name: '运行统计分析' }).click();
  await expect(page.getByRole('heading', { name: '统计分析与图表' })).toBeVisible();
  await expect(page.getByText(/符号错误变化/)).toBeVisible();
  await expect(page.getByText('-31%', { exact: true })).toBeVisible();
  await expect(page.getByText('本研究不是随机对照，不能仅据此作因果结论。', { exact: true })).toBeVisible();
  await expect(page.getByText('分析：已完成')).toBeVisible();
  await page.getByRole('button', { name: '导出图表与数据快照' }).click();
  await expect(page.getByText(/已导出 建模错误趋势图\.svg/)).toBeVisible();
  await expect(page.getByText(/sha256:snap-031/)).toBeVisible();
  await expect(page.getByText(/sha256:params-031/)).toBeVisible();

  // TC-F07-06 成果回流：申请 → 待审批 → 模拟管理员审批 → 已回流
  await page.getByRole('button', { name: '申请成果回流' }).click();
  await expect(page.getByRole('heading', { name: '成果审批与回流' })).toBeVisible();
  await expect(page.getByText('成果发布等待审批')).toBeVisible();
  await page.getByRole('button', { name: '模拟管理员审批（演示）' }).click();
  await expect(page.getByText('成果发布已批准')).toBeVisible();
  await expect(page.getByText('教师端').first()).toBeVisible();
  await expect(page.getByText('已回流').first()).toBeVisible();
});

test('教育研究三视口截图（TC-X07-01）', async ({ page }) => {
  await login(page);
  await goEducation(page);
  await page.screenshot({ path: `${OUT_DIR}/f5-education-${test.info().project.name}.png`, fullPage: true });
  // 走到分析态再截一张（课题→预检→快照→分析）
  await page.getByRole('button', { name: '查看授权与隐私预检' }).first().click();
  await page.getByRole('button', { name: '确认并创建数据快照' }).click();
  await page.getByRole('button', { name: '运行统计分析' }).click();
  await expect(page.getByRole('heading', { name: '统计分析与图表' })).toBeVisible();
  await page.screenshot({ path: `${OUT_DIR}/f5-education-analysis-${test.info().project.name}.png`, fullPage: true });
});
