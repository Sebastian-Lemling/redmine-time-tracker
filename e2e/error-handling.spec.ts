import { test, expect } from "@playwright/test";

const ticketPanel = ".ticket-panel--left";

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

test.describe("Error handling", () => {
  test("API error on issue mutation shows snackbar", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(ticketPanel).getByText("Fix login validation")).toBeVisible();

    await page.request.post("http://localhost:3001/api/__fail-next");

    const card = page
      .locator(ticketPanel)
      .locator(".ticket-card", { hasText: "Fix login validation" });
    const statusChip = card.locator(".chip-menu__trigger", {
      hasText: "In Progress",
    });
    await statusChip.click();

    const listbox = page.locator('[role="listbox"]');
    await expect(listbox).toBeVisible();
    await listbox.locator('[role="option"]', { hasText: "Resolved" }).click();

    const snackbar = page.locator('[role="status"][aria-live="polite"]');
    await expect(snackbar).toContainText(/failed|error/i, { timeout: 10000 });
  });

  test("sync error shows failure count in snackbar", async ({ page }) => {
    await seedEntry(page, { activityId: 9 });
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

  test("network error shows connection failed page", async ({ page }) => {
    await page.route("**/api/me", (route) =>
      route.fulfill({
        status: 502,
        contentType: "application/json",
        body: JSON.stringify({ error: "Cannot reach Redmine" }),
      }),
    );
    await page.goto("/");
    await expect(page.getByText("Connection Failed")).toBeVisible();
  });
});
