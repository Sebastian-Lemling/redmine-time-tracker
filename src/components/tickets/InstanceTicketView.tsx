import { useCallback, useMemo, useEffect, useRef, useState } from "react";
import type { RedmineIssue, MultiTimerMap, ActiveTimerKey, TimerKey } from "../../types/redmine";
import { parseTimerKey, timerKey } from "../../types/redmine";
import { useRedmine } from "../../hooks/useRedmine";
import { usePinnedIssues } from "../../hooks/usePinnedIssues";
import { useFavorites } from "../../hooks/useFavorites";
import { useIssueMutationHandlers } from "../../hooks/useIssueMutationHandlers";
import { useTimerHandlers } from "../../hooks/useTimerHandlers";
import { useVisibilityRefresh } from "../../hooks/useVisibilityRefresh";
import { useI18n } from "../../i18n/I18nContext";
import { ErrorBoundary } from "../ui";
import { ConversationDialog } from "../dialogs";
import { TicketList } from "./TicketList";
import { SearchPanel } from "./SearchPanel";
import type { SaveResult } from "../../hooks/useMultiTimer";
import type { BookingDialogData } from "../dialogs/BookingDialog";

interface Props {
  instanceId: string;
  timers: MultiTimerMap;
  activeTimerKey: ActiveTimerKey;
  elapsedMap: Record<TimerKey, number>;
  onPause: () => void;
  startOrResume: (
    instanceId: string,
    issueId: number,
    subject: string,
    projectName: string,
    projectId?: number,
  ) => void;
  capture: (key: TimerKey) => SaveResult | null;
  discard: (key: TimerKey) => void;
  adjustElapsed: (key: TimerKey, deltaSec: number) => void;
  setBookDialog: (data: BookingDialogData | null) => void;
  showSnackbar: (msg: string) => void;
  refreshTrigger: number;
  onRefreshComplete: (changed: boolean, changedCount: number) => void;
}

export function InstanceTicketView({
  instanceId,
  timers,
  activeTimerKey,
  elapsedMap,
  onPause,
  startOrResume,
  capture,
  discard,
  adjustElapsed,
  setBookDialog,
  showSnackbar,
  refreshTrigger,
  onRefreshComplete,
}: Props) {
  const { t } = useI18n();
  const redmine = useRedmine(instanceId);
  const pinned = usePinnedIssues(instanceId);
  const favorites = useFavorites(instanceId);

  useEffect(() => {
    if (redmine.user) {
      redmine.fetchIssues();
      redmine.fetchActivities();
      redmine.fetchStatuses();
      redmine.fetchTrackers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [redmine.user]);

  const assignedIdSet = useMemo(() => new Set(redmine.issues.map((i) => i.id)), [redmine.issues]);
  const mergedIssues = useMemo(() => pinned.pinnedIssues, [pinned.pinnedIssues]);

  const allKnownIssues = useMemo(() => {
    const pinnedIdSet = pinned.pinnedIds;
    const extras = favorites.favoriteIssues.filter((i) => !pinnedIdSet.has(i.id));
    return extras.length > 0 ? [...pinned.pinnedIssues, ...extras] : pinned.pinnedIssues;
  }, [pinned.pinnedIssues, pinned.pinnedIds, favorites.favoriteIssues]);

  useEffect(() => {
    pinned.syncAssignedPins(redmine.issues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [redmine.issues]);

  useEffect(() => {
    if (mergedIssues.length > 0) {
      redmine.prefetchIssueDetails(mergedIssues.map((i) => i.id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mergedIssues]);

  const instanceActiveId = useMemo(() => {
    if (!activeTimerKey) return null;
    const parsed = parseTimerKey(activeTimerKey);
    return parsed.instanceId === instanceId ? parsed.issueId : null;
  }, [activeTimerKey, instanceId]);

  const instanceTimers = useMemo(() => {
    const result: MultiTimerMap = {};
    for (const [key, state] of Object.entries(timers)) {
      const parsed = parseTimerKey(key);
      if (parsed.instanceId === instanceId) {
        result[String(parsed.issueId)] = state;
      }
    }
    return result;
  }, [timers, instanceId]);

  const instanceElapsedMap = useMemo(() => {
    const result: Record<number, number> = {};
    for (const [key, elapsed] of Object.entries(elapsedMap)) {
      const parsed = parseTimerKey(key);
      if (parsed.instanceId === instanceId) {
        result[parsed.issueId] = elapsed;
      }
    }
    return result;
  }, [elapsedMap, instanceId]);

  const onDiscard = useCallback(
    (issueId: number) => discard(timerKey(instanceId, issueId)),
    [instanceId, discard],
  );

  const onAdjust = useCallback(
    (issueId: number, deltaSec: number) => adjustElapsed(timerKey(instanceId, issueId), deltaSec),
    [instanceId, adjustElapsed],
  );

  const timerHandlers = useTimerHandlers({
    instanceId,
    activeId: activeTimerKey,
    startOrResume,
    capture,
    setBookDialog,
  });

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
    refreshWeekRemoteEntries: () => {},
  });

  const fieldNameMap = useMemo(() => {
    const map: Record<string, Record<string, string>> = {};
    map.status_id = {};
    for (const s of redmine.statuses) map.status_id[String(s.id)] = s.name;
    map.tracker_id = {};
    for (const tr of redmine.trackers) map.tracker_id[String(tr.id)] = tr.name;
    map.assigned_to_id = {};
    for (const members of Object.values(redmine.membersByProject)) {
      for (const m of members) map.assigned_to_id[String(m.id)] = m.name;
    }
    map.fixed_version_id = {};
    for (const versions of Object.values(redmine.versionsByProject)) {
      for (const v of versions) map.fixed_version_id[String(v.id)] = v.name;
    }
    map.priority_id = {};
    for (const issue of allKnownIssues) {
      map.priority_id[String(issue.priority.id)] = issue.priority.name;
      if (issue.assigned_to) {
        map.assigned_to_id[String(issue.assigned_to.id)] = issue.assigned_to.name;
      }
    }
    return map;
  }, [
    redmine.statuses,
    redmine.trackers,
    redmine.membersByProject,
    redmine.versionsByProject,
    allKnownIssues,
  ]);

  const [conversationState, setConversationState] = useState<{
    issueId: number;
    tab: "description" | "comments";
  } | null>(null);

  const handleOpenConversation = useCallback(
    (issueId: number, tab?: "description" | "comments") => {
      setConversationState({ issueId, tab: tab ?? "comments" });
      redmine.fetchIssueDescription(issueId);
      const issue = allKnownIssues.find((i) => i.id === issueId);
      if (issue?.project?.id) {
        redmine.fetchProjectMembers(issue.project.id);
        redmine.fetchProjectVersions(issue.project.id);
      }
    },
    [redmine, allKnownIssues],
  );

  const handleCloseConversation = useCallback(() => {
    setConversationState(null);
  }, []);

  const handleRefreshConversation = useCallback(
    (issueId: number) => {
      redmine.fetchIssueDescription(issueId);
    },
    [redmine],
  );

  const mutations = useIssueMutationHandlers({
    mergedIssues: allKnownIssues,
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
    fetchIssues: redmine.fetchIssues,
    isPinned: pinned.isPinned,
    updatePinnedIssue: pinned.updateIssue,
    updateFavoriteIssue: favorites.updateIssue,
    setSnackbar: showSnackbar,
    onMutationSuccess: () => {
      lastFetchRef.current = Date.now();
    },
    t,
  });

  const prevTrigger = useRef(refreshTrigger);
  useEffect(() => {
    if (refreshTrigger === prevTrigger.current) return;
    prevTrigger.current = refreshTrigger;
    lastFetchRef.current = Date.now();

    const snapshot = redmine.issues
      .map((i) => `${i.id}:${i.updated_on}`)
      .sort()
      .join("|");

    Promise.all([redmine.fetchIssues(), pinned.refreshPinned()])
      .then(([newIssues]) => {
        const newSnapshot = newIssues
          .map((i: RedmineIssue) => `${i.id}:${i.updated_on}`)
          .sort()
          .join("|");
        const changed = newSnapshot !== snapshot;
        const changedCount = changed
          ? newIssues.filter((i: RedmineIssue) => {
              const old = redmine.issues.find((o) => o.id === i.id);
              return !old || old.updated_on !== i.updated_on;
            }).length
          : 0;
        onRefreshComplete(changed, changedCount);
      })
      .catch(() => {
        onRefreshComplete(false, 0);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger]);

  return (
    <>
      <div className="ticket-panel--left">
        <ErrorBoundary>
          <TicketList
            instanceId={instanceId}
            issues={mergedIssues}
            pinnedIds={pinned.pinnedIds}
            timers={instanceTimers}
            activeId={instanceActiveId}
            elapsedMap={instanceElapsedMap}
            loading={redmine.loading}
            statuses={redmine.statuses}
            trackers={redmine.trackers}
            trackersByProject={redmine.trackersByProject}
            allowedStatusesByIssue={redmine.allowedStatusesByIssue}
            onFetchProjectTrackers={redmine.fetchProjectTrackers}
            onFetchAllowedStatuses={redmine.fetchAllowedStatuses}
            membersByProject={redmine.membersByProject}
            versionsByProject={redmine.versionsByProject}
            redmineUrl={redmine.redmineUrl}
            onStatusChange={mutations.handleStatusChange}
            onTrackerChange={mutations.handleTrackerChange}
            onAssigneeChange={mutations.handleAssigneeChange}
            onVersionChange={mutations.handleVersionChange}
            onDoneRatioChange={mutations.handleDoneRatioChange}
            onFetchMembers={redmine.fetchProjectMembers}
            onFetchVersions={redmine.fetchProjectVersions}
            onPlay={timerHandlers.handlePlay}
            onPause={onPause}
            onSave={timerHandlers.handleSave}
            onDiscard={onDiscard}
            onAdjust={onAdjust}
            onOpenBookDialog={timerHandlers.handleOpenBookDialog}
            issueComments={redmine.issueComments}
            onOpenConversation={handleOpenConversation}
            onTogglePin={handleTogglePin}
            favoriteIds={favorites.favoriteIds}
            favoriteIssues={favorites.favoriteIssues}
            onToggleFavorite={handleToggleFavorite}
          />
        </ErrorBoundary>
      </div>
      <div className="ticket-panel--right">
        <ErrorBoundary>
          <SearchPanel
            instanceId={instanceId}
            pinnedIds={pinned.pinnedIds}
            pinnedIssues={pinned.pinnedIssues}
            assignedIds={assignedIdSet}
            assignedIssues={redmine.issues}
            onTogglePin={handleTogglePin}
            onToggleAssignedPin={handleToggleAssignedPin}
            statuses={redmine.statuses}
            trackers={redmine.trackers}
            redmineUrl={redmine.redmineUrl}
            membersByProject={redmine.membersByProject}
            versionsByProject={redmine.versionsByProject}
            onFetchMembers={redmine.fetchProjectMembers}
            onFetchVersions={redmine.fetchProjectVersions}
            favoriteIssues={favorites.favoriteIssues}
            favoriteIds={favorites.favoriteIds}
            onToggleFavorite={handleToggleFavorite}
            onOpenBookDialog={timerHandlers.handleOpenBookDialog}
            onShowMessage={showSnackbar}
          />
        </ErrorBoundary>
      </div>
      {conversationState != null &&
        (() => {
          const { issueId: convId, tab: convTab } = conversationState;
          const issue = allKnownIssues.find((i) => i.id === convId);
          const subject = issue?.subject ?? redmine.issueSubjects[convId] ?? "";
          const desc = redmine.issueDescriptions[convId];
          const cmts = redmine.issueComments[convId] ?? [];
          const atts = redmine.issueAttachments[convId] ?? [];
          return (
            <ConversationDialog
              instanceId={instanceId}
              issueId={convId}
              issueSubject={subject}
              issue={issue}
              description={desc}
              comments={cmts}
              attachments={atts}
              redmineUrl={redmine.redmineUrl}
              fieldNameMap={fieldNameMap}
              initialTab={convTab}
              currentUserId={redmine.user?.id}
              onUpdateDescription={redmine.updateDescription}
              onPostComment={redmine.postComment}
              onUpdateComment={redmine.updateComment}
              onRefresh={handleRefreshConversation}
              onClose={handleCloseConversation}
            />
          );
        })()}
    </>
  );
}
