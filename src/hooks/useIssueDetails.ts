import { useState, useCallback, useRef, useMemo } from "react";
import type { RedmineJournal } from "../types/redmine";
import { api } from "../lib/api";
import { logger } from "../lib/logger";

export function useIssueDetails(instanceId?: string) {
  const prefix = instanceId ? `/api/i/${instanceId}` : "/api";

  const [issueSubjects, setIssueSubjects] = useState<Record<number, string>>({});
  const fetchingIssueSubjects = useRef<Set<number>>(new Set());

  const [issueDescriptions, setIssueDescriptions] = useState<Record<number, string>>({});
  const fetchingIssueDescriptions = useRef<Set<number>>(new Set());

  const [issueComments, setIssueComments] = useState<Record<number, RedmineJournal[]>>({});

  const fetchIssueSubject = useCallback(
    async (issueId: number) => {
      if (fetchingIssueSubjects.current.has(issueId)) return;
      fetchingIssueSubjects.current.add(issueId);
      try {
        const data = await api<{ issue: { id: number; subject: string } }>(
          `${prefix}/issues/${issueId}`,
        );
        setIssueSubjects((prev) => ({
          ...prev,
          [issueId]: data.issue.subject,
        }));
      } catch (e) {
        logger.error(`Failed to fetch subject for issue ${issueId}`, { error: e });
      } finally {
        fetchingIssueSubjects.current.delete(issueId);
      }
    },
    [prefix],
  );

  const fetchIssueDescription = useCallback(
    async (issueId: number) => {
      if (fetchingIssueDescriptions.current.has(issueId)) return;
      fetchingIssueDescriptions.current.add(issueId);
      try {
        const data = await api<{
          issue: { id: number; description: string; journals?: RedmineJournal[] };
        }>(`${prefix}/issues/${issueId}?include=journals`);
        setIssueDescriptions((prev) => ({
          ...prev,
          [issueId]: data.issue.description ?? "",
        }));
        const journals = (data.issue.journals ?? []).filter((j) => j.notes?.trim());
        setIssueComments((prev) => ({
          ...prev,
          [issueId]: journals,
        }));
      } catch (e) {
        logger.error(`Failed to fetch description for issue ${issueId}`, { error: e });
      } finally {
        fetchingIssueDescriptions.current.delete(issueId);
      }
    },
    [prefix],
  );

  return useMemo(
    () => ({
      issueSubjects,
      issueDescriptions,
      issueComments,
      fetchIssueSubject,
      fetchIssueDescription,
    }),
    [issueSubjects, issueDescriptions, issueComments, fetchIssueSubject, fetchIssueDescription],
  );
}
