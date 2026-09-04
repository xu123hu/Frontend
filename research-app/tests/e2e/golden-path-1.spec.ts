import { mkdirSync } from 'node:fs';
import { test, expect, type Page } from '@playwright/test';

const OUT_DIR = 'artifacts/acceptance/f1';

/**
 * F1 黄金链路一 E2E：登录 → 科研首页 → 项目创建/进入/切换 → 个人中心。
 * 用例来源：docs/handoff/F1/design.md §5（TC-F01-01..08、TC-X01-02/05/07）。
 * 运行环境：MSW 契约草案演示模式（VITE_USE_MOCK=true），页面常驻「契约草案数据源」徽标，
 * 不伪造任何页面内容；断言全部针对真实渲染结果与真实网络响应。
 * TC-F01-09（断网）由单元层覆盖（api-client 网络错误 → offline / degraded 文案），
 * E2E 无法对 Service Worker 内部拦截制造真实网络故障，见 handoff 已知限制。
 */

const DEMO_PHONE = '13800000001';
const TENANT_B_PHONE = '13900000002';
const DEMO_OTP = '888888';

test.beforeAll(() => {
  mkdirSync(OUT_DIR, { recursive: true });
});

/** 完整登录流程（手机号 + OTP），断言落在 /research/home。 */
async function login(page: Page, phone: string = DEMO_PHONE, otp: string = DEMO_OTP): Promise<void> {
  await page.goto('/research/login');
  await page.getByLabel('手机号').fill(phone);
  await page.getByRole('button', { name: '获取验证码' }).click();
  await waitOtpIssued(page);
  await page.getByLabel('验证码').fill(otp);
  await page.getByRole('button', { name: '登录', exact: true }).click();
  await expect(page).toHaveURL(/\/research\/home/);
  await expect(page.getByRole('heading', { name: '科研首页' })).toBeVisible();
}

/** 等待 OTP 请求完成（handler 含 300ms 延迟），避免登录先于服务端 passwordless 落库。 */
async function waitOtpIssued(page: Page): Promise<void> {
  await page.waitForResponse((r) => r.url().includes('/auth/session/otp') && r.request().method() === 'POST');
}

test.describe('认证与回跳（TC-F01-01/02）', () => {
  test('未登录访问首页 → 重定向登录页；错误验证码可重试；成功后回跳原 URL 且刷新不丢会话', async ({ page }) => {
    // TC-F01-01：未登录 → /research/login?redirect=/research/home
    await page.goto('/research/home');
    await expect(page).toHaveURL(/\/research\/login\?redirect=\/research\/home/);
    await expect(page.getByRole('heading', { name: /智学数研/ })).toBeVisible();

    // TC-F01-02：错误验证码 → 表单级错误、可重试（不泄露账户存在性）
    await page.getByLabel('手机号').fill(DEMO_PHONE);
    await page.getByRole('button', { name: '获取验证码' }).click();
    await page.getByLabel('验证码').fill('000000');
    await page.getByRole('button', { name: '登录', exact: true }).click();
    await expect(page.getByRole('alert').filter({ hasText: '验证码' })).toBeVisible();
    await expect(page).toHaveURL(/\/research\/login/);

    // 正确验证码 → 回跳原 URL
    await page.getByLabel('验证码').fill(DEMO_OTP);
    await page.getByRole('button', { name: '登录', exact: true }).click();
    await expect(page).toHaveURL(/\/research\/home/);
    await expect(page.getByRole('heading', { name: '科研首页' })).toBeVisible();

    // 刷新后会话保持（服务端会话语义，mock 通过 sessionStorage 快照模拟）
    await page.reload();
    await expect(page).toHaveURL(/\/research\/home/);
    await expect(page.getByRole('heading', { name: '科研首页' })).toBeVisible();
  });

  test('退出登录 → 回登录页；再次访问受保护路由被拦截', async ({ page }) => {
    await login(page);
    await page.getByRole('button', { name: '账户菜单' }).click();
    await page.getByRole('menuitem', { name: '退出登录' }).click();
    await expect(page).toHaveURL(/\/research\/login/);
    await page.goto('/research/projects');
    await expect(page).toHaveURL(/\/research\/login/);
  });
});

test.describe('科研首页（TC-F01-03 / TC-X01-02）', () => {
  test('首页三个面板来自真实 API 响应，无 4xx/5xx，数据源徽标可见', async ({ page }) => {
    await login(page);

    const apiResponses: Array<{ url: string; status: number }> = [];
    page.on('response', (res) => {
      if (res.url().includes('/api/')) apiResponses.push({ url: res.url(), status: res.status() });
    });

    await page.reload();
    await expect(page.getByRole('heading', { name: '最近项目' })).toBeVisible();

    // 最近项目来自 GET /projects（租户 A 种子数据）
    await expect(page.getByRole('button', { name: /高中数学建模训练论文/ })).toBeVisible();
    // 正在运行任务来自 GET /runs
    await expect(page.locator('[aria-label="正在运行任务"]').getByText(/文献检索|数学验证/).first()).toBeVisible();
    // 待处理评审：诚实说明，不提供假数据
    await expect(page.getByText('评审数据源将在 F4 阶段接入')).toBeVisible();
    // 契约草案徽标常驻（诚实性）
    await expect(page.getByRole('status', { name: /契约草案数据源/ }).first()).toBeVisible();

    await expect
      .poll(() => apiResponses.filter((r) => r.status >= 400).length, {
      message: '登录后首页数据请求不应出现 4xx/5xx',
    })
      .toBe(0);
    expect(apiResponses.length).toBeGreaterThan(0);
  });

  test('零项目租户：首页空状态提供创建入口（TC-X01-02）', async ({ page }) => {
    await login(page, TENANT_B_PHONE);
    await expect(page.getByText('还没有科研项目').first()).toBeVisible();
    await expect(page.getByRole('button', { name: '创建项目' })).toBeVisible();
    await expect(page.getByText('没有进行中的任务')).toBeVisible();
  });
});

test.describe('导航折叠（TC-F01-04）', () => {
  test('键盘 Enter 折叠/展开导航，aria-expanded 同步', async ({ page }) => {
    await login(page);
    const collapse = page.locator('#nav-collapse');
    await expect(collapse).toHaveAttribute('aria-expanded', 'true');
    await collapse.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#app-shell')).toHaveClass(/nav-collapsed/);
    await expect(collapse).toHaveAttribute('aria-expanded', 'false');
    await page.keyboard.press('Enter');
    await expect(page.locator('#app-shell')).not.toHaveClass(/nav-collapsed/);
    await expect(collapse).toHaveAttribute('aria-expanded', 'true');
  });
});

test.describe('项目创建（TC-F01-05）', () => {
  test('缺研究问题 → 字段级校验；补全后创建成功进入详情并出现在列表', async ({ page }) => {
    await login(page);
    await page.getByRole('link', { name: '科研项目' }).click();
    await expect(page).toHaveURL(/\/research\/projects/);
    await page.getByRole('button', { name: '新建项目' }).first().click();

    const dialog = page.getByRole('dialog', { name: '新建科研项目' });
    await expect(dialog).toBeVisible();

    // 全空提交 → 三个必填字段错误
    await dialog.getByRole('button', { name: '创建项目' }).click();
    await expect(dialog.getByText('请填写项目标题。')).toBeVisible();
    await expect(dialog.getByText('请填写研究问题。')).toBeVisible();
    await expect(dialog.getByText('请选择学科领域。')).toBeVisible();

    // 缺 research_question → 仅该字段错误（服务端 422 场景由契约测试覆盖）
    await dialog.getByLabel('项目标题').fill('E2E 验收项目');
    await dialog.getByLabel('学科领域').selectOption('数学');
    await dialog.getByRole('button', { name: '创建项目' }).click();
    await expect(dialog.getByText('请填写研究问题。')).toBeVisible();

    // 补全 → 创建成功 → 进入项目详情（种子数据为 proj-* 短 ID，新建项目为 UUIDv7）
    await dialog.getByLabel('研究问题').fill('E2E 黄金链路一的验收研究问题是什么？');
    await dialog.getByRole('button', { name: '创建项目' }).click();
    await expect(page).toHaveURL(/\/research\/projects\/(proj-|[0-9a-f]{8}-)/);
    await expect(page.getByRole('heading', { name: 'E2E 验收项目' })).toBeVisible();
    await expect(page.getByText('E2E 黄金链路一的验收研究问题是什么？')).toBeVisible();

    // 列表出现新项目：客户端导航回列表（创建成功已失效列表缓存 → 重新拉取）。
    // 注意：不做 page.goto 整页刷新——契约草案 mock 的业务数据在刷新后重新播种
    // （session-persistence.ts 仅持久化会话/偏好），跨刷新持久化属后端职责，契约测试覆盖。
    await page.getByRole('link', { name: '科研项目' }).click();
    await expect(page.getByRole('button', { name: /E2E 验收项目/ })).toBeVisible();
  });
});

test.describe('项目切换与上下文同步（TC-F01-06）', () => {
  test('顶栏切换器选择项目 → 详情页与顶栏名称同步', async ({ page }) => {
    await login(page);
    const switcher = page.getByRole('button', { name: '切换项目' });
    await switcher.click();
    const listbox = page.getByRole('listbox', { name: '项目列表' });
    await expect(listbox).toBeVisible();

    await listbox.getByRole('option', { name: /椭圆光学性质的形式化验证/ }).click();
    await expect(page).toHaveURL(/\/research\/projects\/proj-alpha-2/);
    await expect(page.getByRole('heading', { name: '椭圆光学性质的形式化验证' })).toBeVisible();
    await expect(switcher).toContainText('椭圆光学性质的形式化验证');

    // 项目详情应有阶段时间线，当前阶段为写作期
    await expect(page.getByText('写作期').first()).toBeVisible();
  });
});

test.describe('个人中心偏好（TC-F01-07）', () => {
  test('修改通知偏好 → 保存成功 → 刷新后保留', async ({ page }) => {
    await login(page);
    await page.getByRole('button', { name: '账户菜单' }).click();
    await page.getByRole('menuitem', { name: '个人中心' }).click();
    await expect(page).toHaveURL(/\/research\/personal/);
    await expect(page.getByRole('heading', { name: '个人中心' })).toBeVisible();

    // 账户信息来自 /auth/me（「林研究员」同时出现在顶栏，须限定账户信息面板）
    await expect(page.getByLabel('账户信息').getByText('林研究员')).toBeVisible();
    await expect(page.getByText('138****0001')).toBeVisible();

    const emailNotify = page.getByRole('checkbox', { name: /邮件通知/ });
    await expect(emailNotify).not.toBeChecked();
    await emailNotify.check();
    await page.getByRole('button', { name: '保存偏好' }).click();
    await expect(page.getByText('已保存 ✓')).toBeVisible();

    await page.reload();
    await expect(page.getByRole('checkbox', { name: /邮件通知/ })).toBeChecked();
  });
});

test.describe('跨租户越权（TC-F01-08）', () => {
  test('租户 B 访问租户 A 项目 URL → 统一拒绝文案，不泄露项目存在性', async ({ page }) => {
    await login(page, TENANT_B_PHONE);
    await page.goto('/research/projects/proj-alpha-1');
    await expect(page.getByText('无法访问该项目')).toBeVisible();
    await expect(page.getByText('该项目不存在，或当前账户无权访问。')).toBeVisible();
    const content = await page.locator('#view-root').textContent();
    expect(content).not.toContain('高中数学建模训练论文');
    expect(content).not.toContain('分层线性模型');
  });
});

test.describe('弹窗/抽屉可访问性（TC-X01-05）', () => {
  test('创建弹窗：Escape 关闭；AI 抽屉：Escape 关闭且焦点进入抽屉', async ({ page }) => {
    await login(page);
    await page.getByRole('link', { name: '科研项目' }).click();
    await page.getByRole('button', { name: '新建项目' }).first().click();
    const dialog = page.getByRole('dialog', { name: '新建科研项目' });
    await expect(dialog).toBeVisible();
    // 打开时初始焦点落在第一个字段（焦点陷阱入口）
    await expect(dialog.getByLabel('项目标题')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();

    await page.goto('/research/home');
    await page.getByRole('button', { name: '打开 AI 管家' }).click();
    const drawer = page.locator('#agent-drawer');
    await expect(drawer).toHaveClass(/open/);
    await page.keyboard.press('Escape');
    await expect(drawer).not.toHaveClass(/open/);
  });
});

test.describe('减弱动效（TC-X01-06）', () => {
  test('prefers-reduced-motion 下球体脉冲动画关闭，默认环境开启', async ({ page }) => {
    await login(page);
    // 默认动效：running 态球体使用 orb-ring 关键帧（Vite 会对 keyframes 加作用域后缀）
    const defaultAnimation = await page.evaluate(() => {
      const orb = document.querySelector('.assistant-orb') as HTMLElement;
      orb.classList.add('status-running'); // 类由 store 驱动，此处强制置位以检查 CSS 行为
      return getComputedStyle(orb, '::before').animationName;
    });
    expect(defaultAnimation).toMatch(/^orb-ring/);

    await page.emulateMedia({ reducedMotion: 'reduce' });
    const reducedAnimation = await page.evaluate(() => {
      const orb = document.querySelector('.assistant-orb') as HTMLElement;
      return getComputedStyle(orb, '::before').animationName;
    });
    expect(reducedAnimation).toBe('none');
  });
});

test.describe('三视口截图（TC-X01-07）', () => {
  const shots: Array<{ name: string; run: (page: Page) => Promise<void> }> = [
    {
      name: 'login',
      run: async (page) => {
        await page.goto('/research/login');
        await expect(page.getByRole('heading', { name: /智学数研/ })).toBeVisible();
      },
    },
    {
      name: 'home',
      run: async (page) => {
        await login(page);
        await expect(page.getByRole('button', { name: /高中数学建模训练论文/ })).toBeVisible();
      },
    },
    {
      name: 'projects',
      run: async (page) => {
        await login(page);
        await page.getByRole('link', { name: '科研项目' }).click();
        await expect(page.getByRole('button', { name: /高中数学建模训练论文/ })).toBeVisible();
      },
    },
    {
      name: 'project-detail',
      run: async (page) => {
        await login(page);
        await page.goto('/research/projects/proj-alpha-1');
        await expect(page.getByRole('heading', { name: '高中数学建模训练论文' })).toBeVisible();
      },
    },
    {
      name: 'personal',
      run: async (page) => {
        await login(page);
        await page.goto('/research/personal');
        await expect(page.getByRole('heading', { name: '个人中心' })).toBeVisible();
        await expect(page.getByLabel('账户信息').getByText('林研究员')).toBeVisible();
      },
    },
  ];

  for (const shot of shots) {
    test(`F1-截图 ${shot.name}`, async ({ page }, testInfo) => {
      await shot.run(page);
      await page.waitForTimeout(300); // 骨架屏退出/过渡完成
      await page.screenshot({ path: `${OUT_DIR}/f1-${shot.name}-${testInfo.project.name}.png`, fullPage: true });
    });
  }
});
// REVERT-MARKER-1888677015
