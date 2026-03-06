import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Loader2 } from "lucide-react";
import { useTheme } from "./hooks/useTheme";
import { useI18n } from "./i18n/I18nContext";
import { BookingDialog, SyncDialog, EditEntryDialog } from "./components/dialogs";
import { Snackbar } from "./components/ui";
import { useRedmine } from "./hooks/useRedmine";
import { useMultiTimer } from "./hooks/useMultiTimer";
import { useTimeLog } from "./hooks/useTimeLog";
import { usePinnedIssues } from "./hooks/usePinnedIssues";
import { useFavorites } from "./hooks/useFavorites";
import { useHashRouter } from "./hooks/useHashRouter";
import { useVisibilityRefresh } from "./hooks/useVisibilityRefresh";
import { useIssueMutationHandlers } from "./hooks/useIssueMutationHandlers";
import { useTimerHandlers } from "./hooks/useTimerHandlers";
import { useEntryHandlers } from "./hooks/useEntryHandlers";
import { useSyncOrchestrator } from "./hooks/useSyncOrchestrator";
import { useDialogManager } from "./hooks/useDialogManager";
import { useSnackbar } from "./hooks/useSnackbar";
import { useWeekRemoteEntries } from "./hooks/useWeekRemoteEntries";
import { toLocalDateString, getWeekKey } from "./lib/dates";
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
  const pinned = usePinnedIssues();
  const favorites = useFavorites();
  const { route, navigate } = useHashRouter();

  const [error, setError] = useState<string | null>(null);
  const { snackbar, showSnackbar, dismissSnackbar } = useSnackbar();
  const { weekRemoteEntries, fetchWeekRemoteEntries } = useWeekRemoteEntries();
  useEffect(() => {
    if (redmine.user) {
      redmine.fetchIssues();
      redmine.fetchActivities();
      redmine.fetchStatuses();
      redmine.fetchTrackers();
      fetchWeekRemoteEntries();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [redmine.user]);
  const assignedIdSet = useMemo(() => new Set(redmine.issues.map((i) => i.id)), [redmine.issues]);
  const mergedIssues = useMemo(() => {
    const pinnedIdSet = pinned.pinnedIds;
    const extras = favorites.favoriteIssues.filter((i) => !pinnedIdSet.has(i.id));
    return extras.length > 0 ? [...pinned.pinnedIssues, ...extras] : pinned.pinnedIssues;
  }, [pinned.pinnedIssues, pinned.pinnedIds, favorites.favoriteIssues]);

  useEffect(() => {
    pinned.syncAssignedPins(redmine.issues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [redmine.issues]);

  const handleTogglePin = useCallback(
    (issue: RedmineIssue) => {
      const wasPinned = pinned.isPinned(issue.id);
      pinned.toggle(issue);
      if (wasPinned && assignedIdSet.has(issue.id)) {
        pinned.hide(issue.id);
      }
    },
    [pinned, assignedIdSet],
  );

  const handleToggleFavorite = useCallback(
    (issue: RedmineIssue) => {
      favorites.toggle(issue);
    },
    [favorites],
  );

  const handleToggleAssignedPin = useCallback(
    (issue: RedmineIssue) => {
      const wasPinned = pinned.isPinned(issue.id);
      if (wasPinned) {
        pinned.unpin(issue.id);
        pinned.hide(issue.id);
      } else {
        pinned.pinSilent(issue);
      }
    },
    [pinned],
  );
  const { lastFetchRef } = useVisibilityRefresh({
    fetchIssues: redmine.fetchIssues,
    refreshPinned: pinned.refreshPinned,
    refreshRemoteEntries: redmine.refreshRemoteEntries,
    refreshWeekRemoteEntries: fetchWeekRemoteEntries,
  });

  const dialogManager = useDialogManager({
    addEntry: timeLog.addEntry,
    discard,
    timers,
    startOrResume,
    issues: redmine.issues,
    activities: redmine.activities,
    activitiesByProject: redmine.activitiesByProject,
    fetchProjectActivities: redmine.fetchProjectActivities,
    setError,
  });

  const mutations = useIssueMutationHandlers({
    mergedIssues,
    statuses: redmine.statuses,
    trackers: redmine.trackers,
    versionsByProject: redmine.versionsByProject,
    refreshIssue: redmine.refreshIssue,
    mergeIssue: redmine.mergeIssue,
    updateIssueStatus: redmine.updateIssueStatus,
    updateIssueTracker: redmine.updateIssueTracker,
    updateIssueAssignee: redmine.updateIssueAssignee,
    updateIssueVersion: redmine.updateIssueVersion,
    updateIssueDoneRatio: redmine.updateIssueDoneRatio,
    invalidateAllowedStatuses: redmine.invalidateAllowedStatuses,
    isPinned: pinned.isPinned,
    updatePinnedIssue: pinned.updateIssue,
    updateFavoriteIssue: favorites.updateIssue,
    setSnackbar: showSnackbar,
    onMutationSuccess: () => {
      lastFetchRef.current = Date.now();
    },
    t,
  });

  const timerHandlers = useTimerHandlers({
    activeId,
    startOrResume,
    capture,
    setBookDialog: dialogManager.setBookDialog,
  });

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
    createTimeEntry: redmine.createTimeEntry,
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
  const issuesSnapshotRef = useRef<string>("");

  const onRefresh = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    lastFetchRef.current = Date.now();

    const snapshot = redmine.issues
      .map((i) => `${i.id}:${i.updated_on}`)
      .sort()
      .join("|");
    issuesSnapshotRef.current = snapshot;

    const minDelay = new Promise((r) => setTimeout(r, 1200));
    try {
      const [newIssues] = await Promise.all([
        redmine.fetchIssues(),
        pinned.refreshPinned(),
        fetchWeekRemoteEntries(),
        minDelay,
      ]);
      const newSnapshot = newIssues
        .map((i) => `${i.id}:${i.updated_on}`)
        .sort()
        .join("|");

      if (newSnapshot !== issuesSnapshotRef.current) {
        const oldIds = new Set(redmine.issues.map((i) => i.id));
        const changedCount = newIssues.filter((i) => {
          const old = redmine.issues.find((o) => o.id === i.id);
          return !old || old.updated_on !== i.updated_on;
        }).length;
        const newCount = newIssues.filter((i) => !oldIds.has(i.id)).length;
        showSnackbar(t.refreshUpdated(changedCount + newCount));
      } else {
        showSnackbar(t.refreshNoChanges);
      }
    } catch {
      showSnackbar(t.refreshFailed);
    } finally {
      setIsRefreshing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isRefreshing,
    lastFetchRef,
    redmine.issues,
    redmine.fetchIssues,
    pinned.refreshPinned,
    fetchWeekRemoteEntries,
    showSnackbar,
    t,
  ]);
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
          mergedIssues={mergedIssues}
          assignedIdSet={assignedIdSet}
          assignedIssues={redmine.issues}
          issues={redmine.issues}
          pinnedIds={pinned.pinnedIds}
          pinnedIssues={pinned.pinnedIssues}
          recentlyPinned={pinned.recentlyPinned}
          onTogglePin={handleTogglePin}
          onToggleAssignedPin={handleToggleAssignedPin}
          favoriteIds={favorites.favoriteIds}
          favoriteIssues={favorites.favoriteIssues}
          onToggleFavorite={handleToggleFavorite}
          timers={timers}
          activeId={activeId}
          elapsedMap={elapsedMap}
          onPause={pause}
          onDiscard={discard}
          onAdjust={adjustElapsed}
          loading={redmine.loading}
          activities={redmine.activities}
          activitiesByProject={redmine.activitiesByProject}
          statuses={redmine.statuses}
          trackers={redmine.trackers}
          trackersByProject={redmine.trackersByProject}
          allowedStatusesByIssue={redmine.allowedStatusesByIssue}
          membersByProject={redmine.membersByProject}
          versionsByProject={redmine.versionsByProject}
          redmineUrl={redmine.redmineUrl}
          issueDescriptions={redmine.issueDescriptions}
          issueComments={redmine.issueComments}
          issueSubjects={redmine.issueSubjects}
          remoteEntries={redmine.remoteEntries}
          remoteLoading={redmine.remoteLoading}
          onFetchProjectActivities={redmine.fetchProjectActivities}
          onFetchProjectTrackers={redmine.fetchProjectTrackers}
          onFetchAllowedStatuses={redmine.fetchAllowedStatuses}
          onFetchMembers={redmine.fetchProjectMembers}
          onFetchVersions={redmine.fetchProjectVersions}
          onFetchIssueDescription={redmine.fetchIssueDescription}
          onFetchIssues={onRefresh}
          isRefreshing={isRefreshing}
          fetchIssueSubject={redmine.fetchIssueSubject}
          fetchRemoteEntries={redmine.fetchRemoteEntries}
          refreshRemoteEntries={redmine.refreshRemoteEntries}
          onStatusChange={mutations.handleStatusChange}
          onTrackerChange={mutations.handleTrackerChange}
          onAssigneeChange={mutations.handleAssigneeChange}
          onVersionChange={mutations.handleVersionChange}
          onDoneRatioChange={mutations.handleDoneRatioChange}
          onPlay={timerHandlers.handlePlay}
          onSave={timerHandlers.handleSave}
          onOpenBookDialog={timerHandlers.handleOpenBookDialog}
          onDelete={entryHandlers.handleDelete}
          onUpdateDuration={entryHandlers.handleUpdateDuration}
          onUpdateActivity={entryHandlers.handleUpdateActivity}
          onSyncEntry={syncOrch.handleSyncEntry}
          onOpenSyncDialog={syncOrch.handleOpenSyncDialog}
          onEditEntry={(entry) => dialogManager.setEditDialog(entry)}
          entries={timeLog.entries}
          onShowMessage={showSnackbar}
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
            onDoneRatioChange={mutations.handleDoneRatioChange}
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
            onDoneRatioChange={mutations.handleDoneRatioChange}
            onSave={entryHandlers.handleEdit}
            onCancel={() => dialogManager.setEditDialog(null)}
          />
        )}
      </div>
      <Snackbar data={snackbar} onDismiss={dismissSnackbar} />
    </AppProvider>
  );
}
