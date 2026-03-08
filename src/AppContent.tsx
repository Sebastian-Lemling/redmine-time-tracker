import { InstanceTicketView } from "./components/tickets";
import { TimeLogSection, WeekView } from "./components/timelog";
import { ErrorBoundary } from "./components/ui";
import type { AppRoute } from "./hooks/useHashRouter";
import type {
  RedmineIssue,
  RedmineActivity,
  RedmineTimeEntry,
  TimeLogEntry,
  MultiTimerMap,
  ActiveTimerKey,
  TimerKey,
} from "./types/redmine";
import type { SaveResult } from "./hooks/useMultiTimer";
import type { BookingDialogData } from "./components/dialogs/BookingDialog";

interface Props {
  activeSection: "tickets" | "timelog" | "overview";
  route: AppRoute;
  navigate: (partial: Partial<AppRoute>) => void;
  activeInstanceId: string;

  // Shared timer state
  timers: MultiTimerMap;
  activeTimerKey: ActiveTimerKey;
  elapsedMap: Record<TimerKey, number>;
  onPause: () => void;
  startOrResume: (
    instanceId: string,
    issueId: number,
    subject: string,
    projectName: string,
    projectId?: number,
  ) => void;
  capture: (key: TimerKey) => SaveResult | null;
  discard: (key: TimerKey) => void;
  adjustElapsed: (key: TimerKey, deltaSec: number) => void;

  // Dialog / UI setters
  setBookDialog: (data: BookingDialogData | null) => void;
  showSnackbar: (msg: string) => void;

  // Refresh
  refreshTrigger: number;
  onRefreshComplete: (changed: boolean, changedCount: number) => void;

  // Timelog props
  entries: TimeLogEntry[];
  activities: RedmineActivity[];
  activitiesByProject: Record<number, RedmineActivity[]>;
  onFetchProjectActivities: (projectId: number) => Promise<void>;
  onSyncEntry: (entryId: string, activityId: number) => Promise<void>;
  onOpenSyncDialog: (entry: TimeLogEntry) => void;
  onEditEntry: (entry: TimeLogEntry) => void;
  onDelete: (id: string) => void;
  onUpdateDuration: (id: string, duration: number) => Promise<void>;
  onUpdateActivity: (id: string, activityId: number) => Promise<void>;
  onShowMessage: (msg: string) => void;
  remoteEntries: RedmineTimeEntry[];
  remoteLoading: boolean;
  fetchRemoteEntries: (from: string, to: string, force?: boolean) => Promise<void>;
  refreshRemoteEntries: () => void;
  issues: RedmineIssue[];
  issueSubjects: Record<number, string>;
  fetchIssueSubject: (issueId: number) => Promise<void>;
  redmineUrl: string;
}

export default function AppContent(props: Props) {
  const { activeSection } = props;

  return (
    <main
      className={`min-h-0 flex-1 overflow-hidden px-4 pt-3 pb-3 bg-surface-container-low${activeSection === "tickets" ? " flex" : ""}`}
    >
      {activeSection === "tickets" && (
        <ErrorBoundary>
          <InstanceTicketView
            key={props.activeInstanceId}
            instanceId={props.activeInstanceId}
            timers={props.timers}
            activeTimerKey={props.activeTimerKey}
            elapsedMap={props.elapsedMap}
            onPause={props.onPause}
            startOrResume={props.startOrResume}
            capture={props.capture}
            discard={props.discard}
            adjustElapsed={props.adjustElapsed}
            setBookDialog={props.setBookDialog}
            showSnackbar={props.showSnackbar}
            refreshTrigger={props.refreshTrigger}
            onRefreshComplete={props.onRefreshComplete}
          />
        </ErrorBoundary>
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
