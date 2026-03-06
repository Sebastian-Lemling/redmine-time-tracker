import { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getMonthGrid, formatDateKey, formatDurationHM } from "../../lib/dates";
import { useI18n } from "../../i18n/I18nContext";

interface Props {
  year: number;
  month: number;
  today: string;
  selectedDate: string;
  minutesByDate: Record<string, number>;
  localMinsByDate: Record<string, number>;
  remoteMinsByDate: Record<string, number>;
  unsyncedByDate: Record<string, number>;
  entryCountByDate: Record<string, number>;
  heatQuartiles: number[];
  onSelectDay: (day: number, hasUnsynced: boolean, hasMins: boolean) => void;
  onNavigateMonth: (delta: number) => void;
  onGoToday: () => void;
}

export function MonthCalendar({
  year,
  month,
  today,
  selectedDate,
  minutesByDate,
  localMinsByDate,
  remoteMinsByDate,
  unsyncedByDate,
  entryCountByDate,
  heatQuartiles,
  onSelectDay,
  onNavigateMonth,
  onGoToday,
}: Props) {
  const { t } = useI18n();
  const grid = useMemo(() => getMonthGrid(year, month), [year, month]);

  const getHeatLevel = (dateKey: string): number => {
    const count = entryCountByDate[dateKey] || 0;
    if (count <= 0) return 0;
    if (count <= heatQuartiles[0]) return 1;
    if (count <= heatQuartiles[1]) return 2;
    if (count <= heatQuartiles[2]) return 3;
    return 4;
  };

  return (
    <div className="cal-layout__calendar">
      <div className="cal-container">
        <div className="cal-nav">
          <button
            onClick={() => onNavigateMonth(-1)}
            className="cal-nav__btn"
            aria-label={t.prevMonth}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="cal-nav__title">
            {t.months[month]} {year}
          </span>
          <button
            onClick={() => onNavigateMonth(1)}
            className="cal-nav__btn"
            aria-label={t.nextMonth}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <button className="cal-nav__today" onClick={onGoToday}>
            {t.todayBtn}
          </button>
        </div>

        <div className="cal-header">
          {t.dayHeaders.map((label) => (
            <div key={label} className="cal-header__day">
              {label}
            </div>
          ))}
        </div>

        {grid.map((week, wi) => (
          <div key={wi} className="cal-week">
            {week.map((day, di) => {
              if (!day)
                return <div key={`empty-${wi}-${di}`} className="cal-cell cal-cell--empty" />;

              const dk = formatDateKey(day);
              const isToday = dk === today;
              const isSelected = dk === selectedDate;
              const isWeekend = di >= 5;
              const mins = minutesByDate[dk] || 0;
              const localMins = localMinsByDate[dk] || 0;
              const remoteMins = remoteMinsByDate[dk] || 0;
              const hasUnsynced = (unsyncedByDate[dk] || 0) > 0;
              const heatLevel = getHeatLevel(dk);

              const cn = [
                "cal-cell",
                isWeekend && heatLevel === 0 && "cal-cell--weekend",
                isSelected && "cal-cell--selected",
                !isSelected && heatLevel > 0 && `cal-cell--heat-${heatLevel}`,
              ]
                .filter(Boolean)
                .join(" ");

              const dayCn = [
                "cal-day",
                isToday && !isSelected && "cal-day--today",
                isSelected && "cal-day--selected",
              ]
                .filter(Boolean)
                .join(" ");

              const remotePct = mins > 0 ? (remoteMins / mins) * 100 : 0;
              const localPct = mins > 0 ? (localMins / mins) * 100 : 0;

              return (
                <button
                  key={dk}
                  onClick={() => onSelectDay(day.getDate(), hasUnsynced, mins > 0)}
                  className={cn}
                  aria-pressed={isSelected}
                >
                  <div className={dayCn}>{day.getDate()}</div>
                  {mins > 0 && <span className="cal-hours__value">{formatDurationHM(mins)}</span>}
                  {mins > 0 && (
                    <div className="cal-bar">
                      {remoteMins > 0 && (
                        <div className="cal-bar__remote" style={{ width: `${remotePct}%` }} />
                      )}
                      {localMins > 0 && (
                        <div className="cal-bar__local" style={{ width: `${localPct}%` }} />
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
