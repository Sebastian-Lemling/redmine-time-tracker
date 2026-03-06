import { test, expect } from "@playwright/test";

const ticketPanel = ".ticket-panel--left";

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
  await page.goto("/");
  await expect(page.locator(ticketPanel).getByText("Fix login validation")).toBeVisible();
});

test.describe("Ticket list", () => {
  test("shows issues grouped by project", async ({ page }) => {
    const panel = page.locator(ticketPanel);
    await expect(panel.locator(".ticket-group__name").getByText("Project Alpha")).toBeVisible();
    await expect(panel.locator(".ticket-group__name").getByText("Project Beta")).toBeVisible();
  });

  test("ticket cards show subject, status, and tracker", async ({ page }) => {
    const panel = page.locator(ticketPanel);
    await expect(panel.getByText("Fix login validation")).toBeVisible();
    await expect(panel.getByText("Add dark mode support")).toBeVisible();
    await expect(panel.getByText("Update API documentation")).toBeVisible();

    await expect(panel.getByText("Bug").first()).toBeVisible();
    await expect(panel.getByText("Feature").first()).toBeVisible();
    await expect(panel.getByText("In Progress")).toBeVisible();
    await expect(panel.getByText("New").first()).toBeVisible();
  });

  test("ticket cards show issue IDs", async ({ page }) => {
    const panel = page.locator(ticketPanel);
    await expect(panel.getByText("#101")).toBeVisible();
    await expect(panel.getByText("#102")).toBeVisible();
    await expect(panel.getByText("#201")).toBeVisible();
  });

  test("search filters tickets in search panel", async ({ page }) => {
    const searchPanel = page.locator(".ticket-panel--right");
    const searchInput = searchPanel.getByPlaceholder("Search Redmine…");
    await searchInput.fill("login");
    await page.waitForTimeout(500);

    await expect(searchPanel.getByText("Fix login validation")).toBeVisible();
  });

  test("search by issue ID with hash", async ({ page }) => {
    const searchPanel = page.locator(".ticket-panel--right");
    const searchInput = searchPanel.getByPlaceholder("Search Redmine…");
    await searchInput.fill("#201");
    await page.waitForTimeout(500);

    await expect(searchPanel.getByText("Update API documentation")).toBeVisible();
  });

  test("copy issue ID shows copied state", async ({ context, page }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    const panel = page.locator(ticketPanel);
    const copyBtn = panel.locator('button[aria-label="Copy #101 to clipboard"]').first();
    await copyBtn.click();

    await expect(panel.locator(".card-header__badge-copy--copied").first()).toBeVisible();
  });

  test("unpin and re-pin a ticket", async ({ page }) => {
    const panel = page.locator(ticketPanel);

    // Issues are auto-pinned on first load via syncAssignedPins
    const unpinBtn = panel.locator('button[aria-label="Unpin issue #101"]').first();
    await expect(unpinBtn).toBeVisible();
    await unpinBtn.click();

    // After unpinning, issue disappears from the pinned ticket list
    await expect(panel.getByText("Fix login validation")).not.toBeVisible();

    // Re-pin via search panel
    const searchPanel = page.locator(".ticket-panel--right");
    const searchInput = searchPanel.getByPlaceholder("Search Redmine…");
    await searchInput.fill("login");
    await page.waitForTimeout(500);

    const pinCheckbox = searchPanel.locator('input[aria-label="Pin issue #101"]');
    await pinCheckbox.click();

    // Issue reappears in the pinned ticket list
    await expect(panel.getByText("Fix login validation")).toBeVisible();
  });
});
