import { ChevronDown, GripVertical } from "lucide-react";
import type { useSortable } from "@dnd-kit/sortable";

interface Props {
  name: string;
  displayName?: string;
  count: number;
  color: string;
  isCollapsed: boolean;
  onToggle: () => void;
  dragHandleProps?: ReturnType<typeof useSortable>["listeners"];
}

export function ProjectGroupHeader({
  name,
  displayName,
  count,
  color,
  isCollapsed,
  onToggle,
  dragHandleProps,
}: Props) {
  return (
    <div className="ticket-group__header-row">
      {dragHandleProps && (
        <div className="ticket-group__drag-handle" {...dragHandleProps}>
          <GripVertical size={16} />
        </div>
      )}
      <button onClick={onToggle} className="ticket-group__header" aria-expanded={!isCollapsed}>
        <div className="ticket-group__color-dot" style={{ background: color }} />
        <span className="ticket-group__name">{displayName ?? name}</span>
        <span className="ticket-group__count">{count}</span>
        <ChevronDown
          size={14}
          className="ticket-group__chevron"
          style={{ transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)" }}
        />
      </button>
    </div>
  );
}

export function DragOverlayHeader({
  name,
  count,
  color,
}: {
  name: string;
  count: number;
  color: string;
}) {
  return (
    <div className="ticket-group ticket-group--drag-overlay">
      <div className="ticket-group__header-row">
        <div className="ticket-group__drag-handle" style={{ opacity: 0.7 }}>
          <GripVertical size={16} />
        </div>
        <div className="ticket-group__header" style={{ cursor: "grabbing" }}>
          <div className="ticket-group__color-dot" style={{ background: color }} />
          <span className="ticket-group__name">{name}</span>
          <span className="ticket-group__count">{count}</span>
          <ChevronDown
            size={14}
            className="ticket-group__chevron"
            style={{ transform: "rotate(-90deg)" }}
          />
        </div>
      </div>
    </div>
  );
}
