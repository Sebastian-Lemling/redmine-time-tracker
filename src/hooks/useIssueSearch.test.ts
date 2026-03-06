import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useIssueSearch } from "@/hooks/useIssueSearch";
import type { RedmineIssue } from "@/types/redmine";

vi.mock("@/lib/api");

import { api } from "@/lib/api";

const mockedApi = vi.mocked(api);

function makeIssue(id: number): RedmineIssue {
  return {
    id,
    subject: `Issue ${id}`,
    project: { id: 1, name: "Test Project" },
    tracker: { id: 1, name: "Bug" },
    status: { id: 1, name: "New", is_closed: false },
    priority: { id: 2, name: "Normal" },
    author: { id: 1, name: "Author" },
    done_ratio: 0,
    created_on: "2026-01-01T00:00:00Z",
    updated_on: "2026-01-01T00:00:00Z",
  } as RedmineIssue;
}

function setupMountMocks() {
  mockedApi.mockResolvedValueOnce({ projects: [{ id: 1, name: "Project A" }] });
  mockedApi.mockResolvedValueOnce({ issue_priorities: [{ id: 2, name: "Normal" }] });
}

/** Flush all pending timers and microtasks */
async function flushTimers() {
  await act(async () => {
    await vi.runAllTimersAsync();
  });
}

describe("useIssueSearch", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    history.replaceState(null, "", window.location.pathname);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("fetches /api/projects and /api/priorities on mount", async () => {
    setupMountMocks();
    const { result } = renderHook(() => useIssueSearch());

    await flushTimers();

    expect(mockedApi).toHaveBeenCalledWith("/api/projects");
    expect(mockedApi).toHaveBeenCalledWith("/api/priorities");
    expect(result.current.projects).toHaveLength(1);
    expect(result.current.priorities).toHaveLength(1);
  });

  it('setParam("q", "text") triggers debounced search (300ms)', async () => {
    setupMountMocks();
    mockedApi.mockResolvedValueOnce({ issues: [makeIssue(1)], total_count: 1 });

    const { result } = renderHook(() => useIssueSearch());
    await flushTimers();

    act(() => result.current.setParam("q", "test"));

    const callsBefore = mockedApi.mock.calls.length;

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    expect(mockedApi.mock.calls.length).toBeGreaterThan(callsBefore);
  });

  it('setParam("status_id", "open") triggers faster search (150ms)', async () => {
    setupMountMocks();
    mockedApi.mockResolvedValueOnce({ issues: [], total_count: 0 });

    const { result } = renderHook(() => useIssueSearch());
    await flushTimers();

    act(() => result.current.setParam("status_id", "open"));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(150);
    });

    const searchCalls = mockedApi.mock.calls.filter(
      (c) => typeof c[0] === "string" && (c[0] as string).includes("/api/issues/search"),
    );
    expect(searchCalls.length).toBeGreaterThanOrEqual(1);
  });

  it("search calls /api/issues/search with params", async () => {
    setupMountMocks();
    mockedApi.mockResolvedValueOnce({ issues: [makeIssue(1)], total_count: 1 });

    const { result } = renderHook(() => useIssueSearch());
    await flushTimers();

    act(() => result.current.setParam("q", "searchterm"));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    const searchCall = mockedApi.mock.calls.find(
      (c) => typeof c[0] === "string" && (c[0] as string).includes("/api/issues/search"),
    );
    expect(searchCall).toBeDefined();
    expect(searchCall![0]).toContain("q=searchterm");
  });

  it("results array populated on success", async () => {
    setupMountMocks();
    mockedApi.mockResolvedValueOnce({ issues: [makeIssue(1), makeIssue(2)], total_count: 2 });

    const { result } = renderHook(() => useIssueSearch());
    await flushTimers();

    act(() => result.current.setParam("q", "test"));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    expect(result.current.results).toHaveLength(2);
  });

  it("loadMore() appends next page to results", async () => {
    setupMountMocks();
    mockedApi.mockResolvedValueOnce({
      issues: Array.from({ length: 25 }, (_, i) => makeIssue(i + 1)),
      total_count: 50,
    });

    const { result } = renderHook(() => useIssueSearch());
    await flushTimers();

    act(() => result.current.setParam("q", "test"));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    expect(result.current.results.length).toBe(25);

    mockedApi.mockResolvedValueOnce({
      issues: Array.from({ length: 25 }, (_, i) => makeIssue(i + 26)),
      total_count: 50,
    });

    act(() => result.current.loadMore());
    await flushTimers();

    expect(result.current.results.length).toBe(50);
  });

  it("hasMore computed from totalCount vs results.length", async () => {
    setupMountMocks();
    mockedApi.mockResolvedValueOnce({ issues: [makeIssue(1)], total_count: 10 });

    const { result } = renderHook(() => useIssueSearch());
    await flushTimers();

    act(() => result.current.setParam("q", "test"));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    expect(result.current.hasMore).toBe(true);
  });

  it("setParam resets offset to 0", async () => {
    setupMountMocks();
    mockedApi.mockResolvedValue({ issues: [], total_count: 0 });

    const { result } = renderHook(() => useIssueSearch());
    await flushTimers();

    act(() => result.current.setParam("q", "a"));
    expect(result.current.params.offset).toBe(0);
  });

  it("resetFilters() clears all except q", async () => {
    setupMountMocks();
    mockedApi.mockResolvedValue({ issues: [], total_count: 0 });

    const { result } = renderHook(() => useIssueSearch());
    await flushTimers();

    act(() => result.current.setParam("q", "test"));
    act(() => result.current.setParam("project_id", 1));
    act(() => result.current.resetFilters());

    expect(result.current.params.q).toBe("test");
    expect(result.current.params.project_id).toBeUndefined();
  });

  it("error state set on fetch failure", async () => {
    setupMountMocks();
    mockedApi.mockRejectedValueOnce(new Error("Connection error"));

    const { result } = renderHook(() => useIssueSearch());
    await flushTimers();

    act(() => result.current.setParam("q", "test"));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    expect(result.current.error).toBe("Connection error");
  });

  it("retry() re-executes last search", async () => {
    setupMountMocks();
    mockedApi.mockRejectedValueOnce(new Error("fail"));

    const { result } = renderHook(() => useIssueSearch());
    await flushTimers();

    act(() => result.current.setParam("q", "retry-test"));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    expect(result.current.error).toBeTruthy();

    mockedApi.mockResolvedValueOnce({ issues: [makeIssue(1)], total_count: 1 });

    await act(async () => {
      result.current.retry();
    });
    await flushTimers();

    expect(result.current.error).toBeNull();
  });

  it("hasActiveFilters true when any filter besides q set", async () => {
    setupMountMocks();
    mockedApi.mockResolvedValue({ issues: [], total_count: 0 });

    const { result } = renderHook(() => useIssueSearch());
    await flushTimers();

    expect(result.current.hasActiveFilters).toBe(false);
    act(() => result.current.setParam("project_id", 1));
    expect(result.current.hasActiveFilters).toBe(true);
  });

  it("recent searches saved to localStorage (min 2 chars)", async () => {
    setupMountMocks();
    mockedApi.mockResolvedValueOnce({ issues: [makeIssue(1)], total_count: 1 });

    const { result } = renderHook(() => useIssueSearch());
    await flushTimers();

    act(() => result.current.setParam("q", "ab"));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    expect(result.current.results.length).toBe(1);

    const stored = localStorage.getItem("redmine-recent-searches");
    expect(stored).toBeDefined();
    expect(JSON.parse(stored!)).toContain("ab");
  });

  it("applyRecentSearch() sets q from history", async () => {
    setupMountMocks();
    mockedApi.mockResolvedValue({ issues: [], total_count: 0 });

    const { result } = renderHook(() => useIssueSearch());
    await flushTimers();

    act(() => result.current.applyRecentSearch("old search"));
    expect(result.current.params.q).toBe("old search");
  });

  it("clearRecent() empties recent searches", async () => {
    localStorage.setItem("redmine-recent-searches", JSON.stringify(["a", "b"]));
    setupMountMocks();
    mockedApi.mockResolvedValue({ issues: [], total_count: 0 });

    const { result } = renderHook(() => useIssueSearch());
    await flushTimers();

    act(() => result.current.clearRecent());
    expect(result.current.recentSearches).toHaveLength(0);
    expect(localStorage.getItem("redmine-recent-searches")).toBeNull();
  });

  it("fixed_version_id param is written to URL and used in search (line 90)", async () => {
    setupMountMocks();
    mockedApi.mockResolvedValueOnce({ issues: [], total_count: 0 });

    const { result } = renderHook(() => useIssueSearch());
    await flushTimers();

    act(() => result.current.setParam("fixed_version_id", 7));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(150);
    });

    const searchCall = mockedApi.mock.calls.find(
      (c) => typeof c[0] === "string" && (c[0] as string).includes("/api/issues/search"),
    );
    expect(searchCall).toBeDefined();
    expect(searchCall![0]).toContain("fixed_version_id=7");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    expect(window.location.search).toContain("fixed_version_id=7");
  });

  it("mount fetch errors set error state (lines 136, 141)", async () => {
    // Use real timers for this test since we need microtask flushing
    vi.useRealTimers();

    mockedApi.mockRejectedValueOnce(new Error("projects fail"));
    mockedApi.mockRejectedValueOnce(new Error("priorities fail"));

    const { result } = renderHook(() => useIssueSearch());

    // Wait for both promise rejections to settle
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(result.current.error).toBeTruthy();
    expect(["Failed to load projects", "Failed to load priorities"]).toContain(
      result.current.error,
    );

    // Re-enable fake timers for consistency with other tests
    vi.useFakeTimers();
  });

  it("readParamsFromUrl parses URL params on mount", async () => {
    history.replaceState(
      null,
      "",
      window.location.pathname +
        "?q=fromurl&project_id=5&tracker_id=2&assigned_to_id=me&fixed_version_id=3&priority_id=1&sort=id:desc&status_id=open",
    );
    setupMountMocks();
    mockedApi.mockResolvedValueOnce({ issues: [], total_count: 0 });

    const { result } = renderHook(() => useIssueSearch());
    await flushTimers();

    expect(result.current.params.q).toBe("fromurl");
    expect(result.current.params.project_id).toBe(5);
    expect(result.current.params.tracker_id).toBe(2);
    expect(result.current.params.assigned_to_id).toBe("me");
    expect(result.current.params.fixed_version_id).toBe(3);
    expect(result.current.params.priority_id).toBe(1);
    expect(result.current.params.sort).toBe("id:desc");
    expect(result.current.params.status_id).toBe("open");

    history.replaceState(null, "", window.location.pathname);
  });
});
