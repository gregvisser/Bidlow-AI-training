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
    await expect(page.getByTestId("admin-stale-enrollments-table").first()).toBeVisible();
    await expect(page.getByTestId("admin-stale-enrollments-export-csv").first()).toBeVisible();
    await expect(page.getByTestId("admin-stale-seat-nudge-audit").first()).toBeVisible();

    const exportRes = await page.request.get("/api/admin/stale-enrollments/export");
    expect(exportRes.status()).toBe(200);
    expect(exportRes.headers()["content-type"] ?? "").toContain("text/csv");
    const body = await exportRes.text();
    expect(body).toContain("enrollment_id");
    expect(body).toContain("learner_email");
    expect(body).toContain("days_since_last_activity");
    expect(body).toContain("stale_rule_days");

    await expect(page.getByTestId("admin-stale-seat-nudge-audit-export-csv").first()).toBeVisible();
    const auditExportRes = await page.request.get("/api/admin/stale-enrollments/nudge-audit/export");
    expect(auditExportRes.status()).toBe(200);
    expect(auditExportRes.headers()["content-type"] ?? "").toContain("text/csv");
    const auditCsv = await auditExportRes.text();
    expect(auditCsv).toContain("audit_id");
    expect(auditCsv).toContain("intent_created_at_utc");
    expect(auditCsv).toContain("template_version");
  });

  test("admin can prepare a nudge, sees cooldown, records outcome, and audit filters work", async ({
    page,
  }) => {
    test.skip(!databaseUp, "PostgreSQL required — migrate + seed and DATABASE_URL.");
    test.setTimeout(120_000);

    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await page.getByLabel(/^email$/i).fill("admin@aitraining.local");
    await page.getByLabel(/^password$/i).fill("Admin123!");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/portal|\/admin/, { timeout: 90_000 });

    await page.goto("/admin/stale-enrollments", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("admin-stale-enrollments-table").first()).toBeVisible();

    const auditPanel = page.getByTestId("admin-stale-seat-nudge-audit").first();
    await expect(auditPanel).toBeVisible();

    const prepareBtn = page.getByTestId("admin-stale-seat-nudge").first();
    await expect(prepareBtn).toBeVisible();

    if (!(await prepareBtn.isDisabled())) {
      await prepareBtn.click();
      await expect(page.getByTestId("admin-stale-seat-nudge-mailto").first()).toBeVisible({
        timeout: 20_000,
      });
    }

    await expect(page.getByTestId("admin-stale-seat-nudge-cooldown").first()).toBeVisible({
      timeout: 20_000,
    });

    const outcomeSelect = auditPanel.getByTestId("admin-stale-seat-nudge-outcome-select").first();
    if (await outcomeSelect.isVisible().catch(() => false)) {
      await outcomeSelect.selectOption("sent");
      await auditPanel.getByTestId("admin-stale-seat-nudge-outcome-save").first().click();
    }
    await expect(auditPanel.getByTestId("admin-stale-seat-nudge-outcome-cell").first()).toHaveText(/sent/i, {
      timeout: 20_000,
    });

    await page.goto("/admin/stale-enrollments?status=pending", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("admin-stale-seat-nudge-audit").first().locator("form")).toBeVisible({
      timeout: 20_000,
    });
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
