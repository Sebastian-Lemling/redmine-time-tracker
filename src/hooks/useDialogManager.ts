import { useState, useCallback, useEffect, useMemo } from "react";
import type { RedmineIssue, RedmineActivity, TimeLogEntry, TimerState } from "../types/redmine";
import type { BookingDialogData } from "../components/dialogs/BookingDialog";

interface Deps {
  addEntry: (
    entry: Omit<TimeLogEntry, "id" | "syncedToRedmine" | "redmineTimeEntryId">,
  ) => Promise<TimeLogEntry>;
  discard: (issueId: number) => void;
  timers: Record<number, TimerState>;
  startOrResume: (issueId: number, subject: string, projectName: string, projectId: number) => void;
  issues: RedmineIssue[];
  activities: RedmineActivity[];
  activitiesByProject: Record<number, RedmineActivity[]>;
  fetchProjectActivities: (projectId: number) => Promise<void>;
  setError: (msg: string | null) => void;
}

export function useDialogManager(deps: Deps) {
  const {
    addEntry,
    discard,
    timers,
    startOrResume,
    issues,
    activities,
    activitiesByProject,
    fetchProjectActivities,
    setError,
  } = deps;

  const [bookDialog, setBookDialog] = useState<BookingDialogData | null>(null);
  const [syncDialog, setSyncDialog] = useState<TimeLogEntry | null>(null);
  const [editDialog, setEditDialog] = useState<TimeLogEntry | null>(null);

  const getProjectIdForEntry = useCallback(
    (entry: TimeLogEntry): number | undefined => {
      if (entry.projectId) return entry.projectId;
      return issues.find((i) => i.id === entry.issueId)?.project.id;
    },
    [issues],
  );

  useEffect(() => {
    if (!syncDialog) return;
    const projectId = getProjectIdForEntry(syncDialog);
    if (projectId && !activitiesByProject[projectId]) {
      fetchProjectActivities(projectId);
    }
  }, [syncDialog, getProjectIdForEntry, activitiesByProject, fetchProjectActivities]);

  useEffect(() => {
    if (!bookDialog?.projectId) return;
    if (!activitiesByProject[bookDialog.projectId]) {
      fetchProjectActivities(bookDialog.projectId);
    }
  }, [bookDialog, activitiesByProject, fetchProjectActivities]);

  useEffect(() => {
    if (!editDialog) return;
    const projectId = getProjectIdForEntry(editDialog);
    if (projectId && !activitiesByProject[projectId]) {
      fetchProjectActivities(projectId);
    }
  }, [editDialog, getProjectIdForEntry, activitiesByProject, fetchProjectActivities]);

  const editDialogActivities = useMemo(() => {
    if (!editDialog) return activities;
    const projectId = getProjectIdForEntry(editDialog);
    if (projectId && activitiesByProject[projectId]?.length) {
      return activitiesByProject[projectId];
    }
    return activities;
  }, [editDialog, getProjectIdForEntry, activitiesByProject, activities]);

  const syncDialogActivities = useMemo(() => {
    if (!syncDialog) return activities;
    const projectId = getProjectIdForEntry(syncDialog);
    if (projectId && activitiesByProject[projectId]?.length) {
      return activitiesByProject[projectId];
    }
    return activities;
  }, [syncDialog, getProjectIdForEntry, activitiesByProject, activities]);

  const bookDialogActivities = useMemo(() => {
    if (!bookDialog) return activities;
    if (bookDialog.projectId && activitiesByProject[bookDialog.projectId]?.length) {
      return activitiesByProject[bookDialog.projectId];
    }
    return activities;
  }, [bookDialog, activitiesByProject, activities]);

  const handleBookConfirm = useCallback(
    async (entry: {
      issueId: number;
      issueSubject: string;
      projectId: number;
      projectName: string;
      startTime: string;
      endTime: string;
      duration: number;
      originalDuration: number;
      description: string;
      date: string;
      activityId: number;
    }) => {
      if (!bookDialog) return;
      try {
        await addEntry({
          issueId: entry.issueId,
          issueSubject: entry.issueSubject,
          projectId: entry.projectId,
          projectName: entry.projectName,
          startTime: entry.startTime,
          endTime: entry.endTime,
          duration: entry.duration,
          originalDuration: entry.originalDuration,
          description: entry.description,
          date: entry.date,
          activityId: entry.activityId,
        });
        if (bookDialog.startTime) {
          discard(bookDialog.issueId);
        }
        setBookDialog(null);
      } catch (e) {
        setError(`Failed to save entry: ${e instanceof Error ? e.message : "Unknown error"}`);
      }
    },
    [bookDialog, addEntry, discard, setError],
  );

  const handleBookCancel = useCallback(() => {
    if (bookDialog?.wasRunning) {
      const timer = timers[bookDialog.issueId];
      if (timer) {
        startOrResume(timer.issueId, timer.issueSubject, timer.projectName, timer.projectId ?? 0);
      }
    }
    setBookDialog(null);
  }, [bookDialog, timers, startOrResume]);

  return {
    bookDialog,
    setBookDialog,
    syncDialog,
    setSyncDialog,
    editDialog,
    setEditDialog,
    bookDialogActivities,
    editDialogActivities,
    syncDialogActivities,
    handleBookConfirm,
    handleBookCancel,
  };
}
