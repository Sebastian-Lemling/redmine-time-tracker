import { ChevronLeft, ChevronRight } from "lucide-react";
import { useI18n } from "../../i18n/I18nContext";

interface Props {
  cursor: { year: number; month: number };
  onSelectMonth: (month: number) => void;
  onPrevYear: () => void;
  onNextYear: () => void;
}

export function DatePickerMonths({ cursor, onSelectMonth, onPrevYear, onNextYear }: Props) {
  const { t } = useI18n();
  const now = new Date();

  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px 8px",
        }}
      >
        <button
          type="button"
          onClick={onPrevYear}
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
        <span
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: "var(--color-on-surface)",
            fontFamily: "'Inter', 'Roboto', sans-serif",
          }}
        >
          {cursor.year}
        </span>
        <button
          type="button"
          onClick={onNextYear}
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

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 4,
          padding: "0 16px 16px",
        }}
      >
        {t.monthsShort.map((name, i) => {
          const isCurrent = i === cursor.month;
          const isThisMonth = i === now.getMonth() && cursor.year === now.getFullYear();
          return (
            <button
              key={i}
              type="button"
              onClick={() => onSelectMonth(i)}
              className="md-interactive"
              style={{
                height: 40,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 20,
                border: isThisMonth && !isCurrent ? "1px solid var(--color-primary)" : "none",
                backgroundColor: isCurrent ? "var(--color-primary)" : "transparent",
                color: isCurrent
                  ? "var(--color-on-primary)"
                  : isThisMonth
                    ? "var(--color-primary)"
                    : "var(--color-on-surface)",
                fontSize: 14,
                fontWeight: isCurrent || isThisMonth ? 500 : 400,
                cursor: "pointer",
                fontFamily: "'Roboto', sans-serif",
              }}
            >
              {name}
            </button>
          );
        })}
      </div>
    </>
  );
}
