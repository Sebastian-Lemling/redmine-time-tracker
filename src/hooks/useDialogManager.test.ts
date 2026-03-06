import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDialogManager } from "./useDialogManager";
import type { BookingDialogData } from "../components/dialogs/BookingDialog";
import type { TimeLogEntry } from "@/types/redmine";

function makeEntry(overrides?: Partial<TimeLogEntry>): TimeLogEntry {
  return {
    id: "e1",
    issueId: 100,
    issueSubject: "Test issue",
    projectId: 1,
    projectName: "ProjectX",
    startTime: "2025-03-01T09:00:00",
    endTime: "2025-03-01T10:00:00",
    duration: 60,
    originalDuration: 60,
    description: "worked",
    date: "2025-03-01",
    activityId: 5,
    syncedToRedmine: false,
    ...overrides,
  } as TimeLogEntry;
}

function makeBookDialog(overrides?: Partial<BookingDialogData>): BookingDialogData {
  return {
    issueId: 100,
    issueSubject: "Test issue",
    projectId: 1,
    projectName: "ProjectX",
    startTime: "2025-03-01T09:00:00",
    endTime: "2025-03-01T10:00:00",
    durationMinutes: 60,
    wasRunning: false,
    ...overrides,
  };
}

function makeDeps(overrides?: Record<string, unknown>) {
  return {
    addEntry: vi.fn().mockResolvedValue(undefined),
    discard: vi.fn(),
    timers: {} as Record<number, any>,
    startOrResume: vi.fn(),
    issues: [{ id: 100, project: { id: 1 } }] as any[],
    activities: [{ id: 5, name: "Development", is_default: false }] as any[],
    activitiesByProject: {} as Record<number, any[]>,
    fetchProjectActivities: vi.fn().mockResolvedValue(undefined),
    setError: vi.fn(),
    ...overrides,
  };
}

describe("useDialogManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("initial state: all dialogs null", () => {
    const { result } = renderHook(() => useDialogManager(makeDeps()));
    expect(result.current.bookDialog).toBeNull();
    expect(result.current.syncDialog).toBeNull();
    expect(result.current.editDialog).toBeNull();
  });

  it("setBookDialog opens booking dialog", () => {
    const { result } = renderHook(() => useDialogManager(makeDeps()));
    act(() => {
      result.current.setBookDialog(makeBookDialog());
    });
    expect(result.current.bookDialog).not.toBeNull();
    expect(result.current.bookDialog?.issueId).toBe(100);
  });

  it("setSyncDialog opens sync dialog", () => {
    const { result } = renderHook(() => useDialogManager(makeDeps()));
    act(() => {
      result.current.setSyncDialog(makeEntry());
    });
    expect(result.current.syncDialog).not.toBeNull();
  });

  it("setEditDialog opens edit dialog", () => {
    const { result } = renderHook(() => useDialogManager(makeDeps()));
    act(() => {
      result.current.setEditDialog(makeEntry());
    });
    expect(result.current.editDialog).not.toBeNull();
  });

  it("handleBookConfirm → addEntry + discard (timer mode) + close dialog", async () => {
    const deps = makeDeps();
    const { result } = renderHook(() => useDialogManager(deps));
    act(() => {
      result.current.setBookDialog(makeBookDialog());
    });

    await act(async () => {
      await result.current.handleBookConfirm({
        issueId: 100,
        issueSubject: "Test issue",
        projectId: 1,
        projectName: "ProjectX",
        startTime: "2025-03-01T09:00:00",
        endTime: "2025-03-01T10:00:00",
        duration: 60,
        originalDuration: 60,
        description: "did stuff",
        date: "2025-03-01",
        activityId: 5,
      });
    });

    expect(deps.addEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        issueId: 100,
        description: "did stuff",
        activityId: 5,
        duration: 60,
        date: "2025-03-01",
      }),
    );
    expect(deps.discard).toHaveBeenCalledWith(100);
    expect(result.current.bookDialog).toBeNull();
  });

  it("handleBookConfirm manual mode → addEntry without discard", async () => {
    const deps = makeDeps();
    const { result } = renderHook(() => useDialogManager(deps));
    act(() => {
      result.current.setBookDialog(makeBookDialog({ startTime: undefined, endTime: undefined }));
    });

    await act(async () => {
      await result.current.handleBookConfirm({
        issueId: 100,
        issueSubject: "Test issue",
        projectId: 1,
        projectName: "ProjectX",
        startTime: "2025-03-01T09:00:00",
        endTime: "2025-03-01T09:00:00",
        duration: 15,
        originalDuration: 15,
        description: "",
        date: "2025-03-01",
        activityId: 5,
      });
    });

    expect(deps.addEntry).toHaveBeenCalled();
    expect(deps.discard).not.toHaveBeenCalled();
    expect(result.current.bookDialog).toBeNull();
  });

  it("handleBookConfirm with no dialog → no-op", async () => {
    const deps = makeDeps();
    const { result } = renderHook(() => useDialogManager(deps));
    await act(async () => {
      await result.current.handleBookConfirm({
        issueId: 100,
        issueSubject: "x",
        projectId: 1,
        projectName: "P",
        startTime: "",
        endTime: "",
        duration: 15,
        originalDuration: 15,
        description: "x",
        date: "2025-03-01",
        activityId: 5,
      });
    });
    expect(deps.addEntry).not.toHaveBeenCalled();
  });

  it("handleBookConfirm error → setError called", async () => {
    const deps = makeDeps({
      addEntry: vi.fn().mockRejectedValue(new Error("save failed")),
    });
    const { result } = renderHook(() => useDialogManager(deps));
    act(() => {
      result.current.setBookDialog(makeBookDialog());
    });

    await act(async () => {
      await result.current.handleBookConfirm({
        issueId: 100,
        issueSubject: "x",
        projectId: 1,
        projectName: "P",
        startTime: "2025-03-01T09:00:00",
        endTime: "2025-03-01T10:00:00",
        duration: 60,
        originalDuration: 60,
        description: "x",
        date: "2025-03-01",
        activityId: 5,
      });
    });

    expect(deps.setError).toHaveBeenCalledWith(expect.stringContaining("save failed"));
  });

  it("handleBookCancel closes dialog", () => {
    const deps = makeDeps();
    const { result } = renderHook(() => useDialogManager(deps));
    act(() => {
      result.current.setBookDialog(makeBookDialog());
    });
    act(() => {
      result.current.handleBookCancel();
    });
    expect(result.current.bookDialog).toBeNull();
  });

  it("handleBookCancel with wasRunning → restarts timer", () => {
    const deps = makeDeps({
      timers: {
        100: { issueId: 100, issueSubject: "Test", projectName: "PX", projectId: 1 },
      },
    });
    const { result } = renderHook(() => useDialogManager(deps));
    act(() => {
      result.current.setBookDialog(makeBookDialog({ wasRunning: true }));
    });
    act(() => {
      result.current.handleBookCancel();
    });
    expect(deps.startOrResume).toHaveBeenCalledWith(100, "Test", "PX", 1);
  });

  it("handleBookCancel with wasRunning=false → no timer restart", () => {
    const deps = makeDeps();
    const { result } = renderHook(() => useDialogManager(deps));
    act(() => {
      result.current.setBookDialog(makeBookDialog({ wasRunning: false }));
    });
    act(() => {
      result.current.handleBookCancel();
    });
    expect(deps.startOrResume).not.toHaveBeenCalled();
  });

  it("syncDialog opens → prefetches activities if not cached", () => {
    const deps = makeDeps();
    const { result } = renderHook(() => useDialogManager(deps));
    act(() => {
      result.current.setSyncDialog(makeEntry({ projectId: 1 }));
    });
    expect(deps.fetchProjectActivities).toHaveBeenCalledWith(1);
  });

  it("syncDialog opens → skips prefetch if already cached", () => {
    const deps = makeDeps({
      activitiesByProject: { 1: [{ id: 5, name: "Dev" }] },
    });
    const { result } = renderHook(() => useDialogManager(deps));
    act(() => {
      result.current.setSyncDialog(makeEntry({ projectId: 1 }));
    });
    expect(deps.fetchProjectActivities).not.toHaveBeenCalled();
  });

  it("syncDialogActivities uses project-specific when available", () => {
    const projectActivities = [{ id: 10, name: "Support" }] as any[];
    const deps = makeDeps({
      activitiesByProject: { 1: projectActivities },
    });
    const { result } = renderHook(() => useDialogManager(deps));
    act(() => {
      result.current.setSyncDialog(makeEntry({ projectId: 1 }));
    });
    expect(result.current.syncDialogActivities).toBe(projectActivities);
  });

  it("syncDialogActivities falls back to global when no project-specific", () => {
    const deps = makeDeps();
    const { result } = renderHook(() => useDialogManager(deps));
    act(() => {
      result.current.setSyncDialog(makeEntry({ projectId: 1 }));
    });
    expect(result.current.syncDialogActivities).toBe(deps.activities);
  });

  it("editDialogActivities resolves project from issues when entry has no projectId", () => {
    const deps = makeDeps({
      issues: [{ id: 100, project: { id: 2, name: "P2" } }] as any[],
      activitiesByProject: { 2: [{ id: 20, name: "Testing" }] } as any,
    });
    const { result } = renderHook(() => useDialogManager(deps));
    act(() => {
      result.current.setEditDialog(makeEntry({ projectId: undefined as any }));
    });
    expect(result.current.editDialogActivities).toEqual([{ id: 20, name: "Testing" }]);
  });

  it("bookDialogActivities uses project-specific when available", () => {
    const projectActivities = [{ id: 10, name: "Review" }] as any[];
    const deps = makeDeps({
      activitiesByProject: { 1: projectActivities },
    });
    const { result } = renderHook(() => useDialogManager(deps));
    act(() => {
      result.current.setBookDialog(makeBookDialog({ projectId: 1 }));
    });
    expect(result.current.bookDialogActivities).toBe(projectActivities);
  });
});
