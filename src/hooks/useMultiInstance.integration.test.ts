import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { api } from "@/lib/api";
import { useUser } from "@/hooks/useUser";
import { useIssueCache } from "@/hooks/useIssueCache";
import { useIssueDetails } from "@/hooks/useIssueDetails";
import { useIssueSearch } from "@/hooks/useIssueSearch";
import { useProjectData } from "@/hooks/useProjectData";
import { useRemoteEntries } from "@/hooks/useRemoteEntries";
import { useInstances } from "@/hooks/useInstances";
import { useRedmine } from "@/hooks/useRedmine";
import { useSyncOrchestrator } from "@/hooks/useSyncOrchestrator";
import { timerKey, parseTimerKey } from "@/types/redmine";
import type { RedmineInstance, TimeLogEntry } from "@/types/redmine";
import {
  createUser,
  createIssue,
  createProject,
  createActivity,
  createTimeEntry,
  createTimeLogEntry,
} from "@/test/fixtures";
import { de } from "@/i18n/translations";

vi.mock("@/lib/api");
const mockApi = vi.mocked(api);

const INST_BUGS = "bugs";
const INST_SUPPORT = "support";

const bugUser = createUser({ id: 1, login: "dev", firstname: "Dev", lastname: "User" });
const supportUser = createUser({ id: 2, login: "agent", firstname: "Support", lastname: "Agent" });

beforeEach(() => {
  vi.clearAllMocks();
  // Reset URLSearchParams for useIssueSearch
  history.replaceState(null, "", window.location.pathname);
});

// =============================================================================
// 1. useUser — per-instance API prefix
// =============================================================================

describe("useUser — multi-instance routing", () => {
  it("fetches /api/me when no instanceId", async () => {
    mockApi.mockResolvedValueOnce({ user: bugUser, redmineUrl: "https://bugs.test" });
    const { result } = renderHook(() => useUser());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockApi).toHaveBeenCalledWith("/api/me", expect.any(Object));
    expect(result.current.user).toEqual(bugUser);
    expect(result.current.redmineUrl).toBe("https://bugs.test");
  });

  it("fetches /api/i/:instanceId/me when instanceId provided", async () => {
    mockApi.mockResolvedValueOnce({ user: supportUser, redmineUrl: "https://support.test" });
    const { result } = renderHook(() => useUser(INST_SUPPORT));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockApi).toHaveBeenCalledWith(`/api/i/${INST_SUPPORT}/me`, expect.any(Object));
    expect(result.current.user).toEqual(supportUser);
  });

  it("two instances produce two separate API calls", async () => {
    mockApi
      .mockResolvedValueOnce({ user: bugUser, redmineUrl: "https://bugs.test" })
      .mockResolvedValueOnce({ user: supportUser, redmineUrl: "https://support.test" });

    const { result: r1 } = renderHook(() => useUser(INST_BUGS));
    const { result: r2 } = renderHook(() => useUser(INST_SUPPORT));

    await waitFor(() => expect(r1.current.loading).toBe(false));
    await waitFor(() => expect(r2.current.loading).toBe(false));

    expect(mockApi).toHaveBeenCalledWith(`/api/i/${INST_BUGS}/me`, expect.any(Object));
    expect(mockApi).toHaveBeenCalledWith(`/api/i/${INST_SUPPORT}/me`, expect.any(Object));
    expect(r1.current.user?.id).toBe(1);
    expect(r2.current.user?.id).toBe(2);
  });

  it("handles API error gracefully", async () => {
    mockApi.mockRejectedValueOnce(new Error("Connection refused"));
    const { result } = renderHook(() => useUser(INST_BUGS));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("Connection refused");
    expect(result.current.user).toBeNull();
  });
});

// =============================================================================
// 2. useInstances — instance list management
// =============================================================================

describe("useInstances — multi-instance management", () => {
  const instances: RedmineInstance[] = [
    { id: INST_BUGS, name: "BugTracker", url: "https://bugs.test", order: 0 },
    { id: INST_SUPPORT, name: "Support", url: "https://support.test", order: 1 },
  ];

  it("loads instances sorted by order", async () => {
    mockApi.mockResolvedValueOnce([instances[1], instances[0]]);
    const { result } = renderHook(() => useInstances());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.instances[0].id).toBe(INST_BUGS);
    expect(result.current.instances[1].id).toBe(INST_SUPPORT);
  });

  it("calls /api/instances endpoint", async () => {
    mockApi.mockResolvedValueOnce(instances);
    renderHook(() => useInstances());

    await waitFor(() => expect(mockApi).toHaveBeenCalledWith("/api/instances", expect.any(Object)));
  });

  it("falls back to single default instance on error", async () => {
    mockApi.mockRejectedValueOnce(new Error("500"));
    const { result } = renderHook(() => useInstances());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.instances).toHaveLength(1);
    expect(result.current.instances[0].id).toBe("default");
  });

  it("instanceMap provides O(1) lookup by id", async () => {
    mockApi.mockResolvedValueOnce(instances);
    const { result } = renderHook(() => useInstances());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.instanceMap.get(INST_BUGS)?.name).toBe("BugTracker");
    expect(result.current.instanceMap.get(INST_SUPPORT)?.name).toBe("Support");
    expect(result.current.instanceMap.get("nonexistent")).toBeUndefined();
  });

  it("getInstanceName returns name or falls back to id", async () => {
    mockApi.mockResolvedValueOnce(instances);
    const { result } = renderHook(() => useInstances());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.getInstanceName(INST_BUGS)).toBe("BugTracker");
    expect(result.current.getInstanceName("unknown")).toBe("unknown");
  });

  it("renameInstance sends PUT with updated array", async () => {
    mockApi.mockResolvedValueOnce(instances);
    const { result } = renderHook(() => useInstances());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const renamed = instances.map((i) => (i.id === INST_BUGS ? { ...i, name: "Renamed" } : i));
    mockApi.mockResolvedValueOnce(renamed);

    await act(async () => {
      await result.current.renameInstance(INST_BUGS, "Renamed");
    });

    expect(mockApi).toHaveBeenCalledWith(
      "/api/instances",
      expect.objectContaining({ method: "PUT" }),
    );
    expect(result.current.instances[0].name).toBe("Renamed");
  });

  it("renameInstance reverts on server error", async () => {
    mockApi.mockResolvedValueOnce(instances);
    const { result } = renderHook(() => useInstances());
    await waitFor(() => expect(result.current.loading).toBe(false));

    mockApi.mockRejectedValueOnce(new Error("Server error"));

    await act(async () => {
      await result.current.renameInstance(INST_BUGS, "Bad");
    });

    expect(result.current.instances[0].name).toBe("BugTracker");
  });

  it("reorderInstances assigns new order indices", async () => {
    mockApi.mockResolvedValueOnce(instances);
    const { result } = renderHook(() => useInstances());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const swapped = [instances[1], instances[0]];
    const serverResult = [
      { ...instances[1], order: 0 },
      { ...instances[0], order: 1 },
    ];
    mockApi.mockResolvedValueOnce(serverResult);

    await act(async () => {
      await result.current.reorderInstances(swapped);
    });

    expect(result.current.instances[0].id).toBe(INST_SUPPORT);
    expect(result.current.instances[1].id).toBe(INST_BUGS);
  });
});

// =============================================================================
// 3. useIssueCache — per-instance API routing for all endpoints
// =============================================================================

describe("useIssueCache — multi-instance routing", () => {
  it("fetchIssues uses /api/i/:id/issues", async () => {
    mockApi.mockResolvedValueOnce({ issues: [createIssue()] });
    const { result } = renderHook(() => useIssueCache(INST_BUGS));

    await act(async () => {
      await result.current.fetchIssues();
    });

    expect(mockApi).toHaveBeenCalledWith(`/api/i/${INST_BUGS}/issues`);
  });

  it("fetchIssues uses /api/issues when no instanceId (catch-all route)", async () => {
    mockApi.mockResolvedValueOnce({ issues: [] });
    const { result } = renderHook(() => useIssueCache());

    await act(async () => {
      await result.current.fetchIssues();
    });

    expect(mockApi).toHaveBeenCalledWith("/api/issues");
  });

  it("fetchActivities routes per instance", async () => {
    mockApi.mockResolvedValueOnce({ time_entry_activities: [createActivity()] });
    const { result } = renderHook(() => useIssueCache(INST_SUPPORT));

    await act(async () => {
      await result.current.fetchActivities();
    });

    expect(mockApi).toHaveBeenCalledWith(`/api/i/${INST_SUPPORT}/activities`);
  });

  it("fetchActivities without instanceId uses /api/activities (catch-all)", async () => {
    mockApi.mockResolvedValueOnce({ time_entry_activities: [] });
    const { result } = renderHook(() => useIssueCache());

    await act(async () => {
      await result.current.fetchActivities();
    });

    expect(mockApi).toHaveBeenCalledWith("/api/activities");
  });

  it("fetchStatuses routes per instance", async () => {
    mockApi.mockResolvedValueOnce({ issue_statuses: [{ id: 1, name: "New", is_closed: false }] });
    const { result } = renderHook(() => useIssueCache(INST_BUGS));

    await act(async () => {
      await result.current.fetchStatuses();
    });

    expect(mockApi).toHaveBeenCalledWith(`/api/i/${INST_BUGS}/statuses`);
  });

  it("fetchTrackers routes per instance", async () => {
    mockApi.mockResolvedValueOnce({ trackers: [{ id: 1, name: "Bug" }] });
    const { result } = renderHook(() => useIssueCache(INST_SUPPORT));

    await act(async () => {
      await result.current.fetchTrackers();
    });

    expect(mockApi).toHaveBeenCalledWith(`/api/i/${INST_SUPPORT}/trackers`);
  });

  it("fetchProjectActivities routes per instance", async () => {
    mockApi.mockResolvedValueOnce({ time_entry_activities: [createActivity()] });
    const { result } = renderHook(() => useIssueCache(INST_BUGS));

    await act(async () => {
      await result.current.fetchProjectActivities(42);
    });

    expect(mockApi).toHaveBeenCalledWith(`/api/i/${INST_BUGS}/projects/42/activities`);
  });

  it("fetchProjectTrackers routes per instance", async () => {
    mockApi.mockResolvedValueOnce({ trackers: [{ id: 2, name: "Feature" }] });
    const { result } = renderHook(() => useIssueCache(INST_SUPPORT));

    await act(async () => {
      await result.current.fetchProjectTrackers(7);
    });

    expect(mockApi).toHaveBeenCalledWith(`/api/i/${INST_SUPPORT}/projects/7/trackers`);
  });

  it("fetchAllowedStatuses routes per instance", async () => {
    mockApi.mockResolvedValueOnce({ issue: { allowed_statuses: [] } });
    const { result } = renderHook(() => useIssueCache(INST_BUGS));

    await act(async () => {
      await result.current.fetchAllowedStatuses(101);
    });

    expect(mockApi).toHaveBeenCalledWith(`/api/i/${INST_BUGS}/issues/101?include=allowed_statuses`);
  });

  it("refreshIssue routes per instance", async () => {
    mockApi.mockResolvedValueOnce({ issue: createIssue({ id: 101 }) });
    const { result } = renderHook(() => useIssueCache(INST_SUPPORT));

    await act(async () => {
      await result.current.refreshIssue(101);
    });

    expect(mockApi).toHaveBeenCalledWith(`/api/i/${INST_SUPPORT}/issues/101`);
  });

  it("updateIssueStatus sends PUT to instance route", async () => {
    mockApi.mockResolvedValueOnce({ ok: true });
    const { result } = renderHook(() => useIssueCache(INST_BUGS));

    await act(async () => {
      await result.current.updateIssueStatus(101, 3);
    });

    expect(mockApi).toHaveBeenCalledWith(`/api/i/${INST_BUGS}/issues/101`, {
      method: "PUT",
      body: JSON.stringify({ status_id: 3 }),
    });
  });

  it("updateIssueStatus includes updated_on when provided", async () => {
    mockApi.mockResolvedValueOnce({ ok: true });
    const { result } = renderHook(() => useIssueCache(INST_BUGS));

    await act(async () => {
      await result.current.updateIssueStatus(101, 3, "2026-03-07T00:00:00Z");
    });

    expect(mockApi).toHaveBeenCalledWith(`/api/i/${INST_BUGS}/issues/101`, {
      method: "PUT",
      body: JSON.stringify({ status_id: 3, updated_on: "2026-03-07T00:00:00Z" }),
    });
  });

  it("updateIssueAssignee sends PUT to instance route", async () => {
    mockApi.mockResolvedValueOnce({ ok: true });
    const { result } = renderHook(() => useIssueCache(INST_SUPPORT));

    await act(async () => {
      await result.current.updateIssueAssignee(101, 5);
    });

    expect(mockApi).toHaveBeenCalledWith(`/api/i/${INST_SUPPORT}/issues/101`, {
      method: "PUT",
      body: JSON.stringify({ assigned_to_id: 5 }),
    });
  });

  it("updateIssueTracker sends PUT to instance route", async () => {
    mockApi.mockResolvedValueOnce({ ok: true });
    const { result } = renderHook(() => useIssueCache(INST_BUGS));

    await act(async () => {
      await result.current.updateIssueTracker(101, 2);
    });

    expect(mockApi).toHaveBeenCalledWith(`/api/i/${INST_BUGS}/issues/101`, {
      method: "PUT",
      body: JSON.stringify({ tracker_id: 2 }),
    });
  });

  it("updateIssueVersion sends PUT to instance route", async () => {
    mockApi.mockResolvedValueOnce({ ok: true });
    const { result } = renderHook(() => useIssueCache(INST_BUGS));

    await act(async () => {
      await result.current.updateIssueVersion(101, 10);
    });

    expect(mockApi).toHaveBeenCalledWith(`/api/i/${INST_BUGS}/issues/101`, {
      method: "PUT",
      body: JSON.stringify({ fixed_version_id: 10 }),
    });
  });

  it("updateIssueDoneRatio sends PUT to instance route", async () => {
    mockApi.mockResolvedValueOnce({ ok: true });
    const { result } = renderHook(() => useIssueCache(INST_SUPPORT));

    await act(async () => {
      await result.current.updateIssueDoneRatio(101, 50);
    });

    expect(mockApi).toHaveBeenCalledWith(`/api/i/${INST_SUPPORT}/issues/101`, {
      method: "PUT",
      body: JSON.stringify({ done_ratio: 50 }),
    });
  });

  it("createTimeEntry posts to instance route", async () => {
    mockApi.mockResolvedValueOnce({ time_entry: { id: 999 } });
    const { result } = renderHook(() => useIssueCache(INST_BUGS));

    let redmineId: number | undefined;
    await act(async () => {
      redmineId = await result.current.createTimeEntry(101, 1.5, "Did work", 9, "2026-03-07");
    });

    expect(redmineId).toBe(999);
    expect(mockApi).toHaveBeenCalledWith(`/api/i/${INST_BUGS}/time_entries`, {
      method: "POST",
      body: JSON.stringify({
        time_entry: {
          issue_id: 101,
          hours: 1.5,
          comments: "Did work",
          activity_id: 9,
          spent_on: "2026-03-07",
        },
      }),
    });
  });

  it("handles fetchIssues API error gracefully", async () => {
    mockApi.mockRejectedValueOnce(new Error("Timeout"));
    const { result } = renderHook(() => useIssueCache(INST_BUGS));

    await act(async () => {
      const issues = await result.current.fetchIssues();
      expect(issues).toEqual([]);
    });

    expect(result.current.error).toBe("Timeout");
  });

  it("invalidateAllowedStatuses removes cached statuses for an issue", async () => {
    mockApi.mockResolvedValueOnce({
      issue: { allowed_statuses: [{ id: 1, name: "New", is_closed: false }] },
    });
    const { result } = renderHook(() => useIssueCache(INST_BUGS));

    await act(async () => {
      await result.current.fetchAllowedStatuses(101);
    });
    expect(result.current.allowedStatusesByIssue[101]).toHaveLength(1);

    act(() => {
      result.current.invalidateAllowedStatuses(101);
    });
    expect(result.current.allowedStatusesByIssue[101]).toBeUndefined();
  });

  it("mergeIssue updates in-memory issue list", async () => {
    const issue = createIssue({ id: 101, subject: "Original" });
    mockApi.mockResolvedValueOnce({ issues: [issue] });
    const { result } = renderHook(() => useIssueCache(INST_BUGS));

    await act(async () => {
      await result.current.fetchIssues();
    });
    expect(result.current.issues[0].subject).toBe("Original");

    act(() => {
      result.current.mergeIssue(createIssue({ id: 101, subject: "Updated" }));
    });
    expect(result.current.issues[0].subject).toBe("Updated");
  });
});

// =============================================================================
// 4. useIssueDetails — per-instance subject and description fetching
// =============================================================================

describe("useIssueDetails — multi-instance routing", () => {
  it("fetchIssueSubject uses instance prefix", async () => {
    mockApi.mockResolvedValueOnce({ issue: { id: 101, subject: "Bug title" } });
    const { result } = renderHook(() => useIssueDetails(INST_BUGS));

    await act(async () => {
      await result.current.fetchIssueSubject(101);
    });

    expect(mockApi).toHaveBeenCalledWith(`/api/i/${INST_BUGS}/issues/101`);
    expect(result.current.issueSubjects[101]).toBe("Bug title");
  });

  it("fetchIssueSubject without instanceId uses /api (catch-all)", async () => {
    mockApi.mockResolvedValueOnce({ issue: { id: 200, subject: "Legacy" } });
    const { result } = renderHook(() => useIssueDetails());

    await act(async () => {
      await result.current.fetchIssueSubject(200);
    });

    expect(mockApi).toHaveBeenCalledWith("/api/issues/200");
    expect(result.current.issueSubjects[200]).toBe("Legacy");
  });

  it("fetchIssueDescription fetches with journals include", async () => {
    const journals = [
      {
        id: 1,
        user: { id: 1, name: "Dev" },
        notes: "Fixed in v2",
        created_on: "2026-03-07T10:00:00Z",
      },
    ];
    mockApi.mockResolvedValueOnce({
      issue: { id: 101, description: "A bug", journals },
    });
    const { result } = renderHook(() => useIssueDetails(INST_SUPPORT));

    await act(async () => {
      await result.current.fetchIssueDescription(101);
    });

    expect(mockApi).toHaveBeenCalledWith(
      `/api/i/${INST_SUPPORT}/issues/101?include=journals,attachments`,
    );
    expect(result.current.issueDescriptions[101]).toBe("A bug");
    expect(result.current.issueComments[101]).toHaveLength(1);
    expect(result.current.issueComments[101][0].notes).toBe("Fixed in v2");
  });

  it("fetchIssueDescription filters journals with empty notes", async () => {
    const journals = [
      {
        id: 1,
        user: { id: 1, name: "Dev" },
        notes: "Real note",
        created_on: "2026-03-07T10:00:00Z",
      },
      { id: 2, user: { id: 1, name: "Dev" }, notes: "", created_on: "2026-03-07T11:00:00Z" },
      { id: 3, user: { id: 1, name: "Dev" }, notes: "  ", created_on: "2026-03-07T12:00:00Z" },
    ];
    mockApi.mockResolvedValueOnce({
      issue: { id: 101, description: "desc", journals },
    });
    const { result } = renderHook(() => useIssueDetails(INST_BUGS));

    await act(async () => {
      await result.current.fetchIssueDescription(101);
    });

    expect(result.current.issueComments[101]).toHaveLength(1);
    expect(result.current.issueComments[101][0].id).toBe(1);
  });

  it("deduplicates concurrent fetchIssueSubject calls", async () => {
    mockApi.mockResolvedValue({ issue: { id: 101, subject: "Title" } });
    const { result } = renderHook(() => useIssueDetails(INST_BUGS));

    await act(async () => {
      result.current.fetchIssueSubject(101);
      result.current.fetchIssueSubject(101);
      // Allow both to settle
      await new Promise((r) => setTimeout(r, 50));
    });

    // Only one API call despite two invocations
    const calls = mockApi.mock.calls.filter((c) => (c[0] as string).includes("/issues/101"));
    expect(calls).toHaveLength(1);
  });

  it("handles fetchIssueSubject error gracefully", async () => {
    mockApi.mockRejectedValueOnce(new Error("404"));
    const { result } = renderHook(() => useIssueDetails(INST_BUGS));

    await act(async () => {
      await result.current.fetchIssueSubject(999);
    });

    // No crash, subject just not stored
    expect(result.current.issueSubjects[999]).toBeUndefined();
  });
});

// =============================================================================
// 5. useProjectData — per-instance members and versions
// =============================================================================

describe("useProjectData — multi-instance routing", () => {
  it("fetchProjectMembers uses instance prefix", async () => {
    const members = [{ id: 1, name: "Dev User" }];
    mockApi.mockResolvedValueOnce({ members });
    const { result } = renderHook(() => useProjectData(INST_BUGS));

    await act(async () => {
      await result.current.fetchProjectMembers(42);
    });

    expect(mockApi).toHaveBeenCalledWith(`/api/i/${INST_BUGS}/projects/42/members`);
    expect(result.current.membersByProject[42]).toEqual(members);
  });

  it("fetchProjectMembers without instanceId uses /api (catch-all)", async () => {
    mockApi.mockResolvedValueOnce({ members: [] });
    const { result } = renderHook(() => useProjectData());

    await act(async () => {
      await result.current.fetchProjectMembers(42);
    });

    expect(mockApi).toHaveBeenCalledWith("/api/projects/42/members");
  });

  it("fetchProjectVersions uses instance prefix and filters open", async () => {
    const versions = [
      { id: 1, name: "v1.0", status: "open" },
      { id: 2, name: "v0.9", status: "closed" },
    ];
    mockApi.mockResolvedValueOnce({ versions });
    const { result } = renderHook(() => useProjectData(INST_SUPPORT));

    await act(async () => {
      await result.current.fetchProjectVersions(7);
    });

    expect(mockApi).toHaveBeenCalledWith(`/api/i/${INST_SUPPORT}/projects/7/versions`);
    expect(result.current.versionsByProject[7]).toHaveLength(1);
    expect(result.current.versionsByProject[7][0].name).toBe("v1.0");
  });

  it("deduplicates concurrent fetchProjectMembers calls", async () => {
    mockApi.mockResolvedValue({ members: [{ id: 1, name: "Dev" }] });
    const { result } = renderHook(() => useProjectData(INST_BUGS));

    await act(async () => {
      result.current.fetchProjectMembers(42);
      result.current.fetchProjectMembers(42);
      await new Promise((r) => setTimeout(r, 50));
    });

    const calls = mockApi.mock.calls.filter((c) =>
      (c[0] as string).includes("/projects/42/members"),
    );
    expect(calls).toHaveLength(1);
  });

  it("different projects produce separate API calls", async () => {
    mockApi
      .mockResolvedValueOnce({ members: [{ id: 1, name: "A" }] })
      .mockResolvedValueOnce({ members: [{ id: 2, name: "B" }] });
    const { result } = renderHook(() => useProjectData(INST_BUGS));

    await act(async () => {
      await result.current.fetchProjectMembers(1);
      await result.current.fetchProjectMembers(2);
    });

    expect(result.current.membersByProject[1]).toHaveLength(1);
    expect(result.current.membersByProject[2]).toHaveLength(1);
  });
});

// =============================================================================
// 6. useRemoteEntries — per-instance time entry fetching
// =============================================================================

describe("useRemoteEntries — multi-instance routing", () => {
  it("fetchRemoteEntries uses instance prefix", async () => {
    const entries = [createTimeEntry({ instanceId: INST_BUGS })];
    mockApi.mockResolvedValueOnce({ time_entries: entries });
    const { result } = renderHook(() => useRemoteEntries(INST_BUGS));

    await act(async () => {
      await result.current.fetchRemoteEntries("2026-03-01", "2026-03-07");
    });

    expect(mockApi).toHaveBeenCalledWith(
      `/api/i/${INST_BUGS}/time_entries/range?from=2026-03-01&to=2026-03-07`,
      expect.any(Object),
    );
    expect(result.current.remoteEntries).toEqual(entries);
  });

  it("fetchRemoteEntries without instanceId uses /api (catch-all)", async () => {
    mockApi.mockResolvedValueOnce({ time_entries: [] });
    const { result } = renderHook(() => useRemoteEntries());

    await act(async () => {
      await result.current.fetchRemoteEntries("2026-03-01", "2026-03-07");
    });

    expect(mockApi).toHaveBeenCalledWith(
      "/api/time_entries/range?from=2026-03-01&to=2026-03-07",
      expect.any(Object),
    );
  });

  it("deduplicates same date range (no re-fetch without force)", async () => {
    mockApi.mockResolvedValueOnce({ time_entries: [] });
    const { result } = renderHook(() => useRemoteEntries(INST_BUGS));

    await act(async () => {
      await result.current.fetchRemoteEntries("2026-03-01", "2026-03-07");
    });
    expect(mockApi).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.fetchRemoteEntries("2026-03-01", "2026-03-07");
    });
    // Still just 1 call — same range is deduped
    expect(mockApi).toHaveBeenCalledTimes(1);
  });

  it("force=true re-fetches same date range", async () => {
    mockApi
      .mockResolvedValueOnce({ time_entries: [] })
      .mockResolvedValueOnce({ time_entries: [createTimeEntry()] });
    const { result } = renderHook(() => useRemoteEntries(INST_BUGS));

    await act(async () => {
      await result.current.fetchRemoteEntries("2026-03-01", "2026-03-07");
    });
    await act(async () => {
      await result.current.fetchRemoteEntries("2026-03-01", "2026-03-07", true);
    });

    expect(mockApi).toHaveBeenCalledTimes(2);
    expect(result.current.remoteEntries).toHaveLength(1);
  });

  it("refreshRemoteEntries re-fetches current range", async () => {
    mockApi
      .mockResolvedValueOnce({ time_entries: [] })
      .mockResolvedValueOnce({ time_entries: [createTimeEntry()] });
    const { result } = renderHook(() => useRemoteEntries(INST_BUGS));

    await act(async () => {
      await result.current.fetchRemoteEntries("2026-03-01", "2026-03-07");
    });
    await act(async () => {
      await result.current.refreshRemoteEntries();
    });

    expect(mockApi).toHaveBeenCalledTimes(2);
    expect(result.current.remoteEntries).toHaveLength(1);
  });

  it("different date range triggers new fetch", async () => {
    mockApi
      .mockResolvedValueOnce({ time_entries: [] })
      .mockResolvedValueOnce({ time_entries: [createTimeEntry()] });
    const { result } = renderHook(() => useRemoteEntries(INST_BUGS));

    await act(async () => {
      await result.current.fetchRemoteEntries("2026-03-01", "2026-03-07");
    });
    await act(async () => {
      await result.current.fetchRemoteEntries("2026-03-08", "2026-03-14");
    });

    expect(mockApi).toHaveBeenCalledTimes(2);
  });
});

// =============================================================================
// 7. useIssueSearch — per-instance search and filter API
// =============================================================================

describe("useIssueSearch — multi-instance routing", () => {
  it("loads projects from instance prefix", async () => {
    const projects = [createProject({ id: 1, name: "Alpha" })];
    mockApi.mockResolvedValueOnce({ projects }).mockResolvedValueOnce({ issue_priorities: [] });
    const { result } = renderHook(() => useIssueSearch(INST_BUGS));

    await waitFor(() => expect(result.current.projects).toHaveLength(1));
    expect(mockApi).toHaveBeenCalledWith(`/api/i/${INST_BUGS}/projects`);
  });

  it("loads priorities from instance prefix", async () => {
    const priorities = [{ id: 2, name: "Normal", is_default: true }];
    mockApi
      .mockResolvedValueOnce({ projects: [] })
      .mockResolvedValueOnce({ issue_priorities: priorities });
    const { result } = renderHook(() => useIssueSearch(INST_SUPPORT));

    await waitFor(() => expect(result.current.priorities).toHaveLength(1));
    expect(mockApi).toHaveBeenCalledWith(`/api/i/${INST_SUPPORT}/priorities`);
  });

  it("search queries use instance prefix", async () => {
    mockApi
      .mockResolvedValueOnce({ projects: [] })
      .mockResolvedValueOnce({ issue_priorities: [] })
      .mockResolvedValueOnce({ issues: [createIssue()], total_count: 1, offset: 0, limit: 25 });
    const { result } = renderHook(() => useIssueSearch(INST_BUGS));

    act(() => {
      result.current.setParam("q", "test bug");
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    await waitFor(() => expect(result.current.results).toHaveLength(1));

    const searchCall = mockApi.mock.calls.find(
      (c) => typeof c[0] === "string" && c[0].includes("/issues/search"),
    );
    expect(searchCall).toBeDefined();
    expect(searchCall![0]).toContain(`/api/i/${INST_BUGS}/issues/search`);
    expect(searchCall![0]).toContain("q=test+bug");
  });

  it("search without instanceId uses /api prefix (catch-all)", async () => {
    mockApi
      .mockResolvedValueOnce({ projects: [] })
      .mockResolvedValueOnce({ issue_priorities: [] })
      .mockResolvedValueOnce({ issues: [createIssue()], total_count: 1, offset: 0, limit: 25 });
    const { result } = renderHook(() => useIssueSearch());

    act(() => {
      result.current.setParam("q", "test");
    });

    await waitFor(() => expect(result.current.results).toHaveLength(1));

    const searchCall = mockApi.mock.calls.find(
      (c) => typeof c[0] === "string" && c[0].includes("/issues/search"),
    );
    expect(searchCall).toBeDefined();
    expect(searchCall![0]).toMatch(/^\/api\/issues\/search/);
  });

  it("filter parameters are included in search URL", async () => {
    mockApi
      .mockResolvedValueOnce({ projects: [createProject()] })
      .mockResolvedValueOnce({ issue_priorities: [] })
      .mockResolvedValueOnce({ issues: [createIssue()], total_count: 1, offset: 0, limit: 25 });
    const { result } = renderHook(() => useIssueSearch(INST_BUGS));

    act(() => {
      result.current.setParam("project_id", 42);
    });

    await waitFor(() => expect(result.current.results).toHaveLength(1));

    const searchCall = mockApi.mock.calls.find(
      (c) => typeof c[0] === "string" && c[0].includes("/issues/search"),
    );
    expect(searchCall).toBeDefined();
    expect(searchCall![0]).toContain("project_id=42");
  });

  it("resetFilters clears all filter params but preserves q", async () => {
    mockApi.mockResolvedValue({
      projects: [],
      issue_priorities: [],
      issues: [],
      total_count: 0,
      offset: 0,
      limit: 25,
    });
    const { result } = renderHook(() => useIssueSearch(INST_BUGS));

    act(() => {
      result.current.setParam("q", "test");
      result.current.setParam("project_id", 1);
      result.current.setParam("status_id", "2");
    });

    expect(result.current.hasActiveFilters).toBe(true);

    act(() => {
      result.current.resetFilters();
    });

    expect(result.current.hasActiveFilters).toBe(false);
    expect(result.current.params.q).toBe("test");
    expect(result.current.params.project_id).toBeUndefined();
  });

  it("loadMore increments offset", async () => {
    mockApi
      .mockResolvedValueOnce({ projects: [] })
      .mockResolvedValueOnce({ issue_priorities: [] })
      .mockResolvedValueOnce({
        issues: Array.from({ length: 25 }, (_, i) => createIssue({ id: i + 1 })),
        total_count: 50,
        offset: 0,
        limit: 25,
      })
      .mockResolvedValueOnce({
        issues: Array.from({ length: 25 }, (_, i) => createIssue({ id: i + 26 })),
        total_count: 50,
        offset: 25,
        limit: 25,
      });
    const { result } = renderHook(() => useIssueSearch(INST_BUGS));

    act(() => {
      result.current.setParam("q", "bug");
    });

    await waitFor(() => expect(result.current.results).toHaveLength(25));
    expect(result.current.hasMore).toBe(true);

    act(() => {
      result.current.loadMore();
    });

    await waitFor(() => expect(result.current.results).toHaveLength(50));
    expect(result.current.hasMore).toBe(false);
  });
});

// =============================================================================
// 8. useRedmine — composition of per-instance hooks
// =============================================================================

describe("useRedmine — multi-instance composition", () => {
  it("creates all sub-hooks with the given instanceId", async () => {
    mockApi.mockResolvedValueOnce({ user: bugUser, redmineUrl: "https://bugs.test" });
    const { result } = renderHook(() => useRedmine(INST_BUGS));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user).toEqual(bugUser);
    expect(result.current.redmineUrl).toBe("https://bugs.test");
    expect(mockApi).toHaveBeenCalledWith(`/api/i/${INST_BUGS}/me`, expect.any(Object));
  });

  it("exposes all sub-hook functions", async () => {
    mockApi.mockResolvedValueOnce({ user: bugUser, redmineUrl: "https://bugs.test" });
    const { result } = renderHook(() => useRedmine(INST_BUGS));

    await waitFor(() => expect(result.current.loading).toBe(false));

    // Verify all API functions exist
    expect(typeof result.current.fetchIssues).toBe("function");
    expect(typeof result.current.fetchActivities).toBe("function");
    expect(typeof result.current.fetchStatuses).toBe("function");
    expect(typeof result.current.fetchTrackers).toBe("function");
    expect(typeof result.current.fetchProjectActivities).toBe("function");
    expect(typeof result.current.fetchProjectTrackers).toBe("function");
    expect(typeof result.current.fetchAllowedStatuses).toBe("function");
    expect(typeof result.current.refreshIssue).toBe("function");
    expect(typeof result.current.mergeIssue).toBe("function");
    expect(typeof result.current.updateIssueStatus).toBe("function");
    expect(typeof result.current.updateIssueAssignee).toBe("function");
    expect(typeof result.current.updateIssueTracker).toBe("function");
    expect(typeof result.current.updateIssueVersion).toBe("function");
    expect(typeof result.current.updateIssueDoneRatio).toBe("function");
    expect(typeof result.current.createTimeEntry).toBe("function");
    expect(typeof result.current.fetchProjectMembers).toBe("function");
    expect(typeof result.current.fetchProjectVersions).toBe("function");
    expect(typeof result.current.fetchIssueSubject).toBe("function");
    expect(typeof result.current.fetchIssueDescription).toBe("function");
    expect(typeof result.current.fetchRemoteEntries).toBe("function");
    expect(typeof result.current.refreshRemoteEntries).toBe("function");
  });
});

// =============================================================================
// 9. useSyncOrchestrator — multi-instance time entry creation
// =============================================================================

describe("useSyncOrchestrator — multi-instance sync routing", () => {
  function makeEntry(overrides?: Partial<TimeLogEntry>): TimeLogEntry {
    return createTimeLogEntry(overrides);
  }

  function makeDeps(overrides?: Record<string, unknown>) {
    return {
      entries: [makeEntry()],
      markSynced: vi.fn().mockResolvedValue(undefined),
      createTimeEntry: vi.fn().mockResolvedValue(42),
      refreshRemoteEntries: vi.fn(),
      setSyncDialog: vi.fn(),
      setSnackbar: vi.fn(),
      setError: vi.fn(),
      t: de,
      ...overrides,
    };
  }

  it("routes sync to bugs instance", async () => {
    const entry = makeEntry({ instanceId: INST_BUGS, issueId: 101 });
    const deps = makeDeps({ entries: [entry] });
    const { result } = renderHook(() => useSyncOrchestrator(deps));

    await act(async () => {
      await result.current.handleSyncEntry(entry.id, 9);
    });

    expect(deps.createTimeEntry).toHaveBeenCalledWith(
      INST_BUGS,
      101,
      expect.any(Number),
      "",
      9,
      "2026-03-03",
    );
  });

  it("routes sync to support instance", async () => {
    const entry = makeEntry({ instanceId: INST_SUPPORT, issueId: 200 });
    const deps = makeDeps({ entries: [entry] });
    const { result } = renderHook(() => useSyncOrchestrator(deps));

    await act(async () => {
      await result.current.handleSyncEntry(entry.id, 5);
    });

    expect(deps.createTimeEntry).toHaveBeenCalledWith(
      INST_SUPPORT,
      200,
      expect.any(Number),
      "",
      5,
      "2026-03-03",
    );
  });

  it("syncAll chains entries from different instances", async () => {
    const entries = [
      makeEntry({ id: "e1", instanceId: INST_BUGS, issueId: 10 }),
      makeEntry({ id: "e2", instanceId: INST_SUPPORT, issueId: 20 }),
    ];
    const deps = makeDeps({ entries });
    const { result } = renderHook(() => useSyncOrchestrator(deps));

    act(() => {
      result.current.handleSyncAll();
    });

    // First entry dialog opens
    expect(deps.setSyncDialog).toHaveBeenCalledWith(entries[0]);

    // Sync first entry
    await act(async () => {
      await result.current.handleSync("e1", 9);
    });

    expect(deps.createTimeEntry).toHaveBeenCalledWith(
      INST_BUGS,
      10,
      expect.any(Number),
      "",
      9,
      "2026-03-03",
    );

    // Second entry dialog should open
    const lastCall = deps.setSyncDialog.mock.calls[deps.setSyncDialog.mock.calls.length - 1];
    expect(lastCall[0]?.instanceId).toBe(INST_SUPPORT);
  });

  it("quick-sync with activityId skips dialog for correct instance", async () => {
    const entry = makeEntry({ instanceId: INST_SUPPORT, issueId: 300, activityId: 7 });
    const deps = makeDeps({ entries: [entry] });
    const { result } = renderHook(() => useSyncOrchestrator(deps));

    await act(async () => {
      result.current.handleOpenSyncDialog(entry);
    });

    expect(deps.createTimeEntry).toHaveBeenCalledWith(
      INST_SUPPORT,
      300,
      expect.any(Number),
      "",
      7,
      "2026-03-03",
    );
    expect(deps.setSnackbar).toHaveBeenCalledWith(de.synced);
  });

  it("hours calculation is correct (duration/60 rounded to 2 decimals)", async () => {
    const entry = makeEntry({ instanceId: INST_BUGS, duration: 45 }); // 45 min = 0.75h
    const deps = makeDeps({ entries: [entry] });
    const { result } = renderHook(() => useSyncOrchestrator(deps));

    await act(async () => {
      await result.current.handleSyncEntry(entry.id, 9);
    });

    const hours = (deps.createTimeEntry as ReturnType<typeof vi.fn>).mock.calls[0][2];
    expect(hours).toBe(0.75);
  });
});

// =============================================================================
// 10. TimerKey — composite key encoding/decoding
// =============================================================================

describe("timerKey / parseTimerKey — composite keys", () => {
  it("encodes instanceId:issueId", () => {
    expect(timerKey(INST_BUGS, 42)).toBe("bugs:42");
  });

  it("decodes instanceId and issueId", () => {
    const parsed = parseTimerKey("bugs:42");
    expect(parsed.instanceId).toBe("bugs");
    expect(parsed.issueId).toBe(42);
  });

  it("handles instanceId with colons (uses lastIndexOf)", () => {
    const key = timerKey("inst:with:colons", 99);
    expect(key).toBe("inst:with:colons:99");
    const parsed = parseTimerKey(key);
    expect(parsed.instanceId).toBe("inst:with:colons");
    expect(parsed.issueId).toBe(99);
  });

  it("roundtrips for various instance IDs", () => {
    const cases = [
      { instanceId: "default", issueId: 1 },
      { instanceId: "prod-redmine", issueId: 999 },
      { instanceId: "a_b_c", issueId: 0 },
      { instanceId: "UUID-1234-5678", issueId: 12345 },
    ];
    for (const { instanceId, issueId } of cases) {
      const key = timerKey(instanceId, issueId);
      const parsed = parseTimerKey(key);
      expect(parsed.instanceId).toBe(instanceId);
      expect(parsed.issueId).toBe(issueId);
    }
  });

  it("keys from different instances are distinct", () => {
    const k1 = timerKey(INST_BUGS, 42);
    const k2 = timerKey(INST_SUPPORT, 42);
    expect(k1).not.toBe(k2);
  });

  it("keys from same instance, different issues are distinct", () => {
    const k1 = timerKey(INST_BUGS, 42);
    const k2 = timerKey(INST_BUGS, 43);
    expect(k1).not.toBe(k2);
  });
});

// =============================================================================
// 11. Cross-instance isolation — hooks don't leak data between instances
// =============================================================================

describe("Cross-instance isolation", () => {
  it("two useIssueCache instances maintain separate issue lists", async () => {
    const bugsIssue = createIssue({ id: 1, subject: "Bug" });
    const supportIssue = createIssue({ id: 2, subject: "Ticket" });

    mockApi
      .mockResolvedValueOnce({ issues: [bugsIssue] })
      .mockResolvedValueOnce({ issues: [supportIssue] });

    const { result: r1 } = renderHook(() => useIssueCache(INST_BUGS));
    const { result: r2 } = renderHook(() => useIssueCache(INST_SUPPORT));

    await act(async () => {
      await r1.current.fetchIssues();
    });
    await act(async () => {
      await r2.current.fetchIssues();
    });

    expect(r1.current.issues).toEqual([bugsIssue]);
    expect(r2.current.issues).toEqual([supportIssue]);
    expect(r1.current.issues).not.toEqual(r2.current.issues);
  });

  it("two useRemoteEntries instances maintain separate entries", async () => {
    const bugsEntries = [createTimeEntry({ id: 1, instanceId: INST_BUGS })];
    const supportEntries = [createTimeEntry({ id: 2, instanceId: INST_SUPPORT })];

    mockApi
      .mockResolvedValueOnce({ time_entries: bugsEntries })
      .mockResolvedValueOnce({ time_entries: supportEntries });

    const { result: r1 } = renderHook(() => useRemoteEntries(INST_BUGS));
    const { result: r2 } = renderHook(() => useRemoteEntries(INST_SUPPORT));

    await act(async () => {
      await r1.current.fetchRemoteEntries("2026-03-01", "2026-03-07");
    });
    await act(async () => {
      await r2.current.fetchRemoteEntries("2026-03-01", "2026-03-07");
    });

    expect(r1.current.remoteEntries).toEqual(bugsEntries);
    expect(r2.current.remoteEntries).toEqual(supportEntries);
  });

  it("two useProjectData instances maintain separate members", async () => {
    mockApi
      .mockResolvedValueOnce({ members: [{ id: 1, name: "BugDev" }] })
      .mockResolvedValueOnce({ members: [{ id: 2, name: "SupportAgent" }] });

    const { result: r1 } = renderHook(() => useProjectData(INST_BUGS));
    const { result: r2 } = renderHook(() => useProjectData(INST_SUPPORT));

    await act(async () => {
      await r1.current.fetchProjectMembers(1);
    });
    await act(async () => {
      await r2.current.fetchProjectMembers(1);
    });

    expect(r1.current.membersByProject[1]?.[0].name).toBe("BugDev");
    expect(r2.current.membersByProject[1]?.[0].name).toBe("SupportAgent");
  });

  it("two useIssueDetails instances maintain separate subjects", async () => {
    mockApi
      .mockResolvedValueOnce({ issue: { id: 101, subject: "Bug Title" } })
      .mockResolvedValueOnce({ issue: { id: 101, subject: "Support Title" } });

    const { result: r1 } = renderHook(() => useIssueDetails(INST_BUGS));
    const { result: r2 } = renderHook(() => useIssueDetails(INST_SUPPORT));

    await act(async () => {
      await r1.current.fetchIssueSubject(101);
    });
    await act(async () => {
      await r2.current.fetchIssueSubject(101);
    });

    expect(r1.current.issueSubjects[101]).toBe("Bug Title");
    expect(r2.current.issueSubjects[101]).toBe("Support Title");
  });
});

// =============================================================================
// 12. Catch-all route coverage — /api/* without instanceId
// =============================================================================

describe("Catch-all backward-compat routes (/api/* without instanceId)", () => {
  it("useIssueCache(/api/issues) — fetchIssues", async () => {
    mockApi.mockResolvedValueOnce({ issues: [] });
    const { result } = renderHook(() => useIssueCache());
    await act(async () => {
      await result.current.fetchIssues();
    });
    expect(mockApi).toHaveBeenCalledWith("/api/issues");
  });

  it("useIssueCache(/api/activities) — fetchActivities", async () => {
    mockApi.mockResolvedValueOnce({ time_entry_activities: [] });
    const { result } = renderHook(() => useIssueCache());
    await act(async () => {
      await result.current.fetchActivities();
    });
    expect(mockApi).toHaveBeenCalledWith("/api/activities");
  });

  it("useIssueCache(/api/statuses) — fetchStatuses", async () => {
    mockApi.mockResolvedValueOnce({ issue_statuses: [] });
    const { result } = renderHook(() => useIssueCache());
    await act(async () => {
      await result.current.fetchStatuses();
    });
    expect(mockApi).toHaveBeenCalledWith("/api/statuses");
  });

  it("useIssueCache(/api/trackers) — fetchTrackers", async () => {
    mockApi.mockResolvedValueOnce({ trackers: [] });
    const { result } = renderHook(() => useIssueCache());
    await act(async () => {
      await result.current.fetchTrackers();
    });
    expect(mockApi).toHaveBeenCalledWith("/api/trackers");
  });

  it("useIssueCache(/api/projects/:id/activities) — fetchProjectActivities", async () => {
    mockApi.mockResolvedValueOnce({ time_entry_activities: [] });
    const { result } = renderHook(() => useIssueCache());
    await act(async () => {
      await result.current.fetchProjectActivities(42);
    });
    expect(mockApi).toHaveBeenCalledWith("/api/projects/42/activities");
  });

  it("useIssueCache(/api/projects/:id/trackers) — fetchProjectTrackers", async () => {
    mockApi.mockResolvedValueOnce({ trackers: [] });
    const { result } = renderHook(() => useIssueCache());
    await act(async () => {
      await result.current.fetchProjectTrackers(42);
    });
    expect(mockApi).toHaveBeenCalledWith("/api/projects/42/trackers");
  });

  it("useIssueCache(/api/issues/:id?include=allowed_statuses) — fetchAllowedStatuses", async () => {
    mockApi.mockResolvedValueOnce({ issue: { allowed_statuses: [] } });
    const { result } = renderHook(() => useIssueCache());
    await act(async () => {
      await result.current.fetchAllowedStatuses(101);
    });
    expect(mockApi).toHaveBeenCalledWith("/api/issues/101?include=allowed_statuses");
  });

  it("useIssueCache(/api/issues/:id) — refreshIssue", async () => {
    mockApi.mockResolvedValueOnce({ issue: createIssue({ id: 101 }) });
    const { result } = renderHook(() => useIssueCache());
    await act(async () => {
      await result.current.refreshIssue(101);
    });
    expect(mockApi).toHaveBeenCalledWith("/api/issues/101");
  });

  it("useIssueCache(/api/issues/:id) PUT — updateIssueStatus", async () => {
    mockApi.mockResolvedValueOnce({ ok: true });
    const { result } = renderHook(() => useIssueCache());
    await act(async () => {
      await result.current.updateIssueStatus(101, 3);
    });
    expect(mockApi).toHaveBeenCalledWith("/api/issues/101", {
      method: "PUT",
      body: JSON.stringify({ status_id: 3 }),
    });
  });

  it("useIssueCache(/api/time_entries) POST — createTimeEntry", async () => {
    mockApi.mockResolvedValueOnce({ time_entry: { id: 999 } });
    const { result } = renderHook(() => useIssueCache());
    await act(async () => {
      await result.current.createTimeEntry(101, 1.5, "Work", 9, "2026-03-07");
    });
    expect(mockApi).toHaveBeenCalledWith(
      "/api/time_entries",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("useIssueDetails(/api/issues/:id) — fetchIssueSubject", async () => {
    mockApi.mockResolvedValueOnce({ issue: { id: 200, subject: "Legacy" } });
    const { result } = renderHook(() => useIssueDetails());
    await act(async () => {
      await result.current.fetchIssueSubject(200);
    });
    expect(mockApi).toHaveBeenCalledWith("/api/issues/200");
  });

  it("useIssueDetails(/api/issues/:id?include=journals,attachments) — fetchIssueDescription", async () => {
    mockApi.mockResolvedValueOnce({
      issue: { id: 200, description: "d", journals: [], attachments: [] },
    });
    const { result } = renderHook(() => useIssueDetails());
    await act(async () => {
      await result.current.fetchIssueDescription(200);
    });
    expect(mockApi).toHaveBeenCalledWith("/api/issues/200?include=journals,attachments");
  });

  it("useProjectData(/api/projects/:id/members) — fetchProjectMembers", async () => {
    mockApi.mockResolvedValueOnce({ members: [] });
    const { result } = renderHook(() => useProjectData());
    await act(async () => {
      await result.current.fetchProjectMembers(42);
    });
    expect(mockApi).toHaveBeenCalledWith("/api/projects/42/members");
  });

  it("useProjectData(/api/projects/:id/versions) — fetchProjectVersions", async () => {
    mockApi.mockResolvedValueOnce({ versions: [] });
    const { result } = renderHook(() => useProjectData());
    await act(async () => {
      await result.current.fetchProjectVersions(42);
    });
    expect(mockApi).toHaveBeenCalledWith("/api/projects/42/versions");
  });

  it("useRemoteEntries(/api/time_entries/range) — fetchRemoteEntries", async () => {
    mockApi.mockResolvedValueOnce({ time_entries: [] });
    const { result } = renderHook(() => useRemoteEntries());
    await act(async () => {
      await result.current.fetchRemoteEntries("2026-03-01", "2026-03-07");
    });
    expect(mockApi).toHaveBeenCalledWith(
      "/api/time_entries/range?from=2026-03-01&to=2026-03-07",
      expect.any(Object),
    );
  });
});

// =============================================================================
// 13. Edge cases and error scenarios
// =============================================================================

describe("Edge cases and error handling", () => {
  it("useIssueCache refreshIssue removes issue from list on 404", async () => {
    const issue = createIssue({ id: 101 });
    mockApi.mockResolvedValueOnce({ issues: [issue] });
    const { result } = renderHook(() => useIssueCache(INST_BUGS));

    await act(async () => {
      await result.current.fetchIssues();
    });
    expect(result.current.issues).toHaveLength(1);

    mockApi.mockRejectedValueOnce(new Error("Not found"));

    await act(async () => {
      const refreshed = await result.current.refreshIssue(101);
      expect(refreshed).toBeNull();
    });

    expect(result.current.issues).toHaveLength(0);
  });

  it("useIssueCache handles empty response bodies", async () => {
    mockApi.mockResolvedValueOnce({ issues: undefined });
    const { result } = renderHook(() => useIssueCache(INST_BUGS));

    await act(async () => {
      const issues = await result.current.fetchIssues();
      expect(issues).toEqual([]);
    });
  });

  it("useIssueCache handles missing time_entry_activities", async () => {
    mockApi.mockResolvedValueOnce({ time_entry_activities: undefined });
    const { result } = renderHook(() => useIssueCache(INST_BUGS));

    await act(async () => {
      await result.current.fetchActivities();
    });

    expect(result.current.activities).toEqual([]);
  });

  it("useRemoteEntries handles missing time_entries", async () => {
    mockApi.mockResolvedValueOnce({ time_entries: undefined });
    const { result } = renderHook(() => useRemoteEntries(INST_BUGS));

    await act(async () => {
      await result.current.fetchRemoteEntries("2026-03-01", "2026-03-07");
    });

    expect(result.current.remoteEntries).toEqual([]);
  });

  it("useProjectData handles missing members", async () => {
    mockApi.mockResolvedValueOnce({ members: undefined });
    const { result } = renderHook(() => useProjectData(INST_BUGS));

    await act(async () => {
      await result.current.fetchProjectMembers(1);
    });

    expect(result.current.membersByProject[1]).toEqual([]);
  });

  it("useUser handles non-Error rejections", async () => {
    mockApi.mockRejectedValueOnce("string error");
    const { result } = renderHook(() => useUser(INST_BUGS));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("Cannot connect to Redmine");
    expect(result.current.user).toBeNull();
  });

  it("useSyncOrchestrator handles unknown entry gracefully", async () => {
    const deps = {
      entries: [createTimeLogEntry({ id: "e1" })],
      markSynced: vi.fn(),
      createTimeEntry: vi.fn(),
      refreshRemoteEntries: vi.fn(),
      setSyncDialog: vi.fn(),
      setSnackbar: vi.fn(),
      setError: vi.fn(),
      t: de,
    };
    const { result } = renderHook(() => useSyncOrchestrator(deps));

    await act(async () => {
      await result.current.handleSyncEntry("nonexistent", 9);
    });

    expect(deps.createTimeEntry).not.toHaveBeenCalled();
    expect(deps.markSynced).not.toHaveBeenCalled();
  });
});
