import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@/test/test-utils";
import { WeekView } from "./WeekView";
import type { TimeLogEntry as TEntry } from "@/types/redmine";

function makeEntry(date: string, projectName: string, duration: number): TEntry {
  return {
    id: `e-${date}-${projectName}-${duration}`,
    issueId: 100,
    issueSubject: "Test",
    projectId: 1,
    projectName,
    startTime: `${date}T09:00:00`,
    endTime: `${date}T10:00:00`,
    duration,
    originalDuration: duration,
    description: "",
    date,
    syncedToRedmine: false,
  } as TEntry;
}

function getWeekNumber(text: string): number {
  const match = text.match(/(?:KW|CW)\s*(\d+)/);
  return match ? parseInt(match[1]) : -1;
}

describe("WeekView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2025, 0, 15));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders week header with week number and date range", () => {
    render(<WeekView entries={[]} onNavigateToDate={vi.fn()} />);
    const header = screen.getByText(/KW|CW/);
    expect(header.textContent).toMatch(/3/);
    expect(header.textContent).toMatch(/13\.01/);
    expect(header.textContent).toMatch(/19\.01\.2025/);
  });

  it("renders prev/next navigation buttons", () => {
    render(<WeekView entries={[]} onNavigateToDate={vi.fn()} />);
    expect(screen.getByLabelText(/Vorherige Woche|Previous week/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Nächste Woche|Next week/)).toBeInTheDocument();
  });

  it("shows entries grouped by project with correct duration", () => {
    render(
      <WeekView
        entries={[makeEntry("2025-01-15", "Project Alpha", 60)]}
        onNavigateToDate={vi.fn()}
      />,
    );
    expect(screen.getByText("Project Alpha")).toBeInTheDocument();
    expect(screen.getAllByText("1:00").length).toBeGreaterThanOrEqual(1);
  });

  it("prev-week button decrements week number by 1", () => {
    render(<WeekView entries={[]} onNavigateToDate={vi.fn()} />);
    const weekLabel = screen.getByText(/KW|CW/).textContent!;
    const originalWeek = getWeekNumber(weekLabel);
    fireEvent.click(screen.getByLabelText(/Vorherige Woche|Previous week/));
    const newWeek = getWeekNumber(screen.getByText(/KW|CW/).textContent!);
    expect(newWeek).toBe(originalWeek - 1);
  });

  it("next-week button increments week number by 1", () => {
    render(<WeekView entries={[]} onNavigateToDate={vi.fn()} />);
    const weekLabel = screen.getByText(/KW|CW/).textContent!;
    const originalWeek = getWeekNumber(weekLabel);
    fireEvent.click(screen.getByLabelText(/Nächste Woche|Next week/));
    const newWeek = getWeekNumber(screen.getByText(/KW|CW/).textContent!);
    expect(newWeek).toBe(originalWeek + 1);
  });

  it("day header click calls onNavigateToDate with specific date", () => {
    const onNavigateToDate = vi.fn();
    render(<WeekView entries={[]} onNavigateToDate={onNavigateToDate} />);
    const headerButtons = screen
      .getAllByRole("button")
      .filter((btn) => btn.classList.contains("md-label-medium"));
    expect(headerButtons.length).toBe(7);
    fireEvent.click(headerButtons[0]);
    expect(onNavigateToDate).toHaveBeenCalledWith("2025-01-13");
  });

  it("data cell click calls onNavigateToDate with correct date", () => {
    const onNavigateToDate = vi.fn();
    render(
      <WeekView
        entries={[makeEntry("2025-01-15", "Project Alpha", 60)]}
        onNavigateToDate={onNavigateToDate}
      />,
    );
    const durationCell = screen.getAllByText("1:00").find((el) => el.closest("button"));
    expect(durationCell).toBeTruthy();
    fireEvent.click(durationCell!.closest("button")!);
    expect(onNavigateToDate).toHaveBeenCalledWith("2025-01-15");
  });

  it("empty week shows empty state text", () => {
    render(<WeekView entries={[]} onNavigateToDate={vi.fn()} />);
    expect(screen.getByText(/keine einträge|no entries/i)).toBeInTheDocument();
  });

  it("multiple entries for same project accumulate per day", () => {
    render(
      <WeekView
        entries={[
          makeEntry("2025-01-15", "Project Alpha", 60),
          makeEntry("2025-01-15", "Project Alpha", 30),
        ]}
        onNavigateToDate={vi.fn()}
      />,
    );
    expect(screen.getByText("Project Alpha")).toBeInTheDocument();
    expect(screen.getAllByText("1:30").length).toBeGreaterThanOrEqual(1);
  });

  it("multiple projects are sorted alphabetically", () => {
    render(
      <WeekView
        entries={[
          makeEntry("2025-01-15", "Zebra Project", 60),
          makeEntry("2025-01-15", "Alpha Project", 45),
        ]}
        onNavigateToDate={vi.fn()}
      />,
    );
    const projectNames = screen
      .getAllByText(/Alpha Project|Zebra Project/)
      .map((el) => el.textContent);
    expect(projectNames[0]).toBe("Alpha Project");
    expect(projectNames[1]).toBe("Zebra Project");
  });

  it("shows total row with correct per-project and grand totals", () => {
    const { container } = render(
      <WeekView
        entries={[
          makeEntry("2025-01-13", "Project Alpha", 60),
          makeEntry("2025-01-14", "Project Beta", 120),
        ]}
        onNavigateToDate={vi.fn()}
      />,
    );
    expect(screen.getAllByText(/gesamt|total/i).length).toBeGreaterThanOrEqual(2);
    const projectRowTotals = container.querySelectorAll(
      ".week-table-row .md-body-medium:last-child",
    );
    const rowTotalValues = Array.from(projectRowTotals).map((el) => el.textContent);
    expect(rowTotalValues).toContain("1:00");
    expect(rowTotalValues).toContain("2:00");
    const grandTotal = screen.getAllByText("3:00");
    expect(grandTotal.length).toBeGreaterThanOrEqual(1);
  });

  it("entries outside current week are excluded", () => {
    render(
      <WeekView
        entries={[
          makeEntry("2025-01-15", "Project Alpha", 60),
          makeEntry("2025-01-22", "Project Beta", 120),
        ]}
        onNavigateToDate={vi.fn()}
      />,
    );
    expect(screen.getByText("Project Alpha")).toBeInTheDocument();
    expect(screen.queryByText("Project Beta")).not.toBeInTheDocument();
  });

  it("empty data cells show em dash character", () => {
    render(
      <WeekView
        entries={[makeEntry("2025-01-15", "Project Alpha", 60)]}
        onNavigateToDate={vi.fn()}
      />,
    );
    const emDashes = screen.getAllByText("\u2014");
    expect(emDashes.length).toBe(12);
  });

  it("click on empty data cell still calls onNavigateToDate", () => {
    const onNavigateToDate = vi.fn();
    render(
      <WeekView
        entries={[makeEntry("2025-01-15", "Project Alpha", 60)]}
        onNavigateToDate={onNavigateToDate}
      />,
    );
    const emDashCells = screen.getAllByText("\u2014").filter((el) => el.closest("button"));
    fireEvent.click(emDashCells[0].closest("button")!);
    expect(onNavigateToDate).toHaveBeenCalled();
    expect(onNavigateToDate.mock.calls[0][0]).toMatch(/^2025-01-1[3-9]$/);
  });

  it("today column header uses primary color", () => {
    render(
      <WeekView
        entries={[makeEntry("2025-01-15", "Project Alpha", 60)]}
        onNavigateToDate={vi.fn()}
      />,
    );
    const todayHeader = screen
      .getAllByRole("button")
      .filter(
        (btn) => btn.classList.contains("md-label-medium") && btn.textContent?.includes("15.01."),
      );
    expect(todayHeader.length).toBe(1);
    expect(todayHeader[0].style.color).toBe("var(--color-primary)");
    const otherHeader = screen
      .getAllByRole("button")
      .filter(
        (btn) => btn.classList.contains("md-label-medium") && btn.textContent?.includes("13.01."),
      );
    expect(otherHeader[0].style.color).toBe("var(--color-on-surface-variant)");
  });

  it("day totals show per-day sums across projects", () => {
    render(
      <WeekView
        entries={[
          makeEntry("2025-01-15", "Project Alpha", 60),
          makeEntry("2025-01-15", "Project Beta", 30),
        ]}
        onNavigateToDate={vi.fn()}
      />,
    );
    const totalTexts = screen.getAllByText("1:30");
    expect(totalTexts.length).toBeGreaterThanOrEqual(1);
  });
});
