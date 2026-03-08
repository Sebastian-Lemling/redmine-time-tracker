import { useCallback, useRef, useEffect } from "react";
import type { TimeLogEntry } from "../types/redmine";
import type { Translations } from "../i18n/translations";
import type { SnackbarData } from "../components/ui/Snackbar";

interface Deps {
  entries: TimeLogEntry[];
  updateEntry: (id: string, updates: Partial<TimeLogEntry>) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  removeEntryFromState: (id: string) => TimeLogEntry | undefined;
  restoreEntryToState: (entry: TimeLogEntry) => void;
  showSnackbar: (message: string, action?: SnackbarData["action"]) => void;
  setEditDialog: (entry: TimeLogEntry | null) => void;
  setError: (msg: string | null) => void;
  t: Translations;
}

interface PendingDelete {
  entry: TimeLogEntry;
  timeoutId: ReturnType<typeof setTimeout>;
}

export function useEntryHandlers(deps: Deps) {
  const {
    entries,
    updateEntry,
    deleteEntry,
    removeEntryFromState,
    restoreEntryToState,
    showSnackbar,
    setEditDialog,
    setError,
    t,
  } = deps;

  const pendingDeleteRef = useRef<PendingDelete | null>(null);

  const flushPendingDelete = useCallback(() => {
    const pending = pendingDeleteRef.current;
    if (pending) {
      clearTimeout(pending.timeoutId);
      pendingDeleteRef.current = null;
      deleteEntry(pending.entry.id).catch(() => {});
    }
  }, [deleteEntry]);

  useEffect(() => {
    const flushOnUnload = () => {
      const pending = pendingDeleteRef.current;
      if (pending) {
        navigator.sendBeacon(`/api/timelog/${pending.entry.id}?_method=DELETE`);
        pendingDeleteRef.current = null;
      }
    };
    window.addEventListener("beforeunload", flushOnUnload);
    return () => {
      window.removeEventListener("beforeunload", flushOnUnload);
      const pending = pendingDeleteRef.current;
      if (pending) {
        clearTimeout(pending.timeoutId);
        pendingDeleteRef.current = null;
        deleteEntry(pending.entry.id).catch(() => {});
      }
    };
  }, [deleteEntry]);

  const handleEdit = useCallback(
    async (
      id: string,
      updates: {
        description: string;
        duration: number;
        date: string;
        activityId?: number;
        activityName?: string;
      },
    ) => {
      try {
        const entry = entries.find((e) => e.id === id);
        const extra: Partial<TimeLogEntry> = {};
        if (entry && entry.originalDuration == null) {
          extra.originalDuration = entry.duration;
        }
        await updateEntry(id, { ...extra, ...updates });
        setEditDialog(null);
      } catch (e) {
        setError(`Failed to update entry: ${e instanceof Error ? e.message : "Unknown error"}`);
      }
    },
    [entries, updateEntry, setEditDialog, setError],
  );

  const handleUpdateDuration = useCallback(
    async (id: string, newDuration: number) => {
      try {
        const entry = entries.find((e) => e.id === id);
        const extra: Partial<TimeLogEntry> = {};
        if (entry && entry.originalDuration == null) {
          extra.originalDuration = entry.duration;
        }
        await updateEntry(id, { ...extra, duration: newDuration });
      } catch (e) {
        setError(`Failed to update duration: ${e instanceof Error ? e.message : "Unknown error"}`);
      }
    },
    [entries, updateEntry, setError],
  );

  const handleUpdateActivity = useCallback(
    async (id: string, activityId: number) => {
      try {
        await updateEntry(id, { activityId });
      } catch (e) {
        setError(`Failed to update activity: ${e instanceof Error ? e.message : "Unknown error"}`);
      }
    },
    [updateEntry, setError],
  );

  const handleDelete = useCallback(
    (id: string) => {
      flushPendingDelete();

      const removed = removeEntryFromState(id);
      if (!removed) return;

      const timeoutId = setTimeout(() => {
        pendingDeleteRef.current = null;
        deleteEntry(removed.id).catch((e) => {
          restoreEntryToState(removed);
          setError(`Failed to delete entry: ${e instanceof Error ? e.message : "Unknown error"}`);
        });
      }, 5000);

      pendingDeleteRef.current = { entry: removed, timeoutId };

      showSnackbar(t.entryDeleted, {
        label: t.undo,
        onClick: () => {
          const pending = pendingDeleteRef.current;
          if (pending && pending.entry.id === removed.id) {
            clearTimeout(pending.timeoutId);
            pendingDeleteRef.current = null;
            restoreEntryToState(removed);
          }
        },
      });
    },
    [
      flushPendingDelete,
      removeEntryFromState,
      restoreEntryToState,
      deleteEntry,
      showSnackbar,
      setError,
      t,
    ],
  );

  return { handleEdit, handleUpdateDuration, handleUpdateActivity, handleDelete };
}
