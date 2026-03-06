import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Snackbar } from "@/components/ui/Snackbar";

describe("Snackbar", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows message text", () => {
    render(<Snackbar data={{ message: "Hello world" }} onDismiss={() => {}} />);
    expect(screen.getByText("Hello world")).toBeInTheDocument();
  });

  it("auto-dismisses after 4 seconds (fake timers)", () => {
    const onDismiss = vi.fn();
    render(<Snackbar data={{ message: "Auto dismiss" }} onDismiss={onDismiss} />);

    vi.advanceTimersByTime(4000);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("action button calls onClick + dismisses", () => {
    const onClick = vi.fn();
    const onDismiss = vi.fn();
    render(
      <Snackbar
        data={{ message: "Action test", action: { label: "Undo", onClick } }}
        onDismiss={onDismiss}
      />,
    );

    fireEvent.click(screen.getByText("Undo"));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("does not render when data is null", () => {
    const { container } = render(<Snackbar data={null} onDismiss={() => {}} />);
    expect(container.innerHTML).toBe("");
  });

  it("new data resets auto-dismiss timer", () => {
    const onDismiss = vi.fn();
    const { rerender } = render(<Snackbar data={{ message: "First" }} onDismiss={onDismiss} />);

    vi.advanceTimersByTime(3000);
    expect(onDismiss).not.toHaveBeenCalled();

    rerender(<Snackbar data={{ message: "Second" }} onDismiss={onDismiss} />);

    vi.advanceTimersByTime(3000);
    expect(onDismiss).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1000);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
