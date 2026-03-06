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
    onRefresh: vi.fn(),
    showFavoritesOnly: false,
    onToggleFavoritesOnly: vi.fn(),
    favoriteCount: 0,
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

  it("shows clear button when searchQuery is non-empty", () => {
    render(<TicketListToolbar {...makeProps({ searchQuery: "foo" })} />);
    const clearBtn = screen.getByTitle("Clear");
    expect(clearBtn).toBeInTheDocument();
  });

  it("hides clear button when searchQuery is empty", () => {
    render(<TicketListToolbar {...makeProps({ searchQuery: "" })} />);
    expect(screen.queryByTitle("Clear")).not.toBeInTheDocument();
  });

  it("clear button resets search", () => {
    const onSearchChange = vi.fn();
    render(<TicketListToolbar {...makeProps({ searchQuery: "foo", onSearchChange })} />);
    fireEvent.click(screen.getByTitle("Clear"));
    expect(onSearchChange).toHaveBeenCalledWith("");
  });

  it("refresh button calls onRefresh", () => {
    const onRefresh = vi.fn();
    render(<TicketListToolbar {...makeProps({ onRefresh })} />);
    fireEvent.click(screen.getByTitle(/aktualisieren|refresh/i));
    expect(onRefresh).toHaveBeenCalled();
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

      expect(alphaBtn.className).toContain("project-filter-badge--active");
      expect(betaBtn.className).not.toContain("project-filter-badge--active");
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

  describe("favorites group badge", () => {
    const twoProjects = {
      filterProjects: [
        { name: "Alpha", count: 3 },
        { name: "Beta", count: 5 },
      ],
      enabledProjects: new Set(["Alpha", "Beta"]),
      colorMap: { Alpha: "#4285f4", Beta: "#ea4335" },
      favoriteCount: 2,
      showFavoritesOnly: true,
    };

    it("project badges always call onToggleProject regardless of favorites state", () => {
      const onToggleProject = vi.fn();
      render(<TicketListToolbar {...makeProps({ ...twoProjects, onToggleProject })} />);
      fireEvent.click(screen.getByText("Beta"));
      expect(onToggleProject).toHaveBeenCalledWith("Beta");
    });

    it("'All' badge always calls onToggleAllProjects regardless of favorites state", () => {
      const onToggleAllProjects = vi.fn();
      render(<TicketListToolbar {...makeProps({ ...twoProjects, onToggleAllProjects })} />);
      fireEvent.click(screen.getByText(/^(Alle|All)\b/));
      expect(onToggleAllProjects).toHaveBeenCalled();
    });

    it("favorites badge calls onToggleFavoritesOnly", () => {
      const onToggleFavoritesOnly = vi.fn();
      render(<TicketListToolbar {...makeProps({ ...twoProjects, onToggleFavoritesOnly })} />);
      fireEvent.click(screen.getByText(/^(Favoriten|Favorites)\b/));
      expect(onToggleFavoritesOnly).toHaveBeenCalled();
    });
  });
});
