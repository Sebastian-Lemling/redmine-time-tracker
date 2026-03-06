import { useState, useMemo, useRef, useEffect } from "react";
import { ChevronRight, CalendarDays } from "lucide-react";
import type { RedmineIssue, RedmineJournal } from "../../types/redmine";
import Markdown from "react-markdown";
import { useI18n } from "../../i18n/I18nContext";

interface Props {
  issue: RedmineIssue;
  issueDescription?: string;
  issueComments?: RedmineJournal[];
  onFetchIssueDescription: (issueId: number) => void;
}

function DueDateBadge({ dueDate }: { dueDate: string }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate + "T00:00:00");
  const overdue = due < today;
  const dd = String(due.getDate()).padStart(2, "0");
  const mm = String(due.getMonth() + 1).padStart(2, "0");

  return (
    <span className={`ticket-due${overdue ? " ticket-due--overdue" : ""}`}>
      <CalendarDays size={13} strokeWidth={2} />
      {dd}.{mm}.
    </span>
  );
}

export function TicketCardDescription({
  issue,
  issueDescription,
  issueComments,
  onFetchIssueDescription,
}: Props) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const [descLoading, setDescLoading] = useState(false);
  const loadStartRef = useRef(0);

  const renderedDescription = useMemo(
    () => (issueDescription ? <Markdown>{issueDescription}</Markdown> : null),
    [issueDescription],
  );

  useEffect(() => {
    if (!descLoading) return;
    if (issueDescription === undefined) return;
    const elapsed = Date.now() - loadStartRef.current;
    const remaining = Math.max(0, 1200 - elapsed);
    const timer = setTimeout(() => {
      setDescLoading(false);
      setExpanded(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setShowContent(true));
      });
    }, remaining);
    return () => clearTimeout(timer);
  }, [descLoading, issueDescription]);

  const handleToggle = () => {
    if (expanded) {
      setExpanded(false);
      setShowContent(false);
      return;
    }
    if (issueDescription !== undefined) {
      setExpanded(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setShowContent(true));
      });
    } else {
      loadStartRef.current = Date.now();
      setDescLoading(true);
      onFetchIssueDescription(issue.id);
    }
  };

  return (
    <div className="card-body">
      <button
        type="button"
        className="card-body__subject-row"
        onClick={handleToggle}
        title={issue.subject}
      >
        <ChevronRight
          size={16}
          className={`card-body__expand-icon${expanded ? " card-body__expand-icon--open" : ""}`}
        />
        <span className="md-title-medium text-on-surface truncate">{issue.subject}</span>
      </button>

      {descLoading && (
        <div className="card-body__loading-track">
          <div className="card-body__loading-fill" />
        </div>
      )}

      <div className={`card-body__description${expanded ? " card-body__description--open" : ""}`}>
        {showContent && renderedDescription ? (
          <div className="card-body__markdown animate-fade-in">{renderedDescription}</div>
        ) : showContent && expanded ? (
          <p
            className="md-body-medium animate-fade-in"
            style={{ color: "var(--color-on-surface-variant)", fontStyle: "italic" }}
          >
            {t.noDescription}
          </p>
        ) : expanded ? (
          <div style={{ minHeight: 24 }} />
        ) : null}

        {showContent && issueComments && issueComments.length > 0 && (
          <div className="card-body__comments animate-fade-in">
            <span className="card-body__comments-title">
              {t.comments} ({issueComments.length})
            </span>
            {issueComments.map((journal) => (
              <div key={journal.id} className="card-body__comment">
                <div className="card-body__comment-header">
                  <span className="card-body__comment-author">{journal.user.name}</span>
                  <span className="card-body__comment-date">
                    {new Date(journal.created_on).toLocaleDateString(undefined, {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <div className="card-body__comment-body card-body__markdown">
                  <Markdown>{journal.notes}</Markdown>
                </div>
              </div>
            ))}
          </div>
        )}
        {showContent && issueComments && issueComments.length === 0 && (
          <div className="card-body__comments animate-fade-in">
            <span className="card-body__comments-title card-body__comments-title--empty">
              {t.noComments}
            </span>
          </div>
        )}
      </div>

      {issue.due_date && (
        <div className="mt-2 flex items-center gap-3">
          <DueDateBadge dueDate={issue.due_date} />
        </div>
      )}
    </div>
  );
}
