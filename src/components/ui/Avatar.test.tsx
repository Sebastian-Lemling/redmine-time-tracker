import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Avatar } from "@/components/ui/Avatar";

describe("Avatar", () => {
  it('shows first letter of first + last name ("Max Muster" → "MM")', () => {
    render(<Avatar name="Max Muster" />);
    expect(screen.getByTitle("Max Muster")).toHaveTextContent("MM");
  });

  it('single name → first two letters uppercased ("Admin" → "AD")', () => {
    render(<Avatar name="Admin" />);
    expect(screen.getByTitle("Admin")).toHaveTextContent("AD");
  });

  it("deterministic color from name (same name = same color)", () => {
    const { container: c1 } = render(<Avatar name="Test User" />);
    const { container: c2 } = render(<Avatar name="Test User" />);
    const bg1 = (c1.firstElementChild as HTMLElement).style.backgroundColor;
    const bg2 = (c2.firstElementChild as HTMLElement).style.backgroundColor;
    expect(bg1).toBe(bg2);
  });

  it("applies custom size", () => {
    render(<Avatar name="Test" size={48} />);
    const el = screen.getByTitle("Test") as HTMLElement;
    expect(el.style.width).toBe("48px");
    expect(el.style.height).toBe("48px");
  });
});
