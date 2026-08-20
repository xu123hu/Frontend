import { defineConfig, devices } from '@playwright/test'

const mockMode = process.env.E2E_MOCK !== '0'

export default defineConfig({
  testDir: './e2e',
  timeout: 45_000,
  retries: 0,
  reporter: [['list', { printSteps: true }]],
  use: {
    baseURL: 'http://localhost:5176',
    trace: 'on-first-retry',
  },
  webServer: mockMode
    ? {
        command: 'cross-env VITE_USE_MOCK=1 VITE_MOCK_ROLE=teacher vite --port 5176 --strictPort',
        url: 'http://localhost:5176',
        reuseExistingServer: false,
        timeout: 60_000,
      }
    : undefined,
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})