import { useState, useMemo, useCallback } from "react";
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
  ActiveTimerId,
} from "../../types/redmine";
import { TicketListToolbar } from "./TicketListToolbar";
import { DragOverlayHeader } from "./ProjectGroupHeader";
import { PlainProjectGroup, SortableProjectGroup } from "./ProjectGroup";
import { useTicketGrouping, PROJECT_COLORS, FAVORITES_GROUP_KEY } from "./useTicketGrouping";
import { useProjectOrder } from "./useProjectOrder";
import { useEnabledProjects } from "./useEnabledProjects";
import { ActiveTimer } from "../timelog";
import { useI18n } from "../../i18n/I18nContext";

interface Props {
  issues: RedmineIssue[];
  timers: MultiTimerMap;
  activeId: ActiveTimerId;
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
  onRefresh: () => void;
  isRefreshing?: boolean;
  redmineUrl: string;
  onOpenBookDialog: (issue: RedmineIssue) => void;
  issueDescriptions: Record<number, string>;
  issueComments: Record<number, RedmineJournal[]>;
  onFetchIssueDescription: (issueId: number) => void;
  pinnedIds?: Set<number>;
  onTogglePin?: (issue: RedmineIssue) => void;
  favoriteIds?: Set<number>;
  onToggleFavorite?: (issue: RedmineIssue) => void;
}

export function TicketList({
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
  onRefresh,
  isRefreshing,
  onOpenBookDialog,
  issueDescriptions,
  issueComments,
  onFetchIssueDescription,
  pinnedIds,
  onTogglePin,
  favoriteIds,
  onToggleFavorite,
}: Props) {
  const { t } = useI18n();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [showTrackedOnly, setShowTrackedOnly] = useState(false);
  const [showFavoritesGroup, setShowFavoritesGroup] = useState(() =>
    safeGet("show-favorites-group", false),
  );

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const { grouped, allProjectNames, colorMap } = useTicketGrouping({
    issues,
    timers,
    showTrackedOnly,
    showFavoritesGroup,
    favoriteIds,
  });
  const { projectOrder, dragActiveId, handleDragStart, handleDragEnd } =
    useProjectOrder(allProjectNames);
  const {
    enabledProjects,
    toggle: toggleProject,
    toggleAll: toggleAllProjects,
  } = useEnabledProjects(allProjectNames);

  const filteredProjectNames = useMemo(() => {
    const real = projectOrder.filter((name) => enabledProjects.has(name) && grouped[name]);
    if (grouped[FAVORITES_GROUP_KEY]) return [FAVORITES_GROUP_KEY, ...real];
    return real;
  }, [projectOrder, enabledProjects, grouped]);

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
    issueDescriptions,
    issueComments,
    onFetchIssueDescription,
    pinnedIds,
    onTogglePin,
    favoriteIds,
    onToggleFavorite,
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
              safeSet("show-favorites-group", !v);
              return !v;
            })
          }
          favoriteCount={favoriteIds?.size ?? 0}
          allExpanded={allExpanded}
          onToggleAll={toggleAll}
          onRefresh={onRefresh}
          isRefreshing={isRefreshing}
        />

        {allProjectNames.length === 0 && !loading && (
          <div className="py-12 text-center">
            <p className="md-body-medium text-on-surface-variant">{t.noPinnedTickets}</p>
            <p className="text-on-surface-variant mt-2 text-xs">{t.openSearch}</p>
          </div>
        )}

        {isSearching ? (
          <div className="ticket-layout__body">
            {displayProjectNames.map((name, i) => (
              <PlainProjectGroup
                key={name}
                name={name}
                displayName={name === FAVORITES_GROUP_KEY ? t.favoritesGroup : undefined}
                index={i}
                {...groupProps}
              />
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
            <SortableContext
              items={displayProjectNames.filter((n) => n !== FAVORITES_GROUP_KEY)}
              strategy={verticalListSortingStrategy}
            >
              <div className="ticket-layout__body">
                {displayProjectNames.map((name, i) =>
                  name === FAVORITES_GROUP_KEY ? (
                    <PlainProjectGroup
                      key={name}
                      name={name}
                      displayName={t.favoritesGroup}
                      index={i}
                      {...groupProps}
                    />
                  ) : (
                    <SortableProjectGroup key={name} name={name} index={i} {...groupProps} />
                  ),
                )}
              </div>
            </SortableContext>
            <DragOverlay dropAnimation={null}>
              {dragActiveId ? (
                <DragOverlayHeader
                  name={dragActiveId === FAVORITES_GROUP_KEY ? t.favoritesGroup : dragActiveId}
                  count={grouped[dragActiveId]?.length ?? 0}
                  color={colorMap[dragActiveId] ?? PROJECT_COLORS[0]}
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
