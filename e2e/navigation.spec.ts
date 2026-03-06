import { test, expect } from "@playwright/test";

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function seedEntry(page: import("@playwright/test").Page) {
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
      description: "",
      date: todayStr(),
      activityId: 9,
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

test.describe("Navigation", () => {
  test("switches from Tickets to Time Tracking and back", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("nav").getByText("Tickets")).toBeVisible();

    await page.locator("nav").getByText("Time Tracking").click();
    await expect(page).toHaveURL(/#\/timelog/);

    await page.locator("nav").getByText("Tickets").click();
    await expect(page).toHaveURL(/#\/tickets/);
  });

  test("direct hash navigation to timelog shows content", async ({ page }) => {
    await seedEntry(page);
    await page.goto("/#/timelog");
    await expect(page.getByText("Fix login validation").first()).toBeVisible();
  });

  test("month navigation with prev/next arrows", async ({ page }) => {
    await seedEntry(page);
    await page.goto("/#/timelog");
    await expect(page.getByText("Fix login validation").first()).toBeVisible();

    const prevBtn = page.getByRole("button", { name: "Previous month" });
    const nextBtn = page.getByRole("button", { name: "Next month" });

    await expect(prevBtn).toBeVisible();
    await prevBtn.click();
    await page.waitForTimeout(300);

    await nextBtn.click();
    await page.waitForTimeout(300);
  });

  test("Today button navigates back to current month", async ({ page }) => {
    await seedEntry(page);
    await page.goto("/#/timelog");
    await expect(page.getByText("Fix login validation").first()).toBeVisible();

    await page.getByRole("button", { name: "Previous month" }).click();
    await page.waitForTimeout(300);

    await page.getByRole("button", { name: "Today" }).click();
    await page.waitForTimeout(300);

    const now = new Date();
    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    await expect(
      page.getByText(`${monthNames[now.getMonth()]} ${now.getFullYear()}`),
    ).toBeVisible();
  });
});
