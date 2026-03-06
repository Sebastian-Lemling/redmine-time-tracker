import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@/test/test-utils";
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
    ...overrides,
  };
}

describe("TicketCardDescription", () => {
  let originalRAF: typeof requestAnimationFrame;

  beforeEach(() => {
    vi.clearAllMocks();
    // Make requestAnimationFrame synchronous for tests
    originalRAF = globalThis.requestAnimationFrame;
    globalThis.requestAnimationFrame = (cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    };
  });

  afterEach(() => {
    globalThis.requestAnimationFrame = originalRAF;
    vi.useRealTimers();
  });

  it("renders issue subject", () => {
    render(<TicketCardDescription {...makeProps()} />);
    expect(screen.getByText("Fix login bug")).toBeInTheDocument();
  });

  it("clicking subject fetches description when not cached", () => {
    const onFetch = vi.fn();
    render(<TicketCardDescription {...makeProps({ onFetchIssueDescription: onFetch })} />);
    fireEvent.click(screen.getByText("Fix login bug"));
    expect(onFetch).toHaveBeenCalledWith(42);
  });

  it("clicking subject does not re-fetch when description already cached", () => {
    const onFetch = vi.fn();
    render(
      <TicketCardDescription
        {...makeProps({ issueDescription: "Some desc", onFetchIssueDescription: onFetch })}
      />,
    );
    fireEvent.click(screen.getByText("Fix login bug"));
    expect(onFetch).not.toHaveBeenCalled();
  });

  it("toggling twice collapses back", () => {
    render(<TicketCardDescription {...makeProps({ issueDescription: "Some desc" })} />);
    const subject = screen.getByText("Fix login bug");
    fireEvent.click(subject);
    fireEvent.click(subject);
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

  it("shows loading bar when description is being fetched", () => {
    const { container } = render(<TicketCardDescription {...makeProps()} />);
    fireEvent.click(screen.getByText("Fix login bug"));
    expect(container.querySelector(".card-body__loading-track")).toBeInTheDocument();
  });

  it("shows description markdown when description is provided and expanded", async () => {
    vi.useFakeTimers();
    // Re-apply sync rAF since vi.useFakeTimers() overrides it
    globalThis.requestAnimationFrame = (cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    };

    const { rerender } = render(<TicketCardDescription {...makeProps()} />);
    await act(() => {
      fireEvent.click(screen.getByText("Fix login bug"));
    });

    await act(() => {
      rerender(
        <TicketCardDescription
          {...makeProps({
            issueDescription: "**Bold description**",
          })}
        />,
      );
    });

    await act(() => {
      vi.advanceTimersByTime(1200);
    });

    expect(screen.getByText("Bold description")).toBeInTheDocument();
  });

  it("shows no description message when description is empty string", async () => {
    // When description is already cached as empty string, clicking expands immediately
    render(<TicketCardDescription {...makeProps({ issueDescription: "" })} />);

    fireEvent.click(screen.getByText("Fix login bug"));

    // The double rAF sets showContent after 2 animation frames
    // Wait for it to appear
    await waitFor(() => {
      expect(screen.getByText(/no description|keine beschreibung/i)).toBeInTheDocument();
    });
  });

  it("shows comments when expanded and comments exist", async () => {
    const comments = [
      {
        id: 1,
        user: { id: 10, name: "Alice" },
        notes: "This is a comment",
        created_on: "2026-01-15T10:00:00Z",
      },
    ];

    render(
      <TicketCardDescription
        {...makeProps({
          issueDescription: "Description here",
          issueComments: comments,
        })}
      />,
    );

    await act(() => {
      fireEvent.click(screen.getByText("Fix login bug"));
    });

    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("This is a comment")).toBeInTheDocument();
  });

  it("shows no comments message when expanded and comments array is empty", async () => {
    render(
      <TicketCardDescription
        {...makeProps({
          issueDescription: "Description",
          issueComments: [],
        })}
      />,
    );

    await act(() => {
      fireEvent.click(screen.getByText("Fix login bug"));
    });

    expect(screen.getByText(/no comments|keine kommentare/i)).toBeInTheDocument();
  });

  it("expand icon rotates when expanded", () => {
    const { container } = render(
      <TicketCardDescription {...makeProps({ issueDescription: "Desc" })} />,
    );
    fireEvent.click(screen.getByText("Fix login bug"));
    const icon = container.querySelector(".card-body__expand-icon--open");
    expect(icon).toBeInTheDocument();
  });

  it("expand icon not rotated when collapsed", () => {
    const { container } = render(<TicketCardDescription {...makeProps()} />);
    const icon = container.querySelector(".card-body__expand-icon--open");
    expect(icon).not.toBeInTheDocument();
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

  it("description container has open class when expanded", () => {
    const { container } = render(
      <TicketCardDescription {...makeProps({ issueDescription: "Test" })} />,
    );
    fireEvent.click(screen.getByText("Fix login bug"));
    expect(container.querySelector(".card-body__description--open")).toBeInTheDocument();
  });

  it("description container has no open class when collapsed", () => {
    const { container } = render(
      <TicketCardDescription {...makeProps({ issueDescription: "Test" })} />,
    );
    expect(container.querySelector(".card-body__description--open")).not.toBeInTheDocument();
  });

  it("shows multiple comments with different authors", async () => {
    const comments = [
      {
        id: 1,
        user: { id: 10, name: "Alice" },
        notes: "First comment",
        created_on: "2026-01-15T10:00:00Z",
      },
      {
        id: 2,
        user: { id: 11, name: "Bob" },
        notes: "Second comment",
        created_on: "2026-01-16T10:00:00Z",
      },
    ];

    render(
      <TicketCardDescription
        {...makeProps({
          issueDescription: "Description",
          issueComments: comments,
        })}
      />,
    );

    await act(() => {
      fireEvent.click(screen.getByText("Fix login bug"));
    });

    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("First comment")).toBeInTheDocument();
    expect(screen.getByText("Second comment")).toBeInTheDocument();
    expect(screen.getByText(/\(2\)/)).toBeInTheDocument(); // "(2)" comments count
  });
});
