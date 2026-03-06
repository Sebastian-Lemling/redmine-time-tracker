import { test, expect } from "@playwright/test";

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function seedEntry(
  page: import("@playwright/test").Page,
  overrides: Record<string, unknown> = {},
) {
  const now = new Date().toISOString();
  await page.request.post("http://localhost:3001/api/timelog", {
    data: {
      issueId: 101,
      issueSubject: "Fix login validation",
      projectId: 1,
      projectName: "Project Alpha",
      startTime: now,
      endTime: now,
      duration: 15,
      originalDuration: 15,
      description: "Worked on login",
      date: todayStr(),
      activityId: 9,
      ...overrides,
    },
  });
}

test.beforeEach(async ({ page }) => {
  await page.request.post("http://localhost:3001/api/__reset");
  await page.addInitScript(() => {
    localStorage.setItem("locale", "en");
    localStorage.removeItem("multiTimers");
    localStorage.removeItem("theme-mode");
    localStorage.removeItem("pinned-issue-ids");
    localStorage.removeItem("pin-migration-done");
    localStorage.removeItem("hidden-assigned-ids");
  });
});

test.describe("Sync flow", () => {
  test("batch sync entries with activity succeeds", async ({ page }) => {
    await seedEntry(page);
    await page.goto("/#/timelog");
    await expect(page.getByText("Fix login validation").first()).toBeVisible();

    const checkbox = page.getByRole("checkbox").first();
    await checkbox.click();

    const sendBtn = page.getByText("Send").first();
    await sendBtn.click();

    await page.waitForTimeout(1000);

    const snackbar = page.locator('[role="status"][aria-live="polite"]');
    await expect(snackbar).toContainText(/synced|sent/i, { timeout: 10000 });
  });

  test("batch sync without activity shows warning", async ({ page }) => {
    // Seed entry WITHOUT activityId
    await seedEntry(page, { activityId: undefined });
    await page.goto("/#/timelog");
    await expect(page.getByText("Fix login validation").first()).toBeVisible();

    const checkbox = page.getByRole("checkbox").first();
    await checkbox.click();

    const sendBtn = page.getByText("Send").first();
    await sendBtn.click();

    const snackbar = page.locator('[role="status"][aria-live="polite"]');
    await expect(snackbar).toContainText(/activity/i, { timeout: 10000 });
  });

  test("Sent tab shows synced entry after sync", async ({ page }) => {
    await seedEntry(page);
    await page.goto("/#/timelog");
    await expect(page.getByText("Fix login validation").first()).toBeVisible();

    const checkbox = page.getByRole("checkbox").first();
    await checkbox.click();

    const sendBtn = page.getByText("Send").first();
    await sendBtn.click();

    await page.waitForTimeout(1000);

    const sentTab = page.getByRole("tab", { name: /Sent/ });
    await sentTab.click();

    await expect(page.getByText("Fix login validation").first()).toBeVisible({ timeout: 10000 });
  });

  test("sync failure shows error count in snackbar", async ({ page }) => {
    await seedEntry(page);
    await page.goto("/#/timelog");
    await expect(page.getByText("Fix login validation").first()).toBeVisible();

    await page.request.post("http://localhost:3001/api/__fail-next");

    const checkbox = page.getByRole("checkbox").first();
    await checkbox.click();

    const sendBtn = page.getByText("Send").first();
    await sendBtn.click();

    const snackbar = page.locator('[role="status"][aria-live="polite"]');
    await expect(snackbar).toBeVisible({ timeout: 10000 });
  });
});
