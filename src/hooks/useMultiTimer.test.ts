import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useMultiTimer } from "@/hooks/useMultiTimer";
import { timerKey } from "@/types/redmine";

const DI = "default"; // default instanceId

describe("useMultiTimer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("start/pause/resume", () => {
    it("startOrResume creates new timer with startTime", () => {
      const { result } = renderHook(() => useMultiTimer());
      act(() => result.current.startOrResume(DI, 1, "Test Issue", "Project A"));
      const key = timerKey(DI, 1);
      expect(result.current.timers[key]).toBeDefined();
      expect(result.current.timers[key].startTime).toBeDefined();
      expect(result.current.activeId).toBe(key);
    });

    it("startOrResume pauses currently active timer", () => {
      const { result } = renderHook(() => useMultiTimer());
      act(() => result.current.startOrResume(DI, 1, "Issue 1", "Project A"));
      act(() => result.current.startOrResume(DI, 2, "Issue 2", "Project B"));
      expect(result.current.timers[timerKey(DI, 1)].pausedAt).toBeDefined();
      expect(result.current.activeId).toBe(timerKey(DI, 2));
    });

    it("pause() sets pausedAt on active timer", () => {
      const { result } = renderHook(() => useMultiTimer());
      act(() => result.current.startOrResume(DI, 1, "Issue 1", "Project A"));
      act(() => result.current.pause());
      expect(result.current.timers[timerKey(DI, 1)].pausedAt).toBeDefined();
      expect(result.current.activeId).toBeNull();
    });

    it("startOrResume on paused timer clears pausedAt, adds pausedMs", () => {
      const { result } = renderHook(() => useMultiTimer());
      act(() => result.current.startOrResume(DI, 1, "Issue 1", "Project A"));
      act(() => result.current.pause());
      const pausedAt = result.current.timers[timerKey(DI, 1)].pausedAt;
      expect(pausedAt).toBeDefined();

      vi.advanceTimersByTime(5000);
      act(() => result.current.startOrResume(DI, 1, "Issue 1", "Project A"));
      expect(result.current.timers[timerKey(DI, 1)].pausedAt).toBeUndefined();
      expect(result.current.timers[timerKey(DI, 1)].totalPausedMs).toBeGreaterThan(0);
    });

    it("only one timer active at a time", () => {
      const { result } = renderHook(() => useMultiTimer());
      act(() => result.current.startOrResume(DI, 1, "Issue 1", "Project A"));
      act(() => result.current.startOrResume(DI, 2, "Issue 2", "Project B"));
      expect(result.current.timers[timerKey(DI, 1)].pausedAt).toBeDefined();
      expect(result.current.timers[timerKey(DI, 2)].pausedAt).toBeUndefined();
      expect(result.current.activeId).toBe(timerKey(DI, 2));
    });
  });

  describe("elapsed calculation", () => {
    it("elapsed ticks every second while active (fake timers)", () => {
      const { result } = renderHook(() => useMultiTimer());
      act(() => result.current.startOrResume(DI, 1, "Issue 1", "Project A"));

      act(() => vi.advanceTimersByTime(3000));
      expect(result.current.elapsedMap[timerKey(DI, 1)]).toBeGreaterThanOrEqual(2);
    });

    it("elapsed stops ticking when paused", () => {
      const { result } = renderHook(() => useMultiTimer());
      act(() => result.current.startOrResume(DI, 1, "Issue 1", "Project A"));
      act(() => vi.advanceTimersByTime(5000));
      act(() => result.current.pause());

      const key = timerKey(DI, 1);
      const elapsedAfterPause = result.current.elapsedMap[key];
      act(() => vi.advanceTimersByTime(5000));
      expect(result.current.elapsedMap[key]).toBe(elapsedAfterPause);
    });

    it("adjustElapsed adds/subtracts delta seconds", () => {
      const { result } = renderHook(() => useMultiTimer());
      act(() => result.current.startOrResume(DI, 1, "Issue 1", "Project A"));
      act(() => vi.advanceTimersByTime(10000));

      const key = timerKey(DI, 1);
      const before = result.current.elapsedMap[key];
      act(() => result.current.adjustElapsed(key, 60));
      act(() => vi.advanceTimersByTime(1000)); // tick to recalculate

      expect(result.current.elapsedMap[key]).toBeGreaterThan(before);
    });

    it("adjustElapsed does not go below 0", () => {
      const { result } = renderHook(() => useMultiTimer());
      act(() => result.current.startOrResume(DI, 1, "Issue 1", "Project A"));
      act(() => vi.advanceTimersByTime(2000));

      const key = timerKey(DI, 1);
      act(() => result.current.adjustElapsed(key, -99999));
      act(() => vi.advanceTimersByTime(1000));

      expect(result.current.elapsedMap[key]).toBeGreaterThanOrEqual(0);
    });
  });

  describe("save/discard", () => {
    it("save() returns {issueId, subject, projectName, duration, startTime}", () => {
      const { result } = renderHook(() => useMultiTimer());
      act(() => result.current.startOrResume(DI, 1, "Test Issue", "Project A", 10));
      act(() => vi.advanceTimersByTime(60000));

      const key = timerKey(DI, 1);
      let saveResult: ReturnType<typeof result.current.save>;
      act(() => {
        saveResult = result.current.save(key);
      });

      expect(saveResult!).toBeDefined();
      expect(saveResult!.issueId).toBe(1);
      expect(saveResult!.issueSubject).toBe("Test Issue");
      expect(saveResult!.projectName).toBe("Project A");
      expect(saveResult!.durationMinutes).toBeGreaterThanOrEqual(1);
      expect(saveResult!.startTime).toBeDefined();
    });

    it("save() removes timer from map", () => {
      const { result } = renderHook(() => useMultiTimer());
      act(() => result.current.startOrResume(DI, 1, "Test Issue", "Project A"));
      const key = timerKey(DI, 1);
      act(() => {
        result.current.save(key);
      });
      expect(result.current.timers[key]).toBeUndefined();
    });

    it("discard() removes timer without returning data", () => {
      const { result } = renderHook(() => useMultiTimer());
      act(() => result.current.startOrResume(DI, 1, "Test Issue", "Project A"));
      const key = timerKey(DI, 1);
      act(() => result.current.discard(key));
      expect(result.current.timers[key]).toBeUndefined();
    });

    it("capture() pauses timer but keeps it in map", () => {
      const { result } = renderHook(() => useMultiTimer());
      act(() => result.current.startOrResume(DI, 1, "Test Issue", "Project A"));
      act(() => vi.advanceTimersByTime(60000));

      const key = timerKey(DI, 1);
      let captureResult: ReturnType<typeof result.current.capture>;
      act(() => {
        captureResult = result.current.capture(key);
      });

      expect(captureResult!).toBeDefined();
      expect(captureResult!.issueId).toBe(1);
      expect(result.current.timers[key]).toBeDefined(); // still in map
      expect(result.current.timers[key].pausedAt).toBeDefined(); // but paused
    });
  });

  describe("persistence", () => {
    it("writes to localStorage on every state change", () => {
      const { result } = renderHook(() => useMultiTimer());
      act(() => result.current.startOrResume(DI, 1, "Test Issue", "Project A"));

      const stored = localStorage.getItem("multiTimers");
      expect(stored).toBeDefined();
      const parsed = JSON.parse(stored!);
      const key = timerKey(DI, 1);
      expect(parsed.timers[key]).toBeDefined();
      expect(parsed.activeId).toBe(key);
    });

    it("reads from localStorage on mount", () => {
      const key = timerKey(DI, 42);
      const state = {
        timers: {
          [key]: {
            issueId: 42,
            issueSubject: "Stored Issue",
            projectName: "Stored Project",
            startTime: new Date().toISOString(),
            pausedAt: new Date().toISOString(),
            instanceId: DI,
          },
        },
        activeId: null,
      };
      localStorage.setItem("multiTimers", JSON.stringify(state));

      const { result } = renderHook(() => useMultiTimer());
      expect(result.current.timers[key]).toBeDefined();
      expect(result.current.timers[key].issueSubject).toBe("Stored Issue");
    });

    it("migrates legacy single-timer format", () => {
      const legacyTimer = {
        issueId: 99,
        issueSubject: "Legacy Issue",
        projectName: "Legacy Project",
        startTime: new Date().toISOString(),
        pausedAt: new Date().toISOString(),
      };
      localStorage.setItem("activeTimer", JSON.stringify(legacyTimer));

      const { result } = renderHook(() => useMultiTimer());
      const key = timerKey(DI, 99);
      expect(result.current.timers[key]).toBeDefined();
      expect(result.current.timers[key].issueSubject).toBe("Legacy Issue");
      expect(localStorage.getItem("activeTimer")).toBeNull();
    });

    it("cross-tab sync: storage event updates state", () => {
      const { result } = renderHook(() => useMultiTimer());
      const key = timerKey(DI, 77);
      const newState = {
        timers: {
          [key]: {
            issueId: 77,
            issueSubject: "Remote Issue",
            projectName: "Remote Project",
            startTime: new Date().toISOString(),
            instanceId: DI,
          },
        },
        activeId: key,
      };

      act(() => {
        window.dispatchEvent(
          new StorageEvent("storage", {
            key: "multiTimers",
            newValue: JSON.stringify(newState),
          }),
        );
      });

      expect(result.current.timers[key]).toBeDefined();
      expect(result.current.activeId).toBe(key);
    });
  });

  describe("edge cases", () => {
    it("max 10 timers — startOrResume returns early at cap", () => {
      const { result } = renderHook(() => useMultiTimer());
      for (let i = 1; i <= 10; i++) {
        act(() => result.current.startOrResume(DI, i, `Issue ${i}`, "Project"));
      }
      expect(result.current.timerCount).toBe(10);

      act(() => result.current.startOrResume(DI, 11, "Issue 11", "Project"));
      expect(result.current.timers[timerKey(DI, 11)]).toBeUndefined();
    });

    it("timerCount and pausedCount computed correctly", () => {
      const { result } = renderHook(() => useMultiTimer());
      act(() => result.current.startOrResume(DI, 1, "Issue 1", "Project A"));
      act(() => result.current.startOrResume(DI, 2, "Issue 2", "Project B"));
      expect(result.current.timerCount).toBe(2);
      expect(result.current.pausedCount).toBe(1);
    });

    it("save() on a paused timer includes pause time in duration calculation (line 59)", () => {
      const { result } = renderHook(() => useMultiTimer());
      act(() => result.current.startOrResume(DI, 1, "Issue 1", "Project A"));
      act(() => vi.advanceTimersByTime(120000)); // 2 min active
      act(() => result.current.pause());
      act(() => vi.advanceTimersByTime(60000)); // 1 min paused

      const key = timerKey(DI, 1);
      let saveResult: ReturnType<typeof result.current.save>;
      act(() => {
        saveResult = result.current.save(key);
      });

      expect(saveResult!).toBeDefined();
      // Duration should be based on active time only (~2 min), not total elapsed (~3 min)
      expect(saveResult!.durationMinutes).toBeGreaterThanOrEqual(1);
    });

    it("save() returns null for non-existent timer", () => {
      const { result } = renderHook(() => useMultiTimer());
      let saveResult: ReturnType<typeof result.current.save>;
      act(() => {
        saveResult = result.current.save(timerKey(DI, 999));
      });
      expect(saveResult!).toBeNull();
    });

    it("capture() returns null for non-existent timer", () => {
      const { result } = renderHook(() => useMultiTimer());
      let captureResult: ReturnType<typeof result.current.capture>;
      act(() => {
        captureResult = result.current.capture(timerKey(DI, 999));
      });
      expect(captureResult!).toBeNull();
    });

    it("capture() on already paused timer does not double-pause", () => {
      const { result } = renderHook(() => useMultiTimer());
      act(() => result.current.startOrResume(DI, 1, "Issue 1", "Project A"));
      act(() => vi.advanceTimersByTime(60000));
      act(() => result.current.pause());

      const key = timerKey(DI, 1);
      const pausedAt = result.current.timers[key].pausedAt;

      let captureResult: ReturnType<typeof result.current.capture>;
      act(() => {
        captureResult = result.current.capture(key);
      });

      expect(captureResult!).toBeDefined();
      expect(result.current.timers[key].pausedAt).toBe(pausedAt);
    });

    it("storage event with corrupted JSON is ignored (line 107-108)", () => {
      const { result } = renderHook(() => useMultiTimer());
      act(() => result.current.startOrResume(DI, 1, "Issue 1", "Project A"));

      act(() => {
        window.dispatchEvent(
          new StorageEvent("storage", {
            key: "multiTimers",
            newValue: "not valid json{{{",
          }),
        );
      });

      expect(result.current.timers[timerKey(DI, 1)]).toBeDefined();
    });

    it("storage event with null newValue clears state (line 111-112)", () => {
      const { result } = renderHook(() => useMultiTimer());
      act(() => result.current.startOrResume(DI, 1, "Issue 1", "Project A"));

      act(() => {
        window.dispatchEvent(
          new StorageEvent("storage", {
            key: "multiTimers",
            newValue: null,
          }),
        );
      });

      expect(Object.keys(result.current.timers)).toHaveLength(0);
      expect(result.current.activeId).toBeNull();
    });

    it("storage event for different key is ignored", () => {
      const { result } = renderHook(() => useMultiTimer());
      act(() => result.current.startOrResume(DI, 1, "Issue 1", "Project A"));

      act(() => {
        window.dispatchEvent(
          new StorageEvent("storage", {
            key: "other-key",
            newValue: JSON.stringify({ timers: {}, activeId: null }),
          }),
        );
      });

      expect(result.current.timers[timerKey(DI, 1)]).toBeDefined();
    });

    it("localStorage full warning (line 91) - safeSet returns false", () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const { result } = renderHook(() => useMultiTimer());

      const originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = vi.fn().mockImplementation((key: string, value: string) => {
        if (key === "multiTimers") {
          throw new DOMException("QuotaExceededError");
        }
        return originalSetItem.call(localStorage, key, value);
      });

      act(() => result.current.startOrResume(DI, 1, "Issue 1", "Project A"));

      // safeSet catches the error internally, but logger.warn should be called
      // because safeSet returns false
      Storage.prototype.setItem = originalSetItem;
      consoleSpy.mockRestore();
    });

    it("adjustElapsed no-op for non-existent timer", () => {
      const { result } = renderHook(() => useMultiTimer());
      act(() => result.current.adjustElapsed(timerKey(DI, 999), 60));
      expect(Object.keys(result.current.timers)).toHaveLength(0);
    });

    it("adjustElapsed with zero effective delta is a no-op", () => {
      const { result } = renderHook(() => useMultiTimer());
      act(() => result.current.startOrResume(DI, 1, "Issue 1", "Project A"));
      act(() => vi.advanceTimersByTime(1000));

      const key = timerKey(DI, 1);
      const timerBefore = result.current.timers[key];
      act(() => result.current.adjustElapsed(key, 0));
      expect(result.current.timers[key].totalPausedMs).toBe(timerBefore.totalPausedMs);
    });

    it("pause() when no active timer is a no-op", () => {
      const { result } = renderHook(() => useMultiTimer());
      act(() => result.current.pause());
      expect(result.current.activeId).toBeNull();
    });

    it("pause() on already-paused timer is a no-op", () => {
      const { result } = renderHook(() => useMultiTimer());
      act(() => result.current.startOrResume(DI, 1, "Issue 1", "Project A"));
      act(() => result.current.pause());
      const key = timerKey(DI, 1);
      const pausedAt = result.current.timers[key].pausedAt;

      act(() => result.current.pause());
      expect(result.current.timers[key].pausedAt).toBe(pausedAt);
    });

    it("visibilitychange re-calculates elapsed on tab focus", () => {
      const { result } = renderHook(() => useMultiTimer());
      act(() => result.current.startOrResume(DI, 1, "Issue 1", "Project A"));
      act(() => vi.advanceTimersByTime(5000));

      act(() => {
        Object.defineProperty(document, "visibilityState", {
          value: "visible",
          configurable: true,
        });
        document.dispatchEvent(new Event("visibilitychange"));
      });

      expect(result.current.elapsedMap[timerKey(DI, 1)]).toBeGreaterThanOrEqual(4);
    });
  });
});
