import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSnackbar } from "@/hooks/useSnackbar";

describe("useSnackbar", () => {
  it("starts with null snackbar", () => {
    const { result } = renderHook(() => useSnackbar());
    expect(result.current.snackbar).toBeNull();
  });

  it("showSnackbar sets message", () => {
    const { result } = renderHook(() => useSnackbar());
    act(() => result.current.showSnackbar("Hello"));
    expect(result.current.snackbar).toEqual({ message: "Hello" });
  });

  it("showSnackbar with action", () => {
    const { result } = renderHook(() => useSnackbar());
    const action = { label: "Undo", onClick: () => {} };
    act(() => result.current.showSnackbar("Deleted", action));
    expect(result.current.snackbar).toEqual({ message: "Deleted", action });
  });

  it("dismissSnackbar clears snackbar", () => {
    const { result } = renderHook(() => useSnackbar());
    act(() => result.current.showSnackbar("Test"));
    act(() => result.current.dismissSnackbar());
    expect(result.current.snackbar).toBeNull();
  });

  it("showSnackbar replaces previous message", () => {
    const { result } = renderHook(() => useSnackbar());
    act(() => result.current.showSnackbar("First"));
    act(() => result.current.showSnackbar("Second"));
    expect(result.current.snackbar?.message).toBe("Second");
  });
});
