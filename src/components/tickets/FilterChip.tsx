import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Search } from "lucide-react";
import { useDropdown } from "../../hooks/useDropdown";
import { useI18n } from "../../i18n/I18nContext";

const SEARCHABLE_THRESHOLD = 6;

interface FilterChipProps<T> {
  label: string;
  active: boolean;
  options: { label: string; value: T }[];
  onSelect: (value: T) => void;
  ariaLabel?: string;
  searchable?: boolean;
}

export function FilterChip<T>({
  label,
  active,
  options,
  onSelect,
  ariaLabel,
  searchable,
}: FilterChipProps<T>) {
  const { t } = useI18n();
  const { open, toggle, close, triggerRef, menuRef, pos } = useDropdown<
    HTMLButtonElement,
    HTMLDivElement
  >();

  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  const showSearch = searchable !== false && options.length >= SEARCHABLE_THRESHOLD;

  const filtered = useMemo(() => {
    if (!showSearch || !query.trim()) return options;
    const lower = query.toLowerCase();
    return options.filter((opt) => opt.label.toLowerCase().includes(lower));
  }, [options, query, showSearch]);

  const selectAndClose = useCallback(
    (value: T) => {
      onSelect(value);
      close();
      triggerRef.current?.focus();
    },
    [onSelect, close, triggerRef],
  );

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHighlightIndex(-1);
      setQuery("");
    }
  }, [open]);

  useEffect(() => {
    if (open && showSearch) {
      requestAnimationFrame(() => searchRef.current?.focus());
    }
  }, [open, showSearch]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHighlightIndex(-1);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (filtered.length === 0) return;
        setHighlightIndex((prev) => (prev + 1) % filtered.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (filtered.length === 0) return;
        setHighlightIndex((prev) => (prev <= 0 ? filtered.length - 1 : prev - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (highlightIndex >= 0 && highlightIndex < filtered.length) {
          selectAndClose(filtered[highlightIndex].value);
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, highlightIndex, filtered, selectAndClose]);

  useEffect(() => {
    if (highlightIndex < 0 || !menuRef.current) return;
    const el = menuRef.current.querySelector(`[data-index="${highlightIndex}"]`);
    if (el) el.scrollIntoView({ block: "nearest" });
  }, [highlightIndex, menuRef]);

  const menuId = `filter-menu-${ariaLabel?.replace(/\s+/g, "-") || label.replace(/\s+/g, "-")}`;

  return (
    <>
      <button
        ref={triggerRef}
        className={`filter-chip${active ? " filter-chip--active" : ""}`}
        onClick={toggle}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={ariaLabel || label}
      >
        <span className="filter-chip__label">{label}</span>
        <ChevronDown size={12} className={open ? "filter-chip__caret--open" : ""} />
      </button>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            id={menuId}
            className="chip-menu__list md-elevation-2"
            style={{ top: pos.top, left: pos.left }}
          >
            {showSearch && (
              <div className="chip-menu__search">
                <Search size={14} className="chip-menu__search-icon" aria-hidden="true" />
                <input
                  ref={searchRef}
                  type="text"
                  className="chip-menu__search-input"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t.filterSearchPlaceholder}
                  aria-label={t.filterSearchPlaceholder}
                />
              </div>
            )}
            <ul role="listbox" aria-label={ariaLabel || label} className="chip-menu__items">
              {filtered.map((opt, i) => {
                const highlighted = i === highlightIndex;
                return (
                  <li
                    key={i}
                    role="option"
                    aria-selected={highlighted}
                    onClick={() => selectAndClose(opt.value)}
                    className="chip-menu__item"
                    data-highlighted={highlighted || undefined}
                    data-index={i}
                  >
                    {opt.label}
                  </li>
                );
              })}
              {filtered.length === 0 && (
                <li className="chip-menu__no-results">{t.noFilterResults}</li>
              )}
            </ul>
          </div>,
          document.body,
        )}
    </>
  );
}
