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

test.describe("Description and comments", () => {
  test("expand description shows loaded text", async ({ page }) => {
    const panel = page.locator(ticketPanel);
    const card = panel.locator(".ticket-card", { has: page.getByText("#101") });

    await card.locator("button.card-body__subject-row").click();

    const description = card.locator(".card-body__description");
    await expect(description.getByText("Login validation needs regex check")).toBeVisible({
      timeout: 5000,
    });
  });

  test("shows comments with author", async ({ page }) => {
    const panel = page.locator(ticketPanel);
    const card = panel.locator(".ticket-card", { has: page.getByText("#101") });

    await card.locator("button.card-body__subject-row").click();

    const comments = card.locator(".card-body__comments");
    await expect(comments.getByText("Started working on the regex patterns")).toBeVisible({
      timeout: 5000,
    });
    await expect(
      comments.locator(".card-body__comment-author").getByText("Test User"),
    ).toBeVisible();
  });

  test("shows no description for empty description", async ({ page }) => {
    const panel = page.locator(ticketPanel);
    const card = panel.locator(".ticket-card", { has: page.getByText("#102") });

    await card.locator("button.card-body__subject-row").click();

    const description = card.locator(".card-body__description");
    await expect(description.getByText("No description")).toBeVisible({ timeout: 5000 });
  });

  test("shows due date badge", async ({ page }) => {
    const panel = page.locator(ticketPanel);
    const card = panel.locator(".ticket-card", { has: page.getByText("#101") });

    await card.locator("button.card-body__subject-row").click();

    await expect(card.locator(".ticket-due")).toBeVisible({ timeout: 5000 });
  });
});
