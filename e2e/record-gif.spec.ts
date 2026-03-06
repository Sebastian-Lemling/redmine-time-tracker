import { test, expect } from "@playwright/test";

const ticketPanel = ".ticket-panel--left";

test.use({
  viewport: { width: 960, height: 600 },
  video: { mode: "on", size: { width: 960, height: 600 } },
});

test("record timer workflow for GIF", async ({ page }) => {
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

  // Pause to show the ticket list
  await page.waitForTimeout(1500);

  // Start timer on first ticket
  const startBtn = page.locator('button[aria-label="Start timer"]').first();
  await startBtn.click();
  await expect(page.locator(".active-timer-bar")).toBeVisible();

  // Let timer run visibly
  await page.waitForTimeout(2500);

  // Click save to open booking dialog
  await page.locator(".active-timer-bar").getByRole("button", { name: "Save time entry" }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  // Pause on dialog
  await page.waitForTimeout(2000);

  // Click save
  const submitBtn = dialog.getByRole("button", { name: "Save" });
  await expect(submitBtn).toBeEnabled();
  await submitBtn.click();
  await expect(dialog).not.toBeVisible();

  // Navigate to time tracking
  await page.locator("nav").getByText("Time Tracking").click();
  await expect(page.getByText("Fix login validation").first()).toBeVisible();

  // Pause on timelog view
  await page.waitForTimeout(2000);
});
