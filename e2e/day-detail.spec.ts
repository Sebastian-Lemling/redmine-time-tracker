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

test.describe("DayDetailPanel", () => {
  test("switch tabs between Drafts and Sent", async ({ page }) => {
    await seedEntry(page);
    await page.goto("/#/timelog");

    const draftsTab = page.getByRole("tab", { name: /Drafts/ });
    const sentTab = page.getByRole("tab", { name: /Sent/ });

    await expect(draftsTab).toBeVisible();
    await expect(draftsTab).toHaveAttribute("aria-selected", "true");
    await expect(sentTab).toHaveAttribute("aria-selected", "false");

    await sentTab.click();

    await expect(sentTab).toHaveAttribute("aria-selected", "true");
    await expect(draftsTab).toHaveAttribute("aria-selected", "false");
  });

  test("Select All checkbox selects all entries", async ({ page }) => {
    await seedEntry(page, { issueId: 101, description: "First entry" });
    await seedEntry(page, {
      issueId: 202,
      issueSubject: "Update dashboard",
      description: "Second entry",
    });
    await page.goto("/#/timelog");

    await expect(page.locator(".de-card").first()).toBeVisible();

    const selectAllCheckbox = page.locator(".de-checkbox[role='checkbox']").first();
    await selectAllCheckbox.click();

    await expect(page.locator(".de-toolbar__label")).toHaveText("2 selected");
  });

  test("single checkbox shows count", async ({ page }) => {
    await seedEntry(page, { issueId: 101, description: "First entry" });
    await seedEntry(page, {
      issueId: 202,
      issueSubject: "Update dashboard",
      description: "Second entry",
    });
    await page.goto("/#/timelog");

    await expect(page.locator(".de-card").first()).toBeVisible();

    const firstEntryCheckbox = page
      .locator(".de-card")
      .first()
      .locator(".de-checkbox[role='checkbox']");
    await firstEntryCheckbox.click();

    await expect(page.locator(".de-toolbar__label")).toHaveText("1 selected");
  });

  test("sort dropdown changes sort", async ({ page }) => {
    await seedEntry(page);
    await page.goto("/#/timelog");

    await expect(page.locator(".de-card").first()).toBeVisible();

    const sortBtn = page.locator(".de-sort__btn");
    await sortBtn.click();

    const sortMenu = page.locator(".de-sort__menu");
    await expect(sortMenu).toBeVisible();

    const projectOption = sortMenu.getByRole("option", { name: "Project" });
    await projectOption.click();

    await expect(sortMenu).not.toBeVisible();
    await expect(sortBtn).toContainText("Project");
  });

  test("duration stepper inline changes duration", async ({ page }) => {
    await seedEntry(page);
    await page.goto("/#/timelog");

    await expect(page.locator(".de-card").first()).toBeVisible();
    await expect(page.locator(".de-stepper__value").first()).toHaveText("0.25h");

    const increaseBtn = page.locator(".de-stepper__btn[aria-label='15 minutes more']").first();
    await increaseBtn.click();

    await expect(page.locator(".de-stepper__value").first()).toHaveText("0.5h");
  });

  test("empty state when no entries shows global empty message", async ({ page }) => {
    await page.goto("/#/timelog");

    await expect(page.getByText("No entries yet")).toBeVisible();
  });

  test("empty state Sent tab shows Nothing sent yet", async ({ page }) => {
    await seedEntry(page);
    await page.goto("/#/timelog");

    const sentTab = page.getByRole("tab", { name: /Sent/ });
    await sentTab.click();

    await expect(page.locator(".de-empty__title")).toBeVisible();
    await expect(page.locator(".de-empty__title")).toHaveText("Nothing sent yet");
  });
});
