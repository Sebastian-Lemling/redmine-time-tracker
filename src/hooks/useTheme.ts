import { useState, useEffect, useCallback } from "react";

export type ThemeMode = "light" | "dark" | "system";

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getResolvedTheme(mode: ThemeMode): "light" | "dark" {
  return mode === "system" ? getSystemTheme() : mode;
}

function applyTheme(resolved: "light" | "dark") {
  document.documentElement.setAttribute("data-theme", resolved);
}

export function useTheme() {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    try {
      const stored = localStorage.getItem("theme-mode");
      if (stored === "light" || stored === "dark" || stored === "system") return stored;
    } catch {
      /* ignore */
    }
    return "system";
  });

  const resolved = getResolvedTheme(mode);

  useEffect(() => {
    applyTheme(resolved);
  }, [resolved]);

  useEffect(() => {
    if (mode !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme(getSystemTheme());
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [mode]);

  const setMode = useCallback((newMode: ThemeMode) => {
    setModeState(newMode);
    try {
      localStorage.setItem("theme-mode", newMode);
    } catch {
      /* ignore */
    }
  }, []);

  const toggle = useCallback(() => {
    const next = resolved === "light" ? "dark" : "light";
    setMode(next);
  }, [resolved, setMode]);

  return { mode, resolved, setMode, toggle };
}
