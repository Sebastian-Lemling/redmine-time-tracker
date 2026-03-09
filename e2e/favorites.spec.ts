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
    localStorage.removeItem("favorite-issue-ids");
    localStorage.removeItem("favorite-issue-ids-default");
    localStorage.removeItem("favorite-issue-cache");
    localStorage.removeItem("favorite-issue-cache-default");
    localStorage.removeItem("show-favorites-group-default");
  });
  await page.goto("/");
  await expect(page.locator(ticketPanel).getByText("Fix login validation")).toBeVisible();
});

test.describe("Favorites functionality", () => {
  test("star button exists on search result cards", async ({ page }) => {
    const searchPanel = page.locator(".ticket-panel--right");
    const searchInput = searchPanel.getByPlaceholder("Search Redmine…");
    await searchInput.fill("login");
    await page.waitForTimeout(500);

    await expect(searchPanel.locator(".search-result-card__fav-btn").first()).toBeVisible({
      timeout: 5000,
    });
  });

  test("clicking star toggles favorite state on search result", async ({ page }) => {
    const searchPanel = page.locator(".ticket-panel--right");
    const searchInput = searchPanel.getByPlaceholder("Search Redmine…");
    await searchInput.fill("login");
    await page.waitForTimeout(500);

    const favBtn = searchPanel.locator('button[aria-label="Add issue #101 to favorites"]');
    await expect(favBtn).toBeVisible({ timeout: 5000 });
    await favBtn.click();

    await expect(
      searchPanel.locator('button[aria-label="Remove issue #101 from favorites"]'),
    ).toBeVisible({ timeout: 5000 });
  });

  test("unfavoriting a favorited issue toggles back", async ({ page }) => {
    const searchPanel = page.locator(".ticket-panel--right");
    const searchInput = searchPanel.getByPlaceholder("Search Redmine…");
    await searchInput.fill("login");
    await page.waitForTimeout(500);

    const addBtn = searchPanel.locator('button[aria-label="Add issue #101 to favorites"]');
    await expect(addBtn).toBeVisible({ timeout: 5000 });
    await addBtn.click();

    const removeBtn = searchPanel.locator('button[aria-label="Remove issue #101 from favorites"]');
    await expect(removeBtn).toBeVisible({ timeout: 5000 });
    await removeBtn.click();

    await expect(
      searchPanel.locator('button[aria-label="Add issue #101 to favorites"]'),
    ).toBeVisible({ timeout: 5000 });
  });

  test("favorites toolbar button toggles favorites-only view", async ({ page }) => {
    const panel = page.locator(ticketPanel);
    const favToolbarBtn = panel.locator('.ticket-toolbar__btn[title="Favorites"]');
    await expect(favToolbarBtn).toBeVisible();

    await favToolbarBtn.click();
    await expect(panel.locator(".ticket-layout__fav-header")).toBeVisible();
  });

  test("favorite state is stored in localStorage", async ({ page }) => {
    const searchPanel = page.locator(".ticket-panel--right");
    const searchInput = searchPanel.getByPlaceholder("Search Redmine…");
    await searchInput.fill("login");
    await page.waitForTimeout(500);

    const addBtn = searchPanel.locator('button[aria-label="Add issue #101 to favorites"]');
    await expect(addBtn).toBeVisible({ timeout: 5000 });
    await addBtn.click();
    await expect(
      searchPanel.locator('button[aria-label="Remove issue #101 from favorites"]'),
    ).toBeVisible({ timeout: 5000 });

    const stored = await page.evaluate(() => {
      const keys = Object.keys(localStorage).filter((k) => k.includes("favorite"));
      return keys.length > 0;
    });
    expect(stored).toBe(true);
  });
});
