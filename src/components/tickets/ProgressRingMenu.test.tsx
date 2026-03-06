import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@/test/test-utils";
import { ProgressRingMenu } from "./ProgressRingMenu";

const defaultProps = {
  value: 30,
  color: "var(--color-success)",
  trackColor: "var(--color-outline)",
  onSelect: vi.fn(),
};

describe("ProgressRingMenu", () => {
  it("renders current value as label", () => {
    render(<ProgressRingMenu {...defaultProps} />);
    expect(screen.getByText("30")).toBeInTheDocument();
  });

  it("shows tooltip with percentage", () => {
    render(<ProgressRingMenu {...defaultProps} />);
    expect(screen.getByTitle("30%")).toBeInTheDocument();
  });

  it("opens menu on click when onSelect provided", () => {
    render(<ProgressRingMenu {...defaultProps} />);
    fireEvent.click(screen.getByTitle("30%"));
    expect(screen.getByRole("listbox")).toBeInTheDocument();
  });

  it("renders all 11 done steps (0-100 in 10s)", () => {
    render(<ProgressRingMenu {...defaultProps} />);
    fireEvent.click(screen.getByTitle("30%"));
    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(11);
    expect(options[0].textContent).toBe("0%");
    expect(options[10].textContent).toBe("100%");
  });

  it("current value is aria-selected", () => {
    render(<ProgressRingMenu {...defaultProps} value={50} />);
    fireEvent.click(screen.getByTitle("50%"));
    const selected = screen
      .getAllByRole("option")
      .find((el) => el.getAttribute("aria-selected") === "true");
    expect(selected?.textContent).toBe("50%");
  });

  it("clicking option calls onSelect and closes menu", () => {
    const onSelect = vi.fn();
    render(<ProgressRingMenu {...defaultProps} onSelect={onSelect} />);
    fireEvent.click(screen.getByTitle("30%"));
    fireEvent.click(screen.getByText("70%"));
    expect(onSelect).toHaveBeenCalledWith(70);
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("does not open menu when onSelect is undefined", () => {
    render(<ProgressRingMenu {...defaultProps} onSelect={undefined} />);
    fireEvent.click(screen.getByTitle("30%"));
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("value=0 renders correctly", () => {
    render(<ProgressRingMenu {...defaultProps} value={0} />);
    expect(screen.getByText("0")).toBeInTheDocument();
    expect(screen.getByTitle("0%")).toBeInTheDocument();
  });

  it("value=100 renders correctly", () => {
    render(<ProgressRingMenu {...defaultProps} value={100} />);
    expect(screen.getByText("100")).toBeInTheDocument();
  });

  it("renders SVG with correct viewBox", () => {
    const { container } = render(<ProgressRingMenu {...defaultProps} />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("viewBox", "0 0 28 28");
  });

  it("renders two circles (track + fill)", () => {
    const { container } = render(<ProgressRingMenu {...defaultProps} />);
    const circles = container.querySelectorAll("circle");
    expect(circles.length).toBe(2);
  });

  it("track circle uses trackColor", () => {
    const { container } = render(<ProgressRingMenu {...defaultProps} />);
    const circles = container.querySelectorAll("circle");
    expect(circles[0]).toHaveAttribute("stroke", "var(--color-outline)");
  });

  it("fill circle uses color prop", () => {
    const { container } = render(<ProgressRingMenu {...defaultProps} />);
    const circles = container.querySelectorAll("circle");
    expect(circles[1]).toHaveAttribute("stroke", "var(--color-success)");
  });

  it("hover triggers animation on value > 0", () => {
    const { container } = render(<ProgressRingMenu {...defaultProps} value={50} />);
    const btn = screen.getByTitle("50%");
    fireEvent.mouseEnter(btn);
    const fillCircle = container.querySelectorAll("circle")[1];
    expect(fillCircle).toBeInTheDocument();
  });

  it("hover does not trigger animation when value is 0", () => {
    const { container } = render(<ProgressRingMenu {...defaultProps} value={0} />);
    const btn = screen.getByTitle("0%");
    fireEvent.mouseEnter(btn);
    const fillCircle = container.querySelectorAll("circle")[1];
    expect(fillCircle.style.transition).not.toBe("none");
  });

  it("active class is set on currently selected value", () => {
    render(<ProgressRingMenu {...defaultProps} value={30} />);
    fireEvent.click(screen.getByTitle("30%"));
    const activeOption = screen
      .getAllByRole("option")
      .find((el) => el.getAttribute("aria-selected") === "true");
    expect(activeOption?.className).toContain("progress-ring__item--active");
  });

  it("renders menu in a portal (document.body)", () => {
    render(<ProgressRingMenu {...defaultProps} />);
    fireEvent.click(screen.getByTitle("30%"));
    const menu = screen.getByRole("listbox");
    expect(menu.parentElement).toBe(document.body);
  });

  it("animation progresses through fill and glow states on hover", async () => {
    vi.useFakeTimers();
    render(<ProgressRingMenu {...defaultProps} value={50} />);
    const btn = screen.getByTitle("50%");

    // Trigger hover animation (sets anim to "reset")
    await act(() => {
      fireEvent.mouseEnter(btn);
    });

    // "reset" -> requestAnimationFrame -> "fill"
    // Advance to flush rAF (jsdom treats it as ~16ms)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(20);
    });

    // "fill" -> setTimeout 600ms -> "glow"
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });

    expect(btn.className).toContain("progress-ring--glow");

    // "glow" -> setTimeout 400ms -> "idle"
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });

    expect(btn.className).not.toContain("progress-ring--glow");

    vi.useRealTimers();
  });
});
