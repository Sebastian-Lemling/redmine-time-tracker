import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@/test/test-utils";
import { BookingDialog } from "./BookingDialog";
import type { BookingDialogData } from "./BookingDialog";
import type { RedmineActivity } from "@/types/redmine";

const activities: RedmineActivity[] = [
  { id: 9, name: "Entwicklung", is_default: true },
  { id: 10, name: "Design", is_default: false },
];

function makeData(overrides?: Partial<BookingDialogData>): BookingDialogData {
  return {
    issueId: 42,
    issueSubject: "Fix login bug",
    projectId: 1,
    projectName: "WebApp",
    ...overrides,
  };
}

const baseProps = {
  data: makeData(),
  activities,
  onSave: vi.fn(),
  onCancel: vi.fn(),
};

describe("BookingDialog", () => {
  it("renders dialog with title and issue id", () => {
    render(<BookingDialog {...baseProps} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Book time")).toBeInTheDocument();
    expect(screen.getByText("#42")).toBeInTheDocument();
  });

  it("shows project name chip", () => {
    render(<BookingDialog {...baseProps} />);
    expect(screen.getByText("WebApp")).toBeInTheDocument();
  });

  it("sets default activity (is_default=true)", () => {
    render(<BookingDialog {...baseProps} />);
    expect(screen.getByText("Entwicklung")).toBeInTheDocument();
  });

  it("falls back to first activity when none is_default", () => {
    const acts: RedmineActivity[] = [
      { id: 20, name: "Review", is_default: false },
      { id: 21, name: "QA", is_default: false },
    ];
    render(<BookingDialog {...baseProps} activities={acts} />);
    expect(screen.getByText("Review")).toBeInTheDocument();
  });

  it("defaults to 0.25h for manual mode (no durationMinutes)", () => {
    render(<BookingDialog {...baseProps} />);
    const input = screen.getByDisplayValue("0.25");
    expect(input).toBeInTheDocument();
  });

  it("uses timer duration when durationMinutes provided", () => {
    render(
      <BookingDialog
        {...baseProps}
        data={makeData({ durationMinutes: 90, startTime: "2025-03-01T09:00:00" })}
      />,
    );
    const input = screen.getByDisplayValue("1.5");
    expect(input).toBeInTheDocument();
  });

  it("submit calls onSave with entry data", () => {
    const onSave = vi.fn();
    render(<BookingDialog {...baseProps} onSave={onSave} />);

    const textarea = screen.getByPlaceholderText("What did you do?");
    fireEvent.change(textarea, { target: { value: "Fixed the issue" } });

    fireEvent.click(screen.getByText("Save"));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        issueId: 42,
        description: "Fixed the issue",
        activityId: 9,
        duration: 15,
      }),
    );
  });

  it("submit disabled when no activity selected", () => {
    render(<BookingDialog {...baseProps} activities={[]} />);
    const saveBtn = screen.getByText("Save").closest("button")!;
    expect(saveBtn).toBeDisabled();
  });

  it("cancel button calls onCancel", () => {
    const onCancel = vi.fn();
    render(<BookingDialog {...baseProps} onCancel={onCancel} />);
    fireEvent.click(screen.getByText("Cancel"));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("Escape calls onCancel", () => {
    const onCancel = vi.fn();
    render(<BookingDialog {...baseProps} onCancel={onCancel} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("click backdrop calls onCancel", () => {
    const onCancel = vi.fn();
    render(<BookingDialog {...baseProps} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole("dialog"));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("locks body scroll on mount and restores on unmount", () => {
    const { unmount } = render(<BookingDialog {...baseProps} />);
    expect(document.body.style.overflow).toBe("hidden");
    unmount();
    expect(document.body.style.overflow).toBe("");
  });

  it("shows progress slider when doneRatio provided", () => {
    render(
      <BookingDialog
        {...baseProps}
        data={makeData({ doneRatio: 50 })}
        onDoneRatioChange={vi.fn()}
      />,
    );
    expect(screen.getByText("50%")).toBeInTheDocument();
  });

  it("duration stepper increases/decreases", () => {
    render(<BookingDialog {...baseProps} />);
    fireEvent.click(screen.getByLabelText(/minutes more|minuten mehr/i));
    expect(screen.getByDisplayValue("0.5")).toBeInTheDocument();
  });

  it("duration input accepts manual entry", () => {
    render(<BookingDialog {...baseProps} />);
    const input = screen.getByDisplayValue("0.25");
    fireEvent.change(input, { target: { value: "2.5" } });
    expect(screen.getByDisplayValue("2.5")).toBeInTheDocument();
  });

  it("progress slider onChange updates done ratio", () => {
    render(
      <BookingDialog
        {...baseProps}
        data={makeData({ doneRatio: 30 })}
        onDoneRatioChange={vi.fn()}
      />,
    );
    const slider = screen.getByRole("slider");
    fireEvent.change(slider, { target: { value: "70" } });
    expect(screen.getByText("70%")).toBeInTheDocument();
  });

  it("textarea focus changes border styles", () => {
    render(<BookingDialog {...baseProps} />);
    const textarea = screen.getByPlaceholderText("What did you do?");
    fireEvent.focus(textarea);
    expect(textarea.style.borderColor).toBe("var(--color-primary)");
    expect(textarea.style.borderWidth).toBe("2px");
  });

  it("textarea blur restores border styles", () => {
    render(<BookingDialog {...baseProps} />);
    const textarea = screen.getByPlaceholderText("What did you do?");
    fireEvent.focus(textarea);
    fireEvent.blur(textarea);
    expect(textarea.style.borderColor).toBe("var(--color-outline)");
    expect(textarea.style.borderWidth).toBe("1px");
  });

  it("submit does not fire when activityId is empty (no activities)", () => {
    const onSave = vi.fn();
    render(<BookingDialog {...baseProps} onSave={onSave} activities={[]} />);
    const form = screen.getByRole("dialog").querySelector("form")!;
    fireEvent.submit(form);
    expect(onSave).not.toHaveBeenCalled();
  });

  it("minus button is disabled at minimum duration", () => {
    render(<BookingDialog {...baseProps} />);
    const minusBtn = screen.getByLabelText(/minutes less|minuten weniger/i);
    expect(minusBtn).toBeDisabled();
  });

  it("submit includes doneRatio when changed and onDoneRatioChange provided", () => {
    const onSave = vi.fn();
    const onDoneRatioChange = vi.fn();
    render(
      <BookingDialog
        {...baseProps}
        data={makeData({ doneRatio: 20 })}
        onSave={onSave}
        onDoneRatioChange={onDoneRatioChange}
      />,
    );
    const slider = screen.getByRole("slider");
    fireEvent.change(slider, { target: { value: "60" } });
    fireEvent.click(screen.getByText("Save"));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ doneRatio: 60 }));
    expect(onDoneRatioChange).toHaveBeenCalledWith(42, 60);
  });

  it("submit does not include doneRatio when unchanged", () => {
    const onSave = vi.fn();
    const onDoneRatioChange = vi.fn();
    render(
      <BookingDialog
        {...baseProps}
        data={makeData({ doneRatio: 40 })}
        onSave={onSave}
        onDoneRatioChange={onDoneRatioChange}
      />,
    );
    fireEvent.click(screen.getByText("Save"));
    const callArg = onSave.mock.calls[0][0];
    expect(callArg.doneRatio).toBeUndefined();
    expect(onDoneRatioChange).not.toHaveBeenCalled();
  });

  it("shows Redmine link when redmineUrl provided", () => {
    render(<BookingDialog {...baseProps} redmineUrl="https://redmine.test" />);
    const link = screen.getByText("#42").closest("a");
    expect(link).toHaveAttribute("href", "https://redmine.test/issues/42");
  });

  it("shows # link when no redmineUrl", () => {
    render(<BookingDialog {...baseProps} redmineUrl={undefined} />);
    const link = screen.getByText("#42").closest("a");
    expect(link).toHaveAttribute("href", "#");
  });

  it("copy button copies issue id to clipboard", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    render(<BookingDialog {...baseProps} />);
    const copyBtn = screen.getByLabelText("Copy #42 to clipboard");
    fireEvent.click(copyBtn);
    expect(writeText).toHaveBeenCalledWith("#42");
  });
});
