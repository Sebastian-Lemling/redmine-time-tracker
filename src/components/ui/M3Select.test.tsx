import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { M3Select } from "@/components/ui/M3Select";

const options = [
  { value: "a", label: "Option A" },
  { value: "b", label: "Option B" },
  { value: "c", label: "Option C" },
];

describe("M3Select", () => {
  it("shows selected option label", () => {
    render(<M3Select label="Test" value="b" options={options} onChange={() => {}} />);
    expect(screen.getByText("Option B")).toBeInTheDocument();
  });

  it("click opens dropdown with all options", () => {
    render(<M3Select label="Test" value="a" options={options} onChange={() => {}} />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    expect(screen.getAllByRole("option")).toHaveLength(3);
  });

  it("click option calls onChange with value", () => {
    const onChange = vi.fn();
    render(<M3Select label="Test" value="a" options={options} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button"));
    fireEvent.click(screen.getByText("Option C"));
    expect(onChange).toHaveBeenCalledWith("c");
  });

  it("Escape closes dropdown", () => {
    render(<M3Select label="Test" value="a" options={options} onChange={() => {}} />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("click outside closes dropdown", () => {
    render(<M3Select label="Test" value="a" options={options} onChange={() => {}} />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("disabled state prevents opening", () => {
    render(<M3Select label="Test" value="a" options={options} onChange={() => {}} disabled />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("shows floating label", () => {
    render(<M3Select label="My Label" value="a" options={options} onChange={() => {}} />);
    expect(screen.getByText("My Label")).toBeInTheDocument();
  });

  it("scroll on window closes dropdown", () => {
    render(<M3Select label="Test" value="a" options={options} onChange={() => {}} />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    act(() => {
      const scrollEvent = new Event("scroll", { bubbles: false });
      window.dispatchEvent(scrollEvent);
    });
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("clicking the already-selected option does not call onChange but closes", () => {
    const onChange = vi.fn();
    render(<M3Select label="Test" value="a" options={options} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button"));
    const selectedOption = screen.getByRole("option", { selected: true });
    fireEvent.click(selectedOption);
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("shows empty string for unrecognized value", () => {
    render(<M3Select label="Test" value="unknown" options={options} onChange={() => {}} />);
    const valueSpan = document.querySelector(".m3-select__value");
    expect(valueSpan?.textContent).toBe("");
  });

  it("toggle: second click closes the dropdown", () => {
    render(<M3Select label="Test" value="a" options={options} onChange={() => {}} />);
    const button = screen.getByRole("button");
    fireEvent.click(button);
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    fireEvent.click(button);
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
});
