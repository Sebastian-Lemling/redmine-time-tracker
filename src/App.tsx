import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Loader2 } from "lucide-react";
import { useTheme } from "./hooks/useTheme";
import { useI18n } from "./i18n/I18nContext";
import { BookingDialog, SyncDialog, EditEntryDialog } from "./components/dialogs";
import { Snackbar } from "./components/ui";
import { useRedmine } from "./hooks/useRedmine";
import { useMultiTimer } from "./hooks/useMultiTimer";
import { useTimeLog } from "./hooks/useTimeLog";
import { useHashRouter } from "./hooks/useHashRouter";
import { useEntryHandlers } from "./hooks/useEntryHandlers";
import { useSyncOrchestrator } from "./hooks/useSyncOrchestrator";
import { useDialogManager } from "./hooks/useDialogManager";
import { useSnackbar } from "./hooks/useSnackbar";
import { useWeekRemoteEntries } from "./hooks/useWeekRemoteEntries";
import { useInstances } from "./hooks/useInstances";
import { toLocalDateString, getWeekKey } from "./lib/dates";
import { api } from "./lib/api";
import { AppProvider } from "./AppContext";
import AppHeader from "./AppHeader";
import AppContent from "./AppContent";
import type { RedmineIssue } from "./types/redmine";

export default function App() {
  const redmine = useRedmine();
  const { timers, activeId, elapsedMap, startOrResume, pause, capture, discard, adjustElapsed } =
    useMultiTimer();
  const timeLog = useTimeLog();
  const { mode: themeMode, setMode: setThemeMode } = useTheme();
  const { t } = useI18n();
  const { route, navigate } = useHashRouter();
  const instancesHook = useInstances();

  const [error, setError] = useState<string | null>(null);
  const { snackbar, showSnackbar, dismissSnackbar } = useSnackbar();
  const { weekRemoteEntries, fetchWeekRemoteEntries } = useWeekRemoteEntries();

  useEffect(() => {
    if (redmine.user) {
      redmine.fetchActivities();
      fetchWeekRemoteEntries();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [redmine.user]);

  const activeInstanceId = useMemo(() => {
    if (route.instanceId) return route.instanceId;
    if (instancesHook.instances.length > 0) return instancesHook.instances[0].id;
    return "default";
  }, [route.instanceId, instancesHook.instances]);

  useEffect(() => {
    if (route.section === "tickets" && !route.instanceId && instancesHook.instances.length > 0) {
      navigate({ section: "tickets", instanceId: instancesHook.instances[0].id });
    }
  }, [route.section, route.instanceId, instancesHook.instances, navigate]);

  const dialogManager = useDialogManager({
    addEntry: timeLog.addEntry,
    discard,
    timers,
    startOrResume,
    issues: redmine.issues,
    activities: redmine.activities,
    setError,
  });

  const createTimeEntry = useCallback(
    async (
      instanceId: string,
      issueId: number,
      hours: number,
      description: string,
      activityId: number,
      date: string,
    ): Promise<number> => {
      const prefix = `/api/i/${instanceId}`;
      const data = await api<{ time_entry: { id: number } }>(`${prefix}/time_entries`, {
        method: "POST",
        body: JSON.stringify({
          time_entry: {
            issue_id: issueId,
            hours,
            comments: description,
            activity_id: activityId,
            spent_on: date,
          },
        }),
      });
      return data.time_entry.id;
    },
    [],
  );

  const entryHandlers = useEntryHandlers({
    entries: timeLog.entries,
    updateEntry: timeLog.updateEntry,
    deleteEntry: timeLog.deleteEntry,
    removeEntryFromState: timeLog.removeEntryFromState,
    restoreEntryToState: timeLog.restoreEntryToState,
    showSnackbar,
    setEditDialog: dialogManager.setEditDialog,
    setError,
    t,
  });

  const syncOrch = useSyncOrchestrator({
    entries: timeLog.entries,
    markSynced: timeLog.markSynced,
    createTimeEntry,
    refreshRemoteEntries: redmine.refreshRemoteEntries,
    setSyncDialog: dialogManager.setSyncDialog,
    setSnackbar: showSnackbar,
    setError,
    t,
  });

  const syncedCount = useMemo(
    () => timeLog.entries.filter((e) => e.syncedToRedmine).length,
    [timeLog.entries],
  );
  const prevSyncedCountRef = useRef(syncedCount);
  useEffect(() => {
    if (syncedCount > prevSyncedCountRef.current) {
      fetchWeekRemoteEntries();
    }
    prevSyncedCountRef.current = syncedCount;
  }, [syncedCount, fetchWeekRemoteEntries]);

  const unsyncedCount = useMemo(
    () => timeLog.entries.filter((e) => !e.syncedToRedmine).length,
    [timeLog.entries],
  );
  const todayStr = toLocalDateString(new Date());
  const currentWeekKey = getWeekKey(todayStr);
  const todayMinutes = useMemo(() => {
    const remoteMinutes = weekRemoteEntries
      .filter((e) => e.spent_on === todayStr)
      .reduce((sum, e) => sum + Math.round(e.hours * 60), 0);
    const localUnsyncedMinutes = timeLog.entries
      .filter((e) => e.date === todayStr && !e.syncedToRedmine)
      .reduce((sum, e) => sum + e.duration, 0);
    return remoteMinutes + localUnsyncedMinutes;
  }, [timeLog.entries, weekRemoteEntries, todayStr]);
  const weekMinutes = useMemo(() => {
    const remoteMinutes = weekRemoteEntries.reduce((sum, e) => sum + Math.round(e.hours * 60), 0);
    const localUnsyncedMinutes = timeLog.entries
      .filter((e) => getWeekKey(e.date) === currentWeekKey && !e.syncedToRedmine)
      .reduce((sum, e) => sum + e.duration, 0);
    return remoteMinutes + localUnsyncedMinutes;
  }, [timeLog.entries, weekRemoteEntries, currentWeekKey]);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const onRefresh = useCallback(() => {
    if (isRefreshing) return;
    setIsRefreshing(true);

    setRefreshTrigger((prev) => prev + 1);
    fetchWeekRemoteEntries();

    setTimeout(() => {
      setIsRefreshing(false);
    }, 1200);
  }, [isRefreshing, fetchWeekRemoteEntries]);

  const onRefreshComplete = useCallback(
    (changed: boolean, changedCount: number) => {
      if (changed) {
        showSnackbar(t.refreshUpdated(changedCount));
      } else {
        showSnackbar(t.refreshNoChanges);
      }
    },
    [showSnackbar, t],
  );

  if (redmine.loading && !redmine.user) {
    return (
      <div className="bg-surface-dim flex min-h-screen items-center justify-center">
        <div className="animate-fade-in text-center">
          <Loader2 className="text-primary mx-auto h-6 w-6 animate-spin" />
          <p className="text-on-surface-variant mt-4 text-sm tracking-wide">{t.connecting}</p>
        </div>
      </div>
    );
  }

  if (redmine.error && !redmine.user) {
    return (
      <div className="bg-surface-dim flex min-h-screen items-center justify-center p-4">
        <div className="animate-fade-in w-full max-w-md">
          <div className="bg-error-container rounded-xl p-6">
            <h2 className="text-on-error-container mb-2 text-base font-semibold">
              {t.connectionFailed}
            </h2>
            <p className="text-on-error-container/80 mb-4 text-sm">{redmine.error}</p>
            <p className="text-on-error-container/60 text-xs">
              {t.checkProxy}
              <br />
              {t.runSetup}{" "}
              <code className="bg-scrim/10 rounded-sm px-1.5 py-0.5 font-mono text-xs">
                npm run setup
              </code>
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!redmine.user) return null;

  const appCtx = {
    user: redmine.user,
    redmineUrl: redmine.redmineUrl,
    route,
    navigate,
    todayMinutes,
    weekMinutes,
    unsyncedCount,
    themeMode,
    setThemeMode,
    loading: redmine.loading,
    isRefreshing,
    onRefresh,
    instances: instancesHook.instances,
    activeInstanceId,
    instanceColorMap: instancesHook.instanceColorMap,
  };

  return (
    <AppProvider value={appCtx}>
      <div className="flex h-full flex-col overflow-hidden">
        <AppHeader />

        {error && (
          <div className="bg-error-container">
            <div className="flex items-center justify-between px-6 py-3">
              <span className="text-on-error-container text-sm">{error}</span>
              <button
                onClick={() => setError(null)}
                className="text-on-error-container hover:bg-on-error-container/[0.08] rounded-sm px-3 py-1.5 text-sm font-medium"
              >
                {t.dismiss}
              </button>
            </div>
          </div>
        )}

        <AppContent
          activeSection={route.section}
          route={route}
          navigate={navigate}
          activeInstanceId={activeInstanceId}
          timers={timers}
          activeTimerKey={activeId}
          elapsedMap={elapsedMap}
          onPause={pause}
          startOrResume={startOrResume}
          capture={capture}
          discard={discard}
          adjustElapsed={adjustElapsed}
          setBookDialog={dialogManager.setBookDialog}
          showSnackbar={showSnackbar}
          refreshTrigger={refreshTrigger}
          onRefreshComplete={onRefreshComplete}
          entries={timeLog.entries}
          activities={redmine.activities}
          activitiesByProject={redmine.activitiesByProject}
          onFetchProjectActivities={redmine.fetchProjectActivities}
          onSyncEntry={syncOrch.handleSyncEntry}
          onOpenSyncDialog={syncOrch.handleOpenSyncDialog}
          onEditEntry={(entry) => dialogManager.setEditDialog(entry)}
          onDelete={entryHandlers.handleDelete}
          onUpdateDuration={entryHandlers.handleUpdateDuration}
          onUpdateActivity={entryHandlers.handleUpdateActivity}
          onShowMessage={showSnackbar}
          remoteEntries={redmine.remoteEntries}
          remoteLoading={redmine.remoteLoading}
          fetchRemoteEntries={redmine.fetchRemoteEntries}
          refreshRemoteEntries={redmine.refreshRemoteEntries}
          issues={redmine.issues}
          issueSubjects={redmine.issueSubjects}
          fetchIssueSubject={redmine.fetchIssueSubject}
          redmineUrl={redmine.redmineUrl}
        />

        {dialogManager.bookDialog && (
          <BookingDialog
            data={{
              ...dialogManager.bookDialog,
              doneRatio:
                dialogManager.bookDialog.doneRatio ??
                redmine.issues.find((i) => i.id === dialogManager.bookDialog!.issueId)?.done_ratio,
            }}
            redmineUrl={redmine.redmineUrl}
            activities={dialogManager.bookDialogActivities}
            onSave={dialogManager.handleBookConfirm}
            onCancel={dialogManager.handleBookCancel}
            onDoneRatioChange={async () => {}}
          />
        )}

        {dialogManager.syncDialog && (
          <SyncDialog
            entry={dialogManager.syncDialog}
            activities={dialogManager.syncDialogActivities}
            onSync={syncOrch.handleSync}
            onCancel={() => {
              dialogManager.setSyncDialog(null);
              syncOrch.cancelSyncAll();
            }}
          />
        )}

        {dialogManager.editDialog && (
          <EditEntryDialog
            entry={dialogManager.editDialog}
            redmineUrl={redmine.redmineUrl}
            activities={dialogManager.editDialogActivities}
            doneRatio={
              redmine.issues.find((i: RedmineIssue) => i.id === dialogManager.editDialog!.issueId)
                ?.done_ratio
            }
            onDoneRatioChange={async () => {}}
            onSave={entryHandlers.handleEdit}
            onCancel={() => dialogManager.setEditDialog(null)}
          />
        )}
      </div>
      <Snackbar data={snackbar} onDismiss={dismissSnackbar} />
    </AppProvider>
  );
}
