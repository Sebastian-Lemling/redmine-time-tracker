import { X } from "lucide-react";
import type {
  RedmineStatus,
  RedmineTracker,
  RedmineMember,
  RedmineVersion,
} from "../../types/redmine";
import type { useIssueSearch } from "../../hooks/useIssueSearch";
import { SORT_OPTIONS } from "../../hooks/useIssueSearch";
import { FilterChip } from "./FilterChip";
import { useI18n } from "../../i18n/I18nContext";
import type { Translations } from "../../i18n/translations";

interface Props {
  search: ReturnType<typeof useIssueSearch>;
  statuses: RedmineStatus[];
  trackers: RedmineTracker[];
  membersByProject: Record<number, RedmineMember[]>;
  versionsByProject: Record<number, RedmineVersion[]>;
}

export function FilterChipBar({
  search,
  statuses,
  trackers,
  membersByProject,
  versionsByProject,
}: Props) {
  const { t } = useI18n();
  const selectedProjectId = search.params.project_id;

  const activeFilterCount = [
    search.params.project_id,
    search.params.status_id,
    search.params.tracker_id,
    search.params.assigned_to_id,
    search.params.fixed_version_id,
    search.params.priority_id,
  ].filter(Boolean).length;

  const chipCount = (selectedProjectId ? 7 : 5) + (search.hasActiveFilters ? 1 : 0);
  const filterSizeClass =
    chipCount >= 8
      ? " search-panel__filters--dense"
      : chipCount >= 6
        ? " search-panel__filters--compact"
        : "";

  return (
    <div
      className={`search-panel__filters${filterSizeClass}`}
      role="toolbar"
      aria-label={t.filters}
    >
      <FilterChip
        label={
          selectedProjectId
            ? search.projects.find((p) => p.id === selectedProjectId)?.name || t.project
            : t.allProjectsSearch
        }
        active={!!selectedProjectId}
        options={[
          { label: t.allProjectsSearch, value: undefined },
          ...search.projects.map((p) => ({ label: p.name, value: p.id })),
        ]}
        onSelect={(v) => search.setParam("project_id", v)}
        ariaLabel={t.filterByLabel(t.project)}
      />
      {selectedProjectId && (
        <FilterChip
          label={
            search.params.fixed_version_id
              ? versionsByProject[selectedProjectId]?.find(
                  (v) => v.id === search.params.fixed_version_id,
                )?.name || t.targetVersion
              : t.allVersions
          }
          active={!!search.params.fixed_version_id}
          options={[
            { label: t.allVersions, value: undefined },
            ...(versionsByProject[selectedProjectId] || []).map((v) => ({
              label: v.name,
              value: v.id,
            })),
          ]}
          onSelect={(v) => search.setParam("fixed_version_id", v)}
          ariaLabel={t.filterByLabel(t.targetVersion)}
        />
      )}
      {selectedProjectId && (
        <FilterChip
          label={
            search.params.assigned_to_id
              ? membersByProject[selectedProjectId]?.find(
                  (m) => String(m.id) === search.params.assigned_to_id,
                )?.name || t.assignee
              : t.allAssignees
          }
          active={!!search.params.assigned_to_id}
          options={[
            { label: t.allAssignees, value: undefined },
            ...(membersByProject[selectedProjectId] || []).map((m) => ({
              label: m.name,
              value: String(m.id),
            })),
          ]}
          onSelect={(v) => search.setParam("assigned_to_id", v)}
          ariaLabel={t.filterByLabel(t.assignee)}
        />
      )}
      <FilterChip
        label={
          search.params.status_id
            ? statuses.find((s) => String(s.id) === search.params.status_id)?.name || t.allStatuses
            : t.allStatuses
        }
        active={!!search.params.status_id}
        options={[
          { label: t.allStatuses, value: undefined },
          ...statuses.map((s) => ({ label: s.name, value: String(s.id) })),
        ]}
        onSelect={(v) => search.setParam("status_id", v)}
        ariaLabel={t.filterByLabel("Status")}
      />
      <FilterChip
        label={
          search.params.priority_id
            ? search.priorities.find((p) => p.id === search.params.priority_id)?.name ||
              t.allPriorities
            : t.allPriorities
        }
        active={!!search.params.priority_id}
        options={[
          { label: t.allPriorities, value: undefined },
          ...search.priorities.map((p) => ({ label: p.name, value: p.id })),
        ]}
        onSelect={(v) => search.setParam("priority_id", v)}
        ariaLabel={t.filterByLabel(t.allPriorities)}
      />
      <FilterChip
        label={
          search.params.tracker_id
            ? trackers.find((tr) => tr.id === search.params.tracker_id)?.name || t.allTrackers
            : t.allTrackers
        }
        active={!!search.params.tracker_id}
        options={[
          { label: t.allTrackers, value: undefined },
          ...trackers.map((tr) => ({ label: tr.name, value: tr.id })),
        ]}
        onSelect={(v) => search.setParam("tracker_id", v)}
        ariaLabel={t.filterByLabel("Tracker")}
      />
      <FilterChip
        label={
          t[
            (SORT_OPTIONS.find((o) => o.value === search.params.sort) || SORT_OPTIONS[0])
              .key as keyof Translations
          ] as string
        }
        active={!!search.params.sort && search.params.sort !== "updated_on:desc"}
        options={SORT_OPTIONS.map((o) => ({
          label: t[o.key as keyof Translations] as string,
          value: o.value,
        }))}
        onSelect={(v) => search.setParam("sort", v)}
        ariaLabel={t.sortBy}
      />
      {search.hasActiveFilters && (
        <button
          className="search-chip search-chip--clear"
          onClick={search.resetFilters}
          aria-label={t.clearFilters}
        >
          <X size={12} />
          {t.clearFilters}
          <span className="search-chip__count">{activeFilterCount}</span>
        </button>
      )}
    </div>
  );
}
