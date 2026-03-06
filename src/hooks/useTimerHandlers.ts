import { useCallback } from "react";
import type { RedmineIssue } from "../types/redmine";
import type { SaveResult } from "./useMultiTimer";
import type { BookingDialogData } from "../components/dialogs/BookingDialog";

interface Deps {
  activeId: number | null;
  startOrResume: (issueId: number, subject: string, projectName: string, projectId: number) => void;
  capture: (issueId: number) => SaveResult | null;
  setBookDialog: (dialog: BookingDialogData | null) => void;
}

export function useTimerHandlers(deps: Deps) {
  const { activeId, startOrResume, capture, setBookDialog } = deps;

  const handlePlay = useCallback(
    (issue: RedmineIssue) => {
      startOrResume(issue.id, issue.subject, issue.project.name, issue.project.id);
    },
    [startOrResume],
  );

  const handleSave = useCallback(
    (issueId: number) => {
      const wasRunning = activeId === issueId;
      const result = capture(issueId);
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
        });
      }
    },
    [capture, activeId, setBookDialog],
  );

  const handleOpenBookDialog = useCallback(
    (issue: RedmineIssue) => {
      setBookDialog({
        issueId: issue.id,
        issueSubject: issue.subject,
        projectId: issue.project.id,
        projectName: issue.project.name,
        doneRatio: issue.done_ratio,
      });
    },
    [setBookDialog],
  );

  return { handlePlay, handleSave, handleOpenBookDialog };
}
