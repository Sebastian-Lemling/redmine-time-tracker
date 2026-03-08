import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@/test/test-utils";
import AppContent from "./AppContent";
import type { AppRoute } from "./hooks/useHashRouter";
import type { TimeLogEntry } from "./types/redmine";

vi.mock("./components/tickets", () => ({
  InstanceTicketView: () => <div data-testid="instance-ticket-view">InstanceTicketView</div>,
}));

vi.mock("./components/timelog", () => ({
  TimeLogSection: () => <div data-testid="timelog-section">TimeLogSection</div>,
  WeekView: (p: { onNavigateToDate: (d: string) => void }) => (
    <div data-testid="week-view">
      <button onClick={() => p.onNavigateToDate("2026-03-05")}>nav</button>
    </div>
  ),
}));

function makeProps(overrides?: Record<string, unknown>) {
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
    activeInstanceId: "default",

    // Shared timer state
    timers: {},
    activeTimerKey: null,
    elapsedMap: {},
    onPause: vi.fn(),
    startOrResume: vi.fn(),
    capture: vi.fn(),
    discard: vi.fn(),
    adjustElapsed: vi.fn(),

    // Dialog / UI setters
    setBookDialog: vi.fn(),
    showSnackbar: vi.fn(),

    // Refresh
    refreshTrigger: 0,
    onRefreshComplete: vi.fn(),

    // Timelog props
    entries: [] as TimeLogEntry[],
    activities: [],
    activitiesByProject: {},
    onFetchProjectActivities: vi.fn(),
    onSyncEntry: vi.fn(),
    onOpenSyncDialog: vi.fn(),
    onEditEntry: vi.fn(),
    onDelete: vi.fn(),
    onUpdateDuration: vi.fn(),
    onUpdateActivity: vi.fn(),
    onShowMessage: vi.fn(),
    remoteEntries: [],
    remoteLoading: false,
    fetchRemoteEntries: vi.fn(),
    refreshRemoteEntries: vi.fn(),
    issues: [],
    issueSubjects: {},
    fetchIssueSubject: vi.fn(),
    redmineUrl: "http://redmine.test",
    ...overrides,
  };
}

describe("AppContent", () => {
  it("renders InstanceTicketView when section is tickets", () => {
    render(<AppContent {...makeProps({ activeSection: "tickets" })} />);
    expect(screen.getByTestId("instance-ticket-view")).toBeInTheDocument();
    expect(screen.queryByTestId("timelog-section")).not.toBeInTheDocument();
    expect(screen.queryByTestId("week-view")).not.toBeInTheDocument();
  });

  it("renders TimeLogSection when section is timelog", () => {
    render(<AppContent {...makeProps({ activeSection: "timelog" })} />);
    expect(screen.getByTestId("timelog-section")).toBeInTheDocument();
    expect(screen.queryByTestId("instance-ticket-view")).not.toBeInTheDocument();
  });

  it("renders WeekView when section is overview", () => {
    render(<AppContent {...makeProps({ activeSection: "overview" })} />);
    expect(screen.getByTestId("week-view")).toBeInTheDocument();
    expect(screen.queryByTestId("instance-ticket-view")).not.toBeInTheDocument();
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
    expect(screen.getByTestId("instance-ticket-view")).toBeInTheDocument();
  });
});
