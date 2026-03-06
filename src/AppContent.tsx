import { TicketList, SearchPanel } from "./components/tickets";
import { TimeLogSection, WeekView } from "./components/timelog";
import { ErrorBoundary } from "./components/ui";
import type { AppRoute } from "./hooks/useHashRouter";
import type {
  RedmineIssue,
  RedmineActivity,
  RedmineStatus,
  RedmineTracker,
  RedmineMember,
  RedmineVersion,
  RedmineTimeEntry,
  RedmineJournal,
  TimeLogEntry,
  MultiTimerMap,
} from "./types/redmine";

interface Props {
  activeSection: "tickets" | "timelog" | "overview";
  route: AppRoute;
  navigate: (partial: Partial<AppRoute>) => void;
  mergedIssues: RedmineIssue[];
  assignedIdSet: Set<number>;
  assignedIssues: RedmineIssue[];
  issues: RedmineIssue[];
  pinnedIds: Set<number>;
  pinnedIssues: RedmineIssue[];
  recentlyPinned: RedmineIssue[];
  onTogglePin: (issue: RedmineIssue) => void;
  onToggleAssignedPin: (issue: RedmineIssue) => void;
  favoriteIds: Set<number>;
  favoriteIssues: RedmineIssue[];
  onToggleFavorite: (issue: RedmineIssue) => void;
  timers: MultiTimerMap;
  activeId: number | null;
  elapsedMap: Record<number, number>;
  onPause: () => void;
  onDiscard: (issueId: number) => void;
  onAdjust: (issueId: number, deltaMs: number) => void;
  loading: boolean;
  activities: RedmineActivity[];
  activitiesByProject: Record<number, RedmineActivity[]>;
  statuses: RedmineStatus[];
  trackers: RedmineTracker[];
  trackersByProject: Record<number, RedmineTracker[]>;
  allowedStatusesByIssue: Record<number, RedmineStatus[]>;
  membersByProject: Record<number, RedmineMember[]>;
  versionsByProject: Record<number, RedmineVersion[]>;
  redmineUrl: string;
  issueDescriptions: Record<number, string>;
  issueComments: Record<number, RedmineJournal[]>;
  issueSubjects: Record<number, string>;
  remoteEntries: RedmineTimeEntry[];
  remoteLoading: boolean;
  onFetchProjectActivities: (projectId: number) => Promise<void>;
  onFetchProjectTrackers: (projectId: number) => Promise<void>;
  onFetchAllowedStatuses: (issueId: number) => Promise<void>;
  onFetchMembers: (projectId: number) => Promise<void>;
  onFetchVersions: (projectId: number) => Promise<void>;
  onFetchIssueDescription: (issueId: number) => Promise<void>;
  onFetchIssues: () => void;
  isRefreshing: boolean;
  fetchIssueSubject: (issueId: number) => Promise<void>;
  fetchRemoteEntries: (from: string, to: string, force?: boolean) => Promise<void>;
  refreshRemoteEntries: () => void;
  onStatusChange: (issueId: number, statusId: number) => Promise<void>;
  onTrackerChange: (issueId: number, trackerId: number) => Promise<void>;
  onAssigneeChange: (issueId: number, assigneeId: number) => Promise<void>;
  onVersionChange: (issueId: number, versionId: number) => Promise<void>;
  onDoneRatioChange: (issueId: number, doneRatio: number) => Promise<void>;
  onPlay: (issue: RedmineIssue) => void;
  onSave: (issueId: number) => void;
  onOpenBookDialog: (issue: RedmineIssue) => void;
  onDelete: (id: string) => void;
  onUpdateDuration: (id: string, duration: number) => Promise<void>;
  onUpdateActivity: (id: string, activityId: number) => Promise<void>;
  onSyncEntry: (entryId: string, activityId: number) => Promise<void>;
  onOpenSyncDialog: (entry: TimeLogEntry) => void;
  onEditEntry: (entry: TimeLogEntry) => void;
  entries: TimeLogEntry[];
  onShowMessage: (msg: string) => void;
}

export default function AppContent(props: Props) {
  const { activeSection } = props;

  return (
    <main
      className={`min-h-0 flex-1 overflow-hidden px-4 pt-3 pb-3 bg-surface-container-low${activeSection === "tickets" ? " flex" : ""}`}
    >
      {activeSection === "tickets" && (
        <>
          <div className="ticket-panel--left">
            <ErrorBoundary>
              <TicketList
                issues={props.mergedIssues}
                pinnedIds={props.pinnedIds}
                timers={props.timers}
                activeId={props.activeId}
                elapsedMap={props.elapsedMap}
                loading={props.loading}
                statuses={props.statuses}
                trackers={props.trackers}
                trackersByProject={props.trackersByProject}
                allowedStatusesByIssue={props.allowedStatusesByIssue}
                onFetchProjectTrackers={props.onFetchProjectTrackers}
                onFetchAllowedStatuses={props.onFetchAllowedStatuses}
                membersByProject={props.membersByProject}
                versionsByProject={props.versionsByProject}
                redmineUrl={props.redmineUrl}
                onStatusChange={props.onStatusChange}
                onTrackerChange={props.onTrackerChange}
                onAssigneeChange={props.onAssigneeChange}
                onVersionChange={props.onVersionChange}
                onDoneRatioChange={props.onDoneRatioChange}
                onFetchMembers={props.onFetchMembers}
                onFetchVersions={props.onFetchVersions}
                onPlay={props.onPlay}
                onPause={props.onPause}
                onSave={props.onSave}
                onDiscard={props.onDiscard}
                onAdjust={props.onAdjust}
                onRefresh={props.onFetchIssues}
                isRefreshing={props.isRefreshing}
                onOpenBookDialog={props.onOpenBookDialog}
                issueDescriptions={props.issueDescriptions}
                issueComments={props.issueComments}
                onFetchIssueDescription={props.onFetchIssueDescription}
                onTogglePin={props.onTogglePin}
                favoriteIds={props.favoriteIds}
                onToggleFavorite={props.onToggleFavorite}
              />
            </ErrorBoundary>
          </div>
          <div className="ticket-panel--right">
            <ErrorBoundary>
              <SearchPanel
                pinnedIds={props.pinnedIds}
                pinnedIssues={props.pinnedIssues}
                recentlyPinned={props.recentlyPinned}
                assignedIds={props.assignedIdSet}
                assignedIssues={props.assignedIssues}
                onTogglePin={props.onTogglePin}
                onToggleAssignedPin={props.onToggleAssignedPin}
                statuses={props.statuses}
                trackers={props.trackers}
                redmineUrl={props.redmineUrl}
                membersByProject={props.membersByProject}
                versionsByProject={props.versionsByProject}
                onFetchMembers={props.onFetchMembers}
                onFetchVersions={props.onFetchVersions}
                favoriteIssues={props.favoriteIssues}
                favoriteIds={props.favoriteIds}
                onToggleFavorite={props.onToggleFavorite}
                onOpenBookDialog={props.onOpenBookDialog}
              />
            </ErrorBoundary>
          </div>
        </>
      )}
      {activeSection === "timelog" && (
        <ErrorBoundary>
          <TimeLogSection
            route={props.route}
            navigate={props.navigate}
            entries={props.entries}
            activities={props.activities}
            activitiesByProject={props.activitiesByProject}
            onFetchProjectActivities={props.onFetchProjectActivities}
            onSyncEntry={props.onSyncEntry}
            onOpenSyncDialog={props.onOpenSyncDialog}
            onEdit={props.onEditEntry}
            onDelete={props.onDelete}
            onUpdateDuration={props.onUpdateDuration}
            onUpdateActivity={props.onUpdateActivity}
            onShowMessage={props.onShowMessage}
            remoteEntries={props.remoteEntries}
            remoteLoading={props.remoteLoading}
            fetchRemoteEntries={props.fetchRemoteEntries}
            refreshRemoteEntries={props.refreshRemoteEntries}
            issues={props.issues}
            issueSubjects={props.issueSubjects}
            fetchIssueSubject={props.fetchIssueSubject}
            redmineUrl={props.redmineUrl}
          />
        </ErrorBoundary>
      )}
      {activeSection === "overview" && (
        <ErrorBoundary>
          <WeekView
            entries={props.entries}
            onNavigateToDate={(date) => {
              const d = new Date(date + "T00:00:00");
              props.navigate({
                section: "timelog",
                year: d.getFullYear(),
                month: d.getMonth(),
                day: d.getDate(),
              });
            }}
          />
        </ErrorBoundary>
      )}
    </main>
  );
}
