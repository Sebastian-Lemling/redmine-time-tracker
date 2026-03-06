import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@/test/test-utils";
import { TicketCardHeader } from "./TicketCardHeader";
import type { RedmineIssue } from "@/types/redmine";

function makeIssue(overrides?: Partial<RedmineIssue>): RedmineIssue {
  return {
    id: 42,
    subject: "Fix login",
    project: { id: 1, name: "WebApp" },
    tracker: { id: 1, name: "Bug" },
    status: { id: 1, name: "New" },
    priority: { id: 2, name: "Normal" },
    done_ratio: 30,
    updated_on: "2025-01-01T00:00:00Z",
    ...overrides,
  } as RedmineIssue;
}

function makeProps(overrides?: Record<string, unknown>) {
  return {
    issue: makeIssue(),
    redmineUrl: "http://redmine.test",
    trackers: [
      { id: 1, name: "Bug" },
      { id: 2, name: "Feature" },
    ],
    statuses: [
      { id: 1, name: "New", is_closed: false },
      { id: 2, name: "In Progress", is_closed: false },
    ],
    allowedStatuses: undefined as any,
    projectVersions: [] as any[],
    projectMembers: [] as any[],
    onTrackerChange: vi.fn(),
    onStatusChange: vi.fn(),
    onVersionChange: vi.fn(),
    onDoneRatioChange: vi.fn(),
    onAssigneeChange: vi.fn(),
    onFetchAllowedStatuses: vi.fn(),
    onFetchMembers: vi.fn(),
    projectColor: "#ff0000",
    isPinned: false,
    onTogglePin: vi.fn(),
    ...overrides,
  };
}

describe("TicketCardHeader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders issue ID with link to Redmine", () => {
    render(<TicketCardHeader {...makeProps()} />);
    const link = screen.getByTitle("Open #42 in Redmine");
    expect(link).toHaveAttribute("href", "http://redmine.test/issues/42");
    expect(link.textContent).toBe("#42");
  });

  it("renders ID as plain text when no redmineUrl", () => {
    render(<TicketCardHeader {...makeProps({ redmineUrl: "" })} />);
    expect(screen.queryByTitle("Open #42 in Redmine")).not.toBeInTheDocument();
    expect(screen.getByText("#42")).toBeInTheDocument();
  });

  it("copy button copies ID to clipboard", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    render(<TicketCardHeader {...makeProps()} />);
    const copyBtn = screen.getByLabelText("Copy #42 to clipboard");
    fireEvent.click(copyBtn);
    expect(writeText).toHaveBeenCalledWith("#42");
  });

  it("renders tracker chip with current tracker name", () => {
    render(<TicketCardHeader {...makeProps()} />);
    expect(screen.getByText("Bug")).toBeInTheDocument();
  });

  it("renders status chip with current status name", () => {
    render(<TicketCardHeader {...makeProps()} />);
    expect(screen.getByText("New")).toBeInTheDocument();
  });

  it("renders done ratio as chip", () => {
    render(<TicketCardHeader {...makeProps()} />);
    expect(screen.getByText("30%")).toBeInTheDocument();
  });

  it("shows pin button with active style when isPinned=true", () => {
    render(<TicketCardHeader {...makeProps({ isPinned: true })} />);
    const btn = screen.getByLabelText(/unpin|lösen/i);
    expect(btn).toBeInTheDocument();
    expect(btn).not.toHaveClass("card-header__pin-btn--ghost");
  });

  it("shows pin button with ghost style when isPinned=false", () => {
    render(<TicketCardHeader {...makeProps({ isPinned: false })} />);
    const btn = screen.getByLabelText(/pin|anpinnen/i);
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveClass("card-header__pin-btn--ghost");
  });

  it("hides pin button when no onTogglePin provided", () => {
    render(<TicketCardHeader {...makeProps({ onTogglePin: undefined })} />);
    expect(screen.queryByLabelText(/pin|anpinnen|unpin|lösen/i)).not.toBeInTheDocument();
  });

  it("renders version chip when projectVersions provided", () => {
    const versions = [{ id: 10, name: "v1.0" }];
    const issue = makeIssue({ fixed_version: { id: 10, name: "v1.0" } } as any);
    render(<TicketCardHeader {...makeProps({ issue, projectVersions: versions })} />);
    expect(screen.getByText("v1.0")).toBeInTheDocument();
  });

  it("renders 'no version' when versions exist but issue has no fixed_version", () => {
    const versions = [{ id: 10, name: "v1.0" }];
    render(<TicketCardHeader {...makeProps({ projectVersions: versions })} />);
    expect(screen.getByText(/no version|keine version/i)).toBeInTheDocument();
  });

  it("hides version chip when no versions and no fixed_version", () => {
    render(<TicketCardHeader {...makeProps({ projectVersions: [] })} />);
    expect(screen.queryByText(/no version|keine version/i)).not.toBeInTheDocument();
  });

  it("shows version chip when issue has fixed_version even if versions array is empty", () => {
    const issue = makeIssue({ fixed_version: { id: 10, name: "Sprint 1" } } as any);
    render(<TicketCardHeader {...makeProps({ issue, projectVersions: [] })} />);
    expect(screen.getByText("Sprint 1")).toBeInTheDocument();
  });

  it("clicking pin button calls onTogglePin with issue", () => {
    const onTogglePin = vi.fn();
    render(<TicketCardHeader {...makeProps({ onTogglePin })} />);
    const pinBtn = screen.getByLabelText(/pin|anpinnen/i);
    fireEvent.click(pinBtn);
    expect(onTogglePin).toHaveBeenCalledWith(makeIssue());
  });

  it("pin button shows filled stroke ring when isPinned=true", () => {
    const { container } = render(<TicketCardHeader {...makeProps({ isPinned: true })} />);
    const circles = container.querySelectorAll(".card-header__pin-ring circle");
    expect(circles.length).toBe(2);
  });

  it("pin button shows only track ring when isPinned=false", () => {
    const { container } = render(<TicketCardHeader {...makeProps({ isPinned: false })} />);
    const circles = container.querySelectorAll(".card-header__pin-ring circle");
    expect(circles.length).toBe(1);
  });

  it("copy button shows check icon after successful copy", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    render(<TicketCardHeader {...makeProps()} />);
    const copyBtn = screen.getByLabelText("Copy #42 to clipboard");
    fireEvent.click(copyBtn);

    // Wait for the async clipboard call to resolve and state to update
    await waitFor(() => {
      expect(copyBtn.title).toMatch(/copied|kopiert/i);
    });
  });

  it("handles clipboard write failure gracefully", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("Permission denied"));
    Object.assign(navigator, { clipboard: { writeText } });

    render(<TicketCardHeader {...makeProps()} />);
    const copyBtn = screen.getByLabelText("Copy #42 to clipboard");
    fireEvent.click(copyBtn);
    await vi.waitFor(() => expect(writeText).toHaveBeenCalled());
  });

  it("renders done ratio chip from issue", () => {
    const issue = makeIssue({ done_ratio: 70 });
    render(<TicketCardHeader {...makeProps({ issue })} />);
    expect(screen.getByText("70%")).toBeInTheDocument();
  });

  it("defaults done_ratio to 0 when undefined", () => {
    const issue = makeIssue({ done_ratio: undefined } as any);
    render(<TicketCardHeader {...makeProps({ issue })} />);
    expect(screen.getByText("0%")).toBeInTheDocument();
  });

  it("uses allowedStatuses for status chip when provided", () => {
    const allowedStatuses = [
      { id: 2, name: "In Progress", is_closed: false },
      { id: 3, name: "Resolved", is_closed: true },
    ];
    render(<TicketCardHeader {...makeProps({ allowedStatuses })} />);
    expect(screen.getByText("New")).toBeInTheDocument();
  });

  it("project color dot uses provided color", () => {
    const { container } = render(<TicketCardHeader {...makeProps({ projectColor: "#ff00ff" })} />);
    const dot = container.querySelector(".card-header__badge-dot") as HTMLElement;
    expect(dot.style.background).toBe("rgb(255, 0, 255)");
  });

  it("link opens in new tab", () => {
    render(<TicketCardHeader {...makeProps()} />);
    const link = screen.getByTitle("Open #42 in Redmine");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("clicking status chip calls onFetchAllowedStatuses", () => {
    const onFetchAllowedStatuses = vi.fn();
    render(<TicketCardHeader {...makeProps({ onFetchAllowedStatuses })} />);
    const statusBtn = screen.getByText("New").closest("button")!;
    fireEvent.click(statusBtn);
    expect(onFetchAllowedStatuses).toHaveBeenCalledWith(42);
  });

  it("selecting a version calls onVersionChange", () => {
    const onVersionChange = vi.fn();
    const versions = [
      { id: 10, name: "v1.0" },
      { id: 20, name: "v2.0" },
    ];
    const issue = makeIssue({ fixed_version: { id: 10, name: "v1.0" } } as any);
    render(
      <TicketCardHeader {...makeProps({ issue, projectVersions: versions, onVersionChange })} />,
    );
    const versionBtn = screen.getByText("v1.0").closest("button")!;
    fireEvent.click(versionBtn);
    const option = screen.getByText("v2.0");
    fireEvent.click(option);
    expect(onVersionChange).toHaveBeenCalledWith(42, 20);
  });

  it("renders assignee chip with correct name", () => {
    const onFetchMembers = vi.fn();
    const onAssigneeChange = vi.fn();
    const issue = makeIssue({
      assigned_to: { id: 5, name: "Alice" },
    } as any);
    const members = [
      { id: 5, name: "Alice" },
      { id: 6, name: "Bob" },
    ];
    render(
      <TicketCardHeader
        {...makeProps({ issue, projectMembers: members, onFetchMembers, onAssigneeChange })}
      />,
    );
    expect(screen.getByText("Alice")).toBeInTheDocument();
  });

  it("selecting a status calls onStatusChange", () => {
    const onStatusChange = vi.fn();
    render(<TicketCardHeader {...makeProps({ onStatusChange })} />);
    const statusBtn = screen.getByText("New").closest("button")!;
    fireEvent.click(statusBtn);
    const option = screen.getByText("In Progress");
    fireEvent.click(option);
    expect(onStatusChange).toHaveBeenCalledWith(42, 2);
  });

  it("selecting a tracker calls onTrackerChange", () => {
    const onTrackerChange = vi.fn();
    render(<TicketCardHeader {...makeProps({ onTrackerChange })} />);
    const trackerBtn = screen.getByText("Bug").closest("button")!;
    fireEvent.click(trackerBtn);
    const option = screen.getByText("Feature");
    fireEvent.click(option);
    expect(onTrackerChange).toHaveBeenCalledWith(42, 2);
  });

  it("selecting a done ratio calls onDoneRatioChange via chip", () => {
    const onDoneRatioChange = vi.fn();
    render(<TicketCardHeader {...makeProps({ onDoneRatioChange })} />);
    const progressBtn = screen.getByText("30%").closest("button")!;
    fireEvent.click(progressBtn);
    fireEvent.click(screen.getByText("50%"));
    expect(onDoneRatioChange).toHaveBeenCalledWith(42, 50);
  });

  it("star button always renders SVG ring", () => {
    const { container } = render(
      <TicketCardHeader {...makeProps({ onToggleFavorite: vi.fn(), isFavorite: false })} />,
    );
    expect(container.querySelector(".card-header__star-ring")).toBeInTheDocument();
  });

  it("star button ring present for both favorite states", () => {
    const { container: c1 } = render(
      <TicketCardHeader {...makeProps({ onToggleFavorite: vi.fn(), isFavorite: true })} />,
    );
    const { container: c2 } = render(
      <TicketCardHeader {...makeProps({ onToggleFavorite: vi.fn(), isFavorite: false })} />,
    );
    expect(c1.querySelector(".card-header__star-ring")).toBeInTheDocument();
    expect(c2.querySelector(".card-header__star-ring")).toBeInTheDocument();
  });

  it("clicking star button calls onToggleFavorite", () => {
    const onToggleFavorite = vi.fn();
    render(<TicketCardHeader {...makeProps({ onToggleFavorite, isFavorite: false })} />);
    const starBtn = screen.getByLabelText(/favorit/i);
    fireEvent.click(starBtn);
    expect(onToggleFavorite).toHaveBeenCalledWith(makeIssue());
  });

  it("star button has filled class when isFavorite=true", () => {
    const { container } = render(
      <TicketCardHeader {...makeProps({ onToggleFavorite: vi.fn(), isFavorite: true })} />,
    );
    expect(container.querySelector(".card-header__star-btn--filled")).toBeInTheDocument();
  });

  it("star button has ghost class when isFavorite=false", () => {
    const { container } = render(
      <TicketCardHeader {...makeProps({ onToggleFavorite: vi.fn(), isFavorite: false })} />,
    );
    expect(container.querySelector(".card-header__star-btn--ghost")).toBeInTheDocument();
  });

  it("selecting an assignee calls onAssigneeChange via ChipMenu", () => {
    const onAssigneeChange = vi.fn();
    const onFetchMembers = vi.fn();
    const issue = makeIssue({
      assigned_to: { id: 5, name: "Alice" },
    } as any);
    const members = [
      { id: 5, name: "Alice" },
      { id: 6, name: "Bob" },
    ];
    render(
      <TicketCardHeader
        {...makeProps({ issue, projectMembers: members, onAssigneeChange, onFetchMembers })}
      />,
    );
    const assigneeBtn = screen.getByText("Alice").closest("button")!;
    fireEvent.click(assigneeBtn);
    const bobOption = screen.getByText("Bob");
    fireEvent.click(bobOption);
    expect(onAssigneeChange).toHaveBeenCalledWith(42, 6);
  });

  it("current status NOT in allowedStatuses still visible in dropdown", () => {
    const allowedStatuses = [
      { id: 2, name: "In Progress", is_closed: false },
      { id: 3, name: "Resolved", is_closed: true },
    ];
    render(<TicketCardHeader {...makeProps({ allowedStatuses })} />);
    const statusBtn = screen.getByText("New").closest("button")!;
    fireEvent.click(statusBtn);
    expect(screen.getAllByText("New").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("In Progress")).toBeInTheDocument();
    expect(screen.getByText("Resolved")).toBeInTheDocument();
  });

  it("star button hidden when onToggleFavorite undefined", () => {
    const { container } = render(
      <TicketCardHeader {...makeProps({ onToggleFavorite: undefined })} />,
    );
    expect(container.querySelector(".card-header__star-btn")).not.toBeInTheDocument();
  });

  it("assignee dropdown is searchable", () => {
    const members = [
      { id: 5, name: "Alice" },
      { id: 6, name: "Bob" },
    ];
    render(<TicketCardHeader {...makeProps({ projectMembers: members })} />);
    const assigneeBtn = screen.getByText(/unassigned|nicht zugewiesen/i).closest("button")!;
    fireEvent.click(assigneeBtn);
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });
});
