import { useMemo } from "react";
import type { RedmineIssue, MultiTimerMap } from "../../types/redmine";

const PROJECT_COLORS = [
  "#1a73e8",
  "#e8710a",
  "#0d652d",
  "#7b1fa2",
  "#c62828",
  "#00838f",
  "#4e342e",
  "#ad1457",
  "#0277bd",
  "#558b2f",
  "#6a1b9a",
  "#ef6c00",
];

function buildProjectColorMap(names: string[]): Record<string, string> {
  const sorted = [...names].sort();
  const map: Record<string, string> = {};
  for (let i = 0; i < sorted.length; i++) {
    map[sorted[i]] = PROJECT_COLORS[i % PROJECT_COLORS.length];
  }
  return map;
}

export { PROJECT_COLORS };

interface UseTicketGroupingOpts {
  issues: RedmineIssue[];
  timers: MultiTimerMap;
  showTrackedOnly: boolean;
  showFavoritesGroup?: boolean;
  favoriteIds?: Set<number>;
}

export function useTicketGrouping({
  issues,
  timers,
  showTrackedOnly,
  showFavoritesGroup,
  favoriteIds,
}: UseTicketGroupingOpts) {
  const filteredIssues = useMemo(
    () => (showTrackedOnly ? issues.filter((i) => !!timers[i.id]) : issues),
    [issues, timers, showTrackedOnly],
  );

  const { allProjectNames, colorMap, baseGrouped } = useMemo(() => {
    const baseGrouped = filteredIssues.reduce<Record<string, RedmineIssue[]>>((acc, issue) => {
      const key = issue.project.name;
      if (!acc[key]) acc[key] = [];
      acc[key].push(issue);
      return acc;
    }, {});
    const allProjectNames = Object.keys(baseGrouped).sort();
    const colorMap: Record<string, string> = buildProjectColorMap(allProjectNames);
    return { allProjectNames, colorMap, baseGrouped };
  }, [filteredIssues]);

  const grouped = useMemo(() => {
    if (!showFavoritesGroup || !favoriteIds || favoriteIds.size === 0) return baseGrouped;
    const favIssues = filteredIssues.filter((i) => favoriteIds.has(i.id));
    if (favIssues.length === 0) return {};
    return favIssues.reduce<Record<string, RedmineIssue[]>>((acc, issue) => {
      const key = issue.project.name;
      if (!acc[key]) acc[key] = [];
      acc[key].push(issue);
      return acc;
    }, {});
  }, [baseGrouped, filteredIssues, showFavoritesGroup, favoriteIds]);

  return { grouped, allProjectNames, colorMap };
}
