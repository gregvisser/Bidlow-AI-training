import { test, expect } from "@playwright/test";

let databaseUp = false;

test.beforeAll(async ({ request }) => {
  const res = await request.get("/api/ready");
  databaseUp = res.ok();
});

test.describe("Phase 1I completion analytics", () => {
  test("learner dashboard and reports show completion rollup and funnel insight", async ({ page }) => {
    test.skip(!databaseUp, "PostgreSQL required — migrate + seed and DATABASE_URL.");
    test.setTimeout(120_000);

    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await page.getByLabel(/^email$/i).fill("learner@aitraining.local");
    await page.getByLabel(/^password$/i).fill("Learner123!");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/portal/, { timeout: 90_000 });

    await page.goto("/portal", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { level: 1, name: /dashboard/i })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByTestId("learner-course-completion-summary")).toBeVisible();
    await expect(page.getByTestId("learner-estimated-minutes")).toBeVisible();
    await expect(page.getByTestId("learner-continue-learning")).toBeVisible();

    await page.goto("/portal/courses", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { level: 1, name: /courses/i })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByTestId("learner-courses-completion-strip").first()).toBeVisible();

    await page.goto("/portal/reports", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { level: 1, name: /reports/i })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByTestId("learner-reports-completion-snapshot")).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: /completion snapshot/i })).toBeVisible();
    await expect(page.getByTestId("learner-reports-funnel")).toBeVisible();
  });

  test("admin reports show funnel, cohort, stale KPIs, and CSV export", async ({ page }) => {
    test.skip(!databaseUp, "PostgreSQL required — migrate + seed and DATABASE_URL.");
    test.setTimeout(120_000);

    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await page.getByLabel(/^email$/i).fill("admin@aitraining.local");
    await page.getByLabel(/^password$/i).fill("Admin123!");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/portal|\/admin/, { timeout: 90_000 });

    await page.goto("/admin/reports", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { level: 1, name: /reporting/i })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByTestId("admin-certificates-unlocked")).toBeVisible();
    await expect(page.getByTestId("admin-certificates-issued")).toBeVisible();
    await expect(page.getByTestId("admin-top-courses-completions")).toBeVisible();
    await expect(page.getByTestId("admin-reports-export-csv")).toBeVisible();
    await expect(page.getByTestId("admin-overall-enrollment-finish-rate")).toBeVisible();
    await expect(page.getByTestId("admin-funnel-overview")).toBeVisible();
    await expect(page.getByTestId("admin-cert-pipeline")).toBeVisible();
    await expect(page.getByTestId("admin-cohort-30d")).toBeVisible();
    await expect(page.getByTestId("admin-stale-in-progress")).toBeVisible();

    const exportRes = await page.request.get("/api/admin/reports/export");
    expect(exportRes.status()).toBe(200);
    expect(exportRes.headers()["content-type"] ?? "").toContain("text/csv");
    const body = await exportRes.text();
    expect(body).toContain("course_title");
    expect(body).toContain("certificates_unlocked");
    expect(body).toContain("enrollment_finish_rate_pct");
    expect(body).toContain("overall_enrollment_finish_rate_pct");
    expect(body).toContain("funnel_enrolled");
    expect(body).toContain("stale_in_progress_enrollments");
    expect(body).toContain("avg_days_to_complete");
  });
});
