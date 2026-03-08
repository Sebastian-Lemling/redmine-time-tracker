import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@/test/test-utils";
import { EditEntryDialog } from "@/components/dialogs/EditEntryDialog";
import type { TimeLogEntry, RedmineActivity } from "@/types/redmine";

const entry: TimeLogEntry = {
  id: "e1",
  issueId: 100,
  issueSubject: "Implement feature X",
  projectId: 1,
  projectName: "Project A",
  startTime: "2026-03-01T10:00:00Z",
  endTime: "2026-03-01T11:00:00Z",
  duration: 60,
  date: "2026-03-01",
  description: "Initial work",
  syncedToRedmine: false,
  instanceId: "default",
};

const activities: RedmineActivity[] = [
  { id: 9, name: "Entwicklung", is_default: true },
  { id: 10, name: "Design", is_default: false },
];

const baseProps = {
  entry,
  activities,
  redmineUrl: "https://redmine.example.com",
  onSave: vi.fn(),
  onCancel: vi.fn(),
};

describe("EditEntryDialog", () => {
  it("shows dialog with edit title and issue subject", () => {
    render(<EditEntryDialog {...baseProps} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Edit entry")).toBeInTheDocument();
    expect(screen.getByText("Implement feature X")).toBeInTheDocument();
  });

  it("shows issue id link to Redmine", () => {
    render(<EditEntryDialog {...baseProps} />);
    const link = screen.getByText("#100").closest("a");
    expect(link).toHaveAttribute("href", "https://redmine.example.com/issues/100");
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("shows project name chip", () => {
    render(<EditEntryDialog {...baseProps} />);
    expect(screen.getByText("Project A")).toBeInTheDocument();
  });

  it("pre-fills description from entry", () => {
    render(<EditEntryDialog {...baseProps} />);
    const textarea = screen.getByDisplayValue("Initial work");
    expect(textarea).toBeInTheDocument();
  });

  it("duration stepper: plus increases, minus decreases", () => {
    render(<EditEntryDialog {...baseProps} />);
    const plusBtn = screen.getByLabelText("15 minutes more");
    const minusBtn = screen.getByLabelText("15 minutes less");

    fireEvent.click(plusBtn);
    expect(screen.getByDisplayValue("1.25")).toBeInTheDocument();

    fireEvent.click(minusBtn);
    expect(screen.getByDisplayValue("1")).toBeInTheDocument();
  });

  it("minus disabled at minimum step (0.25h)", () => {
    const shortEntry = { ...entry, duration: 15 };
    render(<EditEntryDialog {...baseProps} entry={shortEntry} />);
    const minusBtn = screen.getByLabelText("15 minutes less");
    expect(minusBtn).toBeDisabled();
  });

  it("submit calls onSave with updated data", () => {
    const onSave = vi.fn();
    render(<EditEntryDialog {...baseProps} onSave={onSave} />);

    const textarea = screen.getByDisplayValue("Initial work");
    fireEvent.change(textarea, { target: { value: "Updated description" } });

    fireEvent.click(screen.getByText("Save"));
    expect(onSave).toHaveBeenCalledWith(
      "e1",
      expect.objectContaining({
        description: "Updated description",
        duration: 60,
        date: "2026-03-01",
      }),
    );
  });

  it("cancel button calls onCancel", () => {
    const onCancel = vi.fn();
    render(<EditEntryDialog {...baseProps} onCancel={onCancel} />);
    fireEvent.click(screen.getByText("Cancel"));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("Escape calls onCancel", () => {
    const onCancel = vi.fn();
    render(<EditEntryDialog {...baseProps} onCancel={onCancel} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("shows progress slider when doneRatio provided", () => {
    render(<EditEntryDialog {...baseProps} doneRatio={30} />);
    const slider = screen.getByRole("slider");
    expect(slider).toHaveValue("30");
    expect(screen.getByText("30%")).toBeInTheDocument();
  });

  it("hides progress slider when doneRatio not provided", () => {
    render(<EditEntryDialog {...baseProps} />);
    expect(screen.queryByRole("slider")).not.toBeInTheDocument();
  });

  it("submit calls onDoneRatioChange when ratio changed", () => {
    const onDoneRatioChange = vi.fn();
    render(<EditEntryDialog {...baseProps} doneRatio={30} onDoneRatioChange={onDoneRatioChange} />);
    const slider = screen.getByRole("slider");
    fireEvent.change(slider, { target: { value: "50" } });
    fireEvent.click(screen.getByText("Save"));
    expect(onDoneRatioChange).toHaveBeenCalledWith(100, 50);
  });

  it("duration input accepts manual entry", () => {
    render(<EditEntryDialog {...baseProps} />);
    const input = screen.getByDisplayValue("1");
    fireEvent.change(input, { target: { value: "3.5" } });
    expect(screen.getByDisplayValue("3.5")).toBeInTheDocument();
  });

  it("shows strikethrough original duration when duration changed", () => {
    render(
      <EditEntryDialog {...baseProps} entry={{ ...entry, duration: 60, originalDuration: 60 }} />,
    );
    const plusBtn = screen.getByLabelText("15 minutes more");
    fireEvent.click(plusBtn);

    const durationBadge = screen.getByTitle(/Urspr/);
    expect(durationBadge).toBeInTheDocument();
    expect(durationBadge.textContent).toContain("1h");
    expect(durationBadge.textContent).toContain("1.25h");
  });

  it("textarea focus/blur styles change", () => {
    render(<EditEntryDialog {...baseProps} />);
    const textarea = screen.getByDisplayValue("Initial work");

    fireEvent.focus(textarea);
    expect(textarea.style.borderColor).toBe("var(--color-primary)");
    expect(textarea.style.borderWidth).toBe("2px");
    expect(textarea.style.padding).toBe("15px");

    fireEvent.blur(textarea);
    expect(textarea.style.borderColor).toBe("var(--color-outline)");
    expect(textarea.style.borderWidth).toBe("1px");
    expect(textarea.style.padding).toBe("16px");
  });

  it("click backdrop calls onCancel", () => {
    const onCancel = vi.fn();
    render(<EditEntryDialog {...baseProps} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole("dialog"));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("locks body scroll on mount and restores on unmount", () => {
    const { unmount } = render(<EditEntryDialog {...baseProps} />);
    expect(document.body.style.overflow).toBe("hidden");
    unmount();
    expect(document.body.style.overflow).toBe("");
  });

  it("submit does not call onDoneRatioChange when ratio unchanged", () => {
    const onDoneRatioChange = vi.fn();
    render(<EditEntryDialog {...baseProps} doneRatio={40} onDoneRatioChange={onDoneRatioChange} />);
    fireEvent.click(screen.getByText("Save"));
    expect(onDoneRatioChange).not.toHaveBeenCalled();
  });

  it("shows # link when no redmineUrl", () => {
    render(<EditEntryDialog {...baseProps} redmineUrl={undefined} />);
    const link = screen.getByText("#100").closest("a");
    expect(link).toHaveAttribute("href", "#");
  });

  it("hides project chip when projectName is empty", () => {
    render(<EditEntryDialog {...baseProps} entry={{ ...entry, projectName: "" }} />);
    expect(screen.queryByText("Project A")).not.toBeInTheDocument();
  });

  it("submit includes activityId when entry has one", () => {
    const onSave = vi.fn();
    const entryWithActivity = { ...entry, activityId: 10 };
    render(<EditEntryDialog {...baseProps} entry={entryWithActivity} onSave={onSave} />);
    fireEvent.click(screen.getByText("Save"));
    const savedUpdates = onSave.mock.calls[0][1];
    expect(savedUpdates.activityId).toBe(10);
  });

  it("copy button copies issue id to clipboard", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    render(<EditEntryDialog {...baseProps} />);
    const copyBtn = screen.getByLabelText("Copy #100 to clipboard");
    fireEvent.click(copyBtn);
    expect(writeText).toHaveBeenCalledWith("#100");
  });
});
