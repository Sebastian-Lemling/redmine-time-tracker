import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@/test/test-utils";
import { AssigneeMenu } from "@/components/tickets/AssigneeMenu";
import type { RedmineMember } from "@/types/redmine";

const members: RedmineMember[] = [
  { id: 1, name: "Max Muster" },
  { id: 2, name: "Anna Schmidt" },
];

const baseProps = {
  projectId: 10,
  members,
  onOpen: vi.fn(),
  onSelect: vi.fn(),
};

describe("AssigneeMenu", () => {
  it("shows avatar when assignee set", () => {
    render(<AssigneeMenu {...baseProps} currentAssigneeId={1} currentAssigneeName="Max Muster" />);
    const btn = screen.getByRole("button");
    expect(btn).toHaveAttribute("title", "Max Muster");
    expect(screen.getByText("MM")).toBeInTheDocument();
  });

  it('shows "?" when no assignee', () => {
    render(<AssigneeMenu {...baseProps} />);
    const btn = screen.getByRole("button");
    expect(btn).toHaveAttribute("title", "Unassigned");
    expect(screen.getByText("?")).toBeInTheDocument();
  });

  it("click opens menu and calls onOpen with projectId", () => {
    const onOpen = vi.fn();
    render(<AssigneeMenu {...baseProps} onOpen={onOpen} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onOpen).toHaveBeenCalledWith(10);
    expect(screen.getByRole("listbox")).toBeInTheDocument();
  });

  it("shows loading when members empty", () => {
    render(<AssigneeMenu {...baseProps} members={[]} />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("shows member list with names", () => {
    render(<AssigneeMenu {...baseProps} />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getAllByRole("option")).toHaveLength(2);
  });

  it("current assignee marked as selected", () => {
    render(<AssigneeMenu {...baseProps} currentAssigneeId={1} currentAssigneeName="Max Muster" />);
    fireEvent.click(screen.getByRole("button"));
    const selected = screen.getByRole("option", { selected: true });
    expect(selected).toHaveTextContent("Max Muster");
  });

  it("click different member calls onSelect", () => {
    const onSelect = vi.fn();
    render(
      <AssigneeMenu
        {...baseProps}
        currentAssigneeId={1}
        currentAssigneeName="Max Muster"
        onSelect={onSelect}
      />,
    );
    fireEvent.click(screen.getByRole("button"));
    fireEvent.click(screen.getByText("Anna Schmidt"));
    expect(onSelect).toHaveBeenCalledWith(2);
  });

  it("click same member does not call onSelect", () => {
    const onSelect = vi.fn();
    render(
      <AssigneeMenu
        {...baseProps}
        currentAssigneeId={1}
        currentAssigneeName="Max Muster"
        onSelect={onSelect}
      />,
    );
    fireEvent.click(screen.getByRole("button"));
    fireEvent.click(screen.getByRole("option", { selected: true }));
    expect(onSelect).not.toHaveBeenCalled();
  });
});
