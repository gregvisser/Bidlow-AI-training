import { test, expect } from "@playwright/test";

let databaseUp = false;

test.beforeAll(async ({ request }) => {
  const res = await request.get("/api/ready");
  databaseUp = res.ok();
});

test.describe("Staging / ops verification", () => {
  test("admin ops env API returns 401 without session", async ({ request }) => {
    const res = await request.get("/api/admin/ops/env");
    expect(res.status()).toBe(401);
  });

  test("health and ready endpoints respond", async ({ request }) => {
    const health = await request.get("/api/health");
    expect(health.ok()).toBeTruthy();
    const ready = await request.get("/api/ready");
    expect([200, 503]).toContain(ready.status());
  });

  test("admin ops page renders for staff when database is up", async ({ page }) => {
    test.skip(!databaseUp, "PostgreSQL required — migrate + seed and DATABASE_URL.");
    await page.goto("/login");
    await page.getByLabel(/^email$/i).fill("admin@aitraining.local");
    await page.getByLabel(/^password$/i).fill("Admin123!");
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL(/\/portal/);
    await page.goto("/admin/ops");
    await expect(page.getByRole("heading", { name: /operator diagnostics/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /environment readiness/i })).toBeVisible();
  });

  test("purchase entry UI exists on pricing when signed out", async ({ page }) => {
    test.skip(!databaseUp, "PostgreSQL required for pricing page.");
    await page.goto("/pricing");
    await expect(page.getByRole("heading", { name: /plans/i })).toBeVisible();
  });
});
