import { useCallback } from "react";
import type { RedmineIssue, ActiveTimerKey, TimerKey } from "../types/redmine";
import { timerKey } from "../types/redmine";
import type { SaveResult } from "./useMultiTimer";
import type { BookingDialogData } from "../components/dialogs/BookingDialog";

interface Deps {
  instanceId: string;
  activeId: ActiveTimerKey;
  startOrResume: (
    instanceId: string,
    issueId: number,
    subject: string,
    projectName: string,
    projectId?: number,
  ) => void;
  capture: (key: TimerKey) => SaveResult | null;
  setBookDialog: (dialog: BookingDialogData | null) => void;
}

export function useTimerHandlers(deps: Deps) {
  const { instanceId, activeId, startOrResume, capture, setBookDialog } = deps;

  const handlePlay = useCallback(
    (issue: RedmineIssue) => {
      startOrResume(instanceId, issue.id, issue.subject, issue.project.name, issue.project.id);
    },
    [instanceId, startOrResume],
  );

  const handleSave = useCallback(
    (issueId: number) => {
      const key = timerKey(instanceId, issueId);
      const wasRunning = activeId === key;
      const result = capture(key);
      if (result) {
        setBookDialog({
          issueId: result.issueId,
          issueSubject: result.issueSubject,
          projectId: result.projectId || 0,
          projectName: result.projectName,
          durationMinutes: result.durationMinutes,
          startTime: result.startTime,
          endTime: result.endTime,
          wasRunning,
          instanceId: result.instanceId,
        });
      }
    },
    [instanceId, capture, activeId, setBookDialog],
  );

  const handleOpenBookDialog = useCallback(
    (issue: RedmineIssue) => {
      setBookDialog({
        issueId: issue.id,
        issueSubject: issue.subject,
        projectId: issue.project.id,
        projectName: issue.project.name,
        doneRatio: issue.done_ratio,
        instanceId,
      });
    },
    [instanceId, setBookDialog],
  );

  return { handlePlay, handleSave, handleOpenBookDialog };
}
