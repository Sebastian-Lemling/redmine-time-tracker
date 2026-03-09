import { useState, useCallback, useRef, useMemo } from "react";
import type { RedmineJournal, RedmineAttachment } from "../types/redmine";
import { api } from "../lib/api";
import { logger } from "../lib/logger";

export function useIssueDetails(instanceId?: string) {
  const prefix = instanceId ? `/api/i/${instanceId}` : "/api";

  const [issueSubjects, setIssueSubjects] = useState<Record<number, string>>({});
  const fetchingIssueSubjects = useRef<Set<number>>(new Set());

  const [issueDescriptions, setIssueDescriptions] = useState<Record<number, string>>({});
  const fetchingIssueDescriptions = useRef<Set<number>>(new Set());

  const [issueComments, setIssueComments] = useState<Record<number, RedmineJournal[]>>({});
  const [issueAttachments, setIssueAttachments] = useState<Record<number, RedmineAttachment[]>>({});

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
          issue: {
            id: number;
            description: string;
            journals?: RedmineJournal[];
            attachments?: RedmineAttachment[];
          };
        }>(`${prefix}/issues/${issueId}?include=journals,attachments`);
        setIssueDescriptions((prev) => ({
          ...prev,
          [issueId]: data.issue.description ?? "",
        }));
        const journals = (data.issue.journals ?? []).filter(
          (j) => j.notes?.trim() || (j.details && j.details.length > 0),
        );
        setIssueComments((prev) => ({
          ...prev,
          [issueId]: journals,
        }));
        setIssueAttachments((prev) => ({
          ...prev,
          [issueId]: data.issue.attachments ?? [],
        }));
      } catch (e) {
        logger.error(`Failed to fetch description for issue ${issueId}`, { error: e });
      } finally {
        fetchingIssueDescriptions.current.delete(issueId);
      }
    },
    [prefix],
  );

  const prefetchIssueDetails = useCallback(
    (issueIds: number[]) => {
      const uncached = issueIds.filter(
        (id) => !(id in issueComments) && !fetchingIssueDescriptions.current.has(id),
      );
      if (uncached.length === 0) return;
      let i = 0;
      const next = () => {
        if (i >= uncached.length) return;
        fetchIssueDescription(uncached[i++]);
        setTimeout(next, 300);
      };
      next();
    },
    [issueComments, fetchIssueDescription],
  );

  const updateDescription = useCallback(
    async (issueId: number, description: string) => {
      await api(`${prefix}/issues/${issueId}`, {
        method: "PUT",
        body: JSON.stringify({ description }),
      });
      fetchingIssueDescriptions.current.delete(issueId);
      await fetchIssueDescription(issueId);
    },
    [prefix, fetchIssueDescription],
  );

  const postComment = useCallback(
    async (issueId: number, notes: string) => {
      await api(`${prefix}/issues/${issueId}`, {
        method: "PUT",
        body: JSON.stringify({ notes }),
      });
      fetchingIssueDescriptions.current.delete(issueId);
      await fetchIssueDescription(issueId);
    },
    [prefix, fetchIssueDescription],
  );

  const updateComment = useCallback(
    async (issueId: number, journalId: number, notes: string) => {
      await api(`${prefix}/journals/${journalId}`, {
        method: "PUT",
        body: JSON.stringify({ notes }),
      });
      fetchingIssueDescriptions.current.delete(issueId);
      await fetchIssueDescription(issueId);
    },
    [prefix, fetchIssueDescription],
  );

  return useMemo(
    () => ({
      issueSubjects,
      issueDescriptions,
      issueComments,
      issueAttachments,
      fetchIssueSubject,
      fetchIssueDescription,
      prefetchIssueDetails,
      updateDescription,
      postComment,
      updateComment,
    }),
    [
      issueSubjects,
      issueDescriptions,
      issueComments,
      issueAttachments,
      fetchIssueSubject,
      fetchIssueDescription,
      prefetchIssueDetails,
      updateDescription,
      postComment,
      updateComment,
    ],
  );
}
