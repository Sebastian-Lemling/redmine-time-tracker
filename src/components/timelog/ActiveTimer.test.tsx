import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@/test/test-utils";
import { ActiveTimer } from "@/components/timelog/ActiveTimer";
import type { TimerState } from "@/types/redmine";

const timer: TimerState = {
  issueId: 42,
  issueSubject: "Fix login bug",
  projectName: "Main Project",
  startTime: new Date().toISOString(),
  instanceId: "default",
};

const baseProps = {
  timer,
  elapsed: 3723, // 1:02:03
  onPause: vi.fn(),
  onSave: vi.fn(),
  onAdjust: vi.fn(),
};

describe("ActiveTimer", () => {
  it("renders as status region with aria-live=polite", () => {
    render(<ActiveTimer {...baseProps} />);
    const status = screen.getByRole("status");
    expect(status).toBeInTheDocument();
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(status).toHaveAttribute(
      "aria-label",
      expect.stringMatching(/timer.*#42.*Fix login bug/i),
    );
  });

  it("shows project name and issue id", () => {
    render(<ActiveTimer {...baseProps} />);
    expect(screen.getByText(/Main Project/)).toBeInTheDocument();
    expect(screen.getByText(/42/)).toBeInTheDocument();
  });

  it("shows issue subject", () => {
    render(<ActiveTimer {...baseProps} />);
    expect(screen.getByText("Fix login bug")).toBeInTheDocument();
  });

  it("shows formatted elapsed time (1:02:03)", () => {
    render(<ActiveTimer {...baseProps} />);
    expect(screen.getByRole("timer")).toHaveTextContent("1:02:03");
  });

  it("shows 0:00:00 when elapsed is 0", () => {
    render(<ActiveTimer {...baseProps} elapsed={0} />);
    expect(screen.getByRole("timer")).toHaveTextContent("0:00:00");
  });

  it("minus button calls onAdjust with -60", () => {
    const onAdjust = vi.fn();
    render(<ActiveTimer {...baseProps} onAdjust={onAdjust} />);
    fireEvent.click(screen.getByLabelText(/1 minute abziehen|subtract 1 minute/i));
    expect(onAdjust).toHaveBeenCalledWith(42, -60);
  });

  it("plus button calls onAdjust with +60", () => {
    const onAdjust = vi.fn();
    render(<ActiveTimer {...baseProps} onAdjust={onAdjust} />);
    fireEvent.click(screen.getByLabelText(/1 minute addieren|add 1 minute/i));
    expect(onAdjust).toHaveBeenCalledWith(42, 60);
  });

  it("pause button calls onPause", () => {
    const onPause = vi.fn();
    render(<ActiveTimer {...baseProps} onPause={onPause} />);
    fireEvent.click(screen.getByLabelText(/pausieren|pause/i));
    expect(onPause).toHaveBeenCalledTimes(1);
  });

  it("save button calls onSave with issueId", () => {
    const onSave = vi.fn();
    render(<ActiveTimer {...baseProps} onSave={onSave} />);
    fireEvent.click(screen.getByLabelText(/speichern|save/i));
    expect(onSave).toHaveBeenCalledWith(42);
  });
});
