import { test, expect } from "@playwright/test";

let databaseUp = false;

test.beforeAll(async ({ request }) => {
  const res = await request.get("/api/ready");
  databaseUp = res.ok();
});

/**
 * Authenticated learner smoke: outcome labels, path panels, progression strip, course-in-path context.
 * Relies on seed + globalSetup (first launch course completed for learner → realistic “continue” state).
 */
test.describe("Learning path outcomes (learner)", () => {
  test("tracks → path → course show outcome UI and progression", async ({ page }) => {
    test.skip(!databaseUp, "PostgreSQL required — migrate + seed and DATABASE_URL for app + Playwright.");
    test.setTimeout(120_000);

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

    const catalog = page.getByTestId("portal-tracks-catalog");
    const msCard = catalog.getByTestId("track-card-track-microsoft-azure-ai");
    await expect(msCard).toBeVisible();
    await expect(msCard).toContainText(/Provider-aligned/i);
    await expect(msCard).toContainText(/platform certificate/i);

    await page.goto("/portal/paths/track-microsoft-azure-ai", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/track-microsoft-azure-ai/, { timeout: 20_000 });
    const pathLayout = page.getByTestId("portal-learning-path-layout");
    await expect(pathLayout.getByTestId("path-outcome-panel")).toBeVisible();
    await expect(pathLayout.getByTestId("path-outcome-panel")).toContainText(/Track outcome/i);
    await expect(pathLayout.getByTestId("path-progression-strip")).toBeVisible();
    await expect(pathLayout.getByTestId("path-progression-start")).toBeVisible();
    await expect(pathLayout.getByTestId("path-progression-continue")).toBeVisible();
    await expect(pathLayout.getByTestId("path-progression-next")).toBeVisible();
    // Seeded state: first course complete → continue is in a later course; next column shows another course or “last course” copy
    await expect(pathLayout.getByTestId("path-progression-continue")).toContainText(/Continue lesson/i);

    await page.goto("/portal/courses/azure-ai-foundations", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("course-outcome-panel")).toBeVisible();
    await expect(page.getByTestId("course-outcome-panel")).toContainText(/Course outcome/i);
    await expect(page.getByTestId("course-outcome-panel")).toContainText(/Platform certificate/i);
    await expect(page.getByTestId("course-path-membership")).toBeVisible();
    await expect(page.getByTestId("course-path-membership")).toContainText(/Microsoft \/ Azure AI/i);
    await expect(page.getByTestId("course-path-membership")).toContainText(/Next course in path/i);
  });
});
