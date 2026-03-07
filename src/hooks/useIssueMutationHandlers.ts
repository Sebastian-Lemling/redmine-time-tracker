import { useCallback } from "react";
import type { RedmineIssue, RedmineStatus, RedmineTracker, RedmineVersion } from "../types/redmine";
import type { Translations } from "../i18n/translations";
import { ConflictError } from "../lib/errors";

interface Deps {
  mergedIssues: RedmineIssue[];
  statuses: RedmineStatus[];
  trackers: RedmineTracker[];
  versionsByProject: Record<number, RedmineVersion[]>;
  refreshIssue: (id: number) => Promise<RedmineIssue | null>;
  mergeIssue: (issue: RedmineIssue) => void;
  updateIssueStatus: (id: number, statusId: number, updatedOn?: string) => Promise<void>;
  updateIssueTracker: (id: number, trackerId: number, updatedOn?: string) => Promise<void>;
  updateIssueAssignee: (id: number, assigneeId: number, updatedOn?: string) => Promise<void>;
  updateIssueVersion: (id: number, versionId: number, updatedOn?: string) => Promise<void>;
  updateIssueDoneRatio: (id: number, ratio: number, updatedOn?: string) => Promise<void>;
  invalidateAllowedStatuses: (id: number) => void;
  isPinned: (id: number) => boolean;
  updatePinnedIssue: (issue: RedmineIssue) => void;
  updateFavoriteIssue: (issue: RedmineIssue) => void;
  setSnackbar: (msg: string) => void;
  fetchIssues: () => Promise<RedmineIssue[]>;
  onMutationSuccess?: () => void;
  t: Translations;
}

export function useIssueMutationHandlers(deps: Deps) {
  const {
    mergedIssues,
    statuses,
    trackers,
    versionsByProject,
    refreshIssue,
    mergeIssue,
    updateIssueStatus,
    updateIssueTracker,
    updateIssueAssignee,
    updateIssueVersion,
    updateIssueDoneRatio,
    invalidateAllowedStatuses,
    fetchIssues,
    isPinned,
    updatePinnedIssue,
    updateFavoriteIssue,
    setSnackbar,
    onMutationSuccess,
    t,
  } = deps;

  const mutateIssue = useCallback(
    async (
      issueId: number,
      action: (updatedOn?: string) => Promise<void>,
      successMsg: string,
      failMsg: string,
    ) => {
      const issue = mergedIssues.find((i) => i.id === issueId);
      try {
        await action(issue?.updated_on);
        const fresh = await refreshIssue(issueId);
        if (fresh) {
          if (isPinned(issueId)) updatePinnedIssue(fresh);
          updateFavoriteIssue(fresh);
        }
        onMutationSuccess?.();
        setSnackbar(successMsg);
      } catch (e: unknown) {
        if (e instanceof ConflictError && e.currentIssue) {
          mergeIssue(e.currentIssue as RedmineIssue);
          if (isPinned(issueId)) updatePinnedIssue(e.currentIssue as RedmineIssue);
          updateFavoriteIssue(e.currentIssue as RedmineIssue);
          setSnackbar(t.conflictDetected);
        } else {
          setSnackbar(e instanceof Error ? e.message : failMsg);
        }
      }
    },
    [
      mergedIssues,
      refreshIssue,
      mergeIssue,
      isPinned,
      updatePinnedIssue,
      updateFavoriteIssue,
      setSnackbar,
      onMutationSuccess,
      t,
    ],
  );

  const handleStatusChange = useCallback(
    async (issueId: number, statusId: number) => {
      const statusName = statuses.find((s) => s.id === statusId)?.name;
      await mutateIssue(
        issueId,
        (updatedOn) => updateIssueStatus(issueId, statusId, updatedOn),
        t.statusUpdated(statusName ?? "OK"),
        t.statusChangeFailed,
      );
      invalidateAllowedStatuses(issueId);
    },
    [statuses, updateIssueStatus, invalidateAllowedStatuses, mutateIssue, t],
  );

  const handleTrackerChange = useCallback(
    async (issueId: number, trackerId: number) => {
      const trackerName = trackers.find((tr) => tr.id === trackerId)?.name;
      await mutateIssue(
        issueId,
        (updatedOn) => updateIssueTracker(issueId, trackerId, updatedOn),
        t.typeUpdated(trackerName ?? "OK"),
        t.typeChangeFailed,
      );
    },
    [trackers, updateIssueTracker, mutateIssue, t],
  );

  const handleAssigneeChange = useCallback(
    async (issueId: number, assigneeId: number) => {
      await mutateIssue(
        issueId,
        (updatedOn) => updateIssueAssignee(issueId, assigneeId, updatedOn),
        t.assigneeUpdated,
        t.assigneeChangeFailed,
      );
      fetchIssues();
    },
    [updateIssueAssignee, mutateIssue, fetchIssues, t],
  );

  const handleVersionChange = useCallback(
    async (issueId: number, versionId: number) => {
      const versionName = Object.values(versionsByProject)
        .flat()
        .find((v) => v.id === versionId)?.name;
      await mutateIssue(
        issueId,
        (updatedOn) => updateIssueVersion(issueId, versionId, updatedOn),
        t.versionUpdated(versionName ?? "OK"),
        t.versionChangeFailed,
      );
    },
    [versionsByProject, updateIssueVersion, mutateIssue, t],
  );

  const handleDoneRatioChange = useCallback(
    async (issueId: number, doneRatio: number) => {
      await mutateIssue(
        issueId,
        (updatedOn) => updateIssueDoneRatio(issueId, doneRatio, updatedOn),
        `${doneRatio}%`,
        "Update failed",
      );
    },
    [updateIssueDoneRatio, mutateIssue],
  );

  return {
    handleStatusChange,
    handleTrackerChange,
    handleAssigneeChange,
    handleVersionChange,
    handleDoneRatioChange,
  };
}
