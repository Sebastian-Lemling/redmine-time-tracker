import { Star, Plus } from "lucide-react";
import type { RedmineIssue } from "../../types/redmine";
import { useI18n } from "../../i18n/I18nContext";

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
}

function HighlightText({ text, query }: { text: string; query?: string }) {
  if (!query || query.trim().length < 2) return <>{text}</>;

  // Skip highlighting for ID searches (#123 or 123)
  if (/^#?\d+$/.test(query.trim())) return <>{text}</>;

  // Escape regex special chars
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
}: Props) {
  const { t } = useI18n();
  const priorityColor = PRIORITY_COLORS[issue.priority.name] || "var(--md-priority-normal)";

  return (
    <div className={`search-result-card${isPinned ? " search-result-card--pinned" : ""}`}>
      <input
        type="checkbox"
        className="search-result-card__checkbox"
        checked={isPinned}
        aria-label={toggleLabel ?? (isPinned ? t.unpinIssue(issue.id) : t.pinIssue(issue.id))}
        title={isAssigned ? t.alreadyAssigned : undefined}
        onChange={(e) => {
          e.stopPropagation();
          onTogglePin(issue);
        }}
      />
      <a
        href={`${redmineUrl}/issues/${issue.id}`}
        target="_blank"
        rel="noopener noreferrer"
        className="search-result-card__body"
        style={{ textDecoration: "none" }}
      >
        <div className="search-result-card__title">
          <strong>#{issue.id}</strong> <HighlightText text={issue.subject} query={searchQuery} />
        </div>
        <div className="search-result-card__meta">
          <span className="search-result-card__meta-dot" style={{ background: priorityColor }} />
          <span>
            <HighlightText text={issue.project.name} query={searchQuery} />
          </span>
          <span>·</span>
          <span>{issue.status.name}</span>
        </div>
        {isAssigned && <div className="search-result-card__hint">{t.alreadyAssigned}</div>}
      </a>
      {onBookTime && (
        <button
          className="search-result-card__book-btn"
          onClick={(e) => {
            e.stopPropagation();
            onBookTime(issue);
          }}
          aria-label={t.bookManually}
          title={t.bookManually}
          type="button"
        >
          <Plus size={14} />
        </button>
      )}
      {onToggleFavorite && (
        <button
          className={`search-result-card__fav-btn${isFavorite ? " search-result-card__fav-btn--active" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(issue);
          }}
          aria-label={isFavorite ? t.unfavoriteIssue(issue.id) : t.favoriteIssue(issue.id)}
          title={isFavorite ? t.unfavoriteIssue(issue.id) : t.favoriteIssue(issue.id)}
          type="button"
        >
          <Star size={14} fill={isFavorite ? "currentColor" : "none"} />
        </button>
      )}
    </div>
  );
}
