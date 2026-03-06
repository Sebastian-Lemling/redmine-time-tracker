import { useState, useEffect, useRef, useLayoutEffect, useCallback } from "react";

interface Options {
  alignRight?: boolean;
  /** Fixed menu width hint (for alignRight before first render) */
  menuWidth?: number;
  gap?: number;
}

export function useDropdown<
  T extends HTMLElement = HTMLButtonElement,
  M extends HTMLElement = HTMLUListElement,
>(options: Options = {}) {
  const { alignRight = false, menuWidth = 220, gap = 4 } = options;

  const [open, setOpen] = useState(false);
  const triggerRef = useRef<T>(null);
  const menuRef = useRef<M>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const toggle = useCallback(() => setOpen((v) => !v), []);
  const close = useCallback(() => setOpen(false), []);

  // Prefer below, flip above if no space
  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const trigger = triggerRef.current.getBoundingClientRect();
    const menu = menuRef.current;
    const menuH = menu?.offsetHeight ?? 200;
    const menuW = menu?.offsetWidth ?? menuWidth;
    const vh = window.innerHeight;
    const vw = window.innerWidth;

    const spaceBelow = vh - trigger.bottom;
    const placeAbove = spaceBelow < menuH + gap && trigger.top > spaceBelow;
    const top = placeAbove ? trigger.top - menuH - gap : trigger.bottom + gap;

    let left = alignRight ? trigger.right - menuW : trigger.left;
    if (left + menuW > vw - 8) {
      left = vw - menuW - 8;
    }
    if (left < 8) {
      left = 8;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPos({ top, left });
  }, [open, alignRight, menuWidth, gap]);

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

  // stopPropagation prevents parent dialog/menu from also closing
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

  useEffect(() => {
    if (!open || !menuRef.current) return;
    const current = menuRef.current.querySelector('[aria-selected="true"]');
    if (current) current.scrollIntoView({ block: "nearest" });
  }, [open]);

  return { open, setOpen, toggle, close, triggerRef, menuRef, pos };
}
