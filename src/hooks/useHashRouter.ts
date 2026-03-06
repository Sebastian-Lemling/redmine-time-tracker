import { useState, useCallback, useEffect, useMemo, useRef } from "react";

export interface AppRoute {
  section: "tickets" | "timelog" | "overview";
  year?: number;
  month?: number; // 0-indexed (JS Date convention)
  day?: number;
  tab?: "unsynced" | "synced";
}

const DEFAULT_ROUTE: AppRoute = { section: "tickets" };

export function parseHash(hash: string): AppRoute {
  const raw = hash.replace(/^#\/?/, "");
  const parts = raw.split("/").filter(Boolean);

  if (parts[0] === "timelog") {
    // #/timelog/YYYY-MM[/DD[/synced]]
    if (parts[1]) {
      const [yStr, mStr] = parts[1].split("-");
      const y = parseInt(yStr, 10);
      const m = parseInt(mStr, 10);
      if (isNaN(y) || isNaN(m) || m < 1 || m > 12) return { section: "timelog" };

      const route: AppRoute = { section: "timelog", year: y, month: m - 1 };
      if (parts[2]) {
        const d = parseInt(parts[2], 10);
        if (!isNaN(d) && d >= 1 && d <= 31) route.day = d;
        else return { section: "timelog" };
      }
      if (parts[3] === "synced") route.tab = "synced";
      else if (parts[3] === "unsynced") route.tab = "unsynced";
      return route;
    }

    return { section: "timelog" };
  }

  if (parts[0] === "overview") return { section: "overview" };

  if (parts[0] === "tickets") return { section: "tickets" };

  return DEFAULT_ROUTE;
}

export function buildHash(route: Partial<AppRoute>): string {
  const section = route.section ?? "tickets";
  if (section === "tickets") return "#/tickets";
  if (section === "overview") return "#/overview";

  const now = new Date();
  const y = route.year ?? now.getFullYear();
  const m = route.month ?? now.getMonth();
  const mm = String(m + 1).padStart(2, "0");
  let h = `#/timelog/${y}-${mm}`;
  if (route.day != null) {
    h += `/${route.day}`;
    if (route.tab === "synced") h += "/synced";
  }
  return h;
}

export function useHashRouter() {
  const [route, setRoute] = useState<AppRoute>(() => parseHash(window.location.hash));

  useEffect(() => {
    const handler = () => setRoute(parseHash(window.location.hash));
    window.addEventListener("hashchange", handler);
    window.addEventListener("popstate", handler);
    return () => {
      window.removeEventListener("hashchange", handler);
      window.removeEventListener("popstate", handler);
    };
  }, []);

  useEffect(() => {
    if (!window.location.hash || window.location.hash === "#" || window.location.hash === "#/") {
      history.replaceState(null, "", buildHash(DEFAULT_ROUTE));
    }
  }, []);

  const routeRef = useRef(route);
  useEffect(() => {
    routeRef.current = route;
  }, [route]);

  const navigate = useCallback((partial: Partial<AppRoute>) => {
    const current = routeRef.current;
    // Merge with current route for same-section updates
    const merged: AppRoute = { ...current, ...partial };

    // When switching sections, reset sub-state
    if (partial.section && partial.section !== current.section) {
      merged.year = partial.year;
      merged.month = partial.month;
      merged.day = partial.day;
      merged.tab = partial.tab;
    }

    const hash = buildHash(merged);
    history.pushState(null, "", hash);
    const newRoute = parseHash(hash);
    routeRef.current = newRoute;
    setRoute(newRoute);
  }, []);

  return useMemo(() => ({ route, navigate }), [route, navigate]);
}
