import { useState, useEffect, useRef } from "react";
import { X, Check, Clock, Minus, Plus, Copy } from "lucide-react";
import type { TimeLogEntry, RedmineActivity } from "../../types/redmine";
import { DatePicker } from "../ui/DatePicker";
import { M3Select } from "../ui/M3Select";
import { roundUpToStep, DURATION_STEP_MINUTES } from "../../lib/timeConfig";
import { useI18n } from "../../i18n/I18nContext";
import { logger } from "../../lib/logger";

interface Props {
  entry: TimeLogEntry;
  redmineUrl?: string;
  activities: RedmineActivity[];
  doneRatio?: number;
  onDoneRatioChange?: (issueId: number, value: number) => void;
  onSave: (
    id: string,
    updates: {
      description: string;
      duration: number;
      date: string;
      activityId?: number;
      activityName?: string;
    },
  ) => void;
  onCancel: () => void;
}

const STEP_HOURS = DURATION_STEP_MINUTES / 60;

function minutesToDecimal(mins: number): string {
  const h = mins / 60;
  if (h % 1 === 0) return String(h);
  return parseFloat(h.toFixed(2)).toString();
}

export function EditEntryDialog({
  entry,
  redmineUrl,
  activities,
  doneRatio,
  onDoneRatioChange,
  onSave,
  onCancel,
}: Props) {
  const { t } = useI18n();
  const [description, setDescription] = useState(entry.description);
  const [date, setDate] = useState(entry.date);
  const [durationStr, setDurationStr] = useState(minutesToDecimal(entry.duration));
  const [activityId, setActivityId] = useState(entry.activityId?.toString() || "");
  const [localDoneRatio, setLocalDoneRatio] = useState(doneRatio ?? 0);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const autoGrow = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  };

  const parsedHours = parseFloat(durationStr) || 0;
  const parsedMinutes = Math.round(parsedHours * 60);
  const atMin = parsedHours <= STEP_HOURS;

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      autoGrow(inputRef.current);
    }
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onCancel]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const totalMinutes = roundUpToStep(parsedMinutes);
    onSave(entry.id, {
      description,
      duration: totalMinutes,
      date,
      ...(activityId
        ? {
            activityId: Number(activityId),
            activityName: activities.find((a) => a.id.toString() === activityId)?.name,
          }
        : {}),
    });
    if (onDoneRatioChange && localDoneRatio !== (doneRatio ?? 0)) {
      onDoneRatioChange(entry.issueId, localDoneRatio);
    }
  };

  const stepDuration = (delta: number) => {
    const next = Math.max(STEP_HOURS, parsedHours + delta);
    setDurationStr(minutesToDecimal(Math.round(next * 60)));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-dialog-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="md-elevation-3"
        style={{
          width: "100%",
          maxWidth: 480,
          backgroundColor: "var(--md-dialog-surface)",
          borderRadius: 28,
          animation: "md-scale-in 200ms cubic-bezier(0, 0, 0.2, 1) both",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: 24, paddingBottom: 16 }}>
          <div className="flex items-center justify-between">
            <h3
              id="edit-dialog-title"
              className="md-headline-small"
              style={{ color: "var(--color-on-surface)", marginBottom: 8 }}
            >
              {t.editEntry}
            </h3>
            <button
              type="button"
              onClick={onCancel}
              className="md-icon-btn md-icon-btn--standard"
              aria-label={t.cancel}
              style={{ marginTop: -8, marginRight: -8 }}
            >
              <X size={20} />
            </button>
          </div>
          <p
            className="md-body-medium"
            style={{ color: "var(--color-on-surface-variant)", marginBottom: 16 }}
          >
            {entry.issueSubject}
          </p>

          <div className="flex flex-wrap items-center gap-2">
            {(() => {
              const origMin = entry.originalDuration ?? entry.duration;
              const liveMin = parsedMinutes;
              const changed = origMin !== liveMin;
              return (
                <span
                  className="md-label-medium flex items-center gap-1.5"
                  style={{
                    backgroundColor: "var(--color-primary-container)",
                    color: "var(--color-on-primary-container)",
                    borderRadius: 8,
                    padding: "0 12px",
                    height: 32,
                  }}
                  title={
                    changed
                      ? `Urspr\u00fcnglich: ${minutesToDecimal(origMin)}h \u2192 Aktuell: ${minutesToDecimal(liveMin)}h`
                      : `${minutesToDecimal(liveMin)}h`
                  }
                >
                  <Clock style={{ width: 14, height: 14 }} />
                  {changed ? (
                    <>
                      <span
                        style={{
                          opacity: 0.5,
                          fontSize: "0.85em",
                          position: "relative",
                          display: "inline-block",
                        }}
                      >
                        {minutesToDecimal(origMin)}h
                        <span
                          style={{
                            position: "absolute",
                            left: 0,
                            right: 0,
                            top: "50%",
                            height: 1,
                            backgroundColor: "currentColor",
                          }}
                        />
                      </span>
                      <span style={{ color: "var(--color-primary)", fontWeight: 600 }}>
                        {minutesToDecimal(liveMin)}h
                      </span>
                    </>
                  ) : (
                    <>{minutesToDecimal(liveMin)}h</>
                  )}
                </span>
              );
            })()}
            <div className="card-header__id-badge" style={{ height: 32 }}>
              <span
                className="card-header__badge-dot"
                style={{ background: "var(--color-primary)" }}
              />
              <a
                href={redmineUrl ? `${redmineUrl}/issues/${entry.issueId}` : `#`}
                target="_blank"
                rel="noopener noreferrer"
                className="card-header__badge-label"
                style={{ lineHeight: "32px" }}
                title={`Open #${entry.issueId} in Redmine`}
              >
                #{entry.issueId}
              </a>
              <span className="card-header__badge-divider" />
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(`#${entry.issueId}`);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  } catch (e) {
                    logger.warn("Clipboard write failed", { error: e });
                  }
                }}
                className={`card-header__badge-copy${copied ? " card-header__badge-copy--copied" : ""}`}
                style={{ width: 30, height: 30 }}
                aria-label={`Copy #${entry.issueId} to clipboard`}
                title={t.copyId(entry.issueId)}
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
              </button>
            </div>
            {entry.projectName && (
              <span
                className="md-label-medium flex items-center"
                style={{
                  backgroundColor: "var(--color-secondary-container)",
                  color: "var(--color-on-secondary-container)",
                  borderRadius: 8,
                  padding: "0 12px",
                  height: 32,
                }}
              >
                {entry.projectName}
              </span>
            )}
          </div>
        </div>

        <div style={{ padding: "8px 24px 0", maxHeight: "60vh", overflowY: "auto" }}>
          <div style={{ marginBottom: 16, position: "relative" }}>
            <label
              className="md-body-small"
              style={{
                position: "absolute",
                top: -8,
                left: 12,
                backgroundColor: "var(--md-field-surface)",
                padding: "0 4px",
                color: "var(--color-on-surface-variant)",
                zIndex: 1,
              }}
            >
              {t.duration}
            </label>
            <div
              className="flex items-center"
              style={{
                border: "1px solid var(--color-outline)",
                borderRadius: 4,
                height: 48,
              }}
            >
              <button
                type="button"
                disabled={atMin}
                onClick={() => stepDuration(-STEP_HOURS)}
                className="ed-stepper-btn flex items-center justify-center"
                style={{
                  width: 48,
                  height: "100%",
                  border: "none",
                  background: "transparent",
                  color: atMin
                    ? "var(--md-on-surface-disabled)"
                    : "var(--color-on-surface-variant)",
                  cursor: atMin ? "default" : "pointer",
                  flexShrink: 0,
                  borderRadius: "4px 0 0 4px",
                }}
                aria-label={t.lessTime}
              >
                <Minus size={18} />
              </button>
              <div
                style={{
                  flex: 1,
                  borderLeft: "1px solid var(--color-outline-variant)",
                  borderRight: "1px solid var(--color-outline-variant)",
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 16,
                  fontFamily: "'Roboto Mono', monospace",
                }}
              >
                <input
                  type="number"
                  min={STEP_HOURS}
                  step={STEP_HOURS}
                  value={durationStr}
                  onChange={(e) => setDurationStr(e.target.value)}
                  style={{
                    width: `${Math.max(1, durationStr.length)}ch`,
                    padding: 0,
                    border: "none",
                    background: "transparent",
                    color: "var(--color-on-surface)",
                    fontSize: "inherit",
                    fontFamily: "inherit",
                    textAlign: "right",
                    outline: "none",
                  }}
                />
                <span style={{ color: "var(--color-on-surface-variant)", marginLeft: 3 }}>h</span>
              </div>
              <button
                type="button"
                onClick={() => stepDuration(STEP_HOURS)}
                className="ed-stepper-btn flex items-center justify-center"
                style={{
                  width: 48,
                  height: "100%",
                  border: "none",
                  background: "transparent",
                  color: "var(--color-on-surface-variant)",
                  cursor: "pointer",
                  flexShrink: 0,
                  borderRadius: "0 4px 4px 0",
                }}
                aria-label={t.moreTime}
              >
                <Plus size={18} />
              </button>
            </div>
          </div>

          {activities.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <M3Select
                label={t.activity}
                value={activityId}
                options={activities.map((a) => ({ value: String(a.id), label: a.name }))}
                onChange={setActivityId}
              />
            </div>
          )}

          {doneRatio !== undefined && (
            <div style={{ marginBottom: 16, position: "relative" }}>
              <label
                className="md-body-small"
                style={{
                  position: "absolute",
                  top: -8,
                  left: 12,
                  backgroundColor: "var(--md-field-surface)",
                  padding: "0 4px",
                  color: "var(--color-on-surface-variant)",
                  zIndex: 1,
                }}
              >
                {t.progress}
              </label>
              <div
                className="ed-progress-field"
                style={{
                  border: "1px solid var(--color-outline)",
                  borderRadius: 4,
                  height: 48,
                  display: "flex",
                  alignItems: "center",
                  padding: "0 16px",
                  gap: 12,
                }}
              >
                <div className="ed-progress-slider" style={{ flex: 1, position: "relative" }}>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={10}
                    value={localDoneRatio}
                    onChange={(e) => setLocalDoneRatio(Number(e.target.value))}
                    style={{ "--slider-progress": `${localDoneRatio}%` } as React.CSSProperties}
                  />
                  <div className="ed-progress-ticks" aria-hidden="true">
                    {Array.from({ length: 11 }, (_, i) => (
                      <span
                        key={i}
                        className={`ed-progress-tick${i * 10 <= localDoneRatio ? " ed-progress-tick--active" : ""}`}
                      />
                    ))}
                  </div>
                </div>
                <span
                  className="md-label-large"
                  style={{
                    color:
                      localDoneRatio > 0
                        ? "var(--color-primary)"
                        : "var(--color-on-surface-variant)",
                    fontFamily: "'Roboto Mono', monospace",
                    minWidth: 40,
                    textAlign: "right",
                    fontWeight: 500,
                    transition: "color 150ms ease",
                  }}
                >
                  {localDoneRatio}%
                </span>
              </div>
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <DatePicker value={date} onChange={setDate} />
          </div>

          <div style={{ marginBottom: 8, position: "relative" }}>
            <label
              className="md-body-small"
              style={{
                position: "absolute",
                top: -8,
                left: 12,
                backgroundColor: "var(--md-field-surface)",
                padding: "0 4px",
                color: "var(--color-on-surface-variant)",
                zIndex: 1,
              }}
            >
              {t.description}
            </label>
            <textarea
              ref={inputRef}
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                autoGrow(e.currentTarget);
              }}
              placeholder={t.whatDidYouDo}
              className="md-body-large"
              style={{
                width: "100%",
                padding: "16px 16px",
                backgroundColor: "transparent",
                border: "1px solid var(--color-outline)",
                borderRadius: 4,
                color: "var(--color-on-surface)",
                fontSize: 16,
                resize: "none",
                overflowY: "auto",
                minHeight: 72,
                maxHeight: 200,
                outline: "none",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "var(--color-primary)";
                e.currentTarget.style.borderWidth = "2px";
                e.currentTarget.style.padding = "15px 15px";
                const label = e.currentTarget.parentElement?.querySelector("label");
                if (label) (label as HTMLElement).style.color = "var(--color-primary)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "var(--color-outline)";
                e.currentTarget.style.borderWidth = "1px";
                e.currentTarget.style.padding = "16px 16px";
                const label = e.currentTarget.parentElement?.querySelector("label");
                if (label) (label as HTMLElement).style.color = "var(--color-on-surface-variant)";
              }}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2" style={{ padding: "16px 24px 24px" }}>
          <button
            type="button"
            onClick={onCancel}
            className="md-label-large md-interactive"
            style={{
              padding: "10px 24px",
              color: "var(--color-primary)",
              backgroundColor: "transparent",
              border: "none",
              borderRadius: 20,
              cursor: "pointer",
            }}
          >
            {t.cancel}
          </button>
          <button
            type="submit"
            className="md-label-large md-interactive flex items-center gap-2"
            style={{
              padding: "10px 24px",
              backgroundColor: "var(--color-primary)",
              color: "var(--color-on-primary)",
              border: "none",
              borderRadius: 20,
              cursor: "pointer",
            }}
          >
            <Check style={{ width: 18, height: 18 }} />
            {t.saveBtn}
          </button>
        </div>
      </form>
    </div>
  );
}
