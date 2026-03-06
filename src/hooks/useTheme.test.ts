import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTheme } from "@/hooks/useTheme";

describe("useTheme", () => {
  let matchMediaListeners: Array<(e: { matches: boolean }) => void>;

  beforeEach(() => {
    matchMediaListeners = [];
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query === "(prefers-color-scheme: dark)" ? false : false,
        media: query,
        addEventListener: (_: string, cb: (e: { matches: boolean }) => void) => {
          matchMediaListeners.push(cb);
        },
        removeEventListener: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    document.documentElement.removeAttribute("data-theme");
  });

  it('defaults to "system" when localStorage empty', () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.mode).toBe("system");
  });

  it("reads stored mode from localStorage", () => {
    localStorage.setItem("theme-mode", "dark");
    const { result } = renderHook(() => useTheme());
    expect(result.current.mode).toBe("dark");
  });

  it('ignores invalid localStorage value → "system"', () => {
    localStorage.setItem("theme-mode", "invalid");
    const { result } = renderHook(() => useTheme());
    expect(result.current.mode).toBe("system");
  });

  it('setMode("dark") → sets data-theme="dark" on <html>', () => {
    const { result } = renderHook(() => useTheme());
    act(() => result.current.setMode("dark"));
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it('setMode("light") → sets data-theme="light" on <html>', () => {
    const { result } = renderHook(() => useTheme());
    act(() => result.current.setMode("light"));
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  it('setMode("system") → resolves from matchMedia preference', () => {
    // matchMedia returns false for dark → system resolves to "light"
    const { result } = renderHook(() => useTheme());
    act(() => result.current.setMode("system"));
    expect(result.current.resolved).toBe("light");
  });

  it("persists mode to localStorage on change", () => {
    const { result } = renderHook(() => useTheme());
    act(() => result.current.setMode("dark"));
    expect(localStorage.getItem("theme-mode")).toBe("dark");
  });

  it("toggle() switches light↔dark", () => {
    const { result } = renderHook(() => useTheme());
    act(() => result.current.toggle());
    expect(result.current.mode).toBe("dark");
    act(() => result.current.toggle());
    expect(result.current.mode).toBe("light");
  });

  it("system mode reacts to OS preference change (matchMedia listener)", () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.mode).toBe("system");

    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query === "(prefers-color-scheme: dark)",
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });

    act(() => {
      for (const listener of matchMediaListeners) {
        listener({ matches: true });
      }
    });

    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });
});
