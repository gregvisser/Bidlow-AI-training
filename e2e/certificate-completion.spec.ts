import { test, expect } from "@playwright/test";

/**
 * Completion rows + certificate unlock for Azure AI Foundations are ensured in e2e/global-setup.ts
 * (idempotent DB sync). This spec proves learner-facing list → detail → printable views.
 */

let databaseUp = false;

test.beforeAll(async ({ request }) => {
  const res = await request.get("/api/ready");
  databaseUp = res.ok();
});

test.describe("Certificate visibility after course completion", () => {
  test("learner sees certificate on list → detail → printable", async ({ page }) => {
    test.skip(!databaseUp, "PostgreSQL required — migrate + seed and DATABASE_URL for app + Playwright.");
    test.setTimeout(180_000);

    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await page.getByLabel(/^email$/i).fill("learner@aitraining.local");
    await page.getByLabel(/^password$/i).fill("Learner123!");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/portal/, { timeout: 90_000 });

    await page.goto("/portal/certificates", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { level: 1, name: /certificates/i })).toBeVisible({
      timeout: 30_000,
    });

    await expect(page.getByText(/Azure AI Foundations/i).first()).toBeVisible({ timeout: 20_000 });

    const detailAnchor = page.locator(`a[href^="/portal/certificates/"]:not([href*="/print"])`).first();
    await detailAnchor.click();
    await expect(page).toHaveURL(/\/portal\/certificates\/[^/]+$/, { timeout: 20_000 });
    await expect(page.getByText(/Estimated minutes completed/i)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/Lessons completed/i)).toBeVisible();
    await expect(page.locator(`a[href^="/api/portal/certificates/"][href$="/pdf"]`)).toBeVisible();

    const certId = page.url().match(/\/portal\/certificates\/([^/]+)$/)?.[1];
    expect(certId).toBeTruthy();
    const pdfRes = await page.request.get(`/api/portal/certificates/${certId}/pdf`);
    expect(pdfRes.status()).toBe(200);
    expect(pdfRes.headers()["content-type"] ?? "").toContain("application/pdf");
    const pdfBody = await pdfRes.body();
    expect(Buffer.from(pdfBody).slice(0, 4).toString()).toBe("%PDF");

    await page.locator(`a[href$="/print"]`).first().click();
    await expect(page).toHaveURL(/\/print$/, { timeout: 15_000 });
    await expect(page.getByText(/Certificate of completion/i)).toBeVisible();
    await expect(page.getByText(/Est\. minutes completed/i)).toBeVisible();
  });
});
