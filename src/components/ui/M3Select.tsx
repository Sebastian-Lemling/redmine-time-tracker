import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";

export interface M3SelectOption {
  value: string;
  label: string;
}

interface Props {
  label: string;
  value: string;
  options: M3SelectOption[];
  onChange: (value: string) => void;
  elevated?: boolean;
  disabled?: boolean;
}

export function M3Select({ label, value, options, onChange, elevated, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });

  const selectedLabel = options.find((o) => o.value === value)?.label ?? "";

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const menu = menuRef.current;
    const menuH = menu?.offsetHeight ?? 200;
    const gap = 4;
    const vh = window.innerHeight;

    const spaceBelow = vh - rect.bottom;
    const placeAbove = spaceBelow < menuH + gap && rect.top > spaceBelow;

    setPos({
      top: placeAbove ? rect.top - menuH - gap : rect.bottom + gap,
      left: rect.left,
      width: rect.width,
    });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: Event) => {
      if (e.target instanceof Node && menuRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    window.addEventListener("scroll", handler, true);
    return () => window.removeEventListener("scroll", handler, true);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  const handleSelect = (val: string) => {
    if (val !== value) onChange(val);
    setOpen(false);
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          if (!disabled) setOpen((v) => !v);
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        className="m3-select__trigger"
        data-open={open || undefined}
        style={disabled ? { opacity: 0.6, cursor: "default" } : undefined}
      >
        <span className="m3-select__label" data-open={open || undefined}>
          {label}
        </span>

        <span className="m3-select__value">{selectedLabel}</span>

        <ChevronDown size={18} className="m3-select__caret" data-open={open || undefined} />
      </button>

      {open &&
        createPortal(
          <ul
            ref={menuRef}
            role="listbox"
            aria-label={label}
            className="m3-select__list md-elevation-2"
            style={{
              top: pos.top,
              left: pos.left,
              width: pos.width,
              backgroundColor: elevated ? "var(--color-surface-container-low)" : undefined,
            }}
          >
            {options.map((o) => {
              const selected = o.value === value;
              return (
                <li
                  key={o.value}
                  role="option"
                  aria-selected={selected}
                  onClick={() => handleSelect(o.value)}
                  className="m3-select__item"
                  data-selected={selected || undefined}
                >
                  {o.label}
                </li>
              );
            })}
          </ul>,
          document.body,
        )}
    </>
  );
}
