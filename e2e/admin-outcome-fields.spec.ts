import { test, expect } from "@playwright/test";

let databaseUp = false;

test.beforeAll(async ({ request }) => {
  const res = await request.get("/api/ready");
  databaseUp = res.ok();
});

test.describe("Admin outcome fields (presence)", () => {
  test("path and course edit forms expose outcome controls", async ({ page }) => {
    test.skip(!databaseUp, "PostgreSQL required — migrate + seed and DATABASE_URL for app + Playwright.");
    test.setTimeout(90_000);

    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await page.getByLabel(/^email$/i).fill("admin@aitraining.local");
    await page.getByLabel(/^password$/i).fill("Admin123!");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/portal/, { timeout: 90_000 });

    await page.goto("/admin/paths", { waitUntil: "domcontentloaded" });
    await page.getByRole("link", { name: /^Edit$/i }).first().click();
    await expect(page).toHaveURL(/\/admin\/paths\/[^/]+\/edit/, { timeout: 20_000 });
    await expect(page.getByLabel(/Outcome type/i)).toBeVisible();
    await expect(page.getByLabel(/Outcome summary/i)).toBeVisible();
    await expect(page.getByLabel(/Provider certification mapping/i)).toBeVisible();
    await expect(page.getByLabel(/Provider reference URL/i)).toBeVisible();

    await page.goto("/admin/courses", { waitUntil: "domcontentloaded" });
    await page
      .locator('[class*="rounded-2xl"]')
      .filter({ hasText: "Azure AI Foundations" })
      .getByRole("link", { name: /^Edit$/i })
      .click();
    await expect(page).toHaveURL(/\/admin\/courses\/[^/]+\/edit/, { timeout: 20_000 });
    await expect(page.getByLabel(/Outcome type/i)).toBeVisible();
    await expect(page.getByLabel(/Outcome summary/i)).toBeVisible();
    await expect(page.getByLabel(/Provider certification mapping/i)).toBeVisible();
    await expect(page.getByLabel(/Provider reference URL/i)).toBeVisible();
  });
});
