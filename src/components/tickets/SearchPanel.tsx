import { useRef, useEffect, useCallback, useState, useMemo } from "react";
import { Search, AlertCircle, Loader2, X } from "lucide-react";
import type {
  RedmineIssue,
  RedmineStatus,
  RedmineTracker,
  RedmineMember,
  RedmineVersion,
} from "../../types/redmine";
import { useIssueSearch } from "../../hooks/useIssueSearch";
import { useI18n } from "../../i18n/I18nContext";
import { SearchResultCard } from "./SearchResultCard";
import { FilterChipBar } from "./FilterChipBar";
import { PinnedPreview } from "./PinnedPreview";

interface Props {
  pinnedIds: Set<number>;
  pinnedIssues: RedmineIssue[];
  assignedIds: Set<number>;
  assignedIssues: RedmineIssue[];
  onTogglePin: (issue: RedmineIssue) => void;
  onToggleAssignedPin: (issue: RedmineIssue) => void;
  statuses: RedmineStatus[];
  trackers: RedmineTracker[];
  redmineUrl: string;
  membersByProject: Record<number, RedmineMember[]>;
  versionsByProject: Record<number, RedmineVersion[]>;
  onFetchMembers: (projectId: number) => void;
  onFetchVersions: (projectId: number) => void;
  favoriteIssues: RedmineIssue[];
  favoriteIds: Set<number>;
  onToggleFavorite: (issue: RedmineIssue) => void;
  onOpenBookDialog: (issue: RedmineIssue) => void;
  onShowMessage: (msg: string) => void;
}

export function SearchPanel({
  pinnedIds,
  pinnedIssues,
  assignedIds,
  assignedIssues,
  onTogglePin,
  onToggleAssignedPin,
  statuses,
  trackers,
  redmineUrl,
  membersByProject,
  versionsByProject,
  onFetchMembers,
  onFetchVersions,
  favoriteIssues,
  favoriteIds,
  onToggleFavorite,
  onOpenBookDialog,
  onShowMessage,
}: Props) {
  const { t } = useI18n();
  const search = useIssueSearch();
  const inputRef = useRef<HTMLInputElement>(null);
  const [searchActive, setSearchActive] = useState(false);

  const handleTogglePin = useMemo(
    () => (issue: RedmineIssue) => {
      const wasPinned = pinnedIds.has(issue.id);
      onTogglePin(issue);
      onShowMessage(wasPinned ? t.issueUnpinned(issue.id) : t.issuePinned(issue.id));
    },
    [pinnedIds, onTogglePin, onShowMessage, t],
  );

  const handleToggleAssignedPin = useMemo(
    () => (issue: RedmineIssue) => {
      const wasPinned = pinnedIds.has(issue.id);
      onToggleAssignedPin(issue);
      onShowMessage(wasPinned ? t.issueUnpinned(issue.id) : t.issuePinned(issue.id));
    },
    [pinnedIds, onToggleAssignedPin, onShowMessage, t],
  );

  const handleToggleFavorite = useMemo(
    () => (issue: RedmineIssue) => {
      const wasFavorite = favoriteIds.has(issue.id);
      onToggleFavorite(issue);
      onShowMessage(wasFavorite ? t.issueUnfavorited(issue.id) : t.issueFavorited(issue.id));
    },
    [favoriteIds, onToggleFavorite, onShowMessage, t],
  );

  const isSearchMode = searchActive || !!search.params.q || search.hasActiveFilters;
  const hasAnyCriteria = !!(search.params.q || search.hasActiveFilters);
  const totalVisible = search.results.length;
  const selectedProjectId = search.params.project_id;

  useEffect(() => {
    if (!selectedProjectId) return;
    if (!membersByProject[selectedProjectId]) onFetchMembers(selectedProjectId);
    if (!versionsByProject[selectedProjectId]) onFetchVersions(selectedProjectId);
  }, [selectedProjectId, membersByProject, versionsByProject, onFetchMembers, onFetchVersions]);

  const prevProjectRef = useRef(selectedProjectId);
  useEffect(() => {
    if (prevProjectRef.current !== selectedProjectId) {
      if (search.params.assigned_to_id) search.setParam("assigned_to_id", undefined);
      if (search.params.fixed_version_id) search.setParam("fixed_version_id", undefined);
      prevProjectRef.current = selectedProjectId;
    }
  }, [selectedProjectId]); // eslint-disable-line react-hooks/exhaustive-deps

  const exitSearch = useCallback(() => {
    setSearchActive(false);
    if (search.params.q) search.setParam("q", "");
    if (search.hasActiveFilters) search.resetFilters();
    inputRef.current?.blur();
  }, [search]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchActive(true);
        inputRef.current?.focus();
        inputRef.current?.select();
        return;
      }
      if (e.key === "Escape" && isSearchMode) {
        e.preventDefault();
        const hasContent = !!(search.params.q || search.hasActiveFilters);
        if (hasContent) {
          if (search.params.q) search.setParam("q", "");
          if (search.hasActiveFilters) search.resetFilters();
          inputRef.current?.focus();
        } else {
          exitSearch();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isSearchMode, search, exitSearch]);

  return (
    <div className="side-panel">
      <div className="side-panel__container">
        <div className="search-panel" role="search" aria-label={t.searchInputLabel}>
          {search.error && (
            <div className="search-panel__error" role="alert">
              <AlertCircle size={16} />
              <span>{search.error}</span>
              <button onClick={search.retry} className="search-panel__error-retry">
                {t.retrySearch}
              </button>
            </div>
          )}

          <div className="search-panel__header">
            <div
              className={`search-panel__search-field${isSearchMode ? " search-panel__search-field--active" : ""}`}
            >
              <Search size={20} className="search-icon" aria-hidden="true" />
              <input
                ref={inputRef}
                type="text"
                placeholder={t.searchPlaceholder}
                aria-label={t.searchInputLabel}
                value={search.params.q || ""}
                onChange={(e) => search.setParam("q", e.target.value)}
                onFocus={() => setSearchActive(true)}
                onBlur={() => {
                  if (!search.params.q && !search.hasActiveFilters) setSearchActive(false);
                }}
              />
              {isSearchMode ? (
                <kbd className="search-panel__kbd-hint" onClick={exitSearch}>
                  Esc
                </kbd>
              ) : (
                <span className="search-panel__kbd-group">
                  {/Mac|iPhone|iPad/.test(navigator.userAgent) ? (
                    <>
                      <kbd className="search-panel__kbd-hint">⌘</kbd>
                      <kbd className="search-panel__kbd-hint">K</kbd>
                    </>
                  ) : (
                    <>
                      <kbd className="search-panel__kbd-hint">Ctrl</kbd>
                      <kbd className="search-panel__kbd-hint">K</kbd>
                    </>
                  )}
                </span>
              )}
            </div>
          </div>

          {isSearchMode ? (
            <>
              <FilterChipBar
                search={search}
                statuses={statuses}
                trackers={trackers}
                membersByProject={membersByProject}
                versionsByProject={versionsByProject}
              />

              <div
                className="search-panel__results"
                aria-busy={search.loading}
                aria-label={t.searchResults(totalVisible, search.totalCount)}
              >
                <div className="sr-only" aria-live="polite" aria-atomic="true">
                  {hasAnyCriteria && !search.loading && t.resultsFound(totalVisible)}
                </div>

                {search.loading && search.results.length === 0 && (
                  <div aria-hidden="true">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="search-result-skeleton">
                        <div className="search-result-skeleton__check" />
                        <div className="search-result-skeleton__lines">
                          <div className="search-result-skeleton__line" />
                          <div className="search-result-skeleton__line search-result-skeleton__line--short" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {!hasAnyCriteria && !search.loading && search.results.length === 0 && (
                  <>
                    {search.recentSearches.length > 0 && (
                      <div className="search-panel__recent">
                        <div className="search-panel__recent-header">
                          <span>{t.recentSearches}</span>
                          <button
                            className="search-panel__recent-clear"
                            onClick={search.clearRecent}
                            aria-label={t.clearRecentSearches}
                          >
                            {t.clearRecentSearches}
                          </button>
                        </div>
                        <ul
                          className="search-panel__recent-list"
                          role="listbox"
                          aria-label={t.recentSearches}
                        >
                          {search.recentSearches.map((query) => (
                            <li
                              key={query}
                              role="option"
                              aria-selected={false}
                              className="search-panel__recent-item"
                              onClick={() => search.applyRecentSearch(query)}
                            >
                              <Search size={15} aria-hidden="true" />
                              <span>{query}</span>
                              <button
                                className="search-panel__recent-remove"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  search.removeRecentSearch(query);
                                }}
                                aria-label={t.removeRecentSearch}
                              >
                                <X size={14} />
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {search.recentSearches.length === 0 && (
                      <div className="search-panel__empty">
                        <Search size={40} strokeWidth={1.5} />
                        <p>{t.searchPrompt}</p>
                      </div>
                    )}
                  </>
                )}

                {hasAnyCriteria && !search.loading && search.results.length === 0 && (
                  <div className="search-panel__empty">
                    <p>{t.noSearchResults}</p>
                  </div>
                )}

                {search.results.map((issue) => (
                  <SearchResultCard
                    key={issue.id}
                    issue={issue}
                    isPinned={pinnedIds.has(issue.id)}
                    isAssigned={assignedIds.has(issue.id)}
                    redmineUrl={redmineUrl}
                    onTogglePin={handleTogglePin}
                    searchQuery={search.params.q}
                    isFavorite={favoriteIds.has(issue.id)}
                    onToggleFavorite={handleToggleFavorite}
                    onBookTime={onOpenBookDialog}
                  />
                ))}

                {search.loadingMore && (
                  <div className="search-panel__loading-more" aria-live="polite">
                    <Loader2 size={16} className="search-panel__spinner" />
                    <span>{t.loadingMoreResults}</span>
                  </div>
                )}
              </div>

              {search.results.length > 0 && (
                <div className="search-panel__footer">
                  <span>{t.searchResults(search.results.length, search.totalCount)}</span>
                  {search.hasMore && (
                    <>
                      <span>·</span>
                      <button
                        onClick={search.loadMore}
                        disabled={search.loading || search.loadingMore}
                        aria-label={t.loadMore}
                      >
                        {t.loadMore}
                      </button>
                    </>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="search-panel__browse">
              <PinnedPreview
                pinnedIssues={pinnedIssues}
                assignedIssues={assignedIssues}
                pinnedIds={pinnedIds}
                assignedIds={assignedIds}
                redmineUrl={redmineUrl}
                onTogglePin={handleTogglePin}
                onToggleAssignedPin={handleToggleAssignedPin}
                favoriteIssues={favoriteIssues}
                favoriteIds={favoriteIds}
                onToggleFavorite={handleToggleFavorite}
                onOpenBookDialog={onOpenBookDialog}
              />

              {pinnedIssues.length === 0 && assignedIssues.length === 0 && (
                <div className="search-panel__empty">
                  <Search size={40} strokeWidth={1.5} />
                  <p>{t.searchPrompt}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
