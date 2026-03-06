import { useRef, useEffect, useCallback } from "react";
import { Search, X, AlertCircle, Loader2, Clock } from "lucide-react";
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
  recentlyPinned: RedmineIssue[];
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
}

export function SearchPanel({
  pinnedIds,
  pinnedIssues,
  recentlyPinned,
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
}: Props) {
  const { t } = useI18n();
  const search = useIssueSearch();
  const inputRef = useRef<HTMLInputElement>(null);
  const hasAnyCriteria = !!(search.params.q || search.hasActiveFilters);
  const totalVisible = search.results.length;
  const selectedProjectId = search.params.project_id;

  // Fetch members + versions when project is selected
  useEffect(() => {
    if (!selectedProjectId) return;
    if (!membersByProject[selectedProjectId]) onFetchMembers(selectedProjectId);
    if (!versionsByProject[selectedProjectId]) onFetchVersions(selectedProjectId);
  }, [selectedProjectId, membersByProject, versionsByProject, onFetchMembers, onFetchVersions]);

  // Reset assignee + version when project changes
  const prevProjectRef = useRef(selectedProjectId);
  useEffect(() => {
    if (prevProjectRef.current !== selectedProjectId) {
      if (search.params.assigned_to_id) search.setParam("assigned_to_id", undefined);
      if (search.params.fixed_version_id) search.setParam("fixed_version_id", undefined);
      prevProjectRef.current = selectedProjectId;
    }
  }, [selectedProjectId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Global Cmd+K / Ctrl+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (search.params.q) {
          search.setParam("q", "");
        } else {
          inputRef.current?.blur();
        }
      }
    },
    [search],
  );

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
            <div className="search-panel__search-field">
              <Search size={20} className="search-icon" />
              <input
                ref={inputRef}
                type="text"
                placeholder={t.searchPlaceholder}
                aria-label={t.searchInputLabel}
                value={search.params.q || ""}
                onChange={(e) => search.setParam("q", e.target.value)}
                onKeyDown={handleInputKeyDown}
              />
              {search.params.q && (
                <button
                  onClick={() => {
                    search.setParam("q", "");
                    inputRef.current?.focus();
                  }}
                  className="ticket-toolbar__btn ticket-toolbar__btn--clear"
                  aria-label={t.clearSearchInput}
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

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
                      <Clock size={14} />
                      <span>{t.recentSearches}</span>
                      <button
                        className="search-panel__recent-clear"
                        onClick={search.clearRecent}
                        aria-label={t.clearRecentSearches}
                      >
                        {t.clearRecentSearches}
                      </button>
                    </div>
                    <div className="search-panel__recent-list">
                      {search.recentSearches.map((query) => (
                        <button
                          key={query}
                          className="search-panel__recent-item"
                          onClick={() => search.applyRecentSearch(query)}
                        >
                          <Search size={14} />
                          <span>{query}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <PinnedPreview
                  pinnedIssues={pinnedIssues}
                  recentlyPinned={recentlyPinned}
                  assignedIssues={assignedIssues}
                  pinnedIds={pinnedIds}
                  assignedIds={assignedIds}
                  redmineUrl={redmineUrl}
                  onTogglePin={onTogglePin}
                  onToggleAssignedPin={onToggleAssignedPin}
                  favoriteIssues={favoriteIssues}
                  favoriteIds={favoriteIds}
                  onToggleFavorite={onToggleFavorite}
                  onOpenBookDialog={onOpenBookDialog}
                />

                {pinnedIssues.length === 0 &&
                  recentlyPinned.filter((i) => !pinnedIds.has(i.id)).length === 0 &&
                  assignedIssues.length === 0 &&
                  favoriteIssues.length === 0 &&
                  search.recentSearches.length === 0 && (
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
                onTogglePin={onTogglePin}
                searchQuery={search.params.q}
                isFavorite={favoriteIds.has(issue.id)}
                onToggleFavorite={onToggleFavorite}
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
        </div>
      </div>
    </div>
  );
}
