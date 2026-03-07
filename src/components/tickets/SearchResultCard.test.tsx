import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@/test/test-utils";
import { SearchResultCard } from "./SearchResultCard";
import type { RedmineIssue } from "@/types/redmine";

function makeIssue(overrides?: Partial<RedmineIssue>): RedmineIssue {
  return {
    id: 42,
    subject: "Fix login bug",
    project: { id: 1, name: "WebApp" },
    tracker: { id: 1, name: "Bug" },
    status: { id: 1, name: "New" },
    priority: { id: 2, name: "Normal" },
    done_ratio: 0,
    updated_on: "2025-01-01T00:00:00Z",
    ...overrides,
  } as RedmineIssue;
}

const defaultProps = {
  issue: makeIssue(),
  isPinned: false,
  isAssigned: false,
  redmineUrl: "http://redmine.example.com",
  onTogglePin: vi.fn(),
};

describe("SearchResultCard", () => {
  it("renders issue ID and subject", () => {
    render(<SearchResultCard {...defaultProps} />);
    expect(screen.getByText("#42")).toBeInTheDocument();
    expect(screen.getByText("Fix login bug")).toBeInTheDocument();
  });

  it("renders project name and status", () => {
    render(<SearchResultCard {...defaultProps} />);
    expect(screen.getByText("WebApp")).toBeInTheDocument();
    expect(screen.getByText("New")).toBeInTheDocument();
  });

  it("card is a clickable div with role=button", () => {
    render(<SearchResultCard {...defaultProps} />);
    const card = document.querySelector(".search-result-card")!;
    expect(card.tagName).toBe("DIV");
    expect(card.getAttribute("role")).toBe("button");
    expect(card.getAttribute("tabindex")).toBe("0");
  });

  it("clicking card calls onBookTime", () => {
    const onBookTime = vi.fn();
    render(<SearchResultCard {...defaultProps} onBookTime={onBookTime} />);
    const card = document.querySelector(".search-result-card")!;
    fireEvent.click(card);
    expect(onBookTime).toHaveBeenCalledWith(defaultProps.issue);
  });

  it("Enter key on card calls onBookTime", () => {
    const onBookTime = vi.fn();
    render(<SearchResultCard {...defaultProps} onBookTime={onBookTime} />);
    const card = document.querySelector(".search-result-card")!;
    fireEvent.keyDown(card, { key: "Enter" });
    expect(onBookTime).toHaveBeenCalledWith(defaultProps.issue);
  });

  it("Space key on card calls onBookTime", () => {
    const onBookTime = vi.fn();
    render(<SearchResultCard {...defaultProps} onBookTime={onBookTime} />);
    const card = document.querySelector(".search-result-card")!;
    fireEvent.keyDown(card, { key: " " });
    expect(onBookTime).toHaveBeenCalledWith(defaultProps.issue);
  });

  it("renders ExternalLink to Redmine", () => {
    render(<SearchResultCard {...defaultProps} />);
    const link = screen.getByLabelText(/redmine/i);
    expect(link).toHaveAttribute("href", "http://redmine.example.com/issues/42");
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("pin button toggles pin", () => {
    const onTogglePin = vi.fn();
    render(<SearchResultCard {...defaultProps} onTogglePin={onTogglePin} />);
    fireEvent.click(screen.getByLabelText(/pin issue|anpinnen/i));
    expect(onTogglePin).toHaveBeenCalledWith(defaultProps.issue);
  });

  it("pin button shows pressed state when isPinned=true", () => {
    render(<SearchResultCard {...defaultProps} isPinned={true} />);
    expect(screen.getByLabelText(/unpin|loslösen/i)).toHaveAttribute("aria-pressed", "true");
  });

  it("pin button not disabled when isAssigned=true", () => {
    render(<SearchResultCard {...defaultProps} isAssigned={true} />);
    expect(screen.getByLabelText(/pin issue|anpinnen/i)).not.toBeDisabled();
  });

  it("highlights search query in subject", () => {
    render(<SearchResultCard {...defaultProps} searchQuery="login" />);
    const mark = document.querySelector("mark");
    expect(mark).toBeInTheDocument();
    expect(mark?.textContent).toBe("login");
  });

  it("no highlight for short queries (< 2 chars)", () => {
    render(<SearchResultCard {...defaultProps} searchQuery="F" />);
    expect(document.querySelector("mark")).not.toBeInTheDocument();
  });

  it("no highlight for ID queries (#123)", () => {
    render(<SearchResultCard {...defaultProps} searchQuery="#42" />);
    expect(document.querySelector("mark")).not.toBeInTheDocument();
  });

  it("shows assigned hint when isAssigned", () => {
    render(<SearchResultCard {...defaultProps} isAssigned={true} />);
    expect(screen.getByText(/dir zugewiesen|assigned to you/i)).toBeInTheDocument();
  });

  it("pinned class applied when isPinned=true", () => {
    const { container } = render(<SearchResultCard {...defaultProps} isPinned={true} />);
    expect(container.querySelector(".search-result-card--pinned")).toBeInTheDocument();
  });

  it("renders tracker name in meta line", () => {
    render(<SearchResultCard {...defaultProps} />);
    expect(screen.getByText("Bug")).toBeInTheDocument();
  });

  it("renders time ago for updated_on", () => {
    render(<SearchResultCard {...defaultProps} />);
    const metaLine = document.querySelector(".search-result-card__meta")!;
    const timeAgo = metaLine.querySelector(".search-result-card__time-ago");
    expect(timeAgo).toBeInTheDocument();
  });

  it("click star calls onToggleFavorite", () => {
    const onToggleFavorite = vi.fn();
    render(
      <SearchResultCard {...defaultProps} onToggleFavorite={onToggleFavorite} isFavorite={false} />,
    );
    fireEvent.click(screen.getByLabelText(/favorit/i));
    expect(onToggleFavorite).toHaveBeenCalledWith(defaultProps.issue);
  });

  it("star not rendered when onToggleFavorite undefined", () => {
    render(<SearchResultCard {...defaultProps} />);
    expect(screen.queryByLabelText(/favorit/i)).not.toBeInTheDocument();
  });

  it("regex special chars in search query do not crash", () => {
    expect(() => render(<SearchResultCard {...defaultProps} searchQuery="[test]" />)).not.toThrow();
  });

  it("query that does not match subject renders plain text", () => {
    render(<SearchResultCard {...defaultProps} searchQuery="zzzzz" />);
    expect(document.querySelector("mark")).not.toBeInTheDocument();
    expect(screen.getByText("Fix login bug")).toBeInTheDocument();
  });

  it("hides project name when hideProjectName=true", () => {
    render(<SearchResultCard {...defaultProps} hideProjectName />);
    expect(screen.queryByText("WebApp")).not.toBeInTheDocument();
    expect(screen.getByText("New")).toBeInTheDocument();
  });

  it("hides assigned hint when hideAssignedHint=true", () => {
    render(<SearchResultCard {...defaultProps} isAssigned={true} hideAssignedHint />);
    expect(screen.queryByText(/dir zugewiesen|assigned to you/i)).not.toBeInTheDocument();
  });

  it("shows 'just now' when updated_on is moments ago", () => {
    const issue = makeIssue({ updated_on: new Date().toISOString() });
    render(<SearchResultCard {...defaultProps} issue={issue} />);
    expect(screen.getByText(/gerade eben|just now/i)).toBeInTheDocument();
  });

  it("hides pin button when hidePinButton is true", () => {
    render(<SearchResultCard {...defaultProps} hidePinButton />);
    expect(screen.queryByLabelText(/pin|anpinnen|loslösen/i)).not.toBeInTheDocument();
  });

  it("adds no-pin class when hidePinButton is true", () => {
    render(<SearchResultCard {...defaultProps} hidePinButton />);
    const card = document.querySelector(".search-result-card");
    expect(card?.className).toContain("search-result-card--no-pin");
  });

  it("shows pin button by default", () => {
    render(<SearchResultCard {...defaultProps} />);
    const card = document.querySelector(".search-result-card");
    expect(card?.className).not.toContain("search-result-card--no-pin");
  });
});
