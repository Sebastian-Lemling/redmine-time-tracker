import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useProjectOrder } from "./useProjectOrder";

describe("useProjectOrder", () => {
  beforeEach(() => {
    localStorage.removeItem("ticket-project-order-default");
  });

  it("default order = empty if nothing stored", () => {
    const { result } = renderHook(() => useProjectOrder([], "default"));
    expect(result.current.projectOrder).toEqual([]);
  });

  it("loads order from localStorage on mount", () => {
    localStorage.setItem("ticket-project-order-default", JSON.stringify(["Beta", "Alpha"]));
    const { result } = renderHook(() => useProjectOrder(["Alpha", "Beta"], "default"));
    expect(result.current.projectOrder).toEqual(["Beta", "Alpha"]);
  });

  it("new project not in stored order → appended at end", () => {
    localStorage.setItem("ticket-project-order-default", JSON.stringify(["Alpha"]));
    const { result } = renderHook(() => useProjectOrder(["Alpha", "Beta"], "default"));
    expect(result.current.projectOrder).toContain("Beta");
    expect(result.current.projectOrder.indexOf("Alpha")).toBeLessThan(
      result.current.projectOrder.indexOf("Beta"),
    );
  });

  it("stored project no longer in issues → removed from order", () => {
    localStorage.setItem("ticket-project-order-default", JSON.stringify(["Alpha", "Gone", "Beta"]));
    const { result } = renderHook(() => useProjectOrder(["Alpha", "Beta"], "default"));
    expect(result.current.projectOrder).not.toContain("Gone");
    expect(result.current.projectOrder).toEqual(["Alpha", "Beta"]);
  });

  it("persists new order to localStorage", () => {
    renderHook(() => useProjectOrder(["Alpha", "Beta"], "default"));
    const stored = localStorage.getItem("ticket-project-order-default");
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored!);
    expect(parsed).toContain("Alpha");
    expect(parsed).toContain("Beta");
  });

  it("handles corrupt localStorage gracefully", () => {
    localStorage.setItem("ticket-project-order-default", "not-json!!!");
    const { result } = renderHook(() => useProjectOrder(["Alpha"], "default"));
    expect(result.current.projectOrder).toContain("Alpha");
  });

  it("dragActiveId is null initially", () => {
    const { result } = renderHook(() => useProjectOrder(["Alpha"], "default"));
    expect(result.current.dragActiveId).toBeNull();
  });

  it("no changes when allProjectNames is empty", () => {
    localStorage.setItem("ticket-project-order-default", JSON.stringify(["Alpha"]));
    const { result } = renderHook(() => useProjectOrder([], "default"));
    expect(result.current.projectOrder).toEqual(["Alpha"]);
  });

  it("handleDragStart sets dragActiveId and collapses all", () => {
    const { result } = renderHook(() => useProjectOrder(["Alpha", "Beta"], "default"));
    const setCollapsed = vi.fn();
    const collapsed = {};

    act(() => {
      result.current.handleDragStart(
        { active: { id: "Alpha" } } as any,
        collapsed,
        ["Alpha", "Beta"],
        setCollapsed,
      );
    });

    expect(result.current.dragActiveId).toBe("Alpha");
    expect(setCollapsed).toHaveBeenCalledWith({
      Alpha: true,
      Beta: true,
    });
  });

  it("handleDragEnd reorders projects when dropped on different target", () => {
    const { result } = renderHook(() => useProjectOrder(["Alpha", "Beta", "Gamma"], "default"));
    const setCollapsed = vi.fn();

    act(() => {
      result.current.handleDragStart(
        { active: { id: "Alpha" } } as any,
        {},
        ["Alpha", "Beta", "Gamma"],
        setCollapsed,
      );
    });

    // End drag with Alpha moved after Gamma
    act(() => {
      result.current.handleDragEnd(
        { active: { id: "Alpha" }, over: { id: "Gamma" } } as any,
        setCollapsed,
      );
    });

    expect(result.current.dragActiveId).toBeNull();
    // Alpha should now be after Beta, before or at Gamma position
    expect(result.current.projectOrder.indexOf("Alpha")).toBeGreaterThan(
      result.current.projectOrder.indexOf("Beta"),
    );
  });

  it("handleDragEnd does not reorder when dropped on same position", () => {
    const { result } = renderHook(() => useProjectOrder(["Alpha", "Beta"], "default"));
    const setCollapsed = vi.fn();

    act(() => {
      result.current.handleDragStart(
        { active: { id: "Alpha" } } as any,
        {},
        ["Alpha", "Beta"],
        setCollapsed,
      );
    });

    act(() => {
      result.current.handleDragEnd(
        { active: { id: "Alpha" }, over: { id: "Alpha" } } as any,
        setCollapsed,
      );
    });

    expect(result.current.projectOrder).toEqual(["Alpha", "Beta"]);
  });

  it("handleDragEnd restores collapsed state from before drag", () => {
    const { result } = renderHook(() => useProjectOrder(["Alpha", "Beta"], "default"));
    const setCollapsed = vi.fn();
    const originalCollapsed = { Alpha: true };

    act(() => {
      result.current.handleDragStart(
        { active: { id: "Beta" } } as any,
        originalCollapsed,
        ["Alpha", "Beta"],
        setCollapsed,
      );
    });

    act(() => {
      result.current.handleDragEnd({ active: { id: "Beta" }, over: null } as any, setCollapsed);
    });

    expect(setCollapsed).toHaveBeenLastCalledWith(originalCollapsed);
  });

  it("handleDragEnd handles null over (dropped outside)", () => {
    const { result } = renderHook(() => useProjectOrder(["Alpha", "Beta"], "default"));
    const setCollapsed = vi.fn();

    act(() => {
      result.current.handleDragStart(
        { active: { id: "Alpha" } } as any,
        {},
        ["Alpha", "Beta"],
        setCollapsed,
      );
    });

    act(() => {
      result.current.handleDragEnd({ active: { id: "Alpha" }, over: null } as any, setCollapsed);
    });

    expect(result.current.projectOrder).toEqual(["Alpha", "Beta"]);
    expect(result.current.dragActiveId).toBeNull();
  });

  it("updates when allProjectNames changes", () => {
    const { result, rerender } = renderHook(({ names }) => useProjectOrder(names, "default"), {
      initialProps: { names: ["Alpha", "Beta"] },
    });

    expect(result.current.projectOrder).toEqual(["Alpha", "Beta"]);

    rerender({ names: ["Alpha", "Beta", "Gamma"] });
    expect(result.current.projectOrder).toContain("Gamma");
  });

  it("preserves order stability when same names provided", () => {
    const { result, rerender } = renderHook(({ names }) => useProjectOrder(names, "default"), {
      initialProps: { names: ["Beta", "Alpha"] },
    });

    const initialOrder = [...result.current.projectOrder];
    rerender({ names: ["Beta", "Alpha"] });
    expect(result.current.projectOrder).toEqual(initialOrder);
  });

  it("new projects sorted alphabetically then appended", () => {
    localStorage.setItem("ticket-project-order-default", JSON.stringify(["Gamma"]));
    const { result } = renderHook(() => useProjectOrder(["Gamma", "Alpha", "Beta"], "default"));
    // Gamma preserved at top, then Alpha before Beta (sorted)
    expect(result.current.projectOrder[0]).toBe("Gamma");
    expect(result.current.projectOrder.indexOf("Alpha")).toBeLessThan(
      result.current.projectOrder.indexOf("Beta"),
    );
  });
});
