import { useEffect, useRef } from "react";

interface Deps {
  fetchIssues: () => void;
  refreshPinned: () => void;
  refreshRemoteEntries: () => void;
  refreshWeekRemoteEntries?: () => void;
}

export function useVisibilityRefresh(deps: Deps) {
  const { fetchIssues, refreshPinned, refreshRemoteEntries, refreshWeekRemoteEntries } = deps;
  // eslint-disable-next-line react-hooks/purity
  const lastFetchRef = useRef(Date.now());

  useEffect(() => {
    const handler = () => {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - lastFetchRef.current < 2 * 60 * 1000) return;
      lastFetchRef.current = Date.now();
      fetchIssues();
      refreshPinned();
      refreshRemoteEntries();
      refreshWeekRemoteEntries?.();
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [fetchIssues, refreshPinned, refreshRemoteEntries, refreshWeekRemoteEntries]);

  return { lastFetchRef };
}
