import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@/test/test-utils";
import { TicketCard } from "@/components/tickets/TicketCard";
import type { RedmineIssue, RedmineStatus, RedmineTracker } from "@/types/redmine";

const issue: RedmineIssue = {
  id: 42,
  subject: "Fix login bug",
  project: { id: 1, name: "Main Project" },
  priority: { id: 2, name: "Normal" },
  status: { id: 1, name: "Neu" },
  tracker: { id: 1, name: "Bug" },
  assigned_to: { id: 5, name: "Max Muster" },
  done_ratio: 30,
  due_date: "2026-04-01",
};

const statuses: RedmineStatus[] = [
  { id: 1, name: "Neu", is_closed: false },
  { id: 2, name: "In Bearbeitung", is_closed: false },
];

const trackers: RedmineTracker[] = [
  { id: 1, name: "Bug" },
  { id: 2, name: "Feature" },
];

const noop = () => {};

const baseProps = {
  issue,
  timerStatus: "none" as const,
  elapsed: 0,
  statuses,
  trackers,
  allowedStatuses: statuses,
  onFetchAllowedStatuses: noop,
  onFetchProjectTrackers: noop,
  projectMembers: [],
  projectVersions: [],
  redmineUrl: "https://redmine.example.com",
  onStatusChange: noop,
  onTrackerChange: noop,
  onAssigneeChange: noop,
  onVersionChange: noop,
  onDoneRatioChange: noop,
  onFetchMembers: noop,
  onFetchVersions: noop,
  onPlay: noop,
  onPause: noop,
  onSave: noop,
  onDiscard: noop,
  onAdjust: noop,
  onOpenBookDialog: noop,
  onFetchIssueDescription: noop,
};

describe("TicketCard", () => {
  it("renders issue subject and id", () => {
    render(<TicketCard {...baseProps} />);
    expect(screen.getByText("Fix login bug")).toBeInTheDocument();
    expect(screen.getByText("#42")).toBeInTheDocument();
  });

  it("shows Redmine link for issue id", () => {
    render(<TicketCard {...baseProps} />);
    const link = screen.getByText("#42").closest("a");
    expect(link).toHaveAttribute("href", "https://redmine.example.com/issues/42");
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("shows tracker and status chips", () => {
    render(<TicketCard {...baseProps} />);
    expect(screen.getByText("Bug")).toBeInTheDocument();
    expect(screen.getByText("Neu")).toBeInTheDocument();
  });

  it("shows assignee name as chip", () => {
    render(<TicketCard {...baseProps} />);
    expect(screen.getByText("Max Muster")).toBeInTheDocument();
  });

  it("idle state shows play and book icon buttons", () => {
    render(<TicketCard {...baseProps} />);
    expect(screen.getByLabelText(/timer starten|start timer/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/manuell buchen|book manually/i)).toBeInTheDocument();
  });

  it("start button calls onPlay with issue", () => {
    const onPlay = vi.fn();
    render(<TicketCard {...baseProps} onPlay={onPlay} />);
    fireEvent.click(screen.getByLabelText(/timer starten|start timer/i));
    expect(onPlay).toHaveBeenCalledWith(issue);
  });

  it("shows pause button when timer running", () => {
    render(<TicketCard {...baseProps} timerStatus="running" elapsed={120} />);
    expect(screen.getByLabelText("Pause timer")).toBeInTheDocument();
  });

  it("shows elapsed time when timer running", () => {
    // 3723 seconds = 1:02:03
    render(<TicketCard {...baseProps} timerStatus="running" elapsed={3723} />);
    expect(screen.getByText("1:02:03")).toBeInTheDocument();
  });

  it("shows resume button when timer paused", () => {
    render(<TicketCard {...baseProps} timerStatus="paused" elapsed={60} />);
    expect(screen.getByLabelText("Resume timer for #42")).toBeInTheDocument();
  });

  it("shows due date as DD.MM.", () => {
    render(<TicketCard {...baseProps} />);
    expect(screen.getByText("01.04.")).toBeInTheDocument();
  });

  it("shows done ratio as chip", () => {
    render(<TicketCard {...baseProps} />);
    expect(screen.getByText("30%")).toBeInTheDocument();
  });

  it("book button calls onOpenBookDialog", () => {
    const onOpenBookDialog = vi.fn();
    render(<TicketCard {...baseProps} onOpenBookDialog={onOpenBookDialog} />);
    fireEvent.click(screen.getByLabelText(/manuell buchen|book manually/i));
    expect(onOpenBookDialog).toHaveBeenCalledTimes(1);
  });

  it("applies ticket-card--accented class when projectColor is set", () => {
    const { container } = render(<TicketCard {...baseProps} projectColor="#4285f4" />);
    const card = container.querySelector(".ticket-card");
    expect(card?.className).toContain("ticket-card--accented");
    expect(card?.className).not.toContain("ticket-card--favorite");
  });

  it("applies ticket-card--favorite class when isFavoriteCard is true", () => {
    const { container } = render(
      <TicketCard {...baseProps} projectColor="#4285f4" isFavoriteCard />,
    );
    const card = container.querySelector(".ticket-card");
    expect(card?.className).toContain("ticket-card--favorite");
    expect(card?.className).not.toContain("ticket-card--accented");
  });

  it("does not set --project-color CSS variable when isFavoriteCard is true", () => {
    const { container } = render(
      <TicketCard {...baseProps} projectColor="#4285f4" isFavoriteCard />,
    );
    const card = container.querySelector(".ticket-card") as HTMLElement;
    expect(card.style.getPropertyValue("--project-color")).toBe("");
  });
});
