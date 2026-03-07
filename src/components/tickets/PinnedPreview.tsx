import { useState, useMemo } from "react";
import { Pin, Star } from "lucide-react";
import type { RedmineIssue } from "../../types/redmine";
import { SearchResultCard } from "./SearchResultCard";
import { useI18n } from "../../i18n/I18nContext";

interface Props {
  pinnedIssues: RedmineIssue[];
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

type Tab = "pinned" | "mytickets" | "favorites";

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

  const visibleTabs = useMemo(() => {
    const tabs: { key: Tab; label: string; count: number; icon?: typeof Star }[] = [];
    if (assignedIssues.length > 0)
      tabs.push({ key: "mytickets", label: t.myTickets, count: assignedIssues.length });
    if (pinnedIssues.length > 0)
      tabs.push({ key: "pinned", label: t.pinnedTickets, count: pinnedIssues.length });
    if (favoriteIssues.length > 0)
      tabs.push({ key: "favorites", label: t.favorites, count: favoriteIssues.length, icon: Star });
    return tabs;
  }, [assignedIssues.length, pinnedIssues.length, favoriteIssues.length, t]);

  const defaultTab = visibleTabs[0]?.key ?? "mytickets";
  const [pinnedTab, setPinnedTab] = useState<Tab>(defaultTab);
  const activeTab = visibleTabs.some((tab) => tab.key === pinnedTab) ? pinnedTab : defaultTab;

  if (visibleTabs.length === 0) return null;

  return (
    <div className="search-panel__pinned-preview">
      <div className="search-panel__pinned-preview-header">
        <Pin size={14} />
        {visibleTabs.map((tab) => (
          <button
            key={tab.key}
            className={`search-panel__pinned-tab${activeTab === tab.key ? " search-panel__pinned-tab--active" : ""}`}
            onClick={() => setPinnedTab(tab.key)}
          >
            {tab.icon && <tab.icon size={12} />}
            {tab.label}
            <span className="search-panel__pinned-preview-count">{tab.count}</span>
          </button>
        ))}
      </div>

      <div className="search-panel__pinned-scroll">
        {activeTab === "pinned" &&
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
                  hideProjectName
                />
              ))}
            </div>
          ))}

        {activeTab === "mytickets" &&
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
                  hideProjectName
                  hideAssignedHint
                />
              ))}
            </div>
          ))}

        {activeTab === "favorites" &&
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
                  hideProjectName
                  hidePinButton
                />
              ))}
            </div>
          ))}
      </div>
    </div>
  );
}
