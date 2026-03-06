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

  it("links to Redmine issue", () => {
    render(<SearchResultCard {...defaultProps} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "http://redmine.example.com/issues/42");
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("checkbox toggles pin", () => {
    const onTogglePin = vi.fn();
    render(<SearchResultCard {...defaultProps} onTogglePin={onTogglePin} />);
    fireEvent.click(screen.getByRole("checkbox"));
    expect(onTogglePin).toHaveBeenCalledWith(defaultProps.issue);
  });

  it("checkbox checked when isPinned=true", () => {
    render(<SearchResultCard {...defaultProps} isPinned={true} />);
    expect(screen.getByRole("checkbox")).toBeChecked();
  });

  it("checkbox NOT disabled when isAssigned=true (can unpin assigned)", () => {
    render(<SearchResultCard {...defaultProps} isAssigned={true} />);
    expect(screen.getByRole("checkbox")).not.toBeDisabled();
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

  it("renders book button when onBookTime is provided", () => {
    const onBookTime = vi.fn();
    render(<SearchResultCard {...defaultProps} onBookTime={onBookTime} />);
    expect(screen.getByLabelText(/manuell buchen|book manually/i)).toBeInTheDocument();
  });

  it("does not render book button when onBookTime is undefined", () => {
    render(<SearchResultCard {...defaultProps} />);
    expect(screen.queryByLabelText(/manuell buchen|book manually/i)).not.toBeInTheDocument();
  });

  it("clicking book button calls onBookTime with issue", () => {
    const onBookTime = vi.fn();
    render(<SearchResultCard {...defaultProps} onBookTime={onBookTime} />);
    fireEvent.click(screen.getByLabelText(/manuell buchen|book manually/i));
    expect(onBookTime).toHaveBeenCalledWith(defaultProps.issue);
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
});
