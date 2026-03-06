import { useState } from "react";
import { Pin, Star } from "lucide-react";
import type { RedmineIssue } from "../../types/redmine";
import { SearchResultCard } from "./SearchResultCard";
import { useI18n } from "../../i18n/I18nContext";

interface Props {
  pinnedIssues: RedmineIssue[];
  recentlyPinned: RedmineIssue[];
  assignedIssues: RedmineIssue[];
  pinnedIds: Set<number>;
  assignedIds: Set<number>;
  redmineUrl: string;
  onTogglePin: (issue: RedmineIssue) => void;
  onToggleAssignedPin: (issue: RedmineIssue) => void;
  favoriteIssues: RedmineIssue[];
  favoriteIds: Set<number>;
  onToggleFavorite: (issue: RedmineIssue) => void;
  onOpenBookDialog: (issue: RedmineIssue) => void;
}

function groupByProject(issues: RedmineIssue[]): [string, RedmineIssue[]][] {
  return Object.entries(
    issues.reduce<Record<string, RedmineIssue[]>>((acc, issue) => {
      const key = issue.project.name;
      if (!acc[key]) acc[key] = [];
      acc[key].push(issue);
      return acc;
    }, {}),
  ).sort(([a], [b]) => a.localeCompare(b));
}

export function PinnedPreview({
  pinnedIssues,
  recentlyPinned,
  assignedIssues,
  pinnedIds,
  assignedIds,
  redmineUrl,
  onTogglePin,
  onToggleAssignedPin,
  favoriteIssues,
  favoriteIds,
  onToggleFavorite,
  onOpenBookDialog,
}: Props) {
  const { t } = useI18n();
  const [pinnedTab, setPinnedTab] = useState<"pinned" | "recent" | "mytickets" | "favorites">(
    "pinned",
  );
  const unpinnedRecent = recentlyPinned.filter((i) => !pinnedIds.has(i.id));

  if (
    pinnedIssues.length === 0 &&
    unpinnedRecent.length === 0 &&
    assignedIssues.length === 0 &&
    favoriteIssues.length === 0
  )
    return null;

  return (
    <div className="search-panel__pinned-preview">
      <div className="search-panel__pinned-preview-header">
        <Pin size={14} />
        <button
          className={`search-panel__pinned-tab${pinnedTab === "pinned" ? " search-panel__pinned-tab--active" : ""}`}
          onClick={() => setPinnedTab("pinned")}
        >
          {t.pinnedTickets}
          {pinnedIssues.length > 0 && (
            <span className="search-panel__pinned-preview-count">{pinnedIssues.length}</span>
          )}
        </button>
        <button
          className={`search-panel__pinned-tab${pinnedTab === "recent" ? " search-panel__pinned-tab--active" : ""}`}
          onClick={() => setPinnedTab("recent")}
        >
          {t.recentlyPinned}
          {unpinnedRecent.length > 0 && (
            <span className="search-panel__pinned-preview-count">{unpinnedRecent.length}</span>
          )}
        </button>
        <button
          className={`search-panel__pinned-tab${pinnedTab === "mytickets" ? " search-panel__pinned-tab--active" : ""}`}
          onClick={() => setPinnedTab("mytickets")}
        >
          {t.myTickets}
          {assignedIssues.length > 0 && (
            <span className="search-panel__pinned-preview-count">{assignedIssues.length}</span>
          )}
        </button>
        <button
          className={`search-panel__pinned-tab${pinnedTab === "favorites" ? " search-panel__pinned-tab--active" : ""}`}
          onClick={() => setPinnedTab("favorites")}
        >
          <Star size={12} />
          {t.favorites}
          {favoriteIssues.length > 0 && (
            <span className="search-panel__pinned-preview-count">{favoriteIssues.length}</span>
          )}
        </button>
      </div>

      {pinnedTab === "pinned" &&
        pinnedIssues.length > 0 &&
        groupByProject(pinnedIssues).map(([projectName, issues]) => (
          <div key={projectName} className="search-panel__pinned-group">
            <div className="search-panel__pinned-group-name">{projectName}</div>
            {issues.map((issue) => (
              <SearchResultCard
                key={issue.id}
                issue={issue}
                isPinned={true}
                isAssigned={assignedIds.has(issue.id)}
                redmineUrl={redmineUrl}
                onTogglePin={onTogglePin}
                isFavorite={favoriteIds.has(issue.id)}
                onToggleFavorite={onToggleFavorite}
                onBookTime={onOpenBookDialog}
              />
            ))}
          </div>
        ))}

      {pinnedTab === "pinned" && pinnedIssues.length === 0 && (
        <div className="search-panel__empty" style={{ padding: "24px 16px" }}>
          <p>{t.noSearchResults}</p>
        </div>
      )}

      {pinnedTab === "recent" &&
        unpinnedRecent.length > 0 &&
        groupByProject(unpinnedRecent).map(([projectName, issues]) => (
          <div key={projectName} className="search-panel__pinned-group">
            <div className="search-panel__pinned-group-name">{projectName}</div>
            {issues.map((issue) => (
              <SearchResultCard
                key={issue.id}
                issue={issue}
                isPinned={false}
                isAssigned={assignedIds.has(issue.id)}
                redmineUrl={redmineUrl}
                onTogglePin={onTogglePin}
                isFavorite={favoriteIds.has(issue.id)}
                onToggleFavorite={onToggleFavorite}
                onBookTime={onOpenBookDialog}
              />
            ))}
          </div>
        ))}

      {pinnedTab === "mytickets" &&
        assignedIssues.length > 0 &&
        groupByProject(assignedIssues).map(([projectName, issues]) => (
          <div key={projectName} className="search-panel__pinned-group">
            <div className="search-panel__pinned-group-name">{projectName}</div>
            {issues.map((issue) => (
              <SearchResultCard
                key={issue.id}
                issue={issue}
                isPinned={pinnedIds.has(issue.id)}
                isAssigned={true}
                redmineUrl={redmineUrl}
                onTogglePin={onToggleAssignedPin}
                isFavorite={favoriteIds.has(issue.id)}
                onToggleFavorite={onToggleFavorite}
                onBookTime={onOpenBookDialog}
              />
            ))}
          </div>
        ))}

      {pinnedTab === "favorites" &&
        favoriteIssues.length > 0 &&
        groupByProject(favoriteIssues).map(([projectName, issues]) => (
          <div key={projectName} className="search-panel__pinned-group">
            <div className="search-panel__pinned-group-name">{projectName}</div>
            {issues.map((issue) => (
              <SearchResultCard
                key={issue.id}
                issue={issue}
                isPinned={pinnedIds.has(issue.id)}
                isAssigned={assignedIds.has(issue.id)}
                redmineUrl={redmineUrl}
                onTogglePin={onTogglePin}
                isFavorite={true}
                onToggleFavorite={onToggleFavorite}
                onBookTime={onOpenBookDialog}
              />
            ))}
          </div>
        ))}

      {pinnedTab === "favorites" && favoriteIssues.length === 0 && (
        <div className="search-panel__empty" style={{ padding: "24px 16px" }}>
          <p>{t.noFavorites}</p>
        </div>
      )}
    </div>
  );
}
