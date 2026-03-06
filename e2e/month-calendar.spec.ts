import { test, expect } from "@playwright/test";

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function dateStr(day: number) {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
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

test.describe("MonthCalendar", () => {
  test("click calendar day selects it", async ({ page }) => {
    await seedEntry(page);
    await page.goto("/#/timelog");

    const todayCell = page.locator("button.cal-cell--selected");
    await expect(todayCell).toBeVisible();
    await expect(todayCell).toHaveAttribute("aria-pressed", "true");

    const todayDay = new Date().getDate();
    const targetDay = todayDay >= 3 ? 1 : 3;

    const targetCell = page.locator(
      `button.cal-cell:not(.cal-cell--empty) .cal-day:text-is("${targetDay}")`,
    );
    await targetCell.click();

    const newSelected = page.locator("button.cal-cell--selected");
    await expect(newSelected).toHaveAttribute("aria-pressed", "true");

    const selectedDayText = newSelected.locator(".cal-day");
    await expect(selectedDayText).toHaveText(String(targetDay));
  });

  test("duration shown on calendar day", async ({ page }) => {
    await seedEntry(page);
    await page.goto("/#/timelog");

    const selectedCell = page.locator("button.cal-cell--selected");
    await expect(selectedCell).toBeVisible();

    const durationLabel = selectedCell.locator(".cal-hours__value");
    await expect(durationLabel).toBeVisible();
    await expect(durationLabel).toHaveText("0:15");
  });

  test("drafts chip navigates to first unsynced day", async ({ page }) => {
    const todayDay = new Date().getDate();
    const unsyncedDay = todayDay >= 3 ? 1 : 3;

    await seedEntry(page, { date: dateStr(unsyncedDay) });
    await seedEntry(page);
    await page.goto("/#/timelog");

    await expect(page.locator("button.cal-cell--selected")).toBeVisible();

    const draftsChip = page.locator(".cal-footer__chip--warn");
    await expect(draftsChip).toBeVisible();
    await draftsChip.click();

    const selectedCell = page.locator("button.cal-cell--selected");
    await expect(selectedCell).toHaveAttribute("aria-pressed", "true");

    const selectedDayText = selectedCell.locator(".cal-day");
    await expect(selectedDayText).toHaveText(String(unsyncedDay));
  });

  test("heat map shows intensity levels", async ({ page }) => {
    const todayDay = new Date().getDate();
    const days = [1, 2, 3, 4].map((d) => (d === todayDay ? (d < 28 ? d + 10 : d - 10) : d));

    await seedEntry(page, { date: dateStr(days[0]) });

    for (let i = 0; i < 2; i++) {
      await seedEntry(page, { date: dateStr(days[1]), issueId: 102 + i });
    }

    for (let i = 0; i < 4; i++) {
      await seedEntry(page, { date: dateStr(days[2]), issueId: 200 + i });
    }

    for (let i = 0; i < 8; i++) {
      await seedEntry(page, { date: dateStr(days[3]), issueId: 300 + i });
    }

    await page.goto("/#/timelog");

    await expect(page.locator("button.cal-cell--selected")).toBeVisible();

    const heatCells = page.locator("button.cal-cell[class*='cal-cell--heat-']");
    await expect(heatCells.first()).toBeVisible();

    const count = await heatCells.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });
});
