import { Search, ChevronsUpDown, RefreshCw, X, Timer, Star } from "lucide-react";
import { useI18n } from "../../i18n/I18nContext";

interface Props {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filterProjects: { name: string; count: number }[];
  enabledProjects: Set<string>;
  onToggleProject: (name: string) => void;
  colorMap: Record<string, string>;
  onToggleAllProjects: () => void;
  showTrackedOnly: boolean;
  onToggleTrackedOnly: () => void;
  showFavoritesOnly: boolean;
  onToggleFavoritesOnly: () => void;
  favoriteCount: number;
  allExpanded: boolean;
  onToggleAll: () => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

export function TicketListToolbar({
  searchQuery,
  onSearchChange,
  filterProjects,
  enabledProjects,
  onToggleProject,
  colorMap,
  onToggleAllProjects,
  showTrackedOnly,
  onToggleTrackedOnly,
  showFavoritesOnly,
  onToggleFavoritesOnly,
  favoriteCount,
  allExpanded,
  onToggleAll,
  onRefresh,
  isRefreshing,
}: Props) {
  const { t } = useI18n();
  const allEnabled = filterProjects.every((p) => enabledProjects.has(p.name));
  const totalCount = filterProjects.reduce((s, p) => s + p.count, 0);

  return (
    <div className="ticket-layout__header">
      <div className="ticket-toolbar">
        <div className="ticket-toolbar__search">
          <Search size={20} className="search-icon" />
          <input
            type="text"
            placeholder={t.searchTickets}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="ticket-toolbar__input"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="ticket-toolbar__btn ticket-toolbar__btn--clear"
              title="Clear"
            >
              <X size={16} />
            </button>
          )}
        </div>
        <div className="ticket-toolbar__actions">
          <button
            onClick={onToggleTrackedOnly}
            className="ticket-toolbar__btn"
            style={showTrackedOnly ? { color: "var(--color-primary)" } : {}}
            title={t.showTrackedOnly}
          >
            <Timer size={20} />
          </button>
          <button
            onClick={onToggleAll}
            className="ticket-toolbar__btn"
            title={allExpanded ? t.collapseAll : t.expandAll}
          >
            <ChevronsUpDown size={20} />
          </button>
          <button
            onClick={onRefresh}
            className={`ticket-toolbar__btn${isRefreshing ? " ticket-toolbar__btn--refreshing" : ""}`}
            title={t.refresh}
            disabled={isRefreshing}
          >
            <RefreshCw size={20} />
          </button>
        </div>
      </div>
      {(filterProjects.length > 1 || favoriteCount > 0) && (
        <div className="project-filter-bar">
          <button
            className={`project-filter-badge${allEnabled ? " project-filter-badge--active" : ""}`}
            onClick={onToggleAllProjects}
          >
            <span className="project-filter-badge__label">{t.all}</span>
            <span className="project-filter-badge__count">{totalCount}</span>
          </button>
          {favoriteCount > 0 && (
            <button
              className={`project-filter-badge${showFavoritesOnly ? " project-filter-badge--active" : ""}`}
              onClick={onToggleFavoritesOnly}
              style={showFavoritesOnly ? { borderColor: "var(--color-star, #f9ab00)" } : {}}
            >
              <Star
                size={10}
                fill={showFavoritesOnly ? "var(--color-star, #f9ab00)" : "none"}
                stroke={showFavoritesOnly ? "var(--color-star, #f9ab00)" : "currentColor"}
              />
              <span className="project-filter-badge__label">{t.favorites}</span>
              <span className="project-filter-badge__count">{favoriteCount}</span>
            </button>
          )}
          {filterProjects.map((p) => (
            <button
              key={p.name}
              className={`project-filter-badge${enabledProjects.has(p.name) ? " project-filter-badge--active" : ""}`}
              onClick={() => onToggleProject(p.name)}
            >
              <span
                className="project-filter-badge__dot"
                style={{ background: colorMap[p.name] }}
              />
              <span className="project-filter-badge__label">{p.name}</span>
              <span className="project-filter-badge__count">{p.count}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
