import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@/test/test-utils";
import { TimerControls } from "./TimerControls";
import type { RedmineIssue } from "@/types/redmine";

function makeIssue(): RedmineIssue {
  return {
    id: 42,
    subject: "Fix login",
    project: { id: 1, name: "WebApp" },
    tracker: { id: 1, name: "Bug" },
    status: { id: 1, name: "New" },
    priority: { id: 2, name: "Normal" },
    done_ratio: 0,
    updated_on: "2025-01-01T00:00:00Z",
  } as RedmineIssue;
}

function makeProps(overrides?: Record<string, unknown>) {
  return {
    issue: makeIssue(),
    timerStatus: "none" as "running" | "paused" | "none",
    elapsed: 0,
    onPlay: vi.fn(),
    onPause: vi.fn(),
    onSave: vi.fn(),
    onDiscard: vi.fn(),
    onAdjust: vi.fn(),
    onOpenBookDialog: vi.fn(),
    ...overrides,
  };
}

describe("TimerControls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Idle state ──
  it("idle: shows play and book icon buttons", () => {
    render(<TimerControls {...makeProps()} />);
    expect(screen.getByLabelText(/timer starten|start timer/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/manuell buchen|book manually/i)).toBeInTheDocument();
  });

  it("idle: play button calls onPlay", () => {
    const onPlay = vi.fn();
    render(<TimerControls {...makeProps({ onPlay })} />);
    fireEvent.click(screen.getByLabelText(/timer starten|start timer/i));
    expect(onPlay).toHaveBeenCalledWith(makeIssue());
  });

  it("idle: book button calls onOpenBookDialog", () => {
    const onOpenBookDialog = vi.fn();
    render(<TimerControls {...makeProps({ onOpenBookDialog })} />);
    fireEvent.click(screen.getByLabelText(/manuell buchen|book manually/i));
    expect(onOpenBookDialog).toHaveBeenCalled();
  });

  // ── Running state ──
  it("running: shows pause, discard, save buttons", () => {
    render(<TimerControls {...makeProps({ timerStatus: "running", elapsed: 125 })} />);
    expect(screen.getByLabelText("Pause timer")).toBeInTheDocument();
    expect(screen.getByLabelText(/verwerfen|discard/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/speichern|save/i)).toBeInTheDocument();
  });

  it("running: displays formatted time", () => {
    render(<TimerControls {...makeProps({ timerStatus: "running", elapsed: 3661 })} />);
    expect(screen.getByText("1:01:01")).toBeInTheDocument();
  });

  it("running: pause button calls onPause", () => {
    const onPause = vi.fn();
    render(<TimerControls {...makeProps({ timerStatus: "running", onPause })} />);
    fireEvent.click(screen.getByLabelText("Pause timer"));
    expect(onPause).toHaveBeenCalled();
  });

  it("running: adjust +/- calls onAdjust", () => {
    const onAdjust = vi.fn();
    render(<TimerControls {...makeProps({ timerStatus: "running", onAdjust })} />);
    fireEvent.click(screen.getByLabelText(/minute hinzufügen|add.*minute/i));
    expect(onAdjust).toHaveBeenCalledWith(42, 60);
    fireEvent.click(screen.getByLabelText(/minute abziehen|subtract.*minute/i));
    expect(onAdjust).toHaveBeenCalledWith(42, -60);
  });

  it("running: save button calls onSave", () => {
    const onSave = vi.fn();
    render(<TimerControls {...makeProps({ timerStatus: "running", onSave })} />);
    fireEvent.click(screen.getByLabelText(/speichern|save/i));
    expect(onSave).toHaveBeenCalledWith(42);
  });

  it("running: discard button calls onDiscard", () => {
    const onDiscard = vi.fn();
    render(<TimerControls {...makeProps({ timerStatus: "running", onDiscard })} />);
    fireEvent.click(screen.getByLabelText(/verwerfen|discard/i));
    expect(onDiscard).toHaveBeenCalledWith(42);
  });

  // ── Paused state ──
  it("paused: shows resume, discard, save icon buttons", () => {
    render(<TimerControls {...makeProps({ timerStatus: "paused", elapsed: 300 })} />);
    expect(screen.getByLabelText(/resume timer/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/verwerfen|discard/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/speichern|save/i)).toBeInTheDocument();
  });

  it("paused: displays formatted time mm:ss", () => {
    render(<TimerControls {...makeProps({ timerStatus: "paused", elapsed: 125 })} />);
    expect(screen.getByText("02:05")).toBeInTheDocument();
  });

  it("paused: resume button calls onPlay", () => {
    const onPlay = vi.fn();
    render(<TimerControls {...makeProps({ timerStatus: "paused", onPlay })} />);
    fireEvent.click(screen.getByLabelText(/resume timer/i));
    expect(onPlay).toHaveBeenCalledWith(makeIssue());
  });

  // ── Paused state interactions ──
  it("paused: adjust +/- calls onAdjust", () => {
    const onAdjust = vi.fn();
    render(<TimerControls {...makeProps({ timerStatus: "paused", onAdjust })} />);
    fireEvent.click(screen.getByLabelText(/minute hinzufügen|add.*minute/i));
    expect(onAdjust).toHaveBeenCalledWith(42, 60);
    fireEvent.click(screen.getByLabelText(/minute abziehen|subtract.*minute/i));
    expect(onAdjust).toHaveBeenCalledWith(42, -60);
  });

  it("paused: save button calls onSave", () => {
    const onSave = vi.fn();
    render(<TimerControls {...makeProps({ timerStatus: "paused", onSave })} />);
    fireEvent.click(screen.getByLabelText(/speichern|save/i));
    expect(onSave).toHaveBeenCalledWith(42);
  });

  it("paused: discard button calls onDiscard", () => {
    const onDiscard = vi.fn();
    render(<TimerControls {...makeProps({ timerStatus: "paused", onDiscard })} />);
    fireEvent.click(screen.getByLabelText(/verwerfen|discard/i));
    expect(onDiscard).toHaveBeenCalledWith(42);
  });

  // ── Format elapsed edge cases ──
  it("running: formats zero seconds as 00:00", () => {
    render(<TimerControls {...makeProps({ timerStatus: "running", elapsed: 0 })} />);
    expect(screen.getByText("00:00")).toBeInTheDocument();
  });

  it("paused: formats seconds correctly under 1 hour", () => {
    render(<TimerControls {...makeProps({ timerStatus: "paused", elapsed: 65 })} />);
    expect(screen.getByText("01:05")).toBeInTheDocument();
  });

  it("running: shows recording dot", () => {
    const { container } = render(
      <TimerControls {...makeProps({ timerStatus: "running", elapsed: 60 })} />,
    );
    expect(container.querySelector(".timer-stepper--running")).toBeInTheDocument();
    expect(container.querySelector(".timer-stepper__dot")).toBeInTheDocument();
  });

  it("paused: shows paused style (no recording dot)", () => {
    const { container } = render(
      <TimerControls {...makeProps({ timerStatus: "paused", elapsed: 60 })} />,
    );
    expect(container.querySelector(".timer-stepper--paused")).toBeInTheDocument();
    expect(container.querySelector(".timer-stepper__dot")).not.toBeInTheDocument();
  });

  it("running: formats multi-hour time correctly", () => {
    render(<TimerControls {...makeProps({ timerStatus: "running", elapsed: 7384 })} />);
    // 7384 = 2h 3m 4s
    expect(screen.getByText("2:03:04")).toBeInTheDocument();
  });

  it("paused: formats exactly 1 hour", () => {
    render(<TimerControls {...makeProps({ timerStatus: "paused", elapsed: 3600 })} />);
    expect(screen.getByText("1:00:00")).toBeInTheDocument();
  });
});
