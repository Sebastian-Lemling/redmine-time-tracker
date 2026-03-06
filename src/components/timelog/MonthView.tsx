import { useState, useMemo, useEffect, useCallback } from "react";
import type {
  TimeLogEntry as TEntry,
  RedmineActivity,
  RedmineTimeEntry,
  RedmineIssue,
} from "../../types/redmine";
import type { AppRoute } from "../../hooks/useHashRouter";
import { formatDateKey } from "../../lib/dates";
import { MonthCalendar } from "./MonthCalendar";
import { DayDetailPanel } from "./DayDetailPanel";
import { MonthViewFooter } from "./MonthViewFooter";
import { useI18n } from "../../i18n/I18nContext";

interface Props {
  route: AppRoute;
  navigate: (partial: Partial<AppRoute>) => void;
  entries: TEntry[];
  activities: RedmineActivity[];
  activitiesByProject: Record<number, RedmineActivity[]>;
  onFetchProjectActivities: (projectId: number) => void;
  onSyncEntry: (entryId: string, activityId: number) => Promise<void>;
  onOpenSyncDialog: (entry: TEntry) => void;
  onEdit: (entry: TEntry) => void;
  onDelete: (id: string) => void;
  onUpdateDuration: (id: string, newDuration: number) => void;
  onShowMessage: (message: string) => void;
  remoteEntries: RedmineTimeEntry[];
  remoteLoading: boolean;
  fetchRemoteEntries: (from: string, to: string, force?: boolean) => void;
  refreshRemoteEntries: () => void;
  issues: RedmineIssue[];
  issueSubjects: Record<number, string>;
  fetchIssueSubject: (issueId: number) => void;
  redmineUrl: string;
}

export function MonthView({
  route,
  navigate,
  entries,
  activities,
  activitiesByProject,
  onFetchProjectActivities,
  onSyncEntry,
  onOpenSyncDialog: _onOpenSyncDialog, // eslint-disable-line @typescript-eslint/no-unused-vars
  onEdit,
  onDelete,
  onUpdateDuration,
  onShowMessage,
  remoteEntries,
  remoteLoading,
  fetchRemoteEntries,
  refreshRemoteEntries,
  issues,
  issueSubjects,
  fetchIssueSubject,
  redmineUrl,
}: Props) {
  const { t } = useI18n();

  const today = (() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return formatDateKey(now);
  })();

  const now = new Date();
  const year = route.year ?? now.getFullYear();
  const month = route.month ?? now.getMonth();

  const selectedDate = useMemo(() => {
    if (route.day != null) {
      const mm = String(month + 1).padStart(2, "0");
      const dd = String(route.day).padStart(2, "0");
      return `${year}-${mm}-${dd}`;
    }
    const todayDate = new Date();
    if (todayDate.getFullYear() === year && todayDate.getMonth() === month) return today;
    return `${year}-${String(month + 1).padStart(2, "0")}-01`;
  }, [route.day, year, month, today]);

  const activeTab = route.tab ?? "unsynced";
  const [batchSyncing, setBatchSyncing] = useState(false);

  const getMonthRange = useCallback(() => {
    const firstDay = `${year}-${String(month + 1).padStart(2, "0")}-01`;
    const lastDate = new Date(year, month + 1, 0);
    const lastDay = `${lastDate.getFullYear()}-${String(lastDate.getMonth() + 1).padStart(2, "0")}-${String(lastDate.getDate()).padStart(2, "0")}`;
    return { firstDay, lastDay };
  }, [year, month]);

  useEffect(() => {
    const { firstDay, lastDay } = getMonthRange();
    fetchRemoteEntries(firstDay, lastDay);
  }, [getMonthRange, fetchRemoteEntries]);

  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === "visible") refreshRemoteEntries();
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [refreshRemoteEntries]);

  useEffect(() => {
    const id = setInterval(() => refreshRemoteEntries(), 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [refreshRemoteEntries]);

  useEffect(() => {
    const knownIds = new Set(issues.map((i) => i.id));
    for (const re of remoteEntries) {
      if (re.issue && !knownIds.has(re.issue.id) && !issueSubjects[re.issue.id])
        fetchIssueSubject(re.issue.id);
    }
  }, [remoteEntries, issues, issueSubjects, fetchIssueSubject]);

  const remoteEntriesForMonth = useMemo(
    () =>
      remoteEntries.filter((re) => {
        const d = new Date(re.spent_on + "T00:00:00");
        return d.getFullYear() === year && d.getMonth() === month;
      }),
    [remoteEntries, year, month],
  );

  const localMinsByDate = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of entries) {
      if (e.syncedToRedmine) continue;
      const d = new Date(e.date + "T00:00:00");
      if (d.getFullYear() === year && d.getMonth() === month)
        map[e.date] = (map[e.date] || 0) + e.duration;
    }
    return map;
  }, [entries, year, month]);

  const remoteMinsByDate = useMemo(() => {
    const map: Record<string, number> = {};
    for (const re of remoteEntriesForMonth)
      map[re.spent_on] = (map[re.spent_on] || 0) + Math.round(re.hours * 60);
    return map;
  }, [remoteEntriesForMonth]);

  const minutesByDate = useMemo(() => {
    const map: Record<string, number> = {};
    const allKeys = new Set([...Object.keys(localMinsByDate), ...Object.keys(remoteMinsByDate)]);
    for (const k of allKeys) map[k] = (localMinsByDate[k] || 0) + (remoteMinsByDate[k] || 0);
    return map;
  }, [localMinsByDate, remoteMinsByDate]);

  const unsyncedByDate = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of entries) {
      if (!e.syncedToRedmine) {
        const d = new Date(e.date + "T00:00:00");
        if (d.getFullYear() === year && d.getMonth() === month)
          map[e.date] = (map[e.date] || 0) + 1;
      }
    }
    return map;
  }, [entries, year, month]);

  const entryCountByDate = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of entries) {
      if (e.syncedToRedmine) continue;
      const d = new Date(e.date + "T00:00:00");
      if (d.getFullYear() === year && d.getMonth() === month) map[e.date] = (map[e.date] || 0) + 1;
    }
    for (const re of remoteEntriesForMonth) map[re.spent_on] = (map[re.spent_on] || 0) + 1;
    return map;
  }, [entries, remoteEntriesForMonth, year, month]);

  const heatQuartiles = useMemo(() => {
    const counts = Object.values(entryCountByDate)
      .filter((c) => c > 0)
      .sort((a, b) => a - b);
    if (counts.length === 0) return [0, 0, 0, 0];
    const q = (p: number) => {
      const idx = Math.ceil(p * counts.length) - 1;
      return counts[Math.max(0, idx)];
    };
    return [q(0.25), q(0.5), q(0.75), q(1)];
  }, [entryCountByDate]);

  const totalMinutes = useMemo(
    () => Object.values(minutesByDate).reduce((a, b) => a + b, 0),
    [minutesByDate],
  );
  const workDays = useMemo(() => Object.keys(minutesByDate).length, [minutesByDate]);
  const avgPerDay = workDays > 0 ? Math.round(totalMinutes / workDays) : 0;
  const totalUnsyncedCount = useMemo(
    () => Object.values(unsyncedByDate).reduce((a, b) => a + b, 0),
    [unsyncedByDate],
  );
  const firstUnsyncedDay = useMemo(() => {
    const dates = Object.keys(unsyncedByDate).sort();
    return dates.length > 0 ? new Date(dates[0] + "T00:00:00").getDate() : null;
  }, [unsyncedByDate]);

  const selectedDayEntries = useMemo(
    () =>
      [...entries]
        .filter((e) => e.date === selectedDate)
        .sort((a, b) => b.startTime.localeCompare(a.startTime)),
    [entries, selectedDate],
  );
  const unsyncedEntries = useMemo(
    () => selectedDayEntries.filter((e) => !e.syncedToRedmine),
    [selectedDayEntries],
  );
  const remoteDayEntries = useMemo(
    () => remoteEntriesForMonth.filter((re) => re.spent_on === selectedDate),
    [remoteEntriesForMonth, selectedDate],
  );
  const unsyncedMinutes = useMemo(
    () => unsyncedEntries.reduce((sum, e) => sum + e.duration, 0),
    [unsyncedEntries],
  );
  const syncedMinutes = useMemo(
    () => remoteDayEntries.reduce((sum, e) => sum + Math.round(e.hours * 60), 0),
    [remoteDayEntries],
  );
  const selectedDayMinutes = unsyncedMinutes + syncedMinutes;

  useEffect(() => {
    const projectIds = new Set<number>();
    for (const e of selectedDayEntries) {
      if (e.projectId && !activitiesByProject[e.projectId]) projectIds.add(e.projectId);
    }
    for (const pid of projectIds) onFetchProjectActivities(pid);
  }, [selectedDayEntries, activitiesByProject, onFetchProjectActivities]);

  const navigateMonth = (delta: number) => {
    let newMonth = month + delta;
    let newYear = year;
    if (newMonth < 0) {
      newMonth = 11;
      newYear--;
    } else if (newMonth > 11) {
      newMonth = 0;
      newYear++;
    }
    navigate({ year: newYear, month: newMonth, day: undefined, tab: undefined });
  };

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedIds(new Set());
  }, [selectedDate]);

  const handleBatchSync = async () => {
    if (selectedIds.size === 0 || batchSyncing) return;
    setBatchSyncing(true);
    const selected = unsyncedEntries.filter((e) => selectedIds.has(e.id));
    const withoutActivity = selected.filter((e) => !e.activityId);
    if (withoutActivity.length > 0) {
      onShowMessage(t.entriesNeedActivity(withoutActivity.length));
      setBatchSyncing(false);
      return;
    }
    let synced = 0,
      failed = 0;
    for (const entry of selected) {
      try {
        await onSyncEntry(entry.id, entry.activityId!);
        synced++;
        setSelectedIds((prev) => {
          const n = new Set(prev);
          n.delete(entry.id);
          return n;
        });
      } catch {
        failed++;
      }
    }
    setBatchSyncing(false);
    onShowMessage(t.syncedCount(synced, failed));
  };

  return (
    <div style={{ height: "100%" }}>
      <div className="cal-layout">
        <div className="cal-layout__body">
          <MonthCalendar
            year={year}
            month={month}
            today={today}
            selectedDate={selectedDate}
            minutesByDate={minutesByDate}
            localMinsByDate={localMinsByDate}
            remoteMinsByDate={remoteMinsByDate}
            unsyncedByDate={unsyncedByDate}
            entryCountByDate={entryCountByDate}
            heatQuartiles={heatQuartiles}
            onSelectDay={(day, hasUnsynced, hasMins) =>
              navigate({ day, tab: !hasUnsynced && hasMins ? "synced" : "unsynced" })
            }
            onNavigateMonth={navigateMonth}
            onGoToday={() => {
              const n = new Date();
              navigate({
                year: n.getFullYear(),
                month: n.getMonth(),
                day: n.getDate(),
                tab: undefined,
              });
            }}
          />
          <DayDetailPanel
            selectedDate={selectedDate}
            activeTab={activeTab}
            unsyncedEntries={unsyncedEntries}
            remoteDayEntries={remoteDayEntries}
            unsyncedMinutes={unsyncedMinutes}
            syncedMinutes={syncedMinutes}
            selectedDayMinutes={selectedDayMinutes}
            remoteLoading={remoteLoading}
            activities={activities}
            activitiesByProject={activitiesByProject}
            issues={issues}
            issueSubjects={issueSubjects}
            redmineUrl={redmineUrl}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            onNavigateTab={(day, tab) => navigate({ day, tab })}
            onEdit={onEdit}
            onDelete={onDelete}
            onUpdateDuration={onUpdateDuration}
          />
        </div>
        <MonthViewFooter
          totalMinutes={totalMinutes}
          avgPerDay={avgPerDay}
          workDays={workDays}
          totalUnsyncedCount={totalUnsyncedCount}
          firstUnsyncedDay={firstUnsyncedDay}
          showBatchBar={
            unsyncedEntries.length > 0 && activeTab === "unsynced" && selectedIds.size > 0
          }
          selectedCount={selectedIds.size}
          batchSyncing={batchSyncing}
          onNavigateToDay={(day) => navigate({ day, tab: "unsynced" })}
          onBatchSync={handleBatchSync}
        />
      </div>
    </div>
  );
}
