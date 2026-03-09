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

function openConversationDialog(page: import("@playwright/test").Page, issueText: string) {
  const card = page
    .locator(ticketPanel)
    .locator(".ticket-card", { has: page.getByText(issueText) });
  return card.locator(".card-body__subject--clickable").click();
}

test.describe("ConversationDialog — Edit description", () => {
  test("edit pencil button is visible on description", async ({ page }) => {
    await openConversationDialog(page, "#101");

    const dialog = page.locator(".conv-dialog");
    await expect(dialog.locator(".conv-dialog__edit-btn")).toBeVisible({ timeout: 5000 });
  });

  test("clicking edit button shows editor", async ({ page }) => {
    await openConversationDialog(page, "#101");

    const dialog = page.locator(".conv-dialog");
    await dialog.locator(".conv-dialog__edit-btn").click();

    await expect(dialog.locator(".conv-dialog__description-edit")).toBeVisible({ timeout: 5000 });
  });

  test("cancel edit returns to view mode", async ({ page }) => {
    await openConversationDialog(page, "#101");

    const dialog = page.locator(".conv-dialog");
    await dialog.locator(".conv-dialog__edit-btn").click();
    await expect(dialog.locator(".conv-dialog__description-edit")).toBeVisible({ timeout: 5000 });

    await dialog.locator(".conv-dialog__btn--text").click();

    await expect(dialog.locator(".conv-dialog__description-edit")).not.toBeVisible();
    await expect(dialog.locator(".conv-dialog__description-body")).toBeVisible();
  });

  test("edit button shown on empty description too", async ({ page }) => {
    await openConversationDialog(page, "#102");

    const dialog = page.locator(".conv-dialog");
    await expect(dialog.locator(".conv-dialog__no-content")).toBeVisible({ timeout: 5000 });
    await expect(dialog.locator(".conv-dialog__edit-btn")).toBeVisible();
  });

  test("save button is visible in edit mode", async ({ page }) => {
    await openConversationDialog(page, "#101");

    const dialog = page.locator(".conv-dialog");
    await dialog.locator(".conv-dialog__edit-btn").click();

    await expect(dialog.locator(".conv-dialog__btn--filled")).toBeVisible({ timeout: 5000 });
    await expect(dialog.locator(".conv-dialog__btn--filled")).toContainText("Save");
  });
});

test.describe("ConversationDialog — Comments tab via card button", () => {
  test("opening comments tab via MessageSquare button on card", async ({ page }) => {
    const card = page.locator(ticketPanel).locator(".ticket-card", { has: page.getByText("#101") });

    await card.locator(".card-body__action-btn").click();

    const dialog = page.locator(".conv-dialog");
    await expect(dialog).toBeVisible();

    const commentsTab = dialog.locator('[role="tab"]', { hasText: "Comments" });
    await expect(commentsTab).toHaveAttribute("aria-selected", "true");
  });

  test("comment input area has send button", async ({ page }) => {
    await openConversationDialog(page, "#101");

    const dialog = page.locator(".conv-dialog");
    await dialog.locator('[role="tab"]', { hasText: "Comments" }).click();

    await expect(dialog.locator(".conv-dialog__input")).toBeVisible({ timeout: 5000 });
    await expect(dialog.locator(".conv-dialog__send-btn")).toBeVisible();
  });

  test("send button is disabled when comment is empty", async ({ page }) => {
    await openConversationDialog(page, "#101");

    const dialog = page.locator(".conv-dialog");
    await dialog.locator('[role="tab"]', { hasText: "Comments" }).click();

    await expect(dialog.locator(".conv-dialog__send-btn")).toBeDisabled();
  });
});
