import { test, expect } from "@playwright/test";

let databaseUp = false;

test.beforeAll(async ({ request }) => {
  const res = await request.get("/api/ready");
  databaseUp = res.ok();
});

test.describe("Launch curriculum (tracks → lesson → completion)", () => {
  test("learner: tracks → seeded path → lesson → complete → persists after reload", async ({
    page,
  }) => {
    test.skip(!databaseUp, "PostgreSQL required — migrate + seed and DATABASE_URL for app + Playwright.");
    test.setTimeout(180_000);

    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await page.getByLabel(/^email$/i).fill("learner@aitraining.local");
    await page.getByLabel(/^password$/i).fill("Learner123!");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/portal/, { timeout: 90_000 });

    await page.goto("/portal/tracks", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/portal\/tracks/, { timeout: 30_000 });
    await expect(page.getByRole("heading", { level: 1, name: /learning tracks/i })).toBeVisible({
      timeout: 30_000,
    });
    await expect(
      page.locator('a[href="/portal/paths/track-microsoft-azure-ai"]').first(),
    ).toBeVisible();

    await page.goto("/portal/paths/track-microsoft-azure-ai");
    await expect(page).toHaveURL(/\/portal\/paths\/track-microsoft-azure-ai/, { timeout: 15_000 });

    await page.goto("/portal/courses/azure-ai-foundations/modules/core/lessons/what-ai-is-business", {
      waitUntil: "domcontentloaded",
    });
    await expect(page).toHaveURL(
      /\/portal\/courses\/azure-ai-foundations\/modules\/core\/lessons\/what-ai-is-business/,
      { timeout: 20_000 },
    );

    const markComplete = page.getByRole("button", { name: /mark complete/i });
    const markIncomplete = page.getByRole("button", { name: /mark incomplete/i });

    if (await markIncomplete.isVisible()) {
      await markIncomplete.click();
      await expect(markComplete).toBeVisible({ timeout: 20_000 });
    }

    await markComplete.scrollIntoViewIfNeeded();
    await expect(markComplete).toBeVisible({ timeout: 45_000 });
    await markComplete.click({ timeout: 30_000 });
    await expect(markIncomplete).toBeVisible({ timeout: 20_000 });

    await page.reload();
    await expect(markIncomplete).toBeVisible({ timeout: 20_000 });
  });
});
