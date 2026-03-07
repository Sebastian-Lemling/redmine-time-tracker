import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useEntryHandlers } from "@/hooks/useEntryHandlers";
import type { TimeLogEntry } from "@/types/redmine";
import type { Translations } from "@/i18n/translations";

function makeEntry(overrides?: Partial<TimeLogEntry>): TimeLogEntry {
  return {
    id: "e1",
    issueId: 100,
    issueSubject: "Test issue",
    projectId: 1,
    projectName: "Project A",
    startTime: "2025-03-01T09:00:00",
    endTime: "2025-03-01T09:30:00",
    duration: 30,
    originalDuration: undefined as unknown as number,
    description: "work",
    date: "2025-03-01",
    activityId: 5,
    syncedToRedmine: false,
    instanceId: "default",
    ...overrides,
  };
}

const fakeT = {
  entryDeleted: "Entry deleted",
  undo: "Undo",
} as Translations;

describe("useEntryHandlers", () => {
  let updateEntry: ReturnType<typeof vi.fn<(...args: any[]) => Promise<void>>>;
  let deleteEntry: ReturnType<typeof vi.fn<(...args: any[]) => Promise<void>>>;
  let removeEntryFromState: ReturnType<typeof vi.fn<(id: string) => TimeLogEntry | undefined>>;
  let restoreEntryToState: ReturnType<typeof vi.fn<(entry: TimeLogEntry) => void>>;
  let showSnackbar: ReturnType<
    typeof vi.fn<(message: string, action?: { label: string; onClick: () => void }) => void>
  >;
  let setEditDialog: ReturnType<typeof vi.fn<(...args: any[]) => void>>;
  let setError: ReturnType<typeof vi.fn<(...args: any[]) => void>>;
  let entries: TimeLogEntry[];

  beforeEach(() => {
    vi.useFakeTimers();
    updateEntry = vi.fn<(...args: any[]) => Promise<void>>().mockResolvedValue(undefined);
    deleteEntry = vi.fn<(...args: any[]) => Promise<void>>().mockResolvedValue(undefined);
    removeEntryFromState = vi
      .fn<(id: string) => TimeLogEntry | undefined>()
      .mockReturnValue(makeEntry());
    restoreEntryToState = vi.fn<(entry: TimeLogEntry) => void>();
    showSnackbar =
      vi.fn<(message: string, action?: { label: string; onClick: () => void }) => void>();
    setEditDialog = vi.fn<(...args: any[]) => void>();
    setError = vi.fn<(...args: any[]) => void>();
    entries = [makeEntry()];
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function renderHandlers(overrides?: Partial<Parameters<typeof useEntryHandlers>[0]>) {
    return renderHook(() =>
      useEntryHandlers({
        entries,
        updateEntry,
        deleteEntry,
        removeEntryFromState,
        restoreEntryToState,
        showSnackbar,
        setEditDialog,
        setError,
        t: fakeT,
        ...overrides,
      }),
    );
  }

  describe("handleEdit", () => {
    it("updates entry and closes edit dialog", async () => {
      const { result } = renderHandlers();
      await act(async () => {
        await result.current.handleEdit("e1", {
          description: "updated",
          duration: 45,
          date: "2025-03-01",
        });
      });
      expect(updateEntry).toHaveBeenCalledWith(
        "e1",
        expect.objectContaining({
          description: "updated",
          duration: 45,
          originalDuration: 30,
        }),
      );
      expect(setEditDialog).toHaveBeenCalledWith(null);
    });

    it("preserves existing originalDuration if already set", async () => {
      entries = [makeEntry({ originalDuration: 15 })];
      const { result } = renderHandlers();
      await act(async () => {
        await result.current.handleEdit("e1", {
          description: "x",
          duration: 60,
          date: "2025-03-01",
        });
      });
      expect(updateEntry).toHaveBeenCalledWith(
        "e1",
        expect.objectContaining({
          duration: 60,
        }),
      );
      const call = updateEntry.mock.calls[0][1];
      expect(call.originalDuration).toBeUndefined();
    });

    it("sets error on failure", async () => {
      updateEntry.mockRejectedValue(new Error("DB error"));
      const { result } = renderHandlers();
      await act(async () => {
        await result.current.handleEdit("e1", {
          description: "x",
          duration: 30,
          date: "2025-03-01",
        });
      });
      expect(setError).toHaveBeenCalledWith(expect.stringContaining("DB error"));
    });
  });

  describe("handleUpdateDuration", () => {
    it("updates duration and sets originalDuration on first change", async () => {
      const { result } = renderHandlers();
      await act(async () => {
        await result.current.handleUpdateDuration("e1", 45);
      });
      expect(updateEntry).toHaveBeenCalledWith(
        "e1",
        expect.objectContaining({
          duration: 45,
          originalDuration: 30,
        }),
      );
    });
  });

  describe("handleUpdateDuration error", () => {
    it("sets error when updateEntry fails (line 88)", async () => {
      updateEntry.mockRejectedValue(new Error("Duration update failed"));
      const { result } = renderHandlers();
      await act(async () => {
        await result.current.handleUpdateDuration("e1", 45);
      });
      expect(setError).toHaveBeenCalledWith(expect.stringContaining("Duration update failed"));
    });

    it("sets error with generic message for non-Error throw", async () => {
      updateEntry.mockRejectedValue("string error");
      const { result } = renderHandlers();
      await act(async () => {
        await result.current.handleUpdateDuration("e1", 45);
      });
      expect(setError).toHaveBeenCalledWith(expect.stringContaining("Unknown error"));
    });
  });

  describe("handleUpdateActivity", () => {
    it("updates activity ID", async () => {
      const { result } = renderHandlers();
      await act(async () => {
        await result.current.handleUpdateActivity("e1", 10);
      });
      expect(updateEntry).toHaveBeenCalledWith("e1", { activityId: 10 });
    });

    it("sets error when updateEntry fails (line 99)", async () => {
      updateEntry.mockRejectedValue(new Error("Activity update failed"));
      const { result } = renderHandlers();
      await act(async () => {
        await result.current.handleUpdateActivity("e1", 10);
      });
      expect(setError).toHaveBeenCalledWith(expect.stringContaining("Activity update failed"));
    });

    it("sets error with generic message for non-Error throw", async () => {
      updateEntry.mockRejectedValue("string error");
      const { result } = renderHandlers();
      await act(async () => {
        await result.current.handleUpdateActivity("e1", 10);
      });
      expect(setError).toHaveBeenCalledWith(expect.stringContaining("Unknown error"));
    });
  });

  describe("handleDelete", () => {
    it("removes entry from state and shows snackbar with undo", () => {
      const { result } = renderHandlers();
      act(() => {
        result.current.handleDelete("e1");
      });
      expect(removeEntryFromState).toHaveBeenCalledWith("e1");
      expect(showSnackbar).toHaveBeenCalledWith("Entry deleted", {
        label: "Undo",
        onClick: expect.any(Function),
      });
      expect(deleteEntry).not.toHaveBeenCalled();
    });

    it("calls deleteEntry API after timeout", () => {
      const { result } = renderHandlers();
      act(() => {
        result.current.handleDelete("e1");
      });
      expect(deleteEntry).not.toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(5000);
      });
      expect(deleteEntry).toHaveBeenCalledWith("e1");
    });

    it("restores entry on undo click", () => {
      const entry = makeEntry();
      removeEntryFromState.mockReturnValue(entry);
      const { result } = renderHandlers();

      act(() => {
        result.current.handleDelete("e1");
      });

      const undoAction = showSnackbar.mock.calls[0][1]!;
      act(() => {
        undoAction.onClick();
      });

      expect(restoreEntryToState).toHaveBeenCalledWith(entry);

      act(() => {
        vi.advanceTimersByTime(5000);
      });
      expect(deleteEntry).not.toHaveBeenCalled();
    });

    it("flushes first pending delete when a second delete happens", () => {
      const entry1 = makeEntry({ id: "e1" });
      const entry2 = makeEntry({ id: "e2" });

      removeEntryFromState.mockReturnValueOnce(entry1).mockReturnValueOnce(entry2);
      const { result } = renderHandlers();

      act(() => {
        result.current.handleDelete("e1");
      });
      expect(deleteEntry).not.toHaveBeenCalled();

      act(() => {
        result.current.handleDelete("e2");
      });
      expect(deleteEntry).toHaveBeenCalledWith("e1");
      expect(deleteEntry).not.toHaveBeenCalledWith("e2");

      act(() => {
        vi.advanceTimersByTime(5000);
      });
      expect(deleteEntry).toHaveBeenCalledWith("e2");
    });

    it("does nothing if entry not found in state", () => {
      removeEntryFromState.mockReturnValue(undefined);
      const { result } = renderHandlers();

      act(() => {
        result.current.handleDelete("nonexistent");
      });

      expect(showSnackbar).not.toHaveBeenCalled();
      expect(deleteEntry).not.toHaveBeenCalled();
    });

    it("restores entry and sets error if API delete fails", async () => {
      const entry = makeEntry();
      removeEntryFromState.mockReturnValue(entry);
      deleteEntry.mockRejectedValue(new Error("Network error"));
      const { result } = renderHandlers();

      act(() => {
        result.current.handleDelete("e1");
      });

      await act(async () => {
        vi.advanceTimersByTime(5000);
      });

      expect(restoreEntryToState).toHaveBeenCalledWith(entry);
      expect(setError).toHaveBeenCalledWith(expect.stringContaining("Network error"));
    });
  });
});
