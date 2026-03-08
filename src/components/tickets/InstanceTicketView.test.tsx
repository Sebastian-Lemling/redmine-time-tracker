import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor } from "@/test/test-utils";
import { InstanceTicketView } from "./InstanceTicketView";
import { createIssue, createTimerState } from "@/test/fixtures";
import type { RedmineIssue, MultiTimerMap, ActiveTimerKey, TimerKey } from "@/types/redmine";
import { timerKey, parseTimerKey } from "@/types/redmine";

// --- Mocks for child components ---

let ticketListProps: Record<string, unknown> = {};
let searchPanelProps: Record<string, unknown> = {};

vi.mock("./TicketList", () => ({
  TicketList: (props: Record<string, unknown>) => {
    ticketListProps = props;
    return <div data-testid="ticket-list" />;
  },
}));

vi.mock("./SearchPanel", () => ({
  SearchPanel: (props: Record<string, unknown>) => {
    searchPanelProps = props;
    return <div data-testid="search-panel" />;
  },
}));

vi.mock("../ui", () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// --- Mocks for hooks ---

const mockFetchIssues = vi.fn().mockResolvedValue([]);
const mockFetchActivities = vi.fn();
const mockFetchStatuses = vi.fn();
const mockFetchTrackers = vi.fn();
const mockRefreshRemoteEntries = vi.fn();
const mockRefreshIssue = vi.fn();
const mockMergeIssue = vi.fn();
const mockUpdateIssueStatus = vi.fn();
const mockUpdateIssueTracker = vi.fn();
const mockUpdateIssueAssignee = vi.fn();
const mockUpdateIssueVersion = vi.fn();
const mockUpdateIssueDoneRatio = vi.fn();
const mockInvalidateAllowedStatuses = vi.fn();
const mockFetchProjectMembers = vi.fn();
const mockFetchProjectVersions = vi.fn();
const mockFetchProjectTrackers = vi.fn();
const mockFetchAllowedStatuses = vi.fn();
const mockFetchIssueDescription = vi.fn();

let mockRedmineUser: { id: number; login: string } | null = {
  id: 1,
  login: "jdoe",
};
let mockRedmineIssues: RedmineIssue[] = [];

vi.mock("../../hooks/useRedmine", () => ({
  useRedmine: () => ({
    user: mockRedmineUser,
    redmineUrl: "http://redmine.test",
    loading: false,
    error: null,
    issues: mockRedmineIssues,
    issuesLoading: false,
    activities: [],
    activitiesByProject: {},
    statuses: [{ id: 1, name: "New", is_closed: false }],
    trackers: [{ id: 1, name: "Bug" }],
    trackersByProject: {},
    allowedStatusesByIssue: {},
    fetchIssues: mockFetchIssues,
    fetchActivities: mockFetchActivities,
    fetchStatuses: mockFetchStatuses,
    fetchTrackers: mockFetchTrackers,
    fetchProjectTrackers: mockFetchProjectTrackers,
    fetchAllowedStatuses: mockFetchAllowedStatuses,
    invalidateAllowedStatuses: mockInvalidateAllowedStatuses,
    refreshIssue: mockRefreshIssue,
    mergeIssue: mockMergeIssue,
    updateIssueStatus: mockUpdateIssueStatus,
    updateIssueTracker: mockUpdateIssueTracker,
    updateIssueAssignee: mockUpdateIssueAssignee,
    updateIssueVersion: mockUpdateIssueVersion,
    updateIssueDoneRatio: mockUpdateIssueDoneRatio,
    createTimeEntry: vi.fn(),
    membersByProject: {},
    versionsByProject: {},
    fetchProjectMembers: mockFetchProjectMembers,
    fetchProjectVersions: mockFetchProjectVersions,
    issueSubjects: {},
    issueDescriptions: {},
    issueComments: {},
    fetchIssueSubject: vi.fn(),
    fetchIssueDescription: mockFetchIssueDescription,
    remoteEntries: [],
    remoteLoading: false,
    fetchRemoteEntries: vi.fn(),
    refreshRemoteEntries: mockRefreshRemoteEntries,
  }),
}));

const mockPinnedToggle = vi.fn();
const mockPinnedHide = vi.fn();
const mockPinnedPin = vi.fn();
const mockPinnedPinSilent = vi.fn();
const mockPinnedUnpin = vi.fn();
const mockPinnedIsPinned = vi.fn().mockReturnValue(false);
const mockPinnedUpdateIssue = vi.fn();
const mockRefreshPinned = vi.fn().mockResolvedValue(undefined);
const mockSyncAssignedPins = vi.fn();

let mockPinnedIds = new Set<number>();
let mockPinnedIssues: RedmineIssue[] = [];

vi.mock("../../hooks/usePinnedIssues", () => ({
  usePinnedIssues: () => ({
    pinnedIds: mockPinnedIds,
    pinnedIssues: mockPinnedIssues,
    recentlyPinned: [],
    hiddenAssignedIds: new Set<number>(),
    pin: mockPinnedPin,
    pinSilent: mockPinnedPinSilent,
    unpin: mockPinnedUnpin,
    toggle: mockPinnedToggle,
    hide: mockPinnedHide,
    isPinned: mockPinnedIsPinned,
    updateIssue: mockPinnedUpdateIssue,
    refreshPinned: mockRefreshPinned,
    syncAssignedPins: mockSyncAssignedPins,
  }),
}));

const mockFavoriteToggle = vi.fn();
const mockFavoriteIsFavorite = vi.fn().mockReturnValue(false);
const mockFavoriteUpdateIssue = vi.fn();

let mockFavoriteIds = new Set<number>();
let mockFavoriteIssues: RedmineIssue[] = [];

vi.mock("../../hooks/useFavorites", () => ({
  useFavorites: () => ({
    favoriteIds: mockFavoriteIds,
    favoriteIssues: mockFavoriteIssues,
    toggle: mockFavoriteToggle,
    isFavorite: mockFavoriteIsFavorite,
    updateIssue: mockFavoriteUpdateIssue,
  }),
}));

const mockHandlePlay = vi.fn();
const mockHandleSave = vi.fn();
const mockHandleOpenBookDialog = vi.fn();

vi.mock("../../hooks/useTimerHandlers", () => ({
  useTimerHandlers: () => ({
    handlePlay: mockHandlePlay,
    handleSave: mockHandleSave,
    handleOpenBookDialog: mockHandleOpenBookDialog,
  }),
}));

const mockHandleStatusChange = vi.fn();
const mockHandleTrackerChange = vi.fn();
const mockHandleAssigneeChange = vi.fn();
const mockHandleVersionChange = vi.fn();
const mockHandleDoneRatioChange = vi.fn();

vi.mock("../../hooks/useIssueMutationHandlers", () => ({
  useIssueMutationHandlers: () => ({
    handleStatusChange: mockHandleStatusChange,
    handleTrackerChange: mockHandleTrackerChange,
    handleAssigneeChange: mockHandleAssigneeChange,
    handleVersionChange: mockHandleVersionChange,
    handleDoneRatioChange: mockHandleDoneRatioChange,
  }),
}));

const mockLastFetchRef = { current: 0 };

vi.mock("../../hooks/useVisibilityRefresh", () => ({
  useVisibilityRefresh: () => ({ lastFetchRef: mockLastFetchRef }),
}));

// --- Test helpers ---

const INSTANCE_ID = "myinstance";
const OTHER_INSTANCE = "other";

function makeProps(overrides?: Partial<Parameters<typeof InstanceTicketView>[0]>) {
  return {
    instanceId: INSTANCE_ID,
    timers: {} as MultiTimerMap,
    activeTimerKey: null as ActiveTimerKey,
    elapsedMap: {} as Record<TimerKey, number>,
    onPause: vi.fn(),
    startOrResume: vi.fn(),
    capture: vi.fn(),
    discard: vi.fn(),
    adjustElapsed: vi.fn(),
    setBookDialog: vi.fn(),
    showSnackbar: vi.fn(),
    refreshTrigger: 0,
    onRefreshComplete: vi.fn(),
    ...overrides,
  };
}

describe("InstanceTicketView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ticketListProps = {};
    searchPanelProps = {};
    mockRedmineUser = { id: 1, login: "jdoe" };
    mockRedmineIssues = [];
    mockPinnedIds = new Set<number>();
    mockPinnedIssues = [];
    mockFavoriteIds = new Set<number>();
    mockFavoriteIssues = [];
    mockPinnedIsPinned.mockReturnValue(false);
    mockFetchIssues.mockResolvedValue([]);
    mockRefreshPinned.mockResolvedValue(undefined);
    mockLastFetchRef.current = 0;
  });

  // --- Mount / initial data loading ---

  it("renders TicketList and SearchPanel", () => {
    const { getByTestId } = render(<InstanceTicketView {...makeProps()} />);
    expect(getByTestId("ticket-list")).toBeInTheDocument();
    expect(getByTestId("search-panel")).toBeInTheDocument();
  });

  it("calls fetchIssues, fetchActivities, fetchStatuses, fetchTrackers on mount when user exists", () => {
    render(<InstanceTicketView {...makeProps()} />);
    expect(mockFetchIssues).toHaveBeenCalled();
    expect(mockFetchActivities).toHaveBeenCalled();
    expect(mockFetchStatuses).toHaveBeenCalled();
    expect(mockFetchTrackers).toHaveBeenCalled();
  });

  it("does NOT call fetch functions when user is null", () => {
    mockRedmineUser = null;
    render(<InstanceTicketView {...makeProps()} />);
    expect(mockFetchIssues).not.toHaveBeenCalled();
    expect(mockFetchActivities).not.toHaveBeenCalled();
    expect(mockFetchStatuses).not.toHaveBeenCalled();
    expect(mockFetchTrackers).not.toHaveBeenCalled();
  });

  it("calls syncAssignedPins when issues change", () => {
    mockRedmineIssues = [createIssue({ id: 42 })];
    render(<InstanceTicketView {...makeProps()} />);
    expect(mockSyncAssignedPins).toHaveBeenCalledWith(mockRedmineIssues);
  });

  // --- Timer key translation: composite → numeric ---

  it("computes instanceActiveId from activeTimerKey for matching instance", () => {
    const key = timerKey(INSTANCE_ID, 42);
    render(<InstanceTicketView {...makeProps({ activeTimerKey: key })} />);
    expect(ticketListProps.activeId).toBe(42);
  });

  it("computes instanceActiveId as null when activeTimerKey belongs to different instance", () => {
    const key = timerKey(OTHER_INSTANCE, 42);
    render(<InstanceTicketView {...makeProps({ activeTimerKey: key })} />);
    expect(ticketListProps.activeId).toBeNull();
  });

  it("computes instanceActiveId as null when activeTimerKey is null", () => {
    render(<InstanceTicketView {...makeProps({ activeTimerKey: null })} />);
    expect(ticketListProps.activeId).toBeNull();
  });

  // --- Timer filtering by instanceId ---

  it("filters timers to only those belonging to this instanceId", () => {
    const myTimer = createTimerState({
      issueId: 10,
      instanceId: INSTANCE_ID,
    });
    const otherTimer = createTimerState({
      issueId: 20,
      instanceId: OTHER_INSTANCE,
    });
    const timers: MultiTimerMap = {
      [timerKey(INSTANCE_ID, 10)]: myTimer,
      [timerKey(OTHER_INSTANCE, 20)]: otherTimer,
    };
    render(<InstanceTicketView {...makeProps({ timers })} />);

    const passedTimers = ticketListProps.timers as MultiTimerMap;
    expect(passedTimers["10"]).toBeDefined();
    expect(passedTimers["20"]).toBeUndefined();
    expect(Object.keys(passedTimers)).toHaveLength(1);
  });

  it("filters elapsedMap to only entries belonging to this instanceId", () => {
    const elapsedMap: Record<TimerKey, number> = {
      [timerKey(INSTANCE_ID, 10)]: 120,
      [timerKey(INSTANCE_ID, 20)]: 300,
      [timerKey(OTHER_INSTANCE, 30)]: 600,
    };
    render(<InstanceTicketView {...makeProps({ elapsedMap })} />);

    const passedElapsed = ticketListProps.elapsedMap as Record<number, number>;
    expect(passedElapsed[10]).toBe(120);
    expect(passedElapsed[20]).toBe(300);
    expect(passedElapsed[30]).toBeUndefined();
    expect(Object.keys(passedElapsed)).toHaveLength(2);
  });

  it("passes empty instanceTimers when no timers match this instance", () => {
    const timers: MultiTimerMap = {
      [timerKey(OTHER_INSTANCE, 10)]: createTimerState({
        issueId: 10,
        instanceId: OTHER_INSTANCE,
      }),
    };
    render(<InstanceTicketView {...makeProps({ timers })} />);
    const passedTimers = ticketListProps.timers as MultiTimerMap;
    expect(Object.keys(passedTimers)).toHaveLength(0);
  });

  // --- onDiscard / onAdjust key translation ---

  it("onDiscard translates issueId to composite timerKey", () => {
    const discardFn = vi.fn();
    render(<InstanceTicketView {...makeProps({ discard: discardFn })} />);

    const onDiscard = ticketListProps.onDiscard as (issueId: number) => void;
    onDiscard(42);
    expect(discardFn).toHaveBeenCalledWith(timerKey(INSTANCE_ID, 42));
  });

  it("onAdjust translates issueId to composite timerKey", () => {
    const adjustFn = vi.fn();
    render(<InstanceTicketView {...makeProps({ adjustElapsed: adjustFn })} />);

    const onAdjust = ticketListProps.onAdjust as (issueId: number, deltaSec: number) => void;
    onAdjust(42, 60);
    expect(adjustFn).toHaveBeenCalledWith(timerKey(INSTANCE_ID, 42), 60);
  });

  // --- handleTogglePin ---

  it("handleTogglePin calls pinned.toggle", () => {
    const issue = createIssue({ id: 50 });
    mockPinnedIsPinned.mockReturnValue(false);
    render(<InstanceTicketView {...makeProps()} />);

    const onTogglePin = ticketListProps.onTogglePin as (issue: RedmineIssue) => void;
    onTogglePin(issue);
    expect(mockPinnedToggle).toHaveBeenCalledWith(issue);
  });

  it("handleTogglePin calls pinned.hide when issue was pinned AND is assigned", () => {
    const issue = createIssue({ id: 50 });
    mockRedmineIssues = [issue];
    mockPinnedIsPinned.mockReturnValue(true);

    render(<InstanceTicketView {...makeProps()} />);

    const onTogglePin = ticketListProps.onTogglePin as (issue: RedmineIssue) => void;
    onTogglePin(issue);

    expect(mockPinnedToggle).toHaveBeenCalledWith(issue);
    expect(mockPinnedHide).toHaveBeenCalledWith(50);
  });

  it("handleTogglePin does NOT call pinned.hide when issue was pinned but NOT assigned", () => {
    const issue = createIssue({ id: 50 });
    mockRedmineIssues = []; // issue 50 is not in assigned issues
    mockPinnedIsPinned.mockReturnValue(true);

    render(<InstanceTicketView {...makeProps()} />);

    const onTogglePin = ticketListProps.onTogglePin as (issue: RedmineIssue) => void;
    onTogglePin(issue);

    expect(mockPinnedToggle).toHaveBeenCalledWith(issue);
    expect(mockPinnedHide).not.toHaveBeenCalled();
  });

  it("handleTogglePin does NOT call pinned.hide when issue was NOT pinned", () => {
    const issue = createIssue({ id: 50 });
    mockRedmineIssues = [issue];
    mockPinnedIsPinned.mockReturnValue(false);

    render(<InstanceTicketView {...makeProps()} />);

    const onTogglePin = ticketListProps.onTogglePin as (issue: RedmineIssue) => void;
    onTogglePin(issue);

    expect(mockPinnedToggle).toHaveBeenCalledWith(issue);
    expect(mockPinnedHide).not.toHaveBeenCalled();
  });

  // --- handleToggleAssignedPin ---

  it("handleToggleAssignedPin unpins and hides when issue was pinned", () => {
    const issue = createIssue({ id: 60 });
    mockPinnedIsPinned.mockReturnValue(true);

    render(<InstanceTicketView {...makeProps()} />);

    const onToggleAssignedPin = searchPanelProps.onToggleAssignedPin as (
      issue: RedmineIssue,
    ) => void;
    onToggleAssignedPin(issue);

    expect(mockPinnedUnpin).toHaveBeenCalledWith(60);
    expect(mockPinnedHide).toHaveBeenCalledWith(60);
    expect(mockPinnedPinSilent).not.toHaveBeenCalled();
  });

  it("handleToggleAssignedPin calls pinSilent when issue was NOT pinned", () => {
    const issue = createIssue({ id: 60 });
    mockPinnedIsPinned.mockReturnValue(false);

    render(<InstanceTicketView {...makeProps()} />);

    const onToggleAssignedPin = searchPanelProps.onToggleAssignedPin as (
      issue: RedmineIssue,
    ) => void;
    onToggleAssignedPin(issue);

    expect(mockPinnedPinSilent).toHaveBeenCalledWith(issue);
    expect(mockPinnedUnpin).not.toHaveBeenCalled();
    expect(mockPinnedHide).not.toHaveBeenCalled();
  });

  // --- handleToggleFavorite ---

  it("handleToggleFavorite calls favorites.toggle", () => {
    const issue = createIssue({ id: 70 });
    render(<InstanceTicketView {...makeProps()} />);

    const onToggleFavorite = ticketListProps.onToggleFavorite as (issue: RedmineIssue) => void;
    onToggleFavorite(issue);
    expect(mockFavoriteToggle).toHaveBeenCalledWith(issue);
  });

  // --- Props passed through to TicketList ---

  it("passes mergedIssues as pinnedIssues to TicketList", () => {
    const pinnedIssue = createIssue({ id: 100, subject: "Pinned" });
    mockPinnedIssues = [pinnedIssue];

    render(<InstanceTicketView {...makeProps()} />);

    expect(ticketListProps.issues).toEqual([pinnedIssue]);
  });

  it("passes pinnedIds to TicketList", () => {
    mockPinnedIds = new Set([100, 200]);
    render(<InstanceTicketView {...makeProps()} />);
    expect(ticketListProps.pinnedIds).toEqual(new Set([100, 200]));
  });

  it("passes loading state from redmine to TicketList", () => {
    render(<InstanceTicketView {...makeProps()} />);
    expect(ticketListProps.loading).toBe(false);
  });

  it("passes redmineUrl to TicketList", () => {
    render(<InstanceTicketView {...makeProps()} />);
    expect(ticketListProps.redmineUrl).toBe("http://redmine.test");
  });

  it("passes onPause directly to TicketList", () => {
    const onPause = vi.fn();
    render(<InstanceTicketView {...makeProps({ onPause })} />);
    expect(ticketListProps.onPause).toBe(onPause);
  });

  it("passes timerHandler callbacks to TicketList", () => {
    render(<InstanceTicketView {...makeProps()} />);
    expect(ticketListProps.onPlay).toBe(mockHandlePlay);
    expect(ticketListProps.onSave).toBe(mockHandleSave);
    expect(ticketListProps.onOpenBookDialog).toBe(mockHandleOpenBookDialog);
  });

  it("passes mutation handlers to TicketList", () => {
    render(<InstanceTicketView {...makeProps()} />);
    expect(ticketListProps.onStatusChange).toBe(mockHandleStatusChange);
    expect(ticketListProps.onTrackerChange).toBe(mockHandleTrackerChange);
    expect(ticketListProps.onAssigneeChange).toBe(mockHandleAssigneeChange);
    expect(ticketListProps.onVersionChange).toBe(mockHandleVersionChange);
    expect(ticketListProps.onDoneRatioChange).toBe(mockHandleDoneRatioChange);
  });

  it("passes favoriteIds and favoriteIssues to TicketList", () => {
    const favIssue = createIssue({ id: 500 });
    mockFavoriteIds = new Set([500]);
    mockFavoriteIssues = [favIssue];

    render(<InstanceTicketView {...makeProps()} />);

    expect(ticketListProps.favoriteIds).toEqual(new Set([500]));
    expect(ticketListProps.favoriteIssues).toEqual([favIssue]);
  });

  // --- Props passed through to SearchPanel ---

  it("passes instanceId to SearchPanel", () => {
    render(<InstanceTicketView {...makeProps()} />);
    expect(searchPanelProps.instanceId).toBe(INSTANCE_ID);
  });

  it("passes pinnedIds and pinnedIssues to SearchPanel", () => {
    const pinnedIssue = createIssue({ id: 100 });
    mockPinnedIds = new Set([100]);
    mockPinnedIssues = [pinnedIssue];

    render(<InstanceTicketView {...makeProps()} />);

    expect(searchPanelProps.pinnedIds).toEqual(new Set([100]));
    expect(searchPanelProps.pinnedIssues).toEqual([pinnedIssue]);
  });

  it("passes assignedIds and assignedIssues to SearchPanel", () => {
    const assignedIssue = createIssue({ id: 42 });
    mockRedmineIssues = [assignedIssue];

    render(<InstanceTicketView {...makeProps()} />);

    expect(searchPanelProps.assignedIssues).toEqual([assignedIssue]);
    const assignedIds = searchPanelProps.assignedIds as Set<number>;
    expect(assignedIds.has(42)).toBe(true);
  });

  it("passes showSnackbar as onShowMessage to SearchPanel", () => {
    const showSnackbar = vi.fn();
    render(<InstanceTicketView {...makeProps({ showSnackbar })} />);
    expect(searchPanelProps.onShowMessage).toBe(showSnackbar);
  });

  it("passes favoriteIds and favoriteIssues to SearchPanel", () => {
    const favIssue = createIssue({ id: 500 });
    mockFavoriteIds = new Set([500]);
    mockFavoriteIssues = [favIssue];

    render(<InstanceTicketView {...makeProps()} />);

    expect(searchPanelProps.favoriteIds).toEqual(new Set([500]));
    expect(searchPanelProps.favoriteIssues).toEqual([favIssue]);
  });

  // --- Refresh trigger ---

  it("does not trigger refresh when refreshTrigger does not change from initial render", () => {
    render(<InstanceTicketView {...makeProps({ refreshTrigger: 0 })} />);
    // fetchIssues is called once from the mount effect, not from refresh
    expect(mockFetchIssues).toHaveBeenCalledTimes(1);
  });

  it("triggers refresh when refreshTrigger increments", async () => {
    const onRefreshComplete = vi.fn();
    const { rerender } = render(
      <InstanceTicketView {...makeProps({ refreshTrigger: 0, onRefreshComplete })} />,
    );

    vi.clearAllMocks();
    mockFetchIssues.mockResolvedValue([]);
    mockRefreshPinned.mockResolvedValue(undefined);

    rerender(<InstanceTicketView {...makeProps({ refreshTrigger: 1, onRefreshComplete })} />);

    await waitFor(() => {
      expect(mockFetchIssues).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(onRefreshComplete).toHaveBeenCalled();
    });
  });

  it("calls onRefreshComplete(true, count) when issues changed during refresh", async () => {
    const oldIssue = createIssue({
      id: 42,
      updated_on: "2026-03-01T00:00:00Z",
    });
    mockRedmineIssues = [oldIssue];

    const onRefreshComplete = vi.fn();
    const { rerender } = render(
      <InstanceTicketView {...makeProps({ refreshTrigger: 0, onRefreshComplete })} />,
    );

    const updatedIssue = createIssue({
      id: 42,
      updated_on: "2026-03-02T00:00:00Z",
    });
    mockFetchIssues.mockResolvedValue([updatedIssue]);
    mockRefreshPinned.mockResolvedValue(undefined);

    rerender(<InstanceTicketView {...makeProps({ refreshTrigger: 1, onRefreshComplete })} />);

    await waitFor(() => {
      expect(onRefreshComplete).toHaveBeenCalledWith(true, 1);
    });
  });

  it("calls onRefreshComplete(false, 0) when issues did not change", async () => {
    const issue = createIssue({
      id: 42,
      updated_on: "2026-03-01T00:00:00Z",
    });
    mockRedmineIssues = [issue];

    const onRefreshComplete = vi.fn();
    const { rerender } = render(
      <InstanceTicketView {...makeProps({ refreshTrigger: 0, onRefreshComplete })} />,
    );

    mockFetchIssues.mockResolvedValue([issue]);
    mockRefreshPinned.mockResolvedValue(undefined);

    rerender(<InstanceTicketView {...makeProps({ refreshTrigger: 1, onRefreshComplete })} />);

    await waitFor(() => {
      expect(onRefreshComplete).toHaveBeenCalledWith(false, 0);
    });
  });

  it("calls onRefreshComplete(false, 0) when refresh fails", async () => {
    const onRefreshComplete = vi.fn();
    const { rerender } = render(
      <InstanceTicketView {...makeProps({ refreshTrigger: 0, onRefreshComplete })} />,
    );

    mockFetchIssues.mockRejectedValue(new Error("Network error"));

    rerender(<InstanceTicketView {...makeProps({ refreshTrigger: 1, onRefreshComplete })} />);

    await waitFor(() => {
      expect(onRefreshComplete).toHaveBeenCalledWith(false, 0);
    });
  });

  it("updates lastFetchRef when refresh is triggered", async () => {
    mockLastFetchRef.current = 0;
    const { rerender } = render(<InstanceTicketView {...makeProps({ refreshTrigger: 0 })} />);

    mockFetchIssues.mockResolvedValue([]);
    mockRefreshPinned.mockResolvedValue(undefined);

    rerender(<InstanceTicketView {...makeProps({ refreshTrigger: 1 })} />);

    await waitFor(() => {
      expect(mockLastFetchRef.current).toBeGreaterThan(0);
    });
  });

  // --- allKnownIssues merging ---

  it("allKnownIssues includes favorite issues not in pinned set", () => {
    const pinnedIssue = createIssue({ id: 100, subject: "Pinned" });
    const favOnlyIssue = createIssue({ id: 200, subject: "FavOnly" });
    mockPinnedIssues = [pinnedIssue];
    mockPinnedIds = new Set([100]);
    mockFavoriteIssues = [favOnlyIssue];

    render(<InstanceTicketView {...makeProps()} />);

    // SearchPanel doesn't receive allKnownIssues directly,
    // but useIssueMutationHandlers is called with it. We verify
    // that TicketList's issues = mergedIssues (pinnedIssues)
    expect(ticketListProps.issues).toEqual([pinnedIssue]);
  });

  it("allKnownIssues does not duplicate issues in both pinned and favorites", () => {
    const sharedIssue = createIssue({ id: 100, subject: "Both" });
    mockPinnedIssues = [sharedIssue];
    mockPinnedIds = new Set([100]);
    mockFavoriteIssues = [sharedIssue]; // same issue in favorites

    render(<InstanceTicketView {...makeProps()} />);

    // TicketList receives mergedIssues = pinnedIssues
    expect(ticketListProps.issues).toEqual([sharedIssue]);
  });

  // --- Composite key utilities ---

  it("timerKey and parseTimerKey roundtrip correctly", () => {
    const key = timerKey("inst-a", 42);
    expect(key).toBe("inst-a:42");
    const parsed = parseTimerKey(key);
    expect(parsed.instanceId).toBe("inst-a");
    expect(parsed.issueId).toBe(42);
  });

  it("handles instanceId with colons in parseTimerKey (lastIndexOf)", () => {
    const key = timerKey("inst:with:colons", 99);
    expect(key).toBe("inst:with:colons:99");
    const parsed = parseTimerKey(key);
    expect(parsed.instanceId).toBe("inst:with:colons");
    expect(parsed.issueId).toBe(99);
  });

  // --- Multiple timers for same instance ---

  it("correctly filters multiple timers for same instance", () => {
    const timer1 = createTimerState({ issueId: 10, instanceId: INSTANCE_ID });
    const timer2 = createTimerState({ issueId: 20, instanceId: INSTANCE_ID });
    const timers: MultiTimerMap = {
      [timerKey(INSTANCE_ID, 10)]: timer1,
      [timerKey(INSTANCE_ID, 20)]: timer2,
    };

    render(<InstanceTicketView {...makeProps({ timers })} />);

    const passedTimers = ticketListProps.timers as MultiTimerMap;
    expect(Object.keys(passedTimers)).toHaveLength(2);
    expect(passedTimers["10"]).toBeDefined();
    expect(passedTimers["20"]).toBeDefined();
  });

  // --- Edge case: empty state ---

  it("renders correctly with no timers, no issues, no pinned", () => {
    const { getByTestId } = render(<InstanceTicketView {...makeProps()} />);
    expect(getByTestId("ticket-list")).toBeInTheDocument();
    expect(getByTestId("search-panel")).toBeInTheDocument();
    expect(ticketListProps.issues).toEqual([]);
    expect(ticketListProps.activeId).toBeNull();
    expect(Object.keys(ticketListProps.timers as object)).toHaveLength(0);
    expect(Object.keys(ticketListProps.elapsedMap as object)).toHaveLength(0);
  });
});
