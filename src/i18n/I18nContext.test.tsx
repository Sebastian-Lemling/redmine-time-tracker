import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { I18nProvider, useI18n } from "@/i18n/I18nContext";
import type { ReactNode } from "react";

function wrapper({ children }: { children: ReactNode }) {
  return <I18nProvider>{children}</I18nProvider>;
}

describe("I18nProvider", () => {
  beforeEach(() => {
    Object.defineProperty(navigator, "language", {
      value: "fr-FR",
      configurable: true,
    });
  });

  it('defaults to "en" when no localStorage and navigator.language unmatched', () => {
    const { result } = renderHook(() => useI18n(), { wrapper });
    expect(result.current.locale).toBe("en");
  });

  it("reads locale from localStorage", () => {
    localStorage.setItem("locale", "en");
    const { result } = renderHook(() => useI18n(), { wrapper });
    expect(result.current.locale).toBe("en");
  });

  it('detects locale from navigator.language prefix ("en-US" → "en")', () => {
    Object.defineProperty(navigator, "language", {
      value: "en-US",
      configurable: true,
    });
    const { result } = renderHook(() => useI18n(), { wrapper });
    expect(result.current.locale).toBe("en");
  });

  it("sets document.documentElement.lang on mount", () => {
    renderHook(() => useI18n(), { wrapper });
    expect(document.documentElement.lang).toBe("en");
  });

  it("setLocale updates translations, persists to localStorage, updates lang attribute", () => {
    const { result } = renderHook(() => useI18n(), { wrapper });
    act(() => result.current.setLocale("de"));
    expect(result.current.locale).toBe("de");
    expect(localStorage.getItem("locale")).toBe("de");
    expect(document.documentElement.lang).toBe("de");
    expect(result.current.t.today).toBe("Heute");
  });
});

describe("useI18n", () => {
  it("returns {locale, t, setLocale, locales}", () => {
    const { result } = renderHook(() => useI18n(), { wrapper });
    expect(result.current).toHaveProperty("locale");
    expect(result.current).toHaveProperty("t");
    expect(result.current).toHaveProperty("setLocale");
    expect(result.current).toHaveProperty("locales");
  });

  it("throws when used outside I18nProvider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useI18n())).toThrow("useI18n must be used within I18nProvider");
    spy.mockRestore();
  });

  it("t contains all translation keys for current locale", () => {
    const { result } = renderHook(() => useI18n(), { wrapper });
    const t = result.current.t;
    expect(t.tickets).toBeDefined();
    expect(t.timeTracking).toBeDefined();
    expect(t.today).toBeDefined();
    expect(typeof t.openIssues).toBe("function");
  });
});
