import { defineConfig, devices } from '@playwright/test'

const mockMode = process.env.E2E_MOCK !== '0'
const port = Number(process.env.PW_PORT || 5176)

export default defineConfig({
  testDir: './e2e',
  timeout: 45_000,
  retries: 0,
  reporter: [['list', { printSteps: true }]],
  use: {
    baseURL: `http://localhost:${port}`,
    trace: 'on-first-retry',
  },
  webServer: mockMode
    ? {
        command: `cross-env VITE_USE_MOCK=1 VITE_MOCK_ROLE=teacher vite --port ${port} --strictPort`,
        url: `http://localhost:${port}`,
        reuseExistingServer: false,
        timeout: 60_000,
      }
    : undefined,
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
