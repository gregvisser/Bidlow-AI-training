import { test, expect } from "@playwright/test";

let databaseUp = false;

test.beforeAll(async ({ request }) => {
  const res = await request.get("/api/ready");
  databaseUp = res.ok();
});

test.describe("Admin certificate audit", () => {
  test("admin sees certificates table and reporting completion tiles", async ({ page }) => {
    test.skip(!databaseUp, "PostgreSQL required — migrate + seed and DATABASE_URL.");
    test.setTimeout(120_000);

    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await page.getByLabel(/^email$/i).fill("admin@aitraining.local");
    await page.getByLabel(/^password$/i).fill("Admin123!");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/portal|\/admin/, { timeout: 90_000 });

    await page.goto("/admin/certificates", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { level: 1, name: /certificates/i })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByRole("columnheader", { name: /learner/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /export csv/i })).toBeVisible();

    await page.goto("/admin/reports", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { level: 1, name: /reporting/i })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/courses completed/i).first()).toBeVisible();
    await expect(page.getByText(/in progress/i).first()).toBeVisible();
    await expect(page.getByText(/cert-eligible completed/i).first()).toBeVisible();
  });
});
