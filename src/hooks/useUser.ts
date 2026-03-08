import { useState, useEffect, useMemo } from "react";
import type { RedmineUser } from "../types/redmine";
import { api } from "../lib/api";

export function useUser(instanceId?: string) {
  const [user, setUser] = useState<RedmineUser | null>(null);
  const [redmineUrl, setRedmineUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const path = instanceId ? `/api/i/${instanceId}/me` : "/api/me";
    (async () => {
      try {
        const data = await api<{ user: RedmineUser; redmineUrl: string }>(path, {
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
  }, [instanceId]);

  return useMemo(() => ({ user, redmineUrl, loading, error }), [user, redmineUrl, loading, error]);
}
