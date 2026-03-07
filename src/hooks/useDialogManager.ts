import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import type {
  RedmineIssue,
  RedmineActivity,
  TimeLogEntry,
  MultiTimerMap,
  TimerKey,
} from "../types/redmine";
import { timerKey } from "../types/redmine";
import { api } from "../lib/api";
import { logger } from "../lib/logger";
import type { BookingDialogData } from "../components/dialogs/BookingDialog";

interface Deps {
  addEntry: (
    entry: Omit<TimeLogEntry, "id" | "syncedToRedmine" | "redmineTimeEntryId">,
  ) => Promise<TimeLogEntry>;
  discard: (key: TimerKey) => void;
  timers: MultiTimerMap;
  startOrResume: (
    instanceId: string,
    issueId: number,
    subject: string,
    projectName: string,
    projectId?: number,
  ) => void;
  issues: RedmineIssue[];
  activities: RedmineActivity[];
  setError: (msg: string | null) => void;
}

export function useDialogManager(deps: Deps) {
  const { addEntry, discard, timers, startOrResume, issues, activities, setError } = deps;

  const [bookDialog, setBookDialog] = useState<BookingDialogData | null>(null);
  const [syncDialog, setSyncDialog] = useState<TimeLogEntry | null>(null);
  const [editDialog, setEditDialog] = useState<TimeLogEntry | null>(null);

  // Instance-aware activity cache: keyed by "instanceId:projectId"
  const [activityCache, setActivityCache] = useState<Record<string, RedmineActivity[]>>({});
  const fetchingRef = useRef(new Set<string>());

  const fetchActivitiesFor = useCallback(
    async (instanceId: string | undefined, projectId: number) => {
      const inst = instanceId || "default";
      const cacheKey = `${inst}:${projectId}`;
      if (activityCache[cacheKey] || fetchingRef.current.has(cacheKey)) return;
      fetchingRef.current.add(cacheKey);
      try {
        const prefix = `/api/i/${inst}`;
        const data = await api<{ time_entry_activities: RedmineActivity[] }>(
          `${prefix}/projects/${projectId}/activities`,
        );
        setActivityCache((prev) => ({
          ...prev,
          [cacheKey]: data.time_entry_activities || [],
        }));
      } catch (e) {
        logger.error(`Failed to fetch activities for ${cacheKey}`, { error: e });
      } finally {
        fetchingRef.current.delete(cacheKey);
      }
    },
    [activityCache],
  );

  const getProjectIdForEntry = useCallback(
    (entry: TimeLogEntry): number | undefined => {
      if (entry.projectId) return entry.projectId;
      return issues.find((i) => i.id === entry.issueId)?.project.id;
    },
    [issues],
  );

  const getCachedActivities = useCallback(
    (instanceId: string | undefined, projectId: number | undefined): RedmineActivity[] => {
      if (!projectId) return activities;
      const inst = instanceId || "default";
      const cacheKey = `${inst}:${projectId}`;
      return activityCache[cacheKey]?.length ? activityCache[cacheKey] : activities;
    },
    [activityCache, activities],
  );

  useEffect(() => {
    if (!syncDialog) return;
    const projectId = getProjectIdForEntry(syncDialog);
    if (projectId) fetchActivitiesFor(syncDialog.instanceId, projectId);
  }, [syncDialog, getProjectIdForEntry, fetchActivitiesFor]);

  useEffect(() => {
    if (!bookDialog?.projectId) return;
    fetchActivitiesFor(bookDialog.instanceId, bookDialog.projectId);
  }, [bookDialog, fetchActivitiesFor]);

  useEffect(() => {
    if (!editDialog) return;
    const projectId = getProjectIdForEntry(editDialog);
    if (projectId) fetchActivitiesFor(editDialog.instanceId, projectId);
  }, [editDialog, getProjectIdForEntry, fetchActivitiesFor]);

  const editDialogActivities = useMemo(() => {
    if (!editDialog) return activities;
    const projectId = getProjectIdForEntry(editDialog);
    return getCachedActivities(editDialog.instanceId, projectId);
  }, [editDialog, getProjectIdForEntry, getCachedActivities, activities]);

  const syncDialogActivities = useMemo(() => {
    if (!syncDialog) return activities;
    const projectId = getProjectIdForEntry(syncDialog);
    return getCachedActivities(syncDialog.instanceId, projectId);
  }, [syncDialog, getProjectIdForEntry, getCachedActivities, activities]);

  const bookDialogActivities = useMemo(() => {
    if (!bookDialog) return activities;
    return getCachedActivities(bookDialog.instanceId, bookDialog.projectId);
  }, [bookDialog, getCachedActivities, activities]);

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
      const instanceId = bookDialog.instanceId || "default";
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
          instanceId,
        });
        if (bookDialog.startTime) {
          discard(timerKey(instanceId, bookDialog.issueId));
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
      const instanceId = bookDialog.instanceId || "default";
      const key = timerKey(instanceId, bookDialog.issueId);
      const timer = timers[key];
      if (timer) {
        startOrResume(
          timer.instanceId,
          timer.issueId,
          timer.issueSubject,
          timer.projectName,
          timer.projectId,
        );
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
