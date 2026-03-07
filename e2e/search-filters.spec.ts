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
  await page.goto("/");
  await expect(page.locator(".ticket-panel--left").getByText("Fix login validation")).toBeVisible();
});

test("text search with debounce returns matching results", async ({ page }) => {
  const searchInput = page.locator('.ticket-panel--right input[placeholder="Search Redmine…"]');
  await searchInput.fill("login");
  await page.waitForTimeout(500);
  const results = page.locator(".ticket-panel--right .search-result-card");
  await expect(results.filter({ hasText: "Fix login validation" })).toBeVisible();
});

test("status filter shows only matching issues", async ({ page }) => {
  const searchInput = page.locator('.ticket-panel--right input[placeholder="Search Redmine…"]');
  await searchInput.fill("a");
  await page.waitForTimeout(500);
  await expect(page.locator(".ticket-panel--right .search-result-card").first()).toBeVisible();

  const statusChip = page.locator('[aria-label="Filter by Status"]');
  await statusChip.click();

  const listbox = page.locator('[role="listbox"]');
  await expect(listbox).toBeVisible();
  await listbox.getByRole("option", { name: "In Progress" }).click();

  await page.waitForTimeout(500);
  const results = page.locator(".ticket-panel--right .search-result-card");
  const count = await results.count();
  for (let i = 0; i < count; i++) {
    await expect(results.nth(i)).toContainText("In Progress");
  }
});

test("tracker filter reduces results to matching tracker", async ({ page }) => {
  const searchInput = page.locator('.ticket-panel--right input[placeholder="Search Redmine…"]');
  await searchInput.fill("a");
  await page.waitForTimeout(500);
  const results = page.locator(".ticket-panel--right .search-result-card");
  await expect(results.first()).toBeVisible();
  const countBefore = await results.count();

  const trackerChip = page.locator('[aria-label="Filter by Tracker"]');
  await trackerChip.click();

  const listbox = page.locator('[role="listbox"]');
  await expect(listbox).toBeVisible();
  await listbox.getByRole("option", { name: "Bug" }).click();

  await page.waitForTimeout(500);
  const countAfter = await results.count();
  expect(countAfter).toBeGreaterThan(0);
  expect(countAfter).toBeLessThanOrEqual(countBefore);
});

test("priority filter reduces results to matching priority", async ({ page }) => {
  const searchInput = page.locator('.ticket-panel--right input[placeholder="Search Redmine…"]');
  await searchInput.fill("a");
  await page.waitForTimeout(500);
  const results = page.locator(".ticket-panel--right .search-result-card");
  await expect(results.first()).toBeVisible();
  const countBefore = await results.count();

  const priorityChip = page.locator('[aria-label="Filter by All priorities"]');
  await priorityChip.click();

  const listbox = page.locator('[role="listbox"]');
  await expect(listbox).toBeVisible();
  await listbox.getByRole("option", { name: "High" }).click();

  await page.waitForTimeout(500);
  const countAfter = await results.count();
  expect(countAfter).toBeGreaterThan(0);
  expect(countAfter).toBeLessThanOrEqual(countBefore);
});

test("sort changes result order", async ({ page }) => {
  const searchInput = page.locator('.ticket-panel--right input[placeholder="Search Redmine…"]');
  await searchInput.fill("a");
  await page.waitForTimeout(500);

  const results = page.locator(".ticket-panel--right .search-result-card");
  await expect(results.first()).toBeVisible();
  const firstResultBefore = await results.first().textContent();

  const sortChip = page.locator('[aria-label="Sort by"]');
  await sortChip.click();

  const listbox = page.locator('[role="listbox"]');
  await expect(listbox).toBeVisible();
  const options = listbox.getByRole("option");
  const optionCount = await options.count();
  if (optionCount > 1) {
    await options.nth(1).click();
  }

  await page.waitForTimeout(500);
  const firstResultAfter = await results.first().textContent();
  expect(firstResultAfter).not.toBe(firstResultBefore);
});

test("clear filters resets all active filters", async ({ page }) => {
  const searchInput = page.locator('.ticket-panel--right input[placeholder="Search Redmine…"]');
  await searchInput.fill("a");
  await page.waitForTimeout(500);
  await expect(page.locator(".ticket-panel--right .search-result-card").first()).toBeVisible();

  const statusChip = page.locator('[aria-label="Filter by Status"]');
  await statusChip.click();
  const listbox = page.locator('[role="listbox"]');
  await expect(listbox).toBeVisible();
  await listbox.getByRole("option", { name: "In Progress" }).click();
  await page.waitForTimeout(500);

  await expect(statusChip).toHaveClass(/filter-chip--active/);

  const clearButton = page.locator(".ticket-panel--right .filter-chip--clear");
  await clearButton.click();
  await page.waitForTimeout(500);

  await expect(statusChip).not.toHaveClass(/filter-chip--active/);
});

test("escape clears search text", async ({ page }) => {
  const searchInput = page.locator('.ticket-panel--right input[placeholder="Search Redmine…"]');
  await searchInput.fill("login");
  await expect(searchInput).toHaveValue("login");

  await searchInput.press("Escape");
  await expect(searchInput).toHaveValue("");
});

test("Cmd+K focuses search input", async ({ page }) => {
  const searchInput = page.locator('.ticket-panel--right input[placeholder="Search Redmine…"]');
  await expect(searchInput).not.toBeFocused();

  await page.keyboard.press("Meta+k");
  await expect(searchInput).toBeFocused();
});

test("recent searches appear and are clickable", async ({ page }) => {
  const searchInput = page.locator('.ticket-panel--right input[placeholder="Search Redmine…"]');
  await searchInput.fill("login");
  await page.waitForTimeout(500);
  await expect(
    page
      .locator(".ticket-panel--right .search-result-card")
      .filter({ hasText: "Fix login validation" }),
  ).toBeVisible();

  await searchInput.fill("");
  await page.waitForTimeout(300);

  await searchInput.focus();
  const recentSection = page.locator(".ticket-panel--right .search-panel__recent");
  await expect(recentSection).toBeVisible();

  const recentItem = recentSection.locator(".search-panel__recent-item", {
    hasText: "login",
  });
  await expect(recentItem).toBeVisible();
  await recentItem.click();

  await expect(searchInput).toHaveValue("login");
  await page.waitForTimeout(500);
  await expect(
    page
      .locator(".ticket-panel--right .search-result-card")
      .filter({ hasText: "Fix login validation" }),
  ).toBeVisible();
});

test("search by issue ID with hash", async ({ page }) => {
  const searchInput = page.locator('.ticket-panel--right input[placeholder="Search Redmine…"]');
  await searchInput.fill("#201");
  await page.waitForTimeout(500);

  const results = page.locator(".ticket-panel--right .search-result-card");
  await expect(results.filter({ hasText: "Update API documentation" })).toBeVisible();
});

test("project filter shows only matching project issues", async ({ page }) => {
  const searchInput = page.locator('.ticket-panel--right input[placeholder="Search Redmine…"]');
  await searchInput.fill("a");
  await page.waitForTimeout(500);
  await expect(page.locator(".ticket-panel--right .search-result-card").first()).toBeVisible();

  const projectChip = page.locator('[aria-label="Filter by Project"]');
  await projectChip.click();

  const listbox = page.locator('[role="listbox"]');
  await expect(listbox).toBeVisible();
  await listbox.getByRole("option", { name: "Project Alpha" }).click();

  await page.waitForTimeout(500);
  const results = page.locator(".ticket-panel--right .search-result-card");
  const count = await results.count();
  expect(count).toBeGreaterThan(0);
  for (let i = 0; i < count; i++) {
    await expect(results.nth(i)).toContainText("Project Alpha");
  }
});
