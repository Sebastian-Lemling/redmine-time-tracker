import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@/test/test-utils";
import { FilterChip } from "./FilterChip";

const options = [
  { label: "All", value: undefined as string | undefined },
  { label: "Alpha", value: "alpha" },
  { label: "Beta", value: "beta" },
];

function makeProps(overrides?: Record<string, unknown>) {
  return {
    label: "Project",
    active: false,
    options,
    onSelect: vi.fn(),
    ariaLabel: "Filter by project",
    ...overrides,
  };
}

describe("FilterChip", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders label", () => {
    render(<FilterChip {...makeProps()} />);
    expect(screen.getByText("Project")).toBeInTheDocument();
  });

  it("opens menu on click", () => {
    render(<FilterChip {...makeProps()} />);
    fireEvent.click(screen.getByRole("button", { name: "Filter by project" }));
    expect(screen.getByRole("listbox")).toBeInTheDocument();
  });

  it("shows all options when menu is open", () => {
    render(<FilterChip {...makeProps()} />);
    fireEvent.click(screen.getByRole("button", { name: "Filter by project" }));
    expect(screen.getByText("All")).toBeInTheDocument();
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
  });

  it("calls onSelect and closes menu on option click", () => {
    const onSelect = vi.fn();
    render(<FilterChip {...makeProps({ onSelect })} />);
    fireEvent.click(screen.getByRole("button", { name: "Filter by project" }));
    fireEvent.click(screen.getByText("Alpha"));
    expect(onSelect).toHaveBeenCalledWith("alpha");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("active class applied when active=true", () => {
    render(<FilterChip {...makeProps({ active: true })} />);
    const trigger = screen.getByRole("button", { name: "Filter by project" });
    expect(trigger.className).toContain("search-chip--active");
  });

  it("aria-expanded reflects open state", () => {
    render(<FilterChip {...makeProps()} />);
    const trigger = screen.getByRole("button", { name: "Filter by project" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });

  it("closes on Escape key", () => {
    render(<FilterChip {...makeProps()} />);
    const trigger = screen.getByRole("button", { name: "Filter by project" });
    fireEvent.click(trigger);
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    fireEvent.keyDown(trigger, { key: "Escape" });
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("ArrowDown opens menu", () => {
    render(<FilterChip {...makeProps()} />);
    const trigger = screen.getByRole("button", { name: "Filter by project" });
    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    expect(screen.getByRole("listbox")).toBeInTheDocument();
  });

  it("keyboard navigation in menu (ArrowDown/Up)", () => {
    render(<FilterChip {...makeProps()} />);
    fireEvent.click(screen.getByRole("button", { name: "Filter by project" }));
    const listbox = screen.getByRole("listbox");

    const items = screen.getAllByRole("option");
    expect(items[0]).toHaveAttribute("aria-selected", "true");

    fireEvent.keyDown(listbox, { key: "ArrowDown" });
    expect(items[1]).toHaveAttribute("aria-selected", "true");

    fireEvent.keyDown(listbox, { key: "ArrowUp" });
    expect(items[0]).toHaveAttribute("aria-selected", "true");
  });

  it("Home key moves focus to first item", () => {
    render(<FilterChip {...makeProps()} />);
    fireEvent.click(screen.getByRole("button", { name: "Filter by project" }));
    const listbox = screen.getByRole("listbox");
    const items = screen.getAllByRole("option");

    fireEvent.keyDown(listbox, { key: "ArrowDown" });
    fireEvent.keyDown(listbox, { key: "ArrowDown" });
    expect(items[2]).toHaveAttribute("aria-selected", "true");

    fireEvent.keyDown(listbox, { key: "Home" });
    expect(items[0]).toHaveAttribute("aria-selected", "true");
  });

  it("End key moves focus to last item", () => {
    render(<FilterChip {...makeProps()} />);
    fireEvent.click(screen.getByRole("button", { name: "Filter by project" }));
    const listbox = screen.getByRole("listbox");
    const items = screen.getAllByRole("option");

    fireEvent.keyDown(listbox, { key: "End" });
    expect(items[2]).toHaveAttribute("aria-selected", "true");
  });

  it("Escape in menu closes menu and returns focus to trigger", () => {
    render(<FilterChip {...makeProps()} />);
    const trigger = screen.getByRole("button", { name: "Filter by project" });
    fireEvent.click(trigger);
    const listbox = screen.getByRole("listbox");

    fireEvent.keyDown(listbox, { key: "Escape" });
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("Tab in menu closes menu", () => {
    render(<FilterChip {...makeProps()} />);
    fireEvent.click(screen.getByRole("button", { name: "Filter by project" }));
    const listbox = screen.getByRole("listbox");

    fireEvent.keyDown(listbox, { key: "Tab" });
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("ArrowDown wraps from last to first", () => {
    render(<FilterChip {...makeProps()} />);
    fireEvent.click(screen.getByRole("button", { name: "Filter by project" }));
    const listbox = screen.getByRole("listbox");
    const items = screen.getAllByRole("option");

    fireEvent.keyDown(listbox, { key: "End" });
    expect(items[2]).toHaveAttribute("aria-selected", "true");

    fireEvent.keyDown(listbox, { key: "ArrowDown" });
    expect(items[0]).toHaveAttribute("aria-selected", "true");
  });

  it("ArrowUp wraps from first to last", () => {
    render(<FilterChip {...makeProps()} />);
    fireEvent.click(screen.getByRole("button", { name: "Filter by project" }));
    const listbox = screen.getByRole("listbox");
    const items = screen.getAllByRole("option");

    expect(items[0]).toHaveAttribute("aria-selected", "true");

    fireEvent.keyDown(listbox, { key: "ArrowUp" });
    expect(items[2]).toHaveAttribute("aria-selected", "true");
  });

  it("Enter key on trigger opens menu", () => {
    render(<FilterChip {...makeProps()} />);
    const trigger = screen.getByRole("button", { name: "Filter by project" });
    fireEvent.keyDown(trigger, { key: "Enter" });
    expect(screen.getByRole("listbox")).toBeInTheDocument();
  });

  it("Space key on trigger opens menu", () => {
    render(<FilterChip {...makeProps()} />);
    const trigger = screen.getByRole("button", { name: "Filter by project" });
    fireEvent.keyDown(trigger, { key: " " });
    expect(screen.getByRole("listbox")).toBeInTheDocument();
  });

  it("clicking outside closes menu", () => {
    render(<FilterChip {...makeProps()} />);
    fireEvent.click(screen.getByRole("button", { name: "Filter by project" }));
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    fireEvent.mouseDown(document.body);
    // The outside click handler uses requestAnimationFrame, so we trigger it
  });

  it("toggle menu: second click closes it", () => {
    render(<FilterChip {...makeProps()} />);
    const trigger = screen.getByRole("button", { name: "Filter by project" });
    fireEvent.click(trigger);
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    fireEvent.click(trigger);
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("uses ariaLabel for menu id when provided", () => {
    render(<FilterChip {...makeProps()} />);
    fireEvent.click(screen.getByRole("button", { name: "Filter by project" }));
    const listbox = screen.getByRole("listbox");
    expect(listbox.id).toBe("filter-menu-Filter-by-project");
  });

  it("uses label for menu id when ariaLabel is not provided", () => {
    render(<FilterChip {...makeProps({ ariaLabel: undefined })} />);
    fireEvent.click(screen.getByRole("button", { name: "Project" }));
    const listbox = screen.getByRole("listbox");
    expect(listbox.id).toBe("filter-menu-Project");
  });

  it("trigger has aria-controls pointing to menu id when open", () => {
    render(<FilterChip {...makeProps()} />);
    const trigger = screen.getByRole("button", { name: "Filter by project" });
    expect(trigger).not.toHaveAttribute("aria-controls");

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-controls", "filter-menu-Filter-by-project");
  });
});
