import { useState, useEffect, useCallback, useRef } from "react";
import type { DragStartEvent, DragEndEvent } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { safeGet, safeSet } from "../../lib/storage";

const STORAGE_KEY = "ticket-project-order";

export function useProjectOrder(allProjectNames: string[]) {
  const [projectOrder, setProjectOrder] = useState<string[]>(() =>
    safeGet<string[]>(STORAGE_KEY, []),
  );

  useEffect(() => {
    if (allProjectNames.length === 0) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProjectOrder((prev) => {
      const available = new Set(allProjectNames);
      const cleaned = prev.filter((n) => available.has(n));
      const existing = new Set(cleaned);
      const newProjects = allProjectNames.filter((n) => !existing.has(n)).sort();
      const merged = [...cleaned, ...newProjects];
      if (merged.length === prev.length && merged.every((n, i) => n === prev[i])) return prev;
      return merged;
    });
  }, [allProjectNames]);

  useEffect(() => {
    if (projectOrder.length > 0) {
      safeSet(STORAGE_KEY, projectOrder);
    }
  }, [projectOrder]);

  const [dragActiveId, setDragActiveId] = useState<string | null>(null);
  const collapsedBeforeDrag = useRef<Record<string, boolean>>({});

  const handleDragStart = useCallback(
    (
      event: DragStartEvent,
      collapsed: Record<string, boolean>,
      filteredProjectNames: string[],
      setCollapsed: (val: Record<string, boolean>) => void,
    ) => {
      setDragActiveId(event.active.id as string);
      collapsedBeforeDrag.current = collapsed;
      setCollapsed(Object.fromEntries(filteredProjectNames.map((n) => [n, true])));
    },
    [],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent, setCollapsed: (val: Record<string, boolean>) => void) => {
      const { active, over } = event;
      setDragActiveId(null);
      setCollapsed(collapsedBeforeDrag.current);

      if (over && active.id !== over.id) {
        setProjectOrder((prev) => {
          const oldIndex = prev.indexOf(active.id as string);
          const newIndex = prev.indexOf(over.id as string);
          return arrayMove(prev, oldIndex, newIndex);
        });
      }
    },
    [],
  );

  return { projectOrder, dragActiveId, handleDragStart, handleDragEnd };
}
