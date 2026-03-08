import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type {
  RedmineIssue,
  RedmineStatus,
  RedmineTracker,
  RedmineMember,
  RedmineVersion,
  RedmineJournal,
  MultiTimerMap,
} from "../../types/redmine";
import { TicketCard } from "./TicketCard";
import { ProjectGroupHeader } from "./ProjectGroupHeader";

export interface GroupProps {
  name: string;
  displayName?: string;
  index: number;
  colorMap: Record<string, string>;
  grouped: Record<string, RedmineIssue[]>;
  searchFiltered: Record<string, RedmineIssue[]>;
  searchQuery: string;
  collapsed: Record<string, boolean>;
  toggle: (name: string) => void;
  timers: MultiTimerMap;
  activeTimerId: number | null;
  elapsedMap: Record<number, number>;
  statuses: RedmineStatus[];
  trackers: RedmineTracker[];
  trackersByProject: Record<number, RedmineTracker[]>;
  allowedStatusesByIssue: Record<number, RedmineStatus[]>;
  onFetchProjectTrackers: (projectId: number) => void;
  onFetchAllowedStatuses: (issueId: number) => void;
  membersByProject: Record<number, RedmineMember[]>;
  versionsByProject: Record<number, RedmineVersion[]>;
  redmineUrl: string;
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
  onOpenBookDialog: (issue: RedmineIssue) => void;
  issueDescriptions: Record<number, string>;
  issueComments: Record<number, RedmineJournal[]>;
  onFetchIssueDescription: (issueId: number) => void;
  dragHandleProps?: ReturnType<typeof useSortable>["listeners"];
  pinnedIds?: Set<number>;
  onTogglePin?: (issue: RedmineIssue) => void;
  showFavoritesGroup?: boolean;
}

function ProjectGroupContent({
  name,
  displayName,
  colorMap,
  grouped,
  searchFiltered,
  searchQuery,
  collapsed,
  toggle,
  timers,
  activeTimerId,
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
  dragHandleProps,
  pinnedIds,
  onTogglePin,
  showFavoritesGroup,
}: GroupProps) {
  const projectIssues = searchQuery.trim() ? searchFiltered[name] || [] : (grouped[name] ?? []);

  const isCollapsed = !!collapsed[name];

  return (
    <>
      <ProjectGroupHeader
        name={name}
        displayName={displayName}
        count={grouped[name]?.length ?? 0}
        color={showFavoritesGroup ? "var(--color-star, #f9ab00)" : colorMap[name]}
        isCollapsed={isCollapsed}
        onToggle={() => toggle(name)}
        dragHandleProps={dragHandleProps}
      />

      <div
        className="ticket-group__content"
        style={{
          maxHeight: !isCollapsed ? "5000px" : "0px",
          opacity: !isCollapsed ? 1 : 0,
        }}
      >
        <div className="ticket-group__cards">
          {projectIssues.map((issue) => {
            const timerStatus = timers[issue.id]
              ? activeTimerId === issue.id
                ? ("running" as const)
                : ("paused" as const)
              : ("none" as const);
            return (
              <TicketCard
                key={issue.id}
                issue={issue}
                projectColor={colorMap[name]}
                timerStatus={timerStatus}
                elapsed={elapsedMap[issue.id] || 0}
                statuses={statuses}
                trackers={
                  trackersByProject[issue.project.id]?.length
                    ? trackersByProject[issue.project.id]
                    : trackers
                }
                allowedStatuses={allowedStatusesByIssue[issue.id]}
                onFetchAllowedStatuses={onFetchAllowedStatuses}
                onFetchProjectTrackers={onFetchProjectTrackers}
                projectMembers={membersByProject[issue.project.id] || []}
                projectVersions={versionsByProject[issue.project.id] || []}
                redmineUrl={redmineUrl}
                onStatusChange={onStatusChange}
                onTrackerChange={onTrackerChange}
                onAssigneeChange={onAssigneeChange}
                onVersionChange={onVersionChange}
                onDoneRatioChange={onDoneRatioChange}
                onFetchMembers={onFetchMembers}
                onFetchVersions={onFetchVersions}
                onPlay={onPlay}
                onPause={onPause}
                onSave={onSave}
                onDiscard={onDiscard}
                onAdjust={onAdjust}
                onOpenBookDialog={() => onOpenBookDialog(issue)}
                issueDescription={issueDescriptions[issue.id]}
                issueComments={issueComments[issue.id]}
                onFetchIssueDescription={onFetchIssueDescription}
                isPinned={pinnedIds?.has(issue.id)}
                onTogglePin={onTogglePin}
                isFavoriteCard={showFavoritesGroup}
              />
            );
          })}
        </div>
      </div>
    </>
  );
}

export function PlainProjectGroup(props: GroupProps) {
  return (
    <div className="ticket-group" style={{ animationDelay: `${props.index * 50}ms` }}>
      <ProjectGroupContent {...props} />
    </div>
  );
}

export function SortableProjectGroup(props: GroupProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: props.name,
  });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    animationDelay: `${props.index * 50}ms`,
  };
  return (
    <div ref={setNodeRef} style={style} className="ticket-group" {...attributes}>
      <ProjectGroupContent {...props} dragHandleProps={listeners} />
    </div>
  );
}
