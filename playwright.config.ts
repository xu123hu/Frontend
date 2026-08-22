import { defineConfig, devices } from '@playwright/test'

const mockMode = process.env.E2E_MOCK !== '0'
const rawPort = process.env.E2E_PORT ?? '5176'
const e2ePort = Number(rawPort)

if (!/^\d+$/.test(rawPort) || !Number.isInteger(e2ePort) || e2ePort < 1 || e2ePort > 65_535) {
  throw new Error(`E2E_PORT must be an integer between 1 and 65535; received "${rawPort}"`)
}

const baseURL = `http://localhost:${e2ePort}`

export default defineConfig({
  testDir: './e2e',
  timeout: 45_000,
  retries: 0,
  reporter: [['list', { printSteps: true }]],
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  webServer: mockMode
    ? {
        command: `cross-env VITE_USE_MOCK=1 VITE_MOCK_ROLE=teacher vite --port ${e2ePort} --strictPort`,
        url: baseURL,
        reuseExistingServer: false,
        timeout: 60_000,
      }
    : undefined,
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
