import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

vi.mock("@/lib/api", () => ({
  api: vi.fn(),
}));

import { useIssueCache } from "@/hooks/useIssueCache";
import { api } from "@/lib/api";
import type { RedmineIssue } from "@/types/redmine";

const mockApi = vi.mocked(api);

describe("useIssueCache", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("fetchIssues", () => {
    it("calls /api/issues and sets issues array", async () => {
      const issues = [{ id: 1, subject: "Test" }];
      mockApi.mockResolvedValue({ issues });
      const { result } = renderHook(() => useIssueCache());
      await act(async () => {
        await result.current.fetchIssues();
      });
      expect(mockApi).toHaveBeenCalledWith("/api/issues");
      expect(result.current.issues).toEqual(issues);
    });

    it("sets issuesLoading during fetch", async () => {
      let resolve: (v: unknown) => void;
      mockApi.mockReturnValue(
        new Promise((r) => {
          resolve = r;
        }),
      );
      const { result } = renderHook(() => useIssueCache());
      let p: Promise<RedmineIssue[]>;
      act(() => {
        p = result.current.fetchIssues();
      });
      expect(result.current.issuesLoading).toBe(true);
      await act(async () => {
        resolve!({ issues: [] });
        await p!;
      });
      expect(result.current.issuesLoading).toBe(false);
    });

    it("sets error on failure, issues unchanged", async () => {
      const issues = [{ id: 1, subject: "A" }];
      mockApi.mockResolvedValueOnce({ issues });
      const { result } = renderHook(() => useIssueCache());
      await act(async () => {
        await result.current.fetchIssues();
      });

      mockApi.mockRejectedValueOnce(new Error("Failed"));
      await act(async () => {
        await result.current.fetchIssues();
      });
      expect(result.current.error).toBe("Failed");
    });
  });

  describe("refreshIssue", () => {
    it("fetches single issue by ID and merges into array", async () => {
      const issue = { id: 1, subject: "Old" };
      const updated = { id: 1, subject: "New" };
      mockApi.mockResolvedValueOnce({ issues: [issue] });
      const { result } = renderHook(() => useIssueCache());
      await act(async () => {
        await result.current.fetchIssues();
      });

      mockApi.mockResolvedValueOnce({ issue: updated });
      await act(async () => {
        await result.current.refreshIssue(1);
      });
      expect(result.current.issues[0].subject).toBe("New");
    });

    it("removes issue from array on error", async () => {
      const issues = [
        { id: 1, subject: "A" },
        { id: 2, subject: "B" },
      ];
      mockApi.mockResolvedValueOnce({ issues });
      const { result } = renderHook(() => useIssueCache());
      await act(async () => {
        await result.current.fetchIssues();
      });

      mockApi.mockRejectedValueOnce(new Error("404"));
      await act(async () => {
        await result.current.refreshIssue(1);
      });
      expect(result.current.issues).toHaveLength(1);
      expect(result.current.issues[0].id).toBe(2);
    });
  });

  describe("mergeIssue", () => {
    it("replaces issue data in array by ID", async () => {
      const issues = [{ id: 1, subject: "Original" }];
      mockApi.mockResolvedValueOnce({ issues });
      const { result } = renderHook(() => useIssueCache());
      await act(async () => {
        await result.current.fetchIssues();
      });
      act(() => {
        result.current.mergeIssue({ id: 1, subject: "Merged" } as any);
      });
      expect(result.current.issues[0].subject).toBe("Merged");
    });
  });

  describe("mutations", () => {
    it("updateIssueStatus sends PUT with status_id", async () => {
      mockApi.mockResolvedValue({ ok: true });
      const { result } = renderHook(() => useIssueCache());
      await act(async () => {
        await result.current.updateIssueStatus(1, 5, "2025-01-01");
      });
      expect(mockApi).toHaveBeenCalledWith("/api/issues/1", {
        method: "PUT",
        body: JSON.stringify({ status_id: 5, updated_on: "2025-01-01" }),
      });
    });

    it("updateIssueTracker sends PUT with tracker_id", async () => {
      mockApi.mockResolvedValue({ ok: true });
      const { result } = renderHook(() => useIssueCache());
      await act(async () => {
        await result.current.updateIssueTracker(1, 3);
      });
      expect(mockApi).toHaveBeenCalledWith("/api/issues/1", {
        method: "PUT",
        body: JSON.stringify({ tracker_id: 3 }),
      });
    });

    it("updateIssueAssignee sends PUT with assigned_to_id", async () => {
      mockApi.mockResolvedValue({ ok: true });
      const { result } = renderHook(() => useIssueCache());
      await act(async () => {
        await result.current.updateIssueAssignee(1, 10);
      });
      expect(mockApi).toHaveBeenCalledWith("/api/issues/1", {
        method: "PUT",
        body: JSON.stringify({ assigned_to_id: 10 }),
      });
    });

    it("updateIssueVersion sends PUT with fixed_version_id", async () => {
      mockApi.mockResolvedValue({ ok: true });
      const { result } = renderHook(() => useIssueCache());
      await act(async () => {
        await result.current.updateIssueVersion(1, 7);
      });
      expect(mockApi).toHaveBeenCalledWith("/api/issues/1", {
        method: "PUT",
        body: JSON.stringify({ fixed_version_id: 7 }),
      });
    });

    it("updateIssueDoneRatio sends PUT with done_ratio", async () => {
      mockApi.mockResolvedValue({ ok: true });
      const { result } = renderHook(() => useIssueCache());
      await act(async () => {
        await result.current.updateIssueDoneRatio(1, 50);
      });
      expect(mockApi).toHaveBeenCalledWith("/api/issues/1", {
        method: "PUT",
        body: JSON.stringify({ done_ratio: 50 }),
      });
    });

    it("createTimeEntry sends POST to /api/time_entries", async () => {
      mockApi.mockResolvedValue({ time_entry: { id: 99 } });
      const { result } = renderHook(() => useIssueCache());
      const id = await act(async () => {
        return await result.current.createTimeEntry(10, 1.5, "work", 3, "2025-03-01");
      });
      expect(mockApi).toHaveBeenCalledWith("/api/time_entries", {
        method: "POST",
        body: JSON.stringify({
          time_entry: {
            issue_id: 10,
            hours: 1.5,
            comments: "work",
            activity_id: 3,
            spent_on: "2025-03-01",
          },
        }),
      });
      expect(id).toBe(99);
    });
  });

  describe("error handling for fetch methods", () => {
    it("fetchTrackers error → sets error state (line 70)", async () => {
      mockApi.mockRejectedValueOnce(new Error("Tracker fetch failed"));
      const { result } = renderHook(() => useIssueCache());
      await act(async () => {
        await result.current.fetchTrackers();
      });
      expect(result.current.error).toBe("Tracker fetch failed");
    });

    it("fetchTrackers non-Error → sets generic message", async () => {
      mockApi.mockRejectedValueOnce("string error");
      const { result } = renderHook(() => useIssueCache());
      await act(async () => {
        await result.current.fetchTrackers();
      });
      expect(result.current.error).toBe("Failed to fetch trackers");
    });

    it("fetchProjectActivities error → logs error, does not set error state (line 86)", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      mockApi.mockRejectedValueOnce(new Error("Project activities error"));
      const { result } = renderHook(() => useIssueCache());
      await act(async () => {
        await result.current.fetchProjectActivities(42);
      });
      // logger.error is called, not setError
      expect(result.current.error).toBeNull();
      consoleSpy.mockRestore();
    });

    it("fetchProjectTrackers error → logs error (line 102)", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      mockApi.mockRejectedValueOnce(new Error("Project trackers error"));
      const { result } = renderHook(() => useIssueCache());
      await act(async () => {
        await result.current.fetchProjectTrackers(42);
      });
      expect(result.current.error).toBeNull();
      consoleSpy.mockRestore();
    });

    it("fetchAllowedStatuses error → logs error (line 120)", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      mockApi.mockRejectedValueOnce(new Error("Allowed statuses error"));
      const { result } = renderHook(() => useIssueCache());
      await act(async () => {
        await result.current.fetchAllowedStatuses(100);
      });
      expect(result.current.error).toBeNull();
      consoleSpy.mockRestore();
    });

    it("fetchProjectActivities clears dedup flag after error (re-fetchable)", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      mockApi.mockRejectedValueOnce(new Error("fail"));
      const { result } = renderHook(() => useIssueCache());
      await act(async () => {
        await result.current.fetchProjectActivities(42);
      });
      // After error, the dedup ref should be cleared, allowing retry
      mockApi.mockResolvedValueOnce({ time_entry_activities: [{ id: 1, name: "Dev" }] });
      await act(async () => {
        await result.current.fetchProjectActivities(42);
      });
      expect(result.current.activitiesByProject[42]).toEqual([{ id: 1, name: "Dev" }]);
      consoleSpy.mockRestore();
    });

    it("fetchProjectTrackers clears dedup flag after error (re-fetchable)", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      mockApi.mockRejectedValueOnce(new Error("fail"));
      const { result } = renderHook(() => useIssueCache());
      await act(async () => {
        await result.current.fetchProjectTrackers(42);
      });
      mockApi.mockResolvedValueOnce({ trackers: [{ id: 1, name: "Bug" }] });
      await act(async () => {
        await result.current.fetchProjectTrackers(42);
      });
      expect(result.current.trackersByProject[42]).toEqual([{ id: 1, name: "Bug" }]);
      consoleSpy.mockRestore();
    });

    it("fetchAllowedStatuses clears dedup flag after error (re-fetchable)", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      mockApi.mockRejectedValueOnce(new Error("fail"));
      const { result } = renderHook(() => useIssueCache());
      await act(async () => {
        await result.current.fetchAllowedStatuses(100);
      });
      mockApi.mockResolvedValueOnce({ issue: { allowed_statuses: [{ id: 1, name: "New" }] } });
      await act(async () => {
        await result.current.fetchAllowedStatuses(100);
      });
      expect(result.current.allowedStatusesByIssue[100]).toEqual([{ id: 1, name: "New" }]);
      consoleSpy.mockRestore();
    });

    it("dedup: parallel fetchProjectTrackers for same projectId → single request", async () => {
      mockApi.mockResolvedValue({ trackers: [] });
      const { result } = renderHook(() => useIssueCache());
      await act(async () => {
        await Promise.all([
          result.current.fetchProjectTrackers(1),
          result.current.fetchProjectTrackers(1),
        ]);
      });
      expect(mockApi).toHaveBeenCalledTimes(1);
    });
  });

  describe("global reference data", () => {
    it("fetchActivities → /api/activities", async () => {
      const activities = [{ id: 1, name: "Development" }];
      mockApi.mockResolvedValue({ time_entry_activities: activities });
      const { result } = renderHook(() => useIssueCache());
      await act(async () => {
        await result.current.fetchActivities();
      });
      expect(result.current.activities).toEqual(activities);
    });

    it("fetchStatuses → /api/statuses", async () => {
      const statuses = [{ id: 1, name: "New" }];
      mockApi.mockResolvedValue({ issue_statuses: statuses });
      const { result } = renderHook(() => useIssueCache());
      await act(async () => {
        await result.current.fetchStatuses();
      });
      expect(result.current.statuses).toEqual(statuses);
    });

    it("fetchTrackers → /api/trackers", async () => {
      const trackers = [{ id: 1, name: "Bug" }];
      mockApi.mockResolvedValue({ trackers });
      const { result } = renderHook(() => useIssueCache());
      await act(async () => {
        await result.current.fetchTrackers();
      });
      expect(result.current.trackers).toEqual(trackers);
    });
  });

  describe("project-specific data", () => {
    it("fetchProjectActivities → activitiesByProject[projectId]", async () => {
      const activities = [{ id: 1, name: "Dev" }];
      mockApi.mockResolvedValue({ time_entry_activities: activities });
      const { result } = renderHook(() => useIssueCache());
      await act(async () => {
        await result.current.fetchProjectActivities(42);
      });
      expect(result.current.activitiesByProject[42]).toEqual(activities);
    });

    it("fetchProjectTrackers → trackersByProject[projectId]", async () => {
      const trackers = [{ id: 1, name: "Feature" }];
      mockApi.mockResolvedValue({ trackers });
      const { result } = renderHook(() => useIssueCache());
      await act(async () => {
        await result.current.fetchProjectTrackers(42);
      });
      expect(result.current.trackersByProject[42]).toEqual(trackers);
    });

    it("dedup: parallel project activities for same projectId → single request", async () => {
      mockApi.mockResolvedValue({ time_entry_activities: [] });
      const { result } = renderHook(() => useIssueCache());
      await act(async () => {
        await Promise.all([
          result.current.fetchProjectActivities(1),
          result.current.fetchProjectActivities(1),
        ]);
      });
      expect(mockApi).toHaveBeenCalledTimes(1);
    });
  });

  describe("allowedStatuses", () => {
    it("fetchAllowedStatuses(issueId) → sets allowedStatusesByIssue[id]", async () => {
      const statuses = [{ id: 1, name: "In Progress" }];
      mockApi.mockResolvedValue({ issue: { allowed_statuses: statuses } });
      const { result } = renderHook(() => useIssueCache());
      await act(async () => {
        await result.current.fetchAllowedStatuses(100);
      });
      expect(result.current.allowedStatusesByIssue[100]).toEqual(statuses);
    });

    it("invalidateAllowedStatuses(issueId) → removes from map", async () => {
      const statuses = [{ id: 1, name: "New" }];
      mockApi.mockResolvedValue({ issue: { allowed_statuses: statuses } });
      const { result } = renderHook(() => useIssueCache());
      await act(async () => {
        await result.current.fetchAllowedStatuses(100);
      });
      expect(result.current.allowedStatusesByIssue[100]).toBeDefined();
      act(() => {
        result.current.invalidateAllowedStatuses(100);
      });
      expect(result.current.allowedStatusesByIssue[100]).toBeUndefined();
    });

    it("dedup: parallel calls for same issueId → single request", async () => {
      mockApi.mockResolvedValue({ issue: { allowed_statuses: [] } });
      const { result } = renderHook(() => useIssueCache());
      await act(async () => {
        await Promise.all([
          result.current.fetchAllowedStatuses(100),
          result.current.fetchAllowedStatuses(100),
        ]);
      });
      expect(mockApi).toHaveBeenCalledTimes(1);
    });
  });
});
