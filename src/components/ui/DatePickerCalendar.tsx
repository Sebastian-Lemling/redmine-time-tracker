import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import { useI18n } from "../../i18n/I18nContext";

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function toKey(y: number, m: number, d: number) {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}

interface Props {
  cursor: { year: number; month: number };
  value: string;
  todayKey: string;
  onSelectDay: (key: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onSwitchToMonths: () => void;
}

export function DatePickerCalendar({
  cursor,
  value,
  todayKey,
  onSelectDay,
  onPrevMonth,
  onNextMonth,
  onSwitchToMonths,
}: Props) {
  const { t } = useI18n();

  const firstDay = new Date(cursor.year, cursor.month, 1);
  const startWeekday = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
  const daysInPrev = new Date(cursor.year, cursor.month, 0).getDate();

  const cells: { key: string; day: number; current: boolean }[] = [];
  for (let i = startWeekday - 1; i >= 0; i--) {
    const d = daysInPrev - i;
    const m = cursor.month === 0 ? 11 : cursor.month - 1;
    const y = cursor.month === 0 ? cursor.year - 1 : cursor.year;
    cells.push({ key: toKey(y, m, d), day: d, current: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ key: toKey(cursor.year, cursor.month, d), day: d, current: true });
  }
  const totalNeeded = cells.length <= 35 ? 35 : 42;
  const remaining = totalNeeded - cells.length;
  for (let d = 1; d <= remaining; d++) {
    const m = cursor.month === 11 ? 0 : cursor.month + 1;
    const y = cursor.month === 11 ? cursor.year + 1 : cursor.year;
    cells.push({ key: toKey(y, m, d), day: d, current: false });
  }

  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px 4px",
        }}
      >
        <button
          type="button"
          onClick={onSwitchToMonths}
          className="md-interactive"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            padding: "8px 12px",
            border: "none",
            background: "transparent",
            color: "var(--color-on-surface)",
            fontSize: 14,
            fontWeight: 500,
            cursor: "pointer",
            borderRadius: 8,
            fontFamily: "'Inter', 'Roboto', sans-serif",
          }}
        >
          {t.months[cursor.month]} {cursor.year}
          <ChevronDown style={{ width: 18, height: 18 }} />
        </button>
        <div style={{ display: "flex", gap: 4 }}>
          <button
            type="button"
            onClick={onPrevMonth}
            className="md-interactive"
            style={{
              width: 40,
              height: 40,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "none",
              background: "transparent",
              borderRadius: 20,
              cursor: "pointer",
              color: "var(--color-on-surface-variant)",
            }}
          >
            <ChevronLeft style={{ width: 20, height: 20 }} />
          </button>
          <button
            type="button"
            onClick={onNextMonth}
            className="md-interactive"
            style={{
              width: 40,
              height: 40,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "none",
              background: "transparent",
              borderRadius: 20,
              cursor: "pointer",
              color: "var(--color-on-surface-variant)",
            }}
          >
            <ChevronRight style={{ width: 20, height: 20 }} />
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", padding: "0 16px" }}>
        {t.dayHeaders.map((d) => (
          <div
            key={d}
            className="md-body-small"
            style={{
              height: 40,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--color-on-surface-variant)",
              fontWeight: 500,
            }}
          >
            {d}
          </div>
        ))}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          padding: "0 16px 16px",
          rowGap: 2,
        }}
      >
        {cells.map((cell) => {
          const isSelected = cell.key === value;
          const isToday = cell.key === todayKey;
          let bg = "transparent";
          let color = cell.current ? "var(--color-on-surface)" : "var(--color-outline)";
          let border = "none";
          let fontWeight = 400;
          if (isSelected) {
            bg = "var(--color-primary)";
            color = "var(--color-on-primary)";
            fontWeight = 500;
          } else if (isToday) {
            border = "1px solid var(--color-primary)";
            color = "var(--color-primary)";
            fontWeight = 500;
          }

          return (
            <div
              key={cell.key}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: 40,
              }}
            >
              <button
                type="button"
                onClick={() => onSelectDay(cell.key)}
                className="md-interactive"
                style={{
                  width: 40,
                  height: 40,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 20,
                  backgroundColor: bg,
                  color,
                  border,
                  fontSize: 14,
                  fontWeight,
                  cursor: "pointer",
                  fontFamily: "'Roboto', sans-serif",
                }}
              >
                {cell.day}
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
}
