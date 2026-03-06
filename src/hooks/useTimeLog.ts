import { useState, useCallback, useEffect, useMemo } from "react";
import type { TimeLogEntry } from "../types/redmine";
import { api } from "../lib/api";
import { getWeekKey, getMonthKey } from "../lib/dates";

export function useTimeLog() {
  const [entries, setEntries] = useState<TimeLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    api<TimeLogEntry[]>("/api/timelog", { signal: controller.signal })
      .then(setEntries)
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  const addEntry = useCallback(
    async (entry: Omit<TimeLogEntry, "id" | "syncedToRedmine" | "redmineTimeEntryId">) => {
      const saved = await api<TimeLogEntry>("/api/timelog", {
        method: "POST",
        body: JSON.stringify(entry),
      });
      setEntries((prev) => [saved, ...prev]);
      return saved;
    },
    [],
  );

  const markSynced = useCallback(async (entryId: string, redmineTimeEntryId: number) => {
    const updated = await api<TimeLogEntry>(`/api/timelog/${entryId}`, {
      method: "PUT",
      body: JSON.stringify({ syncedToRedmine: true, redmineTimeEntryId }),
    });
    setEntries((prev) => prev.map((e) => (e.id === entryId ? updated : e)));
  }, []);

  const updateEntry = useCallback(async (entryId: string, updates: Partial<TimeLogEntry>) => {
    const updated = await api<TimeLogEntry>(`/api/timelog/${entryId}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
    setEntries((prev) => prev.map((e) => (e.id === entryId ? updated : e)));
  }, []);

  const deleteEntry = useCallback(async (entryId: string) => {
    await api(`/api/timelog/${entryId}`, { method: "DELETE" });
    setEntries((prev) => prev.filter((e) => e.id !== entryId));
  }, []);

  const removeEntryFromState = useCallback(
    (entryId: string): TimeLogEntry | undefined => {
      const removed = entries.find((e) => e.id === entryId);
      if (removed) {
        setEntries((prev) => prev.filter((e) => e.id !== entryId));
      }
      return removed;
    },
    [entries],
  );

  const restoreEntryToState = useCallback((entry: TimeLogEntry) => {
    setEntries((prev) => {
      if (prev.some((e) => e.id === entry.id)) return prev;
      return [entry, ...prev];
    });
  }, []);

  const entriesByDate = useMemo(
    () =>
      entries.reduce<Record<string, TimeLogEntry[]>>((acc, entry) => {
        if (!acc[entry.date]) acc[entry.date] = [];
        acc[entry.date].push(entry);
        return acc;
      }, {}),
    [entries],
  );

  const sortedDates = useMemo(
    () => Object.keys(entriesByDate).sort((a, b) => new Date(b).getTime() - new Date(a).getTime()),
    [entriesByDate],
  );

  const entriesByWeek = useMemo(
    () =>
      entries.reduce<Record<string, TimeLogEntry[]>>((acc, entry) => {
        const key = getWeekKey(entry.date);
        if (!acc[key]) acc[key] = [];
        acc[key].push(entry);
        return acc;
      }, {}),
    [entries],
  );

  const sortedWeeks = useMemo(
    () => Object.keys(entriesByWeek).sort((a, b) => b.localeCompare(a)),
    [entriesByWeek],
  );

  const entriesByMonth = useMemo(
    () =>
      entries.reduce<Record<string, TimeLogEntry[]>>((acc, entry) => {
        const key = getMonthKey(entry.date);
        if (!acc[key]) acc[key] = [];
        acc[key].push(entry);
        return acc;
      }, {}),
    [entries],
  );

  const sortedMonths = useMemo(
    () => Object.keys(entriesByMonth).sort((a, b) => b.localeCompare(a)),
    [entriesByMonth],
  );

  return useMemo(
    () => ({
      entries,
      entriesByDate,
      sortedDates,
      entriesByWeek,
      sortedWeeks,
      entriesByMonth,
      sortedMonths,
      loading,
      error,
      addEntry,
      markSynced,
      updateEntry,
      deleteEntry,
      removeEntryFromState,
      restoreEntryToState,
    }),
    [
      entries,
      entriesByDate,
      sortedDates,
      entriesByWeek,
      sortedWeeks,
      entriesByMonth,
      sortedMonths,
      loading,
      error,
      addEntry,
      markSynced,
      updateEntry,
      deleteEntry,
      removeEntryFromState,
      restoreEntryToState,
    ],
  );
}
