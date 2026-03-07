import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import type { RedmineIssue } from "../types/redmine";
import { api } from "../lib/api";
import { ApiError } from "../lib/errors";
import { safeGet, safeSet } from "../lib/storage";

function storageKey(base: string, instanceId?: string): string {
  return instanceId ? `${base}-${instanceId}` : base;
}

function loadIds(instanceId?: string): Set<number> {
  const arr = safeGet<unknown[]>(storageKey("favorite-issue-ids", instanceId), []);
  return new Set(arr.filter((v): v is number => typeof v === "number"));
}

function saveIds(ids: Set<number>, instanceId?: string) {
  safeSet(storageKey("favorite-issue-ids", instanceId), [...ids]);
}

function loadCachedIssues(instanceId?: string): Record<number, RedmineIssue> {
  return safeGet<Record<number, RedmineIssue>>(storageKey("favorite-issue-cache", instanceId), {});
}

function saveCachedIssues(cache: Record<number, RedmineIssue>, instanceId?: string) {
  safeSet(storageKey("favorite-issue-cache", instanceId), cache);
}

interface UseFavoritesReturn {
  favoriteIds: Set<number>;
  favoriteIssues: RedmineIssue[];
  toggle: (issue: RedmineIssue) => void;
  isFavorite: (id: number) => boolean;
  updateIssue: (issue: RedmineIssue) => void;
}

export function useFavorites(instanceId?: string): UseFavoritesReturn {
  const apiPrefix = instanceId ? `/api/i/${instanceId}` : "/api";

  const [favMap, setFavMap] = useState<Map<number, RedmineIssue | null>>(() => {
    const ids = loadIds(instanceId);
    if (ids.size === 0) return new Map();
    const cache = loadCachedIssues(instanceId);
    const map = new Map<number, RedmineIssue | null>();
    for (const id of ids) {
      map.set(id, cache[id] ?? null);
    }
    return map;
  });

  const loadedRef = useRef(false);

  const favoriteIds = useMemo(() => new Set(favMap.keys()), [favMap]);
  const favoriteIssues = useMemo(
    () => [...favMap.values()].filter((v): v is RedmineIssue => v !== null),
    [favMap],
  );

  useEffect(() => {
    const ids = new Set(favMap.keys());
    saveIds(ids, instanceId);
    const cache: Record<number, RedmineIssue> = {};
    for (const [id, issue] of favMap) {
      if (issue !== null) cache[id] = issue;
    }
    saveCachedIssues(cache, instanceId);
  }, [favMap, instanceId]);

  // Background refresh on mount
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

      setFavMap((prev) => {
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
    };

    refresh();
    return () => {
      cancelled = true;
    };
  }, [apiPrefix, instanceId]);

  const toggle = useCallback((issue: RedmineIssue) => {
    setFavMap((prev) => {
      const next = new Map(prev);
      if (prev.has(issue.id)) {
        next.delete(issue.id);
      } else {
        next.set(issue.id, issue);
      }
      return next;
    });
  }, []);

  const isFavorite = useCallback((id: number) => favoriteIds.has(id), [favoriteIds]);

  const updateIssue = useCallback((issue: RedmineIssue) => {
    setFavMap((prev) => {
      if (!prev.has(issue.id)) return prev;
      return new Map(prev).set(issue.id, issue);
    });
  }, []);

  return {
    favoriteIds,
    favoriteIssues,
    toggle,
    isFavorite,
    updateIssue,
  };
}
