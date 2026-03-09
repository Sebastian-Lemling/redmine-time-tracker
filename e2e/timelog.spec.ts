import { test, expect } from "@playwright/test";

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function seedEntry(
  page: import("@playwright/test").Page,
  overrides: Record<string, unknown> = {},
) {
  const now = new Date().toISOString();
  await page.request.post("http://localhost:3001/api/timelog", {
    data: {
      issueId: 101,
      issueSubject: "Fix login validation",
      projectId: 1,
      projectName: "Project Alpha",
      startTime: now,
      endTime: now,
      duration: 15,
      originalDuration: 15,
      description: "Worked on login",
      date: todayStr(),
      activityId: 9,
      ...overrides,
    },
  });
}

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
});

test.describe("Time log", () => {
  test("shows empty state when no entries", async ({ page }) => {
    await page.goto("/#/timelog");
    await expect(page.getByText("No entries")).toBeVisible();
  });

  test("shows entries in month view after seeding", async ({ page }) => {
    await seedEntry(page);
    await page.goto("/#/timelog");
    await expect(page.getByText("Fix login validation").first()).toBeVisible();
  });

  test("day detail panel shows entry details", async ({ page }) => {
    await seedEntry(page);
    await page.goto("/#/timelog");
    await expect(page.getByText("Fix login validation").first()).toBeVisible();
    await expect(page.getByRole("tab", { name: /Drafts/ })).toBeVisible();
    await expect(page.getByText("0.25h").first()).toBeVisible();
  });

  test("delete entry shows snackbar with undo", async ({ page }) => {
    await seedEntry(page);
    await page.goto("/#/timelog");
    await expect(page.getByText("Fix login validation").first()).toBeVisible();

    const deleteBtn = page.getByRole("button", { name: "Delete" }).first();
    await deleteBtn.click({ force: true });

    const snackbar = page.locator("[role='status'][aria-live='polite']");
    await expect(snackbar).toBeVisible();
    await expect(snackbar.getByText("Entry deleted")).toBeVisible();
    await expect(snackbar.getByText("Undo")).toBeVisible();
  });

  test("undo restores deleted entry", async ({ page }) => {
    await seedEntry(page);
    await page.goto("/#/timelog");
    await expect(page.getByText("Fix login validation").first()).toBeVisible();

    const deleteBtn = page.getByRole("button", { name: "Delete" }).first();
    await deleteBtn.click({ force: true });

    const snackbar = page.locator("[role='status'][aria-live='polite']");
    await expect(snackbar).toBeVisible();
    await snackbar.getByText("Undo").click();

    await expect(page.getByText("Fix login validation").first()).toBeVisible();
  });

  test("edit entry opens edit dialog", async ({ page }) => {
    await seedEntry(page);
    await page.goto("/#/timelog");
    await expect(page.getByText("Fix login validation").first()).toBeVisible();

    const editBtn = page.getByRole("button", { name: "Edit" }).first();
    await editBtn.click({ force: true });

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Edit entry")).toBeVisible();
  });

  test("batch sync selected entries", async ({ page }) => {
    await seedEntry(page);
    await page.goto("/#/timelog");
    await expect(page.getByText("Fix login validation").first()).toBeVisible();

    const checkbox = page.getByRole("checkbox").first();
    await checkbox.click();

    const syncBtn = page.getByText("Send").first();
    await syncBtn.click();

    await page.waitForTimeout(1000);
  });
});
