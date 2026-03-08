import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import type { RedmineIssue } from "../types/redmine";
import { api } from "../lib/api";
import { ApiError } from "../lib/errors";
import { safeGet, safeSet } from "../lib/storage";

const MAX_RECENT = 10;

function storageKey(base: string, instanceId?: string): string {
  return instanceId ? `${base}-${instanceId}` : base;
}

function loadIds(instanceId?: string): Set<number> {
  const arr = safeGet<unknown[]>(storageKey("pinned-issue-ids", instanceId), []);
  return new Set(arr.filter((v): v is number => typeof v === "number"));
}

function saveIds(ids: Set<number>, instanceId?: string) {
  safeSet(storageKey("pinned-issue-ids", instanceId), [...ids]);
}

function loadHiddenIds(instanceId?: string): Set<number> {
  const arr = safeGet<unknown[]>(storageKey("hidden-assigned-ids", instanceId), []);
  return new Set(arr.filter((v): v is number => typeof v === "number"));
}

function saveHiddenIds(ids: Set<number>, instanceId?: string) {
  safeSet(storageKey("hidden-assigned-ids", instanceId), [...ids]);
}

function loadAutoPinIds(instanceId?: string): Set<number> {
  const arr = safeGet<unknown[]>(storageKey("auto-pinned-ids", instanceId), []);
  return new Set(arr.filter((v): v is number => typeof v === "number"));
}

function saveAutoPinIds(ids: Set<number>, instanceId?: string) {
  safeSet(storageKey("auto-pinned-ids", instanceId), [...ids]);
}

function loadCachedIssues(instanceId?: string): Record<number, RedmineIssue> {
  return safeGet<Record<number, RedmineIssue>>(storageKey("pinned-issue-cache", instanceId), {});
}

function saveCachedIssues(cache: Record<number, RedmineIssue>, instanceId?: string) {
  safeSet(storageKey("pinned-issue-cache", instanceId), cache);
}

interface RecentPinEntry {
  id: number;
  timestamp: number;
  issue: RedmineIssue;
}

function loadRecentPins(instanceId?: string): RecentPinEntry[] {
  return safeGet<RecentPinEntry[]>(storageKey("recent-pinned-issues", instanceId), []);
}

function saveRecentPins(entries: RecentPinEntry[], instanceId?: string) {
  safeSet(storageKey("recent-pinned-issues", instanceId), entries);
}

interface UsePinnedIssuesReturn {
  pinnedIds: Set<number>;
  pinnedIssues: RedmineIssue[];
  recentlyPinned: RedmineIssue[];
  hiddenAssignedIds: Set<number>;
  pin: (issue: RedmineIssue) => void;
  pinSilent: (issue: RedmineIssue) => void;
  unpin: (issueId: number) => void;
  toggle: (issue: RedmineIssue) => void;
  hide: (issueId: number) => void;
  isPinned: (id: number) => boolean;
  updateIssue: (issue: RedmineIssue) => void;
  refreshPinned: () => Promise<void>;
  syncAssignedPins: (assignedIssues: RedmineIssue[]) => void;
}

export function usePinnedIssues(instanceId?: string): UsePinnedIssuesReturn {
  const apiPrefix = instanceId ? `/api/i/${instanceId}` : "/api";

  const [pinMap, setPinMap] = useState<Map<number, RedmineIssue | null>>(() => {
    const ids = loadIds(instanceId);
    if (ids.size === 0) return new Map();
    const cache = loadCachedIssues(instanceId);
    const map = new Map<number, RedmineIssue | null>();
    for (const id of ids) {
      map.set(id, cache[id] ?? null);
    }
    return map;
  });

  const [recentPins, setRecentPins] = useState<RecentPinEntry[]>(() => loadRecentPins(instanceId));
  const [hiddenAssignedIds, setHiddenAssignedIds] = useState<Set<number>>(() =>
    loadHiddenIds(instanceId),
  );
  const [autoPinIds, setAutoPinIds] = useState<Set<number>>(() => loadAutoPinIds(instanceId));
  const loadedRef = useRef(false);

  // Derived state — always in sync with pinMap within the same render
  const pinnedIds = useMemo(() => new Set(pinMap.keys()), [pinMap]);
  const pinnedIssues = useMemo(
    () => [...pinMap.values()].filter((v): v is RedmineIssue => v !== null),
    [pinMap],
  );

  useEffect(() => {
    const ids = new Set(pinMap.keys());
    saveIds(ids, instanceId);
    const cache: Record<number, RedmineIssue> = {};
    for (const [id, issue] of pinMap) {
      if (issue !== null) cache[id] = issue;
    }
    saveCachedIssues(cache, instanceId);
  }, [pinMap, instanceId]);

  // Background-refresh pinned issues on mount (cache already provides instant display)
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    const ids = loadIds(instanceId);
    if (ids.size === 0) return;

    let cancelled = false;
    const refresh = async () => {
      const results = new Map<number, { issue: RedmineIssue } | "deleted" | "error">();

      await Promise.all(
        [...ids].map(async (id) => {
          try {
            const data = await api<{ issue: RedmineIssue }>(`${apiPrefix}/issues/${id}`);
            results.set(id, { issue: data.issue });
          } catch (e: unknown) {
            if (e instanceof ApiError && e.status === 404) {
              results.set(id, "deleted");
            } else {
              results.set(id, "error");
            }
          }
        }),
      );

      if (cancelled) return;

      const anySuccess = [...results.values()].some((r) => r !== "error");
      if (!anySuccess) return;

      setPinMap((prev) => {
        const next = new Map(prev);
        for (const [id, result] of results) {
          if (!next.has(id)) continue; // user unpinned during fetch
          if (result === "deleted") {
            next.delete(id);
          } else if (result !== "error") {
            next.set(id, result.issue);
          }
          // "error" → leave entry untouched
        }
        return next;
      });
    };

    refresh();
    return () => {
      cancelled = true;
    };
  }, [apiPrefix, instanceId]);

  useEffect(() => {
    saveRecentPins(recentPins, instanceId);
  }, [recentPins, instanceId]);

  useEffect(() => {
    saveHiddenIds(hiddenAssignedIds, instanceId);
  }, [hiddenAssignedIds, instanceId]);

  useEffect(() => {
    saveAutoPinIds(autoPinIds, instanceId);
  }, [autoPinIds, instanceId]);

  const hide = useCallback((issueId: number) => {
    setHiddenAssignedIds((prev) => {
      const next = new Set(prev);
      next.add(issueId);
      return next;
    });
  }, []);

  const unhide = useCallback((issueId: number) => {
    setHiddenAssignedIds((prev) => {
      if (!prev.has(issueId)) return prev;
      const next = new Set(prev);
      next.delete(issueId);
      return next;
    });
  }, []);

  const syncAssignedPins = useCallback(
    (assignedIssues: RedmineIssue[]) => {
      if (assignedIssues.length === 0) return;

      const assignedIdSet = new Set(assignedIssues.map((i) => i.id));

      const autoPinMigrated = safeGet<boolean>(
        storageKey("auto-pin-migration-done", instanceId),
        false,
      );
      let effectiveAutoPinIds = autoPinIds;
      if (!autoPinMigrated) {
        safeSet(storageKey("auto-pin-migration-done", instanceId), true);
        const currentPinIds = loadIds(instanceId);
        const migrated = new Set(autoPinIds);
        for (const id of currentPinIds) {
          if (assignedIdSet.has(id)) migrated.add(id);
        }
        effectiveAutoPinIds = migrated;
        setAutoPinIds(migrated);
      }

      const migrated = safeGet<boolean>(storageKey("pin-migration-done", instanceId), false);
      if (!migrated) {
        safeSet(storageKey("pin-migration-done", instanceId), true);
        const newlyPinned = new Set<number>();
        setPinMap((prev) => {
          const next = new Map(prev);
          for (const issue of assignedIssues) {
            if (!next.has(issue.id) && !hiddenAssignedIds.has(issue.id)) {
              next.set(issue.id, issue);
              newlyPinned.add(issue.id);
            }
          }
          return next;
        });
        setAutoPinIds((prev) => {
          const next = new Set(prev);
          for (const id of newlyPinned) next.add(id);
          return next;
        });
        return;
      }

      const newlyPinned = new Set<number>();
      setPinMap((prev) => {
        let changed = false;
        const next = new Map(prev);
        for (const id of prev.keys()) {
          if (!assignedIdSet.has(id) && effectiveAutoPinIds.has(id)) {
            next.delete(id);
            changed = true;
          }
        }
        for (const issue of assignedIssues) {
          if (!next.has(issue.id) && !hiddenAssignedIds.has(issue.id)) {
            next.set(issue.id, issue);
            newlyPinned.add(issue.id);
            changed = true;
          }
        }
        return changed ? next : prev;
      });

      setAutoPinIds((prev) => {
        const next = new Set(prev);
        for (const id of newlyPinned) next.add(id);
        for (const id of prev) {
          if (!assignedIdSet.has(id)) next.delete(id);
        }
        if (next.size === prev.size && [...next].every((id) => prev.has(id))) return prev;
        return next;
      });

      // Cleanup: remove hidden IDs that are no longer assigned
      setHiddenAssignedIds((prev) => {
        let changed = false;
        const next = new Set<number>();
        for (const id of prev) {
          if (assignedIdSet.has(id)) {
            next.add(id);
          } else {
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    },
    [hiddenAssignedIds, autoPinIds, instanceId],
  );

  const addToRecentPins = useCallback((issue: RedmineIssue) => {
    setRecentPins((prev) => {
      const filtered = prev.filter((e) => e.id !== issue.id);
      return [{ id: issue.id, timestamp: Date.now(), issue }, ...filtered].slice(0, MAX_RECENT);
    });
  }, []);

  const removeAutoPin = useCallback((issueId: number) => {
    setAutoPinIds((prev) => {
      if (!prev.has(issueId)) return prev;
      const next = new Set(prev);
      next.delete(issueId);
      return next;
    });
  }, []);

  const pin = useCallback(
    (issue: RedmineIssue) => {
      setPinMap((prev) => new Map(prev).set(issue.id, issue));
      unhide(issue.id);
      removeAutoPin(issue.id);
      addToRecentPins(issue);
    },
    [addToRecentPins, unhide, removeAutoPin],
  );

  const pinSilent = useCallback(
    (issue: RedmineIssue) => {
      setPinMap((prev) => new Map(prev).set(issue.id, issue));
      unhide(issue.id);
      removeAutoPin(issue.id);
    },
    [unhide, removeAutoPin],
  );

  const unpin = useCallback(
    (issueId: number) => {
      setPinMap((prev) => {
        const next = new Map(prev);
        next.delete(issueId);
        return next;
      });
      removeAutoPin(issueId);
    },
    [removeAutoPin],
  );

  const toggle = useCallback(
    (issue: RedmineIssue) => {
      const wasPinned = pinnedIds.has(issue.id);
      setPinMap((prev) => {
        const next = new Map(prev);
        if (prev.has(issue.id)) {
          next.delete(issue.id);
        } else {
          next.set(issue.id, issue);
        }
        return next;
      });
      removeAutoPin(issue.id);
      if (wasPinned) return;
      unhide(issue.id);
      addToRecentPins(issue);
    },
    [pinnedIds, addToRecentPins, unhide, removeAutoPin],
  );

  const isPinned = useCallback((id: number) => pinnedIds.has(id), [pinnedIds]);

  /** Replace a single pinned issue in state (e.g. after mutation or conflict) */
  const updateIssue = useCallback((issue: RedmineIssue) => {
    setPinMap((prev) => {
      if (!prev.has(issue.id)) return prev;
      return new Map(prev).set(issue.id, issue);
    });
  }, []);

  const refreshPinned = useCallback(async () => {
    const ids = [...pinnedIds];
    if (ids.length === 0) return;

    const results = new Map<number, { issue: RedmineIssue } | "deleted" | "error">();

    await Promise.all(
      ids.map(async (id) => {
        try {
          const data = await api<{ issue: RedmineIssue }>(`${apiPrefix}/issues/${id}`);
          results.set(id, { issue: data.issue });
        } catch (e: unknown) {
          if (e instanceof ApiError && e.status === 404) {
            results.set(id, "deleted");
          } else {
            results.set(id, "error");
          }
        }
      }),
    );

    const anySuccess = [...results.values()].some((r) => r !== "error");
    if (!anySuccess) return;

    setPinMap((prev) => {
      const next = new Map(prev);
      for (const [id, result] of results) {
        if (!next.has(id)) continue;
        if (result === "deleted") {
          next.delete(id);
        } else if (result !== "error") {
          next.set(id, result.issue);
        }
      }
      return next;
    });
  }, [pinnedIds, apiPrefix]);

  const recentlyPinned = useMemo(() => recentPins.map((e) => e.issue), [recentPins]);

  return {
    pinnedIds,
    pinnedIssues,
    recentlyPinned,
    hiddenAssignedIds,
    pin,
    pinSilent,
    unpin,
    toggle,
    hide,
    isPinned,
    updateIssue,
    refreshPinned,
    syncAssignedPins,
  };
}
