import { Play, Pause, Plus, Minus, X, Check } from "lucide-react";
import type { RedmineIssue } from "../../types/redmine";
import { useI18n } from "../../i18n/I18nContext";

type TimerStatus = "running" | "paused" | "none";

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

interface Props {
  issue: RedmineIssue;
  timerStatus: TimerStatus;
  elapsed: number;
  onPlay: (issue: RedmineIssue) => void;
  onPause: () => void;
  onSave: (issueId: number) => void;
  onDiscard: (issueId: number) => void;
  onAdjust: (issueId: number, deltaSec: number) => void;
  onOpenBookDialog: () => void;
}

export function TimerControls({
  issue,
  timerStatus,
  elapsed,
  onPlay,
  onPause,
  onSave,
  onDiscard,
  onAdjust,
  onOpenBookDialog,
}: Props) {
  const { t } = useI18n();

  if (timerStatus === "running") {
    return (
      <div
        className="flex items-center gap-2"
        style={{ borderTop: "1px solid var(--color-outline-variant)", padding: "12px 16px" }}
      >
        <button
          onClick={onPause}
          className="md-icon-btn md-icon-btn--tonal"
          aria-label="Pause timer"
        >
          <Pause size={18} fill="currentColor" />
        </button>
        <div className="timer-stepper timer-stepper--compact timer-stepper--running">
          <button
            onClick={() => onAdjust(issue.id, -60)}
            className="timer-stepper__btn"
            aria-label={t.subtractMinute}
          >
            <Minus size={16} />
          </button>
          <span className="timer-stepper__value">
            <span className="timer-stepper__dot" />
            {formatElapsed(elapsed)}
          </span>
          <button
            onClick={() => onAdjust(issue.id, 60)}
            className="timer-stepper__btn"
            aria-label={t.addMinute}
          >
            <Plus size={16} />
          </button>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4 }}>
          <button
            onClick={() => onDiscard(issue.id)}
            className="md-icon-btn md-icon-btn--standard"
            aria-label={t.discardTimer}
          >
            <X size={18} />
          </button>
          <button
            onClick={() => onSave(issue.id)}
            className="md-icon-btn md-icon-btn--tonal"
            aria-label={t.saveTimeEntry}
          >
            <Check size={18} />
          </button>
        </div>
      </div>
    );
  }

  if (timerStatus === "paused") {
    return (
      <div
        className="flex items-center gap-2"
        style={{ borderTop: "1px solid var(--color-outline-variant)", padding: "12px 16px" }}
      >
        <button
          onClick={() => onPlay(issue)}
          className="md-icon-btn md-icon-btn--tonal"
          aria-label={`Resume timer for #${issue.id}`}
        >
          <Play size={18} fill="currentColor" style={{ marginLeft: 1 }} />
        </button>
        <div className="timer-stepper timer-stepper--compact timer-stepper--paused">
          <button
            onClick={() => onAdjust(issue.id, -60)}
            className="timer-stepper__btn"
            aria-label={t.subtractMinute}
          >
            <Minus size={16} />
          </button>
          <span className="timer-stepper__value">{formatElapsed(elapsed)}</span>
          <button
            onClick={() => onAdjust(issue.id, 60)}
            className="timer-stepper__btn"
            aria-label={t.addMinute}
          >
            <Plus size={16} />
          </button>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4 }}>
          <button
            onClick={() => onDiscard(issue.id)}
            className="md-icon-btn md-icon-btn--standard"
            aria-label={t.discardTimer}
          >
            <X size={18} />
          </button>
          <button
            onClick={() => onSave(issue.id)}
            className="md-icon-btn md-icon-btn--tonal"
            aria-label={t.saveTimeEntry}
          >
            <Check size={18} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-2"
      style={{ borderTop: "1px solid var(--color-outline-variant)", padding: "12px 16px" }}
    >
      <button
        onClick={() => onPlay(issue)}
        className="md-icon-btn md-icon-btn--tonal"
        aria-label={t.startTimer}
      >
        <Play size={18} fill="currentColor" style={{ marginLeft: 1 }} />
      </button>
      <button
        onClick={onOpenBookDialog}
        className="md-icon-btn md-icon-btn--tonal"
        style={{ marginLeft: "auto" }}
        aria-label={t.bookManually}
      >
        <Plus size={18} />
      </button>
    </div>
  );
}
