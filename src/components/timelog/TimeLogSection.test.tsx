import { describe, it, expect, vi } from "vitest";
import { render as baseRender, screen } from "@/test/test-utils";
import { TimeLogSection } from "@/components/timelog/TimeLogSection";
import { AppProvider } from "@/AppContext";
import type { AppContextValue } from "@/AppContext";
import type { TimeLogEntry } from "@/types/redmine";

const defaultCtx: AppContextValue = {
  user: { id: 1, login: "test", firstname: "T", lastname: "U", mail: "t@t.com" },
  redmineUrl: "http://redmine.test",
  route: { section: "timelog" },
  navigate: () => {},
  todayMinutes: 0,
  weekMinutes: 0,
  unsyncedCount: 0,
  themeMode: "light",
  setThemeMode: () => {},
  loading: false,
  isRefreshing: false,
  onRefresh: () => {},
  instances: [{ id: "default", name: "Redmine", url: "", order: 0 }],
  activeInstanceId: "default",
  instanceColorMap: { default: "#1a73e8" },
};

function render(ui: React.ReactElement) {
  return baseRender(<AppProvider value={defaultCtx}>{ui}</AppProvider>);
}

const entry: TimeLogEntry = {
  id: "e1",
  issueId: 42,
  issueSubject: "Fix login bug",
  projectId: 1,
  projectName: "Main Project",
  startTime: "2026-03-01T10:00:00Z",
  endTime: "2026-03-01T11:00:00Z",
  duration: 60,
  description: "Worked on fix",
  date: "2026-03-01",
  syncedToRedmine: false,
  instanceId: "default",
};

const baseProps = {
  route: { section: "timelog" as const },
  navigate: vi.fn(),
  entries: [] as TimeLogEntry[],
  activities: [],
  activitiesByProject: {},
  onFetchProjectActivities: vi.fn(),
  onSyncEntry: vi.fn(),
  onOpenSyncDialog: vi.fn(),
  onEdit: vi.fn(),
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
  redmineUrl: "https://redmine.example.com",
};

describe("TimeLogSection", () => {
  it("renders MonthView even with no local entries", () => {
    render(<TimeLogSection {...baseProps} />);
    expect(screen.queryByText("No entries yet")).not.toBeInTheDocument();
  });

  it("fetches remote entries on mount even without local entries", () => {
    const fetchRemoteEntries = vi.fn();
    render(<TimeLogSection {...baseProps} fetchRemoteEntries={fetchRemoteEntries} />);
    expect(fetchRemoteEntries).toHaveBeenCalled();
  });

  it("renders MonthView when entries exist", () => {
    render(<TimeLogSection {...baseProps} entries={[entry]} />);
    expect(screen.queryByText("No entries yet")).not.toBeInTheDocument();
  });
});
