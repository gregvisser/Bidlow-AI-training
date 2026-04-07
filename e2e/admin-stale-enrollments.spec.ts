import { test, expect } from "@playwright/test";

let databaseUp = false;

test.beforeAll(async ({ request }) => {
  const res = await request.get("/api/ready");
  databaseUp = res.ok();
});

test.describe("Phase 1L stale enrollments", () => {
  test("admin stale seats page and CSV export", async ({ page }) => {
    test.skip(!databaseUp, "PostgreSQL required — migrate + seed and DATABASE_URL.");
    test.setTimeout(120_000);

    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await page.getByLabel(/^email$/i).fill("admin@aitraining.local");
    await page.getByLabel(/^password$/i).fill("Admin123!");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/portal|\/admin/, { timeout: 90_000 });

    await page.goto("/admin/stale-enrollments", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { level: 1, name: /stale enrollments/i })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByTestId("admin-stale-enrollments-table")).toBeVisible();
    await expect(page.getByTestId("admin-stale-enrollments-export-csv")).toBeVisible();
    await expect(page.getByTestId("admin-stale-seat-nudge-audit")).toBeVisible();

    const exportRes = await page.request.get("/api/admin/stale-enrollments/export");
    expect(exportRes.status()).toBe(200);
    expect(exportRes.headers()["content-type"] ?? "").toContain("text/csv");
    const body = await exportRes.text();
    expect(body).toContain("enrollment_id");
    expect(body).toContain("learner_email");
    expect(body).toContain("days_since_last_activity");
    expect(body).toContain("stale_rule_days");
  });

  test("admin can prepare a nudge and it logs an audit row", async ({ page }) => {
    test.skip(!databaseUp, "PostgreSQL required — migrate + seed and DATABASE_URL.");
    test.setTimeout(120_000);

    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await page.getByLabel(/^email$/i).fill("admin@aitraining.local");
    await page.getByLabel(/^password$/i).fill("Admin123!");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/portal|\/admin/, { timeout: 90_000 });

    await page.goto("/admin/stale-enrollments", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("admin-stale-enrollments-table")).toBeVisible();

    await page.getByTestId("admin-stale-seat-nudge").first().click();
    await expect(page.getByTestId("admin-stale-seat-nudge-mailto").first()).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByTestId("admin-stale-seat-nudge-audit")).toBeVisible();
  });

  test("reports page links to stale seats", async ({ page }) => {
    test.skip(!databaseUp, "PostgreSQL required — migrate + seed and DATABASE_URL.");
    test.setTimeout(120_000);

    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await page.getByLabel(/^email$/i).fill("admin@aitraining.local");
    await page.getByLabel(/^password$/i).fill("Admin123!");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/portal|\/admin/, { timeout: 90_000 });

    await page.goto("/admin/reports", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("admin-reports-link-stale-seats")).toBeVisible({ timeout: 20_000 });
    await page.getByTestId("admin-reports-link-stale-seats").click();
    await expect(page).toHaveURL(/\/admin\/stale-enrollments/, { timeout: 15_000 });
  });
});
