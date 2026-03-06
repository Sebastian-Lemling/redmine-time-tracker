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

test.describe("Multi-timer", () => {
  test("starting second timer pauses the first", async ({ page }) => {
    const panel = page.locator(ticketPanel);

    const firstStartBtn = panel.locator('button[aria-label="Start timer"]').first();
    await firstStartBtn.click();

    const activeTimer = page.locator(".active-timer-bar");
    await expect(activeTimer).toBeVisible();

    const secondStartBtn = panel.locator('button[aria-label="Start timer"]').first();
    await secondStartBtn.click();

    await expect(page.locator(".ticket-card--paused")).toBeVisible();
    await expect(activeTimer).toBeVisible();
  });

  test("paused timer shows paused state on card", async ({ page }) => {
    const panel = page.locator(ticketPanel);

    await panel.locator('button[aria-label="Start timer"]').first().click();
    await expect(page.locator(".active-timer-bar")).toBeVisible();

    await page.locator(".active-timer-bar").getByRole("button", { name: "Pause timer" }).click();

    await expect(page.locator(".ticket-card--paused")).toBeVisible();
  });

  test("switching between timers", async ({ page }) => {
    const panel = page.locator(ticketPanel);

    // Start timer on #101
    await panel.locator('button[aria-label="Start timer"]').first().click();
    await expect(page.locator(".active-timer-bar")).toBeVisible();

    // Start timer on #102 — this pauses #101
    await panel.locator('button[aria-label="Start timer"]').first().click();
    await expect(page.locator(".ticket-card--paused")).toBeVisible();

    // Resume #101 via resume button
    await page.locator('button[aria-label*="Resume timer"]').click();

    // #102 should now be paused
    await expect(page.locator(".ticket-card--paused")).toBeVisible();
    await expect(page.locator(".active-timer-bar")).toBeVisible();
  });
});
