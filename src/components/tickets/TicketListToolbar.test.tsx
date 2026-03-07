import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@/test/test-utils";
import { TicketListToolbar } from "./TicketListToolbar";

function makeProps(overrides?: Record<string, unknown>) {
  return {
    searchQuery: "",
    onSearchChange: vi.fn(),
    filterProjects: [{ name: "Alpha", count: 3 }],
    enabledProjects: new Set(["Alpha"]),
    onToggleProject: vi.fn(),
    colorMap: { Alpha: "#4285f4" } as Record<string, string>,
    onToggleAllProjects: vi.fn(),
    showTrackedOnly: false,
    onToggleTrackedOnly: vi.fn(),
    allExpanded: true,
    onToggleAll: vi.fn(),
    showFavoritesOnly: false,
    onToggleFavoritesOnly: vi.fn(),
    ...overrides,
  };
}

describe("TicketListToolbar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders search input", () => {
    render(<TicketListToolbar {...makeProps()} />);
    expect(screen.getByPlaceholderText(/ticket|suchen/i)).toBeInTheDocument();
  });

  it("calls onSearchChange when typing", () => {
    const onSearchChange = vi.fn();
    render(<TicketListToolbar {...makeProps({ onSearchChange })} />);
    const input = screen.getByPlaceholderText(/ticket|suchen/i);
    fireEvent.change(input, { target: { value: "bug" } });
    expect(onSearchChange).toHaveBeenCalledWith("bug");
  });

  it("shows Esc kbd when searchQuery is non-empty", () => {
    render(<TicketListToolbar {...makeProps({ searchQuery: "foo" })} />);
    expect(screen.getByText("Esc")).toBeInTheDocument();
  });

  it("shows shortcut hint when searchQuery is empty", () => {
    render(<TicketListToolbar {...makeProps({ searchQuery: "" })} />);
    expect(screen.getByText("O")).toBeInTheDocument();
  });

  it("Esc kbd clears search on click", () => {
    const onSearchChange = vi.fn();
    render(<TicketListToolbar {...makeProps({ searchQuery: "foo", onSearchChange })} />);
    fireEvent.mouseDown(screen.getByText("Esc"));
    expect(onSearchChange).toHaveBeenCalledWith("");
  });

  it("star button calls onToggleFavoritesOnly", () => {
    const onToggleFavoritesOnly = vi.fn();
    render(<TicketListToolbar {...makeProps({ onToggleFavoritesOnly })} />);
    fireEvent.click(screen.getByTitle(/favorit|favorites/i));
    expect(onToggleFavoritesOnly).toHaveBeenCalled();
  });

  it("star button is highlighted when showFavoritesOnly is true", () => {
    render(<TicketListToolbar {...makeProps({ showFavoritesOnly: true })} />);
    const btn = screen.getByTitle(/favorit|favorites/i);
    expect(btn.style.color).toBe("var(--color-star, #f9ab00)");
  });

  it("tracked-only button calls onToggleTrackedOnly", () => {
    const onToggleTrackedOnly = vi.fn();
    render(<TicketListToolbar {...makeProps({ onToggleTrackedOnly })} />);
    fireEvent.click(screen.getByTitle(/nur getrackte tickets|tracked tickets only/i));
    expect(onToggleTrackedOnly).toHaveBeenCalled();
  });

  it("collapse/expand button calls onToggleAll", () => {
    const onToggleAll = vi.fn();
    render(<TicketListToolbar {...makeProps({ onToggleAll })} />);
    fireEvent.click(screen.getByTitle(/alle aufklappen|alle zuklappen|expand all|collapse all/i));
    expect(onToggleAll).toHaveBeenCalled();
  });

  describe("project filter badges", () => {
    it("renders badges when more than 1 project", () => {
      const filterProjects = [
        { name: "Alpha", count: 3 },
        { name: "Beta", count: 5 },
      ];
      const enabledProjects = new Set(["Alpha", "Beta"]);
      const colorMap = { Alpha: "#4285f4", Beta: "#ea4335" };

      render(<TicketListToolbar {...makeProps({ filterProjects, enabledProjects, colorMap })} />);

      expect(screen.getByText("Alpha")).toBeInTheDocument();
      expect(screen.getByText("Beta")).toBeInTheDocument();
    });

    it("badges show project name and count", () => {
      const filterProjects = [
        { name: "Alpha", count: 3 },
        { name: "Beta", count: 5 },
      ];
      const enabledProjects = new Set(["Alpha", "Beta"]);
      const colorMap = { Alpha: "#4285f4", Beta: "#ea4335" };

      render(<TicketListToolbar {...makeProps({ filterProjects, enabledProjects, colorMap })} />);

      expect(screen.getByText("3")).toBeInTheDocument();
      expect(screen.getByText("5")).toBeInTheDocument();
    });

    it("click badge calls onToggleProject with project name", () => {
      const onToggleProject = vi.fn();
      const filterProjects = [
        { name: "Alpha", count: 3 },
        { name: "Beta", count: 5 },
      ];
      const enabledProjects = new Set(["Alpha", "Beta"]);
      const colorMap = { Alpha: "#4285f4", Beta: "#ea4335" };

      render(
        <TicketListToolbar
          {...makeProps({ filterProjects, enabledProjects, colorMap, onToggleProject })}
        />,
      );

      fireEvent.click(screen.getByText("Beta"));
      expect(onToggleProject).toHaveBeenCalledWith("Beta");
    });

    it("active badge has active class, inactive does not", () => {
      const filterProjects = [
        { name: "Alpha", count: 3 },
        { name: "Beta", count: 5 },
      ];
      const enabledProjects = new Set(["Alpha"]);
      const colorMap = { Alpha: "#4285f4", Beta: "#ea4335" };

      render(<TicketListToolbar {...makeProps({ filterProjects, enabledProjects, colorMap })} />);

      const alphaBtn = screen.getByText("Alpha").closest("button")!;
      const betaBtn = screen.getByText("Beta").closest("button")!;

      expect(alphaBtn.className).toContain("filter-chip--active");
      expect(betaBtn.className).not.toContain("filter-chip--active");
    });

    it("'All' badge calls onToggleAllProjects", () => {
      const onToggleAllProjects = vi.fn();
      const filterProjects = [
        { name: "Alpha", count: 3 },
        { name: "Beta", count: 5 },
      ];
      const enabledProjects = new Set(["Alpha", "Beta"]);
      const colorMap = { Alpha: "#4285f4", Beta: "#ea4335" };

      render(
        <TicketListToolbar
          {...makeProps({ filterProjects, enabledProjects, colorMap, onToggleAllProjects })}
        />,
      );

      const allBadge = screen.getByText(/^(Alle|All)\b/);
      fireEvent.click(allBadge);
      expect(onToggleAllProjects).toHaveBeenCalled();
    });

    it("hides badge bar when only 1 project", () => {
      render(<TicketListToolbar {...makeProps()} />);
      expect(screen.queryByText(/^(Alle|All)\b/)).not.toBeInTheDocument();
    });
  });

  describe("favorites mode", () => {
    it("shows fav-header instead of filter chips when showFavoritesOnly is true", () => {
      const filterProjects = [
        { name: "Alpha", count: 3 },
        { name: "Beta", count: 5 },
      ];
      const enabledProjects = new Set(["Alpha", "Beta"]);
      const colorMap = { Alpha: "#4285f4", Beta: "#ea4335" };

      const { container } = render(
        <TicketListToolbar
          {...makeProps({ filterProjects, enabledProjects, colorMap, showFavoritesOnly: true })}
        />,
      );

      expect(container.querySelector(".ticket-layout__fav-header")).toBeInTheDocument();
      expect(container.querySelector(".project-filter-bar")).not.toBeInTheDocument();
    });

    it("shows filter chips when showFavoritesOnly is false", () => {
      const filterProjects = [
        { name: "Alpha", count: 3 },
        { name: "Beta", count: 5 },
      ];
      const enabledProjects = new Set(["Alpha", "Beta"]);
      const colorMap = { Alpha: "#4285f4", Beta: "#ea4335" };

      const { container } = render(
        <TicketListToolbar
          {...makeProps({ filterProjects, enabledProjects, colorMap, showFavoritesOnly: false })}
        />,
      );

      expect(container.querySelector(".project-filter-bar")).toBeInTheDocument();
      expect(container.querySelector(".ticket-layout__fav-header")).not.toBeInTheDocument();
    });

    it("fav-header contains favorites label", () => {
      const filterProjects = [
        { name: "Alpha", count: 3 },
        { name: "Beta", count: 5 },
      ];
      const enabledProjects = new Set(["Alpha", "Beta"]);
      const colorMap = { Alpha: "#4285f4", Beta: "#ea4335" };

      render(
        <TicketListToolbar
          {...makeProps({ filterProjects, enabledProjects, colorMap, showFavoritesOnly: true })}
        />,
      );

      expect(screen.getByText(/favorit/i)).toBeInTheDocument();
    });
  });
});
