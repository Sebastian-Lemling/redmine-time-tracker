import { test, expect } from "@playwright/test";

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

test.describe("App loading", () => {
  test("shows Tickets tab and user avatar after loading", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("nav").getByText("Tickets")).toBeVisible();
    await expect(page.locator("nav").getByText("Time Tracking")).toBeVisible();
    await expect(page.locator(".profile-menu__trigger")).toBeVisible();
  });

  test("shows Today and Week hours in header", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("nav").getByText("Tickets")).toBeVisible();
    await expect(page.getByText("Today")).toBeVisible();
    await expect(page.getByText("Week")).toBeVisible();
  });

  test("shows connection error when API is unreachable", async ({ page }) => {
    await page.route("**/api/me", (route) =>
      route.fulfill({
        status: 502,
        contentType: "application/json",
        body: JSON.stringify({ error: "Cannot reach Redmine" }),
      }),
    );
    await page.goto("/");
    await expect(page.getByText("Connection Failed")).toBeVisible();
    await expect(page.getByText("npm run setup")).toBeVisible();
  });

  test("shows tickets grouped by project after loading", async ({ page }) => {
    await page.goto("/");
    const ticketPanel = page.locator(".ticket-panel--left");
    await expect(
      ticketPanel.locator(".ticket-group__name").getByText("Project Alpha"),
    ).toBeVisible();
    await expect(
      ticketPanel.locator(".ticket-group__name").getByText("Project Beta"),
    ).toBeVisible();
    await expect(ticketPanel.getByText("Fix login validation")).toBeVisible();
    await expect(ticketPanel.getByText("Update API documentation")).toBeVisible();
  });
});
