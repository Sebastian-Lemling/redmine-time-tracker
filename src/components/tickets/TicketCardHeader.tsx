import { useState } from "react";
import { Copy, Check, Pin } from "lucide-react";
import type {
  RedmineIssue,
  RedmineStatus,
  RedmineTracker,
  RedmineMember,
  RedmineVersion,
} from "../../types/redmine";
import { ChipMenu } from "../ui/ChipMenu";
import { useI18n } from "../../i18n/I18nContext";
import { logger } from "../../lib/logger";

interface Props {
  issue: RedmineIssue;
  redmineUrl: string;
  trackers: RedmineTracker[];
  statuses: RedmineStatus[];
  allowedStatuses?: RedmineStatus[];
  projectVersions: RedmineVersion[];
  projectMembers: RedmineMember[];
  onTrackerChange: (issueId: number, trackerId: number) => void;
  onStatusChange: (issueId: number, statusId: number) => void;
  onVersionChange: (issueId: number, versionId: number) => void;
  onDoneRatioChange: (issueId: number, doneRatio: number) => void;
  onAssigneeChange: (issueId: number, assigneeId: number) => void;
  onFetchAllowedStatuses: (issueId: number) => void;
  onFetchMembers: (projectId: number) => void;
  projectColor?: string;
  isPinned?: boolean;
  onTogglePin?: (issue: RedmineIssue) => void;
}

export function TicketCardHeader({
  issue,
  redmineUrl,
  trackers,
  statuses,
  allowedStatuses,
  projectVersions,
  projectMembers,
  onTrackerChange,
  onStatusChange,
  onVersionChange,
  onDoneRatioChange,
  onAssigneeChange,
  onFetchAllowedStatuses,
  onFetchMembers,
  projectColor,
  isPinned,
  onTogglePin,
}: Props) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const doneRatio = issue.done_ratio ?? 0;

  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(`#${issue.id}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      logger.warn("Clipboard write failed", { error: e });
    }
  };

  return (
    <div className="card-header">
      <div className="card-header__leading">
        <div className="card-header__id-badge">
          <span className="card-header__badge-dot" style={{ background: projectColor }} />
          {redmineUrl ? (
            <a
              href={`${redmineUrl}/issues/${issue.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="card-header__badge-label"
              title={`Open #${issue.id} in Redmine`}
            >
              #{issue.id}
            </a>
          ) : (
            <span className="card-header__badge-label">#{issue.id}</span>
          )}
          <span className="card-header__badge-divider" />
          <button
            onClick={handleCopyId}
            className={`card-header__badge-copy${copied ? " card-header__badge-copy--copied" : ""}`}
            aria-label={`Copy #${issue.id} to clipboard`}
            title={copied ? t.copied : t.copyId(issue.id)}
          >
            {copied ? (
              <Check size={14} strokeWidth={1.75} />
            ) : (
              <Copy size={14} strokeWidth={1.75} />
            )}
          </button>
        </div>
      </div>

      <div className="card-header__center">
        <ChipMenu
          currentId={issue.tracker.id}
          currentLabel={issue.tracker.name}
          items={trackers.map((tr) => ({ id: tr.id, label: tr.name }))}
          onSelect={(id) => onTrackerChange(issue.id, id)}
          ariaLabel="Tracker"
        />
        <ChipMenu
          currentId={issue.status.id}
          currentLabel={issue.status.name}
          items={(() => {
            if (allowedStatuses && allowedStatuses.length > 0) {
              const ids = new Set(allowedStatuses.map((s) => s.id));
              const items = [...allowedStatuses];
              if (!ids.has(issue.status.id))
                items.unshift({ id: issue.status.id, name: issue.status.name, is_closed: false });
              return items.map((s) => ({ id: s.id, label: s.name }));
            }
            return statuses.map((s) => ({ id: s.id, label: s.name }));
          })()}
          onSelect={(id) => onStatusChange(issue.id, id)}
          onOpen={() => onFetchAllowedStatuses(issue.id)}
          ariaLabel="Status"
        />
        {(projectVersions.length > 0 || issue.fixed_version) && (
          <ChipMenu
            currentId={issue.fixed_version?.id}
            currentLabel={issue.fixed_version?.name || t.noVersion}
            items={projectVersions.map((v) => ({ id: v.id, label: v.name }))}
            onSelect={(id) => onVersionChange(issue.id, id)}
            ariaLabel="Version"
            emptyStyle={!issue.fixed_version}
          />
        )}
        <ChipMenu
          currentId={issue.assigned_to?.id}
          currentLabel={issue.assigned_to?.name || t.notAssigned}
          items={projectMembers.map((m) => ({ id: m.id, label: m.name }))}
          onSelect={(id) => onAssigneeChange(issue.id, id)}
          onOpen={() => onFetchMembers(issue.project.id)}
          ariaLabel={t.assignPerson}
          emptyStyle={!issue.assigned_to}
          searchable
        />
        <ChipMenu
          currentId={doneRatio}
          currentLabel={`${doneRatio}%`}
          items={[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((v) => ({
            id: v,
            label: `${v}%`,
          }))}
          onSelect={(v) => onDoneRatioChange(issue.id, v)}
          ariaLabel="Progress"
        />
      </div>

      <div className="card-header__trailing">
        {onTogglePin && (
          <button
            className={`card-header__pin-btn${isPinned ? "" : " card-header__pin-btn--ghost"}`}
            onClick={() => onTogglePin(issue)}
            aria-label={isPinned ? t.unpinIssue(issue.id) : t.pinIssue(issue.id)}
            title={isPinned ? t.unpinIssue(issue.id) : t.pinIssue(issue.id)}
            type="button"
          >
            <svg width={32} height={32} viewBox="0 0 32 32" className="card-header__pin-ring">
              <circle
                cx={16}
                cy={16}
                r={14.25}
                fill="none"
                stroke="color-mix(in srgb, var(--color-primary) 25%, transparent)"
                strokeWidth={2.5}
              />
              {isPinned && (
                <circle
                  cx={16}
                  cy={16}
                  r={14.25}
                  fill="none"
                  stroke="var(--color-primary)"
                  strokeWidth={2.5}
                  strokeDasharray={`${2 * Math.PI * 14.25}`}
                  strokeDashoffset="0"
                  strokeLinecap="round"
                  transform="rotate(-90 16 16)"
                />
              )}
            </svg>
            <span className="card-header__pin-icon">
              <Pin size={14} strokeWidth={1.75} />
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
