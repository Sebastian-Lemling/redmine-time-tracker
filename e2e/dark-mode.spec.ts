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
  await expect(page.locator("nav").getByText("Tickets")).toBeVisible();
});

test.describe("Theme switching", () => {
  test("default light mode renders with light theme attribute", async ({ page }) => {
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  });

  test("toggle to dark mode adds data-theme dark", async ({ page }) => {
    await page.locator(".profile-menu__trigger").click();
    await page.locator('.profile-menu__theme-btn[title="Dark mode"]').click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });

  test("toggle back to light mode restores light theme", async ({ page }) => {
    await page.locator(".profile-menu__trigger").click();
    await page.locator('.profile-menu__theme-btn[title="Dark mode"]').click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

    // Menu stays open after theme click — click light directly
    await page.locator('.profile-menu__theme-btn[title="Light mode"]').click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  });

  test("theme selection is stored in localStorage", async ({ page }) => {
    await page.locator(".profile-menu__trigger").click();
    await page.locator('.profile-menu__theme-btn[title="Dark mode"]').click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

    const stored = await page.evaluate(() => localStorage.getItem("theme-mode"));
    expect(stored).toBe("dark");
  });

  test("system theme option is available in profile menu", async ({ page }) => {
    await page.locator(".profile-menu__trigger").click();
    await expect(page.locator('.profile-menu__theme-btn[title="System"]')).toBeVisible();
  });
});
