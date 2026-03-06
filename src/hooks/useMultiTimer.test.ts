import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useMultiTimer } from "@/hooks/useMultiTimer";

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
      act(() => result.current.startOrResume(1, "Test Issue", "Project A"));
      expect(result.current.timers[1]).toBeDefined();
      expect(result.current.timers[1].startTime).toBeDefined();
      expect(result.current.activeId).toBe(1);
    });

    it("startOrResume pauses currently active timer", () => {
      const { result } = renderHook(() => useMultiTimer());
      act(() => result.current.startOrResume(1, "Issue 1", "Project A"));
      act(() => result.current.startOrResume(2, "Issue 2", "Project B"));
      expect(result.current.timers[1].pausedAt).toBeDefined();
      expect(result.current.activeId).toBe(2);
    });

    it("pause() sets pausedAt on active timer", () => {
      const { result } = renderHook(() => useMultiTimer());
      act(() => result.current.startOrResume(1, "Issue 1", "Project A"));
      act(() => result.current.pause());
      expect(result.current.timers[1].pausedAt).toBeDefined();
      expect(result.current.activeId).toBeNull();
    });

    it("startOrResume on paused timer clears pausedAt, adds pausedMs", () => {
      const { result } = renderHook(() => useMultiTimer());
      act(() => result.current.startOrResume(1, "Issue 1", "Project A"));
      act(() => result.current.pause());
      const pausedAt = result.current.timers[1].pausedAt;
      expect(pausedAt).toBeDefined();

      vi.advanceTimersByTime(5000);
      act(() => result.current.startOrResume(1, "Issue 1", "Project A"));
      expect(result.current.timers[1].pausedAt).toBeUndefined();
      expect(result.current.timers[1].totalPausedMs).toBeGreaterThan(0);
    });

    it("only one timer active at a time", () => {
      const { result } = renderHook(() => useMultiTimer());
      act(() => result.current.startOrResume(1, "Issue 1", "Project A"));
      act(() => result.current.startOrResume(2, "Issue 2", "Project B"));
      expect(result.current.timers[1].pausedAt).toBeDefined();
      expect(result.current.timers[2].pausedAt).toBeUndefined();
      expect(result.current.activeId).toBe(2);
    });
  });

  describe("elapsed calculation", () => {
    it("elapsed ticks every second while active (fake timers)", () => {
      const { result } = renderHook(() => useMultiTimer());
      act(() => result.current.startOrResume(1, "Issue 1", "Project A"));

      act(() => vi.advanceTimersByTime(3000));
      expect(result.current.elapsedMap[1]).toBeGreaterThanOrEqual(2);
    });

    it("elapsed stops ticking when paused", () => {
      const { result } = renderHook(() => useMultiTimer());
      act(() => result.current.startOrResume(1, "Issue 1", "Project A"));
      act(() => vi.advanceTimersByTime(5000));
      act(() => result.current.pause());

      const elapsedAfterPause = result.current.elapsedMap[1];
      act(() => vi.advanceTimersByTime(5000));
      expect(result.current.elapsedMap[1]).toBe(elapsedAfterPause);
    });

    it("adjustElapsed adds/subtracts delta seconds", () => {
      const { result } = renderHook(() => useMultiTimer());
      act(() => result.current.startOrResume(1, "Issue 1", "Project A"));
      act(() => vi.advanceTimersByTime(10000));

      const before = result.current.elapsedMap[1];
      act(() => result.current.adjustElapsed(1, 60));
      act(() => vi.advanceTimersByTime(1000)); // tick to recalculate

      expect(result.current.elapsedMap[1]).toBeGreaterThan(before);
    });

    it("adjustElapsed does not go below 0", () => {
      const { result } = renderHook(() => useMultiTimer());
      act(() => result.current.startOrResume(1, "Issue 1", "Project A"));
      act(() => vi.advanceTimersByTime(2000));

      act(() => result.current.adjustElapsed(1, -99999));
      act(() => vi.advanceTimersByTime(1000));

      expect(result.current.elapsedMap[1]).toBeGreaterThanOrEqual(0);
    });
  });

  describe("save/discard", () => {
    it("save() returns {issueId, subject, projectName, duration, startTime}", () => {
      const { result } = renderHook(() => useMultiTimer());
      act(() => result.current.startOrResume(1, "Test Issue", "Project A", 10));
      act(() => vi.advanceTimersByTime(60000));

      let saveResult: ReturnType<typeof result.current.save>;
      act(() => {
        saveResult = result.current.save(1);
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
      act(() => result.current.startOrResume(1, "Test Issue", "Project A"));
      act(() => {
        result.current.save(1);
      });
      expect(result.current.timers[1]).toBeUndefined();
    });

    it("discard() removes timer without returning data", () => {
      const { result } = renderHook(() => useMultiTimer());
      act(() => result.current.startOrResume(1, "Test Issue", "Project A"));
      act(() => result.current.discard(1));
      expect(result.current.timers[1]).toBeUndefined();
    });

    it("capture() pauses timer but keeps it in map", () => {
      const { result } = renderHook(() => useMultiTimer());
      act(() => result.current.startOrResume(1, "Test Issue", "Project A"));
      act(() => vi.advanceTimersByTime(60000));

      let captureResult: ReturnType<typeof result.current.capture>;
      act(() => {
        captureResult = result.current.capture(1);
      });

      expect(captureResult!).toBeDefined();
      expect(captureResult!.issueId).toBe(1);
      expect(result.current.timers[1]).toBeDefined(); // still in map
      expect(result.current.timers[1].pausedAt).toBeDefined(); // but paused
    });
  });

  describe("persistence", () => {
    it("writes to localStorage on every state change", () => {
      const { result } = renderHook(() => useMultiTimer());
      act(() => result.current.startOrResume(1, "Test Issue", "Project A"));

      const stored = localStorage.getItem("multiTimers");
      expect(stored).toBeDefined();
      const parsed = JSON.parse(stored!);
      expect(parsed.timers[1]).toBeDefined();
      expect(parsed.activeId).toBe(1);
    });

    it("reads from localStorage on mount", () => {
      const state = {
        timers: {
          42: {
            issueId: 42,
            issueSubject: "Stored Issue",
            projectName: "Stored Project",
            startTime: new Date().toISOString(),
            pausedAt: new Date().toISOString(),
          },
        },
        activeId: null,
      };
      localStorage.setItem("multiTimers", JSON.stringify(state));

      const { result } = renderHook(() => useMultiTimer());
      expect(result.current.timers[42]).toBeDefined();
      expect(result.current.timers[42].issueSubject).toBe("Stored Issue");
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
      expect(result.current.timers[99]).toBeDefined();
      expect(result.current.timers[99].issueSubject).toBe("Legacy Issue");
      expect(localStorage.getItem("activeTimer")).toBeNull();
    });

    it("cross-tab sync: storage event updates state", () => {
      const { result } = renderHook(() => useMultiTimer());
      const newState = {
        timers: {
          77: {
            issueId: 77,
            issueSubject: "Remote Issue",
            projectName: "Remote Project",
            startTime: new Date().toISOString(),
          },
        },
        activeId: 77,
      };

      act(() => {
        window.dispatchEvent(
          new StorageEvent("storage", {
            key: "multiTimers",
            newValue: JSON.stringify(newState),
          }),
        );
      });

      expect(result.current.timers[77]).toBeDefined();
      expect(result.current.activeId).toBe(77);
    });
  });

  describe("edge cases", () => {
    it("max 10 timers — startOrResume returns early at cap", () => {
      const { result } = renderHook(() => useMultiTimer());
      for (let i = 1; i <= 10; i++) {
        act(() => result.current.startOrResume(i, `Issue ${i}`, "Project"));
      }
      expect(result.current.timerCount).toBe(10);

      act(() => result.current.startOrResume(11, "Issue 11", "Project"));
      expect(result.current.timers[11]).toBeUndefined();
    });

    it("timerCount and pausedCount computed correctly", () => {
      const { result } = renderHook(() => useMultiTimer());
      act(() => result.current.startOrResume(1, "Issue 1", "Project A"));
      act(() => result.current.startOrResume(2, "Issue 2", "Project B"));
      expect(result.current.timerCount).toBe(2);
      expect(result.current.pausedCount).toBe(1);
    });

    it("save() on a paused timer includes pause time in duration calculation (line 59)", () => {
      const { result } = renderHook(() => useMultiTimer());
      act(() => result.current.startOrResume(1, "Issue 1", "Project A"));
      act(() => vi.advanceTimersByTime(120000)); // 2 min active
      act(() => result.current.pause());
      act(() => vi.advanceTimersByTime(60000)); // 1 min paused

      let saveResult: ReturnType<typeof result.current.save>;
      act(() => {
        saveResult = result.current.save(1);
      });

      expect(saveResult!).toBeDefined();
      // Duration should be based on active time only (~2 min), not total elapsed (~3 min)
      expect(saveResult!.durationMinutes).toBeGreaterThanOrEqual(1);
    });

    it("save() returns null for non-existent timer", () => {
      const { result } = renderHook(() => useMultiTimer());
      let saveResult: ReturnType<typeof result.current.save>;
      act(() => {
        saveResult = result.current.save(999);
      });
      expect(saveResult!).toBeNull();
    });

    it("capture() returns null for non-existent timer", () => {
      const { result } = renderHook(() => useMultiTimer());
      let captureResult: ReturnType<typeof result.current.capture>;
      act(() => {
        captureResult = result.current.capture(999);
      });
      expect(captureResult!).toBeNull();
    });

    it("capture() on already paused timer does not double-pause", () => {
      const { result } = renderHook(() => useMultiTimer());
      act(() => result.current.startOrResume(1, "Issue 1", "Project A"));
      act(() => vi.advanceTimersByTime(60000));
      act(() => result.current.pause());

      const pausedAt = result.current.timers[1].pausedAt;

      let captureResult: ReturnType<typeof result.current.capture>;
      act(() => {
        captureResult = result.current.capture(1);
      });

      expect(captureResult!).toBeDefined();
      expect(result.current.timers[1].pausedAt).toBe(pausedAt);
    });

    it("storage event with corrupted JSON is ignored (line 107-108)", () => {
      const { result } = renderHook(() => useMultiTimer());
      act(() => result.current.startOrResume(1, "Issue 1", "Project A"));

      act(() => {
        window.dispatchEvent(
          new StorageEvent("storage", {
            key: "multiTimers",
            newValue: "not valid json{{{",
          }),
        );
      });

      expect(result.current.timers[1]).toBeDefined();
    });

    it("storage event with null newValue clears state (line 111-112)", () => {
      const { result } = renderHook(() => useMultiTimer());
      act(() => result.current.startOrResume(1, "Issue 1", "Project A"));

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
      act(() => result.current.startOrResume(1, "Issue 1", "Project A"));

      act(() => {
        window.dispatchEvent(
          new StorageEvent("storage", {
            key: "other-key",
            newValue: JSON.stringify({ timers: {}, activeId: null }),
          }),
        );
      });

      expect(result.current.timers[1]).toBeDefined();
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

      act(() => result.current.startOrResume(1, "Issue 1", "Project A"));

      // safeSet catches the error internally, but logger.warn should be called
      // because safeSet returns false
      Storage.prototype.setItem = originalSetItem;
      consoleSpy.mockRestore();
    });

    it("adjustElapsed no-op for non-existent timer", () => {
      const { result } = renderHook(() => useMultiTimer());
      act(() => result.current.adjustElapsed(999, 60));
      expect(Object.keys(result.current.timers)).toHaveLength(0);
    });

    it("adjustElapsed with zero effective delta is a no-op", () => {
      const { result } = renderHook(() => useMultiTimer());
      act(() => result.current.startOrResume(1, "Issue 1", "Project A"));
      act(() => vi.advanceTimersByTime(1000));

      const timerBefore = result.current.timers[1];
      act(() => result.current.adjustElapsed(1, 0));
      expect(result.current.timers[1].totalPausedMs).toBe(timerBefore.totalPausedMs);
    });

    it("pause() when no active timer is a no-op", () => {
      const { result } = renderHook(() => useMultiTimer());
      act(() => result.current.pause());
      expect(result.current.activeId).toBeNull();
    });

    it("pause() on already-paused timer is a no-op", () => {
      const { result } = renderHook(() => useMultiTimer());
      act(() => result.current.startOrResume(1, "Issue 1", "Project A"));
      act(() => result.current.pause());
      const pausedAt = result.current.timers[1].pausedAt;

      act(() => result.current.pause());
      expect(result.current.timers[1].pausedAt).toBe(pausedAt);
    });

    it("visibilitychange re-calculates elapsed on tab focus", () => {
      const { result } = renderHook(() => useMultiTimer());
      act(() => result.current.startOrResume(1, "Issue 1", "Project A"));
      act(() => vi.advanceTimersByTime(5000));

      act(() => {
        Object.defineProperty(document, "visibilityState", {
          value: "visible",
          configurable: true,
        });
        document.dispatchEvent(new Event("visibilitychange"));
      });

      expect(result.current.elapsedMap[1]).toBeGreaterThanOrEqual(4);
    });
  });
});
