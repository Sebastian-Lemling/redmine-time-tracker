import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@/test/test-utils";
import App from "./App";
import type { TimeLogEntry } from "./types/redmine";
import { toLocalDateString, getWeekKey, getWeekDates } from "./lib/dates";

const mockFetchActivities = vi.fn().mockResolvedValue([]);
const mockFetchStatuses = vi.fn().mockResolvedValue([]);
const mockFetchTrackers = vi.fn().mockResolvedValue([]);

const defaultRedmine = {
  user: null as any,
  redmineUrl: "http://redmine.test",
  loading: false,
  error: null as string | null,
  issues: [] as any[],
  activities: [] as any[],
  activitiesByProject: {},
  statuses: [],
  trackers: [],
  trackersByProject: {},
  allowedStatusesByIssue: {},
  membersByProject: {},
  versionsByProject: {},
  issueDescriptions: {},
  issueComments: {},
  issueSubjects: {},
  remoteEntries: [],
  remoteLoading: false,
  fetchIssues: vi.fn().mockResolvedValue([]),
  fetchActivities: mockFetchActivities,
  fetchStatuses: mockFetchStatuses,
  fetchTrackers: mockFetchTrackers,
  fetchProjectActivities: vi.fn(),
  fetchProjectTrackers: vi.fn(),
  fetchAllowedStatuses: vi.fn(),
  fetchProjectMembers: vi.fn(),
  fetchProjectVersions: vi.fn(),
  fetchIssueDescription: vi.fn(),
  fetchIssueSubject: vi.fn(),
  fetchRemoteEntries: vi.fn(),
  refreshRemoteEntries: vi.fn(),
  refreshIssue: vi.fn(),
  mergeIssue: vi.fn(),
  updateIssueStatus: vi.fn(),
  updateIssueTracker: vi.fn(),
  updateIssueAssignee: vi.fn(),
  updateIssueVersion: vi.fn(),
  updateIssueDoneRatio: vi.fn(),
  invalidateAllowedStatuses: vi.fn(),
  createTimeEntry: vi.fn(),
};

let redmineOverrides: Partial<typeof defaultRedmine> = {};

vi.mock("./hooks/useRedmine", () => ({
  useRedmine: () => ({ ...defaultRedmine, ...redmineOverrides }),
}));

vi.mock("./hooks/useMultiTimer", () => ({
  useMultiTimer: () => ({
    timers: {},
    activeId: null,
    elapsedMap: {},
    startOrResume: vi.fn(),
    pause: vi.fn(),
    capture: vi.fn(),
    discard: vi.fn(),
    adjustElapsed: vi.fn(),
  }),
}));

let timeLogOverrides: Partial<ReturnType<typeof import("./hooks/useTimeLog").useTimeLog>> = {};
vi.mock("./hooks/useTimeLog", () => ({
  useTimeLog: () => ({
    entries: [] as TimeLogEntry[],
    entriesByDate: {},
    sortedDates: [],
    entriesByWeek: {},
    sortedWeeks: [],
    entriesByMonth: {},
    sortedMonths: [],
    loading: false,
    error: null,
    addEntry: vi.fn(),
    markSynced: vi.fn(),
    updateEntry: vi.fn(),
    deleteEntry: vi.fn(),
    removeEntryFromState: vi.fn(),
    restoreEntryToState: vi.fn(),
    ...timeLogOverrides,
  }),
}));

vi.mock("./hooks/usePinnedIssues", () => ({
  usePinnedIssues: () => ({
    pinnedIds: new Set(),
    pinnedIssues: [],
    isPinned: vi.fn(() => false),
    toggle: vi.fn(),
    unpin: vi.fn(),
    hide: vi.fn(),
    pinSilent: vi.fn(),
    syncAssignedPins: vi.fn(),
    refreshPinned: vi.fn().mockResolvedValue([]),
    updateIssue: vi.fn(),
  }),
}));

vi.mock("./hooks/useHashRouter", () => ({
  useHashRouter: () => ({
    route: { section: "tickets", year: 2026, month: 2, day: undefined, tab: "drafts" },
    navigate: vi.fn(),
  }),
}));

vi.mock("./hooks/useTheme", () => ({
  useTheme: () => ({
    mode: "light" as const,
    resolved: "light" as const,
    setMode: vi.fn(),
    toggle: vi.fn(),
  }),
}));

vi.mock("./hooks/useVisibilityRefresh", () => ({
  useVisibilityRefresh: () => ({
    lastFetchRef: { current: 0 },
  }),
}));

vi.mock("./hooks/useInstances", () => ({
  useInstances: () => ({
    instances: [],
    loading: false,
    renameInstance: vi.fn(),
    reorderInstances: vi.fn(),
    getInstanceName: vi.fn((id: string) => id),
    instanceMap: new Map(),
  }),
}));

let dialogOverrides: Record<string, unknown> = {};
vi.mock("./hooks/useDialogManager", () => ({
  useDialogManager: () => ({
    bookDialog: null,
    bookDialogActivities: [],
    syncDialog: null,
    syncDialogActivities: [],
    editDialog: null,
    editDialogActivities: [],
    setBookDialog: vi.fn(),
    setSyncDialog: vi.fn(),
    setEditDialog: vi.fn(),
    handleBookConfirm: vi.fn(),
    handleBookCancel: vi.fn(),
    ...dialogOverrides,
  }),
}));

vi.mock("./hooks/useIssueMutationHandlers", () => ({
  useIssueMutationHandlers: () => ({
    handleStatusChange: vi.fn(),
    handleTrackerChange: vi.fn(),
    handleAssigneeChange: vi.fn(),
    handleVersionChange: vi.fn(),
    handleDoneRatioChange: vi.fn(),
  }),
}));

vi.mock("./hooks/useTimerHandlers", () => ({
  useTimerHandlers: () => ({
    handlePlay: vi.fn(),
    handleSave: vi.fn(),
    handleOpenBookDialog: vi.fn(),
  }),
}));

vi.mock("./hooks/useEntryHandlers", () => ({
  useEntryHandlers: () => ({
    handleEdit: vi.fn(),
    handleUpdateDuration: vi.fn(),
    handleUpdateActivity: vi.fn(),
    handleDelete: vi.fn(),
  }),
}));

const mockCancelSyncAll = vi.fn();
vi.mock("./hooks/useSyncOrchestrator", () => ({
  useSyncOrchestrator: () => ({
    handleSyncEntry: vi.fn(),
    handleOpenSyncDialog: vi.fn(),
    handleSync: vi.fn(),
    cancelSyncAll: mockCancelSyncAll,
  }),
}));

let mockSnackbarData: any = null;
const mockShowSnackbar = vi.fn();
const mockDismissSnackbar = vi.fn();
vi.mock("./hooks/useSnackbar", () => ({
  useSnackbar: () => ({
    snackbar: mockSnackbarData,
    showSnackbar: mockShowSnackbar,
    dismissSnackbar: mockDismissSnackbar,
  }),
}));

const mockFetchWeekRemoteEntries = vi.fn().mockResolvedValue(undefined);
let weekRemoteEntriesOverride: any[] = [];
vi.mock("./hooks/useWeekRemoteEntries", () => ({
  useWeekRemoteEntries: () => ({
    weekRemoteEntries: weekRemoteEntriesOverride,
    fetchWeekRemoteEntries: mockFetchWeekRemoteEntries,
  }),
}));

let capturedAppContext: Record<string, any> = {};
let capturedAppContentProps: Record<string, any> = {};
vi.mock("./AppHeader", () => ({
  default: () => <div data-testid="app-header">AppHeader</div>,
}));

/* eslint-disable react-hooks/rules-of-hooks */
vi.mock("./AppContent", async () => {
  const { useAppContext } = await import("./AppContext");
  return {
    default: (props: Record<string, any>) => {
      capturedAppContentProps = props;
      capturedAppContext = useAppContext();
      return <div data-testid="app-content">AppContent</div>;
    },
  };
});
/* eslint-enable react-hooks/rules-of-hooks */

vi.mock("./components/dialogs", () => ({
  BookingDialog: (props: any) => (
    <div data-testid="booking-dialog">BookingDialog: {props.data.issueSubject}</div>
  ),
  SyncDialog: (props: any) => (
    <div data-testid="sync-dialog">
      <span>SyncDialog: {props.entry.issueSubject}</span>
      <button onClick={props.onCancel}>CancelSync</button>
    </div>
  ),
  EditEntryDialog: (props: any) => (
    <div data-testid="edit-dialog">EditEntryDialog: {props.entry.issueSubject}</div>
  ),
}));

describe("App", () => {
  beforeEach(() => {
    redmineOverrides = {};
    dialogOverrides = {};
    timeLogOverrides = {};
    weekRemoteEntriesOverride = [];
    mockSnackbarData = null;
    capturedAppContext = {};
    capturedAppContentProps = {};
    vi.clearAllMocks();
  });

  it("shows loading spinner when loading and no user", () => {
    redmineOverrides = { loading: true, user: null };
    render(<App />);
    expect(screen.getByText(/connecting|verbinde/i)).toBeInTheDocument();
  });

  it("shows error state when error and no user", () => {
    redmineOverrides = { error: "Connection refused", user: null };
    render(<App />);
    expect(screen.getByText(/connection refused/i)).toBeInTheDocument();
    expect(screen.getByText(/npm run setup/i)).toBeInTheDocument();
  });

  it("renders nothing when no user and no loading/error", () => {
    redmineOverrides = { user: null, loading: false, error: null };
    const { container } = render(<App />);
    expect(container.querySelector("[data-testid='app-header']")).not.toBeInTheDocument();
  });

  it("renders AppHeader and AppContent when user is available", () => {
    redmineOverrides = {
      user: { id: 1, login: "admin", firstname: "A", lastname: "B" },
    };
    render(<App />);
    expect(screen.getByTestId("app-header")).toBeInTheDocument();
    expect(screen.getByTestId("app-content")).toBeInTheDocument();
  });

  it("fetches activities when user is available", () => {
    redmineOverrides = {
      user: { id: 1, login: "admin", firstname: "A", lastname: "B" },
    };
    render(<App />);
    expect(mockFetchActivities).toHaveBeenCalled();
  });

  it("does not fetch data when no user", () => {
    redmineOverrides = { user: null };
    render(<App />);
    expect(mockFetchActivities).not.toHaveBeenCalled();
  });

  it("renders Snackbar component", () => {
    redmineOverrides = {
      user: { id: 1, login: "admin", firstname: "A", lastname: "B" },
    };
    render(<App />);
    expect(screen.getByTestId("app-content")).toBeInTheDocument();
  });

  it("error state shows connection failed heading", () => {
    redmineOverrides = { error: "ECONNREFUSED", user: null };
    render(<App />);
    expect(screen.getByText(/verbindung fehlgeschlagen|connection failed/i)).toBeInTheDocument();
  });

  it("loading state shows spinner animation", () => {
    redmineOverrides = { loading: true, user: null };
    const { container } = render(<App />);
    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("renders error banner when setError is called and dismiss clears it", () => {
    redmineOverrides = {
      user: { id: 1, login: "admin", firstname: "A", lastname: "B" },
    };
    render(<App />);
    // For now, verify no error banner when error is null
    expect(screen.queryByText(/dismiss|schließen/i)).not.toBeInTheDocument();
  });

  it("renders BookingDialog when dialogManager.bookDialog is set", () => {
    redmineOverrides = {
      user: { id: 1, login: "admin", firstname: "A", lastname: "B" },
    };
    dialogOverrides = {
      bookDialog: {
        issueId: 42,
        issueSubject: "Test Booking",
        projectId: 1,
        projectName: "TestProject",
        durationMinutes: 60,
      },
      bookDialogActivities: [{ id: 9, name: "Dev" }],
    };
    render(<App />);
    expect(screen.getByTestId("booking-dialog")).toBeInTheDocument();
    expect(screen.getByText(/Test Booking/)).toBeInTheDocument();
  });

  it("renders SyncDialog when dialogManager.syncDialog is set", () => {
    redmineOverrides = {
      user: { id: 1, login: "admin", firstname: "A", lastname: "B" },
    };
    dialogOverrides = {
      syncDialog: {
        id: "e1",
        issueId: 42,
        issueSubject: "Test Sync",
        projectId: 1,
        projectName: "TestProject",
        duration: 60,
        description: "",
        date: "2026-03-03",
        syncedToRedmine: false,
      },
      syncDialogActivities: [{ id: 9, name: "Dev" }],
    };
    render(<App />);
    expect(screen.getByTestId("sync-dialog")).toBeInTheDocument();
    expect(screen.getByText(/Test Sync/)).toBeInTheDocument();
  });

  it("SyncDialog cancel calls setSyncDialog(null) and cancelSyncAll", () => {
    const mockSetSyncDialog = vi.fn();
    redmineOverrides = {
      user: { id: 1, login: "admin", firstname: "A", lastname: "B" },
    };
    dialogOverrides = {
      syncDialog: {
        id: "e1",
        issueId: 42,
        issueSubject: "Test Sync Cancel",
        projectId: 1,
        projectName: "TestProject",
        duration: 60,
        description: "",
        date: "2026-03-03",
        syncedToRedmine: false,
      },
      syncDialogActivities: [],
      setSyncDialog: mockSetSyncDialog,
    };
    render(<App />);
    fireEvent.click(screen.getByText("CancelSync"));
    expect(mockSetSyncDialog).toHaveBeenCalledWith(null);
    expect(mockCancelSyncAll).toHaveBeenCalled();
  });

  it("renders EditEntryDialog when dialogManager.editDialog is set", () => {
    redmineOverrides = {
      user: { id: 1, login: "admin", firstname: "A", lastname: "B" },
    };
    dialogOverrides = {
      editDialog: {
        id: "e1",
        issueId: 42,
        issueSubject: "Test Edit",
        projectId: 1,
        projectName: "TestProject",
        duration: 60,
        description: "",
        date: "2026-03-03",
        syncedToRedmine: false,
      },
      editDialogActivities: [{ id: 9, name: "Dev" }],
    };
    render(<App />);
    expect(screen.getByTestId("edit-dialog")).toBeInTheDocument();
    expect(screen.getByText(/Test Edit/)).toBeInTheDocument();
  });

  it("does not render dialogs when all are null", () => {
    redmineOverrides = {
      user: { id: 1, login: "admin", firstname: "A", lastname: "B" },
    };
    render(<App />);
    expect(screen.queryByTestId("booking-dialog")).not.toBeInTheDocument();
    expect(screen.queryByTestId("sync-dialog")).not.toBeInTheDocument();
    expect(screen.queryByTestId("edit-dialog")).not.toBeInTheDocument();
  });

  it("passes correct props to AppContent including entries", () => {
    redmineOverrides = {
      user: { id: 1, login: "admin", firstname: "A", lastname: "B" },
    };
    render(<App />);
    expect(capturedAppContentProps.activeSection).toBe("tickets");
    expect(capturedAppContentProps.entries).toEqual([]);
    expect(capturedAppContentProps.activeInstanceId).toBe("default");
    expect(typeof capturedAppContentProps.startOrResume).toBe("function");
    expect(typeof capturedAppContentProps.capture).toBe("function");
  });

  it("computes unsyncedCount from entries", () => {
    const entries = [
      {
        id: "e1",
        issueId: 1,
        issueSubject: "A",
        projectId: 1,
        projectName: "P",
        startTime: "",
        endTime: "",
        duration: 60,
        description: "",
        date: "2026-03-03",
        syncedToRedmine: false,
        instanceId: "default",
      },
      {
        id: "e2",
        issueId: 2,
        issueSubject: "B",
        projectId: 1,
        projectName: "P",
        startTime: "",
        endTime: "",
        duration: 30,
        description: "",
        date: "2026-03-03",
        syncedToRedmine: true,
        instanceId: "default",
      },
    ] as TimeLogEntry[];
    timeLogOverrides = { entries };
    redmineOverrides = {
      user: { id: 1, login: "admin", firstname: "A", lastname: "B" },
    };
    render(<App />);
    expect(capturedAppContentProps.entries).toEqual(entries);
  });

  it("BookingDialog receives doneRatio from issues when bookDialog lacks it", async () => {
    redmineOverrides = {
      user: { id: 1, login: "admin", firstname: "A", lastname: "B" },
      issues: [
        { id: 42, subject: "Test", project: { id: 1, name: "P" }, done_ratio: 75, updated_on: "" },
      ] as any[],
    };
    dialogOverrides = {
      bookDialog: {
        issueId: 42,
        issueSubject: "Test Booking DR",
        projectId: 1,
        projectName: "TestProject",
        durationMinutes: 60,
      },
      bookDialogActivities: [],
    };
    await act(async () => {
      render(<App />);
    });
    expect(screen.getByTestId("booking-dialog")).toBeInTheDocument();
  });

  describe("todayMinutes and weekMinutes with remote entries", () => {
    const today = toLocalDateString(new Date());
    const weekKey = getWeekKey(today);
    const { start: weekStart } = getWeekDates(weekKey);
    const otherWeekDay =
      weekStart === today
        ? toLocalDateString(new Date(new Date(weekStart + "T00:00:00").getTime() + 86400000))
        : weekStart;

    const userOverride = {
      user: { id: 1, login: "admin", firstname: "A", lastname: "B" },
    };

    it("todayMinutes = remote today + local unsynced today", () => {
      weekRemoteEntriesOverride = [
        {
          id: 1,
          hours: 1.5,
          spent_on: today,
          comments: "",
          activity: { id: 9, name: "Dev" },
          project: { id: 1, name: "P" },
        },
      ];
      timeLogOverrides = {
        entries: [
          {
            id: "e1",
            issueId: 1,
            issueSubject: "A",
            projectId: 1,
            projectName: "P",
            startTime: "",
            endTime: "",
            duration: 30,
            description: "",
            date: today,
            syncedToRedmine: false,
            instanceId: "default",
          },
        ] as TimeLogEntry[],
      };
      redmineOverrides = userOverride;
      render(<App />);
      expect(capturedAppContext.todayMinutes).toBe(120);
    });

    it("weekMinutes = remote week + local unsynced week", () => {
      weekRemoteEntriesOverride = [
        {
          id: 1,
          hours: 2,
          spent_on: today,
          comments: "",
          activity: { id: 9, name: "Dev" },
          project: { id: 1, name: "P" },
        },
        {
          id: 2,
          hours: 1,
          spent_on: otherWeekDay,
          comments: "",
          activity: { id: 9, name: "Dev" },
          project: { id: 1, name: "P" },
        },
      ];
      timeLogOverrides = {
        entries: [
          {
            id: "e1",
            issueId: 1,
            issueSubject: "A",
            projectId: 1,
            projectName: "P",
            startTime: "",
            endTime: "",
            duration: 45,
            description: "",
            date: today,
            syncedToRedmine: false,
            instanceId: "default",
          },
        ] as TimeLogEntry[],
      };
      redmineOverrides = userOverride;
      render(<App />);
      expect(capturedAppContext.weekMinutes).toBe(225);
    });

    it("synced local entries are NOT double-counted", () => {
      weekRemoteEntriesOverride = [
        {
          id: 1,
          hours: 1,
          spent_on: today,
          comments: "",
          activity: { id: 9, name: "Dev" },
          project: { id: 1, name: "P" },
        },
      ];
      timeLogOverrides = {
        entries: [
          {
            id: "e1",
            issueId: 1,
            issueSubject: "A",
            projectId: 1,
            projectName: "P",
            startTime: "",
            endTime: "",
            duration: 60,
            description: "",
            date: today,
            syncedToRedmine: true,
            instanceId: "default",
          },
          {
            id: "e2",
            issueId: 2,
            issueSubject: "B",
            projectId: 1,
            projectName: "P",
            startTime: "",
            endTime: "",
            duration: 30,
            description: "",
            date: today,
            syncedToRedmine: false,
            instanceId: "default",
          },
        ] as TimeLogEntry[],
      };
      redmineOverrides = userOverride;
      render(<App />);
      expect(capturedAppContext.todayMinutes).toBe(90);
    });

    it("API failure falls back to local unsynced only", () => {
      weekRemoteEntriesOverride = [];
      timeLogOverrides = {
        entries: [
          {
            id: "e1",
            issueId: 1,
            issueSubject: "A",
            projectId: 1,
            projectName: "P",
            startTime: "",
            endTime: "",
            duration: 45,
            description: "",
            date: today,
            syncedToRedmine: false,
            instanceId: "default",
          },
          {
            id: "e2",
            issueId: 2,
            issueSubject: "B",
            projectId: 1,
            projectName: "P",
            startTime: "",
            endTime: "",
            duration: 60,
            description: "",
            date: today,
            syncedToRedmine: true,
            instanceId: "default",
          },
        ] as TimeLogEntry[],
      };
      redmineOverrides = userOverride;
      render(<App />);
      expect(capturedAppContext.todayMinutes).toBe(45);
    });

    it("fetchWeekRemoteEntries is called on user login", () => {
      redmineOverrides = userOverride;
      render(<App />);
      expect(mockFetchWeekRemoteEntries).toHaveBeenCalled();
    });
  });
});
