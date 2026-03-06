import { useState, useCallback } from "react";
import type { RedmineTimeEntry } from "../types/redmine";
import { api } from "../lib/api";
import { toLocalDateString, getWeekDates, getWeekKey } from "../lib/dates";

export function useWeekRemoteEntries() {
  const [weekRemoteEntries, setWeekRemoteEntries] = useState<RedmineTimeEntry[]>([]);

  const fetchWeekRemoteEntries = useCallback(async () => {
    const todayStr = toLocalDateString(new Date());
    const weekKey = getWeekKey(todayStr);
    const { start, end } = getWeekDates(weekKey);
    try {
      const data = await api<{ time_entries: RedmineTimeEntry[] }>(
        `/api/time_entries/range?from=${start}&to=${end}`,
      );
      setWeekRemoteEntries(data.time_entries || []);
    } catch {
      /* silent */
    }
  }, []);

  return { weekRemoteEntries, fetchWeekRemoteEntries };
}
