import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePinnedIssues } from "@/hooks/usePinnedIssues";
import type { RedmineIssue } from "@/types/redmine";
import { ApiError } from "@/lib/errors";

vi.mock("@/lib/api");

import { api } from "@/lib/api";

const mockedApi = vi.mocked(api);

function makeIssue(id: number, subject = `Issue ${id}`): RedmineIssue {
  return {
    id,
    subject,
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

describe("usePinnedIssues", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads pinned IDs from localStorage on mount", () => {
    localStorage.setItem("pinned-issue-ids", JSON.stringify([1, 2]));
    const { result } = renderHook(() => usePinnedIssues());
    expect(result.current.pinnedIds.has(1)).toBe(true);
    expect(result.current.pinnedIds.has(2)).toBe(true);
  });

  it("uses localStorage cache for instant display before background refresh", () => {
    const issue = makeIssue(1);
    localStorage.setItem("pinned-issue-ids", JSON.stringify([1]));
    localStorage.setItem("pinned-issue-cache", JSON.stringify({ 1: issue }));
    mockedApi.mockResolvedValueOnce({ issue });

    const { result } = renderHook(() => usePinnedIssues());
    expect(result.current.pinnedIssues).toHaveLength(1);
    expect(result.current.pinnedIssues[0].id).toBe(1);
  });

  it("toggle() adds issue to pinMap + recent", () => {
    const { result } = renderHook(() => usePinnedIssues());

    act(() => result.current.toggle(makeIssue(5)));

    expect(result.current.isPinned(5)).toBe(true);
    expect(result.current.recentlyPinned).toHaveLength(1);
  });

  it("toggle() removes issue if already pinned", () => {
    const { result } = renderHook(() => usePinnedIssues());
    const issue = makeIssue(5);

    act(() => result.current.toggle(issue));
    expect(result.current.isPinned(5)).toBe(true);

    act(() => result.current.toggle(issue));
    expect(result.current.isPinned(5)).toBe(false);
  });

  it("toggle() unpin does NOT add to recent list", () => {
    const { result } = renderHook(() => usePinnedIssues());
    const issue = makeIssue(5);

    act(() => result.current.toggle(issue));
    expect(result.current.recentlyPinned).toHaveLength(1);

    act(() => result.current.toggle(issue));
    expect(result.current.recentlyPinned).toHaveLength(1);
  });

  it("pin() adds to pinned + recent history", () => {
    const { result } = renderHook(() => usePinnedIssues());

    act(() => result.current.pin(makeIssue(10)));

    expect(result.current.isPinned(10)).toBe(true);
    expect(result.current.recentlyPinned[0].id).toBe(10);
  });

  it("unpin() removes from pinned", () => {
    const { result } = renderHook(() => usePinnedIssues());

    act(() => result.current.pin(makeIssue(10)));
    act(() => result.current.unpin(10));

    expect(result.current.isPinned(10)).toBe(false);
  });

  it("isPinned() returns correct boolean", () => {
    const { result } = renderHook(() => usePinnedIssues());
    expect(result.current.isPinned(999)).toBe(false);

    act(() => result.current.pin(makeIssue(999)));
    expect(result.current.isPinned(999)).toBe(true);
  });

  it("recentlyPinned returns most-recent-first", () => {
    const { result } = renderHook(() => usePinnedIssues());

    act(() => result.current.pin(makeIssue(1)));
    act(() => result.current.pin(makeIssue(2)));
    act(() => result.current.pin(makeIssue(3)));

    expect(result.current.recentlyPinned).toHaveLength(3);
    expect(result.current.recentlyPinned[0].id).toBe(3);
  });

  it("recent history caps at 10", () => {
    const { result } = renderHook(() => usePinnedIssues());

    for (let i = 1; i <= 12; i++) {
      act(() => result.current.pin(makeIssue(i)));
    }

    expect(result.current.recentlyPinned.length).toBeLessThanOrEqual(10);
  });

  it("recent history persists independent of pin state", () => {
    const { result } = renderHook(() => usePinnedIssues());

    act(() => result.current.pin(makeIssue(42)));
    act(() => result.current.unpin(42));

    expect(result.current.recentlyPinned.some((i) => i.id === 42)).toBe(true);
  });

  it("persists IDs, cache and recent to localStorage", () => {
    const { result } = renderHook(() => usePinnedIssues());
    act(() => result.current.pin(makeIssue(7)));

    expect(JSON.parse(localStorage.getItem("pinned-issue-ids")!)).toContain(7);
    expect(JSON.parse(localStorage.getItem("pinned-issue-cache")!)[7]).toBeDefined();
    expect(JSON.parse(localStorage.getItem("recent-pinned-issues")!).length).toBeGreaterThanOrEqual(
      1,
    );
  });

  describe("updateIssue", () => {
    it("replaces issue data in pinMap", () => {
      const { result } = renderHook(() => usePinnedIssues());
      act(() => result.current.pin(makeIssue(5, "Original")));

      act(() => result.current.updateIssue(makeIssue(5, "Updated")));

      expect(result.current.pinnedIssues[0].subject).toBe("Updated");
    });

    it("is a no-op for non-pinned issues", () => {
      const { result } = renderHook(() => usePinnedIssues());
      act(() => result.current.pin(makeIssue(1)));

      act(() => result.current.updateIssue(makeIssue(99, "Not pinned")));

      expect(result.current.pinnedIssues).toHaveLength(1);
      expect(result.current.pinnedIssues[0].id).toBe(1);
    });
  });

  describe("background refresh on mount", () => {
    it("removes 404 issues during background refresh (lines 123-124, 142)", async () => {
      localStorage.setItem("pinned-issue-ids", JSON.stringify([1, 2]));
      localStorage.setItem(
        "pinned-issue-cache",
        JSON.stringify({
          1: makeIssue(1),
          2: makeIssue(2),
        }),
      );

      mockedApi.mockResolvedValueOnce({ issue: makeIssue(1, "Updated 1") });
      mockedApi.mockRejectedValueOnce(new ApiError("Not found", 404));

      const { result } = renderHook(() => usePinnedIssues());

      await act(async () => {
        await vi.waitFor(() => {
          expect(mockedApi).toHaveBeenCalledTimes(2);
        });
      });

      expect(result.current.isPinned(1)).toBe(true);
      expect(result.current.isPinned(2)).toBe(false);
      expect(result.current.pinnedIssues[0].subject).toBe("Updated 1");
    });

    it("keeps entries on non-404 errors during background refresh", async () => {
      localStorage.setItem("pinned-issue-ids", JSON.stringify([1, 2]));
      localStorage.setItem(
        "pinned-issue-cache",
        JSON.stringify({
          1: makeIssue(1),
          2: makeIssue(2),
        }),
      );

      mockedApi.mockResolvedValueOnce({ issue: makeIssue(1, "Updated") });
      mockedApi.mockRejectedValueOnce(new Error("Network error"));

      const { result } = renderHook(() => usePinnedIssues());

      await act(async () => {
        await vi.waitFor(() => {
          expect(mockedApi).toHaveBeenCalledTimes(2);
        });
      });

      // Both should remain pinned; issue 2 keeps cached data
      expect(result.current.isPinned(1)).toBe(true);
      expect(result.current.isPinned(2)).toBe(true);
    });

    it("skips refresh if all results are errors", async () => {
      localStorage.setItem("pinned-issue-ids", JSON.stringify([1]));
      localStorage.setItem("pinned-issue-cache", JSON.stringify({ 1: makeIssue(1) }));

      mockedApi.mockRejectedValueOnce(new Error("Server down"));

      const { result } = renderHook(() => usePinnedIssues());

      await act(async () => {
        await vi.waitFor(() => {
          expect(mockedApi).toHaveBeenCalledTimes(1);
        });
      });

      expect(result.current.isPinned(1)).toBe(true);
    });
  });

  describe("refreshPinned", () => {
    it("fetches each issue from API", async () => {
      const { result } = renderHook(() => usePinnedIssues());
      act(() => result.current.pin(makeIssue(1)));
      act(() => result.current.pin(makeIssue(2)));

      mockedApi.mockResolvedValueOnce({ issue: makeIssue(1, "Updated 1") });
      mockedApi.mockResolvedValueOnce({ issue: makeIssue(2, "Updated 2") });

      await act(async () => {
        await result.current.refreshPinned();
      });

      expect(mockedApi).toHaveBeenCalledWith("/api/issues/1");
      expect(mockedApi).toHaveBeenCalledWith("/api/issues/2");
    });

    it("updates issue data in state", async () => {
      const { result } = renderHook(() => usePinnedIssues());
      act(() => result.current.pin(makeIssue(1, "Old")));

      mockedApi.mockResolvedValueOnce({ issue: makeIssue(1, "Refreshed") });

      await act(async () => {
        await result.current.refreshPinned();
      });

      expect(result.current.pinnedIssues[0].subject).toBe("Refreshed");
    });

    it("auto-unpins 404 issues", async () => {
      const { result } = renderHook(() => usePinnedIssues());
      act(() => result.current.pin(makeIssue(99)));

      mockedApi.mockRejectedValueOnce(new ApiError("Not found", 404));

      await act(async () => {
        await result.current.refreshPinned();
      });

      expect(result.current.isPinned(99)).toBe(false);
    });

    it("keeps entries on non-404 error during refreshPinned (line 309)", async () => {
      const { result } = renderHook(() => usePinnedIssues());
      act(() => result.current.pin(makeIssue(1)));
      act(() => result.current.pin(makeIssue(2)));

      mockedApi.mockResolvedValueOnce({ issue: makeIssue(1, "Fresh 1") });
      mockedApi.mockRejectedValueOnce(new Error("Server error"));

      await act(async () => {
        await result.current.refreshPinned();
      });

      expect(result.current.isPinned(1)).toBe(true);
      expect(result.current.isPinned(2)).toBe(true);
      expect(result.current.pinnedIssues.find((i) => i.id === 1)!.subject).toBe("Fresh 1");
    });

    it("skips update when all refreshPinned results are errors", async () => {
      const { result } = renderHook(() => usePinnedIssues());
      act(() => result.current.pin(makeIssue(1)));

      mockedApi.mockRejectedValueOnce(new Error("Total failure"));

      await act(async () => {
        await result.current.refreshPinned();
      });

      expect(result.current.isPinned(1)).toBe(true);
    });

    it("is a no-op with 0 pinned issues", async () => {
      const { result } = renderHook(() => usePinnedIssues());

      await act(async () => {
        await result.current.refreshPinned();
      });

      expect(mockedApi).not.toHaveBeenCalled();
    });
  });

  describe("syncAssignedPins", () => {
    it("pins assigned issues that are not hidden", () => {
      localStorage.setItem("pin-migration-done", "true");
      const { result } = renderHook(() => usePinnedIssues());

      act(() => result.current.syncAssignedPins([makeIssue(1), makeIssue(2)]));

      expect(result.current.isPinned(1)).toBe(true);
      expect(result.current.isPinned(2)).toBe(true);
    });

    it("skips sync when assignedIssues is empty", () => {
      const { result } = renderHook(() => usePinnedIssues());

      act(() => result.current.syncAssignedPins([]));

      expect(result.current.pinnedIds.size).toBe(0);
    });

    it("migration does not flood recent list", () => {
      localStorage.removeItem("pin-migration-done");
      const { result } = renderHook(() => usePinnedIssues());

      act(() => result.current.syncAssignedPins([makeIssue(1), makeIssue(2), makeIssue(3)]));

      expect(result.current.isPinned(1)).toBe(true);
      expect(result.current.isPinned(2)).toBe(true);
      expect(result.current.isPinned(3)).toBe(true);
      expect(result.current.recentlyPinned).toHaveLength(0);
    });

    it("does not re-pin hidden assigned issues", () => {
      localStorage.setItem("pin-migration-done", "true");
      const { result } = renderHook(() => usePinnedIssues());
      const issue = makeIssue(1);

      act(() => result.current.pin(issue));
      act(() => result.current.hide(1));
      act(() => result.current.unpin(1));

      act(() => result.current.syncAssignedPins([issue]));
      expect(result.current.isPinned(1)).toBe(false);
    });

    it("cleans up hidden IDs that are no longer assigned", () => {
      localStorage.setItem("pin-migration-done", "true");
      const { result } = renderHook(() => usePinnedIssues());

      act(() => result.current.hide(99));
      expect(result.current.hiddenAssignedIds.has(99)).toBe(true);

      act(() => result.current.syncAssignedPins([makeIssue(1)]));
      expect(result.current.hiddenAssignedIds.has(99)).toBe(false);
    });

    it("does not create duplicate pins for already-pinned issues", () => {
      localStorage.setItem("pin-migration-done", "true");
      const { result } = renderHook(() => usePinnedIssues());
      const issue = makeIssue(1);

      act(() => result.current.pin(issue));
      expect(result.current.pinnedIssues).toHaveLength(1);

      act(() => result.current.syncAssignedPins([issue]));
      expect(result.current.pinnedIssues).toHaveLength(1);
    });

    it("handles mixed state: pinned + hidden + new", () => {
      localStorage.setItem("pin-migration-done", "true");
      const { result } = renderHook(() => usePinnedIssues());

      act(() => result.current.pin(makeIssue(1)));
      act(() => result.current.hide(2));

      act(() => result.current.syncAssignedPins([makeIssue(1), makeIssue(2), makeIssue(3)]));

      expect(result.current.isPinned(1)).toBe(true);
      expect(result.current.isPinned(2)).toBe(false);
      expect(result.current.isPinned(3)).toBe(true);
      expect(result.current.pinnedIssues).toHaveLength(2);
    });
  });

  describe("hide", () => {
    it("adds issue to hiddenAssignedIds", () => {
      const { result } = renderHook(() => usePinnedIssues());

      act(() => result.current.hide(42));

      expect(result.current.hiddenAssignedIds.has(42)).toBe(true);
    });

    it("persists to localStorage", () => {
      const { result } = renderHook(() => usePinnedIssues());

      act(() => result.current.hide(42));

      expect(JSON.parse(localStorage.getItem("hidden-assigned-ids")!)).toContain(42);
    });

    it("is idempotent", () => {
      const { result } = renderHook(() => usePinnedIssues());

      act(() => result.current.hide(42));
      act(() => result.current.hide(42));

      expect(result.current.hiddenAssignedIds.has(42)).toBe(true);
      expect(JSON.parse(localStorage.getItem("hidden-assigned-ids")!)).toEqual([42]);
    });
  });

  describe("pin() of hidden ticket", () => {
    it("removes from hiddenAssignedIds", () => {
      const { result } = renderHook(() => usePinnedIssues());

      act(() => result.current.hide(42));
      expect(result.current.hiddenAssignedIds.has(42)).toBe(true);

      act(() => result.current.pin(makeIssue(42)));
      expect(result.current.hiddenAssignedIds.has(42)).toBe(false);
      expect(result.current.isPinned(42)).toBe(true);
    });
  });

  describe("pinSilent", () => {
    it("pins without adding to recent list", () => {
      const { result } = renderHook(() => usePinnedIssues());

      act(() => result.current.pinSilent(makeIssue(42)));

      expect(result.current.isPinned(42)).toBe(true);
      expect(result.current.recentlyPinned).toHaveLength(0);
    });

    it("unhides a hidden issue", () => {
      const { result } = renderHook(() => usePinnedIssues());

      act(() => result.current.hide(42));
      act(() => result.current.pinSilent(makeIssue(42)));

      expect(result.current.isPinned(42)).toBe(true);
      expect(result.current.hiddenAssignedIds.has(42)).toBe(false);
    });

    it("updates data on already-pinned issue without adding to recent", () => {
      const { result } = renderHook(() => usePinnedIssues());

      act(() => result.current.pinSilent(makeIssue(42, "Original")));
      act(() => result.current.pinSilent(makeIssue(42, "Updated")));

      expect(result.current.pinnedIssues[0].subject).toBe("Updated");
      expect(result.current.recentlyPinned).toHaveLength(0);
    });
  });

  describe("toggle() + hidden interaction", () => {
    it("removes from hiddenAssignedIds when toggling to pinned", () => {
      const { result } = renderHook(() => usePinnedIssues());

      act(() => result.current.hide(42));
      act(() => result.current.toggle(makeIssue(42)));

      expect(result.current.isPinned(42)).toBe(true);
      expect(result.current.hiddenAssignedIds.has(42)).toBe(false);
    });

    it("does NOT unhide when toggling to unpinned", () => {
      const { result } = renderHook(() => usePinnedIssues());

      act(() => result.current.pin(makeIssue(42)));
      act(() => result.current.hide(42));

      act(() => result.current.toggle(makeIssue(42)));

      expect(result.current.isPinned(42)).toBe(false);
      // App.tsx wrapper is responsible for calling hide() on assigned unpin
      expect(result.current.hiddenAssignedIds.has(42)).toBe(true);
    });
  });

  describe("toggle on non-assigned issue", () => {
    it("pin → unpin does not affect hiddenAssignedIds", () => {
      localStorage.setItem("pin-migration-done", "true");
      const { result } = renderHook(() => usePinnedIssues());
      const issue = makeIssue(99);

      act(() => result.current.toggle(issue));
      expect(result.current.isPinned(99)).toBe(true);
      expect(result.current.hiddenAssignedIds.has(99)).toBe(false);

      act(() => result.current.toggle(issue));
      expect(result.current.isPinned(99)).toBe(false);
      expect(result.current.hiddenAssignedIds.has(99)).toBe(false);
    });
  });

  describe("unpin() without hide", () => {
    it("allows re-pin on next sync (hide is App-layer responsibility)", () => {
      localStorage.setItem("pin-migration-done", "true");
      const { result } = renderHook(() => usePinnedIssues());
      const issue = makeIssue(1);

      act(() => result.current.syncAssignedPins([issue]));
      act(() => result.current.unpin(1));

      expect(result.current.isPinned(1)).toBe(false);
      expect(result.current.hiddenAssignedIds.has(1)).toBe(false);

      act(() => result.current.syncAssignedPins([issue]));
      expect(result.current.isPinned(1)).toBe(true);
    });
  });

  describe("full assigned lifecycle", () => {
    it("assigned → auto-pin → unpin+hide → sync → stays hidden", () => {
      localStorage.setItem("pin-migration-done", "true");
      const { result } = renderHook(() => usePinnedIssues());
      const issue = makeIssue(1);

      act(() => result.current.syncAssignedPins([issue]));
      expect(result.current.isPinned(1)).toBe(true);

      act(() => {
        result.current.toggle(issue);
        result.current.hide(1);
      });
      expect(result.current.isPinned(1)).toBe(false);
      expect(result.current.hiddenAssignedIds.has(1)).toBe(true);

      act(() => result.current.syncAssignedPins([issue]));
      expect(result.current.isPinned(1)).toBe(false);
    });

    it("hidden → re-pin → unhidden → unpin+hide → stays hidden after sync", () => {
      localStorage.setItem("pin-migration-done", "true");
      const { result } = renderHook(() => usePinnedIssues());
      const issue = makeIssue(1);

      act(() => result.current.hide(1));
      act(() => result.current.toggle(issue));
      expect(result.current.isPinned(1)).toBe(true);
      expect(result.current.hiddenAssignedIds.has(1)).toBe(false);

      act(() => {
        result.current.toggle(issue);
        result.current.hide(1);
      });
      expect(result.current.isPinned(1)).toBe(false);
      expect(result.current.hiddenAssignedIds.has(1)).toBe(true);

      act(() => result.current.syncAssignedPins([issue]));
      expect(result.current.isPinned(1)).toBe(false);
    });
  });

  describe("hiddenAssignedIds persistence", () => {
    it("loads from localStorage on mount", () => {
      localStorage.setItem("hidden-assigned-ids", JSON.stringify([5, 10]));
      const { result } = renderHook(() => usePinnedIssues());
      expect(result.current.hiddenAssignedIds.has(5)).toBe(true);
      expect(result.current.hiddenAssignedIds.has(10)).toBe(true);
    });

    it("survives remount", () => {
      localStorage.setItem("pin-migration-done", "true");
      const { result: r1, unmount } = renderHook(() => usePinnedIssues());

      act(() => r1.current.pin(makeIssue(1)));
      act(() => {
        r1.current.unpin(1);
        r1.current.hide(1);
      });
      unmount();

      const { result: r2 } = renderHook(() => usePinnedIssues());
      expect(r2.current.isPinned(1)).toBe(false);
      expect(r2.current.hiddenAssignedIds.has(1)).toBe(true);

      act(() => r2.current.syncAssignedPins([makeIssue(1)]));
      expect(r2.current.isPinned(1)).toBe(false);
    });
  });

  describe("migration", () => {
    it("preserves existing pins", () => {
      localStorage.removeItem("pin-migration-done");
      localStorage.setItem("pinned-issue-ids", JSON.stringify([99]));
      localStorage.setItem("pinned-issue-cache", JSON.stringify({ 99: makeIssue(99) }));
      mockedApi.mockResolvedValueOnce({ issue: makeIssue(99) });

      const { result } = renderHook(() => usePinnedIssues());
      expect(result.current.isPinned(99)).toBe(true);

      act(() => result.current.syncAssignedPins([makeIssue(1), makeIssue(2)]));

      expect(result.current.isPinned(99)).toBe(true);
      expect(result.current.isPinned(1)).toBe(true);
      expect(result.current.isPinned(2)).toBe(true);
    });

    it("runs only once — second call uses normal sync path", () => {
      localStorage.removeItem("pin-migration-done");
      const { result } = renderHook(() => usePinnedIssues());

      act(() => result.current.syncAssignedPins([makeIssue(1)]));
      expect(result.current.isPinned(1)).toBe(true);
      expect(result.current.recentlyPinned).toHaveLength(0);

      act(() => {
        result.current.toggle(makeIssue(1));
        result.current.hide(1);
      });

      act(() => result.current.syncAssignedPins([makeIssue(1), makeIssue(2)]));
      expect(result.current.isPinned(1)).toBe(false);
      expect(result.current.isPinned(2)).toBe(true);
    });

    it("respects hidden IDs during migration", () => {
      localStorage.removeItem("pin-migration-done");
      localStorage.setItem("hidden-assigned-ids", JSON.stringify([2]));
      const { result } = renderHook(() => usePinnedIssues());

      act(() => result.current.syncAssignedPins([makeIssue(1), makeIssue(2), makeIssue(3)]));

      expect(result.current.isPinned(1)).toBe(true);
      expect(result.current.isPinned(2)).toBe(false);
      expect(result.current.isPinned(3)).toBe(true);
    });
  });

  describe("hard reload scenarios", () => {
    it("mixed state: some hidden, some pinned, reload, new assigned", () => {
      localStorage.setItem("pin-migration-done", "true");

      const { result: r1, unmount: u1 } = renderHook(() => usePinnedIssues());
      act(() => r1.current.syncAssignedPins([makeIssue(1), makeIssue(2), makeIssue(3)]));
      act(() => {
        r1.current.toggle(makeIssue(2));
        r1.current.hide(2);
      });
      act(() => r1.current.pin(makeIssue(99)));
      u1();

      const { result: r2 } = renderHook(() => usePinnedIssues());
      expect(r2.current.isPinned(1)).toBe(true);
      expect(r2.current.isPinned(2)).toBe(false);
      expect(r2.current.isPinned(3)).toBe(true);
      expect(r2.current.isPinned(99)).toBe(true);
      expect(r2.current.hiddenAssignedIds.has(2)).toBe(true);

      act(() =>
        r2.current.syncAssignedPins([makeIssue(1), makeIssue(2), makeIssue(3), makeIssue(4)]),
      );
      expect(r2.current.isPinned(1)).toBe(true);
      expect(r2.current.isPinned(2)).toBe(false);
      expect(r2.current.isPinned(3)).toBe(true);
      expect(r2.current.isPinned(4)).toBe(true);
      expect(r2.current.isPinned(99)).toBe(true);
    });

    it("hidden issue no longer assigned → cleanup on reload sync", () => {
      localStorage.setItem("pin-migration-done", "true");

      const { result: r1, unmount: u1 } = renderHook(() => usePinnedIssues());
      act(() => r1.current.syncAssignedPins([makeIssue(5)]));
      act(() => {
        r1.current.toggle(makeIssue(5));
        r1.current.hide(5);
      });
      u1();

      const { result: r2 } = renderHook(() => usePinnedIssues());
      expect(r2.current.hiddenAssignedIds.has(5)).toBe(true);

      act(() => r2.current.syncAssignedPins([makeIssue(1)]));
      expect(r2.current.hiddenAssignedIds.has(5)).toBe(false);
    });

    it("re-pin → unhide → unpin+hide → stays hidden after reload", () => {
      localStorage.setItem("pin-migration-done", "true");

      const { result: r1, unmount: u1 } = renderHook(() => usePinnedIssues());
      const issue = makeIssue(1);

      act(() => r1.current.syncAssignedPins([issue]));
      act(() => {
        r1.current.toggle(issue);
        r1.current.hide(1);
      });

      act(() => r1.current.toggle(issue));
      expect(r1.current.isPinned(1)).toBe(true);
      expect(r1.current.hiddenAssignedIds.has(1)).toBe(false);

      act(() => {
        r1.current.toggle(issue);
        r1.current.hide(1);
      });
      u1();

      const { result: r2 } = renderHook(() => usePinnedIssues());
      expect(r2.current.isPinned(1)).toBe(false);
      expect(r2.current.hiddenAssignedIds.has(1)).toBe(true);

      act(() => r2.current.syncAssignedPins([issue]));
      expect(r2.current.isPinned(1)).toBe(false);
    });
  });
});
