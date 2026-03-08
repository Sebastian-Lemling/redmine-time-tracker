import { useState, useCallback, useRef, useMemo } from "react";
import type {
  RedmineIssue,
  RedmineActivity,
  RedmineStatus,
  RedmineTracker,
} from "../types/redmine";
import { api } from "../lib/api";
import { logger } from "../lib/logger";

export function useIssueCache(instanceId?: string) {
  const prefix = instanceId ? `/api/i/${instanceId}` : "/api";

  const [issues, setIssues] = useState<RedmineIssue[]>([]);
  const [issuesLoading, setIssuesLoading] = useState(false);
  const [activities, setActivities] = useState<RedmineActivity[]>([]);
  const [statuses, setStatuses] = useState<RedmineStatus[]>([]);
  const [trackers, setTrackers] = useState<RedmineTracker[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [activitiesByProject, setActivitiesByProject] = useState<Record<number, RedmineActivity[]>>(
    {},
  );
  const fetchingActivities = useRef<Set<number>>(new Set());

  const [trackersByProject, setTrackersByProject] = useState<Record<number, RedmineTracker[]>>({});
  const fetchingProjectTrackers = useRef<Set<number>>(new Set());

  const [allowedStatusesByIssue, setAllowedStatusesByIssue] = useState<
    Record<number, RedmineStatus[]>
  >({});
  const fetchingAllowedStatuses = useRef<Set<number>>(new Set());

  const fetchIssues = useCallback(async (): Promise<RedmineIssue[]> => {
    setIssuesLoading(true);
    try {
      const data = await api<{ issues: RedmineIssue[] }>(`${prefix}/issues`);
      const result = data.issues || [];
      setIssues(result);
      return result;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch issues");
      return [];
    } finally {
      setIssuesLoading(false);
    }
  }, [prefix]);

  const fetchActivities = useCallback(async () => {
    try {
      const data = await api<{ time_entry_activities: RedmineActivity[] }>(`${prefix}/activities`);
      setActivities(data.time_entry_activities || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch activities");
    }
  }, [prefix]);

  const fetchStatuses = useCallback(async () => {
    try {
      const data = await api<{ issue_statuses: RedmineStatus[] }>(`${prefix}/statuses`);
      setStatuses(data.issue_statuses || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch statuses");
    }
  }, [prefix]);

  const fetchTrackers = useCallback(async () => {
    try {
      const data = await api<{ trackers: RedmineTracker[] }>(`${prefix}/trackers`);
      setTrackers(data.trackers || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch trackers");
    }
  }, [prefix]);

  const fetchProjectActivities = useCallback(
    async (projectId: number) => {
      if (fetchingActivities.current.has(projectId)) return;
      fetchingActivities.current.add(projectId);
      try {
        const data = await api<{ time_entry_activities: RedmineActivity[] }>(
          `${prefix}/projects/${projectId}/activities`,
        );
        setActivitiesByProject((prev) => ({
          ...prev,
          [projectId]: data.time_entry_activities || [],
        }));
      } catch (e) {
        logger.error(`Failed to fetch activities for project ${projectId}`, { error: e });
      } finally {
        fetchingActivities.current.delete(projectId);
      }
    },
    [prefix],
  );

  const fetchProjectTrackers = useCallback(
    async (projectId: number) => {
      if (fetchingProjectTrackers.current.has(projectId)) return;
      fetchingProjectTrackers.current.add(projectId);
      try {
        const data = await api<{ trackers: RedmineTracker[] }>(
          `${prefix}/projects/${projectId}/trackers`,
        );
        setTrackersByProject((prev) => ({
          ...prev,
          [projectId]: data.trackers || [],
        }));
      } catch (e) {
        logger.error(`Failed to fetch trackers for project ${projectId}`, { error: e });
      } finally {
        fetchingProjectTrackers.current.delete(projectId);
      }
    },
    [prefix],
  );

  const fetchAllowedStatuses = useCallback(
    async (issueId: number) => {
      if (fetchingAllowedStatuses.current.has(issueId)) return;
      fetchingAllowedStatuses.current.add(issueId);
      try {
        const data = await api<{ issue: { allowed_statuses?: RedmineStatus[] } }>(
          `${prefix}/issues/${issueId}?include=allowed_statuses`,
        );
        setAllowedStatusesByIssue((prev) => ({
          ...prev,
          [issueId]: data.issue.allowed_statuses || [],
        }));
      } catch (e) {
        logger.error(`Failed to fetch allowed statuses for issue ${issueId}`, { error: e });
      } finally {
        fetchingAllowedStatuses.current.delete(issueId);
      }
    },
    [prefix],
  );

  const invalidateAllowedStatuses = useCallback((issueId: number) => {
    setAllowedStatusesByIssue((prev) => {
      const next = { ...prev };
      delete next[issueId];
      return next;
    });
  }, []);

  const refreshIssue = useCallback(
    async (issueId: number): Promise<RedmineIssue | null> => {
      try {
        const data = await api<{ issue: RedmineIssue }>(`${prefix}/issues/${issueId}`);
        setIssues((prev) => prev.map((i) => (i.id === issueId ? data.issue : i)));
        return data.issue;
      } catch {
        setIssues((prev) => prev.filter((i) => i.id !== issueId));
        return null;
      }
    },
    [prefix],
  );

  const mergeIssue = useCallback((issue: RedmineIssue) => {
    setIssues((prev) => prev.map((i) => (i.id === issue.id ? issue : i)));
  }, []);

  const updateIssueStatus = useCallback(
    async (issueId: number, statusId: number, updatedOn?: string) => {
      await api<{ ok: boolean }>(`${prefix}/issues/${issueId}`, {
        method: "PUT",
        body: JSON.stringify({
          status_id: statusId,
          ...(updatedOn ? { updated_on: updatedOn } : {}),
        }),
      });
    },
    [prefix],
  );

  const updateIssueAssignee = useCallback(
    async (issueId: number, assignedToId: number, updatedOn?: string) => {
      await api<{ ok: boolean }>(`${prefix}/issues/${issueId}`, {
        method: "PUT",
        body: JSON.stringify({
          assigned_to_id: assignedToId,
          ...(updatedOn ? { updated_on: updatedOn } : {}),
        }),
      });
    },
    [prefix],
  );

  const updateIssueTracker = useCallback(
    async (issueId: number, trackerId: number, updatedOn?: string) => {
      await api<{ ok: boolean }>(`${prefix}/issues/${issueId}`, {
        method: "PUT",
        body: JSON.stringify({
          tracker_id: trackerId,
          ...(updatedOn ? { updated_on: updatedOn } : {}),
        }),
      });
    },
    [prefix],
  );

  const updateIssueVersion = useCallback(
    async (issueId: number, versionId: number, updatedOn?: string) => {
      await api<{ ok: boolean }>(`${prefix}/issues/${issueId}`, {
        method: "PUT",
        body: JSON.stringify({
          fixed_version_id: versionId,
          ...(updatedOn ? { updated_on: updatedOn } : {}),
        }),
      });
    },
    [prefix],
  );

  const updateIssueDoneRatio = useCallback(
    async (issueId: number, doneRatio: number, updatedOn?: string) => {
      await api<{ ok: boolean }>(`${prefix}/issues/${issueId}`, {
        method: "PUT",
        body: JSON.stringify({
          done_ratio: doneRatio,
          ...(updatedOn ? { updated_on: updatedOn } : {}),
        }),
      });
    },
    [prefix],
  );

  const createTimeEntry = useCallback(
    async (
      issueId: number,
      hours: number,
      description: string,
      activityId: number,
      date: string,
    ) => {
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
    [prefix],
  );

  return useMemo(
    () => ({
      issues,
      issuesLoading,
      activities,
      activitiesByProject,
      statuses,
      trackers,
      trackersByProject,
      allowedStatusesByIssue,
      error,
      fetchIssues,
      fetchActivities,
      fetchProjectActivities,
      fetchStatuses,
      fetchTrackers,
      fetchProjectTrackers,
      fetchAllowedStatuses,
      invalidateAllowedStatuses,
      refreshIssue,
      mergeIssue,
      updateIssueStatus,
      updateIssueAssignee,
      updateIssueTracker,
      updateIssueVersion,
      updateIssueDoneRatio,
      createTimeEntry,
    }),
    [
      issues,
      issuesLoading,
      activities,
      activitiesByProject,
      statuses,
      trackers,
      trackersByProject,
      allowedStatusesByIssue,
      error,
      fetchIssues,
      fetchActivities,
      fetchProjectActivities,
      fetchStatuses,
      fetchTrackers,
      fetchProjectTrackers,
      fetchAllowedStatuses,
      invalidateAllowedStatuses,
      refreshIssue,
      mergeIssue,
      updateIssueStatus,
      updateIssueAssignee,
      updateIssueTracker,
      updateIssueVersion,
      updateIssueDoneRatio,
      createTimeEntry,
    ],
  );
}
