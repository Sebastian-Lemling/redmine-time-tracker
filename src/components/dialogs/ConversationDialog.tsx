import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  X,
  Pencil,
  Send,
  ExternalLink,
  Loader2,
  Paperclip,
  Download,
  Copy,
  Check,
} from "lucide-react";
import type {
  RedmineIssue,
  RedmineJournal,
  RedmineJournalDetail,
  RedmineAttachment,
} from "../../types/redmine";
import type { Translations } from "../../i18n/translations";
import { useI18n } from "../../i18n/I18nContext";
import { MarkdownEditor, MarkdownViewer } from "../ui";
import { getTimeAgoUnit } from "../../lib/dates";
import { ApiError } from "../../lib/errors";

type Tab = "description" | "comments";

const isMac = /Mac|iPhone|iPad/.test(navigator.userAgent);
const modKey = isMac ? "⌘" : "Ctrl";

interface Props {
  instanceId: string;
  issueId: number;
  issueSubject: string;
  issue?: RedmineIssue;
  description: string | undefined;
  comments: RedmineJournal[];
  attachments: RedmineAttachment[];
  redmineUrl: string;
  fieldNameMap?: Record<string, Record<string, string>>;
  initialTab?: Tab;
  currentUserId?: number;
  onUpdateDescription: (issueId: number, desc: string) => Promise<void>;
  onPostComment: (issueId: number, notes: string) => Promise<void>;
  onUpdateComment?: (issueId: number, journalId: number, notes: string) => Promise<void>;
  onRefresh: (issueId: number) => void;
  onClose: () => void;
}

const AVATAR_COLORS = [
  "#1a73e8",
  "#e8710a",
  "#0d652d",
  "#a142f4",
  "#d93025",
  "#007b83",
  "#c6a700",
  "#e91e63",
  "#00897b",
  "#6d4c41",
  "#3f51b5",
  "#ef6c00",
];

function buildColorMap(comments: RedmineJournal[]): Map<number, string> {
  const map = new Map<number, string>();
  let idx = 0;
  for (const j of comments) {
    if (!map.has(j.user.id)) {
      map.set(j.user.id, AVATAR_COLORS[idx % AVATAR_COLORS.length]);
      idx++;
    }
  }
  return map;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

const FIELD_MAP: Record<string, keyof Translations> = {
  status_id: "fieldStatus",
  assigned_to_id: "fieldAssignee",
  priority_id: "fieldPriority",
  done_ratio: "fieldDoneRatio",
  tracker_id: "fieldTracker",
  subject: "fieldSubject",
  fixed_version_id: "fieldVersion",
  category_id: "fieldCategory",
  start_date: "fieldStartDate",
  due_date: "fieldDueDate",
  estimated_hours: "fieldEstimatedHours",
  description: "description",
};

function getFieldLabel(detail: RedmineJournalDetail, t: Translations): string {
  const key = FIELD_MAP[detail.name];
  if (key) return t[key] as string;
  return t.fieldGeneric(detail.name);
}

function formatDetailValue(
  detail: RedmineJournalDetail,
  nameMap?: Record<string, Record<string, string>>,
): string | null {
  const pct = detail.name === "done_ratio";
  const suffix = pct ? "%" : "";
  const lookup = nameMap?.[detail.name];
  const resolve = (v: string) => lookup?.[v] ?? v;
  const oldVal = detail.old_value;
  const newVal = detail.new_value;
  if (!oldVal && !newVal) return null;
  if (!oldVal && newVal) return `→ ${resolve(newVal)}${suffix}`;
  if (oldVal && !newVal) return `${resolve(oldVal)}${suffix} →`;
  return `${resolve(oldVal!)}${suffix} → ${resolve(newVal!)}${suffix}`;
}

function formatRelativeTime(isoDate: string, t: Translations): string {
  const unit = getTimeAgoUnit(isoDate);
  if (!unit) return t.justNow;
  return t.timeAgo(unit.value, unit.unit);
}

function KbdHint({ keys }: { keys: string[] }) {
  return (
    <span className="conv-dialog__kbd-group">
      {keys.map((k, i) => (
        <kbd key={i} className="conv-dialog__kbd">
          {k}
        </kbd>
      ))}
    </span>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function ConversationDialog({
  instanceId,
  issueId,
  issueSubject,
  issue,
  description,
  comments,
  attachments,
  redmineUrl,
  fieldNameMap,
  initialTab = "comments",
  currentUserId,
  onUpdateDescription,
  onPostComment,
  onUpdateComment,
  onRefresh,
  onClose,
}: Props) {
  const { t } = useI18n();
  const baseUrl = `/api/i/${instanceId}`;
  const attachmentMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const a of attachments) {
      map[a.filename] = a.content_url;
    }
    return map;
  }, [attachments]);
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [editingDesc, setEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState(description ?? "");
  const [commentText, setCommentText] = useState("");
  const [sending, setSending] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editCommentDraft, setEditCommentDraft] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const timelineRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const colorMap = useMemo(() => buildColorMap(comments), [comments]);

  const commentCount = useMemo(() => comments.filter((j) => j.notes?.trim()).length, [comments]);

  const loading = description === undefined;
  const [copied, setCopied] = useState(false);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleCopyTicketInfo = useCallback(() => {
    const lines: string[] = [];
    lines.push(`#${issueId} — ${issueSubject}`);
    lines.push(`${redmineUrl}/issues/${issueId}`);
    lines.push("");

    if (issue) {
      lines.push(`${t.fieldStatus}: ${issue.status.name}`);
      lines.push(`${t.fieldPriority}: ${issue.priority.name}`);
      lines.push(`${t.fieldTracker}: ${issue.tracker.name}`);
      lines.push(`${t.fieldAssignee}: ${issue.assigned_to?.name ?? t.notAssigned}`);
      if (issue.fixed_version) lines.push(`${t.fieldVersion}: ${issue.fixed_version.name}`);
      lines.push(`${t.fieldDoneRatio}: ${issue.done_ratio}%`);
      if (issue.due_date) lines.push(`${t.fieldDueDate}: ${formatDate(issue.due_date)}`);
      if (issue.estimated_hours != null)
        lines.push(`${t.fieldEstimatedHours}: ${issue.estimated_hours}h`);
      if (issue.spent_hours != null && issue.spent_hours > 0)
        lines.push(`${t.fieldSpentHours}: ${issue.spent_hours}h`);
      lines.push("");
    }

    if (description) {
      lines.push(`--- ${t.description} ---`);
      lines.push(description);
      lines.push("");
    }

    const notesComments = comments.filter((j) => j.notes?.trim());
    if (notesComments.length > 0) {
      lines.push(`--- ${t.comments} (${notesComments.length}) ---`);
      for (const j of notesComments) {
        lines.push(`[${j.user.name} — ${new Date(j.created_on).toLocaleString()}]`);
        lines.push(j.notes);
        lines.push("");
      }
    }

    navigator.clipboard
      .writeText(lines.join("\n"))
      .then(() => {
        clearTimeout(copiedTimerRef.current);
        setCopied(true);
        copiedTimerRef.current = setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {});
  }, [issueId, issueSubject, redmineUrl, issue, description, comments, t]);

  useEffect(
    () => () => {
      clearTimeout(errorTimerRef.current);
      clearTimeout(copiedTimerRef.current);
    },
    [],
  );

  useEffect(() => {
    if (activeTab === "comments" && timelineRef.current) {
      timelineRef.current.scrollTop = 0;
    }
  }, [activeTab]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (editingCommentId != null) {
          setEditingCommentId(null);
          setEditCommentDraft("");
        } else if (editingDesc) {
          setEditingDesc(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, editingCommentId, editingDesc]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === backdropRef.current) onClose();
    },
    [onClose],
  );

  const showError = useCallback((msg: string) => {
    clearTimeout(errorTimerRef.current);
    setErrorMsg(msg);
    errorTimerRef.current = setTimeout(() => setErrorMsg(null), 6000);
  }, []);

  const getErrorMessage = useCallback(
    (e: unknown, fallback: string): string => {
      if (e instanceof ApiError && e.status === 403) return t.commentEditForbidden;
      return fallback;
    },
    [t],
  );

  const handleSaveDescription = async () => {
    setSending(true);
    setErrorMsg(null);
    try {
      await onUpdateDescription(issueId, descDraft);
      setEditingDesc(false);
      onRefresh(issueId);
    } catch (e) {
      showError(getErrorMessage(e, t.saveFailed));
    } finally {
      setSending(false);
    }
  };

  const handleSendComment = async () => {
    if (!commentText.trim()) return;
    setSending(true);
    setErrorMsg(null);
    try {
      await onPostComment(issueId, commentText.trim());
      setCommentText("");
      onRefresh(issueId);
    } catch (e) {
      showError(getErrorMessage(e, t.saveFailed));
    } finally {
      setSending(false);
    }
  };

  const handleSaveEditedComment = async () => {
    if (editingCommentId == null || !editCommentDraft.trim() || !onUpdateComment) return;
    setSending(true);
    setErrorMsg(null);
    try {
      await onUpdateComment(issueId, editingCommentId, editCommentDraft.trim());
      setEditingCommentId(null);
      setEditCommentDraft("");
      onRefresh(issueId);
    } catch (e) {
      showError(getErrorMessage(e, t.saveFailed));
    } finally {
      setSending(false);
    }
  };

  const makeCtrlEnterHandler =
    (action: () => void, canSubmit: boolean) => (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && canSubmit && !sending) {
        e.preventDefault();
        action();
      }
    };

  return (
    <div className="conv-dialog__backdrop" ref={backdropRef} onClick={handleBackdropClick}>
      <div className="conv-dialog" role="dialog" aria-label={`#${issueId} — ${issueSubject}`}>
        {/* Header */}
        <div className="conv-dialog__header">
          <a
            className="conv-dialog__issue-link"
            href={`${redmineUrl}/issues/${issueId}`}
            target="_blank"
            rel="noopener noreferrer"
            title={t.openInRedmine(issueId)}
          >
            <span className="conv-dialog__issue-id">#{issueId}</span>
            <ExternalLink size={13} className="conv-dialog__issue-link-icon" />
          </a>
          <span className="conv-dialog__header-sep" />
          <span className="conv-dialog__issue-subject">{issueSubject}</span>
          <button type="button" className="conv-dialog__close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="conv-dialog__tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "description"}
            className={`conv-dialog__tab${activeTab === "description" ? " conv-dialog__tab--active" : ""}`}
            onClick={() => setActiveTab("description")}
          >
            {t.description}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "comments"}
            className={`conv-dialog__tab${activeTab === "comments" ? " conv-dialog__tab--active" : ""}`}
            onClick={() => setActiveTab("comments")}
          >
            {t.comments}
            {commentCount > 0 && <span className="conv-dialog__tab-badge">{commentCount}</span>}
          </button>
          <button
            type="button"
            className={`conv-dialog__copy-btn${copied ? " conv-dialog__copy-btn--copied" : ""}`}
            onClick={handleCopyTicketInfo}
            title={t.copyTicketInfo}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
        </div>

        {/* Tab content */}
        <div className="conv-dialog__body">
          {loading ? (
            <div className="conv-dialog__loading">
              <Loader2 size={24} className="animate-spin" />
            </div>
          ) : activeTab === "description" ? (
            <div className="conv-dialog__description">
              {/* Metadata */}
              {issue && (
                <div className="conv-dialog__meta">
                  {/* Primary fields — chips row */}
                  <div className="conv-dialog__meta-chips">
                    <span className="conv-dialog__meta-chip">{issue.tracker.name}</span>
                    <span className="conv-dialog__meta-chip conv-dialog__meta-chip--primary">
                      {issue.status.name}
                    </span>
                    <span className="conv-dialog__meta-chip">{issue.priority.name}</span>
                    {issue.fixed_version && (
                      <span className="conv-dialog__meta-chip">{issue.fixed_version.name}</span>
                    )}
                  </div>

                  {/* Detail grid */}
                  <div className="conv-dialog__meta-grid">
                    <div className="conv-dialog__meta-row">
                      <span className="conv-dialog__meta-label">{t.fieldAssignee}</span>
                      <span className="conv-dialog__meta-value">
                        {issue.assigned_to?.name ?? t.notAssigned}
                      </span>
                    </div>

                    <div className="conv-dialog__meta-row">
                      <span className="conv-dialog__meta-label">{t.fieldDoneRatio}</span>
                      <span className="conv-dialog__meta-value">
                        <span className="conv-dialog__meta-progress">
                          <span
                            className={`conv-dialog__meta-progress-bar${issue.done_ratio === 100 ? " conv-dialog__meta-progress-bar--done" : ""}`}
                            style={{ width: `${issue.done_ratio}%` }}
                          />
                        </span>
                        <span className="conv-dialog__meta-pct">{issue.done_ratio}%</span>
                      </span>
                    </div>

                    {(issue.estimated_hours != null ||
                      (issue.spent_hours != null && issue.spent_hours > 0)) && (
                      <div className="conv-dialog__meta-row">
                        <span className="conv-dialog__meta-label">{t.hours}</span>
                        <span className="conv-dialog__meta-value conv-dialog__meta-value--mono">
                          {issue.spent_hours != null && issue.spent_hours > 0 && (
                            <span>{issue.spent_hours}h</span>
                          )}
                          {issue.spent_hours != null &&
                            issue.spent_hours > 0 &&
                            issue.estimated_hours != null && (
                              <span className="conv-dialog__meta-sep">/</span>
                            )}
                          {issue.estimated_hours != null && (
                            <span className="conv-dialog__meta-est">{issue.estimated_hours}h</span>
                          )}
                        </span>
                      </div>
                    )}

                    {issue.due_date && (
                      <div className="conv-dialog__meta-row">
                        <span className="conv-dialog__meta-label">{t.fieldDueDate}</span>
                        <span
                          className={`conv-dialog__meta-value${new Date(issue.due_date) < new Date() ? " conv-dialog__meta-value--overdue" : ""}`}
                        >
                          {formatDate(issue.due_date)}
                        </span>
                      </div>
                    )}

                    {(issue.created_on || issue.updated_on) && (
                      <div className="conv-dialog__meta-row conv-dialog__meta-row--dates">
                        {issue.created_on && (
                          <span className="conv-dialog__meta-date">
                            {t.fieldCreatedOn} {formatDate(issue.created_on)}
                          </span>
                        )}
                        {issue.updated_on && (
                          <span className="conv-dialog__meta-date">
                            {t.fieldUpdatedOn} {formatDate(issue.updated_on)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Description body */}
              {editingDesc ? (
                <div className="conv-dialog__description-edit">
                  <MarkdownEditor
                    value={descDraft}
                    onChange={setDescDraft}
                    rows={12}
                    autoFocus
                    onKeyDown={makeCtrlEnterHandler(handleSaveDescription, true)}
                    baseUrl={baseUrl}
                    attachmentMap={attachmentMap}
                    redmineUrl={redmineUrl}
                  />
                  <div className="conv-dialog__description-actions">
                    <button
                      type="button"
                      className="conv-dialog__btn conv-dialog__btn--text"
                      onClick={() => setEditingDesc(false)}
                      disabled={sending}
                    >
                      {t.cancelEdit}
                      <KbdHint keys={["Esc"]} />
                    </button>
                    <button
                      type="button"
                      className="conv-dialog__btn conv-dialog__btn--filled"
                      onClick={handleSaveDescription}
                      disabled={sending}
                    >
                      {t.saveDescription}
                      <KbdHint keys={[modKey, "↵"]} />
                    </button>
                  </div>
                </div>
              ) : description ? (
                <div className="conv-dialog__description-body">
                  <button
                    type="button"
                    className="conv-dialog__edit-btn"
                    onClick={() => {
                      setDescDraft(description);
                      setEditingDesc(true);
                    }}
                  >
                    <Pencil size={14} />
                  </button>
                  <MarkdownViewer
                    content={description}
                    baseUrl={baseUrl}
                    attachmentMap={attachmentMap}
                    redmineUrl={redmineUrl}
                  />
                </div>
              ) : (
                <div className="conv-dialog__no-content-wrap">
                  <button
                    type="button"
                    className="conv-dialog__edit-btn"
                    onClick={() => {
                      setDescDraft("");
                      setEditingDesc(true);
                    }}
                  >
                    <Pencil size={14} />
                  </button>
                  <p className="conv-dialog__no-content">{t.noDescription}</p>
                </div>
              )}

              {/* Attachments section */}
              {attachments.length > 0 && (
                <div className="conv-dialog__attachments">
                  <div className="conv-dialog__attachments-header">
                    <Paperclip size={14} />
                    <span>
                      {t.attachments} ({attachments.length})
                    </span>
                  </div>
                  <div className="conv-dialog__attachments-list">
                    {attachments.map((att) => (
                      <a
                        key={att.id}
                        className="conv-dialog__attachment"
                        href={`${baseUrl}/attachments/download/${att.id}/${att.filename}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={att.filename}
                      >
                        <Download size={13} className="conv-dialog__attachment-icon" />
                        <span className="conv-dialog__attachment-name">{att.filename}</span>
                        {att.filesize != null && (
                          <span className="conv-dialog__attachment-size">
                            {formatFileSize(att.filesize)}
                          </span>
                        )}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="conv-dialog__timeline" ref={timelineRef}>
              {comments.length === 0 ? (
                <p className="conv-dialog__no-content">{t.noComments}</p>
              ) : (
                comments.map((journal, idx) => {
                  const hasNotes = !!journal.notes?.trim();
                  const details = (journal.details ?? []).filter((d) => d.property === "attr");
                  const detailsOnly = !hasNotes && details.length > 0;

                  if (detailsOnly) {
                    return (
                      <div key={journal.id} className="conv-comment conv-comment--activity">
                        <div className="conv-comment__activity-line">
                          <span className="conv-comment__activity-author">{journal.user.name}</span>
                          <div className="conv-comment__changes">
                            {details.map((d, i) => {
                              const val = formatDetailValue(d, fieldNameMap);
                              return (
                                <span key={i} className="conv-comment__change-chip">
                                  {getFieldLabel(d, t)}
                                  {val && <span className="conv-comment__change-value">{val}</span>}
                                </span>
                              );
                            })}
                          </div>
                          <span className="conv-comment__time">
                            {formatRelativeTime(journal.created_on, t)}
                          </span>
                        </div>
                      </div>
                    );
                  }

                  const prevWithNotes = comments.slice(0, idx).findLast((j) => !!j.notes?.trim());
                  const grouped = prevWithNotes?.user.id === journal.user.id;

                  const isOwn = currentUserId != null && journal.user.id === currentUserId;
                  const isEditing = editingCommentId === journal.id;

                  return (
                    <div
                      key={journal.id}
                      className={`conv-comment${grouped ? " conv-comment--grouped" : ""}`}
                    >
                      {grouped ? (
                        <div className="conv-comment__avatar-spacer" />
                      ) : (
                        <div
                          className="conv-comment__avatar"
                          style={{ background: colorMap.get(journal.user.id) ?? AVATAR_COLORS[0] }}
                        >
                          {getInitials(journal.user.name)}
                        </div>
                      )}
                      <div className="conv-comment__content">
                        {!grouped && (
                          <div className="conv-comment__header">
                            <span className="conv-comment__author">{journal.user.name}</span>
                            <time
                              className="conv-comment__time"
                              dateTime={journal.created_on}
                              title={new Date(journal.created_on).toLocaleString()}
                            >
                              {formatRelativeTime(journal.created_on, t)}
                            </time>
                          </div>
                        )}
                        {details.length > 0 && (
                          <div className="conv-comment__changes">
                            {details.map((d, i) => {
                              const val = formatDetailValue(d, fieldNameMap);
                              return (
                                <span key={i} className="conv-comment__change-chip">
                                  {getFieldLabel(d, t)}
                                  {val && <span className="conv-comment__change-value">{val}</span>}
                                </span>
                              );
                            })}
                          </div>
                        )}
                        {isEditing ? (
                          <div className="conv-comment__edit-wrap">
                            <MarkdownEditor
                              value={editCommentDraft}
                              onChange={setEditCommentDraft}
                              rows={5}
                              autoFocus
                              onKeyDown={makeCtrlEnterHandler(
                                handleSaveEditedComment,
                                !!editCommentDraft.trim(),
                              )}
                            />
                            <div className="conv-comment__edit-actions">
                              <button
                                type="button"
                                className="conv-dialog__btn conv-dialog__btn--text"
                                onClick={() => {
                                  setEditingCommentId(null);
                                  setEditCommentDraft("");
                                }}
                                disabled={sending}
                              >
                                {t.cancelEdit}
                                <KbdHint keys={["Esc"]} />
                              </button>
                              <button
                                type="button"
                                className="conv-dialog__btn conv-dialog__btn--filled"
                                onClick={handleSaveEditedComment}
                                disabled={sending || !editCommentDraft.trim()}
                              >
                                {t.saveComment}
                                <KbdHint keys={[modKey, "↵"]} />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div
                            className={`conv-comment__body${isOwn && onUpdateComment ? " conv-comment__body--editable" : ""}`}
                          >
                            {isOwn && onUpdateComment && hasNotes && (
                              <button
                                type="button"
                                className="conv-comment__edit-btn"
                                onClick={() => {
                                  setEditingCommentId(journal.id);
                                  setEditCommentDraft(journal.notes ?? "");
                                }}
                                title={t.editComment}
                              >
                                <Pencil size={12} />
                              </button>
                            )}
                            {grouped && (
                              <time
                                className="conv-comment__time conv-comment__time--inline"
                                dateTime={journal.created_on}
                                title={new Date(journal.created_on).toLocaleString()}
                              >
                                {formatRelativeTime(journal.created_on, t)}
                              </time>
                            )}
                            <MarkdownViewer
                              content={journal.notes ?? ""}
                              baseUrl={baseUrl}
                              attachmentMap={attachmentMap}
                              redmineUrl={redmineUrl}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {errorMsg && (
          <div className="conv-dialog__error-toast" role="alert">
            {errorMsg}
          </div>
        )}

        {/* Input — only visible on comments tab */}
        {activeTab === "comments" && !loading && (
          <div className="conv-dialog__input">
            <div className="conv-dialog__input-wrap">
              <MarkdownEditor
                value={commentText}
                onChange={setCommentText}
                placeholder={t.writeComment}
                rows={5}
                onKeyDown={makeCtrlEnterHandler(handleSendComment, !!commentText.trim())}
              />
              <button
                type="button"
                className="conv-dialog__send-btn"
                onClick={handleSendComment}
                disabled={!commentText.trim() || sending}
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
