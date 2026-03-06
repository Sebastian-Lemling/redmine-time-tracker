import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ChipMenu } from "@/components/ui/ChipMenu";

const items = [
  { id: 1, label: "Bug" },
  { id: 2, label: "Feature" },
  { id: 3, label: "Support" },
];

describe("ChipMenu", () => {
  it("shows current label as chip text", () => {
    render(<ChipMenu currentId={1} currentLabel="Bug" items={items} onSelect={() => {}} />);
    expect(screen.getByText("Bug")).toBeInTheDocument();
  });

  it("click opens menu with items", () => {
    render(<ChipMenu currentId={1} currentLabel="Bug" items={items} onSelect={() => {}} />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    expect(screen.getAllByRole("option")).toHaveLength(3);
  });

  it("click item calls onSelect", () => {
    const onSelect = vi.fn();
    render(<ChipMenu currentId={1} currentLabel="Bug" items={items} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("button"));
    fireEvent.click(screen.getByText("Feature"));
    expect(onSelect).toHaveBeenCalledWith(2);
  });

  it("current item shows checkmark (aria-selected)", () => {
    render(<ChipMenu currentId={1} currentLabel="Bug" items={items} onSelect={() => {}} />);
    fireEvent.click(screen.getByRole("button"));
    const selectedOption = screen.getByRole("option", { selected: true });
    expect(selectedOption).toHaveTextContent("Bug");
  });

  it("click same item → no onSelect call", () => {
    const onSelect = vi.fn();
    render(<ChipMenu currentId={1} currentLabel="Bug" items={items} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("button"));
    fireEvent.click(screen.getByRole("option", { selected: true }));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("emptyStyle → dashed border class when no selection", () => {
    const { container } = render(
      <ChipMenu currentLabel="None" items={items} onSelect={() => {}} emptyStyle />,
    );
    const trigger = container.querySelector(".chip-menu__trigger--empty");
    expect(trigger).toBeInTheDocument();
  });

  it("calls onOpen when menu opens", () => {
    const onOpen = vi.fn();
    render(
      <ChipMenu
        currentId={1}
        currentLabel="Bug"
        items={items}
        onSelect={() => {}}
        onOpen={onOpen}
      />,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  describe("keyboard navigation", () => {
    it("ArrowDown highlights next item", () => {
      render(<ChipMenu currentId={1} currentLabel="Bug" items={items} onSelect={() => {}} />);
      fireEvent.click(screen.getByRole("button"));
      fireEvent.keyDown(document, { key: "ArrowDown" });
      expect(document.querySelector('[data-highlighted="true"]')).toHaveTextContent("Bug");
      fireEvent.keyDown(document, { key: "ArrowDown" });
      expect(document.querySelector('[data-highlighted="true"]')).toHaveTextContent("Feature");
    });

    it("ArrowUp highlights previous item, wraps around", () => {
      render(<ChipMenu currentId={1} currentLabel="Bug" items={items} onSelect={() => {}} />);
      fireEvent.click(screen.getByRole("button"));
      fireEvent.keyDown(document, { key: "ArrowUp" });
      expect(document.querySelector('[data-highlighted="true"]')).toHaveTextContent("Support");
    });

    it("Enter selects highlighted item", () => {
      const onSelect = vi.fn();
      render(<ChipMenu currentId={1} currentLabel="Bug" items={items} onSelect={onSelect} />);
      fireEvent.click(screen.getByRole("button"));
      fireEvent.keyDown(document, { key: "ArrowDown" });
      fireEvent.keyDown(document, { key: "ArrowDown" });
      fireEvent.keyDown(document, { key: "Enter" });
      expect(onSelect).toHaveBeenCalledWith(2);
    });

    it("ArrowDown wraps from last to first", () => {
      render(<ChipMenu currentId={1} currentLabel="Bug" items={items} onSelect={() => {}} />);
      fireEvent.click(screen.getByRole("button"));
      // 3 items: 0=Bug, 1=Feature, 2=Support → wrap → 0=Bug
      fireEvent.keyDown(document, { key: "ArrowDown" });
      fireEvent.keyDown(document, { key: "ArrowDown" });
      fireEvent.keyDown(document, { key: "ArrowDown" });
      fireEvent.keyDown(document, { key: "ArrowDown" });
      expect(document.querySelector('[data-highlighted="true"]')).toHaveTextContent("Bug");
    });

    it("empty items + ArrowDown does not crash", () => {
      render(<ChipMenu currentId={undefined} currentLabel="None" items={[]} onSelect={() => {}} />);
      fireEvent.click(screen.getByRole("button"));
      fireEvent.keyDown(document, { key: "ArrowDown" });
      expect(document.querySelector('[data-highlighted="true"]')).toBeNull();
    });

    it("Escape key closes open menu", () => {
      render(<ChipMenu currentId={1} currentLabel="Bug" items={items} onSelect={() => {}} />);
      fireEvent.click(screen.getByRole("button"));
      expect(screen.getByRole("listbox")).toBeInTheDocument();
      fireEvent.keyDown(document, { key: "Escape" });
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    });

    it("Enter with no highlighted item does nothing", () => {
      const onSelect = vi.fn();
      render(<ChipMenu currentId={1} currentLabel="Bug" items={items} onSelect={onSelect} />);
      fireEvent.click(screen.getByRole("button"));
      fireEvent.keyDown(document, { key: "Enter" });
      expect(onSelect).not.toHaveBeenCalled();
    });
  });

  describe("searchable", () => {
    it("shows search input when searchable=true", () => {
      render(
        <ChipMenu
          currentId={1}
          currentLabel="Bug"
          items={items}
          onSelect={() => {}}
          searchable
          ariaLabel="Search"
        />,
      );
      fireEvent.click(screen.getByRole("button"));
      expect(screen.getByRole("textbox")).toBeInTheDocument();
    });

    it("filters items by search query", () => {
      render(
        <ChipMenu currentId={1} currentLabel="Bug" items={items} onSelect={() => {}} searchable />,
      );
      fireEvent.click(screen.getByRole("button"));
      fireEvent.change(screen.getByRole("textbox"), { target: { value: "feat" } });
      expect(screen.getAllByRole("option")).toHaveLength(1);
      expect(screen.getByText("Feature")).toBeInTheDocument();
    });

    it("shows no results indicator when nothing matches", () => {
      render(
        <ChipMenu currentId={1} currentLabel="Bug" items={items} onSelect={() => {}} searchable />,
      );
      fireEvent.click(screen.getByRole("button"));
      fireEvent.change(screen.getByRole("textbox"), { target: { value: "zzz" } });
      expect(screen.queryAllByRole("option")).toHaveLength(0);
      expect(document.querySelector(".chip-menu__no-results")).toBeInTheDocument();
    });

    it("keyboard nav works with filtered results", () => {
      const onSelect = vi.fn();
      render(
        <ChipMenu currentId={1} currentLabel="Bug" items={items} onSelect={onSelect} searchable />,
      );
      fireEvent.click(screen.getByRole("button"));
      fireEvent.change(screen.getByRole("textbox"), { target: { value: "sup" } });
      fireEvent.keyDown(document, { key: "ArrowDown" });
      fireEvent.keyDown(document, { key: "Enter" });
      expect(onSelect).toHaveBeenCalledWith(3);
    });

    it("does not show search input when searchable is not set", () => {
      render(<ChipMenu currentId={1} currentLabel="Bug" items={items} onSelect={() => {}} />);
      fireEvent.click(screen.getByRole("button"));
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    });

    it("type query with no matches + Enter does not crash", () => {
      const onSelect = vi.fn();
      render(
        <ChipMenu currentId={1} currentLabel="Bug" items={items} onSelect={onSelect} searchable />,
      );
      fireEvent.click(screen.getByRole("button"));
      fireEvent.change(screen.getByRole("textbox"), { target: { value: "zzz" } });
      fireEvent.keyDown(document, { key: "Enter" });
      expect(onSelect).not.toHaveBeenCalled();
    });

    it("reopen menu clears search field", () => {
      render(
        <ChipMenu currentId={1} currentLabel="Bug" items={items} onSelect={() => {}} searchable />,
      );
      fireEvent.click(screen.getByRole("button"));
      fireEvent.change(screen.getByRole("textbox"), { target: { value: "feat" } });
      fireEvent.click(screen.getByRole("button"));
      fireEvent.click(screen.getByRole("button"));
      expect(screen.getByRole("textbox")).toHaveValue("");
    });
  });
});
