import { execSync } from "node:child_process";

/**
 * Playwright loads this file with a loader that cannot dynamic-import `src/lib/db.ts`.
 * Delegate to `tsx scripts/e2e-global-setup.ts` (same imports as other repo scripts).
 */
export default function globalSetup() {
  execSync("npm run e2e:global-setup", {
    stdio: "inherit",
    cwd: process.cwd(),
    env: process.env,
  });
}
