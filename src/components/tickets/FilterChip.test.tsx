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
    expect(trigger.className).toContain("filter-chip--active");
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
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("keyboard navigation in menu (ArrowDown/Up)", () => {
    render(<FilterChip {...makeProps()} />);
    fireEvent.click(screen.getByRole("button", { name: "Filter by project" }));

    const items = screen.getAllByRole("option");
    // Initially no highlight
    expect(items[0]).toHaveAttribute("aria-selected", "false");

    fireEvent.keyDown(document, { key: "ArrowDown" });
    expect(items[0]).toHaveAttribute("aria-selected", "true");

    fireEvent.keyDown(document, { key: "ArrowDown" });
    expect(items[1]).toHaveAttribute("aria-selected", "true");

    fireEvent.keyDown(document, { key: "ArrowUp" });
    expect(items[0]).toHaveAttribute("aria-selected", "true");
  });

  it("Enter key selects highlighted item", () => {
    const onSelect = vi.fn();
    render(<FilterChip {...makeProps({ onSelect })} />);
    fireEvent.click(screen.getByRole("button", { name: "Filter by project" }));

    fireEvent.keyDown(document, { key: "ArrowDown" });
    fireEvent.keyDown(document, { key: "ArrowDown" });
    fireEvent.keyDown(document, { key: "Enter" });

    expect(onSelect).toHaveBeenCalledWith("alpha");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("ArrowDown wraps from last to first", () => {
    render(<FilterChip {...makeProps()} />);
    fireEvent.click(screen.getByRole("button", { name: "Filter by project" }));
    const items = screen.getAllByRole("option");

    fireEvent.keyDown(document, { key: "ArrowDown" }); // 0
    fireEvent.keyDown(document, { key: "ArrowDown" }); // 1
    fireEvent.keyDown(document, { key: "ArrowDown" }); // 2
    expect(items[2]).toHaveAttribute("aria-selected", "true");

    fireEvent.keyDown(document, { key: "ArrowDown" }); // wrap to 0
    expect(items[0]).toHaveAttribute("aria-selected", "true");
  });

  it("ArrowUp wraps from first to last", () => {
    render(<FilterChip {...makeProps()} />);
    fireEvent.click(screen.getByRole("button", { name: "Filter by project" }));
    const items = screen.getAllByRole("option");

    fireEvent.keyDown(document, { key: "ArrowDown" }); // 0
    fireEvent.keyDown(document, { key: "ArrowUp" }); // wrap to last
    expect(items[2]).toHaveAttribute("aria-selected", "true");
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
    expect(document.getElementById("filter-menu-Filter-by-project")).toBeInTheDocument();
  });

  it("uses label for menu id when ariaLabel is not provided", () => {
    render(<FilterChip {...makeProps({ ariaLabel: undefined })} />);
    fireEvent.click(screen.getByRole("button", { name: "Project" }));
    expect(document.getElementById("filter-menu-Project")).toBeInTheDocument();
  });

  it("trigger has aria-controls pointing to menu id when open", () => {
    render(<FilterChip {...makeProps()} />);
    const trigger = screen.getByRole("button", { name: "Filter by project" });
    expect(trigger).not.toHaveAttribute("aria-controls");

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-controls", "filter-menu-Filter-by-project");
  });

  it("renders with chip-menu__list class (portal dropdown)", () => {
    render(<FilterChip {...makeProps()} />);
    fireEvent.click(screen.getByRole("button", { name: "Filter by project" }));
    const menu = document.getElementById("filter-menu-Filter-by-project");
    expect(menu?.className).toContain("chip-menu__list");
  });

  it("renders items with chip-menu__item class", () => {
    render(<FilterChip {...makeProps()} />);
    fireEvent.click(screen.getByRole("button", { name: "Filter by project" }));
    const items = screen.getAllByRole("option");
    expect(items[0].className).toContain("chip-menu__item");
  });

  describe("searchable", () => {
    const manyOptions = [
      { label: "All", value: "" },
      { label: "Alpha", value: "alpha" },
      { label: "Beta", value: "beta" },
      { label: "Gamma", value: "gamma" },
      { label: "Delta", value: "delta" },
      { label: "Epsilon", value: "epsilon" },
      { label: "Zeta", value: "zeta" },
    ];

    it("shows search input when options >= threshold", () => {
      render(<FilterChip {...makeProps({ options: manyOptions })} />);
      fireEvent.click(screen.getByRole("button", { name: "Filter by project" }));
      expect(document.querySelector(".chip-menu__search-input")).toBeInTheDocument();
    });

    it("does not show search input when options < threshold", () => {
      render(<FilterChip {...makeProps()} />);
      fireEvent.click(screen.getByRole("button", { name: "Filter by project" }));
      expect(document.querySelector(".chip-menu__search-input")).not.toBeInTheDocument();
    });

    it("filters options by text input", () => {
      render(<FilterChip {...makeProps({ options: manyOptions })} />);
      fireEvent.click(screen.getByRole("button", { name: "Filter by project" }));

      const input = document.querySelector(".chip-menu__search-input") as HTMLInputElement;
      fireEvent.change(input, { target: { value: "alp" } });

      const items = screen.getAllByRole("option");
      expect(items).toHaveLength(1);
      expect(items[0]).toHaveTextContent("Alpha");
    });

    it("shows no-results message when filter matches nothing", () => {
      render(<FilterChip {...makeProps({ options: manyOptions })} />);
      fireEvent.click(screen.getByRole("button", { name: "Filter by project" }));

      const input = document.querySelector(".chip-menu__search-input") as HTMLInputElement;
      fireEvent.change(input, { target: { value: "zzz" } });

      expect(screen.queryAllByRole("option")).toHaveLength(0);
      expect(document.querySelector(".chip-menu__no-results")).toBeInTheDocument();
    });

    it("search is case insensitive", () => {
      render(<FilterChip {...makeProps({ options: manyOptions })} />);
      fireEvent.click(screen.getByRole("button", { name: "Filter by project" }));

      const input = document.querySelector(".chip-menu__search-input") as HTMLInputElement;
      fireEvent.change(input, { target: { value: "BETA" } });

      const items = screen.getAllByRole("option");
      expect(items).toHaveLength(1);
      expect(items[0]).toHaveTextContent("Beta");
    });

    it("resets filter text when reopening", () => {
      render(<FilterChip {...makeProps({ options: manyOptions })} />);
      const trigger = screen.getByRole("button", { name: "Filter by project" });

      fireEvent.click(trigger);
      const input = document.querySelector(".chip-menu__search-input") as HTMLInputElement;
      fireEvent.change(input, { target: { value: "alp" } });
      expect(screen.getAllByRole("option")).toHaveLength(1);

      // Close and reopen
      fireEvent.keyDown(document, { key: "Escape" });
      fireEvent.click(trigger);
      expect(screen.getAllByRole("option")).toHaveLength(7);
    });

    it("can be explicitly disabled with searchable=false", () => {
      render(<FilterChip {...makeProps({ options: manyOptions, searchable: false })} />);
      fireEvent.click(screen.getByRole("button", { name: "Filter by project" }));
      expect(document.querySelector(".chip-menu__search-input")).not.toBeInTheDocument();
    });
  });
});
