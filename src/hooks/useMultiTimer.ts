import { useState, useEffect, useCallback, useRef } from "react";
import { roundUpToStep } from "../lib/timeConfig";
import { safeGet, safeSet, safeRemove } from "../lib/storage";
import { logger } from "../lib/logger";
import type { TimerState, MultiTimerMap, ActiveTimerId } from "../types/redmine";

const STORAGE_KEY = "multiTimers";
const OLD_STORAGE_KEY = "activeTimer";
const MAX_TIMERS = 10;

interface StoredState {
  timers: MultiTimerMap;
  activeId: ActiveTimerId;
}

export interface SaveResult {
  issueId: number;
  issueSubject: string;
  projectId?: number;
  projectName: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
}

function loadState(): StoredState {
  const saved = safeGet<StoredState | null>(STORAGE_KEY, null);
  if (saved && typeof saved.timers === "object") return saved;

  // Migrate from old single-timer format
  const oldTimer = safeGet<TimerState | null>(OLD_STORAGE_KEY, null);
  if (oldTimer && oldTimer.issueId) {
    const migrated: StoredState = {
      timers: { [oldTimer.issueId]: oldTimer },
      activeId: oldTimer.pausedAt ? null : oldTimer.issueId,
    };
    safeSet(STORAGE_KEY, migrated);
    safeRemove(OLD_STORAGE_KEY);
    return migrated;
  }

  return { timers: {}, activeId: null };
}

function calcElapsed(timer: TimerState): number {
  const start = new Date(timer.startTime).getTime();
  const paused = timer.totalPausedMs || 0;
  if (timer.pausedAt) {
    const pausedAt = new Date(timer.pausedAt).getTime();
    return Math.max(0, Math.floor((pausedAt - start - paused) / 1000));
  }
  return Math.max(0, Math.floor((Date.now() - start - paused) / 1000));
}

function calcDurationMinutes(timer: TimerState): number {
  const endTime = Date.now();
  let totalPaused = timer.totalPausedMs || 0;
  if (timer.pausedAt) {
    totalPaused += endTime - new Date(timer.pausedAt).getTime();
  }
  const raw = Math.max(
    1,
    Math.round((endTime - new Date(timer.startTime).getTime() - totalPaused) / 60000),
  );
  return roundUpToStep(raw);
}

export function useMultiTimer() {
  const [initialState] = useState(loadState);
  const [timers, setTimers] = useState<MultiTimerMap>(initialState.timers);
  const [activeId, setActiveId] = useState<ActiveTimerId>(initialState.activeId);
  const [elapsedMap, setElapsedMap] = useState<Record<number, number>>({});

  // Refs for synchronous access in callbacks
  const timersRef = useRef(timers);
  const activeIdRef = useRef(activeId);
  useEffect(() => {
    timersRef.current = timers;
  }, [timers]);
  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  useEffect(() => {
    const state: StoredState = { timers, activeId };
    if (Object.keys(timers).length === 0) {
      safeRemove(STORAGE_KEY);
    } else {
      const ok = safeSet(STORAGE_KEY, state);
      if (!ok)
        logger.warn("Timer state not persisted (storage full)", {
          data: { timerCount: Object.keys(timers).length },
        });
    }
  }, [timers, activeId]);

  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        if (e.newValue) {
          try {
            const parsed: StoredState = JSON.parse(e.newValue);
            if (parsed && typeof parsed.timers === "object") {
              setTimers(parsed.timers);
              setActiveId(parsed.activeId);
            }
          } catch {
            // Ignore corrupted data from other tabs
          }
        } else {
          setTimers({});
          setActiveId(null);
        }
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  useEffect(() => {
    const tick = () => {
      const current = timersRef.current;
      const ids = Object.keys(current);
      if (ids.length === 0) {
        setElapsedMap({});
        return;
      }
      const map: Record<number, number> = {};
      for (const id of ids) {
        map[Number(id)] = calcElapsed(current[Number(id)]);
      }
      setElapsedMap(map);
    };

    tick();
    const intervalId = setInterval(tick, 1000);

    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [timers]); // re-setup when timers map changes structurally

  const startOrResume = useCallback(
    (issueId: number, issueSubject: string, projectName: string, projectId?: number) => {
      setTimers((prev) => {
        const next = { ...prev };
        const currentActiveId = activeIdRef.current;

        if (currentActiveId != null && currentActiveId !== issueId && next[currentActiveId]) {
          const active = next[currentActiveId];
          if (!active.pausedAt) {
            next[currentActiveId] = {
              ...active,
              pausedAt: new Date().toISOString(),
            };
          }
        }

        if (next[issueId]) {
          const existing = next[issueId];
          if (existing.pausedAt) {
            const pauseDuration = Date.now() - new Date(existing.pausedAt).getTime();
            next[issueId] = {
              ...existing,
              pausedAt: undefined,
              totalPausedMs: (existing.totalPausedMs || 0) + pauseDuration,
            };
          }
        } else {
          // Check soft cap
          if (Object.keys(next).length >= MAX_TIMERS) {
            return prev; // don't start new timer
          }
          next[issueId] = {
            issueId,
            issueSubject,
            projectId,
            projectName,
            startTime: new Date().toISOString(),
          };
        }

        return next;
      });
      setActiveId(issueId);
    },
    [],
  );

  const pause = useCallback(() => {
    setTimers((prev) => {
      const id = activeIdRef.current;
      if (id == null || !prev[id] || prev[id].pausedAt) return prev;
      return {
        ...prev,
        [id]: { ...prev[id], pausedAt: new Date().toISOString() },
      };
    });
    setActiveId(null);
  }, []);

  /** Save a timer: compute duration, remove from map, return result for dialog */
  const save = useCallback((issueId: number): SaveResult | null => {
    const current = timersRef.current;
    const timer = current[issueId];
    if (!timer) return null;

    const endTime = new Date().toISOString();
    const durationMinutes = calcDurationMinutes(timer);

    setTimers((prev) => {
      const next = { ...prev };
      delete next[issueId];
      return next;
    });
    setActiveId((prev) => (prev === issueId ? null : prev));

    return {
      issueId: timer.issueId,
      issueSubject: timer.issueSubject,
      projectId: timer.projectId,
      projectName: timer.projectName,
      startTime: timer.startTime,
      endTime,
      durationMinutes,
    };
  }, []);

  /** Capture a timer: pause + compute duration, but keep it in the map */
  const capture = useCallback((issueId: number): SaveResult | null => {
    const current = timersRef.current;
    const timer = current[issueId];
    if (!timer) return null;

    const endTime = new Date().toISOString();
    const durationMinutes = calcDurationMinutes(timer);

    if (!timer.pausedAt) {
      setTimers((prev) => {
        if (!prev[issueId]) return prev;
        return {
          ...prev,
          [issueId]: { ...prev[issueId], pausedAt: new Date().toISOString() },
        };
      });
    }
    setActiveId((prev) => (prev === issueId ? null : prev));

    return {
      issueId: timer.issueId,
      issueSubject: timer.issueSubject,
      projectId: timer.projectId,
      projectName: timer.projectName,
      startTime: timer.startTime,
      endTime,
      durationMinutes,
    };
  }, []);

  const adjustElapsed = useCallback((issueId: number, deltaSec: number) => {
    setTimers((prev) => {
      const t = prev[issueId];
      if (!t) return prev;
      const currentElapsed = calcElapsed(t);
      const effectiveDelta = Math.max(deltaSec, -currentElapsed);
      if (effectiveDelta === 0) return prev;
      return {
        ...prev,
        [issueId]: {
          ...t,
          totalPausedMs: (t.totalPausedMs || 0) - effectiveDelta * 1000,
        },
      };
    });
  }, []);

  const discard = useCallback((issueId: number) => {
    setTimers((prev) => {
      const next = { ...prev };
      delete next[issueId];
      return next;
    });
    setActiveId((prev) => (prev === issueId ? null : prev));
  }, []);

  const timerCount = Object.keys(timers).length;
  const pausedCount = timerCount - (activeId != null && timers[activeId] ? 1 : 0);

  return {
    timers,
    activeId,
    elapsedMap,
    startOrResume,
    pause,
    save,
    capture,
    discard,
    adjustElapsed,
    timerCount,
    pausedCount,
  };
}
