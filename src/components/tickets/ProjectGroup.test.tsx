import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@/test/test-utils";
import { PlainProjectGroup, SortableProjectGroup } from "./ProjectGroup";
import type { GroupProps } from "./ProjectGroup";
import { createIssue } from "@/test/fixtures";
import type { RedmineIssue } from "@/types/redmine";

// Mock @dnd-kit/sortable for SortableProjectGroup
vi.mock("@dnd-kit/sortable", () => ({
  useSortable: () => ({
    attributes: { "data-testid": "sortable" },
    listeners: { onPointerDown: vi.fn() },
    setNodeRef: vi.fn(),
    transform: null,
    transition: undefined,
    isDragging: false,
  }),
}));

vi.mock("@dnd-kit/utilities", () => ({
  CSS: {
    Transform: {
      toString: (t: unknown) => (t ? "translate(0px, 0px)" : undefined),
    },
  },
}));

const issue1 = createIssue({ id: 101, subject: "First Issue", project: { id: 1, name: "Alpha" } });
const issue2 = createIssue({ id: 102, subject: "Second Issue", project: { id: 1, name: "Alpha" } });

function makeGroupProps(overrides?: Partial<GroupProps>): GroupProps {
  return {
    name: "Alpha",
    index: 0,
    colorMap: { Alpha: "#1a73e8" },
    grouped: { Alpha: [issue1, issue2] },
    searchFiltered: {},
    searchQuery: "",
    collapsed: {},
    toggle: vi.fn(),
    timers: {},
    activeTimerId: null,
    elapsedMap: {},
    statuses: [{ id: 1, name: "New", is_closed: false }],
    trackers: [{ id: 1, name: "Bug" }],
    trackersByProject: {},
    allowedStatusesByIssue: {},
    onFetchProjectTrackers: vi.fn(),
    onFetchAllowedStatuses: vi.fn(),
    membersByProject: {},
    versionsByProject: {},
    redmineUrl: "http://redmine.test",
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
    onOpenBookDialog: vi.fn(),
    issueDescriptions: {},
    issueComments: {},
    onFetchIssueDescription: vi.fn(),
    pinnedIds: new Set<number>(),
    onTogglePin: vi.fn(),
    ...overrides,
  };
}

describe("PlainProjectGroup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders group header with project name", () => {
    render(<PlainProjectGroup {...makeGroupProps()} />);
    expect(screen.getByText("Alpha")).toBeInTheDocument();
  });

  it("renders issue count in header", () => {
    render(<PlainProjectGroup {...makeGroupProps()} />);
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("renders all issue cards when not collapsed", () => {
    render(<PlainProjectGroup {...makeGroupProps()} />);
    expect(screen.getByText("First Issue")).toBeInTheDocument();
    expect(screen.getByText("Second Issue")).toBeInTheDocument();
  });

  it("clicking header calls toggle with project name", () => {
    const toggle = vi.fn();
    render(<PlainProjectGroup {...makeGroupProps({ toggle })} />);
    fireEvent.click(screen.getByRole("button", { expanded: true }));
    expect(toggle).toHaveBeenCalledWith("Alpha");
  });

  it("collapsed state hides cards via maxHeight=0", () => {
    const { container } = render(
      <PlainProjectGroup {...makeGroupProps({ collapsed: { Alpha: true } })} />,
    );
    const content = container.querySelector(".ticket-group__content") as HTMLElement;
    expect(content.style.maxHeight).toBe("0px");
    expect(content.style.opacity).toBe("0");
  });

  it("expanded state shows cards via maxHeight=5000px", () => {
    const { container } = render(<PlainProjectGroup {...makeGroupProps()} />);
    const content = container.querySelector(".ticket-group__content") as HTMLElement;
    expect(content.style.maxHeight).toBe("5000px");
    expect(content.style.opacity).toBe("1");
  });

  it("uses searchFiltered issues when searchQuery is set", () => {
    const filtered: RedmineIssue[] = [issue1];
    render(
      <PlainProjectGroup
        {...makeGroupProps({
          searchQuery: "First",
          searchFiltered: { Alpha: filtered },
        })}
      />,
    );
    expect(screen.getByText("First Issue")).toBeInTheDocument();
    expect(screen.queryByText("Second Issue")).not.toBeInTheDocument();
  });

  it("shows empty when searchFiltered has no results for this group", () => {
    render(
      <PlainProjectGroup
        {...makeGroupProps({
          searchQuery: "xyz",
          searchFiltered: {},
        })}
      />,
    );
    expect(screen.queryByText("First Issue")).not.toBeInTheDocument();
    expect(screen.queryByText("Second Issue")).not.toBeInTheDocument();
  });

  it("applies animation delay based on index", () => {
    const { container } = render(<PlainProjectGroup {...makeGroupProps({ index: 3 })} />);
    const group = container.querySelector(".ticket-group") as HTMLElement;
    expect(group.style.animationDelay).toBe("150ms");
  });

  it("determines timer status correctly for issues", () => {
    render(
      <PlainProjectGroup
        {...makeGroupProps({
          timers: {
            101: {
              issueId: 101,
              issueSubject: "First Issue",
              projectName: "Alpha",
              startTime: new Date().toISOString(),
              instanceId: "default",
            },
            102: {
              issueId: 102,
              issueSubject: "Second Issue",
              projectName: "Alpha",
              startTime: new Date().toISOString(),
              instanceId: "default",
            },
          },
          activeTimerId: 101,
        })}
      />,
    );
    expect(screen.getByLabelText("Pause timer")).toBeInTheDocument();
    expect(screen.getByLabelText(/resume timer/i)).toBeInTheDocument();
  });
});

describe("SortableProjectGroup", () => {
  it("renders with sortable wrapper", () => {
    render(<SortableProjectGroup {...makeGroupProps()} />);
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("First Issue")).toBeInTheDocument();
  });

  it("applies animation delay based on index", () => {
    const { container } = render(<SortableProjectGroup {...makeGroupProps({ index: 2 })} />);
    const group = container.querySelector(".ticket-group") as HTMLElement;
    expect(group.style.animationDelay).toBe("100ms");
  });
});
