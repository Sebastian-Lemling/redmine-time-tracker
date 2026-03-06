import { useState } from "react";
import { Check, Loader2, Plus, Minus, Pencil, Trash2, Copy } from "lucide-react";
import type { TimeLogEntry as TEntry, RedmineActivity } from "../../types/redmine";
import { DURATION_MIN_MINUTES } from "../../lib/timeConfig";
import { useI18n } from "../../i18n/I18nContext";
import { logger } from "../../lib/logger";

const PROJECT_COLORS = [
  "#1a73e8",
  "#e8710a",
  "#0d652d",
  "#a142f4",
  "#d93025",
  "#007b83",
  "#c5221f",
  "#1e8e3e",
  "#9334e6",
  "#e37400",
];

// eslint-disable-next-line react-refresh/only-export-components
export function getProjectColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
  }
  return PROJECT_COLORS[Math.abs(hash) % PROJECT_COLORS.length];
}

// eslint-disable-next-line react-refresh/only-export-components
export function formatDurationDecimal(minutes: number): string {
  const hours = minutes / 60;
  if (hours % 1 === 0) return `${hours}h`;
  return `${parseFloat(hours.toFixed(2))}h`;
}

export function IssueBadge({ issueId, redmineUrl }: { issueId: number; redmineUrl: string }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  return (
    <div className="de-card__id-badge" onClick={(e) => e.stopPropagation()}>
      <a
        href={`${redmineUrl}/issues/${issueId}`}
        target="_blank"
        rel="noopener noreferrer"
        className="de-card__badge-link"
        title={`Open #${issueId} in Redmine`}
      >
        #{issueId}
      </a>
      <span className="de-card__badge-divider" />
      <button
        className={`de-card__badge-copy${copied ? " de-card__badge-copy--copied" : ""}`}
        onClick={(e) => {
          e.stopPropagation();
          navigator.clipboard
            .writeText(`#${issueId}`)
            .then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            })
            .catch((e) => logger.warn("Clipboard write failed", { error: e }));
        }}
        aria-label={`Copy #${issueId}`}
        title={t.copyId(issueId)}
      >
        {copied ? (
          <Check style={{ width: 10, height: 10 }} strokeWidth={3} />
        ) : (
          <Copy style={{ width: 10, height: 10 }} />
        )}
      </button>
    </div>
  );
}

interface Props {
  entry: TEntry;
  selected: boolean;
  syncing: boolean;
  activities: RedmineActivity[];
  redmineUrl: string;
  onToggleSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onIncrease: () => void;
  onDecrease: () => void;
}

export function DayDetailEntry({
  entry,
  selected,
  syncing,
  activities,
  redmineUrl,
  onToggleSelect,
  onEdit,
  onDelete,
  onIncrease,
  onDecrease,
}: Props) {
  const { t } = useI18n();
  const isUnsynced = !entry.syncedToRedmine;
  const atMin = entry.duration <= DURATION_MIN_MINUTES;
  const activityName = entry.activityId
    ? activities.find((a) => a.id === entry.activityId)?.name
    : undefined;

  return (
    <div
      className={`de-card${selected ? " de-card--selected" : ""}${!isUnsynced ? " de-card--disabled" : ""}`}
      style={{ opacity: syncing ? 0.6 : 1 }}
    >
      <div className="de-card__row1">
        <div
          className="de-card__project-bar"
          style={{ backgroundColor: getProjectColor(entry.projectName) }}
        />
        {isUnsynced && (
          <div
            className={`de-checkbox${selected ? " de-checkbox--checked" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect();
            }}
            role="checkbox"
            aria-checked={selected}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === " " || e.key === "Enter") {
                e.preventDefault();
                onToggleSelect();
              }
            }}
          >
            <div className={`de-checkbox__box${selected ? " de-checkbox__box--checked" : ""}`}>
              {selected && <Check style={{ width: 10, height: 10 }} strokeWidth={3} />}
            </div>
          </div>
        )}
        <div className="de-card__body">
          <div className="de-card__title">{entry.issueSubject}</div>
          <div className="de-card__meta">
            <IssueBadge issueId={entry.issueId} redmineUrl={redmineUrl} />
            <span className="de-card__meta-chip de-card__meta-project">{entry.projectName}</span>
            {activityName && (
              <span className="de-card__meta-chip de-card__meta-activity">{activityName}</span>
            )}
          </div>
          {entry.description && <div className="de-card__desc">{entry.description}</div>}
        </div>
        <div className="de-card__trailing" onClick={(e) => e.stopPropagation()}>
          {syncing ? (
            <Loader2 style={{ width: 18, height: 18 }} className="animate-spin" />
          ) : (
            <div className={`de-stepper${!isUnsynced ? " de-stepper--static" : ""}`}>
              {isUnsynced && (
                <button
                  onClick={onDecrease}
                  className="de-stepper__btn"
                  disabled={atMin}
                  aria-label={t.lessTime}
                >
                  <Minus style={{ width: 15, height: 15 }} />
                </button>
              )}
              <span className="de-stepper__value">{formatDurationDecimal(entry.duration)}</span>
              {isUnsynced && (
                <button onClick={onIncrease} className="de-stepper__btn" aria-label={t.moreTime}>
                  <Plus style={{ width: 15, height: 15 }} />
                </button>
              )}
            </div>
          )}
          <div className="de-card__actions">
            {isUnsynced && (
              <button className="de-card__action-btn" onClick={onEdit} aria-label={t.edit}>
                <Pencil style={{ width: 18, height: 18 }} />
              </button>
            )}
            <button
              className="de-card__action-btn de-card__action-btn--danger"
              onClick={onDelete}
              aria-label={t.delete}
            >
              <Trash2 style={{ width: 18, height: 18 }} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
