import { Pin, Star, ExternalLink } from "lucide-react";
import type { RedmineIssue } from "../../types/redmine";
import { useI18n } from "../../i18n/I18nContext";
import { getTimeAgoUnit } from "../../lib/dates";

const PRIORITY_COLORS: Record<string, string> = {
  Urgent: "var(--md-priority-urgent)",
  Immediate: "var(--md-priority-urgent)",
  High: "var(--md-priority-high)",
  Hoch: "var(--md-priority-high)",
  Dringend: "var(--md-priority-urgent)",
  Sofort: "var(--md-priority-urgent)",
  Normal: "var(--md-priority-normal)",
  Low: "var(--md-priority-low)",
  Niedrig: "var(--md-priority-low)",
};

interface Props {
  issue: RedmineIssue;
  isPinned: boolean;
  isAssigned: boolean;
  redmineUrl: string;
  onTogglePin: (issue: RedmineIssue) => void;
  searchQuery?: string;
  toggleLabel?: string;
  isFavorite?: boolean;
  onToggleFavorite?: (issue: RedmineIssue) => void;
  onBookTime?: (issue: RedmineIssue) => void;
  hideProjectName?: boolean;
  hideAssignedHint?: boolean;
  hidePinButton?: boolean;
}

function HighlightText({ text, query }: { text: string; query?: string }) {
  if (!query || query.trim().length < 2) return <>{text}</>;
  if (/^#?\d+$/.test(query.trim())) return <>{text}</>;

  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escaped})`, "gi");
  const parts = text.split(regex);
  if (parts.length === 1) return <>{text}</>;

  const lowerQuery = query.trim().toLowerCase();

  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === lowerQuery ? (
          <mark key={i} className="search-highlight">
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </>
  );
}

function TimeAgo({ isoDate }: { isoDate: string }) {
  const { t } = useI18n();
  const result = getTimeAgoUnit(isoDate);
  if (!result) return <>{t.justNow}</>;
  return <>{t.timeAgo(result.value, result.unit)}</>;
}

export function SearchResultCard({
  issue,
  isPinned,
  isAssigned,
  redmineUrl,
  onTogglePin,
  searchQuery,
  toggleLabel,
  isFavorite,
  onToggleFavorite,
  onBookTime,
  hideProjectName,
  hideAssignedHint,
  hidePinButton,
}: Props) {
  const { t } = useI18n();
  const priorityColor = PRIORITY_COLORS[issue.priority.name] || "var(--md-priority-normal)";

  const handleCardClick = () => {
    onBookTime?.(issue);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onBookTime?.(issue);
    }
  };

  return (
    <div
      className={`search-result-card${isPinned ? " search-result-card--pinned" : ""}${hidePinButton ? " search-result-card--no-pin" : ""}`}
      role="button"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
    >
      {!hidePinButton && (
        <button
          type="button"
          className={`search-result-card__pin-btn${isPinned ? " search-result-card__pin-btn--active" : ""}`}
          aria-label={toggleLabel ?? (isPinned ? t.unpinIssue(issue.id) : t.pinIssue(issue.id))}
          aria-pressed={isPinned}
          onClick={(e) => {
            e.stopPropagation();
            onTogglePin(issue);
          }}
        >
          <Pin size={15} fill={isPinned ? "currentColor" : "none"} />
        </button>
      )}

      <div className="search-result-card__body">
        <div className="search-result-card__title">
          <span className="search-result-card__id">#{issue.id}</span>{" "}
          <HighlightText text={issue.subject} query={searchQuery} />
        </div>
        <div className="search-result-card__meta">
          <span className="search-result-card__meta-dot" style={{ background: priorityColor }} />
          {!hideProjectName && (
            <>
              <span>
                <HighlightText text={issue.project.name} query={searchQuery} />
              </span>
              <span className="search-result-card__sep" aria-hidden="true">
                ·
              </span>
            </>
          )}
          <span>{issue.tracker.name}</span>
          <span className="search-result-card__sep" aria-hidden="true">
            ·
          </span>
          <span>{issue.status.name}</span>
          {issue.updated_on && (
            <>
              <span className="search-result-card__sep" aria-hidden="true">
                ·
              </span>
              <span className="search-result-card__time-ago">
                <TimeAgo isoDate={issue.updated_on} />
              </span>
            </>
          )}
          {isAssigned && !hideAssignedHint && (
            <>
              <span className="search-result-card__sep" aria-hidden="true">
                ·
              </span>
              <span className="search-result-card__assigned">{t.alreadyAssigned}</span>
            </>
          )}
        </div>
      </div>

      <div className="search-result-card__actions">
        {onToggleFavorite && (
          <button
            type="button"
            className={`search-result-card__action-btn search-result-card__fav-btn${isFavorite ? " search-result-card__fav-btn--active" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(issue);
            }}
            aria-label={isFavorite ? t.unfavoriteIssue(issue.id) : t.favoriteIssue(issue.id)}
            title={isFavorite ? t.unfavoriteIssue(issue.id) : t.favoriteIssue(issue.id)}
          >
            <Star size={15} fill={isFavorite ? "currentColor" : "none"} />
          </button>
        )}
        <a
          href={`${redmineUrl}/issues/${issue.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="search-result-card__action-btn search-result-card__link-btn"
          aria-label={t.openInRedmine(issue.id)}
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink size={14} />
        </a>
      </div>
    </div>
  );
}
