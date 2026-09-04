import { mkdirSync } from 'node:fs';
import { test, expect, type Page } from '@playwright/test';

const OUT_DIR = 'artifacts/acceptance/f5';

/**
 * F5 断网体验 E2E（06 §2「网络：正常、慢速、一次短暂断网三种条件」+ 08 §6 防静默降级）。
 *
 * 断网模拟机制（F5 实证记录）：MSW(browser worker) 在页面上下文拦截请求，真实网络层断网
 * （context.setOffline / page.route.abort / CDP emulateNetworkConditions 三种均实测被 SW
 * 屏蔽，请求仍返回 200；page.route.continue 注入 header 同样到不了 SW）。因此采用
 * `window.fetch` 层拦截（addInitScript 安装，位于页面 JS 上下文、SW 之上，sessionStorage 开关
 * 跨 reload 生效）：开启后 fetch 以 TypeError 真实 reject → api client kind='network' 降级路径。
 * 此方法不伪造成功，是对"一次短暂断网"的最直接模拟。
 *
 * 场景 A（TC-F05-01/02 冷断网·刷新）：短暂断网时刷新 → 不白屏、登录页显式离线提示（role=alert）、
 * 不假登录成功 → 恢复后重登数据回来。
 * 场景 B（TC-F05-03 页内断网）：断网时触发首页真实 refetch（dev 钩子 window.__queryClient）→
 * 面板显示 Boundary「网络连接不可用」+ 重试、不渲染假数据 → 恢复后重试拉回真实数据。
 */

const DEMO_PHONE = '13800000001';
const DEMO_OTP = '888888';

test.beforeAll(() => {
  mkdirSync(OUT_DIR, { recursive: true });
});

/** 安装断网模拟补丁：每次导航前运行（addInitScript），读 sessionStorage 开关。 */
async function installOfflinePatch(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const w = window as unknown as { fetch: typeof fetch };
    const orig = w.fetch.bind(window);
    w.fetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      if (sessionStorage.getItem('__offline') === '1') {
        return Promise.reject(new TypeError('Failed to fetch (simulated offline)'));
      }
      return orig(input, init);
    };
  });
}

/** 开启断网：后续（含 reload 后）fetch 一律 TypeError reject。 */
async function enableOffline(page: Page): Promise<void> {
  await page.evaluate(() => sessionStorage.setItem('__offline', '1'));
}

/** 恢复网络：fetch 恢复正常。 */
async function disableOffline(page: Page): Promise<void> {
  await page.evaluate(() => sessionStorage.removeItem('__offline'));
}

async function login(page: Page): Promise<void> {
  await page.goto('/research/login');
  await page.getByLabel('手机号').fill(DEMO_PHONE);
  await page.getByRole('button', { name: '获取验证码' }).click();
  await page.waitForResponse((r) => r.url().includes('/auth/session/otp') && r.request().method() === 'POST');
  await page.getByLabel('验证码').fill(DEMO_OTP);
  await page.getByRole('button', { name: '登录', exact: true }).click();
  await expect(page).toHaveURL(/\/research\/home/);
  await expect(page.getByRole('heading', { name: '科研首页' })).toBeVisible();
}

test.describe('断网降级（TC-F05-01..03）', () => {
  test('TC-F05-01/02 冷断网：刷新不白屏、登录页显式离线提示、不假登录成功', async ({ page }) => {
    await installOfflinePatch(page);
    await login(page);

    // 开启断网 → 刷新（黄金链路一 1.8 刷新步骤在断网条件下）
    await enableOffline(page);
    await page.reload();

    // 不白屏：登录页渲染（探测降级 → 明确离线提示，role=alert）
    await expect(page.getByRole('heading', { name: /智学数研/ })).toBeVisible();
    await expect(
      page.getByRole('alert').getByText(/网络连接不可用或服务暂时无法访问/),
    ).toBeVisible();
    // 不假登录成功：没有任何首页数据、无「科研首页」标题
    await expect(page.getByRole('heading', { name: '科研首页' })).toHaveCount(0);

    // 恢复网络 → 重新登录 → 首页真实数据回来
    await disableOffline(page);
    await page.getByLabel('手机号').fill(DEMO_PHONE);
    await page.getByRole('button', { name: '获取验证码' }).click();
    await page.waitForResponse((r) => r.url().includes('/auth/session/otp') && r.request().method() === 'POST');
    await page.getByLabel('验证码').fill(DEMO_OTP);
    await page.getByRole('button', { name: '登录', exact: true }).click();
    await expect(page).toHaveURL(/\/research\/home/);
    await expect(page.getByRole('region', { name: '最近项目' }).getByText('高中数学建模训练论文')).toBeVisible();
  });

  test('TC-F05-03 页内断网：面板降级不假成功；恢复后重试拉回真实数据', async ({ page }) => {
    test.setTimeout(60_000); // query 重试退避（默认 2 次 × 指数回退）叠加拉长耗时
    await installOfflinePatch(page);
    await login(page);
    const recent = page.getByRole('region', { name: '最近项目' });
    await expect(recent.getByText('高中数学建模训练论文')).toBeVisible();

    // 开启断网 → 触发首页真实 refetch（dev 钩子：resetQueries 清缓存并立即重拉；
    // 断网下无缓存 → 面板走 kind='network' 错误 → Boundary，而非继续显示旧数据）
    await enableOffline(page);
    await page.evaluate(() =>
      (window as unknown as { __queryClient?: { resetQueries: () => Promise<void> } }).__queryClient?.resetQueries(),
    );

    // 面板降级：Boundary「网络连接不可用」+ 应用壳不白屏
    await expect(page.getByRole('heading', { name: '科研首页' })).toBeVisible();
    await expect(recent.getByText(/网络连接不可用/)).toBeVisible();
    // 不假成功：不渲染任何项目卡片
    await expect(recent.locator('li')).toHaveCount(0);
    await expect(page.getByRole('region', { name: '正在运行任务' }).getByText(/网络连接不可用/)).toBeVisible();
    // 降级态截图（TC-X05-01）
    await page.screenshot({ path: `${OUT_DIR}/f5-offline-degraded-${test.info().project.name}.png`, fullPage: true });

    // 恢复网络 → 点击「最近项目」面板的真实「重试」按钮 → 该面板数据回来、错误消失
    await disableOffline(page);
    await recent.getByRole('button', { name: '重试' }).click();
    await expect(recent.getByText('高中数学建模训练论文')).toBeVisible();
    await expect(recent.getByText(/网络连接不可用/)).toHaveCount(0);
  });
});
