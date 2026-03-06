import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@/test/test-utils";
import { FilterChipBar } from "./FilterChipBar";
import type { useIssueSearch } from "../../hooks/useIssueSearch";

function makeSearch(
  overrides?: Partial<ReturnType<typeof useIssueSearch>>,
): ReturnType<typeof useIssueSearch> {
  return {
    params: {},
    setParam: vi.fn(),
    resetFilters: vi.fn(),
    results: [],
    totalCount: 0,
    loading: false,
    loadingMore: false,
    hasMore: false,
    loadMore: vi.fn(),
    projects: [
      { id: 1, name: "Project Alpha" },
      { id: 2, name: "Project Beta" },
    ],
    priorities: [
      { id: 1, name: "Low" },
      { id: 2, name: "Normal" },
      { id: 3, name: "High" },
    ],
    hasActiveFilters: false,
    error: null,
    retry: vi.fn(),
    recentSearches: [],
    applyRecentSearch: vi.fn(),
    clearRecent: vi.fn(),
    ...overrides,
  };
}

function makeProps(overrides?: Record<string, unknown>) {
  return {
    search: makeSearch(),
    statuses: [
      { id: 1, name: "New", is_closed: false },
      { id: 2, name: "In Progress", is_closed: false },
    ],
    trackers: [
      { id: 1, name: "Bug" },
      { id: 2, name: "Feature" },
    ],
    membersByProject: {} as Record<number, { id: number; name: string }[]>,
    versionsByProject: {} as Record<number, { id: number; name: string }[]>,
    ...overrides,
  };
}

describe("FilterChipBar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders with toolbar role", () => {
    render(<FilterChipBar {...makeProps()} />);
    expect(screen.getByRole("toolbar")).toBeInTheDocument();
  });

  it("renders project filter chip showing 'All Projects' when none selected", () => {
    render(<FilterChipBar {...makeProps()} />);
    expect(screen.getByText(/all projects|alle projekte/i)).toBeInTheDocument();
  });

  it("renders status filter chip", () => {
    render(<FilterChipBar {...makeProps()} />);
    expect(screen.getByText(/all statuses|alle status/i)).toBeInTheDocument();
  });

  it("renders priority filter chip", () => {
    render(<FilterChipBar {...makeProps()} />);
    expect(screen.getByText(/all priorities|alle priorit/i)).toBeInTheDocument();
  });

  it("renders tracker filter chip", () => {
    render(<FilterChipBar {...makeProps()} />);
    expect(screen.getByText(/all trackers|alle tracker/i)).toBeInTheDocument();
  });

  it("renders sort chip", () => {
    render(<FilterChipBar {...makeProps()} />);
    expect(screen.getByLabelText(/sort/i)).toBeInTheDocument();
  });

  it("shows selected project name when project_id is set", () => {
    const search = makeSearch({
      params: { project_id: 1 },
    });
    render(<FilterChipBar {...makeProps({ search })} />);
    expect(screen.getByText("Project Alpha")).toBeInTheDocument();
  });

  it("shows version and assignee chips when project is selected", () => {
    const search = makeSearch({
      params: { project_id: 1 },
    });
    const props = makeProps({
      search,
      membersByProject: { 1: [{ id: 10, name: "Alice" }] },
      versionsByProject: { 1: [{ id: 20, name: "v1.0" }] },
    });
    render(<FilterChipBar {...props} />);
    expect(screen.getByText(/all versions|alle versionen/i)).toBeInTheDocument();
    expect(screen.getByText(/all assignees|alle bearbeiter/i)).toBeInTheDocument();
  });

  it("does not show version/assignee chips when no project selected", () => {
    render(<FilterChipBar {...makeProps()} />);
    expect(screen.queryByText(/all versions|alle versionen/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/all assignees|alle bearbeiter/i)).not.toBeInTheDocument();
  });

  it("shows selected status name when status_id is set", () => {
    const search = makeSearch({
      params: { status_id: "2" },
    });
    render(<FilterChipBar {...makeProps({ search })} />);
    expect(screen.getByText("In Progress")).toBeInTheDocument();
  });

  it("shows selected tracker name when tracker_id is set", () => {
    const search = makeSearch({
      params: { tracker_id: 1 },
    });
    render(<FilterChipBar {...makeProps({ search })} />);
    expect(screen.getByText("Bug")).toBeInTheDocument();
  });

  it("shows selected priority name when priority_id is set", () => {
    const search = makeSearch({
      params: { priority_id: 3 },
    });
    render(<FilterChipBar {...makeProps({ search })} />);
    expect(screen.getByText("High")).toBeInTheDocument();
  });

  it("shows clear filters button when hasActiveFilters is true", () => {
    const search = makeSearch({
      params: { status_id: "1" },
      hasActiveFilters: true,
    });
    render(<FilterChipBar {...makeProps({ search })} />);
    expect(screen.getByLabelText(/clear filters|filter zurücksetzen/i)).toBeInTheDocument();
  });

  it("does not show clear filters button when no active filters", () => {
    render(<FilterChipBar {...makeProps()} />);
    expect(screen.queryByLabelText(/clear filters|filter zurücksetzen/i)).not.toBeInTheDocument();
  });

  it("clicking clear filters calls resetFilters", () => {
    const search = makeSearch({
      params: { status_id: "1", tracker_id: 2 },
      hasActiveFilters: true,
    });
    render(<FilterChipBar {...makeProps({ search })} />);
    fireEvent.click(screen.getByLabelText(/clear filters|filter zurücksetzen/i));
    expect(search.resetFilters).toHaveBeenCalled();
  });

  it("displays active filter count in clear button", () => {
    const search = makeSearch({
      params: { status_id: "1", tracker_id: 2, priority_id: 3 },
      hasActiveFilters: true,
    });
    render(<FilterChipBar {...makeProps({ search })} />);
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("applies dense class when chip count >= 8", () => {
    const search = makeSearch({
      params: { project_id: 1 },
      hasActiveFilters: true,
    });
    const { container } = render(<FilterChipBar {...makeProps({ search })} />);
    // project selected = 7 chips + clear = 8 chips → dense
    expect(container.querySelector(".search-panel__filters--dense")).toBeInTheDocument();
  });

  it("applies compact class when chip count >= 6 but < 8", () => {
    const search = makeSearch({
      params: { project_id: 1 },
      hasActiveFilters: false,
    });
    const { container } = render(<FilterChipBar {...makeProps({ search })} />);
    // project selected = 7 chips, no clear = 7 → compact
    expect(container.querySelector(".search-panel__filters--compact")).toBeInTheDocument();
  });

  it("no size class when chip count < 6", () => {
    const { container } = render(<FilterChipBar {...makeProps()} />);
    // no project = 5 chips → no special class
    expect(container.querySelector(".search-panel__filters--dense")).not.toBeInTheDocument();
    expect(container.querySelector(".search-panel__filters--compact")).not.toBeInTheDocument();
  });

  it("shows selected version name when fixed_version_id is set", () => {
    const search = makeSearch({
      params: { project_id: 1, fixed_version_id: 20 },
    });
    render(
      <FilterChipBar
        {...makeProps({
          search,
          versionsByProject: { 1: [{ id: 20, name: "v2.0" }] },
        })}
      />,
    );
    expect(screen.getByText("v2.0")).toBeInTheDocument();
  });

  it("shows selected assignee name when assigned_to_id is set", () => {
    const search = makeSearch({
      params: { project_id: 1, assigned_to_id: "10" },
    });
    render(
      <FilterChipBar
        {...makeProps({
          search,
          membersByProject: { 1: [{ id: 10, name: "Bob" }] },
        })}
      />,
    );
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });

  it("falls back to label text when selected ID not found in list", () => {
    const search = makeSearch({
      params: { status_id: "999" },
    });
    render(<FilterChipBar {...makeProps({ search })} />);
    // Falls back to "All Statuses" since 999 is not in statuses list
    expect(screen.getByText(/all statuses|alle status/i)).toBeInTheDocument();
  });

  it("sort chip is not active when sort is default (updated_on:desc)", () => {
    const search = makeSearch({
      params: { sort: "updated_on:desc" },
    });
    render(<FilterChipBar {...makeProps({ search })} />);
    const sortChip = screen.getByLabelText(/sort/i);
    expect(sortChip.className).not.toContain("search-chip--active");
  });

  it("sort chip is active when sort is non-default", () => {
    const search = makeSearch({
      params: { sort: "priority:desc" },
    });
    render(<FilterChipBar {...makeProps({ search })} />);
    const sortChip = screen.getByLabelText(/sort/i);
    expect(sortChip.className).toContain("search-chip--active");
  });

  it("selecting an assignee option calls setParam with assigned_to_id", () => {
    const search = makeSearch({
      params: { project_id: 1 },
    });
    const props = makeProps({
      search,
      membersByProject: {
        1: [
          { id: 10, name: "Alice" },
          { id: 11, name: "Bob" },
        ],
      },
    });
    render(<FilterChipBar {...props} />);
    const assigneeChip = screen.getByLabelText(/assignee|bearbeiter/i);
    fireEvent.click(assigneeChip);
    const aliceOption = screen.getByRole("option", { name: "Alice" });
    fireEvent.click(aliceOption);
    expect(search.setParam).toHaveBeenCalledWith("assigned_to_id", "10");
  });

  it("selecting a status option calls setParam with status_id", () => {
    const search = makeSearch();
    render(<FilterChipBar {...makeProps({ search })} />);
    const statusChip = screen.getByLabelText(/filter.*status/i);
    fireEvent.click(statusChip);
    const option = screen.getByRole("option", { name: "In Progress" });
    fireEvent.click(option);
    expect(search.setParam).toHaveBeenCalledWith("status_id", "2");
  });

  it("selecting a priority option calls setParam with priority_id", () => {
    const search = makeSearch();
    render(<FilterChipBar {...makeProps({ search })} />);
    const priorityChip = screen.getByLabelText(/filter.*priorit/i);
    fireEvent.click(priorityChip);
    const option = screen.getByRole("option", { name: "High" });
    fireEvent.click(option);
    expect(search.setParam).toHaveBeenCalledWith("priority_id", 3);
  });

  it("selecting a tracker option calls setParam with tracker_id", () => {
    const search = makeSearch();
    render(<FilterChipBar {...makeProps({ search })} />);
    const trackerChip = screen.getByLabelText(/filter.*tracker/i);
    fireEvent.click(trackerChip);
    const option = screen.getByRole("option", { name: "Feature" });
    fireEvent.click(option);
    expect(search.setParam).toHaveBeenCalledWith("tracker_id", 2);
  });

  it("selecting a sort option calls setParam with sort", () => {
    const search = makeSearch();
    render(<FilterChipBar {...makeProps({ search })} />);
    const sortChip = screen.getByLabelText(/sort/i);
    fireEvent.click(sortChip);
    const listbox = screen.getByRole("listbox");
    const options = listbox.querySelectorAll("[role='option']");
    fireEvent.click(options[1]);
    expect(search.setParam).toHaveBeenCalledWith("sort", expect.any(String));
  });

  it("selecting a version option calls setParam with fixed_version_id", () => {
    const search = makeSearch({
      params: { project_id: 1 },
    });
    const props = makeProps({
      search,
      versionsByProject: {
        1: [
          { id: 20, name: "v1.0" },
          { id: 21, name: "v2.0" },
        ],
      },
    });
    render(<FilterChipBar {...props} />);
    const versionChip = screen.getByLabelText(/version/i);
    fireEvent.click(versionChip);
    const option = screen.getByRole("option", { name: "v2.0" });
    fireEvent.click(option);
    expect(search.setParam).toHaveBeenCalledWith("fixed_version_id", 21);
  });

  it("selecting a project option calls setParam with project_id", () => {
    const search = makeSearch();
    render(<FilterChipBar {...makeProps({ search })} />);
    const projectChip = screen.getByLabelText(/project|projekt/i);
    fireEvent.click(projectChip);
    const option = screen.getByRole("option", { name: "Project Beta" });
    fireEvent.click(option);
    expect(search.setParam).toHaveBeenCalledWith("project_id", 2);
  });

  it("falls back to label for version when fixed_version_id not found", () => {
    const search = makeSearch({
      params: { project_id: 1, fixed_version_id: 999 },
    });
    render(
      <FilterChipBar
        {...makeProps({
          search,
          versionsByProject: { 1: [{ id: 20, name: "v1.0" }] },
        })}
      />,
    );
    expect(screen.getByText(/target version|zielversion/i)).toBeInTheDocument();
  });

  it("falls back to label for assignee when assigned_to_id not found", () => {
    const search = makeSearch({
      params: { project_id: 1, assigned_to_id: "999" },
    });
    render(
      <FilterChipBar
        {...makeProps({
          search,
          membersByProject: { 1: [{ id: 10, name: "Alice" }] },
        })}
      />,
    );
    expect(screen.getByText(/assignee|bearbeiter/i)).toBeInTheDocument();
  });

  it("falls back to label for tracker when tracker_id not found", () => {
    const search = makeSearch({
      params: { tracker_id: 999 },
    });
    render(<FilterChipBar {...makeProps({ search })} />);
    expect(screen.getByText(/all trackers|alle tracker/i)).toBeInTheDocument();
  });

  it("falls back to label for priority when priority_id not found", () => {
    const search = makeSearch({
      params: { priority_id: 999 },
    });
    render(<FilterChipBar {...makeProps({ search })} />);
    expect(screen.getByText(/all priorities|alle priorit/i)).toBeInTheDocument();
  });
});
