import { useState, useCallback, useRef, useMemo } from "react";
import type { RedmineTimeEntry } from "../types/redmine";
import { api } from "../lib/api";
import { logger } from "../lib/logger";

export function useRemoteEntries(instanceId?: string) {
  const prefix = instanceId ? `/api/i/${instanceId}` : "/api";

  const [remoteEntries, setRemoteEntries] = useState<RedmineTimeEntry[]>([]);
  const [remoteLoading, setRemoteLoading] = useState(false);
  const remoteAbort = useRef<AbortController | null>(null);
  const lastRemoteKey = useRef("");
  const currentRangeRef = useRef<{ from: string; to: string } | null>(null);

  const fetchRemoteEntries = useCallback(
    async (from: string, to: string, force = false) => {
      const key = `${from}:${to}`;
      currentRangeRef.current = { from, to };

      if (!force && key === lastRemoteKey.current) return;

      remoteAbort.current?.abort();
      const controller = new AbortController();
      remoteAbort.current = controller;

      lastRemoteKey.current = key;
      setRemoteLoading(true);
      try {
        const data = await api<{ time_entries: RedmineTimeEntry[] }>(
          `${prefix}/time_entries/range?from=${from}&to=${to}`,
          { signal: controller.signal },
        );
        if (!controller.signal.aborted) {
          setRemoteEntries(data.time_entries || []);
        }
      } catch (e) {
        if (controller.signal.aborted) return;
        logger.error("Failed to fetch remote time entries", { error: e });
        lastRemoteKey.current = "";
      } finally {
        if (!controller.signal.aborted) {
          setRemoteLoading(false);
        }
      }
    },
    [prefix],
  );

  const refreshRemoteEntries = useCallback(async () => {
    if (currentRangeRef.current) {
      const { from, to } = currentRangeRef.current;
      await fetchRemoteEntries(from, to, true);
    }
  }, [fetchRemoteEntries]);

  return useMemo(
    () => ({ remoteEntries, remoteLoading, fetchRemoteEntries, refreshRemoteEntries }),
    [remoteEntries, remoteLoading, fetchRemoteEntries, refreshRemoteEntries],
  );
}
