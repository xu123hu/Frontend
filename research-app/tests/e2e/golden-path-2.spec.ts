import { mkdirSync } from 'node:fs';
import { test, expect, type Page } from '@playwright/test';

const OUT_DIR = 'artifacts/acceptance/f2';

/**
 * F2 黄金链路二 E2E：检索/导入 → 文献库 → 阅读全文 → 划选批注/笔记 → 刷新持久化。
 * 用例来源：docs/handoff/F2/design.md §5（TC-F02-01/02/03/04/08/09/12、TC-X02-02/06）。
 * 运行环境：MSW 契约草案演示模式；断言全部针对真实渲染结果与真实网络响应。
 * TC-F02-05/06（重试/刷新恢复队列）由 use-import-queue 单测 + SSE 单测覆盖；
 * TC-F02-10（万条压测）由虚拟化组件在种子数据上的滚动用例覆盖（见下方 stress 用例）。
 */

const DEMO_PHONE = '13800000001';
const DEMO_OTP = '888888';

/**
 * F2 链路含重用例（PDF.js 双次渲染、万条种子虚拟滚动、SSE 事件流），
 * 在 fullyParallel 6 worker 并行负载下曾触顶默认 30s 测试级超时
 * （实测 desktop 全量并行：阅读用例总超时 30000ms）。
 * 显式放宽到 120s；断言级等待（20s/30s）保持不变，测试级不再成为瓶颈。
 */
test.setTimeout(120_000);

test.beforeAll(() => {
  mkdirSync(OUT_DIR, { recursive: true });
});

/** 完整登录流程（手机号 + OTP），断言落在 /research/home。 */
async function login(page: Page, phone: string = DEMO_PHONE, otp: string = DEMO_OTP): Promise<void> {
  await page.goto('/research/login');
  await page.getByLabel('手机号').fill(phone);
  await page.getByRole('button', { name: '获取验证码' }).click();
  // 等待 OTP 请求完成（handler 含 300ms 延迟），避免登录先于服务端 passwordless 落库
  await page.waitForResponse((r) => r.url().includes('/auth/session/otp') && r.request().method() === 'POST');
  await page.getByLabel('验证码').fill(otp);
  await page.getByRole('button', { name: '登录', exact: true }).click();
  await expect(page).toHaveURL(/\/research\/home/);
}

/** 进入文献库页并等待条目渲染。 */
async function gotoLiterature(page: Page): Promise<void> {
  await page.getByRole('link', { name: '文献' }).click();
  await expect(page).toHaveURL(/\/research\/literature/);
  await expect(page.getByRole('heading', { name: '文献', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /Hierarchical Linear Models/ }).first()).toBeVisible();
}

test.describe('三源检索与导入（TC-F02-01/02）', () => {
  test('检索 multilevel → 命中含来源徽标与全文标识；新条目可导入入库', async ({ page }) => {
    await login(page);
    await gotoLiterature(page);

    await page.getByRole('button', { name: '检索文献' }).click();
    const dialog = page.getByRole('dialog', { name: '三源文献检索' });
    await expect(dialog).toBeVisible();
    await dialog.getByLabel('检索关键词').fill('multilevel');
    await dialog.getByRole('button', { name: '检索' }).click();

    // 命中列表出现：来源（crossref/openalex/arxiv）与全文可得性标识；已入库条目有标记
    await expect(dialog.getByText(/Multilevel analysis: techniques and applications/)).toBeVisible();
    await expect(dialog.getByText('openalex').first()).toBeVisible();
    await expect(dialog.getByText('crossref').first()).toBeVisible();

    // 导入一条未入库条目 → 成功反馈（按钮态变化），库内可检索到
    const hit = dialog.locator('li', { hasText: 'Multilevel analysis: techniques and applications' });
    await hit.getByRole('button', { name: /导入|加入文献库/ }).click();
    await expect(hit.getByText(/已导入|已在库中/)).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(page.getByRole('button', { name: /Multilevel analysis: techniques and applications/ }).first()).toBeVisible();
  });
});

test.describe('批量导入与预处理进度（TC-F02-03/04，TC-X02-02）', () => {
  test('2 个合法 PDF + 1 个损坏文件 → 损坏立即失败；合法文件走完 queued→解析→切分→完成', async ({ page }) => {
    await login(page);
    await gotoLiterature(page);

    await page.getByRole('button', { name: '导入文献' }).click();
    const dialog = page.getByRole('dialog', { name: '批量导入文献' });
    await expect(dialog).toBeVisible();

    await dialog.locator('input[type="file"]').setInputFiles([
      { name: 'chapter-one.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 chapter-one') },
      { name: 'chapter-two.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 chapter-two') },
      { name: 'corrupted-scan.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 corrupted') },
    ]);

    // 非法（损坏）文件立即失败且原因可见——不静默（TC-F02-03 / TC-X02-04）
    await expect(dialog.getByText(/corrupted-scan\.pdf/)).toBeVisible();
    await expect(dialog.getByText(/文件损坏|解析失败|corrupted/).first()).toBeVisible({ timeout: 15_000 });

    // 合法文件：SSE 事件驱动进度 → 最终「完成」（TC-F02-04）
    await expect(dialog.locator('[aria-label="导入队列"]')
      .getByText('完成', { exact: true })
      .first()).toBeVisible({ timeout: 30_000 });

    // 队列汇总行：失败 1
    await expect(dialog.getByText(/失败 1/)).toBeVisible();

    // 导入完成的条目进入「全部条目」（服务端 run.completed 回指 item_id）
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: /chapter-one|chapter-two/ }).first()).toBeVisible({ timeout: 15_000 });
  });
});

test.describe('阅读全文 · 划选批注 · 笔记 · 持久化（TC-F02-08/09）', () => {
  test('阅读页 PDF 渲染 → 划选创建批注 → 保存笔记 → 刷新后两者保留且 PDF 重渲染', async ({ page }) => {
    await login(page);
    await gotoLiterature(page);

    // 选中 item-001 → 详情 → 阅读全文
    await page.getByRole('button', { name: /Hierarchical Linear Models/ }).first().click();
    await page.getByRole('button', { name: '阅读全文' }).click();
    await expect(page).toHaveURL(/\/research\/literature\/item-001\/reading/);

    // PDF 真实渲染（canvas + 文本层），无「打开失败」
    await expect(page.locator('[aria-label="PDF 阅读区"] canvas').first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('PDF 打开失败')).toHaveCount(0);
    const spans = page.locator('.textLayer span');
    await expect(spans.first()).toBeVisible();
    await expect(spans.first()).toContainText('Hierarchical Linear Models');

    // 划选批注：文本层为真实 DOM，构造选区后派发 mouseup（页面在 document 上监听）
    await page.evaluate(() => {
      const layer = document.querySelector('.page-wrap[data-page="1"] .textLayer');
      const span = Array.from(layer?.querySelectorAll('span') ?? [])
        .find((s) => (s.textContent ?? '').trim().length > 8)!;
      const sel = window.getSelection()!;
      sel.removeAllRanges();
      const range = document.createRange();
      range.setStart(span.firstChild!, 0);
      range.setEnd(span.firstChild!, Math.min(span.textContent!.length, 24));
      sel.addRange(range);
      document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    });

    const draft = page.getByRole('form', { name: '新建批注' });
    await expect(draft).toBeVisible();
    await expect(draft).toContainText('新批注（第 1 页）');
    await expect(draft).toContainText('Hierarchical'); // 引文原文回显（截取自首个 span）
    await draft.getByLabel('批注内容').fill('E2E 划选批注验证');
    await draft.getByRole('button', { name: '保存批注' }).click();
    await expect(draft).toBeHidden();

    // 批注列表出现新条目（种子 2 条 + 新 1 条 = 批注（3））
    await expect(page.getByText('批注（3）')).toBeVisible();
    await expect(page.getByText('E2E 划选批注验证')).toBeVisible();

    // 笔记独立子对象
    await page.getByLabel('笔记内容').fill('E2E 笔记持久化验证');
    await page.getByRole('button', { name: '保存笔记' }).click();
    await expect(page.getByText('E2E 笔记持久化验证')).toBeVisible();

    // 刷新 → 会话保持 + PDF 重渲染 + 批注/笔记从服务端重放（TC-F02-09）
    await page.reload();
    await expect(page).toHaveURL(/\/research\/literature\/item-001\/reading/);
    await expect(page.locator('[aria-label="PDF 阅读区"] canvas').first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('批注（3）')).toBeVisible();
    await expect(page.getByText('E2E 划选批注验证')).toBeVisible();
    await expect(page.getByText('E2E 笔记持久化验证')).toBeVisible();
  });

  test('证据跳转 query → 滚动到对应页并显示 bbox 高亮框（TC-F02-08）', async ({ page }) => {
    await login(page);
    await page.goto('/research/literature/item-001/reading?page=2&bbox=72,660,540,690');
    await expect(page.locator('[aria-label="PDF 阅读区"] canvas').first()).toBeVisible({ timeout: 20_000 });
    const highlight = page.locator('.evidence-highlight');
    await expect(highlight).toBeVisible();
    const style = await highlight.getAttribute('style');
    expect(style).toContain('top: 924px'); // 660 × SCALE(1.4)
  });
});

test.describe('无全文条目诚实降级（TC-F02-12）', () => {
  test('metadata_only 条目 → 明确原因说明，不渲染假页面', async ({ page }) => {
    await login(page);
    // item-003（Teacher effects…）种子为 metadata_only，无 pdf_artifact_id
    await page.goto('/research/literature/item-003/reading');
    // 并行负载下 app 引导 + 条目查询可能超过默认 5s 断言，显式放宽到 15s。
    await expect(page.getByText('无全文可读')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/metadata_only/)).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('[aria-label="PDF 阅读区"] canvas')).toHaveCount(0);
    // 诚实引导：提示可通过三源检索寻找全文来源
    await expect(page.getByText(/三源检索/)).toBeVisible({ timeout: 15_000 });
  });
});

test.describe('失败重试（TC-F02-05）', () => {
  test('timeout 文件首次解析失败（原因可见）→ 单条重试 → 重试后完成', async ({ page }) => {
    await login(page);
    await gotoLiterature(page);
    await page.getByRole('button', { name: '导入文献' }).click();
    const dialog = page.getByRole('dialog', { name: '批量导入文献' });
    await expect(dialog).toBeVisible();

    await dialog.locator('input[type="file"]').setInputFiles([
      { name: 'timeout-paper.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 timeout-paper') },
    ]);

    // 首次 run.failed(parse_failed, retryable)：失败原因可见 + 重试按钮出现（不静默）
    await expect(dialog.getByText(/timeout-paper\.pdf/)).toBeVisible();
    await expect(dialog.getByText(/解析服务超时/).first()).toBeVisible({ timeout: 15_000 });
    await expect(dialog.getByRole('button', { name: /重试 timeout-paper/ })).toBeVisible({ timeout: 15_000 });

    // 单条重试 → 重新入队 → SSE 事件驱动 → 完成
    await dialog.getByRole('button', { name: /重试 timeout-paper/ }).click();
    await expect(dialog.getByText('完成', { exact: true })).toBeVisible({ timeout: 30_000 });
  });
});

test.describe('切分确认（TC-F02-07）', () => {
  test('详情切分列表展示块类型/页码/哈希/完整性；逐条确认入库', async ({ page }) => {
    await login(page);
    await gotoLiterature(page);
    await page.getByRole('button', { name: /Hierarchical Linear Models/ }).first().click();

    // 切分列表（item-001 种子 5 块）：标题/段落/公式块(LaTeX)/表格/引文(完整性可疑)
    // 详情 + 切分查询在并行负载下可能超过默认 5s，显式放宽到 15s。
    await expect(page.getByText('切分结果（5）')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('公式块')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('y_{ij} = \\beta_{0j} + \\beta_{1j}x_{ij} + r_{ij}')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('完整性可疑')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/hash: h-01/)).toBeVisible({ timeout: 15_000 });

    // 逐条确认 → 状态翻转「未确认 → 已入库」（确认后缓存失效重取）
    const chunk = page.locator('.chunk').filter({ hasText: '1. Introduction' });
    await chunk.getByRole('button', { name: '确认' }).click();
    await expect(chunk.getByText('已入库')).toBeVisible({ timeout: 15_000 });
  });
});

test.describe('批量操作撤销（TC-F02-11）', () => {
  test('批量打标签 → 撤销条出现 → 撤销后标签移除', async ({ page }) => {
    await login(page);
    await gotoLiterature(page);

    // 勾选两条
    await page.getByLabel('选择 Hierarchical Linear Models: Applications and Data Analysis Methods').check();
    await page.getByLabel('选择 The Florida state assessment of mathematics: a multilevel analysis').check();
    await expect(page.getByText('已选 2')).toBeVisible();

    // 批量打标签 → 撤销条出现（mutation + 缓存失效在并行负载下放宽到 15s）
    await page.getByRole('button', { name: '打标签「重点」' }).click();
    await expect(page.getByText('已为 2 个条目添加标签「重点」')).toBeVisible({ timeout: 15_000 });

    // 撤销 → 标签移除、撤销条消失（撤销 mutation + 缓存失效）
    await page.getByRole('button', { name: '撤销' }).click();
    await expect(page.getByText('已为 2 个条目添加标签「重点」')).toHaveCount(0, { timeout: 15_000 });
    await expect(
      page.locator('.item-card').filter({ hasText: 'Hierarchical Linear Models' }).getByText('重点', { exact: true }),
    ).toHaveCount(0, { timeout: 15_000 });
  });
});

test.describe('列表虚拟化（TC-F02-10 抽样）', () => {
  test('万条种子数据下列表仅渲染可视窗口附近行，检索筛选可用', async ({ page }) => {
    await login(page);
    await gotoLiterature(page);

    // 通过 mock 测试钩子播种 10,000 条压测条目（非契约端点，仅 dev/test）
    const seeded = await page.evaluate(async () => {
      const res = await fetch('/api/research/v1/dev/seed-stress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: 10_000 }),
      });
      return res.status;
    });
    expect(seeded).toBe(200);

    // 库内检索命中压测条目
    await page.getByLabel('库内检索').fill('压测条目');
    await page.keyboard.press('Enter');
    await expect(page.getByText(/压测条目/).first()).toBeVisible({ timeout: 15_000 });

    // 虚拟化生效：万级匹配下 DOM 渲染行数远小于数据总量
    await page.waitForTimeout(500);
    const rowCount = await page.locator('[aria-label="条目列表"] .virtual-row').count();
    expect(rowCount).toBeGreaterThan(0);
    expect(rowCount).toBeLessThan(200);
  });
});

test.describe('三视口截图（TC-X02-06）', () => {
  const shots: Array<{ name: string; run: (page: Page) => Promise<void> }> = [
    {
      name: 'literature',
      run: async (page) => {
        await login(page);
        await gotoLiterature(page);
        await expect(page.getByRole('button', { name: '检索文献' })).toBeVisible();
      },
    },
    {
      name: 'reading',
      run: async (page) => {
        await login(page);
        await page.goto('/research/literature/item-001/reading');
        await expect(page.locator('[aria-label="PDF 阅读区"] canvas').first()).toBeVisible({ timeout: 20_000 });
        await expect(page.locator('.textLayer span').first()).toBeVisible();
      },
    },
    {
      name: 'import-dialog',
      run: async (page) => {
        await login(page);
        await gotoLiterature(page);
        await page.getByRole('button', { name: '导入文献' }).click();
        await expect(page.getByRole('dialog', { name: '批量导入文献' })).toBeVisible();
        await expect(page.getByText(/拖入 PDF 文件/)).toBeVisible();
      },
    },
  ];

  for (const shot of shots) {
    test(`F2-截图 ${shot.name}`, async ({ page }, testInfo) => {
      await shot.run(page);
      await page.waitForTimeout(300); // 骨架屏退出/过渡完成
      await page.screenshot({ path: `${OUT_DIR}/f2-${shot.name}-${testInfo.project.name}.png`, fullPage: true });
    });
  }
});
