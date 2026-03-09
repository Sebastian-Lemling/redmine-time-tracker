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

test.describe("Toolbar and project groups", () => {
  test("local ticket search filters visible tickets", async ({ page }) => {
    const panel = page.locator(ticketPanel);
    const searchInput = panel.locator(".ticket-toolbar__input");

    await expect(panel.getByText("Add dark mode support")).toBeVisible();
    await expect(panel.getByText("Update API documentation")).toBeVisible();

    await searchInput.fill("login");

    await expect(panel.getByText("Fix login validation")).toBeVisible();
    await expect(panel.getByText("Add dark mode support")).not.toBeVisible();
    await expect(panel.getByText("Update API documentation")).not.toBeVisible();

    // Clear via Escape key (no dedicated clear button exists)
    await searchInput.press("Escape");

    await expect(panel.getByText("Fix login validation")).toBeVisible();
    await expect(panel.getByText("Add dark mode support")).toBeVisible();
    await expect(panel.getByText("Update API documentation")).toBeVisible();
  });

  test("collapse all hides all group content", async ({ page }) => {
    const panel = page.locator(ticketPanel);

    await expect(panel.locator(".ticket-card").first()).toBeVisible();

    const collapseBtn = panel.locator('.ticket-toolbar__btn[title="Collapse all"]');
    await collapseBtn.click();

    const groupContents = panel.locator(".ticket-group__content");
    const count = await groupContents.count();
    for (let i = 0; i < count; i++) {
      await expect(groupContents.nth(i)).toHaveCSS("max-height", "0px");
    }
  });

  test("expand all after collapse restores ticket cards", async ({ page }) => {
    const panel = page.locator(ticketPanel);

    const collapseBtn = panel.locator('.ticket-toolbar__btn[title="Collapse all"]');
    await collapseBtn.click();

    const groupContents = panel.locator(".ticket-group__content");
    const contentCount = await groupContents.count();
    for (let i = 0; i < contentCount; i++) {
      await expect(groupContents.nth(i)).toHaveCSS("max-height", "0px");
    }

    const expandBtn = panel.locator('.ticket-toolbar__btn[title="Expand all"]');
    await expandBtn.click();

    for (let i = 0; i < contentCount; i++) {
      await expect(groupContents.nth(i)).not.toHaveCSS("max-height", "0px");
    }

    await expect(panel.getByText("Fix login validation")).toBeVisible();
    await expect(panel.getByText("Add dark mode support")).toBeVisible();
  });

  test("project filter badge filters tickets by project", async ({ page }) => {
    const panel = page.locator(ticketPanel);

    await expect(panel.locator(".ticket-group__name").getByText("Project Alpha")).toBeVisible();
    await expect(panel.locator(".ticket-group__name").getByText("Project Beta")).toBeVisible();

    // Clicking Beta toggles it OFF → only Alpha remains
    const betaBadge = panel.locator(".filter-chip", { hasText: "Project Beta" });
    await expect(betaBadge).toBeVisible({ timeout: 5000 });
    await betaBadge.click();

    await expect(panel.locator(".ticket-group__name").getByText("Project Alpha")).toBeVisible();
    await expect(panel.locator(".ticket-group__name").getByText("Project Beta")).not.toBeVisible();

    // Click "All" to re-enable all
    const allBadge = panel.locator(".filter-chip").first();
    await allBadge.click();

    await expect(panel.locator(".ticket-group__name").getByText("Project Alpha")).toBeVisible();
    await expect(panel.locator(".ticket-group__name").getByText("Project Beta")).toBeVisible();
  });

  test("tracked only toggle shows only tickets with running timers", async ({ page }) => {
    const panel = page.locator(ticketPanel);

    const startBtn = panel.locator('button[aria-label="Start timer"]').first();
    await startBtn.click();
    await expect(page.locator(".active-timer-bar")).toBeVisible();

    const trackedBtn = panel.locator('.ticket-toolbar__btn[title="Tracked tickets only"]');
    await trackedBtn.click();

    const visibleCards = panel.locator(".ticket-card:visible");
    const cardCount = await visibleCards.count();
    expect(cardCount).toBe(1);

    await trackedBtn.click();

    const allCards = panel.locator(".ticket-card:visible");
    const allCount = await allCards.count();
    expect(allCount).toBeGreaterThan(1);
  });
});
