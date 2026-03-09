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

test.describe("Issue mutations", () => {
  test("change issue status via ChipMenu", async ({ page }) => {
    const card = page
      .locator(ticketPanel)
      .locator(".ticket-card", { hasText: "Fix login validation" });
    const statusChip = card.locator(".chip-menu__trigger", { hasText: "In Progress" });
    await statusChip.click();

    const listbox = page.locator('[role="listbox"]');
    await expect(listbox).toBeVisible();
    await listbox.locator('[role="option"]', { hasText: "Resolved" }).click();

    const snackbar = page.locator('[role="status"][aria-live="polite"]');
    await expect(snackbar).toContainText("Resolved", { timeout: 10000 });

    await expect(card.locator(".chip-menu__trigger", { hasText: "Resolved" })).toBeVisible();
  });

  test("change issue tracker via ChipMenu", async ({ page }) => {
    const card = page
      .locator(ticketPanel)
      .locator(".ticket-card", { hasText: "Fix login validation" });
    const trackerChip = card.locator(".chip-menu__trigger", { hasText: "Bug" });
    await trackerChip.click();

    const listbox = page.locator('[role="listbox"]');
    await expect(listbox).toBeVisible();
    await listbox.locator('[role="option"]', { hasText: "Feature" }).click();

    const snackbar = page.locator('[role="status"][aria-live="polite"]');
    await expect(snackbar).toContainText("Feature", { timeout: 10000 });

    await expect(card.locator(".chip-menu__trigger", { hasText: "Feature" }).first()).toBeVisible();
  });

  test("change done ratio via ChipMenu", async ({ page }) => {
    const card = page
      .locator(ticketPanel)
      .locator(".ticket-card", { hasText: "Fix login validation" });
    const doneChip = card.locator(".chip-menu__trigger", { hasText: "30%" });
    await expect(doneChip).toBeVisible();
    await doneChip.click();

    const listbox = page.locator('[role="listbox"]');
    await expect(listbox).toBeVisible();
    await listbox.locator('[role="option"]', { hasText: "50%" }).click();

    const snackbar = page.locator('[role="status"][aria-live="polite"]');
    await expect(snackbar).toContainText("50%", { timeout: 10000 });

    await expect(card.locator(".chip-menu__trigger", { hasText: "50%" })).toBeVisible();
  });

  test("assignee menu shows members and closes on selection", async ({ page }) => {
    const card = page
      .locator(ticketPanel)
      .locator(".ticket-card", { hasText: "Fix login validation" });
    const assigneeTrigger = card.locator(".chip-menu__trigger", { hasText: "Test User" });
    await assigneeTrigger.click();

    const listbox = page.locator('[role="listbox"]');
    await expect(listbox).toBeVisible();
    await expect(listbox.locator('[role="option"]', { hasText: "Test User" })).toBeVisible({
      timeout: 5000,
    });

    // Click the already-selected member — menu closes without mutation (same assignee guard)
    await listbox.locator('[role="option"]', { hasText: "Test User" }).click();
    await expect(listbox).not.toBeVisible();
  });

  test("change version via ChipMenu", async ({ page }) => {
    const card = page
      .locator(ticketPanel)
      .locator(".ticket-card", { hasText: "Fix login validation" });
    const versionChip = card.locator(".chip-menu__trigger", { hasText: "No version" });
    await versionChip.click();

    const listbox = page.locator('[role="listbox"]');
    await expect(listbox).toBeVisible();
    await listbox.locator('[role="option"]', { hasText: "v1.0" }).click();

    const snackbar = page.locator('[role="status"][aria-live="polite"]');
    await expect(snackbar).toContainText("v1.0", { timeout: 10000 });

    await expect(card.locator(".chip-menu__trigger", { hasText: "v1.0" })).toBeVisible();
  });
});
