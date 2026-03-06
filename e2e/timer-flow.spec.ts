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

test.describe("Timer flow", () => {
  test("start timer shows ActiveTimer bar", async ({ page }) => {
    const startBtn = page.locator('button[aria-label="Start timer"]').first();
    await startBtn.click();

    const activeTimer = page.locator(".active-timer-bar");
    await expect(activeTimer).toBeVisible();
    await expect(activeTimer.getByRole("timer")).toBeVisible();
  });

  test("pause and resume timer", async ({ page }) => {
    await page.locator('button[aria-label="Start timer"]').first().click();
    await expect(page.locator(".active-timer-bar")).toBeVisible();

    await page.locator(".active-timer-bar").getByRole("button", { name: "Pause timer" }).click();

    await expect(page.locator(".ticket-card--paused")).toBeVisible();

    await page.locator('button[aria-label*="Resume timer"]').click();

    await expect(page.locator(".active-timer-bar")).toBeVisible();
  });

  test("save timer opens booking dialog and saves entry", async ({ page }) => {
    await page.locator('button[aria-label="Start timer"]').first().click();
    await expect(page.locator(".active-timer-bar")).toBeVisible();

    await page
      .locator(".active-timer-bar")
      .getByRole("button", { name: "Save time entry" })
      .click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Book time")).toBeVisible();
    await expect(dialog.getByText("Fix login validation")).toBeVisible();

    const submitBtn = dialog.getByRole("button", { name: "Save" });
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();

    await expect(dialog).not.toBeVisible();
    await expect(page.locator(".active-timer-bar")).not.toBeVisible();

    await page.locator("nav").getByText("Time Tracking").click();
    await expect(page.getByText("Fix login validation").first()).toBeVisible();
  });

  test("manual booking via plus button opens dialog", async ({ page }) => {
    await page.locator('button[aria-label="Book manually"]').first().click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Book time")).toBeVisible();
  });

  test("ActiveTimer stepper adjusts elapsed time", async ({ page }) => {
    await page.locator('button[aria-label="Start timer"]').first().click();
    const activeTimer = page.locator(".active-timer-bar");
    await expect(activeTimer).toBeVisible();

    const timerValue = activeTimer.getByRole("timer");
    const valueBefore = await timerValue.textContent();

    const plusBtn = activeTimer.locator('.timer-stepper__btn[aria-label="Add 1 minute"]');
    await plusBtn.click();

    const valueAfter = await timerValue.textContent();
    expect(valueAfter).not.toBe(valueBefore);
  });

  test("ActiveTimer shows issue info", async ({ page }) => {
    await page.locator('button[aria-label="Start timer"]').first().click();
    const activeTimer = page.locator(".active-timer-bar");
    await expect(activeTimer).toBeVisible();

    await expect(activeTimer.getByText("Fix login validation")).toBeVisible();
    await expect(activeTimer.getByText("Project Alpha")).toBeVisible();
  });

  test("discard timer removes it", async ({ page }) => {
    await page.locator('button[aria-label="Start timer"]').first().click();
    await expect(page.locator(".active-timer-bar")).toBeVisible();

    await page.locator(".active-timer-bar").getByRole("button", { name: "Pause timer" }).click();

    await page.locator('button[aria-label="Discard timer"]').first().click();

    await expect(page.locator(".active-timer-bar")).not.toBeVisible();
    await expect(page.locator(".ticket-card--paused")).not.toBeVisible();
    await expect(page.locator(".ticket-card--running")).not.toBeVisible();
  });
});
