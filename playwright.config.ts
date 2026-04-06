import "dotenv/config";
import { defineConfig, devices } from "@playwright/test";

/** So Playwright-spawned `next dev` inherits a valid secret when .env is absent (local E2E only). */
if (!process.env.AUTH_SECRET?.trim()) {
  process.env.AUTH_SECRET = "playwright-e2e-auth-secret-minimum-32-chars";
}

/**
 * DB URL for the dev server Playwright starts. `.env` may point at a remote host; override with
 * `E2E_DATABASE_URL` or use the default local Docker Compose URL from `docker-compose.yml`.
 */
/** Prefer explicit E2E URL; else same DB as migrate/seed (`DATABASE_URL`); finally local Docker default. */
const playwrightDatabaseUrl =
  process.env.E2E_DATABASE_URL?.trim() ||
  process.env.DATABASE_URL?.trim() ||
  "postgresql://postgres:postgres@127.0.0.1:5432/ai_training_portal";

/** Force localhost for the spawned dev server so Auth.js client calls match (ignore remote AUTH_URL in `.env`). */
const localAppOrigin = "http://127.0.0.1:3000";

const webServerEnv = {
  ...process.env,
  DATABASE_URL: playwrightDatabaseUrl,
  AUTH_SECRET: process.env.AUTH_SECRET ?? "playwright-e2e-auth-secret-minimum-32-chars",
  AUTH_URL: localAppOrigin,
  APP_BASE_URL: localAppOrigin,
  NEXTAUTH_URL: localAppOrigin,
};

/** Set `PLAYWRIGHT_SKIP_WEB_SERVER=1` when the app is already running (e.g. manual debugging). */
const skipWebServer = process.env.PLAYWRIGHT_SKIP_WEB_SERVER === "1";

export default defineConfig({
  globalSetup: "./e2e/global-setup.ts",
  testDir: "./e2e",
  /** CI runs multiple specs that share seeded learner auth; one worker avoids session races on /login. */
  fullyParallel: !process.env.CI,
  workers: process.env.CI ? 1 : undefined,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  ...(skipWebServer
    ? {}
    : {
        webServer: {
          command: "npm run dev",
          url: "http://127.0.0.1:3000",
          reuseExistingServer: !process.env.CI,
          timeout: process.env.CI ? 240_000 : 120_000,
          env: webServerEnv,
        },
      }),
});
