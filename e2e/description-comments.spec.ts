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

test.describe("ConversationDialog — Description tab", () => {
  test("opens dialog and shows description text", async ({ page }) => {
    await openConversationDialog(page, "#101");

    const dialog = page.locator(".conv-dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Login validation needs regex check")).toBeVisible({
      timeout: 5000,
    });
  });

  test("shows issue ID and subject in header", async ({ page }) => {
    await openConversationDialog(page, "#101");

    const dialog = page.locator(".conv-dialog");
    await expect(dialog.locator(".conv-dialog__issue-id")).toContainText("#101");
    await expect(dialog.locator(".conv-dialog__issue-subject")).toContainText(
      "Fix login validation",
    );
  });

  test("shows metadata chips (tracker, status, priority)", async ({ page }) => {
    await openConversationDialog(page, "#101");

    const dialog = page.locator(".conv-dialog");
    const chips = dialog.locator(".conv-dialog__meta-chips");
    await expect(chips).toBeVisible({ timeout: 5000 });
    await expect(chips.getByText("Bug")).toBeVisible();
    await expect(chips.getByText("In Progress")).toBeVisible();
    await expect(chips.getByText("Normal")).toBeVisible();
  });

  test("shows metadata grid with assignee and done ratio", async ({ page }) => {
    await openConversationDialog(page, "#101");

    const dialog = page.locator(".conv-dialog");
    const grid = dialog.locator(".conv-dialog__meta-grid");
    await expect(grid).toBeVisible({ timeout: 5000 });
    await expect(grid.getByText("Test User")).toBeVisible();
    await expect(grid.getByText("30%")).toBeVisible();
  });

  test("shows progress bar for done ratio", async ({ page }) => {
    await openConversationDialog(page, "#101");

    const dialog = page.locator(".conv-dialog");
    const progressBar = dialog.locator(".conv-dialog__meta-progress-bar");
    await expect(progressBar).toBeVisible({ timeout: 5000 });
    await expect(progressBar).toHaveCSS("width", /\d+/);
  });

  test("shows hours (spent/estimated)", async ({ page }) => {
    await openConversationDialog(page, "#101");

    const dialog = page.locator(".conv-dialog");
    const grid = dialog.locator(".conv-dialog__meta-grid");
    await expect(grid.getByText("2.5h")).toBeVisible({ timeout: 5000 });
    await expect(grid.getByText("8h")).toBeVisible();
  });

  test("shows due date in metadata", async ({ page }) => {
    await openConversationDialog(page, "#101");

    const dialog = page.locator(".conv-dialog");
    const row = dialog.locator(".conv-dialog__meta-row").filter({ hasText: /Due/ });
    await expect(row.locator(".conv-dialog__meta-value")).toBeVisible({ timeout: 5000 });
  });

  test("shows no description text for empty description", async ({ page }) => {
    await openConversationDialog(page, "#102");

    const dialog = page.locator(".conv-dialog");
    await expect(dialog.locator(".conv-dialog__no-content")).toBeVisible({ timeout: 5000 });
  });

  test("shows attachments section with file names", async ({ page }) => {
    await openConversationDialog(page, "#101");

    const dialog = page.locator(".conv-dialog");
    const attachments = dialog.locator(".conv-dialog__attachments");
    await expect(attachments).toBeVisible({ timeout: 5000 });
    await expect(attachments.getByText("screenshot.png")).toBeVisible();
    await expect(attachments.getByText("debug.log")).toBeVisible();
  });

  test("shows file sizes in attachments", async ({ page }) => {
    await openConversationDialog(page, "#101");

    const dialog = page.locator(".conv-dialog");
    const attachments = dialog.locator(".conv-dialog__attachments");
    await expect(attachments).toBeVisible({ timeout: 5000 });
    await expect(attachments.getByText("240 KB")).toBeVisible();
    await expect(attachments.getByText("1 KB")).toBeVisible();
  });

  test("shows attachment count in header", async ({ page }) => {
    await openConversationDialog(page, "#101");

    const dialog = page.locator(".conv-dialog");
    await expect(dialog.locator(".conv-dialog__attachments-header").getByText("(2)")).toBeVisible({
      timeout: 5000,
    });
  });
});

test.describe("ConversationDialog — Comments tab", () => {
  test("switches to comments tab and shows comment", async ({ page }) => {
    await openConversationDialog(page, "#101");

    const dialog = page.locator(".conv-dialog");
    await dialog.locator('[role="tab"]', { hasText: "Comments" }).click();
    await expect(dialog.getByText("Started working on the regex patterns")).toBeVisible({
      timeout: 5000,
    });
  });

  test("shows comment author", async ({ page }) => {
    await openConversationDialog(page, "#101");

    const dialog = page.locator(".conv-dialog");
    await dialog.locator('[role="tab"]', { hasText: "Comments" }).click();
    await expect(dialog.locator(".conv-comment__author").getByText("Test User")).toBeVisible({
      timeout: 5000,
    });
  });

  test("shows no comments message for issue without comments", async ({ page }) => {
    await openConversationDialog(page, "#102");

    const dialog = page.locator(".conv-dialog");
    await dialog.locator('[role="tab"]', { hasText: "Comments" }).click();
    await expect(dialog.locator(".conv-dialog__no-content")).toBeVisible({ timeout: 5000 });
  });

  test("shows comment count badge on tab", async ({ page }) => {
    await openConversationDialog(page, "#101");

    const dialog = page.locator(".conv-dialog");
    const commentsTab = dialog.locator('[role="tab"]', { hasText: "Comments" });
    await expect(commentsTab.locator(".conv-dialog__tab-badge")).toContainText("1");
  });

  test("shows comment input area on comments tab", async ({ page }) => {
    await openConversationDialog(page, "#101");

    const dialog = page.locator(".conv-dialog");
    await dialog.locator('[role="tab"]', { hasText: "Comments" }).click();
    await expect(dialog.locator(".conv-dialog__input")).toBeVisible({ timeout: 5000 });
  });
});

test.describe("ConversationDialog — Tab switching & Close", () => {
  test("description tab is active by default when opened via subject click", async ({ page }) => {
    await openConversationDialog(page, "#101");

    const dialog = page.locator(".conv-dialog");
    const descTab = dialog.locator('[role="tab"]', { hasText: "Description" });
    await expect(descTab).toHaveAttribute("aria-selected", "true");
  });

  test("switching tabs updates active state", async ({ page }) => {
    await openConversationDialog(page, "#101");

    const dialog = page.locator(".conv-dialog");
    const commentsTab = dialog.locator('[role="tab"]', { hasText: "Comments" });
    await commentsTab.click();
    await expect(commentsTab).toHaveAttribute("aria-selected", "true");

    const descTab = dialog.locator('[role="tab"]', { hasText: "Description" });
    await expect(descTab).toHaveAttribute("aria-selected", "false");
  });

  test("closes dialog with X button", async ({ page }) => {
    await openConversationDialog(page, "#101");

    const dialog = page.locator(".conv-dialog");
    await expect(dialog).toBeVisible();

    await dialog.locator(".conv-dialog__close").click();
    await expect(dialog).not.toBeVisible();
  });

  test("closes dialog with Escape key", async ({ page }) => {
    await openConversationDialog(page, "#101");

    const dialog = page.locator(".conv-dialog");
    await expect(dialog).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
  });

  test("closes dialog by clicking backdrop", async ({ page }) => {
    await openConversationDialog(page, "#101");

    const dialog = page.locator(".conv-dialog");
    await expect(dialog).toBeVisible();

    await page.locator(".conv-dialog__backdrop").click({ position: { x: 10, y: 10 } });
    await expect(dialog).not.toBeVisible();
  });
});

test.describe("ConversationDialog — Copy button", () => {
  test("copy button is visible in tab bar", async ({ page }) => {
    await openConversationDialog(page, "#101");

    const dialog = page.locator(".conv-dialog");
    await expect(dialog.locator(".conv-dialog__copy-btn")).toBeVisible();
  });
});

test.describe("ConversationDialog — External link", () => {
  test("shows external link to Redmine issue", async ({ page }) => {
    await openConversationDialog(page, "#101");

    const dialog = page.locator(".conv-dialog");
    const link = dialog.locator(".conv-dialog__issue-link");
    await expect(link).toHaveAttribute("href", /\/issues\/101$/);
    await expect(link).toHaveAttribute("target", "_blank");
  });
});
