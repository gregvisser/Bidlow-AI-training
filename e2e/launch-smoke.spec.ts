import { test, expect } from "@playwright/test";

let databaseUp = false;

test.beforeAll(async ({ request }) => {
  const res = await request.get("/api/ready");
  databaseUp = res.ok();
});

test.describe("Launch smoke", () => {
  test("marketing home loads", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("health endpoint responds", async ({ request }) => {
    const res = await request.get("/api/health");
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as { status?: string };
    expect(body.status).toBe("ok");
  });

  test("ready endpoint responds", async ({ request }) => {
    const res = await request.get("/api/ready");
    expect([200, 503]).toContain(res.status());
  });

  test("pricing page loads", async ({ page }) => {
    test.skip(!databaseUp, "PostgreSQL required — run migrate + seed and ensure DATABASE_URL is reachable.");
    await page.goto("/pricing");
    await expect(page.getByRole("heading", { name: /plans/i })).toBeVisible();
  });

  test("learner login and dashboard", async ({ page }) => {
    test.skip(!databaseUp, "PostgreSQL required — run migrate + seed and ensure DATABASE_URL is reachable.");
    await page.goto("/login");
    await page.getByLabel(/^email$/i).fill("learner@aitraining.local");
    await page.getByLabel(/^password$/i).fill("Learner123!");
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL(/\/portal/);
    await expect(page.getByRole("heading", { name: /^dashboard$/i })).toBeVisible();
  });

  test("learner opens a course", async ({ page }) => {
    test.skip(!databaseUp, "PostgreSQL required — run migrate + seed and ensure DATABASE_URL is reachable.");
    await page.goto("/login");
    await page.getByLabel(/^email$/i).fill("learner@aitraining.local");
    await page.getByLabel(/^password$/i).fill("Learner123!");
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL(/\/portal/);
    await page.goto("/portal/courses/ai-agent-mastery-core");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/AI Agent Mastery/i);
  });

  test("billing page loads when signed in", async ({ page }) => {
    test.skip(!databaseUp, "PostgreSQL required — run migrate + seed and ensure DATABASE_URL is reachable.");
    await page.goto("/login");
    await page.getByLabel(/^email$/i).fill("learner@aitraining.local");
    await page.getByLabel(/^password$/i).fill("Learner123!");
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL(/\/portal/);
    await page.goto("/portal/billing");
    await expect(page.getByRole("heading", { name: /^billing$/i })).toBeVisible();
  });

  test("admin can open course CMS", async ({ page }) => {
    test.skip(!databaseUp, "PostgreSQL required — run migrate + seed and ensure DATABASE_URL is reachable.");
    await page.goto("/login");
    await page.getByLabel(/^email$/i).fill("admin@aitraining.local");
    await page.getByLabel(/^password$/i).fill("Admin123!");
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL(/\/portal/);
    await page.goto("/admin/courses");
    await expect(page.getByRole("heading", { name: /^courses$/i })).toBeVisible();
  });

  test("lesson completion toggles (seeded learner)", async ({ page }) => {
    test.skip(!databaseUp, "PostgreSQL required — run migrate + seed and ensure DATABASE_URL is reachable.");
    await page.goto("/login");
    await page.getByLabel(/^email$/i).fill("learner@aitraining.local");
    await page.getByLabel(/^password$/i).fill("Learner123!");
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL(/\/portal/);
    await page.goto(
      "/portal/courses/ai-agent-mastery-core/modules/week-2/lessons/overview",
    );
    const markComplete = page.getByRole("button", { name: /mark complete/i });
    await markComplete.click();
    await expect(page.getByRole("button", { name: /mark incomplete/i })).toBeVisible({
      timeout: 20_000,
    });
  });
});
