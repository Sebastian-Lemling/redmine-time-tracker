import { useState, useEffect, useCallback, useRef } from "react";
import { safeGet, safeSet } from "../../lib/storage";

export function useEnabledProjects(allProjectNames: string[], instanceId: string) {
  const storageKey = `ticket-disabled-projects-${instanceId}`;
  const [enabledProjects, setEnabledProjects] = useState<Set<string>>(new Set());
  const disabledByUser = useRef<Set<string>>(new Set(safeGet<string[]>(storageKey, [])));
  const prevNamesRef = useRef<string>("");

  useEffect(() => {
    const key = allProjectNames.slice().sort().join("\0");
    if (key === prevNamesRef.current || allProjectNames.length === 0) return;
    prevNamesRef.current = key;

    setEnabledProjects((prev) => {
      if (prev.size === 0 && disabledByUser.current.size === 0) {
        return new Set(allProjectNames);
      }
      const next = new Set(prev);
      for (const name of allProjectNames) {
        if (!next.has(name) && !disabledByUser.current.has(name)) {
          next.add(name);
        }
      }
      return next;
    });
  }, [allProjectNames]);

  const persistDisabled = useCallback(() => {
    const arr = [...disabledByUser.current];
    safeSet(storageKey, arr.length > 0 ? arr : []);
  }, [storageKey]);

  const toggle = useCallback(
    (name: string) => {
      setEnabledProjects((prev) => {
        const next = new Set(prev);
        if (next.has(name)) {
          next.delete(name);
          disabledByUser.current.add(name);
        } else {
          next.add(name);
          disabledByUser.current.delete(name);
        }
        persistDisabled();
        return next;
      });
    },
    [persistDisabled],
  );

  const toggleAll = useCallback(
    (projectNames: string[]) => {
      setEnabledProjects((prev) => {
        const allEnabled = projectNames.every((n) => prev.has(n));
        if (allEnabled) {
          disabledByUser.current = new Set(projectNames);
        } else {
          disabledByUser.current.clear();
        }
        persistDisabled();
        return allEnabled ? new Set() : new Set(projectNames);
      });
    },
    [persistDisabled],
  );

  return { enabledProjects, toggle, toggleAll };
}
