import { useState, useRef, useEffect, useCallback } from "react";
import { ChevronDown } from "lucide-react";

interface FilterChipProps<T> {
  label: string;
  active: boolean;
  options: { label: string; value: T }[];
  onSelect: (value: T) => void;
  ariaLabel?: string;
}

export function FilterChip<T>({ label, active, options, onSelect, ariaLabel }: FilterChipProps<T>) {
  const [open, setOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const chipRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const cleanupRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (!open) return;
    const raf = requestAnimationFrame(() => {
      const handler = (e: MouseEvent) => {
        const target = e.target as Node;
        if (
          chipRef.current &&
          !chipRef.current.contains(target) &&
          menuRef.current &&
          !menuRef.current.contains(target)
        ) {
          setOpen(false);
        }
      };
      document.addEventListener("mousedown", handler);
      cleanupRef.current = () => document.removeEventListener("mousedown", handler);
    });
    return () => {
      cancelAnimationFrame(raf);
      cleanupRef.current();
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFocusedIndex(0);
      requestAnimationFrame(() => itemRefs.current[0]?.focus());
    } else {
      setFocusedIndex(-1);
    }
  }, [open]);

  const computeMenuPos = useCallback(() => {
    if (!chipRef.current) return;
    const rect = chipRef.current.getBoundingClientRect();
    const viewportH = window.innerHeight;
    const menuHeight = Math.min(options.length * 36 + 8, 320);
    const spaceBelow = viewportH - rect.bottom - 4;
    const top = spaceBelow >= menuHeight ? rect.bottom + 4 : Math.max(4, rect.top - menuHeight - 4);
    const left = Math.min(rect.left, window.innerWidth - 300);
    setMenuPos({ top, left });
  }, [options.length]);

  const handleOpen = useCallback(() => {
    if (!open) computeMenuPos();
    setOpen((prev) => !prev);
  }, [open, computeMenuPos]);

  const selectAndClose = useCallback(
    (value: T) => {
      onSelect(value);
      setOpen(false);
      triggerRef.current?.focus();
    },
    [onSelect],
  );

  const handleTriggerKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (!open) {
          computeMenuPos();
          setOpen(true);
        }
      } else if (e.key === "Escape" && open) {
        e.preventDefault();
        setOpen(false);
      }
    },
    [open, computeMenuPos],
  );

  const handleMenuKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setFocusedIndex((prev) => {
            const next = prev < options.length - 1 ? prev + 1 : 0;
            itemRefs.current[next]?.focus();
            return next;
          });
          break;
        case "ArrowUp":
          e.preventDefault();
          setFocusedIndex((prev) => {
            const next = prev > 0 ? prev - 1 : options.length - 1;
            itemRefs.current[next]?.focus();
            return next;
          });
          break;
        case "Home":
          e.preventDefault();
          setFocusedIndex(0);
          itemRefs.current[0]?.focus();
          break;
        case "End":
          e.preventDefault();
          setFocusedIndex(options.length - 1);
          itemRefs.current[options.length - 1]?.focus();
          break;
        case "Escape":
          e.preventDefault();
          setOpen(false);
          triggerRef.current?.focus();
          break;
        case "Tab":
          setOpen(false);
          break;
      }
    },
    [options.length],
  );

  const menuId = `filter-menu-${ariaLabel?.replace(/\s+/g, "-") || label.replace(/\s+/g, "-")}`;

  return (
    <div ref={chipRef} style={{ position: "relative", minWidth: 0 }}>
      <button
        ref={triggerRef}
        className={`search-chip${active ? " search-chip--active" : ""}`}
        onClick={handleOpen}
        onKeyDown={handleTriggerKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={ariaLabel || label}
      >
        <span className="search-chip__label">{label}</span>
        <ChevronDown size={12} className={open ? "search-chip__caret--open" : ""} />
      </button>
      {open && (
        <div
          ref={menuRef}
          id={menuId}
          role="listbox"
          aria-label={ariaLabel || label}
          className="search-chip__menu"
          style={{ top: menuPos.top, left: menuPos.left }}
          onKeyDown={handleMenuKeyDown}
        >
          {options.map((opt, i) => (
            <button
              key={i}
              ref={(el) => {
                itemRefs.current[i] = el;
              }}
              role="option"
              aria-selected={focusedIndex === i}
              className={`search-chip__menu-item${focusedIndex === i ? " search-chip__menu-item--focused" : ""}`}
              onClick={() => selectAndClose(opt.value)}
              tabIndex={focusedIndex === i ? 0 : -1}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
