import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@/test/test-utils";
import { MonthCalendar } from "./MonthCalendar";

function makeProps(overrides?: Record<string, unknown>) {
  return {
    year: 2025,
    month: 2,
    today: "2025-03-15",
    selectedDate: "2025-03-10",
    minutesByDate: {} as Record<string, number>,
    localMinsByDate: {} as Record<string, number>,
    remoteMinsByDate: {} as Record<string, number>,
    unsyncedByDate: {} as Record<string, number>,
    entryCountByDate: {} as Record<string, number>,
    heatQuartiles: [1, 2, 3, 4],
    onSelectDay: vi.fn(),
    onNavigateMonth: vi.fn(),
    onGoToday: vi.fn(),
    ...overrides,
  };
}

describe("MonthCalendar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders month name and year", () => {
    render(<MonthCalendar {...makeProps()} />);
    expect(screen.getByText(/März|March/)).toBeInTheDocument();
    expect(screen.getByText(/2025/)).toBeInTheDocument();
  });

  it("renders all 7 weekday headers", () => {
    render(<MonthCalendar {...makeProps()} />);
    expect(screen.getByText("Mo")).toBeInTheDocument();
    expect(screen.getByText("Fr")).toBeInTheDocument();
    expect(screen.getByText(/^Su$|^So$/)).toBeInTheDocument();
  });

  it("prev-month button calls onNavigateMonth(-1)", () => {
    const onNavigateMonth = vi.fn();
    render(<MonthCalendar {...makeProps({ onNavigateMonth })} />);
    fireEvent.click(screen.getByLabelText(/vorheriger monat|previous month/i));
    expect(onNavigateMonth).toHaveBeenCalledWith(-1);
  });

  it("next-month button calls onNavigateMonth(1)", () => {
    const onNavigateMonth = vi.fn();
    render(<MonthCalendar {...makeProps({ onNavigateMonth })} />);
    fireEvent.click(screen.getByLabelText(/nächster monat|next month/i));
    expect(onNavigateMonth).toHaveBeenCalledWith(1);
  });

  it("today button calls onGoToday", () => {
    const onGoToday = vi.fn();
    render(<MonthCalendar {...makeProps({ onGoToday })} />);
    fireEvent.click(screen.getByText(/heute|today/i));
    expect(onGoToday).toHaveBeenCalled();
  });

  it("day click calls onSelectDay with (day, hasUnsynced=true, hasMins=true)", () => {
    const onSelectDay = vi.fn();
    render(
      <MonthCalendar
        {...makeProps({
          onSelectDay,
          minutesByDate: { "2025-03-05": 60 },
          localMinsByDate: { "2025-03-05": 60 },
          unsyncedByDate: { "2025-03-05": 1 },
        })}
      />,
    );
    fireEvent.click(screen.getByText("5"));
    expect(onSelectDay).toHaveBeenCalledWith(5, true, true);
  });

  it("day without unsynced passes hasUnsynced=false", () => {
    const onSelectDay = vi.fn();
    render(
      <MonthCalendar
        {...makeProps({
          onSelectDay,
          minutesByDate: { "2025-03-12": 30 },
          remoteMinsByDate: { "2025-03-12": 30 },
        })}
      />,
    );
    fireEvent.click(screen.getByText("12"));
    expect(onSelectDay).toHaveBeenCalledWith(12, false, true);
  });

  it("selected day has aria-pressed=true", () => {
    render(<MonthCalendar {...makeProps({ selectedDate: "2025-03-10" })} />);
    const day10 = screen.getByText("10").closest("button")!;
    expect(day10).toHaveAttribute("aria-pressed", "true");
  });

  it("today gets cal-day--today only when not selected", () => {
    const { container } = render(
      <MonthCalendar {...makeProps({ today: "2025-03-15", selectedDate: "2025-03-10" })} />,
    );
    const todayDiv = container.querySelector(".cal-day--today");
    expect(todayDiv).toBeInTheDocument();
    expect(todayDiv!.textContent).toBe("15");
  });

  it("today loses cal-day--today when also selected", () => {
    const { container } = render(
      <MonthCalendar {...makeProps({ today: "2025-03-15", selectedDate: "2025-03-15" })} />,
    );
    expect(container.querySelector(".cal-day--today")).not.toBeInTheDocument();
    const selectedDay = container.querySelector(".cal-day--selected");
    expect(selectedDay).toBeInTheDocument();
    expect(selectedDay!.textContent).toBe("15");
  });

  it("day with minutes shows duration and bar segments with correct widths", () => {
    render(
      <MonthCalendar
        {...makeProps({
          minutesByDate: { "2025-03-20": 120 },
          localMinsByDate: { "2025-03-20": 60 },
          remoteMinsByDate: { "2025-03-20": 60 },
        })}
      />,
    );
    const dayBtn = screen.getByText("20").closest("button")!;
    expect(within(dayBtn).getByText("2:00")).toBeInTheDocument();
    const localBar = dayBtn.querySelector(".cal-bar__local") as HTMLElement;
    const remoteBar = dayBtn.querySelector(".cal-bar__remote") as HTMLElement;
    expect(localBar).toBeInTheDocument();
    expect(remoteBar).toBeInTheDocument();
    expect(localBar.style.width).toBe("50%");
    expect(remoteBar.style.width).toBe("50%");
  });

  it("bar shows 75% local / 25% remote when 90/30 split", () => {
    render(
      <MonthCalendar
        {...makeProps({
          minutesByDate: { "2025-03-20": 120 },
          localMinsByDate: { "2025-03-20": 90 },
          remoteMinsByDate: { "2025-03-20": 30 },
        })}
      />,
    );
    const dayBtn = screen.getByText("20").closest("button")!;
    const localBar = dayBtn.querySelector(".cal-bar__local") as HTMLElement;
    const remoteBar = dayBtn.querySelector(".cal-bar__remote") as HTMLElement;
    expect(localBar.style.width).toBe("75%");
    expect(remoteBar.style.width).toBe("25%");
  });

  it("getHeatLevel returns all 4 levels based on entryCountByDate", () => {
    render(
      <MonthCalendar
        {...makeProps({
          heatQuartiles: [1, 2, 4, 6],
          entryCountByDate: {
            "2025-03-03": 1,
            "2025-03-04": 2,
            "2025-03-05": 3,
            "2025-03-06": 5,
          },
        })}
      />,
    );
    const day3 = screen.getByText("3").closest("button")!;
    const day4 = screen.getByText("4").closest("button")!;
    const day5 = screen.getByText("5").closest("button")!;
    const day6 = screen.getByText("6").closest("button")!;
    expect(day3.className).toMatch(/cal-cell--heat-1/);
    expect(day4.className).toMatch(/cal-cell--heat-2/);
    expect(day5.className).toMatch(/cal-cell--heat-3/);
    expect(day6.className).toMatch(/cal-cell--heat-4/);
  });

  it("day without minutes has no bar or hours", () => {
    render(<MonthCalendar {...makeProps()} />);
    const day20 = screen.getByText("20").closest("button")!;
    expect(day20.querySelector(".cal-bar")).not.toBeInTheDocument();
    expect(day20.querySelector(".cal-hours__value")).not.toBeInTheDocument();
  });

  it("click on day without minutes passes hasMins=false", () => {
    const onSelectDay = vi.fn();
    render(<MonthCalendar {...makeProps({ onSelectDay })} />);
    fireEvent.click(screen.getByText("20"));
    expect(onSelectDay).toHaveBeenCalledWith(20, false, false);
  });

  it("weekend days get cal-cell--weekend class when no heat data", () => {
    render(<MonthCalendar {...makeProps()} />);
    const day1 = screen.getByText("1").closest("button")!;
    const day2 = screen.getByText("2").closest("button")!;
    expect(day1.className).toMatch(/cal-cell--weekend/);
    expect(day2.className).toMatch(/cal-cell--weekend/);
    const day3 = screen.getByText("3").closest("button")!;
    expect(day3.className).not.toMatch(/cal-cell--weekend/);
  });

  it("selected day gets cal-cell--selected not cal-cell--heat even with heat data", () => {
    render(
      <MonthCalendar
        {...makeProps({
          selectedDate: "2025-03-05",
          heatQuartiles: [1, 2, 4, 6],
          entryCountByDate: { "2025-03-05": 3 },
        })}
      />,
    );
    const day5 = screen.getByText("5").closest("button")!;
    expect(day5.className).toMatch(/cal-cell--selected/);
    expect(day5.className).not.toMatch(/cal-cell--heat/);
  });

  it("day with only remote minutes shows only remote bar segment", () => {
    render(
      <MonthCalendar
        {...makeProps({
          minutesByDate: { "2025-03-07": 60 },
          localMinsByDate: {},
          remoteMinsByDate: { "2025-03-07": 60 },
        })}
      />,
    );
    const dayBtn = screen.getByText("7").closest("button")!;
    expect(dayBtn.querySelector(".cal-bar__remote")).toBeInTheDocument();
    expect(dayBtn.querySelector(".cal-bar__local")).not.toBeInTheDocument();
    const remoteBar = dayBtn.querySelector(".cal-bar__remote") as HTMLElement;
    expect(remoteBar.style.width).toBe("100%");
  });
});
