import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useTimeLog } from "@/hooks/useTimeLog";
import type { TimeLogEntry } from "@/types/redmine";

vi.mock("@/lib/api");

import { api } from "@/lib/api";

const mockedApi = vi.mocked(api);

function makeEntry(overrides?: Partial<TimeLogEntry>): TimeLogEntry {
  return {
    id: "entry-1",
    issueId: 100,
    issueSubject: "Test Issue",
    projectId: 1,
    projectName: "Test Project",
    date: "2026-03-03",
    duration: 60,
    description: "Test description",
    activityId: 9,
    startTime: "2026-03-03T08:00:00Z",
    endTime: "2026-03-03T09:00:00Z",
    syncedToRedmine: false,
    instanceId: "default",
    ...overrides,
  };
}

describe("useTimeLog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches entries from /api/timelog on mount", async () => {
    const entries = [makeEntry()];
    mockedApi.mockResolvedValueOnce(entries);

    const { result } = renderHook(() => useTimeLog());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockedApi).toHaveBeenCalledWith(
      "/api/timelog",
      expect.objectContaining({
        signal: expect.any(AbortSignal),
      }),
    );
    expect(result.current.entries).toEqual(entries);
  });

  it("loading=true until fetch resolves", async () => {
    mockedApi.mockResolvedValueOnce([]);
    const { result } = renderHook(() => useTimeLog());
    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });

  it("error set when fetch fails", async () => {
    mockedApi.mockRejectedValueOnce(new Error("Network error"));
    const { result } = renderHook(() => useTimeLog());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe("Network error");
  });

  describe("addEntry", () => {
    it("POST /api/timelog with entry data", async () => {
      mockedApi.mockResolvedValueOnce([]); // mount fetch
      const saved = makeEntry({ id: "new-1" });
      mockedApi.mockResolvedValueOnce(saved);

      const { result } = renderHook(() => useTimeLog());
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.addEntry({
          issueId: 100,
          issueSubject: "Test",
          projectId: 1,
          projectName: "Project",
          date: "2026-03-03",
          duration: 60,
          description: "desc",
          activityId: 9,
          startTime: "2026-03-03T08:00:00Z",
          endTime: "2026-03-03T09:00:00Z",
          instanceId: "default",
        });
      });

      expect(mockedApi).toHaveBeenCalledWith(
        "/api/timelog",
        expect.objectContaining({
          method: "POST",
        }),
      );
    });

    it("prepends to state on success", async () => {
      mockedApi.mockResolvedValueOnce([makeEntry({ id: "old-1" })]);
      const newEntry = makeEntry({ id: "new-1" });
      mockedApi.mockResolvedValueOnce(newEntry);

      const { result } = renderHook(() => useTimeLog());
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.addEntry({
          issueId: 100,
          issueSubject: "Test",
          projectId: 1,
          projectName: "Project",
          date: "2026-03-03",
          duration: 60,
          description: "desc",
          activityId: 9,
          startTime: "2026-03-03T08:00:00Z",
          endTime: "2026-03-03T09:00:00Z",
          instanceId: "default",
        });
      });

      expect(result.current.entries[0].id).toBe("new-1");
    });

    it("throws on network error", async () => {
      mockedApi.mockResolvedValueOnce([]);
      mockedApi.mockRejectedValueOnce(new Error("fail"));

      const { result } = renderHook(() => useTimeLog());
      await waitFor(() => expect(result.current.loading).toBe(false));

      await expect(
        act(async () => {
          await result.current.addEntry({
            issueId: 100,
            issueSubject: "Test",
            projectId: 1,
            projectName: "Project",
            date: "2026-03-03",
            duration: 60,
            description: "desc",
            activityId: 9,
            startTime: "2026-03-03T08:00:00Z",
            endTime: "2026-03-03T09:00:00Z",
            instanceId: "default",
          });
        }),
      ).rejects.toThrow("fail");
    });
  });

  describe("updateEntry", () => {
    it("PUT /api/timelog/{id} with updates", async () => {
      const entry = makeEntry({ id: "e1" });
      mockedApi.mockResolvedValueOnce([entry]);
      const updated = { ...entry, description: "updated" };
      mockedApi.mockResolvedValueOnce(updated);

      const { result } = renderHook(() => useTimeLog());
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.updateEntry("e1", { description: "updated" });
      });

      expect(mockedApi).toHaveBeenCalledWith(
        "/api/timelog/e1",
        expect.objectContaining({
          method: "PUT",
        }),
      );
    });

    it("merges updates into state", async () => {
      const entry = makeEntry({ id: "e1", description: "original" });
      mockedApi.mockResolvedValueOnce([entry]);
      const updated = { ...entry, description: "updated" };
      mockedApi.mockResolvedValueOnce(updated);

      const { result } = renderHook(() => useTimeLog());
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.updateEntry("e1", { description: "updated" });
      });

      expect(result.current.entries[0].description).toBe("updated");
    });
  });

  describe("markSynced", () => {
    it("PUT /api/timelog/{id} with syncedToRedmine=true + redmineTimeEntryId", async () => {
      const entry = makeEntry({ id: "e1" });
      mockedApi.mockResolvedValueOnce([entry]);
      mockedApi.mockResolvedValueOnce({ ...entry, syncedToRedmine: true, redmineTimeEntryId: 555 });

      const { result } = renderHook(() => useTimeLog());
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.markSynced("e1", 555);
      });

      expect(mockedApi).toHaveBeenCalledWith(
        "/api/timelog/e1",
        expect.objectContaining({
          method: "PUT",
          body: expect.stringContaining('"syncedToRedmine":true'),
        }),
      );
    });

    it("updates entry in state", async () => {
      const entry = makeEntry({ id: "e1", syncedToRedmine: false });
      mockedApi.mockResolvedValueOnce([entry]);
      mockedApi.mockResolvedValueOnce({ ...entry, syncedToRedmine: true, redmineTimeEntryId: 555 });

      const { result } = renderHook(() => useTimeLog());
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.markSynced("e1", 555);
      });

      expect(result.current.entries[0].syncedToRedmine).toBe(true);
    });
  });

  describe("deleteEntry", () => {
    it("DELETE /api/timelog/{id}", async () => {
      const entry = makeEntry({ id: "e1" });
      mockedApi.mockResolvedValueOnce([entry]);
      mockedApi.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useTimeLog());
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.deleteEntry("e1");
      });

      expect(mockedApi).toHaveBeenCalledWith(
        "/api/timelog/e1",
        expect.objectContaining({
          method: "DELETE",
        }),
      );
    });

    it("removes from state", async () => {
      const entry = makeEntry({ id: "e1" });
      mockedApi.mockResolvedValueOnce([entry]);
      mockedApi.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useTimeLog());
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.deleteEntry("e1");
      });

      expect(result.current.entries).toHaveLength(0);
    });
  });

  describe("removeEntryFromState", () => {
    it("removes entry and returns it", async () => {
      const entry = makeEntry({ id: "e1" });
      mockedApi.mockResolvedValueOnce([entry]);

      const { result } = renderHook(() => useTimeLog());
      await waitFor(() => expect(result.current.loading).toBe(false));

      let removed: ReturnType<typeof result.current.removeEntryFromState>;
      act(() => {
        removed = result.current.removeEntryFromState("e1");
      });

      expect(removed!).toBeDefined();
      expect(removed!.id).toBe("e1");
      expect(result.current.entries).toHaveLength(0);
    });

    it("returns undefined for nonexistent entry", async () => {
      mockedApi.mockResolvedValueOnce([makeEntry({ id: "e1" })]);

      const { result } = renderHook(() => useTimeLog());
      await waitFor(() => expect(result.current.loading).toBe(false));

      let removed: ReturnType<typeof result.current.removeEntryFromState>;
      act(() => {
        removed = result.current.removeEntryFromState("nonexistent");
      });

      expect(removed).toBeUndefined();
      expect(result.current.entries).toHaveLength(1);
    });
  });

  describe("restoreEntryToState", () => {
    it("restores a previously removed entry", async () => {
      mockedApi.mockResolvedValueOnce([]);

      const { result } = renderHook(() => useTimeLog());
      await waitFor(() => expect(result.current.loading).toBe(false));

      const entry = makeEntry({ id: "restored-1" });
      act(() => {
        result.current.restoreEntryToState(entry);
      });

      expect(result.current.entries).toHaveLength(1);
      expect(result.current.entries[0].id).toBe("restored-1");
    });

    it("does not duplicate if entry already exists", async () => {
      const entry = makeEntry({ id: "e1" });
      mockedApi.mockResolvedValueOnce([entry]);

      const { result } = renderHook(() => useTimeLog());
      await waitFor(() => expect(result.current.loading).toBe(false));

      act(() => {
        result.current.restoreEntryToState(entry);
      });

      expect(result.current.entries).toHaveLength(1);
    });
  });

  describe("derived values", () => {
    it("entriesByDate groups correctly", async () => {
      const entries = [
        makeEntry({ id: "e1", date: "2026-03-03" }),
        makeEntry({ id: "e2", date: "2026-03-03" }),
        makeEntry({ id: "e3", date: "2026-03-02" }),
      ];
      mockedApi.mockResolvedValueOnce(entries);

      const { result } = renderHook(() => useTimeLog());
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.entriesByDate["2026-03-03"]).toHaveLength(2);
      expect(result.current.entriesByDate["2026-03-02"]).toHaveLength(1);
    });

    it("sortedDates returns newest first", async () => {
      const entries = [
        makeEntry({ id: "e1", date: "2026-03-01" }),
        makeEntry({ id: "e2", date: "2026-03-03" }),
        makeEntry({ id: "e3", date: "2026-03-02" }),
      ];
      mockedApi.mockResolvedValueOnce(entries);

      const { result } = renderHook(() => useTimeLog());
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.sortedDates[0]).toBe("2026-03-03");
      expect(result.current.sortedDates[2]).toBe("2026-03-01");
    });

    it("entriesByMonth groups by YYYY-MM", async () => {
      const entries = [
        makeEntry({ id: "e1", date: "2026-03-03" }),
        makeEntry({ id: "e2", date: "2026-02-15" }),
      ];
      mockedApi.mockResolvedValueOnce(entries);

      const { result } = renderHook(() => useTimeLog());
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.entriesByMonth["2026-03"]).toHaveLength(1);
      expect(result.current.entriesByMonth["2026-02"]).toHaveLength(1);
    });

    it("entriesByWeek groups by ISO week key", async () => {
      const entries = [
        makeEntry({ id: "e1", date: "2026-03-02" }),
        makeEntry({ id: "e2", date: "2026-03-03" }),
      ];
      mockedApi.mockResolvedValueOnce(entries);

      const { result } = renderHook(() => useTimeLog());
      await waitFor(() => expect(result.current.loading).toBe(false));

      const weekKeys = Object.keys(result.current.entriesByWeek);
      expect(weekKeys.length).toBeGreaterThanOrEqual(1);
    });

    it("sortedWeeks returns newest first", async () => {
      const entries = [
        makeEntry({ id: "e1", date: "2026-02-01" }),
        makeEntry({ id: "e2", date: "2026-03-03" }),
      ];
      mockedApi.mockResolvedValueOnce(entries);

      const { result } = renderHook(() => useTimeLog());
      await waitFor(() => expect(result.current.loading).toBe(false));

      const weeks = result.current.sortedWeeks;
      expect(weeks.length).toBe(2);
      expect(weeks[0] > weeks[1]).toBe(true);
    });

    it("sortedMonths returns newest first", async () => {
      const entries = [
        makeEntry({ id: "e1", date: "2026-01-15" }),
        makeEntry({ id: "e2", date: "2026-03-03" }),
      ];
      mockedApi.mockResolvedValueOnce(entries);

      const { result } = renderHook(() => useTimeLog());
      await waitFor(() => expect(result.current.loading).toBe(false));

      const months = result.current.sortedMonths;
      expect(months[0]).toBe("2026-03");
    });
  });
});
