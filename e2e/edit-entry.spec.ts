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

test.describe("Edit entry dialog", () => {
  test("duration stepper plus increases by 15 min", async ({ page }) => {
    await seedEntry(page);
    await page.goto("/#/timelog");
    await expect(page.getByText("Fix login validation").first()).toBeVisible();

    const editBtn = page.getByRole("button", { name: "Edit" }).first();
    await editBtn.click({ force: true });

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Edit entry")).toBeVisible();
    await expect(dialog.getByText("0.25h")).toBeVisible();

    await dialog.getByRole("button", { name: "15 minutes more" }).click();

    await expect(dialog.getByText("0.5h")).toBeVisible();
  });

  test("duration stepper minus decreases by 15 min", async ({ page }) => {
    await seedEntry(page, { duration: 30, originalDuration: 30 });
    await page.goto("/#/timelog");
    await expect(page.getByText("Fix login validation").first()).toBeVisible();

    const editBtn = page.getByRole("button", { name: "Edit" }).first();
    await editBtn.click({ force: true });

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("0.5h")).toBeVisible();

    await dialog.getByRole("button", { name: "15 minutes less" }).click();

    await expect(dialog.getByText("0.25h")).toBeVisible();
  });

  test("activity change updates selected value", async ({ page }) => {
    await seedEntry(page);
    await page.goto("/#/timelog");
    await expect(page.getByText("Fix login validation").first()).toBeVisible();

    const editBtn = page.getByRole("button", { name: "Edit" }).first();
    await editBtn.click({ force: true });

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    const trigger = dialog.locator(".m3-select__trigger");
    await expect(trigger).toBeVisible();
    await expect(trigger.locator(".m3-select__value")).toHaveText("Development");

    await trigger.click();

    const listbox = page.getByRole("listbox", { name: "Activity" });
    await expect(listbox).toBeVisible();
    await listbox.getByRole("option", { name: "Testing" }).click();

    await expect(trigger.locator(".m3-select__value")).toHaveText("Testing");
  });

  test("description change persists after save", async ({ page }) => {
    await seedEntry(page);
    await page.goto("/#/timelog");
    await expect(page.getByText("Fix login validation").first()).toBeVisible();

    const editBtn = page.getByRole("button", { name: "Edit" }).first();
    await editBtn.click({ force: true });

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    const textarea = dialog.getByPlaceholder("What did you do?");
    await expect(textarea).toBeVisible();
    await expect(textarea).toHaveValue("Worked on login");

    await textarea.clear();
    await textarea.fill("Updated validation regex");

    await dialog.getByRole("button", { name: "Save" }).click();
    await expect(dialog).not.toBeVisible();

    await expect(page.getByText("Updated validation regex").first()).toBeVisible();
  });

  test("save closes dialog and updates entry", async ({ page }) => {
    await seedEntry(page);
    await page.goto("/#/timelog");
    await expect(page.getByText("Fix login validation").first()).toBeVisible();

    const editBtn = page.getByRole("button", { name: "Edit" }).first();
    await editBtn.click({ force: true });

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    await dialog.getByRole("button", { name: "15 minutes more" }).click();
    await expect(dialog.getByText("0.5h")).toBeVisible();

    await dialog.getByRole("button", { name: "Save" }).click();

    await expect(dialog).not.toBeVisible();
    await expect(page.getByText("0.5h").first()).toBeVisible();
  });

  test("cancel discards changes and closes dialog", async ({ page }) => {
    await seedEntry(page);
    await page.goto("/#/timelog");
    await expect(page.getByText("Fix login validation").first()).toBeVisible();
    await expect(page.getByText("0.25h").first()).toBeVisible();

    const editBtn = page.getByRole("button", { name: "Edit" }).first();
    await editBtn.click({ force: true });

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    await dialog.getByRole("button", { name: "15 minutes more" }).click();
    await expect(dialog.getByText("0.5h")).toBeVisible();

    await page.keyboard.press("Escape");

    await expect(dialog).not.toBeVisible();
    await expect(page.getByText("0.25h").first()).toBeVisible();
  });
});
