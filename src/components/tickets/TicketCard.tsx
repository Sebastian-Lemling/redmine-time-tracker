import React, { useEffect } from "react";
import type {
  RedmineIssue,
  RedmineStatus,
  RedmineTracker,
  RedmineMember,
  RedmineVersion,
  RedmineJournal,
} from "../../types/redmine";
import { TicketCardHeader } from "./TicketCardHeader";
import { TicketCardDescription } from "./TicketCardDescription";
import { TimerControls } from "./TimerControls";

export type TimerStatus = "running" | "paused" | "none";

interface Props {
  issue: RedmineIssue;
  timerStatus: TimerStatus;
  elapsed: number;
  statuses: RedmineStatus[];
  trackers: RedmineTracker[];
  allowedStatuses?: RedmineStatus[];
  onFetchAllowedStatuses: (issueId: number) => void;
  onFetchProjectTrackers: (projectId: number) => void;
  projectMembers: RedmineMember[];
  projectVersions: RedmineVersion[];
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
  onOpenBookDialog: () => void;
  issueDescription?: string;
  issueComments?: RedmineJournal[];
  onFetchIssueDescription: (issueId: number) => void;
  projectColor?: string;
  isPinned?: boolean;
  onTogglePin?: (issue: RedmineIssue) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (issue: RedmineIssue) => void;
}

export const TicketCard = React.memo(function TicketCard({
  issue,
  timerStatus,
  elapsed,
  statuses,
  trackers,
  allowedStatuses,
  onFetchAllowedStatuses,
  onFetchProjectTrackers,
  projectMembers,
  projectVersions,
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
  issueDescription,
  issueComments,
  onFetchIssueDescription,
  projectColor,
  isPinned,
  onTogglePin,
  isFavorite,
  onToggleFavorite,
}: Props) {
  useEffect(() => {
    onFetchVersions(issue.project.id);
    onFetchProjectTrackers(issue.project.id);
  }, [issue.project.id, onFetchVersions, onFetchProjectTrackers]);

  return (
    <div
      className={`md-card-interactive ticket-card${projectColor ? " ticket-card--accented" : ""}${timerStatus === "running" ? " ticket-card--running" : timerStatus === "paused" ? " ticket-card--paused" : ""}`}
      style={{ "--project-color": projectColor } as React.CSSProperties}
    >
      <TicketCardHeader
        issue={issue}
        redmineUrl={redmineUrl}
        trackers={trackers}
        statuses={statuses}
        allowedStatuses={allowedStatuses}
        projectVersions={projectVersions}
        projectMembers={projectMembers}
        onTrackerChange={onTrackerChange}
        onStatusChange={onStatusChange}
        onVersionChange={onVersionChange}
        onDoneRatioChange={onDoneRatioChange}
        onAssigneeChange={onAssigneeChange}
        onFetchAllowedStatuses={onFetchAllowedStatuses}
        onFetchMembers={onFetchMembers}
        projectColor={projectColor}
        isPinned={isPinned}
        onTogglePin={onTogglePin}
        isFavorite={isFavorite}
        onToggleFavorite={onToggleFavorite}
      />

      <TicketCardDescription
        issue={issue}
        issueDescription={issueDescription}
        issueComments={issueComments}
        onFetchIssueDescription={onFetchIssueDescription}
      />

      <TimerControls
        issue={issue}
        timerStatus={timerStatus}
        elapsed={elapsed}
        onPlay={onPlay}
        onPause={onPause}
        onSave={onSave}
        onDiscard={onDiscard}
        onAdjust={onAdjust}
        onOpenBookDialog={onOpenBookDialog}
      />
    </div>
  );
});
