import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useRedmine } from "@/hooks/useRedmine";
import { api } from "@/lib/api";

vi.mock("@/lib/api", () => ({
  api: vi.fn(),
}));

const mockApi = api as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useRedmine", () => {
  // --- Initial load (useEffect) ---

  it("fetches user on mount and returns user data", async () => {
    mockApi.mockResolvedValueOnce({
      user: { id: 1, login: "admin", firstname: "Max", lastname: "Muster", mail: "max@test.de" },
      redmineUrl: "https://redmine.example.com",
    });

    const { result } = renderHook(() => useRedmine());
    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user).toEqual(
      expect.objectContaining({ login: "admin", firstname: "Max" }),
    );
    expect(result.current.redmineUrl).toBe("https://redmine.example.com");
    expect(result.current.error).toBe(null);
  });

  it("sets error on failed user fetch", async () => {
    mockApi.mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => useRedmine());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("Network error");
    expect(result.current.user).toBe(null);
  });

  // --- fetchIssues ---

  it("fetchIssues populates issues array", async () => {
    mockApi.mockResolvedValueOnce({ user: { id: 1 }, redmineUrl: "" }); // /api/me
    const issues = [
      {
        id: 1,
        subject: "Bug",
        project: { id: 1, name: "P" },
        status: { id: 1, name: "New" },
        tracker: { id: 1, name: "Bug" },
        priority: { id: 1, name: "Normal" },
        done_ratio: 0,
      },
    ];
    mockApi.mockResolvedValueOnce({ issues }); // /api/issues

    const { result } = renderHook(() => useRedmine());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.fetchIssues();
    });
    expect(result.current.issues).toHaveLength(1);
    expect(result.current.issues[0].subject).toBe("Bug");
  });

  // --- fetchActivities ---

  it("fetchActivities populates activities", async () => {
    mockApi.mockResolvedValueOnce({ user: { id: 1 }, redmineUrl: "" });
    mockApi.mockResolvedValueOnce({ time_entry_activities: [{ id: 9, name: "Dev" }] });

    const { result } = renderHook(() => useRedmine());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.fetchActivities();
    });
    expect(result.current.activities).toEqual([{ id: 9, name: "Dev" }]);
  });

  // --- fetchStatuses ---

  it("fetchStatuses populates statuses", async () => {
    mockApi.mockResolvedValueOnce({ user: { id: 1 }, redmineUrl: "" });
    mockApi.mockResolvedValueOnce({ issue_statuses: [{ id: 1, name: "New", is_closed: false }] });

    const { result } = renderHook(() => useRedmine());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.fetchStatuses();
    });
    expect(result.current.statuses).toHaveLength(1);
  });

  // --- fetchTrackers ---

  it("fetchTrackers populates trackers", async () => {
    mockApi.mockResolvedValueOnce({ user: { id: 1 }, redmineUrl: "" });
    mockApi.mockResolvedValueOnce({
      trackers: [
        { id: 1, name: "Bug" },
        { id: 2, name: "Feature" },
      ],
    });

    const { result } = renderHook(() => useRedmine());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.fetchTrackers();
    });
    expect(result.current.trackers).toHaveLength(2);
  });

  // --- fetchProjectMembers ---

  it("fetchProjectMembers stores members keyed by project", async () => {
    mockApi.mockResolvedValueOnce({ user: { id: 1 }, redmineUrl: "" });
    mockApi.mockResolvedValueOnce({ members: [{ id: 5, name: "Max" }] });

    const { result } = renderHook(() => useRedmine());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.fetchProjectMembers(10);
    });
    expect(result.current.membersByProject[10]).toEqual([{ id: 5, name: "Max" }]);
    expect(mockApi).toHaveBeenCalledWith("/api/projects/10/members");
  });

  // --- createTimeEntry ---

  it("createTimeEntry sends POST and returns id", async () => {
    mockApi.mockResolvedValueOnce({ user: { id: 1 }, redmineUrl: "" });
    mockApi.mockResolvedValueOnce({ time_entry: { id: 999 } });

    const { result } = renderHook(() => useRedmine());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let entryId: number | undefined;
    await act(async () => {
      entryId = await result.current.createTimeEntry(42, 1.5, "Work done", 9, "2026-03-01");
    });
    expect(entryId).toBe(999);
    expect(mockApi).toHaveBeenCalledWith(
      "/api/time_entries",
      expect.objectContaining({
        method: "POST",
      }),
    );
  });

  // --- updateIssueStatus ---

  it("updateIssueStatus calls PUT", async () => {
    mockApi.mockResolvedValueOnce({ user: { id: 1 }, redmineUrl: "" });
    mockApi.mockResolvedValueOnce({ ok: true });

    const { result } = renderHook(() => useRedmine());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.updateIssueStatus(42, 2);
    });
    expect(mockApi).toHaveBeenCalledWith(
      "/api/issues/42",
      expect.objectContaining({
        method: "PUT",
        body: expect.stringContaining('"status_id":2'),
      }),
    );
  });

  // --- fetchRemoteEntries ---

  it("fetchRemoteEntries loads time entries for range", async () => {
    mockApi.mockResolvedValueOnce({ user: { id: 1 }, redmineUrl: "" });
    mockApi.mockResolvedValueOnce({
      time_entries: [
        {
          id: 1,
          hours: 2,
          comments: "Work",
          spent_on: "2026-03-01",
          activity: { id: 9, name: "Dev" },
          project: { id: 1, name: "P" },
        },
      ],
    });

    const { result } = renderHook(() => useRedmine());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.fetchRemoteEntries("2026-03-01", "2026-03-31");
    });
    expect(result.current.remoteEntries).toHaveLength(1);
    expect(result.current.remoteLoading).toBe(false);
  });

  // --- refreshIssue ---

  it("refreshIssue updates issue in list", async () => {
    const originalIssue = {
      id: 42,
      subject: "Old",
      project: { id: 1, name: "P" },
      status: { id: 1, name: "New" },
      tracker: { id: 1, name: "Bug" },
      priority: { id: 1, name: "Normal" },
      done_ratio: 0,
    };
    const updatedIssue = { ...originalIssue, subject: "Updated" };

    mockApi.mockResolvedValueOnce({ user: { id: 1 }, redmineUrl: "" });
    mockApi.mockResolvedValueOnce({ issues: [originalIssue] });
    mockApi.mockResolvedValueOnce({ issue: updatedIssue });

    const { result } = renderHook(() => useRedmine());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.fetchIssues();
    });
    expect(result.current.issues[0].subject).toBe("Old");

    await act(async () => {
      await result.current.refreshIssue(42);
    });
    expect(result.current.issues[0].subject).toBe("Updated");
  });

  // --- fetchIssueDescription ---

  it("fetchIssueDescription loads description and journals", async () => {
    mockApi.mockResolvedValueOnce({ user: { id: 1 }, redmineUrl: "" });
    mockApi.mockResolvedValueOnce({
      issue: {
        id: 42,
        description: "The bug is ...",
        journals: [
          { id: 1, user: { id: 1, name: "Max" }, notes: "Comment", created_on: "2026-03-01" },
          { id: 2, user: { id: 2, name: "Anna" }, notes: "", created_on: "2026-03-02" },
        ],
      },
    });

    const { result } = renderHook(() => useRedmine());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.fetchIssueDescription(42);
    });
    expect(result.current.issueDescriptions[42]).toBe("The bug is ...");
    expect(result.current.issueComments[42]).toHaveLength(1);
    expect(result.current.issueComments[42][0].notes).toBe("Comment");
  });
});
