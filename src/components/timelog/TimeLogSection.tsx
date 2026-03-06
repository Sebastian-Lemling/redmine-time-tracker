import type {
  TimeLogEntry as TEntry,
  RedmineActivity,
  RedmineTimeEntry,
  RedmineIssue,
} from "../../types/redmine";
import type { AppRoute } from "../../hooks/useHashRouter";
import { MonthView } from "./MonthView";

interface Props {
  route: AppRoute;
  navigate: (partial: Partial<AppRoute>) => void;
  entries: TEntry[];
  activities: RedmineActivity[];
  activitiesByProject: Record<number, RedmineActivity[]>;
  onFetchProjectActivities: (projectId: number) => void;
  onSyncEntry: (entryId: string, activityId: number) => Promise<void>;
  onOpenSyncDialog: (entry: TEntry) => void;
  onEdit: (entry: TEntry) => void;
  onDelete: (id: string) => void;
  onUpdateDuration: (id: string, newDuration: number) => void;
  onUpdateActivity: (id: string, activityId: number) => void;
  onShowMessage: (message: string) => void;
  remoteEntries: RedmineTimeEntry[];
  remoteLoading: boolean;
  fetchRemoteEntries: (from: string, to: string) => void;
  refreshRemoteEntries: () => void;
  issues: RedmineIssue[];
  issueSubjects: Record<number, string>;
  fetchIssueSubject: (issueId: number) => void;
  redmineUrl: string;
}

export function TimeLogSection({
  route,
  navigate,
  entries,
  activities,
  activitiesByProject,
  onFetchProjectActivities,
  onSyncEntry,
  onOpenSyncDialog,
  onEdit,
  onDelete,
  onUpdateDuration,
  onUpdateActivity: _onUpdateActivity, // eslint-disable-line @typescript-eslint/no-unused-vars
  onShowMessage,
  remoteEntries,
  remoteLoading,
  fetchRemoteEntries,
  refreshRemoteEntries,
  issues,
  issueSubjects,
  fetchIssueSubject,
  redmineUrl,
}: Props) {
  return (
    <div
      className="animate-fade-in"
      style={{ display: "flex", flexDirection: "column", height: "100%" }}
    >
      <div style={{ flex: 1, minHeight: 0 }}>
        <MonthView
          route={route}
          navigate={navigate}
          entries={entries}
          activities={activities}
          activitiesByProject={activitiesByProject}
          onFetchProjectActivities={onFetchProjectActivities}
          onSyncEntry={onSyncEntry}
          onOpenSyncDialog={onOpenSyncDialog}
          onEdit={onEdit}
          onDelete={onDelete}
          onUpdateDuration={onUpdateDuration}
          onShowMessage={onShowMessage}
          remoteEntries={remoteEntries}
          remoteLoading={remoteLoading}
          fetchRemoteEntries={fetchRemoteEntries}
          refreshRemoteEntries={refreshRemoteEntries}
          issues={issues}
          issueSubjects={issueSubjects}
          fetchIssueSubject={fetchIssueSubject}
          redmineUrl={redmineUrl}
        />
      </div>
    </div>
  );
}
