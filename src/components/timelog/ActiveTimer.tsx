import { useContext } from "react";
import { Pause, Check, Minus, Plus } from "lucide-react";
import type { TimerState } from "../../types/redmine";
import { formatTime } from "../../lib/dates";
import { useI18n } from "../../i18n/I18nContext";
import { AppContext } from "../../AppContext";

interface Props {
  timer: TimerState;
  elapsed: number;
  onPause: () => void;
  onSave: (issueId: number) => void;
  onAdjust: (issueId: number, deltaSec: number) => void;
}

export function ActiveTimer({ timer, elapsed, onPause, onSave, onAdjust }: Props) {
  const { t } = useI18n();
  const appCtx = useContext(AppContext);
  const instances = appCtx?.instances ?? [];
  const instanceColorMap = appCtx?.instanceColorMap ?? {};
  const multiInstance = instances.length > 1;
  const instanceName = multiInstance
    ? instances.find((i) => i.id === timer.instanceId)?.name
    : undefined;
  const instanceColor = timer.instanceId ? instanceColorMap[timer.instanceId] : undefined;
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={t.timerRunningFor(timer.issueId, timer.issueSubject)}
      className="active-timer-bar"
    >
      <div className="active-timer-bar__inner">
        <span
          aria-hidden="true"
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            backgroundColor: "currentColor",
            flexShrink: 0,
            willChange: "opacity",
            animation:
              "recording-dot-enter 300ms cubic-bezier(0.05, 0.7, 0.1, 1.0) both, recording-breathe 3s ease-in-out 300ms infinite",
          }}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <span
            className="md-body-small truncate"
            style={{ display: "flex", alignItems: "center", gap: 4 }}
          >
            {multiInstance && instanceColor && (
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  backgroundColor: instanceColor,
                  flexShrink: 0,
                  display: "inline-block",
                }}
              />
            )}
            {instanceName && <>{instanceName} &middot; </>}
            {timer.projectName} &middot; #{timer.issueId}
          </span>
          <span className="md-label-large truncate">{timer.issueSubject}</span>
        </div>

        <div className="timer-stepper timer-stepper--banner timer-stepper--on-primary-container shrink-0">
          <button
            onClick={() => onAdjust(timer.issueId, -60)}
            className="timer-stepper__btn"
            aria-label={t.subtractMinute}
          >
            <Minus size={18} />
          </button>
          <span role="timer" className="timer-stepper__value">
            {formatTime(elapsed)}
          </span>
          <button
            onClick={() => onAdjust(timer.issueId, 60)}
            className="timer-stepper__btn"
            aria-label={t.addMinute}
          >
            <Plus size={18} />
          </button>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={onPause}
            className="md-icon-btn md-icon-btn--on-primary-container"
            aria-label={t.pauseTimer}
          >
            <Pause size={18} fill="currentColor" />
          </button>
          <button
            onClick={() => onSave(timer.issueId)}
            className="md-icon-btn md-icon-btn--on-primary-container"
            aria-label={t.saveTimeEntry}
          >
            <Check size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
