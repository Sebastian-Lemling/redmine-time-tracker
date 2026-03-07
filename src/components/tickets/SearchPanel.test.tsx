import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@/test/test-utils";
import { SearchPanel } from "./SearchPanel";
import { createIssue } from "@/test/fixtures";

const mockSetParam = vi.fn();
const mockResetFilters = vi.fn();
const mockLoadMore = vi.fn();
const mockRetry = vi.fn();
const mockApplyRecentSearch = vi.fn();
const mockRemoveRecentSearch = vi.fn();
const mockClearRecent = vi.fn();

const defaultSearchReturn = {
  params: {} as Record<string, unknown>,
  setParam: mockSetParam,
  resetFilters: mockResetFilters,
  results: [] as ReturnType<typeof createIssue>[],
  totalCount: 0,
  loading: false,
  loadingMore: false,
  hasMore: false,
  loadMore: mockLoadMore,
  projects: [
    { id: 1, name: "Project Alpha" },
    { id: 2, name: "Project Beta" },
  ],
  priorities: [{ id: 1, name: "Normal" }],
  hasActiveFilters: false,
  error: null as string | null,
  retry: mockRetry,
  recentSearches: [] as string[],
  applyRecentSearch: mockApplyRecentSearch,
  removeRecentSearch: mockRemoveRecentSearch,
  clearRecent: mockClearRecent,
};

let searchOverrides: Partial<typeof defaultSearchReturn> = {};

vi.mock("../../hooks/useIssueSearch", () => ({
  useIssueSearch: () => ({ ...defaultSearchReturn, ...searchOverrides }),
  SORT_OPTIONS: [
    { value: "updated_on:desc", key: "sortUpdatedDesc" },
    { value: "priority:desc", key: "sortPriorityDesc" },
  ],
}));

function makeProps(overrides?: Record<string, unknown>) {
  return {
    pinnedIds: new Set<number>(),
    pinnedIssues: [] as ReturnType<typeof createIssue>[],

    assignedIds: new Set<number>(),
    assignedIssues: [] as ReturnType<typeof createIssue>[],
    onTogglePin: vi.fn(),
    onToggleAssignedPin: vi.fn(),
    statuses: [{ id: 1, name: "New", is_closed: false }],
    trackers: [{ id: 1, name: "Bug" }],
    redmineUrl: "http://redmine.test",
    membersByProject: {} as Record<number, { id: number; name: string }[]>,
    versionsByProject: {} as Record<number, { id: number; name: string }[]>,
    onFetchMembers: vi.fn(),
    onFetchVersions: vi.fn(),
    favoriteIssues: [] as ReturnType<typeof createIssue>[],
    favoriteIds: new Set<number>(),
    onToggleFavorite: vi.fn(),
    onOpenBookDialog: vi.fn(),
    onShowMessage: vi.fn(),
    ...overrides,
  };
}

function enterSearchMode() {
  const input = screen.getByPlaceholderText(/search|suche/i);
  fireEvent.focus(input);
}

describe("SearchPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    searchOverrides = {};
  });

  it("renders search input", () => {
    render(<SearchPanel {...makeProps()} />);
    expect(screen.getByRole("search")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/search|suche/i)).toBeInTheDocument();
  });

  it("shows filter chips only in search mode", () => {
    render(<SearchPanel {...makeProps()} />);
    expect(screen.queryByRole("toolbar")).not.toBeInTheDocument();
    enterSearchMode();
    expect(screen.getByRole("toolbar")).toBeInTheDocument();
  });

  it("typing in search input calls setParam with q", () => {
    render(<SearchPanel {...makeProps()} />);
    const input = screen.getByPlaceholderText(/search|suche/i);
    fireEvent.change(input, { target: { value: "test query" } });
    expect(mockSetParam).toHaveBeenCalledWith("q", "test query");
  });

  it("first Escape clears text but stays in search mode", () => {
    searchOverrides = { params: { q: "hello" } };
    render(<SearchPanel {...makeProps()} />);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(mockSetParam).toHaveBeenCalledWith("q", "");
  });

  it("Escape exits search mode when nothing to clear", () => {
    searchOverrides = { params: {} };
    render(<SearchPanel {...makeProps()} />);
    enterSearchMode();
    expect(screen.getByRole("toolbar")).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("toolbar")).not.toBeInTheDocument();
  });

  it("global Escape works regardless of focus target", () => {
    searchOverrides = { params: {} };
    render(<SearchPanel {...makeProps()} />);
    enterSearchMode();
    expect(screen.getByRole("toolbar")).toBeInTheDocument();
    // Fire on document body, not on input
    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(screen.queryByRole("toolbar")).not.toBeInTheDocument();
  });

  it("shows error message with retry button", () => {
    searchOverrides = { error: "Connection failed" };
    render(<SearchPanel {...makeProps()} />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Connection failed")).toBeInTheDocument();
    const retryBtn = screen.getByText(/retry|erneut/i);
    fireEvent.click(retryBtn);
    expect(mockRetry).toHaveBeenCalled();
  });

  it("shows loading skeletons when loading in search mode", () => {
    searchOverrides = { loading: true, results: [], params: { q: "test" } };
    const { container } = render(<SearchPanel {...makeProps()} />);
    expect(container.querySelectorAll(".search-result-skeleton").length).toBe(5);
  });

  it("shows no results message when search has criteria but empty results", () => {
    searchOverrides = { params: { q: "xyz" }, results: [], loading: false };
    render(<SearchPanel {...makeProps()} />);
    expect(screen.getByText(/no issues found|keine issues gefunden/i)).toBeInTheDocument();
  });

  it("shows search results", () => {
    const issue = createIssue({ id: 42, subject: "My Bug" });
    searchOverrides = { params: { q: "test" }, results: [issue], totalCount: 1 };
    render(<SearchPanel {...makeProps()} />);
    expect(screen.getByText("#42")).toBeInTheDocument();
    expect(screen.getByText("My Bug")).toBeInTheDocument();
  });

  it("shows footer with result count", () => {
    const issue = createIssue({ id: 42, subject: "My Bug" });
    searchOverrides = { params: { q: "bug" }, results: [issue], totalCount: 50, hasMore: true };
    render(<SearchPanel {...makeProps()} />);
    const loadMoreBtn = screen.getByLabelText(/load more|mehr laden/i);
    expect(loadMoreBtn).toBeInTheDocument();
    fireEvent.click(loadMoreBtn);
    expect(mockLoadMore).toHaveBeenCalled();
  });

  it("disables load more button when loading", () => {
    const issue = createIssue({ id: 42, subject: "My Bug" });
    searchOverrides = {
      params: { q: "bug" },
      results: [issue],
      totalCount: 50,
      hasMore: true,
      loading: true,
    };
    render(<SearchPanel {...makeProps()} />);
    const loadMoreBtn = screen.getByLabelText(/load more|mehr laden/i);
    expect(loadMoreBtn).toBeDisabled();
  });

  it("shows loading more spinner", () => {
    const issue = createIssue({ id: 42, subject: "My Bug" });
    searchOverrides = { params: { q: "bug" }, results: [issue], totalCount: 50, loadingMore: true };
    render(<SearchPanel {...makeProps()} />);
    expect(screen.getByText(/loading.*more|lade.*weitere/i)).toBeInTheDocument();
  });

  it("shows recent searches in search mode when no criteria", () => {
    searchOverrides = { recentSearches: ["old query", "another search"] };
    render(<SearchPanel {...makeProps()} />);
    expect(screen.queryByText("old query")).not.toBeInTheDocument();
    enterSearchMode();
    expect(screen.getByText("old query")).toBeInTheDocument();
    expect(screen.getByText("another search")).toBeInTheDocument();
  });

  it("clicking recent search applies it", () => {
    searchOverrides = { recentSearches: ["old query"] };
    render(<SearchPanel {...makeProps()} />);
    enterSearchMode();
    fireEvent.click(screen.getByText("old query"));
    expect(mockApplyRecentSearch).toHaveBeenCalledWith("old query");
  });

  it("shows clear recent searches button in search mode", () => {
    searchOverrides = { recentSearches: ["old query"] };
    render(<SearchPanel {...makeProps()} />);
    enterSearchMode();
    const clearBtn = screen.getByLabelText(/clear.*search.*history|suchverlauf.*leeren/i);
    fireEvent.click(clearBtn);
    expect(mockClearRecent).toHaveBeenCalled();
  });

  it("shows empty state in browse mode when nothing available", () => {
    const { container } = render(<SearchPanel {...makeProps()} />);
    expect(container.querySelector(".search-panel__empty")).toBeInTheDocument();
  });

  it("fetches members and versions when project is selected", () => {
    const onFetchMembers = vi.fn();
    const onFetchVersions = vi.fn();
    searchOverrides = { params: { project_id: 1 } };
    render(
      <SearchPanel
        {...makeProps({
          onFetchMembers,
          onFetchVersions,
        })}
      />,
    );
    expect(onFetchMembers).toHaveBeenCalledWith(1);
    expect(onFetchVersions).toHaveBeenCalledWith(1);
  });

  it("does not re-fetch members/versions when already loaded", () => {
    const onFetchMembers = vi.fn();
    const onFetchVersions = vi.fn();
    searchOverrides = { params: { project_id: 1 } };
    render(
      <SearchPanel
        {...makeProps({
          onFetchMembers,
          onFetchVersions,
          membersByProject: { 1: [{ id: 10, name: "Alice" }] },
          versionsByProject: { 1: [{ id: 20, name: "v1.0" }] },
        })}
      />,
    );
    expect(onFetchMembers).not.toHaveBeenCalled();
    expect(onFetchVersions).not.toHaveBeenCalled();
  });

  it("shows pinned issues in browse mode", () => {
    const pinnedIssue = createIssue({ id: 50, subject: "Pinned Bug" });
    render(
      <SearchPanel
        {...makeProps({
          pinnedIds: new Set([50]),
          pinnedIssues: [pinnedIssue],
        })}
      />,
    );
    expect(screen.getByText("Pinned Bug")).toBeInTheDocument();
  });

  it("Cmd+K focuses search input and activates search mode", () => {
    render(<SearchPanel {...makeProps()} />);
    const input = screen.getByPlaceholderText(/search|suche/i);
    fireEvent.keyDown(window, { key: "k", metaKey: true });
    expect(document.activeElement).toBe(input);
    expect(screen.getByRole("toolbar")).toBeInTheDocument();
  });

  it("Ctrl+K focuses search input and activates search mode", () => {
    render(<SearchPanel {...makeProps()} />);
    const input = screen.getByPlaceholderText(/search|suche/i);
    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    expect(document.activeElement).toBe(input);
    expect(screen.getByRole("toolbar")).toBeInTheDocument();
  });

  it("no back button in search mode", () => {
    render(<SearchPanel {...makeProps()} />);
    enterSearchMode();
    expect(screen.queryByLabelText(/close.*search|suche.*schließen/i)).not.toBeInTheDocument();
  });

  it("browse mode shows collections, not filters", () => {
    const pinnedIssue = createIssue({ id: 50, subject: "My Task" });
    render(
      <SearchPanel
        {...makeProps({
          pinnedIds: new Set([50]),
          pinnedIssues: [pinnedIssue],
        })}
      />,
    );
    expect(screen.queryByRole("toolbar")).not.toBeInTheDocument();
    expect(screen.getByText("My Task")).toBeInTheDocument();
  });

  it("pin toggle on search result calls onShowMessage", () => {
    const issue = createIssue({ id: 42, subject: "Test Issue" });
    searchOverrides = { params: { q: "test" }, results: [issue], totalCount: 1 };
    const props = makeProps();
    render(<SearchPanel {...props} />);
    fireEvent.click(screen.getByLabelText(/pin issue|anpinnen/i));
    expect(props.onShowMessage).toHaveBeenCalled();
  });

  it("favorite toggle on search result calls onShowMessage", () => {
    const issue = createIssue({ id: 42, subject: "Test Issue" });
    searchOverrides = { params: { q: "test" }, results: [issue], totalCount: 1 };
    const props = makeProps();
    render(<SearchPanel {...props} />);
    fireEvent.click(screen.getByLabelText(/favorit/i));
    expect(props.onShowMessage).toHaveBeenCalled();
  });

  it("shows Esc kbd hint in search mode", () => {
    render(<SearchPanel {...makeProps()} />);
    enterSearchMode();
    expect(screen.getByText("Esc")).toBeInTheDocument();
  });

  it("shows keyboard shortcut hint in browse mode", () => {
    render(<SearchPanel {...makeProps()} />);
    expect(screen.getByText("K")).toBeInTheDocument();
  });

  it("per-item remove button calls removeRecentSearch", () => {
    searchOverrides = { recentSearches: ["old query", "another"] };
    render(<SearchPanel {...makeProps()} />);
    enterSearchMode();
    const removeBtns = screen.getAllByLabelText(/remove|entfernen/i);
    fireEvent.click(removeBtns[0]);
    expect(mockRemoveRecentSearch).toHaveBeenCalledWith("old query");
  });
});
