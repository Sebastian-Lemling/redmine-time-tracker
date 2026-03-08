import { useState, useMemo, useContext } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { TimeLogEntry as TEntry } from "../../types/redmine";
import {
  getWeekNumber,
  getWeekDaysFromDate,
  formatDateKey,
  formatDurationHM,
} from "../../lib/dates";
import { useI18n } from "../../i18n/I18nContext";
import { AppContext } from "../../AppContext";

interface Props {
  entries: TEntry[];
  onNavigateToDate: (date: string) => void;
}

function fmtShortDate(d: Date): string {
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.`;
}

function fmtFullDate(d: Date): string {
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
}

interface ProjectRow {
  projectName: string;
  byDate: Record<string, number>;
}

interface InstanceGroup {
  instanceId: string;
  instanceName: string;
  color: string;
  projects: ProjectRow[];
  total: number;
}

export function WeekView({ entries, onNavigateToDate }: Props) {
  const { t } = useI18n();
  const appCtx = useContext(AppContext);
  const instances = useMemo(() => appCtx?.instances ?? [], [appCtx?.instances]);
  const instanceColorMap = useMemo(
    () => appCtx?.instanceColorMap ?? {},
    [appCtx?.instanceColorMap],
  );
  const multiInstance = instances.length > 1;

  const [refDate, setRefDate] = useState<Date>(() => new Date());

  const weekDays = useMemo(() => getWeekDaysFromDate(refDate), [refDate]);
  const weekNumber = useMemo(() => getWeekNumber(weekDays[0]), [weekDays]);

  const today = (() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return formatDateKey(now);
  })();

  const weekDateKeys = useMemo(() => weekDays.map(formatDateKey), [weekDays]);

  const weekEntries = useMemo(
    () => entries.filter((e) => weekDateKeys.includes(e.date)),
    [entries, weekDateKeys],
  );

  const instanceGroups = useMemo((): InstanceGroup[] | null => {
    if (!multiInstance) return null;
    const map: Record<string, Record<string, Record<string, number>>> = {};
    for (const e of weekEntries) {
      const iid = e.instanceId || "default";
      if (!map[iid]) map[iid] = {};
      if (!map[iid][e.projectName]) map[iid][e.projectName] = {};
      map[iid][e.projectName][e.date] = (map[iid][e.projectName][e.date] || 0) + e.duration;
    }
    return instances
      .filter((inst) => map[inst.id])
      .map((inst) => {
        const projects = Object.entries(map[inst.id])
          .map(([projectName, byDate]) => ({ projectName, byDate }))
          .sort((a, b) => a.projectName.localeCompare(b.projectName));
        const total = projects.reduce(
          (sum, p) => sum + Object.values(p.byDate).reduce((a, b) => a + b, 0),
          0,
        );
        return {
          instanceId: inst.id,
          instanceName: inst.name,
          color: instanceColorMap[inst.id] || "#888",
          projects,
          total,
        };
      });
  }, [weekEntries, multiInstance, instances, instanceColorMap]);

  const projectRows = useMemo(() => {
    if (multiInstance) return [];
    const map: Record<string, { projectName: string; byDate: Record<string, number> }> = {};
    for (const e of weekEntries) {
      const key = e.projectName;
      if (!map[key]) {
        map[key] = { projectName: key, byDate: {} };
      }
      map[key].byDate[e.date] = (map[key].byDate[e.date] || 0) + e.duration;
    }
    return Object.values(map).sort((a, b) => a.projectName.localeCompare(b.projectName));
  }, [weekEntries, multiInstance]);

  const dayTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const dk of weekDateKeys) {
      totals[dk] = 0;
    }
    for (const e of weekEntries) {
      totals[e.date] = (totals[e.date] || 0) + e.duration;
    }
    return totals;
  }, [weekEntries, weekDateKeys]);

  const weekTotal = useMemo(() => Object.values(dayTotals).reduce((a, b) => a + b, 0), [dayTotals]);

  const navigateWeek = (delta: number) => {
    setRefDate((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + delta * 7);
      return d;
    });
  };

  const hasRows = multiInstance
    ? (instanceGroups ?? []).some((g) => g.projects.length > 0)
    : projectRows.length > 0;

  const renderProjectRow = (row: ProjectRow, indented: boolean) => {
    const rowTotal = Object.values(row.byDate).reduce((a, b) => a + b, 0);
    return (
      <div
        key={row.projectName}
        className="week-table-row"
        style={{
          display: "grid",
          gridTemplateColumns: "180px repeat(7, 1fr) 80px",
          borderBottom: "1px solid var(--color-outline-variant)",
          transition: "background-color 150ms ease",
        }}
      >
        <div
          className="md-title-small"
          style={{
            padding: indented ? "10px 16px 10px 32px" : "12px 16px",
            color: "var(--color-on-surface)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            fontSize: indented ? 12 : undefined,
          }}
        >
          {row.projectName}
        </div>
        {weekDateKeys.map((dk, i) => {
          const mins = row.byDate[dk] || 0;
          const isToday = dk === today;
          const isWeekend = i >= 5;
          return (
            <button
              key={dk}
              onClick={() => onNavigateToDate(dk)}
              className="md-body-medium"
              style={{
                padding: "12px 8px",
                textAlign: "right",
                fontVariantNumeric: "tabular-nums",
                color: mins > 0 ? "var(--color-on-surface)" : "var(--color-on-surface-variant)",
                opacity: mins > 0 ? 1 : 0.3,
                background: isToday
                  ? "color-mix(in srgb, var(--color-primary-container) 30%, transparent)"
                  : isWeekend && mins === 0
                    ? "var(--color-surface-container-low)"
                    : undefined,
                border: "none",
                cursor: "pointer",
                font: "inherit",
                fontSize: indented ? 12 : undefined,
              }}
            >
              {mins > 0 ? formatDurationHM(mins) : "\u2014"}
            </button>
          );
        })}
        <div
          className="md-body-medium"
          style={{
            padding: "12px 16px",
            textAlign: "right",
            fontVariantNumeric: "tabular-nums",
            fontWeight: 500,
            color: "var(--color-on-surface)",
          }}
        >
          {formatDurationHM(rowTotal)}
        </div>
      </div>
    );
  };

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <button
          onClick={() => navigateWeek(-1)}
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "none",
            background: "transparent",
            color: "var(--color-on-surface-variant)",
            cursor: "pointer",
          }}
          className="md-state-layer"
          aria-label={t.prevWeek}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <span
          className="md-title-medium"
          style={{ color: "var(--color-on-surface)", minWidth: 280, textAlign: "center" }}
        >
          {t.calendarWeek} {weekNumber} &middot; {fmtShortDate(weekDays[0])} &ndash;{" "}
          {fmtFullDate(weekDays[6])}
        </span>

        <button
          onClick={() => navigateWeek(1)}
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "none",
            background: "transparent",
            color: "var(--color-on-surface-variant)",
            cursor: "pointer",
          }}
          className="md-state-layer"
          aria-label={t.nextWeek}
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div
        style={{
          borderRadius: 12,
          border: "1px solid var(--color-outline-variant)",
          background: "var(--color-surface)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "180px repeat(7, 1fr) 80px",
            background: "var(--color-surface-container-low)",
            borderBottom: "1px solid var(--color-outline-variant)",
          }}
        >
          <div
            className="md-label-medium"
            style={{
              padding: "12px 16px",
              color: "var(--color-on-surface-variant)",
            }}
          >
            {t.project}
          </div>
          {weekDays.map((d, i) => {
            const dk = formatDateKey(d);
            const isToday = dk === today;
            return (
              <button
                key={dk}
                onClick={() => onNavigateToDate(dk)}
                className="md-label-medium md-state-layer"
                style={{
                  padding: "12px 8px",
                  textAlign: "right",
                  color: isToday ? "var(--color-primary)" : "var(--color-on-surface-variant)",
                  fontWeight: isToday ? 600 : undefined,
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  font: "inherit",
                }}
              >
                {t.dayHeaders[i]} {String(d.getDate()).padStart(2, "0")}.
                {String(d.getMonth() + 1).padStart(2, "0")}.
              </button>
            );
          })}
          <div
            className="md-label-medium"
            style={{
              padding: "12px 16px",
              textAlign: "right",
              color: "var(--color-on-surface-variant)",
            }}
          >
            {t.total}
          </div>
        </div>

        {!hasRows && (
          <div
            className="md-body-medium"
            style={{
              padding: "24px 16px",
              textAlign: "center",
              color: "var(--color-on-surface-variant)",
            }}
          >
            {t.noEntriesToday}
          </div>
        )}

        {multiInstance
          ? (instanceGroups ?? []).map((group) => (
              <div key={group.instanceId}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "180px repeat(7, 1fr) 80px",
                    borderBottom: "1px solid var(--color-outline-variant)",
                    background:
                      "color-mix(in srgb, var(--color-surface-container) 50%, transparent)",
                  }}
                >
                  <div
                    className="md-label-large"
                    style={{
                      padding: "10px 16px",
                      color: "var(--color-on-surface)",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        backgroundColor: group.color,
                        flexShrink: 0,
                      }}
                    />
                    {group.instanceName}
                  </div>
                  {weekDateKeys.map((dk) => (
                    <div key={dk} />
                  ))}
                  <div
                    className="md-label-large"
                    style={{
                      padding: "10px 16px",
                      textAlign: "right",
                      fontVariantNumeric: "tabular-nums",
                      color: "var(--color-on-surface)",
                    }}
                  >
                    {formatDurationHM(group.total)}
                  </div>
                </div>
                {group.projects.map((row) => renderProjectRow(row, true))}
              </div>
            ))
          : projectRows.map((row) => renderProjectRow(row, false))}

        {hasRows && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "180px repeat(7, 1fr) 80px",
              borderTop: "2px solid var(--color-outline)",
            }}
          >
            <div
              className="md-title-small"
              style={{
                padding: "12px 16px",
                color: "var(--color-on-surface)",
                fontWeight: 600,
              }}
            >
              {t.total}
            </div>
            {weekDateKeys.map((dk, i) => {
              const mins = dayTotals[dk] || 0;
              const isToday = dk === today;
              const isWeekend = i >= 5;
              return (
                <div
                  key={dk}
                  className="md-title-small"
                  style={{
                    padding: "12px 8px",
                    textAlign: "right",
                    fontVariantNumeric: "tabular-nums",
                    fontWeight: 600,
                    color: mins > 0 ? "var(--color-on-surface)" : "var(--color-on-surface-variant)",
                    opacity: mins > 0 ? 1 : 0.3,
                    background: isToday
                      ? "color-mix(in srgb, var(--color-primary-container) 30%, transparent)"
                      : isWeekend && mins === 0
                        ? "var(--color-surface-container-low)"
                        : undefined,
                  }}
                >
                  {mins > 0 ? formatDurationHM(mins) : "\u2014"}
                </div>
              );
            })}
            <div
              className="md-title-medium"
              style={{
                padding: "12px 16px",
                textAlign: "right",
                fontVariantNumeric: "tabular-nums",
                fontWeight: 600,
                color: "var(--color-primary)",
              }}
            >
              {formatDurationHM(weekTotal)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
