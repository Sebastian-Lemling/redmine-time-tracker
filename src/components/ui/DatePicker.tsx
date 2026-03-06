import { useState, useRef, useEffect, useCallback, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { Calendar } from "lucide-react";
import { useI18n } from "../../i18n/I18nContext";
import { DatePickerCalendar } from "./DatePickerCalendar";
import { DatePickerMonths } from "./DatePickerMonths";

interface Props {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function toKey(y: number, m: number, d: number) {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}

function parseDate(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  if (isNaN(y) || isNaN(m) || isNaN(d)) {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth(), day: now.getDate() };
  }
  return { year: y, month: m - 1, day: d };
}

type PickerView = "calendar" | "months";

export function DatePicker({ value, onChange, className = "" }: Props) {
  const { t } = useI18n();
  const { year: initY, month: initM } = parseDate(value);

  const [open, setOpen] = useState(false);
  const [view, setView] = useState<PickerView>("calendar");
  const [cursor, setCursor] = useState({ year: initY, month: initM });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const update = () => {
      const dialog = triggerRef.current!.closest("form, [role='dialog']");
      if (dialog) {
        const dialogRect = dialog.getBoundingClientRect();
        setPos({ top: dialogRect.top, left: dialogRect.right + 8, width: 328 });
      } else {
        const rect = triggerRef.current!.getBoundingClientRect();
        setPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
      }
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        (!triggerRef.current || !triggerRef.current.contains(target)) &&
        (!dropdownRef.current || !dropdownRef.current.contains(target))
      )
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  useEffect(() => {
    if (open) {
      const { year, month } = parseDate(value);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCursor({ year, month });
      setView("calendar");
    }
  }, [open, value]);

  const prevMonth = useCallback(() => {
    setCursor((prev) => ({
      year: prev.month === 0 ? prev.year - 1 : prev.year,
      month: prev.month === 0 ? 11 : prev.month - 1,
    }));
  }, []);
  const nextMonth = useCallback(() => {
    setCursor((prev) => ({
      year: prev.month === 11 ? prev.year + 1 : prev.year,
      month: prev.month === 11 ? 0 : prev.month + 1,
    }));
  }, []);
  const prevYear = useCallback(() => {
    setCursor((prev) => ({ ...prev, year: prev.year - 1 }));
  }, []);
  const nextYear = useCallback(() => {
    setCursor((prev) => ({ ...prev, year: prev.year + 1 }));
  }, []);

  const selectDay = (key: string) => {
    onChange(key);
    setOpen(false);
  };
  const goToday = () => {
    const now = new Date();
    onChange(toKey(now.getFullYear(), now.getMonth(), now.getDate()));
    setOpen(false);
  };
  const handleMonthSelect = (month: number) => {
    setCursor((prev) => ({ ...prev, month }));
    setView("calendar");
  };

  const now = new Date();
  const todayKey = toKey(now.getFullYear(), now.getMonth(), now.getDate());
  const sel = parseDate(value);
  const formatHeaderDate = (y: number, m: number, d: number) => {
    const date = new Date(y, m, d);
    return t.formatPickerHeader(t.weekdaysShort[date.getDay()], t.monthsShort[m], d);
  };
  const headerDateStr = formatHeaderDate(sel.year, sel.month, sel.day);
  const { day: valDay, month: valMonth, year: valYear } = parseDate(value);
  const displayText = `${pad(valDay)}.${pad(valMonth + 1)}.${valYear}`;

  return (
    <div className={className} style={{ position: "relative" }}>
      <label
        className="md-body-small"
        style={{
          position: "absolute",
          top: -8,
          left: 12,
          backgroundColor: "var(--md-field-surface)",
          padding: "0 4px",
          color: open ? "var(--color-primary)" : "var(--color-on-surface-variant)",
          zIndex: 1,
          pointerEvents: "none",
          transition: "color 200ms cubic-bezier(0.2, 0, 0, 1)",
        }}
      >
        {t.date}
      </label>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 text-left"
        style={{
          height: 48,
          padding: open ? "0 11px" : "0 12px",
          backgroundColor: "transparent",
          border: open ? "2px solid var(--color-primary)" : "1px solid var(--color-outline)",
          borderRadius: 4,
          color: "var(--color-on-surface)",
          fontSize: 14,
          fontFamily: "'Roboto Mono', monospace",
          outline: "none",
        }}
      >
        <Calendar
          className="shrink-0"
          style={{
            width: 18,
            height: 18,
            color: open ? "var(--color-primary)" : "var(--color-on-surface-variant)",
            transition: "color 200ms cubic-bezier(0.2, 0, 0, 1)",
          }}
        />
        <span>{displayText}</span>
      </button>

      {open &&
        createPortal(
          <div
            ref={dropdownRef}
            className="md-elevation-2"
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              width: pos.width,
              minWidth: 328,
              zIndex: 9999,
              backgroundColor: "var(--md-dialog-surface)",
              borderRadius: 16,
              overflow: "hidden",
              animation: "menu-enter 200ms var(--md-motion-easing-emphasized) forwards",
            }}
          >
            <div style={{ padding: "16px 24px 12px" }}>
              <div
                className="md-label-medium"
                style={{ color: "var(--color-on-surface-variant)", marginBottom: 4 }}
              >
                {t.selectDate}
              </div>
              <div
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
              >
                <div
                  style={{
                    color: "var(--color-on-surface)",
                    fontWeight: 400,
                    fontSize: 28,
                    lineHeight: "36px",
                    fontFamily: "'Inter', 'Roboto', sans-serif",
                  }}
                >
                  {headerDateStr}
                </div>
                <button
                  type="button"
                  onClick={goToday}
                  className="md-label-medium md-interactive"
                  style={{
                    padding: "6px 16px",
                    color: "var(--color-primary)",
                    backgroundColor: "transparent",
                    border: "1px solid var(--color-outline)",
                    borderRadius: 20,
                    cursor: "pointer",
                  }}
                >
                  {t.todayBtn}
                </button>
              </div>
            </div>
            <div style={{ height: 1, backgroundColor: "var(--color-outline-variant)" }} />
            {view === "calendar" && (
              <DatePickerCalendar
                cursor={cursor}
                value={value}
                todayKey={todayKey}
                onSelectDay={selectDay}
                onPrevMonth={prevMonth}
                onNextMonth={nextMonth}
                onSwitchToMonths={() => setView("months")}
              />
            )}
            {view === "months" && (
              <DatePickerMonths
                cursor={cursor}
                onSelectMonth={handleMonthSelect}
                onPrevYear={prevYear}
                onNextYear={nextYear}
              />
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}
