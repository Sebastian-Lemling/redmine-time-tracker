import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Search } from "lucide-react";
import { useDropdown } from "../../hooks/useDropdown";

export interface ChipMenuItem {
  id: number;
  label: string;
}

interface Props {
  currentId?: number;
  currentLabel: string;
  items: ChipMenuItem[];
  onSelect: (id: number) => void;
  ariaLabel?: string;
  emptyStyle?: boolean;
  onOpen?: () => void;
  searchable?: boolean;
}

export function ChipMenu({
  currentId,
  currentLabel,
  items,
  onSelect,
  ariaLabel,
  emptyStyle,
  onOpen,
  searchable,
}: Props) {
  const { open, toggle, close, triggerRef, menuRef, pos } = useDropdown<
    HTMLButtonElement,
    HTMLDivElement
  >();

  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  const filtered =
    searchable && query.trim()
      ? items.filter((i) => i.label.toLowerCase().includes(query.toLowerCase()))
      : items;

  const handleSelect = useCallback(
    (id: number) => {
      if (id !== currentId) onSelect(id);
      close();
    },
    [currentId, onSelect, close],
  );

  const handleToggle = () => {
    if (!open && onOpen) onOpen();
    toggle();
  };

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHighlightIndex(-1);
      setQuery("");
    }
  }, [open]);

  useEffect(() => {
    if (open && searchable) {
      requestAnimationFrame(() => searchRef.current?.focus());
    }
  }, [open, searchable]);

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
      } else if (e.key === "Escape") {
        e.preventDefault();
        close();
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (highlightIndex >= 0 && highlightIndex < filtered.length) {
          handleSelect(filtered[highlightIndex].id);
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, highlightIndex, filtered, handleSelect, close]);

  useEffect(() => {
    if (highlightIndex < 0 || !menuRef.current) return;
    const el = menuRef.current.querySelector(`[data-index="${highlightIndex}"]`);
    if (el) el.scrollIntoView({ block: "nearest" });
  }, [highlightIndex, menuRef]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`chip-menu__trigger${emptyStyle ? " chip-menu__trigger--empty" : ""}`}
      >
        <span className="chip-menu__trigger-label">{currentLabel}</span>
        <ChevronDown size={14} className="chip-menu__caret" data-open={open || undefined} />
      </button>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            className="chip-menu__list md-elevation-2"
            style={{ top: pos.top, left: pos.left }}
          >
            {searchable && (
              <div className="chip-menu__search">
                <Search size={14} className="chip-menu__search-icon" />
                <input
                  ref={searchRef}
                  type="text"
                  className="chip-menu__search-input"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={ariaLabel ?? ""}
                  aria-label={ariaLabel}
                />
              </div>
            )}
            <ul role="listbox" aria-label={ariaLabel} className="chip-menu__items">
              {filtered.map((item, i) => {
                const selected = item.id === currentId;
                const highlighted = i === highlightIndex;
                return (
                  <li
                    key={item.id}
                    role="option"
                    aria-selected={selected}
                    onClick={() => handleSelect(item.id)}
                    className="chip-menu__item"
                    data-selected={selected || undefined}
                    data-highlighted={highlighted || undefined}
                    data-index={i}
                  >
                    {item.label}
                  </li>
                );
              })}
              {searchable && filtered.length === 0 && <li className="chip-menu__no-results">—</li>}
            </ul>
          </div>,
          document.body,
        )}
    </>
  );
}
