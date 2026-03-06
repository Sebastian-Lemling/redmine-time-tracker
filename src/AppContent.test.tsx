import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@/test/test-utils";
import AppContent from "./AppContent";
import type { AppRoute } from "./hooks/useHashRouter";
import type { TimeLogEntry } from "./types/redmine";

vi.mock("./components/tickets", () => ({
  TicketList: () => <div data-testid="ticket-list">TicketList</div>,
  SearchPanel: () => <div data-testid="search-panel">SearchPanel</div>,
}));

vi.mock("./components/timelog", () => ({
  TimeLogSection: () => <div data-testid="timelog-section">TimeLogSection</div>,
  WeekView: (p: { onNavigateToDate: (d: string) => void }) => (
    <div data-testid="week-view">
      <button onClick={() => p.onNavigateToDate("2026-03-05")}>nav</button>
    </div>
  ),
}));

function makeProps(overrides?: Record<string, any>) {
  const defaultRoute: AppRoute = {
    section: "tickets",
    year: 2026,
    month: 2,
    day: undefined,
    tab: "unsynced",
  };
  return {
    activeSection: "tickets" as "tickets" | "timelog" | "overview",
    route: defaultRoute,
    navigate: vi.fn(),
    mergedIssues: [],
    assignedIdSet: new Set<number>(),
    assignedIssues: [],
    issues: [],
    pinnedIds: new Set<number>(),
    pinnedIssues: [],
    recentlyPinned: [],
    onTogglePin: vi.fn(),
    onToggleAssignedPin: vi.fn(),
    timers: {},
    activeId: null,
    elapsedMap: {},
    onPause: vi.fn(),
    onDiscard: vi.fn(),
    onAdjust: vi.fn(),
    loading: false,
    activities: [],
    activitiesByProject: {},
    statuses: [],
    trackers: [],
    trackersByProject: {},
    allowedStatusesByIssue: {},
    membersByProject: {},
    versionsByProject: {},
    redmineUrl: "http://redmine.test",
    issueDescriptions: {},
    issueComments: {},
    issueSubjects: {},
    remoteEntries: [],
    remoteLoading: false,
    onFetchProjectActivities: vi.fn(),
    onFetchProjectTrackers: vi.fn(),
    onFetchAllowedStatuses: vi.fn(),
    onFetchMembers: vi.fn(),
    onFetchVersions: vi.fn(),
    onFetchIssueDescription: vi.fn(),
    onFetchIssues: vi.fn(),
    isRefreshing: false,
    fetchIssueSubject: vi.fn(),
    fetchRemoteEntries: vi.fn(),
    refreshRemoteEntries: vi.fn(),
    onStatusChange: vi.fn(),
    onTrackerChange: vi.fn(),
    onAssigneeChange: vi.fn(),
    onVersionChange: vi.fn(),
    onDoneRatioChange: vi.fn(),
    onPlay: vi.fn(),
    onSave: vi.fn(),
    onOpenBookDialog: vi.fn(),
    onDelete: vi.fn(),
    onUpdateDuration: vi.fn(),
    onUpdateActivity: vi.fn(),
    onSyncEntry: vi.fn(),
    onOpenSyncDialog: vi.fn(),
    onEditEntry: vi.fn(),
    entries: [] as TimeLogEntry[],
    onShowMessage: vi.fn(),
    favoriteIds: new Set<number>(),
    favoriteIssues: [],
    onToggleFavorite: vi.fn(),
    ...overrides,
  };
}

describe("AppContent", () => {
  it("renders TicketList and SearchPanel when section is tickets", () => {
    render(<AppContent {...makeProps({ activeSection: "tickets" })} />);
    expect(screen.getByTestId("ticket-list")).toBeInTheDocument();
    expect(screen.getByTestId("search-panel")).toBeInTheDocument();
    expect(screen.queryByTestId("timelog-section")).not.toBeInTheDocument();
    expect(screen.queryByTestId("week-view")).not.toBeInTheDocument();
  });

  it("renders TimeLogSection when section is timelog", () => {
    render(<AppContent {...makeProps({ activeSection: "timelog" })} />);
    expect(screen.getByTestId("timelog-section")).toBeInTheDocument();
    expect(screen.queryByTestId("ticket-list")).not.toBeInTheDocument();
    expect(screen.queryByTestId("search-panel")).not.toBeInTheDocument();
  });

  it("renders WeekView when section is overview", () => {
    render(<AppContent {...makeProps({ activeSection: "overview" })} />);
    expect(screen.getByTestId("week-view")).toBeInTheDocument();
    expect(screen.queryByTestId("ticket-list")).not.toBeInTheDocument();
    expect(screen.queryByTestId("timelog-section")).not.toBeInTheDocument();
  });

  it("tickets section has flex layout class", () => {
    const { container } = render(<AppContent {...makeProps({ activeSection: "tickets" })} />);
    const main = container.querySelector("main")!;
    expect(main.className).toContain("flex");
  });

  it("timelog section does not have flex class", () => {
    const { container } = render(<AppContent {...makeProps({ activeSection: "timelog" })} />);
    const main = container.querySelector("main")!;
    expect(main.className).not.toMatch(/\sflex\s|flex$/);
  });

  it("overview WeekView onNavigateToDate navigates to timelog with parsed date", () => {
    const navigate = vi.fn();
    render(<AppContent {...makeProps({ activeSection: "overview", navigate })} />);
    screen.getByText("nav").click();
    expect(navigate).toHaveBeenCalledWith({
      section: "timelog",
      year: 2026,
      month: 2,
      day: 5,
    });
  });

  it("wraps each section in ErrorBoundary", () => {
    render(<AppContent {...makeProps({ activeSection: "tickets" })} />);
    expect(screen.getByTestId("ticket-list")).toBeInTheDocument();
  });

  it("renders two panels for tickets section", () => {
    const { container } = render(<AppContent {...makeProps({ activeSection: "tickets" })} />);
    expect(container.querySelector(".ticket-panel--left")).toBeInTheDocument();
    expect(container.querySelector(".ticket-panel--right")).toBeInTheDocument();
  });
});
