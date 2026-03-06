import { useState, useCallback, useRef, useMemo } from "react";
import type { RedmineMember, RedmineVersion } from "../types/redmine";
import { api } from "../lib/api";
import { logger } from "../lib/logger";

export function useProjectData() {
  const [membersByProject, setMembersByProject] = useState<Record<number, RedmineMember[]>>({});
  const fetchingMembers = useRef<Set<number>>(new Set());

  const [versionsByProject, setVersionsByProject] = useState<Record<number, RedmineVersion[]>>({});
  const fetchingVersions = useRef<Set<number>>(new Set());

  const fetchProjectMembers = useCallback(async (projectId: number) => {
    if (fetchingMembers.current.has(projectId)) return;
    fetchingMembers.current.add(projectId);
    try {
      const data = await api<{ members: RedmineMember[] }>(`/api/projects/${projectId}/members`);
      setMembersByProject((prev) => ({
        ...prev,
        [projectId]: data.members || [],
      }));
    } catch (e) {
      logger.error(`Failed to fetch members for project ${projectId}`, { error: e });
    } finally {
      fetchingMembers.current.delete(projectId);
    }
  }, []);

  const fetchProjectVersions = useCallback(async (projectId: number) => {
    if (fetchingVersions.current.has(projectId)) return;
    fetchingVersions.current.add(projectId);
    try {
      const data = await api<{ versions: RedmineVersion[] }>(`/api/projects/${projectId}/versions`);
      setVersionsByProject((prev) => ({
        ...prev,
        [projectId]: (data.versions || []).filter((v) => v.status === "open"),
      }));
    } catch (e) {
      logger.error(`Failed to fetch versions for project ${projectId}`, { error: e });
    } finally {
      fetchingVersions.current.delete(projectId);
    }
  }, []);

  return useMemo(
    () => ({ membersByProject, versionsByProject, fetchProjectMembers, fetchProjectVersions }),
    [membersByProject, versionsByProject, fetchProjectMembers, fetchProjectVersions],
  );
}
