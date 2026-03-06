import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@/test/test-utils";
import { SyncDialog } from "@/components/dialogs/SyncDialog";
import type { TimeLogEntry, RedmineActivity } from "@/types/redmine";

const entry: TimeLogEntry = {
  id: "e1",
  issueId: 42,
  issueSubject: "Fix login bug",
  projectId: 1,
  projectName: "Main Project",
  startTime: "2026-03-01T10:00:00Z",
  endTime: "2026-03-01T11:30:00Z",
  duration: 90,
  date: "2026-03-01",
  description: "Fixed auth flow",
  syncedToRedmine: false,
};

const activities: RedmineActivity[] = [
  { id: 9, name: "Entwicklung", is_default: true },
  { id: 10, name: "Design", is_default: false },
];

const baseProps = {
  entry,
  activities,
  onSync: vi.fn().mockResolvedValue(undefined),
  onCancel: vi.fn(),
};

describe("SyncDialog", () => {
  it("renders dialog with sync title", () => {
    render(<SyncDialog {...baseProps} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Sync to Redmine")).toBeInTheDocument();
  });

  it("shows entry summary with issue id, subject, hours", () => {
    render(<SyncDialog {...baseProps} />);
    // 90min = 1.5h
    expect(screen.getByText("1.50h")).toBeInTheDocument();
    expect(screen.getByText(/Fix login bug/)).toBeInTheDocument();
  });

  it("shows entry description", () => {
    render(<SyncDialog {...baseProps} />);
    expect(screen.getByText("Fixed auth flow")).toBeInTheDocument();
  });

  it("sets default activity", () => {
    render(<SyncDialog {...baseProps} />);
    expect(screen.getByText("Entwicklung")).toBeInTheDocument();
  });

  it("prefers entry's stored activityId if valid", () => {
    const entryWithActivity = { ...entry, activityId: 10 };
    render(<SyncDialog {...baseProps} entry={entryWithActivity} />);
    expect(screen.getByText("Design")).toBeInTheDocument();
  });

  it("submit calls onSync with entryId and activityId", async () => {
    const onSync = vi.fn().mockResolvedValue(undefined);
    render(<SyncDialog {...baseProps} onSync={onSync} />);
    fireEvent.click(screen.getByText("Send"));
    await waitFor(() => {
      expect(onSync).toHaveBeenCalledWith("e1", 9);
    });
  });

  it("shows error message when sync fails", async () => {
    const onSync = vi.fn().mockRejectedValue(new Error("Network error"));
    render(<SyncDialog {...baseProps} onSync={onSync} />);
    fireEvent.click(screen.getByText("Send"));
    await waitFor(() => {
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });
  });

  it("cancel button calls onCancel", () => {
    const onCancel = vi.fn();
    render(<SyncDialog {...baseProps} onCancel={onCancel} />);
    fireEvent.click(screen.getByText("Cancel"));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("Escape calls onCancel when not syncing", () => {
    const onCancel = vi.fn();
    render(<SyncDialog {...baseProps} onCancel={onCancel} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("click backdrop calls onCancel when not syncing", () => {
    const onCancel = vi.fn();
    render(<SyncDialog {...baseProps} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole("dialog"));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
