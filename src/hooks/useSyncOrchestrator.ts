import { useState, useCallback } from "react";
import type { TimeLogEntry } from "../types/redmine";
import type { Translations } from "../i18n/translations";

interface Deps {
  entries: TimeLogEntry[];
  markSynced: (id: string, redmineId: number) => Promise<void>;
  createTimeEntry: (
    instanceId: string,
    issueId: number,
    hours: number,
    description: string,
    activityId: number,
    date: string,
  ) => Promise<number>;
  refreshRemoteEntries: () => void;
  setSyncDialog: (entry: TimeLogEntry | null) => void;
  setSnackbar: (msg: string) => void;
  setError: (msg: string | null) => void;
  t: Translations;
}

export function useSyncOrchestrator(deps: Deps) {
  const {
    entries,
    markSynced,
    createTimeEntry,
    refreshRemoteEntries,
    setSyncDialog,
    setSnackbar,
    setError,
    t,
  } = deps;
  const [syncQueue, setSyncQueue] = useState<string[]>([]);
  const [syncAllMode, setSyncAllMode] = useState(false);

  const handleSyncEntry = useCallback(
    async (entryId: string, activityId: number) => {
      const entry = entries.find((e) => e.id === entryId);
      if (!entry) return;
      const hours = Number((entry.duration / 60).toFixed(2));
      const redmineId = await createTimeEntry(
        entry.instanceId,
        entry.issueId,
        hours,
        entry.description,
        activityId,
        entry.date,
      );
      await markSynced(entryId, redmineId);
      await refreshRemoteEntries();
    },
    [entries, markSynced, createTimeEntry, refreshRemoteEntries],
  );

  const handleSync = useCallback(
    async (entryId: string, activityId: number) => {
      const entry = entries.find((e) => e.id === entryId);
      if (!entry) return;
      const hours = Number((entry.duration / 60).toFixed(2));
      const redmineId = await createTimeEntry(
        entry.instanceId,
        entry.issueId,
        hours,
        entry.description,
        activityId,
        entry.date,
      );
      try {
        await markSynced(entryId, redmineId);
      } catch {
        setError(
          `Booked to Redmine (ID: ${redmineId}) but failed to update local state. Refresh the page.`,
        );
      }
      await refreshRemoteEntries();
      setSyncDialog(null);

      if (syncAllMode) {
        if (syncQueue.length > 0) {
          const nextId = syncQueue[0];
          const nextEntry = entries.find((e) => e.id === nextId);
          setSyncQueue((prev) => prev.slice(1));
          if (nextEntry && !nextEntry.syncedToRedmine) {
            setSyncDialog(nextEntry);
          } else {
            setSyncAllMode(false);
            setSyncQueue([]);
          }
        } else {
          const nextUnsynced = entries.find((e) => !e.syncedToRedmine && e.id !== entryId);
          if (nextUnsynced) {
            setSyncDialog(nextUnsynced);
          } else {
            setSyncAllMode(false);
          }
        }
      }
    },
    [
      entries,
      markSynced,
      createTimeEntry,
      syncAllMode,
      syncQueue,
      refreshRemoteEntries,
      setSyncDialog,
      setError,
    ],
  );

  const handleOpenSyncDialog = useCallback(
    (entry: TimeLogEntry) => {
      if (entry.activityId) {
        handleSyncEntry(entry.id, entry.activityId)
          .then(() => setSnackbar(t.synced))
          .catch((e) => setSnackbar(e instanceof Error ? e.message : t.syncFailed));
      } else {
        setSyncAllMode(false);
        setSyncDialog(entry);
      }
    },
    [handleSyncEntry, setSnackbar, setSyncDialog, t],
  );

  const handleSyncAll = useCallback(() => {
    const unsynced = entries.filter((e) => !e.syncedToRedmine);
    if (unsynced.length > 0) {
      setSyncAllMode(true);
      setSyncDialog(unsynced[0]);
    }
  }, [entries, setSyncDialog]);

  const cancelSyncAll = useCallback(() => {
    setSyncAllMode(false);
    setSyncQueue([]);
  }, []);

  return {
    syncAllMode,
    handleSync,
    handleSyncEntry,
    handleOpenSyncDialog,
    handleSyncAll,
    cancelSyncAll,
  };
}
