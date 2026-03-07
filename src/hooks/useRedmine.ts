import { useMemo } from "react";
import { useUser } from "./useUser";
import { useIssueCache } from "./useIssueCache";
import { useProjectData } from "./useProjectData";
import { useIssueDetails } from "./useIssueDetails";
import { useRemoteEntries } from "./useRemoteEntries";

export function useRedmine(instanceId?: string) {
  const user = useUser(instanceId);
  const issueCache = useIssueCache(instanceId);
  const projectData = useProjectData(instanceId);
  const issueDetails = useIssueDetails(instanceId);
  const remoteEntries = useRemoteEntries(instanceId);

  return useMemo(
    () => ({
      user: user.user,
      redmineUrl: user.redmineUrl,
      loading: user.loading,
      error: user.error || issueCache.error,

      issues: issueCache.issues,
      issuesLoading: issueCache.issuesLoading,
      activities: issueCache.activities,
      activitiesByProject: issueCache.activitiesByProject,
      statuses: issueCache.statuses,
      trackers: issueCache.trackers,
      trackersByProject: issueCache.trackersByProject,
      allowedStatusesByIssue: issueCache.allowedStatusesByIssue,
      fetchIssues: issueCache.fetchIssues,
      fetchActivities: issueCache.fetchActivities,
      fetchProjectActivities: issueCache.fetchProjectActivities,
      fetchStatuses: issueCache.fetchStatuses,
      fetchTrackers: issueCache.fetchTrackers,
      fetchProjectTrackers: issueCache.fetchProjectTrackers,
      fetchAllowedStatuses: issueCache.fetchAllowedStatuses,
      invalidateAllowedStatuses: issueCache.invalidateAllowedStatuses,
      refreshIssue: issueCache.refreshIssue,
      mergeIssue: issueCache.mergeIssue,
      updateIssueStatus: issueCache.updateIssueStatus,
      updateIssueAssignee: issueCache.updateIssueAssignee,
      updateIssueTracker: issueCache.updateIssueTracker,
      updateIssueVersion: issueCache.updateIssueVersion,
      updateIssueDoneRatio: issueCache.updateIssueDoneRatio,
      createTimeEntry: issueCache.createTimeEntry,

      membersByProject: projectData.membersByProject,
      versionsByProject: projectData.versionsByProject,
      fetchProjectMembers: projectData.fetchProjectMembers,
      fetchProjectVersions: projectData.fetchProjectVersions,

      issueSubjects: issueDetails.issueSubjects,
      issueDescriptions: issueDetails.issueDescriptions,
      issueComments: issueDetails.issueComments,
      fetchIssueSubject: issueDetails.fetchIssueSubject,
      fetchIssueDescription: issueDetails.fetchIssueDescription,

      remoteEntries: remoteEntries.remoteEntries,
      remoteLoading: remoteEntries.remoteLoading,
      fetchRemoteEntries: remoteEntries.fetchRemoteEntries,
      refreshRemoteEntries: remoteEntries.refreshRemoteEntries,
    }),
    [user, issueCache, projectData, issueDetails, remoteEntries],
  );
}
