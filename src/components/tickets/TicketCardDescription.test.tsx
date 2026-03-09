import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@/test/test-utils";
import { TicketCardDescription } from "./TicketCardDescription";
import type { RedmineIssue, RedmineJournal } from "@/types/redmine";

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

function makeProps(overrides?: Record<string, unknown>) {
  return {
    issue: makeIssue(),
    issueDescription: undefined as string | undefined,
    issueComments: undefined as RedmineJournal[] | undefined,
    onFetchIssueDescription: vi.fn(),
    onOpenConversation: vi.fn(),
    ...overrides,
  };
}

describe("TicketCardDescription", () => {
  it("renders issue subject", () => {
    render(<TicketCardDescription {...makeProps()} />);
    expect(screen.getByText("Fix login bug")).toBeInTheDocument();
  });

  it("shows clickable subject and comments action button", () => {
    render(<TicketCardDescription {...makeProps()} />);
    expect(screen.getByRole("button", { name: "Fix login bug" })).toBeInTheDocument();
    expect(screen.getByTitle(/comments|kommentare/i)).toBeInTheDocument();
  });

  it("clicking subject opens conversation with description tab", () => {
    const onOpen = vi.fn();
    render(<TicketCardDescription {...makeProps({ onOpenConversation: onOpen })} />);
    fireEvent.click(screen.getByRole("button", { name: "Fix login bug" }));
    expect(onOpen).toHaveBeenCalledWith(42, "description");
  });

  it("clicking comments button opens conversation with comments tab", () => {
    const onOpen = vi.fn();
    render(<TicketCardDescription {...makeProps({ onOpenConversation: onOpen })} />);
    fireEvent.click(screen.getByTitle(/comments|kommentare/i));
    expect(onOpen).toHaveBeenCalledWith(42, "comments");
  });

  it("shows comment count badge when comments exist", () => {
    const comments: RedmineJournal[] = [
      { id: 1, user: { id: 10, name: "Alice" }, notes: "Note", created_on: "2026-01-15T10:00:00Z" },
      { id: 2, user: { id: 11, name: "Bob" }, notes: "Note 2", created_on: "2026-01-16T10:00:00Z" },
    ];
    render(<TicketCardDescription {...makeProps({ issueComments: comments })} />);
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("no comment badge when no comments", () => {
    render(<TicketCardDescription {...makeProps({ issueComments: [] })} />);
    const badge = document.querySelector(".card-body__action-badge");
    expect(badge).not.toBeInTheDocument();
  });

  it("shows due date badge when issue has due_date", () => {
    render(
      <TicketCardDescription
        {...makeProps({ issue: makeIssue({ due_date: "2025-06-15" } as any) })}
      />,
    );
    expect(screen.getByText("15.06.")).toBeInTheDocument();
  });

  it("shows overdue styling for past due dates", () => {
    const { container } = render(
      <TicketCardDescription
        {...makeProps({ issue: makeIssue({ due_date: "2020-01-01" } as any) })}
      />,
    );
    expect(container.querySelector(".ticket-due--overdue")).toBeInTheDocument();
  });

  it("no due date badge when issue has no due_date", () => {
    const { container } = render(<TicketCardDescription {...makeProps()} />);
    expect(container.querySelector(".ticket-due")).not.toBeInTheDocument();
  });

  it("non-overdue due date does not have overdue class", () => {
    const { container } = render(
      <TicketCardDescription
        {...makeProps({ issue: makeIssue({ due_date: "2030-12-31" } as any) })}
      />,
    );
    expect(container.querySelector(".ticket-due")).toBeInTheDocument();
    expect(container.querySelector(".ticket-due--overdue")).not.toBeInTheDocument();
  });

  it("does not show action buttons when onOpenConversation is not provided", () => {
    render(<TicketCardDescription {...makeProps({ onOpenConversation: undefined })} />);
    const actions = document.querySelector(".card-body__actions");
    expect(actions).not.toBeInTheDocument();
  });
});
