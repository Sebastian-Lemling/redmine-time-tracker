import { useState, useMemo, useCallback } from "react";
import { Star } from "lucide-react";
import { safeGet, safeSet } from "@/lib/storage";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  MeasuringStrategy,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type {
  RedmineIssue,
  RedmineStatus,
  RedmineTracker,
  RedmineMember,
  RedmineVersion,
  RedmineJournal,
  MultiTimerMap,
} from "../../types/redmine";
import { TicketListToolbar } from "./TicketListToolbar";
import { DragOverlayHeader } from "./ProjectGroupHeader";
import { PlainProjectGroup, SortableProjectGroup } from "./ProjectGroup";
import { useTicketGrouping, PROJECT_COLORS } from "./useTicketGrouping";
import { useProjectOrder } from "./useProjectOrder";
import { useEnabledProjects } from "./useEnabledProjects";
import { ActiveTimer } from "../timelog";
import { useI18n } from "../../i18n/I18nContext";

interface Props {
  instanceId: string;
  issues: RedmineIssue[];
  timers: MultiTimerMap;
  activeId: number | null;
  elapsedMap: Record<number, number>;
  loading: boolean;
  statuses: RedmineStatus[];
  trackers: RedmineTracker[];
  trackersByProject: Record<number, RedmineTracker[]>;
  allowedStatusesByIssue: Record<number, RedmineStatus[]>;
  onFetchProjectTrackers: (projectId: number) => void;
  onFetchAllowedStatuses: (issueId: number) => void;
  membersByProject: Record<number, RedmineMember[]>;
  versionsByProject: Record<number, RedmineVersion[]>;
  onStatusChange: (issueId: number, statusId: number) => void;
  onTrackerChange: (issueId: number, trackerId: number) => void;
  onAssigneeChange: (issueId: number, assigneeId: number) => void;
  onVersionChange: (issueId: number, versionId: number) => void;
  onDoneRatioChange: (issueId: number, doneRatio: number) => void;
  onFetchMembers: (projectId: number) => void;
  onFetchVersions: (projectId: number) => void;
  onPlay: (issue: RedmineIssue) => void;
  onPause: () => void;
  onSave: (issueId: number) => void;
  onDiscard: (issueId: number) => void;
  onAdjust: (issueId: number, deltaSec: number) => void;
  redmineUrl: string;
  onOpenBookDialog: (issue: RedmineIssue) => void;
  issueComments: Record<number, RedmineJournal[]>;
  onOpenConversation?: (issueId: number, tab?: "description" | "comments") => void;
  pinnedIds?: Set<number>;
  onTogglePin?: (issue: RedmineIssue) => void;
  favoriteIds?: Set<number>;
  favoriteIssues?: RedmineIssue[];
  onToggleFavorite?: (issue: RedmineIssue) => void;
}

export function TicketList({
  instanceId,
  issues,
  timers,
  activeId,
  elapsedMap,
  loading,
  statuses,
  trackers,
  trackersByProject,
  allowedStatusesByIssue,
  onFetchProjectTrackers,
  onFetchAllowedStatuses,
  membersByProject,
  versionsByProject,
  redmineUrl,
  onStatusChange,
  onTrackerChange,
  onAssigneeChange,
  onVersionChange,
  onDoneRatioChange,
  onFetchMembers,
  onFetchVersions,
  onPlay,
  onPause,
  onSave,
  onDiscard,
  onAdjust,
  onOpenBookDialog,
  issueComments,
  onOpenConversation,
  pinnedIds,
  onTogglePin,
  favoriteIds,
  favoriteIssues,
}: Props) {
  const { t } = useI18n();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [showTrackedOnly, setShowTrackedOnly] = useState(false);
  const [showFavoritesGroup, setShowFavoritesGroup] = useState(() =>
    safeGet(`show-favorites-group-${instanceId}`, false),
  );

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const { grouped, allProjectNames, colorMap } = useTicketGrouping({
    issues,
    timers,
    showTrackedOnly,
    showFavoritesGroup,
    favoriteIds,
    favoriteIssues,
  });
  const { projectOrder, dragActiveId, handleDragStart, handleDragEnd } = useProjectOrder(
    allProjectNames,
    instanceId,
  );
  const {
    enabledProjects,
    toggle: toggleProject,
    toggleAll: toggleAllProjects,
  } = useEnabledProjects(allProjectNames, instanceId);

  const filteredProjectNames = useMemo(() => {
    if (showFavoritesGroup) {
      return Object.keys(grouped).sort();
    }
    return projectOrder.filter((name) => enabledProjects.has(name) && grouped[name]);
  }, [projectOrder, enabledProjects, grouped, showFavoritesGroup]);

  const filterProjects = useMemo(
    () => allProjectNames.map((name) => ({ name, count: grouped[name]?.length ?? 0 })),
    [allProjectNames, grouped],
  );

  const searchFiltered = useMemo(() => {
    if (!searchQuery.trim()) return grouped;
    const q = searchQuery.toLowerCase();
    const result: Record<string, RedmineIssue[]> = {};
    for (const name of filteredProjectNames) {
      const matches = grouped[name]?.filter(
        (issue) =>
          issue.subject.toLowerCase().includes(q) ||
          String(issue.id).includes(q) ||
          issue.project.name.toLowerCase().includes(q),
      );
      if (matches?.length) result[name] = matches;
    }
    return result;
  }, [searchQuery, grouped, filteredProjectNames]);

  const isSearching = !!searchQuery.trim();
  const displayProjectNames = isSearching
    ? Object.keys(searchFiltered).sort()
    : filteredProjectNames;

  const toggle = (name: string) => setCollapsed((prev) => ({ ...prev, [name]: !prev[name] }));

  const allExpanded = filteredProjectNames.every((name) => !collapsed[name]);
  const toggleAll = useCallback(() => {
    if (allExpanded) {
      setCollapsed(Object.fromEntries(filteredProjectNames.map((n) => [n, true])));
    } else {
      setCollapsed({});
    }
  }, [allExpanded, filteredProjectNames]);

  const handleToggleAllProjects = useCallback(() => {
    toggleAllProjects(allProjectNames);
  }, [toggleAllProjects, allProjectNames]);

  const groupProps = {
    colorMap,
    grouped,
    searchFiltered,
    searchQuery,
    collapsed,
    toggle,
    timers,
    activeTimerId: activeId,
    elapsedMap,
    statuses,
    trackers,
    trackersByProject,
    allowedStatusesByIssue,
    onFetchProjectTrackers,
    onFetchAllowedStatuses,
    membersByProject,
    versionsByProject,
    redmineUrl,
    onStatusChange,
    onTrackerChange,
    onAssigneeChange,
    onVersionChange,
    onDoneRatioChange,
    onFetchMembers,
    onFetchVersions,
    onPlay,
    onPause,
    onSave,
    onDiscard,
    onAdjust,
    onOpenBookDialog,
    issueComments,
    onOpenConversation,
    pinnedIds,
    onTogglePin: showFavoritesGroup ? undefined : onTogglePin,
    showFavoritesGroup,
  };

  return (
    <div className="ticket-layout animate-fade-in">
      <div className="ticket-layout__container">
        <TicketListToolbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          filterProjects={filterProjects}
          enabledProjects={enabledProjects}
          onToggleProject={toggleProject}
          colorMap={colorMap}
          onToggleAllProjects={handleToggleAllProjects}
          showTrackedOnly={showTrackedOnly}
          onToggleTrackedOnly={() => setShowTrackedOnly((v) => !v)}
          showFavoritesOnly={showFavoritesGroup}
          onToggleFavoritesOnly={() =>
            setShowFavoritesGroup((v) => {
              safeSet(`show-favorites-group-${instanceId}`, !v);
              return !v;
            })
          }
          allExpanded={allExpanded}
          onToggleAll={toggleAll}
        />

        {allProjectNames.length === 0 && !loading && (
          <div className="py-12 text-center">
            <p className="md-body-medium text-on-surface-variant">{t.noPinnedTickets}</p>
            <p className="text-on-surface-variant mt-2 text-xs">{t.openSearch}</p>
          </div>
        )}

        {showFavoritesGroup && displayProjectNames.length === 0 && (
          <div className="py-12 text-center">
            <Star
              size={32}
              className="mx-auto mb-4"
              style={{ color: "var(--color-star, #f9ab00)", opacity: 0.4 }}
            />
            <p className="md-body-medium" style={{ color: "var(--color-on-surface-variant)" }}>
              {isSearching ? t.noSearchResults : t.noFavorites}
            </p>
            {!isSearching && (
              <p
                style={{
                  color: "var(--color-on-surface-variant)",
                  marginTop: "8px",
                  fontSize: "12px",
                }}
              >
                {t.starATicketToAdd}
              </p>
            )}
          </div>
        )}

        {isSearching ? (
          <div className="ticket-layout__body">
            {displayProjectNames.map((name, i) => (
              <PlainProjectGroup key={name} name={name} index={i} {...groupProps} />
            ))}
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={(e) => handleDragStart(e, collapsed, filteredProjectNames, setCollapsed)}
            onDragEnd={(e) => handleDragEnd(e, setCollapsed)}
            measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
          >
            <SortableContext items={displayProjectNames} strategy={verticalListSortingStrategy}>
              <div className="ticket-layout__body">
                {displayProjectNames.map((name, i) => (
                  <SortableProjectGroup key={name} name={name} index={i} {...groupProps} />
                ))}
              </div>
            </SortableContext>
            <DragOverlay dropAnimation={null}>
              {dragActiveId ? (
                <DragOverlayHeader
                  name={dragActiveId}
                  count={grouped[dragActiveId]?.length ?? 0}
                  color={
                    showFavoritesGroup
                      ? "var(--color-star, #f9ab00)"
                      : (colorMap[dragActiveId] ?? PROJECT_COLORS[0])
                  }
                />
              ) : null}
            </DragOverlay>
          </DndContext>
        )}

        {activeId != null && timers[activeId] && (
          <ActiveTimer
            timer={timers[activeId]}
            elapsed={elapsedMap[activeId] || 0}
            onPause={onPause}
            onSave={onSave}
            onAdjust={onAdjust}
          />
        )}
      </div>
    </div>
  );
}
