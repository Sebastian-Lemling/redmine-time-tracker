import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useIssueMutationHandlers } from "@/hooks/useIssueMutationHandlers";
import type { RedmineIssue } from "@/types/redmine";
import { de } from "@/i18n/translations";
import { ConflictError } from "@/lib/errors";

function makeIssue(id: number): RedmineIssue {
  return {
    id,
    subject: `Issue ${id}`,
    project: { id: 1, name: "P" },
    tracker: { id: 1, name: "Bug" },
    status: { id: 1, name: "New" },
    priority: { id: 2, name: "Normal" },
    done_ratio: 0,
    updated_on: "2025-01-01T00:00:00Z",
  } as RedmineIssue;
}

function makeDeps(overrides?: Record<string, unknown>) {
  return {
    mergedIssues: [makeIssue(1)],
    statuses: [
      { id: 1, name: "New", is_closed: false },
      { id: 2, name: "In Progress", is_closed: false },
    ],
    trackers: [
      { id: 1, name: "Bug" },
      { id: 2, name: "Feature" },
    ],
    versionsByProject: { 1: [{ id: 10, name: "v1.0" }] } as any,
    refreshIssue: vi.fn().mockResolvedValue(makeIssue(1)),
    mergeIssue: vi.fn(),
    updateIssueStatus: vi.fn().mockResolvedValue(undefined),
    updateIssueTracker: vi.fn().mockResolvedValue(undefined),
    updateIssueAssignee: vi.fn().mockResolvedValue(undefined),
    updateIssueVersion: vi.fn().mockResolvedValue(undefined),
    updateIssueDoneRatio: vi.fn().mockResolvedValue(undefined),
    invalidateAllowedStatuses: vi.fn(),
    isPinned: vi.fn().mockReturnValue(false),
    updatePinnedIssue: vi.fn(),
    updateFavoriteIssue: vi.fn(),
    setSnackbar: vi.fn(),
    onMutationSuccess: vi.fn(),
    t: de,
    ...overrides,
  };
}

describe("useIssueMutationHandlers", () => {
  it("handleStatusChange calls updateIssueStatus + invalidateAllowedStatuses", async () => {
    const deps = makeDeps();
    const { result } = renderHook(() => useIssueMutationHandlers(deps));
    await act(async () => {
      await result.current.handleStatusChange(1, 2);
    });
    expect(deps.updateIssueStatus).toHaveBeenCalledWith(1, 2, "2025-01-01T00:00:00Z");
    expect(deps.invalidateAllowedStatuses).toHaveBeenCalledWith(1);
    expect(deps.refreshIssue).toHaveBeenCalledWith(1);
    expect(deps.setSnackbar).toHaveBeenCalled();
  });

  it("handleTrackerChange calls updateIssueTracker", async () => {
    const deps = makeDeps();
    const { result } = renderHook(() => useIssueMutationHandlers(deps));
    await act(async () => {
      await result.current.handleTrackerChange(1, 2);
    });
    expect(deps.updateIssueTracker).toHaveBeenCalledWith(1, 2, "2025-01-01T00:00:00Z");
  });

  it("handleAssigneeChange calls updateIssueAssignee", async () => {
    const deps = makeDeps();
    const { result } = renderHook(() => useIssueMutationHandlers(deps));
    await act(async () => {
      await result.current.handleAssigneeChange(1, 10);
    });
    expect(deps.updateIssueAssignee).toHaveBeenCalledWith(1, 10, "2025-01-01T00:00:00Z");
  });

  it("handleVersionChange calls updateIssueVersion", async () => {
    const deps = makeDeps();
    const { result } = renderHook(() => useIssueMutationHandlers(deps));
    await act(async () => {
      await result.current.handleVersionChange(1, 10);
    });
    expect(deps.updateIssueVersion).toHaveBeenCalledWith(1, 10, "2025-01-01T00:00:00Z");
  });

  it("handleDoneRatioChange calls updateIssueDoneRatio", async () => {
    const deps = makeDeps();
    const { result } = renderHook(() => useIssueMutationHandlers(deps));
    await act(async () => {
      await result.current.handleDoneRatioChange(1, 50);
    });
    expect(deps.updateIssueDoneRatio).toHaveBeenCalledWith(1, 50, "2025-01-01T00:00:00Z");
  });

  it("409 conflict → merges server version + shows conflict message", async () => {
    const serverIssue = makeIssue(1);
    serverIssue.subject = "Server Version";
    const err = new ConflictError("Conflict", { current_issue: serverIssue }, serverIssue);
    const deps = makeDeps({
      updateIssueStatus: vi.fn().mockRejectedValue(err),
    });
    const { result } = renderHook(() => useIssueMutationHandlers(deps));
    await act(async () => {
      await result.current.handleStatusChange(1, 2);
    });
    expect(deps.mergeIssue).toHaveBeenCalledWith(serverIssue);
    expect(deps.setSnackbar).toHaveBeenCalledWith(de.conflictDetected);
  });

  it("network error → shows error message", async () => {
    const deps = makeDeps({
      updateIssueStatus: vi.fn().mockRejectedValue(new Error("Network down")),
    });
    const { result } = renderHook(() => useIssueMutationHandlers(deps));
    await act(async () => {
      await result.current.handleStatusChange(1, 2);
    });
    expect(deps.setSnackbar).toHaveBeenCalledWith("Network down");
  });

  it("on success + pinned → calls updatePinnedIssue", async () => {
    const deps = makeDeps({ isPinned: vi.fn().mockReturnValue(true) });
    const { result } = renderHook(() => useIssueMutationHandlers(deps));
    await act(async () => {
      await result.current.handleStatusChange(1, 2);
    });
    expect(deps.updatePinnedIssue).toHaveBeenCalled();
  });

  it("on success → calls onMutationSuccess callback", async () => {
    const deps = makeDeps();
    const { result } = renderHook(() => useIssueMutationHandlers(deps));
    await act(async () => {
      await result.current.handleStatusChange(1, 2);
    });
    expect(deps.onMutationSuccess).toHaveBeenCalled();
  });
});
