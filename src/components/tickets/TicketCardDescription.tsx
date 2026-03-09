import { CalendarDays, MessageSquare } from "lucide-react";
import type { RedmineIssue, RedmineJournal } from "../../types/redmine";
import { useI18n } from "../../i18n/I18nContext";

interface Props {
  issue: RedmineIssue;
  issueComments?: RedmineJournal[];
  onOpenConversation?: (issueId: number, tab?: "description" | "comments") => void;
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

export function TicketCardDescription({ issue, issueComments, onOpenConversation }: Props) {
  const { t } = useI18n();
  const commentCount = issueComments?.filter((j) => j.notes?.trim()).length ?? 0;

  return (
    <div className="card-body">
      <div className="card-body__subject-row">
        <span
          className={`md-title-medium text-on-surface truncate${onOpenConversation ? " card-body__subject--clickable" : ""}`}
          role={onOpenConversation ? "button" : undefined}
          tabIndex={onOpenConversation ? 0 : undefined}
          onClick={
            onOpenConversation ? () => onOpenConversation(issue.id, "description") : undefined
          }
          onKeyDown={
            onOpenConversation
              ? (e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onOpenConversation(issue.id, "description");
                  }
                }
              : undefined
          }
        >
          {issue.subject}
        </span>
        {onOpenConversation && (
          <div className="card-body__actions">
            <button
              type="button"
              className="card-body__action-btn"
              onClick={() => onOpenConversation(issue.id, "comments")}
              title={t.comments}
            >
              <MessageSquare size={13} />
              {commentCount > 0 && <span className="card-body__action-badge">{commentCount}</span>}
            </button>
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
