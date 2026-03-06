import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import type { RedmineIssue } from "../types/redmine";
import { api } from "../lib/api";
import { ApiError } from "../lib/errors";
import { safeGet, safeSet } from "../lib/storage";

const STORAGE_KEY = "favorite-issue-ids";
const CACHE_KEY = "favorite-issue-cache";

function loadIds(): Set<number> {
  const arr = safeGet<unknown[]>(STORAGE_KEY, []);
  return new Set(arr.filter((v): v is number => typeof v === "number"));
}

function saveIds(ids: Set<number>) {
  safeSet(STORAGE_KEY, [...ids]);
}

function loadCachedIssues(): Record<number, RedmineIssue> {
  return safeGet<Record<number, RedmineIssue>>(CACHE_KEY, {});
}

function saveCachedIssues(cache: Record<number, RedmineIssue>) {
  safeSet(CACHE_KEY, cache);
}

interface UseFavoritesReturn {
  favoriteIds: Set<number>;
  favoriteIssues: RedmineIssue[];
  toggle: (issue: RedmineIssue) => void;
  isFavorite: (id: number) => boolean;
  updateIssue: (issue: RedmineIssue) => void;
}

export function useFavorites(): UseFavoritesReturn {
  const [favMap, setFavMap] = useState<Map<number, RedmineIssue | null>>(() => {
    const ids = loadIds();
    if (ids.size === 0) return new Map();
    const cache = loadCachedIssues();
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
    saveIds(ids);
    const cache: Record<number, RedmineIssue> = {};
    for (const [id, issue] of favMap) {
      if (issue !== null) cache[id] = issue;
    }
    saveCachedIssues(cache);
  }, [favMap]);

  // Background refresh on mount
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    const ids = loadIds();
    if (ids.size === 0) return;

    let cancelled = false;
    const refresh = async () => {
      const results = new Map<number, { issue: RedmineIssue } | "deleted" | "error">();

      await Promise.all(
        [...ids].map(async (id) => {
          try {
            const data = await api<{ issue: RedmineIssue }>(`/api/issues/${id}`);
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
  }, []);

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
