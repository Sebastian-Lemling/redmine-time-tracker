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

test.describe("Booking dialog", () => {
  test("duration stepper plus increases and minus decreases", async ({ page }) => {
    await page.locator('button[aria-label="Book manually"]').first().click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Book time")).toBeVisible();

    await expect(dialog.getByText("0.25h")).toBeVisible();

    await dialog.getByRole("button", { name: "15 minutes more" }).click();
    await expect(dialog.getByText("0.5h")).toBeVisible();

    await dialog.getByRole("button", { name: "15 minutes less" }).click();
    await expect(dialog.getByText("0.25h")).toBeVisible();
  });

  test("activity selection shows chosen value", async ({ page }) => {
    await page.locator('button[aria-label="Book manually"]').first().click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    const trigger = dialog.locator(".m3-select__trigger");
    await expect(trigger).toBeVisible();

    await trigger.click();
    const list = page.locator(".m3-select__list");
    await expect(list).toBeVisible();

    await list.locator(".m3-select__item", { hasText: "Testing" }).click();

    await expect(trigger.locator(".m3-select__value")).toHaveText("Testing");
  });

  test("description input accepts text", async ({ page }) => {
    await page.locator('button[aria-label="Book manually"]').first().click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    const textarea = dialog.getByPlaceholder("What did you do?");
    await textarea.fill("Reviewed the PR");
    await expect(textarea).toHaveValue("Reviewed the PR");
  });

  test("escape closes dialog without creating entry", async ({ page }) => {
    await page.locator('button[aria-label="Book manually"]').first().click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();

    const entries = await page.request.get("http://localhost:3001/api/timelog");
    const body = await entries.json();
    expect(body).toHaveLength(0);
  });

  test("save creates entry visible in timelog", async ({ page }) => {
    await page.locator('button[aria-label="Book manually"]').first().click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    const textarea = dialog.getByPlaceholder("What did you do?");
    await textarea.fill("Implemented feature X");

    const saveBtn = dialog.getByRole("button", { name: "Save" });
    await expect(saveBtn).toBeEnabled();
    await saveBtn.click();

    await expect(dialog).not.toBeVisible();

    await page.locator("nav").getByText("Time Tracking").click();
    await expect(page.getByText("Fix login validation").first()).toBeVisible();
  });
});
