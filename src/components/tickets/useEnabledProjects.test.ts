import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useEnabledProjects } from "./useEnabledProjects";

describe("useEnabledProjects", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("initializes with all project names", () => {
    const { result } = renderHook(() => useEnabledProjects(["Alpha", "Beta"], "default"));
    expect(result.current.enabledProjects).toEqual(new Set(["Alpha", "Beta"]));
  });

  it("returns empty set when allProjectNames is empty", () => {
    const { result } = renderHook(() => useEnabledProjects([], "default"));
    expect(result.current.enabledProjects.size).toBe(0);
  });

  it("adds new projects automatically when allProjectNames grows", () => {
    const { result, rerender } = renderHook(({ names }) => useEnabledProjects(names, "default"), {
      initialProps: { names: ["Alpha", "Beta"] },
    });
    expect(result.current.enabledProjects).toEqual(new Set(["Alpha", "Beta"]));

    rerender({ names: ["Alpha", "Beta", "Gamma"] });
    expect(result.current.enabledProjects).toEqual(new Set(["Alpha", "Beta", "Gamma"]));
  });

  it("keeps user-disabled projects disabled when allProjectNames changes", () => {
    const { result, rerender } = renderHook(({ names }) => useEnabledProjects(names, "default"), {
      initialProps: { names: ["Alpha", "Beta"] },
    });

    act(() => result.current.toggle("Alpha"));
    expect(result.current.enabledProjects).toEqual(new Set(["Beta"]));

    rerender({ names: ["Alpha", "Beta", "Gamma"] });
    expect(result.current.enabledProjects).toEqual(new Set(["Beta", "Gamma"]));
    expect(result.current.enabledProjects.has("Alpha")).toBe(false);
  });

  it("toggle removes project from enabled set", () => {
    const { result } = renderHook(() => useEnabledProjects(["Alpha", "Beta"], "default"));

    act(() => result.current.toggle("Alpha"));
    expect(result.current.enabledProjects).toEqual(new Set(["Beta"]));
  });

  it("toggle adds project back to enabled set", () => {
    const { result } = renderHook(() => useEnabledProjects(["Alpha", "Beta"], "default"));

    act(() => result.current.toggle("Alpha"));
    act(() => result.current.toggle("Alpha"));
    expect(result.current.enabledProjects).toEqual(new Set(["Alpha", "Beta"]));
  });

  it("toggleAll enables all when some disabled", () => {
    const { result } = renderHook(() => useEnabledProjects(["Alpha", "Beta", "Gamma"], "default"));

    act(() => result.current.toggle("Alpha"));
    expect(result.current.enabledProjects.size).toBe(2);

    act(() => result.current.toggleAll(["Alpha", "Beta", "Gamma"]));
    expect(result.current.enabledProjects).toEqual(new Set(["Alpha", "Beta", "Gamma"]));
  });

  it("toggleAll disables all when all enabled", () => {
    const { result } = renderHook(() => useEnabledProjects(["Alpha", "Beta"], "default"));

    act(() => result.current.toggleAll(["Alpha", "Beta"]));
    expect(result.current.enabledProjects.size).toBe(0);
  });

  it("persists disabled projects to localStorage on toggle", () => {
    const { result } = renderHook(() => useEnabledProjects(["Alpha", "Beta"], "default"));

    act(() => result.current.toggle("Alpha"));

    const stored = JSON.parse(localStorage.getItem("ticket-disabled-projects-default")!);
    expect(stored).toEqual(["Alpha"]);
  });

  it("restores disabled projects from localStorage on mount", () => {
    localStorage.setItem("ticket-disabled-projects-default", JSON.stringify(["Alpha"]));

    const { result } = renderHook(() => useEnabledProjects(["Alpha", "Beta"], "default"));
    expect(result.current.enabledProjects).toEqual(new Set(["Beta"]));
  });

  it("persists disabled projects on toggleAll disable", () => {
    const { result } = renderHook(() => useEnabledProjects(["Alpha", "Beta"], "default"));

    act(() => result.current.toggleAll(["Alpha", "Beta"]));

    const stored = JSON.parse(localStorage.getItem("ticket-disabled-projects-default")!);
    expect(stored).toContain("Alpha");
    expect(stored).toContain("Beta");
  });

  it("clears localStorage on toggleAll enable", () => {
    const { result } = renderHook(() => useEnabledProjects(["Alpha", "Beta"], "default"));

    act(() => result.current.toggleAll(["Alpha", "Beta"]));
    act(() => result.current.toggleAll(["Alpha", "Beta"]));

    const stored = JSON.parse(localStorage.getItem("ticket-disabled-projects-default")!);
    expect(stored).toEqual([]);
  });

  it("re-enabling a project removes it from localStorage", () => {
    const { result } = renderHook(() => useEnabledProjects(["Alpha", "Beta"], "default"));

    act(() => result.current.toggle("Alpha"));
    act(() => result.current.toggle("Alpha"));

    const stored = JSON.parse(localStorage.getItem("ticket-disabled-projects-default")!);
    expect(stored).toEqual([]);
  });
});
