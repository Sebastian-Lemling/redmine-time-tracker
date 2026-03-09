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

test.describe("Language switching", () => {
  test("default English displays English text in navigation", async ({ page }) => {
    await expect(page.locator("nav").getByText("Tickets")).toBeVisible();
    await expect(page.locator("nav").getByText("Time Tracking")).toBeVisible();
    await expect(page.getByText("Today")).toBeVisible();
    await expect(page.getByText("Week")).toBeVisible();
  });

  test("switch to German shows German text", async ({ page }) => {
    await page.locator(".profile-menu__trigger").click();
    await page.getByText("Deutsch").click();

    await expect(page.locator("nav").getByText("Zeiterfassung")).toBeVisible();
    await expect(page.getByText("Heute")).toBeVisible();
    await expect(page.getByText("Woche")).toBeVisible();
  });

  test("switch to German and back to English", async ({ page }) => {
    await page.locator(".profile-menu__trigger").click();
    await page.getByText("Deutsch").click();
    await expect(page.locator("nav").getByText("Zeiterfassung")).toBeVisible();

    await page.locator(".profile-menu__trigger").click();
    await page.getByText("English").click();
    await expect(page.locator("nav").getByText("Time Tracking")).toBeVisible();
  });

  test("language selection is stored in localStorage", async ({ page }) => {
    await page.locator(".profile-menu__trigger").click();
    await page.getByText("Deutsch").click();
    await expect(page.locator("nav").getByText("Zeiterfassung")).toBeVisible();

    const stored = await page.evaluate(() => localStorage.getItem("locale"));
    expect(stored).toBe("de");
  });

  test("project group names remain unchanged after language switch", async ({ page }) => {
    const panel = page.locator(ticketPanel);
    await expect(panel.locator(".ticket-group__name").getByText("Project Alpha")).toBeVisible();

    await page.locator(".profile-menu__trigger").click();
    await page.getByText("Deutsch").click();

    await expect(panel.locator(".ticket-group__name").getByText("Project Alpha")).toBeVisible();
  });

  test("profile menu shows appearance label in German", async ({ page }) => {
    await page.locator(".profile-menu__trigger").click();
    await page.getByText("Deutsch").click();

    await page.locator(".profile-menu__trigger").click();
    await expect(page.getByText("Erscheinungsbild")).toBeVisible();
    await expect(page.getByText("Sprache")).toBeVisible();
  });

  test("search placeholder updates on language switch", async ({ page }) => {
    const searchPanel = page.locator(".ticket-panel--right");
    await expect(searchPanel.getByPlaceholder("Search Redmine…")).toBeVisible();

    await page.locator(".profile-menu__trigger").click();
    await page.getByText("Deutsch").click();

    await expect(searchPanel.getByPlaceholder("Redmine durchsuchen…")).toBeVisible();
  });
});
