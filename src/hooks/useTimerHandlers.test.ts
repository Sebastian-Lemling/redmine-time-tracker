import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTimerHandlers } from "@/hooks/useTimerHandlers";
import type { RedmineIssue } from "@/types/redmine";

describe("useTimerHandlers", () => {
  const issue: RedmineIssue = {
    id: 42,
    subject: "Test ticket",
    project: { id: 1, name: "TestProject" },
    tracker: { id: 1, name: "Bug" },
    status: { id: 1, name: "New" },
    priority: { id: 2, name: "Normal" },
    done_ratio: 0,
  } as RedmineIssue;

  it("handlePlay calls startOrResume with issue data", () => {
    const startOrResume = vi.fn();
    const { result } = renderHook(() =>
      useTimerHandlers({
        activeId: null,
        startOrResume,
        capture: vi.fn(),
        setBookDialog: vi.fn(),
      }),
    );
    act(() => {
      result.current.handlePlay(issue);
    });
    expect(startOrResume).toHaveBeenCalledWith(42, "Test ticket", "TestProject", 1);
  });

  it("handleSave captures timer and opens BookingDialog", () => {
    const capture = vi.fn().mockReturnValue({
      issueId: 42,
      issueSubject: "Test ticket",
      projectId: 1,
      projectName: "TestProject",
      durationMinutes: 30,
      startTime: "2025-03-01T09:00:00",
      endTime: "2025-03-01T09:30:00",
    });
    const setBookDialog = vi.fn();
    const { result } = renderHook(() =>
      useTimerHandlers({
        activeId: 42,
        startOrResume: vi.fn(),
        capture,
        setBookDialog,
      }),
    );
    act(() => {
      result.current.handleSave(42);
    });
    expect(capture).toHaveBeenCalledWith(42);
    expect(setBookDialog).toHaveBeenCalledWith(
      expect.objectContaining({
        issueId: 42,
        issueSubject: "Test ticket",
        durationMinutes: 30,
        wasRunning: true,
      }),
    );
  });

  it("handleSave with paused timer sets wasRunning=false", () => {
    const capture = vi.fn().mockReturnValue({
      issueId: 42,
      issueSubject: "Ticket",
      projectId: 1,
      projectName: "P",
      durationMinutes: 15,
      startTime: "2025-03-01T09:00:00",
      endTime: "2025-03-01T09:15:00",
    });
    const setBookDialog = vi.fn();
    const { result } = renderHook(() =>
      useTimerHandlers({
        activeId: 99,
        startOrResume: vi.fn(),
        capture,
        setBookDialog,
      }),
    );
    act(() => {
      result.current.handleSave(42);
    });
    expect(setBookDialog).toHaveBeenCalledWith(
      expect.objectContaining({
        wasRunning: false,
      }),
    );
  });

  it("handleSave does nothing if capture returns null", () => {
    const capture = vi.fn().mockReturnValue(null);
    const setBookDialog = vi.fn();
    const { result } = renderHook(() =>
      useTimerHandlers({
        activeId: null,
        startOrResume: vi.fn(),
        capture,
        setBookDialog,
      }),
    );
    act(() => {
      result.current.handleSave(42);
    });
    expect(setBookDialog).not.toHaveBeenCalled();
  });

  it("handleOpenBookDialog opens dialog with issue data", () => {
    const setBookDialog = vi.fn();
    const { result } = renderHook(() =>
      useTimerHandlers({
        activeId: null,
        startOrResume: vi.fn(),
        capture: vi.fn(),
        setBookDialog,
      }),
    );
    act(() => {
      result.current.handleOpenBookDialog(issue);
    });
    expect(setBookDialog).toHaveBeenCalledWith({
      issueId: 42,
      issueSubject: "Test ticket",
      projectId: 1,
      projectName: "TestProject",
      doneRatio: 0,
    });
  });
});
