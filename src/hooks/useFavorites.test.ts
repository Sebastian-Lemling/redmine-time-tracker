import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useFavorites } from "./useFavorites";
import { createIssue } from "../test/fixtures";
import { api } from "../lib/api";
import { ApiError } from "../lib/errors";

vi.mock("../lib/api");

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("useFavorites", () => {
  it("starts empty", () => {
    const { result } = renderHook(() => useFavorites());
    expect(result.current.favoriteIds.size).toBe(0);
    expect(result.current.favoriteIssues).toEqual([]);
  });

  it("toggle adds and removes a favorite", () => {
    const { result } = renderHook(() => useFavorites());
    const issue = createIssue({ id: 42 });

    act(() => result.current.toggle(issue));
    expect(result.current.isFavorite(42)).toBe(true);
    expect(result.current.favoriteIds.has(42)).toBe(true);
    expect(result.current.favoriteIssues).toHaveLength(1);

    act(() => result.current.toggle(issue));
    expect(result.current.isFavorite(42)).toBe(false);
    expect(result.current.favoriteIds.has(42)).toBe(false);
    expect(result.current.favoriteIssues).toHaveLength(0);
  });

  it("persists to localStorage", () => {
    const { result } = renderHook(() => useFavorites());
    const issue = createIssue({ id: 99 });

    act(() => result.current.toggle(issue));

    const storedIds = JSON.parse(localStorage.getItem("favorite-issue-ids")!);
    expect(storedIds).toContain(99);

    const storedCache = JSON.parse(localStorage.getItem("favorite-issue-cache")!);
    expect(storedCache[99]).toBeDefined();
    expect(storedCache[99].id).toBe(99);
  });

  it("loads from localStorage on mount", () => {
    localStorage.setItem("favorite-issue-ids", JSON.stringify([101]));
    localStorage.setItem("favorite-issue-cache", JSON.stringify({ 101: createIssue({ id: 101 }) }));

    const { result } = renderHook(() => useFavorites());
    expect(result.current.isFavorite(101)).toBe(true);
    expect(result.current.favoriteIssues).toHaveLength(1);
    expect(result.current.favoriteIssues[0].id).toBe(101);
  });

  it("isFavorite returns false for unknown ids", () => {
    const { result } = renderHook(() => useFavorites());
    expect(result.current.isFavorite(999)).toBe(false);
  });

  it("updateIssue updates a favorited issue in place", () => {
    const { result } = renderHook(() => useFavorites());
    const issue = createIssue({ id: 50, subject: "Old" });

    act(() => result.current.toggle(issue));
    expect(result.current.favoriteIssues[0].subject).toBe("Old");

    const updated = createIssue({ id: 50, subject: "New" });
    act(() => result.current.updateIssue(updated));
    expect(result.current.favoriteIssues[0].subject).toBe("New");
  });

  it("updateIssue is a no-op for non-favorited issues", () => {
    const { result } = renderHook(() => useFavorites());
    const issue = createIssue({ id: 77, subject: "Not favorited" });

    act(() => result.current.updateIssue(issue));
    expect(result.current.favoriteIssues).toHaveLength(0);
  });

  it("404 response removes issue from favorites", async () => {
    localStorage.setItem("favorite-issue-ids", JSON.stringify([42]));
    localStorage.setItem("favorite-issue-cache", JSON.stringify({ 42: createIssue({ id: 42 }) }));

    vi.mocked(api).mockRejectedValue(new ApiError("Not found", 404));

    const { result } = renderHook(() => useFavorites());

    await waitFor(() => {
      expect(result.current.favoriteIds.has(42)).toBe(false);
    });
    expect(result.current.favoriteIssues).toHaveLength(0);
  });

  it("non-404 error keeps issue unchanged", async () => {
    const issue42 = createIssue({ id: 42, subject: "Original" });
    const issue43 = createIssue({ id: 43, subject: "Old" });
    localStorage.setItem("favorite-issue-ids", JSON.stringify([42, 43]));
    localStorage.setItem("favorite-issue-cache", JSON.stringify({ 42: issue42, 43: issue43 }));

    const updatedIssue43 = createIssue({ id: 43, subject: "Refreshed" });
    vi.mocked(api).mockImplementation((url: string) => {
      if (url === "/api/issues/42") {
        return Promise.reject(new ApiError("Server error", 500));
      }
      return Promise.resolve({ issue: updatedIssue43 });
    });

    const { result } = renderHook(() => useFavorites());

    await waitFor(() => {
      expect(result.current.favoriteIssues.find((i) => i.id === 43)?.subject).toBe("Refreshed");
    });
    expect(result.current.favoriteIds.has(42)).toBe(true);
    expect(result.current.favoriteIssues.find((i) => i.id === 42)?.subject).toBe("Original");
  });

  it("all fetches fail → state untouched", async () => {
    localStorage.setItem("favorite-issue-ids", JSON.stringify([10, 20]));
    localStorage.setItem(
      "favorite-issue-cache",
      JSON.stringify({ 10: createIssue({ id: 10 }), 20: createIssue({ id: 20 }) }),
    );

    vi.mocked(api).mockRejectedValue(new Error("Network"));

    const { result } = renderHook(() => useFavorites());

    // Give the async effect time to settle
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(result.current.favoriteIds.has(10)).toBe(true);
    expect(result.current.favoriteIds.has(20)).toBe(true);
    expect(result.current.favoriteIssues).toHaveLength(2);
  });

  it("corrupted localStorage starts empty", () => {
    localStorage.setItem("favorite-issue-ids", "not json");

    const { result } = renderHook(() => useFavorites());
    expect(result.current.favoriteIds.size).toBe(0);
    expect(result.current.favoriteIssues).toEqual([]);
  });

  it("rapid toggle same ID twice removes favorite", () => {
    const { result } = renderHook(() => useFavorites());
    const issue = createIssue({ id: 42 });

    act(() => {
      result.current.toggle(issue);
      result.current.toggle(issue);
    });

    expect(result.current.isFavorite(42)).toBe(false);
    expect(result.current.favoriteIds.has(42)).toBe(false);
    expect(result.current.favoriteIssues).toHaveLength(0);
  });
});
