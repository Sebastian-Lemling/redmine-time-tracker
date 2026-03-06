import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.request.post("http://localhost:3001/api/__reset");
});

test.describe("Preferences", () => {
  test("toggle dark mode via profile menu", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("locale", "en");
      localStorage.setItem("theme-mode", "light");
    });
    await page.goto("/");
    await expect(page.locator("nav").getByText("Tickets")).toBeVisible();

    await page.locator(".profile-menu__trigger").click();

    const darkBtn = page.getByRole("button", { name: "Dark mode", exact: true });
    await expect(darkBtn).toBeVisible();
    await darkBtn.click();

    const html = page.locator("html");
    await expect(html).toHaveAttribute("data-theme", "dark");

    const lightBtn = page.getByRole("button", { name: "Light mode", exact: true });
    await lightBtn.click();
    await expect(html).toHaveAttribute("data-theme", "light");
  });

  test("switch language from EN to DE", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("locale", "en");
      localStorage.setItem("theme-mode", "light");
    });
    await page.goto("/");
    await expect(page.locator("nav").getByText("Tickets")).toBeVisible();

    await page.locator(".profile-menu__trigger").click();
    await page.getByText("Deutsch").click();

    await expect(page.locator("nav").getByText("Zeiterfassung")).toBeVisible();
    await expect(page.locator("nav").getByText("Tickets")).toBeVisible();
  });

  test("switch language from EN to DE and back", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("locale", "en");
      localStorage.setItem("theme-mode", "light");
    });
    await page.goto("/");
    await expect(page.locator("nav").getByText("Tickets")).toBeVisible();

    await page.locator(".profile-menu__trigger").click();
    await page.getByText("Deutsch").click();
    await expect(page.locator("nav").getByText("Zeiterfassung")).toBeVisible();

    await page.locator(".profile-menu__trigger").click();
    await page.getByText("English").click();
    await expect(page.locator("nav").getByText("Time Tracking")).toBeVisible();
  });

  test("theme preference survives reload", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.setItem("locale", "en");
      localStorage.setItem("theme-mode", "light");
    });
    await page.reload();
    await expect(page.locator("nav").getByText("Tickets")).toBeVisible();

    await page.locator(".profile-menu__trigger").click();
    await page.getByRole("button", { name: "Dark mode", exact: true }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

    await page.reload();
    await expect(page.locator("nav").getByText("Tickets")).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });

  test("profile menu shows user info", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("locale", "en");
      localStorage.setItem("theme-mode", "light");
    });
    await page.goto("/");
    await expect(page.locator("nav").getByText("Tickets")).toBeVisible();

    await page.locator(".profile-menu__trigger").click();

    await expect(page.locator(".profile-menu__name")).toContainText("Test User");
    await expect(page.locator(".profile-menu__email")).toContainText("test@example.com");
  });

  test("system theme option is available", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("locale", "en");
      localStorage.setItem("theme-mode", "light");
    });
    await page.goto("/");
    await expect(page.locator("nav").getByText("Tickets")).toBeVisible();

    await page.locator(".profile-menu__trigger").click();

    await expect(page.getByRole("button", { name: "System", exact: true })).toBeVisible();
  });

  test("language preference survives reload", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.setItem("locale", "en");
      localStorage.setItem("theme-mode", "light");
    });
    await page.reload();
    await expect(page.locator("nav").getByText("Tickets")).toBeVisible();

    await page.locator(".profile-menu__trigger").click();
    await page.getByText("Deutsch").click();
    await expect(page.locator("nav").getByText("Zeiterfassung")).toBeVisible();

    await page.reload();
    await expect(page.locator("nav").getByText("Zeiterfassung")).toBeVisible();
  });
});
