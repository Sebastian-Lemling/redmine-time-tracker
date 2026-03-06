import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useTicketGrouping, PROJECT_COLORS, FAVORITES_GROUP_KEY } from "./useTicketGrouping";
import type { RedmineIssue, MultiTimerMap } from "@/types/redmine";

function makeIssue(id: number, project: string): RedmineIssue {
  return {
    id,
    subject: `Issue ${id}`,
    project: { id, name: project },
    tracker: { id: 1, name: "Bug" },
    status: { id: 1, name: "New" },
    priority: { id: 2, name: "Normal" },
    done_ratio: 0,
  } as RedmineIssue;
}

describe("useTicketGrouping", () => {
  it("groups issues by project.name", () => {
    const issues = [makeIssue(1, "Alpha"), makeIssue(2, "Beta"), makeIssue(3, "Alpha")];
    const { result } = renderHook(() =>
      useTicketGrouping({ issues, timers: {}, showTrackedOnly: false }),
    );
    expect(result.current.grouped["Alpha"]).toHaveLength(2);
    expect(result.current.grouped["Beta"]).toHaveLength(1);
  });

  it("returns allProjectNames sorted alphabetically", () => {
    const issues = [makeIssue(1, "Zeta"), makeIssue(2, "Alpha"), makeIssue(3, "Mu")];
    const { result } = renderHook(() =>
      useTicketGrouping({ issues, timers: {}, showTrackedOnly: false }),
    );
    expect(result.current.allProjectNames).toEqual(["Alpha", "Mu", "Zeta"]);
  });

  it("empty issues -> empty groups", () => {
    const { result } = renderHook(() =>
      useTicketGrouping({ issues: [], timers: {}, showTrackedOnly: false }),
    );
    expect(result.current.allProjectNames).toEqual([]);
    expect(result.current.grouped).toEqual({});
  });

  it("single project -> one group", () => {
    const issues = [makeIssue(1, "Only"), makeIssue(2, "Only")];
    const { result } = renderHook(() =>
      useTicketGrouping({ issues, timers: {}, showTrackedOnly: false }),
    );
    expect(result.current.allProjectNames).toEqual(["Only"]);
    expect(result.current.grouped["Only"]).toHaveLength(2);
  });

  it("assigns deterministic color per project", () => {
    const issues = [makeIssue(1, "Alpha"), makeIssue(2, "Beta")];
    const { result } = renderHook(() =>
      useTicketGrouping({ issues, timers: {}, showTrackedOnly: false }),
    );
    expect(result.current.colorMap["Alpha"]).toBe(PROJECT_COLORS[0]);
    expect(result.current.colorMap["Beta"]).toBe(PROJECT_COLORS[1]);
    expect(result.current.colorMap["Alpha"]).toBe(PROJECT_COLORS[0]);
  });

  it("showTrackedOnly filters to issues with active timers", () => {
    const issues = [makeIssue(1, "P"), makeIssue(2, "P"), makeIssue(3, "Q")];
    const timers: MultiTimerMap = {
      2: {
        issueId: 2,
        issueSubject: "x",
        projectName: "P",
        startTime: "2025-01-01",
      },
    };
    const { result } = renderHook(() =>
      useTicketGrouping({ issues, timers, showTrackedOnly: true }),
    );
    expect(result.current.grouped["P"]).toHaveLength(1);
    expect(result.current.grouped["P"][0].id).toBe(2);
    expect(result.current.grouped["Q"]).toBeUndefined();
  });

  it("showTrackedOnly=false shows all issues", () => {
    const issues = [makeIssue(1, "P"), makeIssue(2, "P")];
    const { result } = renderHook(() =>
      useTicketGrouping({ issues, timers: {}, showTrackedOnly: false }),
    );
    expect(result.current.grouped["P"]).toHaveLength(2);
  });

  describe("favorites group", () => {
    it("adds a virtual favorites group when showFavoritesGroup=true and favoriteIds has entries", () => {
      const issues = [makeIssue(1, "Alpha"), makeIssue(2, "Alpha"), makeIssue(3, "Beta")];
      const favoriteIds = new Set([1, 3]);
      const { result } = renderHook(() =>
        useTicketGrouping({
          issues,
          timers: {},
          showTrackedOnly: false,
          showFavoritesGroup: true,
          favoriteIds,
        }),
      );
      // Virtual favorites group exists with favorited issues
      expect(result.current.grouped[FAVORITES_GROUP_KEY]).toHaveLength(2);
      expect(result.current.grouped[FAVORITES_GROUP_KEY].map((i) => i.id)).toEqual([1, 3]);
      // Real project groups still exist with ALL their issues
      expect(result.current.grouped["Alpha"]).toHaveLength(2);
      expect(result.current.grouped["Beta"]).toHaveLength(1);
    });

    it("does not add favorites group when showFavoritesGroup=false", () => {
      const issues = [makeIssue(1, "Alpha")];
      const favoriteIds = new Set([1]);
      const { result } = renderHook(() =>
        useTicketGrouping({
          issues,
          timers: {},
          showTrackedOnly: false,
          showFavoritesGroup: false,
          favoriteIds,
        }),
      );
      expect(result.current.grouped[FAVORITES_GROUP_KEY]).toBeUndefined();
    });

    it("does not add favorites group when favoriteIds is empty", () => {
      const issues = [makeIssue(1, "Alpha")];
      const favoriteIds = new Set<number>();
      const { result } = renderHook(() =>
        useTicketGrouping({
          issues,
          timers: {},
          showTrackedOnly: false,
          showFavoritesGroup: true,
          favoriteIds,
        }),
      );
      expect(result.current.grouped[FAVORITES_GROUP_KEY]).toBeUndefined();
    });

    it("does not add favorites group when favoriteIds is undefined", () => {
      const issues = [makeIssue(1, "Alpha")];
      const { result } = renderHook(() =>
        useTicketGrouping({ issues, timers: {}, showTrackedOnly: false, showFavoritesGroup: true }),
      );
      expect(result.current.grouped[FAVORITES_GROUP_KEY]).toBeUndefined();
    });

    it("favorites group does not appear in allProjectNames", () => {
      const issues = [makeIssue(1, "Alpha"), makeIssue(2, "Beta")];
      const favoriteIds = new Set([1]);
      const { result } = renderHook(() =>
        useTicketGrouping({
          issues,
          timers: {},
          showTrackedOnly: false,
          showFavoritesGroup: true,
          favoriteIds,
        }),
      );
      expect(result.current.allProjectNames).toEqual(["Alpha", "Beta"]);
      expect(result.current.allProjectNames).not.toContain(FAVORITES_GROUP_KEY);
    });

    it("colorMap includes amber color for favorites group key", () => {
      const issues = [makeIssue(1, "Alpha")];
      const favoriteIds = new Set([1]);
      const { result } = renderHook(() =>
        useTicketGrouping({
          issues,
          timers: {},
          showTrackedOnly: false,
          showFavoritesGroup: true,
          favoriteIds,
        }),
      );
      expect(result.current.colorMap[FAVORITES_GROUP_KEY]).toBe("#f9ab00");
    });

    it("favorites group works with showTrackedOnly", () => {
      const issues = [makeIssue(1, "P"), makeIssue(2, "P")];
      const favoriteIds = new Set([1, 2]);
      const timers: MultiTimerMap = {
        1: { issueId: 1, issueSubject: "x", projectName: "P", startTime: "2025-01-01" },
      };
      const { result } = renderHook(() =>
        useTicketGrouping({
          issues,
          timers,
          showTrackedOnly: true,
          showFavoritesGroup: true,
          favoriteIds,
        }),
      );
      // Only issue 1 has a timer, so favorites group only contains issue 1
      expect(result.current.grouped[FAVORITES_GROUP_KEY]).toHaveLength(1);
      expect(result.current.grouped[FAVORITES_GROUP_KEY][0].id).toBe(1);
    });

    it("favorite IDs not matching any issue → no favorites group", () => {
      const issues = [makeIssue(1, "A")];
      const favoriteIds = new Set([999]);
      const { result } = renderHook(() =>
        useTicketGrouping({
          issues,
          timers: {},
          showTrackedOnly: false,
          showFavoritesGroup: true,
          favoriteIds,
        }),
      );
      expect(result.current.grouped[FAVORITES_GROUP_KEY]).toBeUndefined();
    });

    it("showTrackedOnly filters out all favorited issues → no favorites group", () => {
      const issues = [makeIssue(1, "P"), makeIssue(2, "P")];
      const favoriteIds = new Set([1, 2]);
      const { result } = renderHook(() =>
        useTicketGrouping({
          issues,
          timers: {},
          showTrackedOnly: true,
          showFavoritesGroup: true,
          favoriteIds,
        }),
      );
      expect(result.current.grouped[FAVORITES_GROUP_KEY]).toBeUndefined();
    });
  });

  it("13+ projects → colors cycle without crash", () => {
    const count = PROJECT_COLORS.length + 2;
    const issues = Array.from({ length: count }, (_, i) =>
      makeIssue(i + 1, `Project${String(i).padStart(2, "0")}`),
    );
    const { result } = renderHook(() =>
      useTicketGrouping({ issues, timers: {}, showTrackedOnly: false }),
    );
    const projectKeys = Object.keys(result.current.colorMap).filter(
      (k) => k !== FAVORITES_GROUP_KEY,
    );
    expect(projectKeys).toHaveLength(count);
    const sorted = [...projectKeys].sort();
    expect(result.current.colorMap[sorted[PROJECT_COLORS.length]]).toBe(
      PROJECT_COLORS[PROJECT_COLORS.length % PROJECT_COLORS.length],
    );
    expect(result.current.colorMap[sorted[PROJECT_COLORS.length + 1]]).toBe(
      PROJECT_COLORS[(PROJECT_COLORS.length + 1) % PROJECT_COLORS.length],
    );
  });
});
