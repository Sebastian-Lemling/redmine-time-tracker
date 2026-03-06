import { createPortal } from "react-dom";
import type { RedmineMember } from "../../types/redmine";
import { Avatar } from "../ui/Avatar";
import { useI18n } from "../../i18n/I18nContext";
import { useDropdown } from "../../hooks/useDropdown";

interface Props {
  currentAssigneeId?: number;
  currentAssigneeName?: string;
  projectId: number;
  members: RedmineMember[];
  onOpen: (projectId: number) => void;
  onSelect: (assigneeId: number) => void;
}

export function AssigneeMenu({
  currentAssigneeId,
  currentAssigneeName,
  projectId,
  members,
  onOpen,
  onSelect,
}: Props) {
  const { t } = useI18n();
  const { open, setOpen, close, triggerRef, menuRef, pos } = useDropdown<
    HTMLButtonElement,
    HTMLUListElement
  >({ alignRight: true });

  const handleOpen = () => {
    if (!open) onOpen(projectId);
    setOpen((v) => !v);
  };

  const handleSelect = (memberId: number) => {
    if (memberId !== currentAssigneeId) onSelect(memberId);
    close();
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleOpen}
        className="assignee-menu__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        title={currentAssigneeName || t.notAssigned}
      >
        {currentAssigneeName ? (
          <Avatar name={currentAssigneeName} size={28} />
        ) : (
          <div className="assignee-menu__empty">?</div>
        )}
      </button>

      {open &&
        createPortal(
          <ul
            ref={menuRef}
            role="listbox"
            aria-label={t.assignPerson}
            className="assignee-menu__list md-elevation-2"
            style={{ top: pos.top, left: pos.left }}
          >
            {members.length === 0 ? (
              <li className="assignee-menu__loading">{t.loading}</li>
            ) : (
              members.map((m) => {
                const selected = m.id === currentAssigneeId;
                return (
                  <li
                    key={m.id}
                    role="option"
                    aria-selected={selected}
                    onClick={() => handleSelect(m.id)}
                    className="assignee-menu__item"
                    data-selected={selected || undefined}
                  >
                    <span className="assignee-menu__item-leading">
                      <Avatar name={m.name} size={20} />
                    </span>
                    <span className="assignee-menu__item-label">{m.name}</span>
                  </li>
                );
              })
            )}
          </ul>,
          document.body,
        )}
    </>
  );
}
