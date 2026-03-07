import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useHashRouter, parseHash, buildHash } from "@/hooks/useHashRouter";

describe("parseHash", () => {
  it('#/tickets → {section: "tickets"}', () => {
    expect(parseHash("#/tickets")).toEqual({ section: "tickets" });
  });

  it("#/timelog/2026-03 → {section: timelog, year: 2026, month: 2}", () => {
    expect(parseHash("#/timelog/2026-03")).toEqual({
      section: "timelog",
      year: 2026,
      month: 2, // 0-indexed
    });
  });

  it("#/timelog/2026-03/15/unsynced → full route with day + tab", () => {
    expect(parseHash("#/timelog/2026-03/15/unsynced")).toEqual({
      section: "timelog",
      year: 2026,
      month: 2,
      day: 15,
      tab: "unsynced",
    });
  });

  it('#/overview → {section: "overview"}', () => {
    expect(parseHash("#/overview")).toEqual({ section: "overview" });
  });

  it("invalid day (e.g. 0 or 32) falls back to section-only timelog (line 29)", () => {
    expect(parseHash("#/timelog/2026-03/0")).toEqual({ section: "timelog" });
    expect(parseHash("#/timelog/2026-03/abc")).toEqual({ section: "timelog" });
    expect(parseHash("#/timelog/2026-03/32")).toEqual({ section: "timelog" });
  });

  it("#/timelog without date parts → section-only timelog (line 36)", () => {
    expect(parseHash("#/timelog")).toEqual({ section: "timelog" });
  });

  it("invalid month in date falls back to section-only timelog", () => {
    expect(parseHash("#/timelog/2026-00")).toEqual({ section: "timelog" });
    expect(parseHash("#/timelog/2026-13")).toEqual({ section: "timelog" });
    expect(parseHash("#/timelog/abc-def")).toEqual({ section: "timelog" });
  });

  it("#/timelog/2026-03/15/synced → tab=synced", () => {
    expect(parseHash("#/timelog/2026-03/15/synced")).toEqual({
      section: "timelog",
      year: 2026,
      month: 2,
      day: 15,
      tab: "synced",
    });
  });

  it("unknown section falls back to tickets default", () => {
    expect(parseHash("#/unknown")).toEqual({ section: "tickets" });
    expect(parseHash("#/")).toEqual({ section: "tickets" });
    expect(parseHash("")).toEqual({ section: "tickets" });
  });

  it("#/tickets/myinstance → {section: tickets, instanceId: myinstance}", () => {
    expect(parseHash("#/tickets/myinstance")).toEqual({
      section: "tickets",
      instanceId: "myinstance",
    });
  });

  it("#/tickets without instanceId → {section: tickets} only", () => {
    expect(parseHash("#/tickets")).toEqual({ section: "tickets" });
  });
});

describe("buildHash", () => {
  it("overview section → #/overview (line 49)", () => {
    expect(buildHash({ section: "overview" })).toBe("#/overview");
  });

  it("timelog with year, month, day → includes day segment (lines 56-57)", () => {
    expect(buildHash({ section: "timelog", year: 2026, month: 2, day: 15 })).toBe(
      "#/timelog/2026-03/15",
    );
  });

  it("timelog with day + synced tab → appends /synced (line 58)", () => {
    expect(buildHash({ section: "timelog", year: 2026, month: 2, day: 15, tab: "synced" })).toBe(
      "#/timelog/2026-03/15/synced",
    );
  });

  it("timelog with day but no synced tab → no tab suffix (line 59)", () => {
    expect(buildHash({ section: "timelog", year: 2026, month: 2, day: 15, tab: "unsynced" })).toBe(
      "#/timelog/2026-03/15",
    );
  });

  it("timelog with no year/month → uses current date defaults (lines 51-53)", () => {
    const hash = buildHash({ section: "timelog" });
    expect(hash).toMatch(/^#\/timelog\/\d{4}-\d{2}$/);
  });

  it("no section defaults to tickets", () => {
    expect(buildHash({})).toBe("#/tickets");
  });

  it("tickets with instanceId → #/tickets/:instanceId", () => {
    expect(buildHash({ section: "tickets", instanceId: "prod" })).toBe("#/tickets/prod");
  });

  it("tickets without instanceId → #/tickets", () => {
    expect(buildHash({ section: "tickets" })).toBe("#/tickets");
  });
});

describe("useHashRouter", () => {
  beforeEach(() => {
    window.location.hash = "#/tickets";
  });

  it('navigate("tickets") updates hash', () => {
    const spy = vi.spyOn(history, "pushState");
    const { result } = renderHook(() => useHashRouter());
    act(() => result.current.navigate({ section: "tickets" }));
    expect(spy).toHaveBeenCalledWith(null, "", "#/tickets");
    spy.mockRestore();
  });

  it("section switch clears sub-state (day, tab)", () => {
    window.location.hash = "#/timelog/2026-03/15/synced";
    const { result } = renderHook(() => useHashRouter());
    act(() => result.current.navigate({ section: "tickets" }));
    expect(result.current.route).toEqual({ section: "tickets" });
  });

  it("sets default hash when empty", () => {
    window.location.hash = "";
    const spy = vi.spyOn(history, "replaceState");
    renderHook(() => useHashRouter());
    expect(spy).toHaveBeenCalledWith(null, "", "#/tickets");
    spy.mockRestore();
  });

  it("reacts to hashchange event", () => {
    const { result } = renderHook(() => useHashRouter());
    act(() => {
      window.location.hash = "#/overview";
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });
    expect(result.current.route.section).toBe("overview");
  });

  it("reacts to popstate event (browser back/forward)", () => {
    const { result } = renderHook(() => useHashRouter());
    act(() => {
      window.location.hash = "#/timelog/2026-03";
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(result.current.route.section).toBe("timelog");
    expect(result.current.route.year).toBe(2026);
  });

  it("navigate to tickets with instanceId updates hash", () => {
    const spy = vi.spyOn(history, "pushState");
    const { result } = renderHook(() => useHashRouter());
    act(() => result.current.navigate({ section: "tickets", instanceId: "prod" }));
    expect(spy).toHaveBeenCalledWith(null, "", "#/tickets/prod");
    expect(result.current.route.instanceId).toBe("prod");
    spy.mockRestore();
  });

  it("switching from tickets to timelog clears instanceId", () => {
    window.location.hash = "#/tickets/prod";
    const { result } = renderHook(() => useHashRouter());
    act(() => result.current.navigate({ section: "timelog" }));
    expect(result.current.route.section).toBe("timelog");
    expect(result.current.route.instanceId).toBeUndefined();
  });
});
