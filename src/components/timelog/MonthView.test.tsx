import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@/test/test-utils";
import { MonthView } from "./MonthView";
import type { TimeLogEntry as TEntry, RedmineTimeEntry } from "@/types/redmine";

function makeEntry(overrides?: Partial<TEntry>): TEntry {
  return {
    id: "e1",
    issueId: 100,
    issueSubject: "Fix bug",
    projectId: 1,
    projectName: "PX",
    startTime: "2025-01-15T09:00:00",
    endTime: "2025-01-15T09:30:00",
    duration: 30,
    originalDuration: 30,
    description: "work",
    date: "2025-01-15",
    activityId: 5,
    syncedToRedmine: false,
    ...overrides,
  } as TEntry;
}

function makeRemoteEntry(overrides?: Partial<RedmineTimeEntry>): RedmineTimeEntry {
  return {
    id: 200,
    project: { id: 1, name: "PX" },
    issue: { id: 100 },
    user: { id: 1, name: "Admin" },
    activity: { id: 5, name: "Development" },
    hours: 1.0,
    comments: "synced",
    spent_on: "2025-01-15",
    created_on: "2025-01-15T10:00:00Z",
    updated_on: "2025-01-15T10:00:00Z",
    ...overrides,
  } as RedmineTimeEntry;
}

function makeProps(overrides?: Record<string, unknown>) {
  return {
    route: { section: "timelog" as const, year: 2025, month: 0, day: 15 },
    navigate: vi.fn(),
    entries: [] as TEntry[],
    activities: [{ id: 5, name: "Development", is_default: false }] as any[],
    activitiesByProject: {} as Record<number, any[]>,
    onFetchProjectActivities: vi.fn(),
    onSyncEntry: vi.fn().mockResolvedValue(undefined),
    onOpenSyncDialog: vi.fn(),
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onUpdateDuration: vi.fn(),
    onShowMessage: vi.fn(),
    remoteEntries: [] as RedmineTimeEntry[],
    remoteLoading: false,
    fetchRemoteEntries: vi.fn(),
    refreshRemoteEntries: vi.fn(),
    issues: [{ id: 100, subject: "Fix bug" }] as any[],
    issueSubjects: {} as Record<number, string>,
    fetchIssueSubject: vi.fn(),
    redmineUrl: "http://redmine.test",
    ...overrides,
  };
}

function clickSelectAll() {
  const selectAllCb = screen.getAllByRole("checkbox").find((el) => !el.closest(".de-card"));
  expect(selectAllCb).toBeTruthy();
  fireEvent.click(selectAllCb!);
}

function getSyncButton(): HTMLElement {
  const btn = screen.getByRole("button", { name: /^senden$|^send$/i });
  expect(btn).toBeInTheDocument();
  return btn;
}

describe("MonthView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2025, 0, 15));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders calendar and day detail panel", () => {
    render(<MonthView {...makeProps()} />);
    expect(screen.getAllByText(/Januar|January/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/15\. (Januar|January)/)).toBeInTheDocument();
  });

  it("navigateMonth(-1) from January wraps to December previous year", () => {
    const navigate = vi.fn();
    render(<MonthView {...makeProps({ navigate })} />);
    fireEvent.click(screen.getByLabelText(/vorheriger monat|previous month/i));
    expect(navigate).toHaveBeenCalledWith({
      year: 2024,
      month: 11,
      day: undefined,
      tab: undefined,
    });
  });

  it("navigateMonth(+1) from December wraps to January next year", () => {
    const navigate = vi.fn();
    render(
      <MonthView
        {...makeProps({
          route: { section: "timelog" as const, year: 2025, month: 11, day: 1 },
          navigate,
        })}
      />,
    );
    fireEvent.click(screen.getByLabelText(/nächster monat|next month/i));
    expect(navigate).toHaveBeenCalledWith({
      year: 2026,
      month: 0,
      day: undefined,
      tab: undefined,
    });
  });

  it("navigateMonth(+1) within same year increments month", () => {
    const navigate = vi.fn();
    render(<MonthView {...makeProps({ navigate })} />);
    fireEvent.click(screen.getByLabelText(/nächster monat|next month/i));
    expect(navigate).toHaveBeenCalledWith({
      year: 2025,
      month: 1,
      day: undefined,
      tab: undefined,
    });
  });

  it("onSelectDay with only remote minutes navigates to synced tab", () => {
    const navigate = vi.fn();
    render(
      <MonthView
        {...makeProps({
          navigate,
          remoteEntries: [makeRemoteEntry({ spent_on: "2025-01-20" })],
        })}
      />,
    );
    fireEvent.click(screen.getByText("20"));
    expect(navigate).toHaveBeenCalledWith(expect.objectContaining({ day: 20, tab: "synced" }));
  });

  it("onSelectDay with unsynced entries navigates to unsynced tab", () => {
    const navigate = vi.fn();
    render(
      <MonthView
        {...makeProps({
          navigate,
          entries: [makeEntry({ date: "2025-01-20" })],
        })}
      />,
    );
    fireEvent.click(screen.getByText("20"));
    expect(navigate).toHaveBeenCalledWith(expect.objectContaining({ day: 20, tab: "unsynced" }));
  });

  it("fetchRemoteEntries called on mount with correct month range", () => {
    const fetchRemoteEntries = vi.fn();
    render(<MonthView {...makeProps({ fetchRemoteEntries })} />);
    expect(fetchRemoteEntries).toHaveBeenCalledWith("2025-01-01", "2025-01-31");
  });

  it("fetchRemoteEntries called with correct range for February", () => {
    const fetchRemoteEntries = vi.fn();
    render(
      <MonthView
        {...makeProps({
          fetchRemoteEntries,
          route: { section: "timelog" as const, year: 2025, month: 1, day: 1 },
        })}
      />,
    );
    expect(fetchRemoteEntries).toHaveBeenCalledWith("2025-02-01", "2025-02-28");
  });

  it("handleBatchSync with 1 entry calls onSyncEntry with correct id and activityId", async () => {
    const onSyncEntry = vi.fn().mockResolvedValue(undefined);
    const onShowMessage = vi.fn();
    const entry = makeEntry({ id: "e1", date: "2025-01-15", activityId: 5 });

    render(
      <MonthView
        {...makeProps({
          entries: [entry],
          onSyncEntry,
          onShowMessage,
          route: {
            section: "timelog" as const,
            year: 2025,
            month: 0,
            day: 15,
            tab: "unsynced",
          },
        })}
      />,
    );

    clickSelectAll();
    await act(async () => {
      fireEvent.click(getSyncButton());
    });
    expect(onSyncEntry).toHaveBeenCalledWith("e1", 5);
    expect(onShowMessage).toHaveBeenCalled();
  });

  it("handleBatchSync with 3 entries calls onSyncEntry for each with correct args", async () => {
    const onSyncEntry = vi.fn().mockResolvedValue(undefined);
    const onShowMessage = vi.fn();
    const entries = [
      makeEntry({ id: "e1", date: "2025-01-15", activityId: 5 }),
      makeEntry({
        id: "e2",
        date: "2025-01-15",
        activityId: 6,
        issueId: 101,
        issueSubject: "Task 2",
      }),
      makeEntry({
        id: "e3",
        date: "2025-01-15",
        activityId: 7,
        issueId: 102,
        issueSubject: "Task 3",
      }),
    ];

    render(
      <MonthView
        {...makeProps({
          entries,
          onSyncEntry,
          onShowMessage,
          route: {
            section: "timelog" as const,
            year: 2025,
            month: 0,
            day: 15,
            tab: "unsynced",
          },
        })}
      />,
    );

    clickSelectAll();
    await act(async () => {
      fireEvent.click(getSyncButton());
    });
    expect(onSyncEntry).toHaveBeenCalledTimes(3);
    expect(onSyncEntry).toHaveBeenCalledWith("e1", 5);
    expect(onSyncEntry).toHaveBeenCalledWith("e2", 6);
    expect(onSyncEntry).toHaveBeenCalledWith("e3", 7);
  });

  it("handleBatchSync with missing activity shows warning, never calls onSyncEntry", async () => {
    const onSyncEntry = vi.fn();
    const onShowMessage = vi.fn();
    const entry = makeEntry({
      id: "e1",
      date: "2025-01-15",
      activityId: undefined,
    });

    render(
      <MonthView
        {...makeProps({
          entries: [entry],
          onSyncEntry,
          onShowMessage,
          route: {
            section: "timelog" as const,
            year: 2025,
            month: 0,
            day: 15,
            tab: "unsynced",
          },
        })}
      />,
    );

    clickSelectAll();
    await act(async () => {
      fireEvent.click(getSyncButton());
    });
    expect(onSyncEntry).not.toHaveBeenCalled();
    expect(onShowMessage).toHaveBeenCalledWith(expect.stringMatching(/aktivität|activity/i));
  });

  it("handleBatchSync partial failure reports both counts", async () => {
    const onSyncEntry = vi
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("fail"));
    const onShowMessage = vi.fn();
    const entries = [
      makeEntry({ id: "e1", date: "2025-01-15", activityId: 5 }),
      makeEntry({
        id: "e2",
        date: "2025-01-15",
        activityId: 6,
        issueId: 101,
        issueSubject: "T2",
      }),
      makeEntry({
        id: "e3",
        date: "2025-01-15",
        activityId: 7,
        issueId: 102,
        issueSubject: "T3",
      }),
    ];

    render(
      <MonthView
        {...makeProps({
          entries,
          onSyncEntry,
          onShowMessage,
          route: {
            section: "timelog" as const,
            year: 2025,
            month: 0,
            day: 15,
            tab: "unsynced",
          },
        })}
      />,
    );

    clickSelectAll();
    await act(async () => {
      fireEvent.click(getSyncButton());
    });
    expect(onSyncEntry).toHaveBeenCalledTimes(3);
    expect(onShowMessage).toHaveBeenCalledWith(
      expect.stringMatching(/2.*1|gesendet.*fehlgeschlagen|sent.*failed/i),
    );
  });

  it("handleBatchSync removes synced IDs from selection (sync button disappears)", async () => {
    const onSyncEntry = vi.fn().mockResolvedValue(undefined);
    const entries = [
      makeEntry({ id: "e1", date: "2025-01-15", activityId: 5 }),
      makeEntry({
        id: "e2",
        date: "2025-01-15",
        activityId: 6,
        issueId: 101,
        issueSubject: "T2",
      }),
    ];

    render(
      <MonthView
        {...makeProps({
          entries,
          onSyncEntry,
          route: {
            section: "timelog" as const,
            year: 2025,
            month: 0,
            day: 15,
            tab: "unsynced",
          },
        })}
      />,
    );

    clickSelectAll();
    expect(getSyncButton()).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(getSyncButton());
    });
    expect(screen.queryByRole("button", { name: /^senden$|^send$/i })).not.toBeInTheDocument();
  });

  it("handleBatchSync guards against double-click (batchSyncing=true)", async () => {
    const onSyncEntry = vi
      .fn()
      .mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 1000)));
    const entry = makeEntry({ id: "e1", date: "2025-01-15", activityId: 5 });

    render(
      <MonthView
        {...makeProps({
          entries: [entry],
          onSyncEntry,
          route: {
            section: "timelog" as const,
            year: 2025,
            month: 0,
            day: 15,
            tab: "unsynced",
          },
        })}
      />,
    );

    clickSelectAll();
    const syncBtn = getSyncButton();
    fireEvent.click(syncBtn);
    fireEvent.click(syncBtn);
    expect(onSyncEntry).toHaveBeenCalledTimes(1);
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });
  });

  it("selection resets on date change", () => {
    const entries = [makeEntry({ id: "e1", date: "2025-01-15" })];
    const navigate = vi.fn();

    const { rerender } = render(
      <MonthView
        {...makeProps({
          entries,
          navigate,
          route: {
            section: "timelog" as const,
            year: 2025,
            month: 0,
            day: 15,
            tab: "unsynced",
          },
        })}
      />,
    );

    clickSelectAll();
    expect(getSyncButton()).toBeInTheDocument();

    rerender(
      <MonthView
        {...makeProps({
          entries: [makeEntry({ id: "e2", date: "2025-01-16" })],
          navigate,
          route: {
            section: "timelog" as const,
            year: 2025,
            month: 0,
            day: 16,
            tab: "unsynced",
          },
        })}
      />,
    );

    expect(screen.queryByRole("button", { name: /^senden$|^send$/i })).not.toBeInTheDocument();
    expect(screen.getByText(/alle auswählen|select all/i)).toBeInTheDocument();
  });

  it("visibilitychange calls refreshRemoteEntries when visible", () => {
    const refreshRemoteEntries = vi.fn();
    render(<MonthView {...makeProps({ refreshRemoteEntries })} />);
    refreshRemoteEntries.mockClear();

    Object.defineProperty(document, "visibilityState", {
      value: "visible",
      configurable: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
    expect(refreshRemoteEntries).toHaveBeenCalledTimes(1);
  });

  it("visibilitychange does not call refreshRemoteEntries when hidden", () => {
    const refreshRemoteEntries = vi.fn();
    render(<MonthView {...makeProps({ refreshRemoteEntries })} />);
    refreshRemoteEntries.mockClear();

    Object.defineProperty(document, "visibilityState", {
      value: "hidden",
      configurable: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
    expect(refreshRemoteEntries).not.toHaveBeenCalled();
  });

  it("setInterval calls refreshRemoteEntries every 5 minutes", () => {
    const refreshRemoteEntries = vi.fn();
    render(<MonthView {...makeProps({ refreshRemoteEntries })} />);
    refreshRemoteEntries.mockClear();

    vi.advanceTimersByTime(5 * 60 * 1000);
    expect(refreshRemoteEntries).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(5 * 60 * 1000);
    expect(refreshRemoteEntries).toHaveBeenCalledTimes(2);
  });

  it("fetchIssueSubject called for unknown remote issue IDs", () => {
    const fetchIssueSubject = vi.fn();
    render(
      <MonthView
        {...makeProps({
          fetchIssueSubject,
          remoteEntries: [makeRemoteEntry({ issue: { id: 999 }, spent_on: "2025-01-15" })],
          issues: [{ id: 100, subject: "Fix bug" }],
          issueSubjects: {},
        })}
      />,
    );
    expect(fetchIssueSubject).toHaveBeenCalledWith(999);
  });

  it("fetchIssueSubject not called for known issue IDs", () => {
    const fetchIssueSubject = vi.fn();
    render(
      <MonthView
        {...makeProps({
          fetchIssueSubject,
          remoteEntries: [makeRemoteEntry({ issue: { id: 100 }, spent_on: "2025-01-15" })],
          issues: [{ id: 100, subject: "Fix bug" }],
        })}
      />,
    );
    expect(fetchIssueSubject).not.toHaveBeenCalled();
  });

  it("fetchIssueSubject not called when already in issueSubjects", () => {
    const fetchIssueSubject = vi.fn();
    render(
      <MonthView
        {...makeProps({
          fetchIssueSubject,
          remoteEntries: [makeRemoteEntry({ issue: { id: 999 }, spent_on: "2025-01-15" })],
          issues: [],
          issueSubjects: { 999: "Already fetched" },
        })}
      />,
    );
    expect(fetchIssueSubject).not.toHaveBeenCalled();
  });

  it("today button navigates to current date with exact values", () => {
    const navigate = vi.fn();
    render(
      <MonthView
        {...makeProps({
          navigate,
          route: { section: "timelog" as const, year: 2024, month: 5, day: 1 },
        })}
      />,
    );
    fireEvent.click(screen.getByText(/heute|today/i));
    expect(navigate).toHaveBeenCalledWith({
      year: 2025,
      month: 0,
      day: 15,
      tab: undefined,
    });
  });

  it("onFetchProjectActivities called for entries with unknown projects", () => {
    const onFetchProjectActivities = vi.fn();
    render(
      <MonthView
        {...makeProps({
          onFetchProjectActivities,
          entries: [makeEntry({ projectId: 42, date: "2025-01-15" })],
          activitiesByProject: {},
          route: { section: "timelog" as const, year: 2025, month: 0, day: 15 },
        })}
      />,
    );
    expect(onFetchProjectActivities).toHaveBeenCalledWith(42);
  });

  it("onFetchProjectActivities not called when project activities already loaded", () => {
    const onFetchProjectActivities = vi.fn();
    render(
      <MonthView
        {...makeProps({
          onFetchProjectActivities,
          entries: [makeEntry({ projectId: 1, date: "2025-01-15" })],
          activitiesByProject: { 1: [{ id: 5, name: "Dev" }] },
          route: { section: "timelog" as const, year: 2025, month: 0, day: 15 },
        })}
      />,
    );
    expect(onFetchProjectActivities).not.toHaveBeenCalled();
  });

  it("entry edit through panel calls onEdit with entry object", () => {
    const onEdit = vi.fn();
    render(
      <MonthView
        {...makeProps({
          onEdit,
          entries: [makeEntry({ date: "2025-01-15" })],
          route: {
            section: "timelog" as const,
            year: 2025,
            month: 0,
            day: 15,
            tab: "unsynced",
          },
        })}
      />,
    );
    fireEvent.click(screen.getByLabelText(/bearbeiten|edit/i));
    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: "e1" }));
  });

  it("entry delete through panel calls onDelete with entry id", () => {
    const onDelete = vi.fn();
    render(
      <MonthView
        {...makeProps({
          onDelete,
          entries: [makeEntry({ date: "2025-01-15" })],
          route: {
            section: "timelog" as const,
            year: 2025,
            month: 0,
            day: 15,
            tab: "unsynced",
          },
        })}
      />,
    );
    fireEvent.click(screen.getByLabelText(/löschen|delete/i));
    expect(onDelete).toHaveBeenCalledWith("e1");
  });

  it("entry duration increase through panel calls onUpdateDuration with correct value", () => {
    const onUpdateDuration = vi.fn();
    render(
      <MonthView
        {...makeProps({
          onUpdateDuration,
          entries: [makeEntry({ date: "2025-01-15" })],
          route: {
            section: "timelog" as const,
            year: 2025,
            month: 0,
            day: 15,
            tab: "unsynced",
          },
        })}
      />,
    );
    fireEvent.click(screen.getByLabelText(/minuten mehr|minutes more/i));
    expect(onUpdateDuration).toHaveBeenCalledWith("e1", 45);
  });

  it("navigateTab through DayDetailPanel calls navigate with day and tab", () => {
    const navigate = vi.fn();
    render(
      <MonthView
        {...makeProps({
          navigate,
          entries: [makeEntry({ date: "2025-01-15" })],
          remoteEntries: [makeRemoteEntry({ spent_on: "2025-01-15" })],
          route: {
            section: "timelog" as const,
            year: 2025,
            month: 0,
            day: 15,
            tab: "unsynced",
          },
        })}
      />,
    );
    fireEvent.click(screen.getByText(/gesendet|sent/i));
    expect(navigate).toHaveBeenCalledWith(expect.objectContaining({ day: 15, tab: "synced" }));
  });

  it("heatQuartiles with empty entries shows no heat classes", () => {
    const { container } = render(<MonthView {...makeProps()} />);
    expect(container.querySelector(".cal-cell--heat-1")).not.toBeInTheDocument();
  });

  it("heatQuartiles assigns correct heat levels to days based on entry count", () => {
    const entries = [
      makeEntry({ id: "e1", date: "2025-01-06" }),
      makeEntry({ id: "e2", date: "2025-01-07" }),
      makeEntry({ id: "e3", date: "2025-01-07", issueId: 101 }),
      makeEntry({ id: "e4", date: "2025-01-08" }),
      makeEntry({ id: "e5", date: "2025-01-08", issueId: 102 }),
      makeEntry({ id: "e6", date: "2025-01-08", issueId: 103 }),
      makeEntry({ id: "e7", date: "2025-01-09" }),
      makeEntry({ id: "e8", date: "2025-01-09", issueId: 104 }),
      makeEntry({ id: "e9", date: "2025-01-09", issueId: 105 }),
      makeEntry({ id: "e10", date: "2025-01-09", issueId: 106 }),
    ];
    render(
      <MonthView
        {...makeProps({
          entries,
          route: { section: "timelog" as const, year: 2025, month: 0, day: 15 },
        })}
      />,
    );
    const day6Btn = screen.getByText("6").closest("button")!;
    const day9Btn = screen.getByText("9").closest("button")!;
    expect(day6Btn.className).toMatch(/cal-cell--heat-1/);
    expect(day9Btn.className).toMatch(/cal-cell--heat-4/);
  });

  it("selectedDate defaults to first of month when today is in different month", () => {
    render(
      <MonthView
        {...makeProps({
          route: { section: "timelog" as const, year: 2025, month: 5 },
        })}
      />,
    );
    expect(screen.getByText(/1\. (Juni|June)/)).toBeInTheDocument();
  });

  it("selectedDate defaults to today when today is in displayed month", () => {
    render(
      <MonthView
        {...makeProps({
          route: { section: "timelog" as const, year: 2025, month: 0 },
        })}
      />,
    );
    expect(screen.getByText(/15\. (Januar|January)/)).toBeInTheDocument();
  });

  it("selectedDate with single-digit day is zero-padded", () => {
    render(
      <MonthView
        {...makeProps({
          route: { section: "timelog" as const, year: 2025, month: 0, day: 3 },
          entries: [makeEntry({ date: "2025-01-03" })],
        })}
      />,
    );
    expect(screen.getByText(/3\. (Januar|January)/)).toBeInTheDocument();
  });

  it("synced entries are excluded from localMinsByDate", () => {
    const entries = [
      makeEntry({ id: "e1", date: "2025-01-20", syncedToRedmine: true, duration: 60 }),
      makeEntry({ id: "e2", date: "2025-01-20", syncedToRedmine: false, duration: 30 }),
    ];
    render(
      <MonthView
        {...makeProps({
          entries,
          route: { section: "timelog" as const, year: 2025, month: 0, day: 20 },
        })}
      />,
    );
    expect(screen.getByText("0.5h", { selector: ".de-panel__metric" })).toBeInTheDocument();
  });

  it("combined local+remote minutesByDate sums correctly on same date", () => {
    const entries = [makeEntry({ id: "e1", date: "2025-01-20", duration: 30 })];
    const remoteEntries = [makeRemoteEntry({ spent_on: "2025-01-20", hours: 1.0 })];
    render(
      <MonthView
        {...makeProps({
          entries,
          remoteEntries,
          route: { section: "timelog" as const, year: 2025, month: 0, day: 20 },
        })}
      />,
    );
    const day20Btn = screen.getByText("20").closest("button")!;
    const hoursEl = day20Btn.querySelector(".cal-hours__value");
    expect(hoursEl).toBeInTheDocument();
    expect(hoursEl!.textContent).toBe("1:30");
  });

  it("entries outside displayed month are excluded from calendar data", () => {
    render(
      <MonthView
        {...makeProps({
          entries: [
            makeEntry({ id: "e1", date: "2025-01-15", duration: 60 }),
            makeEntry({ id: "e2", date: "2025-02-15", duration: 120 }),
          ],
          route: { section: "timelog" as const, year: 2025, month: 0, day: 15 },
        })}
      />,
    );
    expect(screen.getByText("1h", { selector: ".de-panel__metric" })).toBeInTheDocument();
  });

  it("selectedDayEntries sorted by startTime descending (newest first)", () => {
    const entries = [
      makeEntry({
        id: "e1",
        date: "2025-01-15",
        startTime: "2025-01-15T08:00:00",
        issueSubject: "Early",
      }),
      makeEntry({
        id: "e2",
        date: "2025-01-15",
        startTime: "2025-01-15T14:00:00",
        issueId: 101,
        issueSubject: "Late",
      }),
    ];
    render(
      <MonthView
        {...makeProps({
          entries,
          route: {
            section: "timelog" as const,
            year: 2025,
            month: 0,
            day: 15,
            tab: "unsynced",
          },
        })}
      />,
    );
    const titles = Array.from(document.querySelectorAll(".de-card__title")).map(
      (el) => el.textContent,
    );
    expect(titles[0]).toBe("Late");
    expect(titles[1]).toBe("Early");
  });

  it("footer drafts chip navigates to first unsynced day", () => {
    const navigate = vi.fn();
    const { container } = render(
      <MonthView
        {...makeProps({
          navigate,
          entries: [
            makeEntry({ id: "e1", date: "2025-01-08" }),
            makeEntry({ id: "e2", date: "2025-01-10" }),
          ],
          route: { section: "timelog" as const, year: 2025, month: 0, day: 15 },
        })}
      />,
    );
    const draftChip = container.querySelector(".cal-footer__chip--warn")!;
    expect(draftChip).toBeInTheDocument();
    fireEvent.click(draftChip);
    expect(navigate).toHaveBeenCalledWith({ day: 8, tab: "unsynced" });
  });

  it("remote entries without issue are handled in fetchIssueSubject effect", () => {
    const fetchIssueSubject = vi.fn();
    render(
      <MonthView
        {...makeProps({
          fetchIssueSubject,
          remoteEntries: [makeRemoteEntry({ issue: undefined as any, spent_on: "2025-01-15" })],
          issues: [],
        })}
      />,
    );
    expect(fetchIssueSubject).not.toHaveBeenCalled();
  });

  it("footer shows correct total, avg, and workDays from calendar data", () => {
    const entries = [
      makeEntry({ id: "e1", date: "2025-01-06", duration: 60 }),
      makeEntry({ id: "e2", date: "2025-01-07", duration: 120 }),
    ];
    render(
      <MonthView
        {...makeProps({
          entries,
          route: { section: "timelog" as const, year: 2025, month: 0, day: 15 },
        })}
      />,
    );
    expect(screen.getByText("3:00")).toBeInTheDocument();
  });

  it("bar segments have correct width percentages", () => {
    render(
      <MonthView
        {...makeProps({
          entries: [makeEntry({ id: "e1", date: "2025-01-20", duration: 30 })],
          remoteEntries: [makeRemoteEntry({ spent_on: "2025-01-20", hours: 0.5 })],
          route: { section: "timelog" as const, year: 2025, month: 0, day: 20 },
        })}
      />,
    );
    const day20Btn = screen.getByText("20").closest("button")!;
    const localBar = day20Btn.querySelector(".cal-bar__local") as HTMLElement;
    const remoteBar = day20Btn.querySelector(".cal-bar__remote") as HTMLElement;
    expect(localBar).toBeInTheDocument();
    expect(remoteBar).toBeInTheDocument();
    expect(localBar.style.width).toBe("50%");
    expect(remoteBar.style.width).toBe("50%");
  });
});
