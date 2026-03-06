import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useAppContext, AppProvider } from "./AppContext";
import type { AppContextValue } from "./AppContext";
import type { ReactNode } from "react";

function makeValue(overrides?: Partial<AppContextValue>): AppContextValue {
  return {
    user: { id: 1, login: "admin", firstname: "A", lastname: "B" } as any,
    redmineUrl: "http://redmine.test",
    route: { section: "tickets" } as any,
    navigate: () => {},
    todayMinutes: 120,
    weekMinutes: 600,
    unsyncedCount: 3,
    themeMode: "light",
    setThemeMode: () => {},
    loading: false,
    isRefreshing: false,
    onRefresh: () => {},
    ...overrides,
  };
}

describe("useAppContext", () => {
  it("returns context value when inside AppProvider", () => {
    const value = makeValue();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <AppProvider value={value}>{children}</AppProvider>
    );
    const { result } = renderHook(() => useAppContext(), { wrapper });
    expect(result.current.user.login).toBe("admin");
    expect(result.current.todayMinutes).toBe(120);
  });

  it("throws when used outside AppProvider", () => {
    expect(() => {
      renderHook(() => useAppContext());
    }).toThrow("useAppContext must be used within AppProvider");
  });
});
