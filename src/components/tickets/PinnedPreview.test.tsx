import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@/test/test-utils";
import { PinnedPreview } from "./PinnedPreview";
import type { RedmineIssue } from "@/types/redmine";

function makeIssue(id: number, projectName: string): RedmineIssue {
  return {
    id,
    subject: `Issue ${id}`,
    project: { id: 1, name: projectName },
    tracker: { id: 1, name: "Bug" },
    status: { id: 1, name: "New" },
    priority: { id: 2, name: "Normal" },
    done_ratio: 0,
    updated_on: "2025-01-01T00:00:00Z",
  } as RedmineIssue;
}

const defaultProps = {
  pinnedIssues: [] as RedmineIssue[],
  recentlyPinned: [] as RedmineIssue[],
  assignedIssues: [] as RedmineIssue[],
  pinnedIds: new Set<number>(),
  assignedIds: new Set<number>(),
  redmineUrl: "http://redmine.test",
  onTogglePin: vi.fn(),
  onToggleAssignedPin: vi.fn(),
  favoriteIssues: [] as RedmineIssue[],
  favoriteIds: new Set<number>(),
  onToggleFavorite: vi.fn(),
  onOpenBookDialog: vi.fn(),
};

describe("PinnedPreview", () => {
  it("returns null when no pinned, recent, or assigned issues", () => {
    const { container } = render(<PinnedPreview {...defaultProps} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders pinned issues grouped by project", () => {
    const issues = [makeIssue(1, "Alpha"), makeIssue(2, "Alpha"), makeIssue(3, "Beta")];
    render(
      <PinnedPreview {...defaultProps} pinnedIssues={issues} pinnedIds={new Set([1, 2, 3])} />,
    );
    expect(screen.getAllByText("Alpha").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Beta").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("#1")).toBeInTheDocument();
    expect(screen.getByText("#3")).toBeInTheDocument();
  });

  it("shows pinned count badge", () => {
    const issues = [makeIssue(1, "Alpha")];
    render(<PinnedPreview {...defaultProps} pinnedIssues={issues} pinnedIds={new Set([1])} />);
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("switches between pinned and recent tabs", () => {
    const pinned = [makeIssue(1, "Alpha")];
    const recent = [makeIssue(2, "Beta")];
    render(
      <PinnedPreview
        {...defaultProps}
        pinnedIssues={pinned}
        pinnedIds={new Set([1])}
        recentlyPinned={recent}
      />,
    );

    expect(screen.getByText("#1")).toBeInTheDocument();

    fireEvent.click(screen.getByText(/zuletzt|recent/i));
    expect(screen.getByText("#2")).toBeInTheDocument();
  });

  it("excludes already-pinned issues from recent tab", () => {
    const pinned = [makeIssue(1, "Alpha")];
    const recent = [makeIssue(1, "Alpha"), makeIssue(2, "Beta")];
    render(
      <PinnedPreview
        {...defaultProps}
        pinnedIssues={pinned}
        pinnedIds={new Set([1])}
        recentlyPinned={recent}
      />,
    );

    fireEvent.click(screen.getByText(/zuletzt|recent/i));
    expect(screen.getByText("#2")).toBeInTheDocument();
  });

  it("shows empty state when pinned tab selected but no pinned issues", () => {
    const recent = [makeIssue(2, "Beta")];
    render(<PinnedPreview {...defaultProps} recentlyPinned={recent} />);
    expect(screen.getByText(/keine issues|no issues/i)).toBeInTheDocument();
  });

  it("renders when only assignedIssues are provided", () => {
    const assigned = [makeIssue(10, "Gamma")];
    const { container } = render(<PinnedPreview {...defaultProps} assignedIssues={assigned} />);
    expect(container.innerHTML).not.toBe("");
  });

  it("shows 'My Tickets' tab with assigned issues", () => {
    const assigned = [makeIssue(10, "Gamma"), makeIssue(11, "Delta")];
    render(
      <PinnedPreview {...defaultProps} assignedIssues={assigned} assignedIds={new Set([10, 11])} />,
    );

    fireEvent.click(screen.getByText(/eigene tickets|my tickets/i));
    expect(screen.getByText("#10")).toBeInTheDocument();
    expect(screen.getByText("#11")).toBeInTheDocument();
  });

  it("shows assigned count badge on My Tickets tab", () => {
    const assigned = [makeIssue(10, "Gamma"), makeIssue(11, "Delta")];
    render(
      <PinnedPreview {...defaultProps} assignedIssues={assigned} assignedIds={new Set([10, 11])} />,
    );

    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("shows pin state for assigned issues in My Tickets tab", () => {
    const assigned = [makeIssue(10, "Gamma")];
    render(
      <PinnedPreview
        {...defaultProps}
        assignedIssues={assigned}
        assignedIds={new Set([10])}
        pinnedIds={new Set([10])}
      />,
    );

    fireEvent.click(screen.getByText(/eigene tickets|my tickets/i));
    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).toBeChecked();
  });

  it("My Tickets tab calls onToggleAssignedPin, not onTogglePin", () => {
    const onTogglePin = vi.fn();
    const onToggleAssignedPin = vi.fn();
    const assigned = [makeIssue(10, "Gamma")];
    render(
      <PinnedPreview
        {...defaultProps}
        assignedIssues={assigned}
        assignedIds={new Set([10])}
        pinnedIds={new Set([10])}
        onTogglePin={onTogglePin}
        onToggleAssignedPin={onToggleAssignedPin}
      />,
    );

    fireEvent.click(screen.getByText(/eigene tickets|my tickets/i));
    const checkbox = screen.getByRole("checkbox");
    fireEvent.click(checkbox);

    expect(onToggleAssignedPin).toHaveBeenCalledTimes(1);
    expect(onTogglePin).not.toHaveBeenCalled();
  });

  it("book button calls onOpenBookDialog in pinned tab", () => {
    const onOpenBookDialog = vi.fn();
    const issues = [makeIssue(1, "Alpha")];
    render(
      <PinnedPreview
        {...defaultProps}
        pinnedIssues={issues}
        pinnedIds={new Set([1])}
        onOpenBookDialog={onOpenBookDialog}
      />,
    );
    const bookBtns = screen.getAllByLabelText(/manuell buchen|book manually/i);
    fireEvent.click(bookBtns[0]);
    expect(onOpenBookDialog).toHaveBeenCalledWith(issues[0]);
  });

  it("book button calls onOpenBookDialog in favorites tab", () => {
    const onOpenBookDialog = vi.fn();
    const favs = [makeIssue(5, "Gamma")];
    render(
      <PinnedPreview
        {...defaultProps}
        favoriteIssues={favs}
        favoriteIds={new Set([5])}
        onOpenBookDialog={onOpenBookDialog}
      />,
    );
    fireEvent.click(screen.getByText(/favorit/i));
    const bookBtns = screen.getAllByLabelText(/manuell buchen|book manually/i);
    fireEvent.click(bookBtns[0]);
    expect(onOpenBookDialog).toHaveBeenCalledWith(favs[0]);
  });

  it("favorites tab renders favorite issues grouped by project", () => {
    const favs = [makeIssue(5, "Gamma"), makeIssue(6, "Gamma")];
    render(<PinnedPreview {...defaultProps} favoriteIssues={favs} favoriteIds={new Set([5, 6])} />);
    fireEvent.click(screen.getByText(/favorit/i));
    expect(screen.getAllByText("Gamma").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("#5")).toBeInTheDocument();
    expect(screen.getByText("#6")).toBeInTheDocument();
  });

  it("empty favorites tab shows empty state message", () => {
    const pinned = [makeIssue(1, "Alpha")];
    render(
      <PinnedPreview
        {...defaultProps}
        pinnedIssues={pinned}
        pinnedIds={new Set([1])}
        favoriteIssues={[]}
      />,
    );
    fireEvent.click(screen.getByText(/favorit/i));
    expect(screen.getByText(/keine favoriten|no favorites/i)).toBeInTheDocument();
  });

  it("favorites count badge shows correct count", () => {
    const favs = [makeIssue(5, "A"), makeIssue(6, "B"), makeIssue(7, "C")];
    render(
      <PinnedPreview {...defaultProps} favoriteIssues={favs} favoriteIds={new Set([5, 6, 7])} />,
    );
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("click star in favorites tab calls onToggleFavorite", () => {
    const onToggleFavorite = vi.fn();
    const favs = [makeIssue(5, "Alpha")];
    render(
      <PinnedPreview
        {...defaultProps}
        favoriteIssues={favs}
        favoriteIds={new Set([5])}
        onToggleFavorite={onToggleFavorite}
      />,
    );
    fireEvent.click(screen.getByText(/favorit/i));
    const starBtn = screen.getByLabelText(/favorit/i);
    fireEvent.click(starBtn);
    expect(onToggleFavorite).toHaveBeenCalled();
  });

  it("book button in recent tab calls onOpenBookDialog", () => {
    const onOpenBookDialog = vi.fn();
    const pinned = [makeIssue(1, "Alpha")];
    const recent = [makeIssue(2, "Beta"), makeIssue(3, "Gamma")];
    render(
      <PinnedPreview
        {...defaultProps}
        pinnedIssues={pinned}
        pinnedIds={new Set([1])}
        recentlyPinned={recent}
        onOpenBookDialog={onOpenBookDialog}
      />,
    );
    fireEvent.click(screen.getByText(/zuletzt|recent/i));
    const bookBtns = screen.getAllByLabelText(/manuell buchen|book manually/i);
    fireEvent.click(bookBtns[0]);
    expect(onOpenBookDialog).toHaveBeenCalled();
  });

  it("book button in my tickets tab calls onOpenBookDialog", () => {
    const onOpenBookDialog = vi.fn();
    const assigned = [makeIssue(10, "Gamma")];
    render(
      <PinnedPreview
        {...defaultProps}
        assignedIssues={assigned}
        assignedIds={new Set([10])}
        onOpenBookDialog={onOpenBookDialog}
      />,
    );
    fireEvent.click(screen.getByText(/eigene tickets|my tickets/i));
    const bookBtns = screen.getAllByLabelText(/manuell buchen|book manually/i);
    fireEvent.click(bookBtns[0]);
    expect(onOpenBookDialog).toHaveBeenCalled();
  });
});
