import "dotenv/config";
import { defineConfig, devices } from "@playwright/test";

/** So Playwright-spawned `next dev` inherits a valid secret when .env is absent (local E2E only). */
if (!process.env.AUTH_SECRET?.trim()) {
  process.env.AUTH_SECRET = "playwright-e2e-auth-secret-minimum-32-chars";
}

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  ...(process.env.CI
    ? {}
    : {
        webServer: {
          command: "npm run dev",
          url: "http://127.0.0.1:3000",
          reuseExistingServer: true,
          timeout: 120_000,
        },
      }),
});
