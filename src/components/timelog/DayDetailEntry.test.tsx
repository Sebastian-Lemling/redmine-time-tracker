import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@/test/test-utils";
import { DayDetailEntry, getProjectColor, formatDurationDecimal } from "./DayDetailEntry";
import type { TimeLogEntry as TEntry } from "@/types/redmine";

function makeEntry(overrides?: Partial<TEntry>): TEntry {
  return {
    id: "e1",
    issueId: 100,
    issueSubject: "Fix the bug",
    projectId: 1,
    projectName: "ProjectX",
    startTime: "2025-03-01T09:00:00",
    endTime: "2025-03-01T09:30:00",
    duration: 30,
    originalDuration: 30,
    description: "worked on it",
    date: "2025-03-01",
    activityId: 5,
    syncedToRedmine: false,
    instanceId: "default",
    ...overrides,
  };
}

const defaultProps = {
  selected: false,
  syncing: false,
  activities: [{ id: 5, name: "Development", is_default: false }],
  redmineUrl: "http://redmine.example.com",
  onToggleSelect: vi.fn(),
  onEdit: vi.fn(),
  onDelete: vi.fn(),
  onIncrease: vi.fn(),
  onDecrease: vi.fn(),
};

describe("DayDetailEntry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders entry title, project, issue ID", () => {
    render(<DayDetailEntry entry={makeEntry()} {...defaultProps} />);
    expect(screen.getByText("Fix the bug")).toBeInTheDocument();
    expect(screen.getByText("ProjectX")).toBeInTheDocument();
    expect(screen.getByText("#100")).toBeInTheDocument();
  });

  it("renders activity name when activityId is set", () => {
    render(<DayDetailEntry entry={makeEntry()} {...defaultProps} />);
    expect(screen.getByText("Development")).toBeInTheDocument();
  });

  it("hides activity chip when no activityId", () => {
    render(<DayDetailEntry entry={makeEntry({ activityId: undefined })} {...defaultProps} />);
    expect(screen.queryByText("Development")).not.toBeInTheDocument();
  });

  it("renders duration as decimal hours", () => {
    render(<DayDetailEntry entry={makeEntry({ duration: 90 })} {...defaultProps} />);
    expect(screen.getByText("1.5h")).toBeInTheDocument();
  });

  it("shows description when present", () => {
    render(<DayDetailEntry entry={makeEntry()} {...defaultProps} />);
    expect(screen.getByText("worked on it")).toBeInTheDocument();
  });

  it("hides description when empty", () => {
    render(<DayDetailEntry entry={makeEntry({ description: "" })} {...defaultProps} />);
    expect(screen.queryByText("worked on it")).not.toBeInTheDocument();
  });

  it("checkbox click calls onToggleSelect", () => {
    const onToggleSelect = vi.fn();
    render(
      <DayDetailEntry entry={makeEntry()} {...defaultProps} onToggleSelect={onToggleSelect} />,
    );
    fireEvent.click(screen.getByRole("checkbox"));
    expect(onToggleSelect).toHaveBeenCalled();
  });

  it("checkbox keyboard Space calls onToggleSelect", () => {
    const onToggleSelect = vi.fn();
    render(
      <DayDetailEntry entry={makeEntry()} {...defaultProps} onToggleSelect={onToggleSelect} />,
    );
    fireEvent.keyDown(screen.getByRole("checkbox"), { key: " " });
    expect(onToggleSelect).toHaveBeenCalled();
  });

  it("checkbox keyboard Enter calls onToggleSelect", () => {
    const onToggleSelect = vi.fn();
    render(
      <DayDetailEntry entry={makeEntry()} {...defaultProps} onToggleSelect={onToggleSelect} />,
    );
    fireEvent.keyDown(screen.getByRole("checkbox"), { key: "Enter" });
    expect(onToggleSelect).toHaveBeenCalled();
  });

  it("edit button calls onEdit", () => {
    const onEdit = vi.fn();
    render(<DayDetailEntry entry={makeEntry()} {...defaultProps} onEdit={onEdit} />);
    fireEvent.click(screen.getByLabelText(/bearbeiten|edit/i));
    expect(onEdit).toHaveBeenCalled();
  });

  it("delete button calls onDelete", () => {
    const onDelete = vi.fn();
    render(<DayDetailEntry entry={makeEntry()} {...defaultProps} onDelete={onDelete} />);
    fireEvent.click(screen.getByLabelText(/löschen|delete/i));
    expect(onDelete).toHaveBeenCalled();
  });

  it("stepper + calls onIncrease", () => {
    const onIncrease = vi.fn();
    render(<DayDetailEntry entry={makeEntry()} {...defaultProps} onIncrease={onIncrease} />);
    fireEvent.click(screen.getByLabelText(/minuten mehr|minutes more/i));
    expect(onIncrease).toHaveBeenCalled();
  });

  it("stepper - calls onDecrease", () => {
    const onDecrease = vi.fn();
    render(<DayDetailEntry entry={makeEntry()} {...defaultProps} onDecrease={onDecrease} />);
    fireEvent.click(screen.getByLabelText(/minuten weniger|minutes less/i));
    expect(onDecrease).toHaveBeenCalled();
  });

  it("stepper - disabled at minimum duration", () => {
    render(<DayDetailEntry entry={makeEntry({ duration: 15 })} {...defaultProps} />);
    expect(screen.getByLabelText(/minuten weniger|minutes less/i)).toBeDisabled();
  });

  it("synced entry hides checkbox, edit, and stepper buttons", () => {
    render(<DayDetailEntry entry={makeEntry({ syncedToRedmine: true })} {...defaultProps} />);
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/bearbeiten|edit/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/mehr zeit|more time/i)).not.toBeInTheDocument();
  });

  it("selected=true adds de-card--selected class", () => {
    const { container } = render(
      <DayDetailEntry entry={makeEntry()} {...defaultProps} selected={true} />,
    );
    expect(container.querySelector(".de-card--selected")).toBeInTheDocument();
  });

  it("syncing=true shows spinner and hides stepper", () => {
    const { container } = render(
      <DayDetailEntry entry={makeEntry()} {...defaultProps} syncing={true} />,
    );
    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
    expect(screen.queryByLabelText(/minuten mehr|minutes more/i)).not.toBeInTheDocument();
  });

  it("copy button writes issue ID to clipboard", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    render(<DayDetailEntry entry={makeEntry()} {...defaultProps} />);
    await act(async () => {
      fireEvent.click(screen.getByLabelText(/copy #100|#100 kopieren/i));
    });
    expect(writeText).toHaveBeenCalledWith("#100");
  });

  it("copy button shows check icon after successful copy and resets after timeout", async () => {
    vi.useFakeTimers();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    render(<DayDetailEntry entry={makeEntry()} {...defaultProps} />);
    const copyBtn = screen.getByLabelText(/copy #100|#100 kopieren/i);
    await act(async () => {
      fireEvent.click(copyBtn);
    });
    expect(copyBtn.classList.contains("de-card__badge-copy--copied")).toBe(true);
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });
    expect(copyBtn.classList.contains("de-card__badge-copy--copied")).toBe(false);
    vi.useRealTimers();
  });

  it("copy button handles clipboard failure gracefully", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("denied"));
    Object.assign(navigator, { clipboard: { writeText } });
    render(<DayDetailEntry entry={makeEntry()} {...defaultProps} />);
    const copyBtn = screen.getByLabelText(/copy #100|#100 kopieren/i);
    await act(async () => {
      fireEvent.click(copyBtn);
    });
    expect(copyBtn.classList.contains("de-card__badge-copy--copied")).toBe(false);
  });

  it("issue ID link points to Redmine", () => {
    render(<DayDetailEntry entry={makeEntry()} {...defaultProps} />);
    const link = screen.getByText("#100").closest("a")!;
    expect(link).toHaveAttribute("href", "http://redmine.example.com/issues/100");
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("clicking badge area does not trigger onToggleSelect", () => {
    const onToggleSelect = vi.fn();
    render(
      <DayDetailEntry entry={makeEntry()} {...defaultProps} onToggleSelect={onToggleSelect} />,
    );
    fireEvent.click(screen.getByText("#100").closest(".de-card__id-badge")!);
    expect(onToggleSelect).not.toHaveBeenCalled();
  });

  it("synced entry still has delete button", () => {
    render(<DayDetailEntry entry={makeEntry({ syncedToRedmine: true })} {...defaultProps} />);
    expect(screen.getByLabelText(/löschen|delete/i)).toBeInTheDocument();
  });

  it("synced entry has de-card--disabled class", () => {
    const { container } = render(
      <DayDetailEntry entry={makeEntry({ syncedToRedmine: true })} {...defaultProps} />,
    );
    expect(container.querySelector(".de-card--disabled")).toBeInTheDocument();
  });

  it("syncing=true sets opacity 0.6 on card", () => {
    const { container } = render(
      <DayDetailEntry entry={makeEntry()} {...defaultProps} syncing={true} />,
    );
    const card = container.querySelector(".de-card") as HTMLElement;
    expect(card.style.opacity).toBe("0.6");
  });

  it("checkbox ignores unrelated key presses", () => {
    const onToggleSelect = vi.fn();
    render(
      <DayDetailEntry entry={makeEntry()} {...defaultProps} onToggleSelect={onToggleSelect} />,
    );
    fireEvent.keyDown(screen.getByRole("checkbox"), { key: "a" });
    expect(onToggleSelect).not.toHaveBeenCalled();
  });

  it("clicking trailing area does not bubble to parent", () => {
    const onToggleSelect = vi.fn();
    const { container } = render(
      <DayDetailEntry entry={makeEntry()} {...defaultProps} onToggleSelect={onToggleSelect} />,
    );
    fireEvent.click(container.querySelector(".de-card__trailing")!);
    expect(onToggleSelect).not.toHaveBeenCalled();
  });
});

describe("getProjectColor", () => {
  it("returns deterministic color for same name", () => {
    expect(getProjectColor("Alpha")).toBe(getProjectColor("Alpha"));
  });

  it("returns a hex color string", () => {
    expect(getProjectColor("Alpha")).toMatch(/^#[0-9a-f]{6}$/i);
  });
});

describe("formatDurationDecimal", () => {
  it("15 → 0.25h", () => expect(formatDurationDecimal(15)).toBe("0.25h"));
  it("30 → 0.5h", () => expect(formatDurationDecimal(30)).toBe("0.5h"));
  it("60 → 1h", () => expect(formatDurationDecimal(60)).toBe("1h"));
  it("90 → 1.5h", () => expect(formatDurationDecimal(90)).toBe("1.5h"));
  it("120 → 2h", () => expect(formatDurationDecimal(120)).toBe("2h"));
  it("0 → 0h", () => expect(formatDurationDecimal(0)).toBe("0h"));
});
