import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@/test/test-utils";
import { TicketList } from "./TicketList";
import { createIssue } from "@/test/fixtures";
import type { RedmineIssue } from "@/types/redmine";

// Mock dnd-kit to avoid complex DnD setup in tests
vi.mock("@dnd-kit/core", () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  closestCenter: vi.fn(),
  PointerSensor: vi.fn(),
  useSensor: () => ({}),
  useSensors: () => [],
  DragOverlay: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  MeasuringStrategy: { Always: 0 },
}));

vi.mock("@dnd-kit/sortable", () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  verticalListSortingStrategy: {},
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: undefined,
    isDragging: false,
  }),
  arrayMove: (arr: unknown[], from: number, to: number) => {
    const result = [...arr];
    const [item] = result.splice(from, 1);
    result.splice(to, 0, item);
    return result;
  },
}));

vi.mock("@dnd-kit/utilities", () => ({
  CSS: {
    Transform: {
      toString: () => undefined,
    },
  },
}));

const issueAlpha1 = createIssue({
  id: 101,
  subject: "Alpha Issue 1",
  project: { id: 1, name: "Alpha" },
});
const issueAlpha2 = createIssue({
  id: 102,
  subject: "Alpha Issue 2",
  project: { id: 1, name: "Alpha" },
});
const issueBeta1 = createIssue({
  id: 201,
  subject: "Beta Issue 1",
  project: { id: 2, name: "Beta" },
});

function makeProps(overrides?: Record<string, unknown>) {
  return {
    instanceId: "default",
    issues: [issueAlpha1, issueAlpha2, issueBeta1] as RedmineIssue[],
    timers: {},
    activeId: null,
    elapsedMap: {},
    loading: false,
    statuses: [{ id: 1, name: "New", is_closed: false }],
    trackers: [{ id: 1, name: "Bug" }],
    trackersByProject: {},
    allowedStatusesByIssue: {},
    onFetchProjectTrackers: vi.fn(),
    onFetchAllowedStatuses: vi.fn(),
    membersByProject: {},
    versionsByProject: {},
    onStatusChange: vi.fn(),
    onTrackerChange: vi.fn(),
    onAssigneeChange: vi.fn(),
    onVersionChange: vi.fn(),
    onDoneRatioChange: vi.fn(),
    onFetchMembers: vi.fn(),
    onFetchVersions: vi.fn(),
    onPlay: vi.fn(),
    onPause: vi.fn(),
    onSave: vi.fn(),
    onDiscard: vi.fn(),
    onAdjust: vi.fn(),
    redmineUrl: "http://redmine.test",
    onOpenBookDialog: vi.fn(),
    issueDescriptions: {},
    issueComments: {},
    onFetchIssueDescription: vi.fn(),
    pinnedIds: new Set<number>(),
    onTogglePin: vi.fn(),
    ...overrides,
  };
}

describe("TicketList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("renders project groups for each project", () => {
    render(<TicketList {...makeProps()} />);
    // Project names appear in both filter badges and group headers
    expect(screen.getAllByText("Alpha").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Beta").length).toBeGreaterThanOrEqual(1);
    const groupHeaders = screen.getAllByRole("button", { expanded: true });
    expect(groupHeaders.length).toBeGreaterThanOrEqual(2);
  });

  it("renders all issue subjects", () => {
    render(<TicketList {...makeProps()} />);
    expect(screen.getByText("Alpha Issue 1")).toBeInTheDocument();
    expect(screen.getByText("Alpha Issue 2")).toBeInTheDocument();
    expect(screen.getByText("Beta Issue 1")).toBeInTheDocument();
  });

  it("renders toolbar with search input", () => {
    render(<TicketList {...makeProps()} />);
    expect(screen.getByPlaceholderText(/search|suche.*tickets/i)).toBeInTheDocument();
  });

  it("shows empty state when no issues and not loading", () => {
    render(<TicketList {...makeProps({ issues: [] })} />);
    expect(screen.getByText(/no pinned|keine angepinnten/i)).toBeInTheDocument();
  });

  it("does not show empty state when loading", () => {
    render(<TicketList {...makeProps({ issues: [], loading: true })} />);
    expect(screen.queryByText(/no pinned|keine angepinnten/i)).not.toBeInTheDocument();
  });

  it("filters issues by search query in toolbar", () => {
    render(<TicketList {...makeProps()} />);
    const input = screen.getByPlaceholderText(/search|suche.*tickets/i);
    fireEvent.change(input, { target: { value: "Alpha Issue 1" } });
    expect(screen.getByText("Alpha Issue 1")).toBeInTheDocument();
    expect(screen.queryByText("Beta Issue 1")).not.toBeInTheDocument();
  });

  it("search matches by issue ID", () => {
    render(<TicketList {...makeProps()} />);
    const input = screen.getByPlaceholderText(/search|suche.*tickets/i);
    fireEvent.change(input, { target: { value: "201" } });
    expect(screen.getByText("Beta Issue 1")).toBeInTheDocument();
    expect(screen.queryByText("Alpha Issue 1")).not.toBeInTheDocument();
  });

  it("shows project filter badges when multiple projects exist", () => {
    render(<TicketList {...makeProps()} />);
    const allBadge = screen.getByText(/^all$|^alle$/i);
    expect(allBadge).toBeInTheDocument();
  });

  it("collapse/expand all toggles groups", () => {
    render(<TicketList {...makeProps()} />);
    const collapseBtn = screen.getByTitle(/collapse|einklappen/i);
    fireEvent.click(collapseBtn);
    expect(screen.getByTitle(/expand|ausklappen/i)).toBeInTheDocument();
  });

  it("shows ActiveTimer bar when a timer is active", () => {
    const timers = {
      101: {
        issueId: 101,
        issueSubject: "Alpha Issue 1",
        projectName: "Alpha",
        startTime: new Date().toISOString(),
      },
    };
    render(<TicketList {...makeProps({ timers, activeId: 101, elapsedMap: { 101: 60 } })} />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("does not show ActiveTimer when no timer is active", () => {
    render(<TicketList {...makeProps()} />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("tracked-only filter shows only issues with timers", () => {
    const timers = {
      101: {
        issueId: 101,
        issueSubject: "Alpha Issue 1",
        projectName: "Alpha",
        startTime: new Date().toISOString(),
      },
    };
    render(<TicketList {...makeProps({ timers })} />);
    const trackedBtn = screen.getByTitle(/tracked|getrackt/i);
    fireEvent.click(trackedBtn);
    expect(screen.getByText("Alpha Issue 1")).toBeInTheDocument();
    expect(screen.queryByText("Alpha Issue 2")).not.toBeInTheDocument();
    expect(screen.queryByText("Beta Issue 1")).not.toBeInTheDocument();
  });

  it("collapse then expand all restores groups", () => {
    render(<TicketList {...makeProps()} />);
    const collapseBtn = screen.getByTitle(/collapse|einklappen/i);
    fireEvent.click(collapseBtn);
    expect(screen.getByTitle(/expand|ausklappen/i)).toBeInTheDocument();
    const expandBtn = screen.getByTitle(/expand|ausklappen/i);
    fireEvent.click(expandBtn);
    expect(screen.getByTitle(/collapse|einklappen/i)).toBeInTheDocument();
  });

  it("toggling all projects filter hides/shows projects", () => {
    render(<TicketList {...makeProps()} />);
    const allBadge = screen.getByText(/^all$|^alle$/i);
    fireEvent.click(allBadge);
    fireEvent.click(allBadge);
    expect(screen.getByText("Alpha Issue 1")).toBeInTheDocument();
  });

  it("persists favorites toggle to localStorage", () => {
    const favoriteIds = new Set([101]);
    render(<TicketList {...makeProps({ favoriteIds })} />);
    const favBtn = screen.getByTitle(/favorit/i);
    fireEvent.click(favBtn);
    expect(JSON.parse(localStorage.getItem("show-favorites-group-default")!)).toBe(true);
    fireEvent.click(favBtn);
    expect(JSON.parse(localStorage.getItem("show-favorites-group-default")!)).toBe(false);
  });

  it("favorites mode shows only favorited issues grouped by project", () => {
    localStorage.setItem("show-favorites-group-default", "true");
    const favoriteIds = new Set([101]);
    const favoriteIssues = [issueAlpha1];
    render(<TicketList {...makeProps({ favoriteIds, favoriteIssues })} />);
    expect(screen.getByText("Alpha Issue 1")).toBeInTheDocument();
    expect(screen.queryByText("Alpha Issue 2")).not.toBeInTheDocument();
    expect(screen.queryByText("Beta Issue 1")).not.toBeInTheDocument();
  });

  it("search by project name filters correctly", () => {
    render(<TicketList {...makeProps()} />);
    const input = screen.getByPlaceholderText(/search|suche.*tickets/i);
    fireEvent.change(input, { target: { value: "Beta" } });
    expect(screen.getByText("Beta Issue 1")).toBeInTheDocument();
    expect(screen.queryByText("Alpha Issue 1")).not.toBeInTheDocument();
  });

  it("collapse single project group only collapses that group", () => {
    render(<TicketList {...makeProps()} />);
    const expandedButtons = screen.getAllByRole("button", { expanded: true });
    const alphaButton = expandedButtons.find((btn) => btn.textContent?.includes("Alpha"))!;
    const betaButton = expandedButtons.find((btn) => btn.textContent?.includes("Beta"))!;
    fireEvent.click(alphaButton);
    expect(alphaButton).toHaveAttribute("aria-expanded", "false");
    expect(betaButton).toHaveAttribute("aria-expanded", "true");
  });

  it("favorites mode shows empty state when no issues are favorited", () => {
    localStorage.setItem("show-favorites-group-default", "true");
    const favoriteIds = new Set([9999]);
    render(<TicketList {...makeProps({ favoriteIds })} />);
    expect(screen.getByText(/keine favoriten|no favorite/i)).toBeInTheDocument();
    expect(screen.getByText(/markiere ein ticket|star a ticket/i)).toBeInTheDocument();
  });

  it("favorites mode with search shows no-results instead of no-favorites", () => {
    localStorage.setItem("show-favorites-group-default", "true");
    const favoriteIds = new Set([101]);
    render(<TicketList {...makeProps({ favoriteIds })} />);
    const input = screen.getByPlaceholderText(/search|suche.*tickets/i);
    fireEvent.change(input, { target: { value: "nonexistent" } });
    expect(screen.getByText(/keine issues|no issues/i)).toBeInTheDocument();
    expect(screen.queryByText(/markiere ein ticket|star a ticket/i)).not.toBeInTheDocument();
  });

  it("favorites mode disables pin toggle on cards", () => {
    localStorage.setItem("show-favorites-group-default", "true");
    const favoriteIds = new Set([101]);
    const onTogglePin = vi.fn();
    render(<TicketList {...makeProps({ favoriteIds, onTogglePin })} />);
    expect(screen.queryByLabelText(/pin|anpinnen/i)).not.toBeInTheDocument();
  });
});
