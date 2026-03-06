import { test, expect } from "@playwright/test";

const SCREENSHOT_DIR = "docs/screenshots";
const ticketPanel = ".ticket-panel--left";

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

test.describe("README screenshots", () => {
  test("01 - ticket list light mode", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    await expect(page.locator(ticketPanel).getByText("Fix login validation")).toBeVisible();
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/tickets-light.png` });
  });

  test("02 - ticket list dark mode", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("theme-mode", "dark");
    });
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    await expect(page.locator(ticketPanel).getByText("Fix login validation")).toBeVisible();
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/tickets-dark.png` });
  });

  test("03 - active timer", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    await expect(page.locator(ticketPanel).getByText("Fix login validation")).toBeVisible();

    // Start timer on first ticket
    const startBtn = page.locator('button[aria-label="Start timer"]').first();
    await startBtn.click();
    await expect(page.locator(".active-timer-bar")).toBeVisible();
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/timer-active.png` });
  });

  test("04 - time tracking month view", async ({ page }) => {
    // Seed entries across multiple days for a realistic calendar
    const today = new Date().getDate();
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();

    // Spread entries across the month
    const entryDays = [];
    for (let d = 1; d <= Math.min(today, daysInMonth); d++) {
      if (d % 2 === 1 || d === today) entryDays.push(d);
    }

    for (const day of entryDays) {
      const count = day === today ? 3 : day % 3 === 0 ? 2 : 1;
      for (let i = 0; i < count; i++) {
        await seedEntry(page, {
          date: dateStr(day),
          duration: 15 + (day % 4) * 15,
          issueId: i % 2 === 0 ? 101 : 102,
          issueSubject: i % 2 === 0 ? "Fix login validation" : "Add dark mode support",
          projectName: i % 2 === 0 ? "Project Alpha" : "Project Alpha",
          description: i % 2 === 0 ? "Worked on login" : "Dark mode implementation",
        });
      }
    }

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/#/timelog");
    await expect(page.getByText("Fix login validation").first()).toBeVisible();
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/timelog-light.png` });
  });

  test("05 - time tracking dark mode", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("theme-mode", "dark");
    });

    const today = new Date().getDate();
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    const entryDays = [];
    for (let d = 1; d <= Math.min(today, daysInMonth); d++) {
      if (d % 2 === 1 || d === today) entryDays.push(d);
    }
    for (const day of entryDays) {
      const count = day === today ? 3 : day % 3 === 0 ? 2 : 1;
      for (let i = 0; i < count; i++) {
        await seedEntry(page, {
          date: dateStr(day),
          duration: 15 + (day % 4) * 15,
          issueId: i % 2 === 0 ? 101 : 102,
          issueSubject: i % 2 === 0 ? "Fix login validation" : "Add dark mode support",
          description: i % 2 === 0 ? "Worked on login" : "Dark mode implementation",
        });
      }
    }

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/#/timelog");
    await expect(page.getByText("Fix login validation").first()).toBeVisible();
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/timelog-dark.png` });
  });

  test("06 - search panel with results", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    await expect(page.locator(ticketPanel).getByText("Fix login validation")).toBeVisible();

    // Type a search query
    const searchPanel = page.locator(".ticket-panel--right");
    const searchInput = searchPanel.getByPlaceholder("Search Redmine…");
    await searchInput.fill("login");
    await page.waitForTimeout(600);

    await expect(searchPanel.getByText("Fix login validation")).toBeVisible();
    await page.screenshot({ path: `${SCREENSHOT_DIR}/search-results.png` });
  });

  test("07 - booking dialog", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    await expect(page.locator(ticketPanel).getByText("Fix login validation")).toBeVisible();

    // Open manual booking dialog
    await page.locator('button[aria-label="Book manually"]').first().click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/booking-dialog.png` });
  });
});
