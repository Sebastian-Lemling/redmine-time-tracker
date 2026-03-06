import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDropdown } from "@/hooks/useDropdown";

describe("useDropdown", () => {
  it("initially closed", () => {
    const { result } = renderHook(() => useDropdown());
    expect(result.current.open).toBe(false);
  });

  it("toggle() opens", () => {
    const { result } = renderHook(() => useDropdown());
    act(() => result.current.toggle());
    expect(result.current.open).toBe(true);
  });

  it("toggle() again closes", () => {
    const { result } = renderHook(() => useDropdown());
    act(() => result.current.toggle());
    act(() => result.current.toggle());
    expect(result.current.open).toBe(false);
  });

  it("close() closes from open state", () => {
    const { result } = renderHook(() => useDropdown());
    act(() => result.current.setOpen(true));
    act(() => result.current.close());
    expect(result.current.open).toBe(false);
  });

  it("Escape key closes (with stopPropagation)", () => {
    const { result } = renderHook(() => useDropdown());
    act(() => result.current.setOpen(true));

    const event = new KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
    });
    const stopPropSpy = vi.spyOn(event, "stopPropagation");

    act(() => {
      document.dispatchEvent(event);
    });

    expect(result.current.open).toBe(false);
    expect(stopPropSpy).toHaveBeenCalled();
  });

  it("click outside closes", () => {
    const { result } = renderHook(() => useDropdown());
    act(() => result.current.setOpen(true));

    act(() => {
      document.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    });

    expect(result.current.open).toBe(false);
  });

  it("scrolls aria-selected item into view on open", () => {
    const menu = document.createElement("ul");
    const selected = document.createElement("li");
    selected.setAttribute("aria-selected", "true");
    selected.scrollIntoView = vi.fn();
    menu.appendChild(selected);
    document.body.appendChild(menu);

    const { result } = renderHook(() => useDropdown());

    (result.current.menuRef as { current: HTMLElement | null }).current = menu;

    act(() => result.current.setOpen(true));

    expect(selected.scrollIntoView).toHaveBeenCalledWith({ block: "nearest" });
    document.body.removeChild(menu);
  });
});
