import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useVisibilityRefresh } from "@/hooks/useVisibilityRefresh";

describe("useVisibilityRefresh", () => {
  let fetchIssues: ReturnType<typeof vi.fn<() => void>>;
  let refreshPinned: ReturnType<typeof vi.fn<() => void>>;
  let refreshRemoteEntries: ReturnType<typeof vi.fn<() => void>>;

  beforeEach(() => {
    vi.useFakeTimers();
    fetchIssues = vi.fn<() => void>();
    refreshPinned = vi.fn<() => void>();
    refreshRemoteEntries = vi.fn<() => void>();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function renderVisibility() {
    return renderHook(() =>
      useVisibilityRefresh({ fetchIssues, refreshPinned, refreshRemoteEntries }),
    );
  }

  function simulateVisibilityChange(state: "visible" | "hidden") {
    Object.defineProperty(document, "visibilityState", { value: state, writable: true });
    document.dispatchEvent(new Event("visibilitychange"));
  }

  it("no refresh on initial mount", () => {
    renderVisibility();
    expect(fetchIssues).not.toHaveBeenCalled();
    expect(refreshPinned).not.toHaveBeenCalled();
    expect(refreshRemoteEntries).not.toHaveBeenCalled();
  });

  it("tab hidden → no action", () => {
    renderVisibility();
    vi.advanceTimersByTime(3 * 60 * 1000); // 3 minutes
    simulateVisibilityChange("hidden");
    expect(fetchIssues).not.toHaveBeenCalled();
  });

  it("tab visible after <2min → no refresh", () => {
    renderVisibility();
    vi.advanceTimersByTime(60 * 1000); // 1 minute
    simulateVisibilityChange("visible");
    expect(fetchIssues).not.toHaveBeenCalled();
  });

  it("tab visible after >2min → triggers refresh callback", () => {
    renderVisibility();
    vi.advanceTimersByTime(3 * 60 * 1000); // 3 minutes
    simulateVisibilityChange("visible");
    expect(fetchIssues).toHaveBeenCalledTimes(1);
    expect(refreshPinned).toHaveBeenCalledTimes(1);
    expect(refreshRemoteEntries).toHaveBeenCalledTimes(1);
  });

  it("updates lastFetchRef after successful refresh", () => {
    const { result } = renderVisibility();
    const before = result.current.lastFetchRef.current;
    vi.advanceTimersByTime(3 * 60 * 1000);
    simulateVisibilityChange("visible");
    expect(result.current.lastFetchRef.current).toBeGreaterThan(before);
  });

  it("cleanup: removes visibilitychange listener on unmount", () => {
    const { unmount } = renderVisibility();
    unmount();
    vi.advanceTimersByTime(3 * 60 * 1000);
    simulateVisibilityChange("visible");
    expect(fetchIssues).not.toHaveBeenCalled();
  });

  it("consecutive visible events within 2min → only first triggers refresh", () => {
    renderVisibility();
    vi.advanceTimersByTime(3 * 60 * 1000);
    simulateVisibilityChange("visible"); // triggers refresh, resets timer
    expect(fetchIssues).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(30 * 1000); // 30 seconds later
    simulateVisibilityChange("visible"); // should NOT trigger
    expect(fetchIssues).toHaveBeenCalledTimes(1);
  });
});
