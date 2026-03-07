import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useOverflowChips } from "./useOverflowChips";

describe("useOverflowChips", () => {
  it("returns containerRef and visibleCount equal to itemCount initially", () => {
    const { result } = renderHook(() => useOverflowChips(5));
    expect(result.current.containerRef).toBeDefined();
    expect(result.current.containerRef.current).toBeNull();
    expect(result.current.visibleCount).toBe(5);
  });

  it("updates visibleCount when itemCount changes", () => {
    const { result, rerender } = renderHook(({ count }) => useOverflowChips(count), {
      initialProps: { count: 5 },
    });
    expect(result.current.visibleCount).toBe(5);
    rerender({ count: 3 });
    expect(result.current.visibleCount).toBe(3);
  });

  it("resets visibleCount to new itemCount on each change", () => {
    const { result, rerender } = renderHook(({ count }) => useOverflowChips(count), {
      initialProps: { count: 10 },
    });
    expect(result.current.visibleCount).toBe(10);
    rerender({ count: 7 });
    expect(result.current.visibleCount).toBe(7);
    rerender({ count: 2 });
    expect(result.current.visibleCount).toBe(2);
  });

  it("visibleCount never exceeds itemCount after reset", () => {
    const { result, rerender } = renderHook(({ count }) => useOverflowChips(count), {
      initialProps: { count: 20 },
    });
    rerender({ count: 5 });
    expect(result.current.visibleCount).toBeLessThanOrEqual(5);
  });

  it("handles zero itemCount", () => {
    const { result } = renderHook(() => useOverflowChips(0));
    expect(result.current.visibleCount).toBe(0);
  });
});
