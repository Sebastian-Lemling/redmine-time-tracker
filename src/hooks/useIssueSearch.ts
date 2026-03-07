import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import type {
  RedmineIssue,
  RedmineProject,
  RedminePriority,
  IssueSearchParams,
  IssueSearchResult,
} from "../types/redmine";
import { api } from "../lib/api";
import { safeGet, safeSet, safeRemove } from "../lib/storage";

interface UseIssueSearchReturn {
  params: IssueSearchParams;
  setParam: <K extends keyof IssueSearchParams>(key: K, value: IssueSearchParams[K]) => void;
  resetFilters: () => void;
  results: RedmineIssue[];
  totalCount: number;
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  loadMore: () => void;
  projects: RedmineProject[];
  priorities: RedminePriority[];
  hasActiveFilters: boolean;
  error: string | null;
  retry: () => void;
  recentSearches: string[];
  applyRecentSearch: (query: string) => void;
  removeRecentSearch: (query: string) => void;
  clearRecent: () => void;
}

const LIMIT = 25;
const DEBOUNCE_MS = 300;
const FILTER_DEBOUNCE_MS = 150;

const SEARCH_URL_KEYS = [
  "q",
  "project_id",
  "status_id",
  "tracker_id",
  "assigned_to_id",
  "fixed_version_id",
  "priority_id",
  "sort",
] as const;

const SORT_OPTIONS = [
  { value: "updated_on:desc", key: "sortUpdatedDesc" },
  { value: "updated_on:asc", key: "sortUpdatedAsc" },
  { value: "priority:desc", key: "sortPriorityDesc" },
  { value: "created_on:desc", key: "sortCreatedDesc" },
  { value: "id:desc", key: "sortIdDesc" },
] as const;

export type SortOption = (typeof SORT_OPTIONS)[number]["value"];
export { SORT_OPTIONS };

function writeParamsToUrl(params: IssueSearchParams) {
  const url = new URL(window.location.href);
  for (const key of SEARCH_URL_KEYS) url.searchParams.delete(key);
  if (params.q) url.searchParams.set("q", params.q);
  if (params.project_id) url.searchParams.set("project_id", String(params.project_id));
  if (params.status_id) url.searchParams.set("status_id", params.status_id);
  if (params.tracker_id) url.searchParams.set("tracker_id", String(params.tracker_id));
  if (params.assigned_to_id) url.searchParams.set("assigned_to_id", params.assigned_to_id);
  if (params.fixed_version_id)
    url.searchParams.set("fixed_version_id", String(params.fixed_version_id));
  if (params.priority_id) url.searchParams.set("priority_id", String(params.priority_id));
  if (params.sort) url.searchParams.set("sort", params.sort);
  history.replaceState(null, "", url.toString());
}

const RECENT_SEARCHES_KEY = "redmine-recent-searches";
const MAX_RECENT_SEARCHES = 4;

function getRecentSearches(): string[] {
  return safeGet<string[]>(RECENT_SEARCHES_KEY, []);
}

function addRecentSearch(query: string) {
  if (!query || query.trim().length < 2) return;
  const trimmed = query.trim();
  const list = getRecentSearches().filter((s) => s !== trimmed);
  list.unshift(trimmed);
  if (list.length > MAX_RECENT_SEARCHES) list.length = MAX_RECENT_SEARCHES;
  safeSet(RECENT_SEARCHES_KEY, list);
}

function removeRecentSearchItem(query: string) {
  const list = getRecentSearches().filter((s) => s !== query);
  safeSet(RECENT_SEARCHES_KEY, list);
}

function clearRecentSearches() {
  safeRemove(RECENT_SEARCHES_KEY);
}

export function useIssueSearch(instanceId?: string): UseIssueSearchReturn {
  const apiPrefix = instanceId ? `/api/i/${instanceId}` : "/api";
  const [params, setParams] = useState<IssueSearchParams>({});
  const [results, setResults] = useState<RedmineIssue[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [projects, setProjects] = useState<RedmineProject[]>([]);
  const [priorities, setPriorities] = useState<RedminePriority[]>([]);

  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const isAppending = useRef(false);
  const lastSearchParams = useRef<IssueSearchParams>({});
  const lastSearchAppend = useRef(false);

  useEffect(() => {
    api<{ projects: RedmineProject[] }>(`${apiPrefix}/projects`)
      .then((data) => setProjects(data.projects))
      .catch(() => {
        setError("Failed to load projects");
      });
    api<{ issue_priorities: RedminePriority[] }>(`${apiPrefix}/priorities`)
      .then((data) => setPriorities(data.issue_priorities))
      .catch(() => {
        setError("Failed to load priorities");
      });
  }, [apiPrefix]);

  const doSearch = useCallback(
    async (searchParams: IssueSearchParams, append: boolean) => {
      lastSearchParams.current = searchParams;
      lastSearchAppend.current = append;

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const hasAnyCriteria =
        searchParams.q ||
        searchParams.project_id ||
        searchParams.status_id ||
        searchParams.tracker_id ||
        searchParams.assigned_to_id ||
        searchParams.fixed_version_id ||
        searchParams.priority_id;
      if (!hasAnyCriteria) {
        setResults([]);
        setTotalCount(0);
        setLoading(false);
        setLoadingMore(false);
        setError(null);
        return;
      }

      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const qs = new URLSearchParams();
        if (searchParams.q) qs.set("q", searchParams.q);
        if (searchParams.project_id) qs.set("project_id", String(searchParams.project_id));
        if (searchParams.status_id) qs.set("status_id", searchParams.status_id);
        if (searchParams.tracker_id) qs.set("tracker_id", String(searchParams.tracker_id));
        if (searchParams.assigned_to_id) qs.set("assigned_to_id", searchParams.assigned_to_id);
        if (searchParams.fixed_version_id)
          qs.set("fixed_version_id", String(searchParams.fixed_version_id));
        if (searchParams.priority_id) qs.set("priority_id", String(searchParams.priority_id));
        if (searchParams.sort) qs.set("sort", searchParams.sort);
        qs.set("limit", String(LIMIT));
        qs.set("offset", String(searchParams.offset || 0));

        const data = await api<IssueSearchResult>(`${apiPrefix}/issues/search?${qs.toString()}`, {
          signal: controller.signal,
        });

        if (controller.signal.aborted) return;

        if (append) {
          setResults((prev) => [...prev, ...data.issues]);
        } else {
          setResults(data.issues);
        }
        setTotalCount(data.total_count);
        setError(null);
        if (searchParams.q && !append) addRecentSearch(searchParams.q);
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        if (controller.signal.aborted) return;

        const message = e instanceof Error ? e.message : "Connection error";
        setError(message);

        if (!append) {
          setResults([]);
          setTotalCount(0);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [apiPrefix],
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const append = isAppending.current;
    isAppending.current = false;

    // Determine debounce delay:
    // - 0ms for pagination (append)
    // - 300ms for text query changes
    // - 150ms for filter-only changes
    let delay: number;
    if (append) {
      delay = 0;
    } else if (params.q) {
      delay = DEBOUNCE_MS;
    } else {
      delay = FILTER_DEBOUNCE_MS;
    }

    debounceRef.current = setTimeout(() => {
      doSearch(params, append);
    }, delay);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      // doSearch handles its own abort on the next call; abort current in-flight on unmount
      abortRef.current?.abort();
    };
  }, [params, doSearch]);

  // Sync params to URL (debounced to avoid rapid history updates)
  const urlSyncRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    if (urlSyncRef.current) clearTimeout(urlSyncRef.current);
    urlSyncRef.current = setTimeout(() => writeParamsToUrl(params), 500);
    return () => {
      if (urlSyncRef.current) clearTimeout(urlSyncRef.current);
    };
  }, [params]);

  const setParam = useCallback(
    <K extends keyof IssueSearchParams>(key: K, value: IssueSearchParams[K]) => {
      isAppending.current = false;
      setParams((prev) => ({ ...prev, [key]: value, offset: 0 }));
    },
    [],
  );

  const resetFilters = useCallback(() => {
    isAppending.current = false;
    setParams((prev) => ({ q: prev.q, offset: 0 }));
  }, []);

  const loadMore = useCallback(() => {
    isAppending.current = true;
    setParams((prev) => ({ ...prev, offset: (prev.offset || 0) + LIMIT }));
  }, []);

  const retry = useCallback(() => {
    doSearch(lastSearchParams.current, lastSearchAppend.current);
  }, [doSearch]);

  const hasMore = useMemo(() => results.length < totalCount, [results.length, totalCount]);

  const hasActiveFilters = useMemo(
    () =>
      !!(
        params.project_id ||
        params.status_id ||
        params.tracker_id ||
        params.assigned_to_id ||
        params.fixed_version_id ||
        params.priority_id
      ),
    [
      params.project_id,
      params.status_id,
      params.tracker_id,
      params.assigned_to_id,
      params.fixed_version_id,
      params.priority_id,
    ],
  );

  const [recentSearches, setRecentSearchesState] = useState<string[]>(getRecentSearches);

  useEffect(() => {
    setRecentSearchesState(getRecentSearches());
  }, [results]);

  const applyRecentSearch = useCallback((query: string) => {
    isAppending.current = false;
    setParams((prev) => ({ ...prev, q: query, offset: 0 }));
  }, []);

  const removeRecent = useCallback((query: string) => {
    removeRecentSearchItem(query);
    setRecentSearchesState((prev) => prev.filter((s) => s !== query));
  }, []);

  const clearRecent = useCallback(() => {
    clearRecentSearches();
    setRecentSearchesState([]);
  }, []);

  return {
    params,
    setParam,
    resetFilters,
    results,
    totalCount,
    loading,
    loadingMore,
    hasMore,
    loadMore,
    projects,
    priorities,
    hasActiveFilters,
    error,
    retry,
    recentSearches,
    applyRecentSearch,
    removeRecentSearch: removeRecent,
    clearRecent,
  };
}
