import { useState, useEffect, useMemo } from "react";
import type { RedmineUser } from "../types/redmine";
import { api } from "../lib/api";

export function useUser() {
  const [user, setUser] = useState<RedmineUser | null>(null);
  const [redmineUrl, setRedmineUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const data = await api<{ user: RedmineUser; redmineUrl: string }>("/api/me", {
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        setUser(data.user);
        if (data.redmineUrl) setRedmineUrl(data.redmineUrl);
      } catch (e) {
        if (controller.signal.aborted) return;
        setError(e instanceof Error ? e.message : "Cannot connect to Redmine");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, []);

  return useMemo(() => ({ user, redmineUrl, loading, error }), [user, redmineUrl, loading, error]);
}
