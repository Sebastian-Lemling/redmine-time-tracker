import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@/test/test-utils";
import { MonthViewFooter } from "./MonthViewFooter";

const defaultProps = {
  totalMinutes: 0,
  avgPerDay: 0,
  workDays: 0,
  totalUnsyncedCount: 0,
  firstUnsyncedDay: null as number | null,
  showBatchBar: false,
  selectedCount: 0,
  batchSyncing: false,
  onNavigateToDay: vi.fn(),
  onBatchSync: vi.fn(),
};

describe("MonthViewFooter", () => {
  it("shows total hours formatted as h:mm", () => {
    render(<MonthViewFooter {...defaultProps} totalMinutes={150} />);
    expect(screen.getByText("2:30")).toBeInTheDocument();
  });

  it("shows average hours per day", () => {
    render(<MonthViewFooter {...defaultProps} avgPerDay={90} />);
    expect(screen.getByText("1:30")).toBeInTheDocument();
  });

  it("shows work day count in footer chip", () => {
    const { container } = render(<MonthViewFooter {...defaultProps} workDays={15} />);
    const chips = container.querySelectorAll(".cal-footer__chip strong");
    const values = Array.from(chips).map((el) => el.textContent);
    expect(values).toContain("15");
  });

  it("shows unsynced draft count and clicking navigates to first unsynced day", () => {
    const onNavigateToDay = vi.fn();
    render(
      <MonthViewFooter
        {...defaultProps}
        totalUnsyncedCount={5}
        firstUnsyncedDay={7}
        onNavigateToDay={onNavigateToDay}
      />,
    );
    const draftChip = screen.getByText("5").closest("button")!;
    expect(draftChip).toBeInTheDocument();
    fireEvent.click(draftChip);
    expect(onNavigateToDay).toHaveBeenCalledWith(7);
  });

  it("hides draft chip when no unsynced entries", () => {
    const { container } = render(<MonthViewFooter {...defaultProps} totalUnsyncedCount={0} />);
    expect(container.querySelector(".cal-footer__chip--warn")).not.toBeInTheDocument();
  });

  it("firstUnsyncedDay=null prevents onNavigateToDay call", () => {
    const onNavigateToDay = vi.fn();
    render(
      <MonthViewFooter
        {...defaultProps}
        totalUnsyncedCount={3}
        firstUnsyncedDay={null}
        onNavigateToDay={onNavigateToDay}
      />,
    );
    fireEvent.click(screen.getByText("3").closest("button")!);
    expect(onNavigateToDay).not.toHaveBeenCalled();
  });

  it("shows batch bar with selected count text", () => {
    render(<MonthViewFooter {...defaultProps} showBatchBar={true} selectedCount={2} />);
    expect(screen.getByText(/2 ausgewählt|2 selected/i)).toBeInTheDocument();
  });

  it("batch sync button calls onBatchSync", () => {
    const onBatchSync = vi.fn();
    render(
      <MonthViewFooter
        {...defaultProps}
        showBatchBar={true}
        selectedCount={2}
        onBatchSync={onBatchSync}
      />,
    );
    fireEvent.click(screen.getByText(/senden|send/i));
    expect(onBatchSync).toHaveBeenCalled();
  });

  it("batch sync button disabled when batchSyncing", () => {
    render(
      <MonthViewFooter
        {...defaultProps}
        showBatchBar={true}
        selectedCount={2}
        batchSyncing={true}
      />,
    );
    const syncBtn = screen.getByText(/synchronisiere|syncing/i);
    expect(syncBtn).toBeDisabled();
  });

  it("0 entries → all stats show zeroes", () => {
    render(<MonthViewFooter {...defaultProps} />);
    const zeros = screen.getAllByText("0:00");
    expect(zeros.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("batch bar hidden when showBatchBar=false", () => {
    const { container } = render(<MonthViewFooter {...defaultProps} showBatchBar={false} />);
    expect(container.querySelector(".cal-footer__batch")).not.toBeInTheDocument();
  });
});
