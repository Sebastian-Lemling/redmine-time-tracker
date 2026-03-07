import { useState, useEffect, useCallback, useRef } from "react";
import { roundUpToStep } from "../lib/timeConfig";
import { safeGet, safeSet, safeRemove } from "../lib/storage";
import { logger } from "../lib/logger";
import {
  timerKey,
  DEFAULT_INSTANCE_ID,
  type TimerState,
  type MultiTimerMap,
  type ActiveTimerKey,
  type TimerKey,
} from "../types/redmine";

const STORAGE_KEY = "multiTimers";
const OLD_STORAGE_KEY = "activeTimer";
const MAX_TIMERS = 10;

interface StoredState {
  timers: MultiTimerMap;
  activeId: ActiveTimerKey;
}

export interface SaveResult {
  issueId: number;
  issueSubject: string;
  projectId?: number;
  projectName: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  instanceId: string;
}

function migrateNumericKeys(raw: StoredState): StoredState {
  const timers: MultiTimerMap = {};
  let activeId: ActiveTimerKey = raw.activeId;
  let migrated = false;

  for (const [key, timer] of Object.entries(raw.timers)) {
    const inst = timer.instanceId || DEFAULT_INSTANCE_ID;
    if (!timer.instanceId) {
      timer.instanceId = inst;
      migrated = true;
    }
    // If key is a bare number, migrate to composite key
    if (/^\d+$/.test(key)) {
      const newKey = timerKey(inst, Number(key));
      timers[newKey] = timer;
      if (String(activeId) === key) {
        activeId = newKey;
      }
      migrated = true;
    } else {
      timers[key] = timer;
    }
  }

  if (migrated) {
    const state: StoredState = { timers, activeId };
    safeSet(STORAGE_KEY, state);
    return state;
  }

  return raw;
}

function loadState(): StoredState {
  const saved = safeGet<StoredState | null>(STORAGE_KEY, null);
  if (saved && typeof saved.timers === "object") return migrateNumericKeys(saved);

  // Migrate from old single-timer format
  const oldTimer = safeGet<TimerState | null>(OLD_STORAGE_KEY, null);
  if (oldTimer && oldTimer.issueId) {
    const inst = oldTimer.instanceId || DEFAULT_INSTANCE_ID;
    oldTimer.instanceId = inst;
    const key = timerKey(inst, oldTimer.issueId);
    const migrated: StoredState = {
      timers: { [key]: oldTimer },
      activeId: oldTimer.pausedAt ? null : key,
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
  const [activeId, setActiveId] = useState<ActiveTimerKey>(initialState.activeId);
  const [elapsedMap, setElapsedMap] = useState<Record<TimerKey, number>>({});

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
      const keys = Object.keys(current);
      if (keys.length === 0) {
        setElapsedMap({});
        return;
      }
      const map: Record<TimerKey, number> = {};
      for (const key of keys) {
        map[key] = calcElapsed(current[key]);
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
  }, [timers]);

  const startOrResume = useCallback(
    (
      instanceId: string,
      issueId: number,
      issueSubject: string,
      projectName: string,
      projectId?: number,
    ) => {
      const key = timerKey(instanceId, issueId);
      setTimers((prev) => {
        const next = { ...prev };
        const currentActiveKey = activeIdRef.current;

        if (currentActiveKey != null && currentActiveKey !== key && next[currentActiveKey]) {
          const active = next[currentActiveKey];
          if (!active.pausedAt) {
            next[currentActiveKey] = {
              ...active,
              pausedAt: new Date().toISOString(),
            };
          }
        }

        if (next[key]) {
          const existing = next[key];
          if (existing.pausedAt) {
            const pauseDuration = Date.now() - new Date(existing.pausedAt).getTime();
            next[key] = {
              ...existing,
              pausedAt: undefined,
              totalPausedMs: (existing.totalPausedMs || 0) + pauseDuration,
            };
          }
        } else {
          if (Object.keys(next).length >= MAX_TIMERS) {
            return prev;
          }
          next[key] = {
            issueId,
            issueSubject,
            projectId,
            projectName,
            startTime: new Date().toISOString(),
            instanceId,
          };
        }

        return next;
      });
      setActiveId(key);
    },
    [],
  );

  const pause = useCallback(() => {
    setTimers((prev) => {
      const key = activeIdRef.current;
      if (key == null || !prev[key] || prev[key].pausedAt) return prev;
      return {
        ...prev,
        [key]: { ...prev[key], pausedAt: new Date().toISOString() },
      };
    });
    setActiveId(null);
  }, []);

  const save = useCallback((key: TimerKey): SaveResult | null => {
    const current = timersRef.current;
    const timer = current[key];
    if (!timer) return null;

    const endTime = new Date().toISOString();
    const durationMinutes = calcDurationMinutes(timer);

    setTimers((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setActiveId((prev: ActiveTimerKey) => (prev === key ? null : prev));

    return {
      issueId: timer.issueId,
      issueSubject: timer.issueSubject,
      projectId: timer.projectId,
      projectName: timer.projectName,
      startTime: timer.startTime,
      endTime,
      durationMinutes,
      instanceId: timer.instanceId,
    };
  }, []);

  const capture = useCallback((key: TimerKey): SaveResult | null => {
    const current = timersRef.current;
    const timer = current[key];
    if (!timer) return null;

    const endTime = new Date().toISOString();
    const durationMinutes = calcDurationMinutes(timer);

    if (!timer.pausedAt) {
      setTimers((prev) => {
        if (!prev[key]) return prev;
        return {
          ...prev,
          [key]: { ...prev[key], pausedAt: new Date().toISOString() },
        };
      });
    }
    setActiveId((prev: ActiveTimerKey) => (prev === key ? null : prev));

    return {
      issueId: timer.issueId,
      issueSubject: timer.issueSubject,
      projectId: timer.projectId,
      projectName: timer.projectName,
      startTime: timer.startTime,
      endTime,
      durationMinutes,
      instanceId: timer.instanceId,
    };
  }, []);

  const adjustElapsed = useCallback((key: TimerKey, deltaSec: number) => {
    setTimers((prev) => {
      const t = prev[key];
      if (!t) return prev;
      const currentElapsed = calcElapsed(t);
      const effectiveDelta = Math.max(deltaSec, -currentElapsed);
      if (effectiveDelta === 0) return prev;
      return {
        ...prev,
        [key]: {
          ...t,
          totalPausedMs: (t.totalPausedMs || 0) - effectiveDelta * 1000,
        },
      };
    });
  }, []);

  const discard = useCallback((key: TimerKey) => {
    setTimers((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setActiveId((prev: ActiveTimerKey) => (prev === key ? null : prev));
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
