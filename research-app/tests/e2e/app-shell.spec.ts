import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const OUT_DIR = 'artifacts/acceptance/f0';

/**
 * F0 视觉对照 spec。
 *
 * 目的：在 1440×900 / 1366×768 / 390×844 三种视口下采集应用壳截图，
 * 与原型 D:\科研端demo\reference-screenshots\baseline-*.png 做人工对照。
 *
 * 严禁在此 spec 中 mock 业务 API 或伪造页面内容。
 */

test.beforeAll(() => {
  mkdirSync(OUT_DIR, { recursive: true });
});

test('F0-视觉 科研首页 1440×900', async ({ page }, testInfo) => {
  await page.goto('/research/home');
  await page.waitForSelector('#app-shell');
  await page.screenshot({
    path: `${OUT_DIR}/f0-home-${testInfo.project.name}.png`,
    fullPage: false,
  });
  await expect(page.locator('#assistant-orb')).toBeVisible();
  await expect(page.locator('#global-nav')).toBeVisible();
  await expect(page.locator('#app-header')).toBeVisible();
});

test('F0-视觉 侧栏折叠', async ({ page }) => {
  await page.goto('/research/home');
  await page.locator('#nav-collapse').click();
  await expect(page.locator('#app-shell')).toHaveClass(/nav-collapsed/);
  await page.screenshot({ path: `${OUT_DIR}/f0-sidebar-collapsed.png` });
});

test('F0-抽屉打开', async ({ page }) => {
  await page.goto('/research/home');
  await page.locator('#assistant-orb').click();
  await expect(page.locator('#agent-drawer')).toHaveClass(/open/);
  await page.screenshot({ path: `${OUT_DIR}/f0-drawer-open.png` });
});

test('F0-六个一级入口路由可达', async ({ page }) => {
  const paths = [
    '/research/home',
    '/research/projects',
    '/research/literature',
    '/research/writing',
    '/research/review',
    '/research/education',
  ];
  for (const p of paths) {
    await page.goto(p);
    await expect(page.locator('#view-root')).toBeVisible();
  }
});

test('F0-死路由 fallback', async ({ page }) => {
  await page.goto('/research/this-route-does-not-exist');
  await expect(page.locator('h1')).toContainText('未找到页面');
});
