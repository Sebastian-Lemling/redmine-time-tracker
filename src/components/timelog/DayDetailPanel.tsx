import { useState, useMemo, useContext } from "react";
import { Check, Loader2, Minus, Clock } from "lucide-react";
import type {
  TimeLogEntry as TEntry,
  RedmineActivity,
  RedmineTimeEntry,
  RedmineIssue,
} from "../../types/redmine";
import { DURATION_STEP_MINUTES, DURATION_MIN_MINUTES } from "../../lib/timeConfig";
import {
  DayDetailEntry,
  IssueBadge,
  formatDurationDecimal,
  getProjectColor,
} from "./DayDetailEntry";
import { useI18n } from "../../i18n/I18nContext";
import { AppContext } from "../../AppContext";

interface Props {
  selectedDate: string;
  activeTab: string;
  unsyncedEntries: TEntry[];
  remoteDayEntries: RedmineTimeEntry[];
  unsyncedMinutes: number;
  syncedMinutes: number;
  selectedDayMinutes: number;
  remoteLoading: boolean;
  activities: RedmineActivity[];
  activitiesByProject: Record<number, RedmineActivity[]>;
  issues: RedmineIssue[];
  issueSubjects: Record<number, string>;
  redmineUrl: string;
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  onNavigateTab: (day: number, tab: "unsynced" | "synced") => void;
  onEdit: (entry: TEntry) => void;
  onDelete: (id: string) => void;
  onUpdateDuration: (id: string, newDuration: number) => void;
}

export function DayDetailPanel({
  selectedDate,
  activeTab,
  unsyncedEntries,
  remoteDayEntries,
  unsyncedMinutes,
  syncedMinutes,
  selectedDayMinutes,
  remoteLoading,
  activities,
  activitiesByProject,
  issues,
  issueSubjects,
  redmineUrl,
  selectedIds,
  onSelectionChange,
  onNavigateTab,
  onEdit,
  onDelete,
  onUpdateDuration,
}: Props) {
  const { t } = useI18n();
  const appCtx = useContext(AppContext);
  const instances = appCtx?.instances;
  const instanceColorMap = appCtx?.instanceColorMap ?? {};
  const multiInstance = (instances?.length ?? 0) > 1;
  const getColor = (instanceId: string | undefined, projectName: string) =>
    instanceId && instanceColorMap[instanceId]
      ? instanceColorMap[instanceId]
      : getProjectColor(projectName);
  const instanceNameMap = useMemo(() => {
    if (!multiInstance || !instances) return null;
    return new Map(instances.map((inst) => [inst.id, inst.name]));
  }, [instances, multiInstance]);

  const setSelectedIds = onSelectionChange;
  const [syncingIds] = useState<Set<string>>(new Set());

  const dayNum = new Date(selectedDate + "T00:00:00").getDate();
  const formatDetailDateLabel = (dateStr: string): string => {
    const d = new Date(dateStr + "T00:00:00");
    return `${t.weekdays[d.getDay()]}, ${d.getDate()}. ${t.months[d.getMonth()]}`;
  };

  const getEntryActivities = (entry: TEntry): RedmineActivity[] => {
    const pid = entry.projectId;
    if (pid && activitiesByProject[pid]?.length) return activitiesByProject[pid];
    return activities;
  };

  const getIssueSubject = (issueId: number): string => {
    const issue = issues.find((i) => i.id === issueId);
    if (issue) return issue.subject;
    return issueSubjects[issueId] || `#${issueId}`;
  };

  const groupedUnsyncedEntries = useMemo(() => {
    if (!multiInstance) return [{ instanceId: "default", name: null, entries: unsyncedEntries }];
    const map = new Map<string, TEntry[]>();
    for (const e of unsyncedEntries) {
      const key = e.instanceId || "default";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    const order = instances?.map((i) => i.id) ?? [...map.keys()];
    return order
      .filter((id) => map.has(id))
      .map((id) => ({
        instanceId: id,
        name: instanceNameMap?.get(id) ?? id,
        entries: map.get(id)!,
      }));
  }, [unsyncedEntries, multiInstance, instances, instanceNameMap]);

  const groupedRemoteEntries = useMemo(() => {
    if (!multiInstance) return [{ instanceId: "default", name: null, entries: remoteDayEntries }];
    const map = new Map<string, RedmineTimeEntry[]>();
    for (const re of remoteDayEntries) {
      const key = re.instanceId || "default";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(re);
    }
    const order = instances?.map((i) => i.id) ?? [...map.keys()];
    return order
      .filter((id) => map.has(id))
      .map((id) => ({
        instanceId: id,
        name: instanceNameMap?.get(id) ?? id,
        entries: map.get(id)!,
      }));
  }, [remoteDayEntries, multiInstance, instances, instanceNameMap]);

  return (
    <div className="de-panel">
      <div className="de-panel__header">
        <div className="de-panel__header-top">
          <div className="de-panel__title">{formatDetailDateLabel(selectedDate)}</div>
          {selectedDayMinutes > 0 && (
            <span className="de-panel__total">{formatDurationDecimal(selectedDayMinutes)}</span>
          )}
        </div>

        {selectedDayMinutes > 0 && (unsyncedMinutes > 0 || syncedMinutes > 0) && (
          <div className="de-panel__summary">
            <div className="de-panel__summary-bar">
              {syncedMinutes > 0 && (
                <div
                  className="de-panel__summary-bar-synced"
                  style={{ width: `${(syncedMinutes / selectedDayMinutes) * 100}%` }}
                />
              )}
              {unsyncedMinutes > 0 && (
                <div
                  className="de-panel__summary-bar-draft"
                  style={{ width: `${(unsyncedMinutes / selectedDayMinutes) * 100}%` }}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {(unsyncedEntries.length > 0 || remoteDayEntries.length > 0) && (
        <div className="de-tabs" role="tablist">
          <button
            role="tab"
            aria-selected={activeTab === "unsynced"}
            className={`de-tab${activeTab === "unsynced" ? " de-tab--active" : ""}`}
            onClick={() => {
              onNavigateTab(dayNum, "unsynced");
              setSelectedIds(new Set());
            }}
          >
            {t.openTab}
            {unsyncedEntries.length > 0 && ` (${unsyncedEntries.length})`}
          </button>
          <button
            role="tab"
            aria-selected={activeTab === "synced"}
            className={`de-tab${activeTab === "synced" ? " de-tab--active" : ""}`}
            onClick={() => {
              onNavigateTab(dayNum, "synced");
              setSelectedIds(new Set());
            }}
          >
            {t.syncedTab}
            {remoteDayEntries.length > 0 && ` (${remoteDayEntries.length})`}
            {remoteLoading && (
              <Loader2 style={{ width: 14, height: 14, marginLeft: 4 }} className="animate-spin" />
            )}
          </button>
        </div>
      )}

      <div className="de-panel__scroll">
        {unsyncedEntries.length > 0 || remoteDayEntries.length > 0 ? (
          <>
            {activeTab === "unsynced" && (
              <div className="de-section">
                {unsyncedEntries.length > 0 ? (
                  <>
                    <div className="de-toolbar" role="toolbar">
                      <div className="de-toolbar__left">
                        <div
                          className={`de-checkbox${selectedIds.size === unsyncedEntries.length ? " de-checkbox--checked" : ""}`}
                          onClick={() => {
                            if (selectedIds.size === unsyncedEntries.length)
                              setSelectedIds(new Set());
                            else setSelectedIds(new Set(unsyncedEntries.map((e) => e.id)));
                          }}
                          role="checkbox"
                          aria-checked={selectedIds.size === unsyncedEntries.length}
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === " " || e.key === "Enter") {
                              e.preventDefault();
                              if (selectedIds.size === unsyncedEntries.length)
                                setSelectedIds(new Set());
                              else setSelectedIds(new Set(unsyncedEntries.map((en) => en.id)));
                            }
                          }}
                        >
                          <div
                            className={`de-checkbox__box${selectedIds.size === unsyncedEntries.length ? " de-checkbox__box--checked" : selectedIds.size > 0 ? " de-checkbox__box--indeterminate" : ""}`}
                          >
                            {selectedIds.size === unsyncedEntries.length && (
                              <Check style={{ width: 10, height: 10 }} strokeWidth={3} />
                            )}
                            {selectedIds.size > 0 && selectedIds.size < unsyncedEntries.length && (
                              <Minus style={{ width: 10, height: 10 }} strokeWidth={3} />
                            )}
                          </div>
                        </div>
                        <span className="de-toolbar__label">
                          {selectedIds.size > 0 ? t.selected(selectedIds.size) : t.selectAll}
                        </span>
                      </div>
                    </div>
                    <div className="de-groups">
                      {groupedUnsyncedEntries.map((group) => (
                        <div key={group.instanceId} className="de-group">
                          {group.name && (
                            <div className="de-group__header">
                              <span
                                className="de-group__header-dot"
                                style={{ backgroundColor: instanceColorMap[group.instanceId] }}
                              />
                              <span>{group.name}</span>
                            </div>
                          )}
                          {group.entries.map((entry) => (
                            <DayDetailEntry
                              key={entry.id}
                              entry={entry}
                              selected={selectedIds.has(entry.id)}
                              syncing={syncingIds.has(entry.id)}
                              activities={getEntryActivities(entry)}
                              redmineUrl={redmineUrl}
                              instanceName={instanceNameMap?.get(entry.instanceId)}
                              instanceColor={
                                multiInstance ? instanceColorMap[entry.instanceId] : undefined
                              }
                              onToggleSelect={() => {
                                const n = new Set(selectedIds);
                                if (n.has(entry.id)) n.delete(entry.id);
                                else n.add(entry.id);
                                setSelectedIds(n);
                              }}
                              onEdit={() => onEdit(entry)}
                              onDelete={() => onDelete(entry.id)}
                              onIncrease={() =>
                                onUpdateDuration(entry.id, entry.duration + DURATION_STEP_MINUTES)
                              }
                              onDecrease={() =>
                                onUpdateDuration(
                                  entry.id,
                                  Math.max(
                                    DURATION_MIN_MINUTES,
                                    entry.duration - DURATION_STEP_MINUTES,
                                  ),
                                )
                              }
                            />
                          ))}
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="de-empty">
                    <Check className="de-empty__icon" />
                    <div className="de-empty__title">{t.allSynced}</div>
                    <div className="de-empty__text">{t.noOpenEntries}</div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "synced" && (
              <div className="de-section">
                {remoteLoading ? (
                  <div className="de-empty">
                    <Loader2 className="de-empty__icon animate-spin" />
                    <div className="de-empty__title">{t.loadingRemote}</div>
                  </div>
                ) : remoteDayEntries.length > 0 ? (
                  <div className="de-groups">
                    {groupedRemoteEntries.map((group) => (
                      <div key={group.instanceId} className="de-group de-group--disabled">
                        {group.name && (
                          <div className="de-group__header">
                            <span
                              className="de-group__header-dot"
                              style={{ backgroundColor: instanceColorMap[group.instanceId] }}
                            />
                            <span>{group.name}</span>
                          </div>
                        )}
                        {group.entries.map((re) => (
                          <div key={re.id} className="de-card de-card--disabled">
                            <div className="de-card__row1">
                              <div
                                className="de-card__project-bar"
                                style={{
                                  backgroundColor: multiInstance
                                    ? getColor(re.instanceId, re.project.name)
                                    : getProjectColor(re.project.name),
                                }}
                              />
                              <div className="de-card__body">
                                <div className="de-card__title">
                                  {re.issue ? getIssueSubject(re.issue.id) : re.project.name}
                                </div>
                                <div className="de-card__meta">
                                  {re.issue && (
                                    <IssueBadge issueId={re.issue.id} redmineUrl={redmineUrl} />
                                  )}
                                  {multiInstance && re.instanceName && (
                                    <span
                                      className="de-card__meta-chip de-card__meta-instance"
                                      style={{
                                        backgroundColor: `color-mix(in srgb, ${getColor(re.instanceId, re.project.name)} 60%, transparent)`,
                                      }}
                                    >
                                      {re.instanceName}
                                    </span>
                                  )}
                                  <span className="de-card__meta-chip de-card__meta-project">
                                    {re.project.name}
                                  </span>
                                  <span className="de-card__meta-chip de-card__meta-activity">
                                    {re.activity.name}
                                  </span>
                                </div>
                                {re.comments && <div className="de-card__desc">{re.comments}</div>}
                              </div>
                              <div className="de-card__trailing">
                                <span className="de-card__duration">
                                  {formatDurationDecimal(Math.round(re.hours * 60))}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="de-empty">
                    <Clock className="de-empty__icon" />
                    <div className="de-empty__title">{t.nothingSyncedYet}</div>
                    <div className="de-empty__text">{t.syncedEntriesAppearHere}</div>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="de-empty">
            <Clock className="de-empty__icon" />
            <div className="de-empty__title">{t.noEntriesToday}</div>
            <div className="de-empty__text">{t.noTimeTracked}</div>
          </div>
        )}
      </div>
    </div>
  );
}
