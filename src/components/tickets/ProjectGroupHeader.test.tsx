import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@/test/test-utils";
import { ProjectGroupHeader, DragOverlayHeader } from "./ProjectGroupHeader";

describe("ProjectGroupHeader", () => {
  const defaultProps = {
    name: "My Project",
    count: 5,
    color: "#ff0000",
    isCollapsed: false,
    onToggle: vi.fn(),
  };

  it("renders project name and count", () => {
    render(<ProjectGroupHeader {...defaultProps} />);
    expect(screen.getByText("My Project")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("calls onToggle when clicked", () => {
    const onToggle = vi.fn();
    render(<ProjectGroupHeader {...defaultProps} onToggle={onToggle} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onToggle).toHaveBeenCalled();
  });

  it("aria-expanded=true when not collapsed", () => {
    render(<ProjectGroupHeader {...defaultProps} isCollapsed={false} />);
    expect(screen.getByRole("button")).toHaveAttribute("aria-expanded", "true");
  });

  it("aria-expanded=false when collapsed", () => {
    render(<ProjectGroupHeader {...defaultProps} isCollapsed={true} />);
    expect(screen.getByRole("button")).toHaveAttribute("aria-expanded", "false");
  });

  it("renders color dot with given color", () => {
    const { container } = render(<ProjectGroupHeader {...defaultProps} />);
    const dot = container.querySelector(".ticket-group__color-dot") as HTMLElement;
    expect(dot).toBeInTheDocument();
    expect(dot.style.background).toBe("rgb(255, 0, 0)");
  });

  it("hides drag handle when no dragHandleProps", () => {
    const { container } = render(<ProjectGroupHeader {...defaultProps} />);
    expect(container.querySelector(".ticket-group__drag-handle")).not.toBeInTheDocument();
  });

  it("shows drag handle when dragHandleProps provided", () => {
    const { container } = render(
      <ProjectGroupHeader {...defaultProps} dragHandleProps={{} as any} />,
    );
    expect(container.querySelector(".ticket-group__drag-handle")).toBeInTheDocument();
  });

  it("displayName prop shown instead of name when provided", () => {
    render(<ProjectGroupHeader {...defaultProps} name="__favorites__" displayName="★ Favorites" />);
    expect(screen.getByText("★ Favorites")).toBeInTheDocument();
    expect(screen.queryByText("__favorites__")).not.toBeInTheDocument();
  });
});

describe("DragOverlayHeader", () => {
  it("renders project name, count, and color", () => {
    render(<DragOverlayHeader name="Alpha" count={3} color="#00ff00" />);
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });
});
