import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { Search, ChevronsUpDown, Timer, Star as StarIcon, ChevronDown } from "lucide-react";
import { useI18n } from "../../i18n/I18nContext";
import { useOverflowChips } from "../../hooks/useOverflowChips";

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
  allExpanded: boolean;
  onToggleAll: () => void;
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
  allExpanded,
  onToggleAll,
}: Props) {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputFocused, setInputFocused] = useState(false);
  const allEnabled = filterProjects.every((p) => enabledProjects.has(p.name));
  const totalCount = filterProjects.reduce((s, p) => s + p.count, 0);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "o") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
        return;
      }
      if (e.key === "Escape" && document.activeElement === inputRef.current) {
        e.preventDefault();
        onSearchChange("");
        inputRef.current?.blur();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onSearchChange]);

  const allChips = useMemo(() => {
    const chips: { key: string; label: string; count: number; color?: string; isAll?: boolean }[] =
      [];
    chips.push({ key: "__all__", label: t.all, count: totalCount, isAll: true });
    for (const p of filterProjects)
      chips.push({ key: p.name, label: p.name, count: p.count, color: colorMap[p.name] });
    return chips;
  }, [filterProjects, totalCount, colorMap, t]);

  const { containerRef, visibleCount } = useOverflowChips(allChips.length);
  const visibleChips = allChips.slice(0, visibleCount);
  const overflowChips = allChips.slice(visibleCount);

  const [overflowOpen, setOverflowOpen] = useState(false);
  const overflowRef = useRef<HTMLDivElement>(null);

  const handleChipClick = useCallback(
    (chip: (typeof allChips)[0]) => {
      if (chip.isAll) onToggleAllProjects();
      else onToggleProject(chip.key);
    },
    [onToggleAllProjects, onToggleProject],
  );

  const isActive = useCallback(
    (chip: (typeof allChips)[0]) => {
      if (chip.isAll) return allEnabled;
      return enabledProjects.has(chip.key);
    },
    [allEnabled, enabledProjects],
  );

  useEffect(() => {
    if (!overflowOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (overflowRef.current && !overflowRef.current.contains(e.target as Node))
        setOverflowOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [overflowOpen]);

  const renderChip = (chip: (typeof allChips)[0]) => (
    <button
      key={chip.key}
      className={`filter-chip${isActive(chip) ? " filter-chip--active" : ""}`}
      onClick={() => handleChipClick(chip)}
    >
      {chip.color && <span className="filter-chip__dot" style={{ background: chip.color }} />}
      <span className="filter-chip__label">{chip.label}</span>
      <span className="filter-chip__count">{chip.count}</span>
    </button>
  );

  return (
    <div className="ticket-layout__header">
      <div className="ticket-toolbar">
        <div className="ticket-toolbar__search">
          <Search size={20} className="search-icon" />
          <input
            ref={inputRef}
            type="text"
            placeholder={t.searchTickets}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            className="ticket-toolbar__input"
          />
          {inputFocused || searchQuery ? (
            <kbd
              className="ticket-toolbar__kbd"
              style={{ pointerEvents: "auto", cursor: "pointer" }}
              onMouseDown={(e) => {
                e.preventDefault();
                onSearchChange("");
                inputRef.current?.blur();
              }}
            >
              Esc
            </kbd>
          ) : (
            <span className="ticket-toolbar__kbd-group">
              <kbd className="ticket-toolbar__kbd">
                {/Mac|iPhone|iPad/.test(navigator.userAgent) ? "⌘" : "Ctrl"}
              </kbd>
              <kbd className="ticket-toolbar__kbd">O</kbd>
            </span>
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
            onClick={onToggleFavoritesOnly}
            className="ticket-toolbar__btn"
            style={showFavoritesOnly ? { color: "var(--color-star, #f9ab00)" } : {}}
            title={t.favorites}
          >
            <StarIcon size={20} fill={showFavoritesOnly ? "var(--color-star, #f9ab00)" : "none"} />
          </button>
        </div>
      </div>
      {showFavoritesOnly ? (
        <div className="ticket-layout__fav-header">
          <StarIcon
            size={16}
            fill="var(--color-star, #f9ab00)"
            stroke="var(--color-star, #f9ab00)"
          />
          <span>{t.favorites}</span>
        </div>
      ) : filterProjects.length > 1 ? (
        <div className="project-filter-bar" ref={containerRef}>
          {visibleChips.map(renderChip)}
          {overflowChips.length > 0 && (
            <div className="project-filter-overflow" ref={overflowRef} data-overflow-trigger>
              <button
                className="filter-chip project-filter-overflow__trigger"
                onClick={() => setOverflowOpen((o) => !o)}
              >
                <span className="filter-chip__label">+{overflowChips.length}</span>
                <ChevronDown size={14} />
              </button>
              {overflowOpen && (
                <div className="project-filter-overflow__menu">
                  {overflowChips.map((chip) => (
                    <button
                      key={chip.key}
                      className={`project-filter-overflow__item${isActive(chip) ? " project-filter-overflow__item--active" : ""}`}
                      onClick={() => handleChipClick(chip)}
                    >
                      {chip.color && (
                        <span className="filter-chip__dot" style={{ background: chip.color }} />
                      )}
                      <span>{chip.label}</span>
                      <span className="project-filter-overflow__count">{chip.count}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
