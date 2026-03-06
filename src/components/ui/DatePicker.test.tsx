import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@/test/test-utils";
import { DatePicker } from "@/components/ui/DatePicker";

describe("DatePicker", () => {
  it("shows formatted date as trigger text", () => {
    render(<DatePicker value="2026-03-15" onChange={() => {}} />);
    expect(screen.getByText("15.03.2026")).toBeInTheDocument();
  });

  it("click opens calendar for current month", () => {
    render(<DatePicker value="2026-03-15" onChange={() => {}} />);
    const trigger = screen.getAllByRole("button")[0];
    fireEvent.click(trigger);
    expect(screen.getByText(/March 2026/)).toBeInTheDocument();
  });

  it("click day calls onChange with YYYY-MM-DD", () => {
    const onChange = vi.fn();
    render(<DatePicker value="2026-03-15" onChange={onChange} />);
    const trigger = screen.getAllByRole("button")[0];
    fireEvent.click(trigger);

    const dayButtons = screen
      .getAllByRole("button")
      .filter((btn) => btn.textContent === "10" && btn.classList.contains("md-interactive"));
    fireEvent.click(dayButtons[0]);
    expect(onChange).toHaveBeenCalledWith("2026-03-10");
  });

  it("click month name switches to month selection view", () => {
    render(<DatePicker value="2026-03-15" onChange={() => {}} />);
    const trigger = screen.getAllByRole("button")[0];
    fireEvent.click(trigger);

    fireEvent.click(screen.getByText(/March 2026/));

    expect(screen.getByText("Jan")).toBeInTheDocument();
    expect(screen.getByText("Feb")).toBeInTheDocument();
    expect(screen.getByText("Dec")).toBeInTheDocument();
  });

  it("select month returns to calendar at that month", () => {
    render(<DatePicker value="2026-03-15" onChange={() => {}} />);
    const trigger = screen.getAllByRole("button")[0];
    fireEvent.click(trigger);

    fireEvent.click(screen.getByText(/March 2026/));

    fireEvent.click(screen.getByText("Jun"));

    expect(screen.getByText(/June 2026/)).toBeInTheDocument();
  });

  it('"Today" button selects today and closes', () => {
    const onChange = vi.fn();
    render(<DatePicker value="2026-01-15" onChange={onChange} />);
    const trigger = screen.getAllByRole("button")[0];
    fireEvent.click(trigger);

    fireEvent.click(screen.getByText("Today"));

    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    expect(onChange).toHaveBeenCalledWith(`${y}-${m}-${d}`);
  });

  it("Escape closes without selection", () => {
    const onChange = vi.fn();
    render(<DatePicker value="2026-03-15" onChange={onChange} />);
    const trigger = screen.getAllByRole("button")[0];
    fireEvent.click(trigger);
    expect(screen.getByText(/March 2026/)).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByText(/March 2026/)).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("prev month navigates backwards", () => {
    render(<DatePicker value="2026-03-15" onChange={() => {}} />);
    fireEvent.click(screen.getAllByRole("button")[0]);
    expect(screen.getByText(/March 2026/)).toBeInTheDocument();

    const calendarButtons = screen
      .getAllByRole("button")
      .filter((b) => b.textContent?.trim() === "" && b.querySelector("svg"));
    fireEvent.click(calendarButtons[0]);
    expect(screen.getByText(/February 2026/)).toBeInTheDocument();
  });

  it("next month navigates forwards", () => {
    render(<DatePicker value="2026-03-15" onChange={() => {}} />);
    fireEvent.click(screen.getAllByRole("button")[0]);
    expect(screen.getByText(/March 2026/)).toBeInTheDocument();

    const calendarButtons = screen
      .getAllByRole("button")
      .filter((b) => b.textContent?.trim() === "" && b.querySelector("svg"));
    fireEvent.click(calendarButtons[1]);
    expect(screen.getByText(/April 2026/)).toBeInTheDocument();
  });

  it("prev month wraps from January to December of previous year", () => {
    render(<DatePicker value="2026-01-15" onChange={() => {}} />);
    fireEvent.click(screen.getAllByRole("button")[0]);
    expect(screen.getByText(/January 2026/)).toBeInTheDocument();

    const calendarButtons = screen
      .getAllByRole("button")
      .filter((b) => b.textContent?.trim() === "" && b.querySelector("svg"));
    fireEvent.click(calendarButtons[0]);
    expect(screen.getByText(/December 2025/)).toBeInTheDocument();
  });

  it("next month wraps from December to January of next year", () => {
    render(<DatePicker value="2026-12-15" onChange={() => {}} />);
    fireEvent.click(screen.getAllByRole("button")[0]);
    expect(screen.getByText(/December 2026/)).toBeInTheDocument();

    const calendarButtons = screen
      .getAllByRole("button")
      .filter((b) => b.textContent?.trim() === "" && b.querySelector("svg"));
    fireEvent.click(calendarButtons[1]);
    expect(screen.getByText(/January 2027/)).toBeInTheDocument();
  });

  it("month view: prev year navigates backwards", () => {
    render(<DatePicker value="2026-03-15" onChange={() => {}} />);
    fireEvent.click(screen.getAllByRole("button")[0]);
    fireEvent.click(screen.getByText(/March 2026/));
    expect(screen.getByText("2026")).toBeInTheDocument();

    const yearNavButtons = screen
      .getAllByRole("button")
      .filter((b) => b.querySelector("svg") && !b.textContent);
    const prevYearBtn = yearNavButtons[0];
    fireEvent.click(prevYearBtn);
    expect(screen.getByText("2025")).toBeInTheDocument();
  });

  it("month view: next year navigates forwards", () => {
    render(<DatePicker value="2026-03-15" onChange={() => {}} />);
    fireEvent.click(screen.getAllByRole("button")[0]);
    fireEvent.click(screen.getByText(/March 2026/));
    expect(screen.getByText("2026")).toBeInTheDocument();

    const yearNavButtons = screen
      .getAllByRole("button")
      .filter((b) => b.querySelector("svg") && !b.textContent);
    const nextYearBtn = yearNavButtons[1];
    fireEvent.click(nextYearBtn);
    expect(screen.getByText("2027")).toBeInTheDocument();
  });

  it("click outside closes dropdown", () => {
    render(<DatePicker value="2026-03-15" onChange={() => {}} />);
    fireEvent.click(screen.getAllByRole("button")[0]);
    expect(screen.getByText(/March 2026/)).toBeInTheDocument();

    fireEvent.mouseDown(document.body);
    expect(screen.queryByText(/March 2026/)).not.toBeInTheDocument();
  });

  it("handles invalid date string gracefully", () => {
    render(<DatePicker value="not-a-date" onChange={() => {}} />);
    const now = new Date();
    const d = String(now.getDate()).padStart(2, "0");
    const m = String(now.getMonth() + 1).padStart(2, "0");
    expect(screen.getByText(`${d}.${m}.${now.getFullYear()}`)).toBeInTheDocument();
  });

  it("passes className to container", () => {
    const { container } = render(
      <DatePicker value="2026-03-15" onChange={() => {}} className="custom-class" />,
    );
    expect(container.firstElementChild).toHaveClass("custom-class");
  });

  it("re-opening picker resets to calendar view", () => {
    render(<DatePicker value="2026-03-15" onChange={() => {}} />);
    const trigger = screen.getAllByRole("button")[0];

    fireEvent.click(trigger);
    fireEvent.click(screen.getByText(/March 2026/));
    expect(screen.getByText("Jan")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.click(trigger);
    expect(screen.getByText(/March 2026/)).toBeInTheDocument();
    expect(screen.queryByText("2026")).not.toBeInTheDocument();
  });
});
