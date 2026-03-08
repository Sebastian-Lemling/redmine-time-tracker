import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@/test/test-utils";
import { DayDetailPanel } from "./DayDetailPanel";
import type { TimeLogEntry as TEntry, RedmineTimeEntry } from "@/types/redmine";
import { DURATION_STEP_MINUTES, DURATION_MIN_MINUTES } from "@/lib/timeConfig";

function makeEntry(overrides?: Partial<TEntry>): TEntry {
  return {
    id: "e1",
    issueId: 100,
    issueSubject: "Fix bug",
    projectId: 1,
    projectName: "PX",
    startTime: "2025-03-05T09:00:00",
    endTime: "2025-03-05T09:30:00",
    duration: 30,
    originalDuration: 30,
    description: "worked",
    date: "2025-03-05",
    activityId: 5,
    syncedToRedmine: false,
    ...overrides,
  } as TEntry;
}

function makeRemoteEntry(overrides?: Partial<RedmineTimeEntry>): RedmineTimeEntry {
  return {
    id: 200,
    project: { id: 1, name: "PX" },
    issue: { id: 100 },
    user: { id: 1, name: "Admin" },
    activity: { id: 5, name: "Development" },
    hours: 1.5,
    comments: "synced work",
    spent_on: "2025-03-05",
    created_on: "2025-03-05T10:00:00Z",
    updated_on: "2025-03-05T10:00:00Z",
    ...overrides,
  } as RedmineTimeEntry;
}

function makeProps(overrides?: Record<string, unknown>) {
  return {
    selectedDate: "2025-03-05",
    activeTab: "unsynced",
    unsyncedEntries: [makeEntry()],
    remoteDayEntries: [] as RedmineTimeEntry[],
    unsyncedMinutes: 30,
    syncedMinutes: 0,
    selectedDayMinutes: 30,
    remoteLoading: false,
    activities: [{ id: 5, name: "Development", is_default: false }] as any[],
    activitiesByProject: {} as Record<number, any[]>,
    issues: [{ id: 100, subject: "Fix bug" }] as any[],
    issueSubjects: {} as Record<number, string>,
    redmineUrl: "http://redmine.test",
    selectedIds: new Set<string>(),
    onSelectionChange: vi.fn(),
    onNavigateTab: vi.fn(),
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onUpdateDuration: vi.fn(),
    ...overrides,
  };
}

function getToolbarCheckbox(): HTMLElement {
  return screen.getAllByRole("checkbox").find((el) => !el.closest(".de-card"))!;
}

function getCardTitles(): string[] {
  return Array.from(document.querySelectorAll(".de-card__title")).map((el) => el.textContent!);
}

describe("DayDetailPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders formatted date header with weekday and month", () => {
    render(<DayDetailPanel {...makeProps()} />);
    expect(screen.getByText(/5\. (März|March)/)).toBeInTheDocument();
  });

  it("shows unsynced tab with entry count", () => {
    render(<DayDetailPanel {...makeProps()} />);
    const tab = screen.getByRole("tab", { selected: true });
    expect(tab.textContent).toContain("1");
  });

  it("renders entry card with subject", () => {
    render(<DayDetailPanel {...makeProps()} />);
    expect(screen.getByText("Fix bug")).toBeInTheDocument();
  });

  it("shows total hours in header", () => {
    render(<DayDetailPanel {...makeProps({ selectedDayMinutes: 90 })} />);
    expect(screen.getByText("1.5h")).toBeInTheDocument();
  });

  it("switches to synced tab and passes correct day + tab", () => {
    const onNavigateTab = vi.fn();
    render(
      <DayDetailPanel
        {...makeProps({
          remoteDayEntries: [makeRemoteEntry()],
          syncedMinutes: 90,
          selectedDayMinutes: 120,
          onNavigateTab,
        })}
      />,
    );
    const syncedTab = screen.getByText(/gesendet|sent/i);
    fireEvent.click(syncedTab);
    expect(onNavigateTab).toHaveBeenCalledWith(5, "synced");
  });

  it("shows synced entries on synced tab with comments and activity", () => {
    render(
      <DayDetailPanel
        {...makeProps({
          activeTab: "synced",
          remoteDayEntries: [makeRemoteEntry()],
        })}
      />,
    );
    expect(screen.getByText("synced work")).toBeInTheDocument();
    expect(screen.getByText("Development")).toBeInTheDocument();
  });

  it("shows remote loading spinner on synced tab", () => {
    render(
      <DayDetailPanel
        {...makeProps({
          activeTab: "synced",
          remoteLoading: true,
        })}
      />,
    );
    expect(screen.getByText(/lade|loading/i)).toBeInTheDocument();
  });

  it("empty state when no entries at all", () => {
    render(
      <DayDetailPanel
        {...makeProps({
          unsyncedEntries: [],
          remoteDayEntries: [],
          unsyncedMinutes: 0,
          selectedDayMinutes: 0,
        })}
      />,
    );
    expect(screen.getByText(/keine einträge|no entries/i)).toBeInTheDocument();
  });

  it("select-all none→all calls onSelectionChange with all IDs", () => {
    const onSelectionChange = vi.fn();
    const entries = [
      makeEntry({ id: "e1" }),
      makeEntry({ id: "e2", issueId: 101, issueSubject: "Other" }),
    ];
    render(
      <DayDetailPanel
        {...makeProps({ unsyncedEntries: entries, onSelectionChange, selectedIds: new Set() })}
      />,
    );
    fireEvent.click(getToolbarCheckbox());
    expect(onSelectionChange).toHaveBeenCalledWith(new Set(["e1", "e2"]));
  });

  it("select-all all→none calls onSelectionChange with empty Set", () => {
    const onSelectionChange = vi.fn();
    const entries = [
      makeEntry({ id: "e1" }),
      makeEntry({ id: "e2", issueId: 101, issueSubject: "Other" }),
    ];
    render(
      <DayDetailPanel
        {...makeProps({
          unsyncedEntries: entries,
          onSelectionChange,
          selectedIds: new Set(["e1", "e2"]),
        })}
      />,
    );
    fireEvent.click(
      screen
        .getByText(/2 ausgewählt|2 selected/i)
        .closest(".de-toolbar__left")!
        .querySelector(".de-checkbox")!,
    );
    expect(onSelectionChange).toHaveBeenCalledWith(new Set());
  });

  it("select-all keyboard Space selects all", () => {
    const onSelectionChange = vi.fn();
    const entries = [
      makeEntry({ id: "e1" }),
      makeEntry({ id: "e2", issueId: 101, issueSubject: "Other" }),
    ];
    render(<DayDetailPanel {...makeProps({ unsyncedEntries: entries, onSelectionChange })} />);
    fireEvent.keyDown(getToolbarCheckbox(), { key: " " });
    expect(onSelectionChange).toHaveBeenCalledWith(new Set(["e1", "e2"]));
  });

  it("select-all keyboard Enter deselects when all selected", () => {
    const onSelectionChange = vi.fn();
    const entries = [
      makeEntry({ id: "e1" }),
      makeEntry({ id: "e2", issueId: 101, issueSubject: "Other" }),
    ];
    render(
      <DayDetailPanel
        {...makeProps({
          unsyncedEntries: entries,
          onSelectionChange,
          selectedIds: new Set(["e1", "e2"]),
        })}
      />,
    );
    fireEvent.keyDown(getToolbarCheckbox(), { key: "Enter" });
    expect(onSelectionChange).toHaveBeenCalledWith(new Set());
  });

  it("select-all keyboard Enter selects all when none selected", () => {
    const onSelectionChange = vi.fn();
    const entries = [
      makeEntry({ id: "e1" }),
      makeEntry({ id: "e2", issueId: 101, issueSubject: "Other" }),
    ];
    render(
      <DayDetailPanel
        {...makeProps({
          unsyncedEntries: entries,
          onSelectionChange,
          selectedIds: new Set(),
        })}
      />,
    );
    fireEvent.keyDown(getToolbarCheckbox(), { key: "Enter" });
    expect(onSelectionChange).toHaveBeenCalledWith(new Set(["e1", "e2"]));
  });

  it("select-all keyboard ignores unrelated keys", () => {
    const onSelectionChange = vi.fn();
    render(<DayDetailPanel {...makeProps({ onSelectionChange, selectedIds: new Set() })} />);
    fireEvent.keyDown(getToolbarCheckbox(), { key: "a" });
    expect(onSelectionChange).not.toHaveBeenCalled();
  });

  it("renders entries in provided order (no sort UI)", () => {
    const entries = [
      makeEntry({ id: "e1", startTime: "2025-03-05T08:00:00", issueSubject: "Early" }),
      makeEntry({ id: "e2", startTime: "2025-03-05T14:00:00", issueId: 101, issueSubject: "Late" }),
    ];
    render(<DayDetailPanel {...makeProps({ unsyncedEntries: entries })} />);
    expect(getCardTitles()).toEqual(["Early", "Late"]);
  });

  it("unsynced tab click clears selection", () => {
    const onSelectionChange = vi.fn();
    render(
      <DayDetailPanel
        {...makeProps({
          remoteDayEntries: [makeRemoteEntry()],
          syncedMinutes: 90,
          selectedDayMinutes: 120,
          activeTab: "synced",
          onSelectionChange,
          selectedIds: new Set(["e1"]),
        })}
      />,
    );
    fireEvent.click(screen.getByText(/entwürfe|drafts/i));
    expect(onSelectionChange).toHaveBeenCalledWith(new Set());
  });

  it("synced tab click clears selection", () => {
    const onSelectionChange = vi.fn();
    render(
      <DayDetailPanel
        {...makeProps({
          remoteDayEntries: [makeRemoteEntry()],
          syncedMinutes: 90,
          selectedDayMinutes: 120,
          onSelectionChange,
          selectedIds: new Set(["e1"]),
        })}
      />,
    );
    fireEvent.click(screen.getByText(/gesendet|sent/i));
    expect(onSelectionChange).toHaveBeenCalledWith(new Set());
  });

  it("'all synced' empty state on unsynced tab when no unsynced entries but remote exist", () => {
    render(
      <DayDetailPanel
        {...makeProps({
          unsyncedEntries: [],
          remoteDayEntries: [makeRemoteEntry()],
          unsyncedMinutes: 0,
          syncedMinutes: 90,
          selectedDayMinutes: 90,
          activeTab: "unsynced",
        })}
      />,
    );
    expect(screen.getByText(/alle gesendet|all sent/i)).toBeInTheDocument();
  });

  it("'nothing synced yet' empty state on synced tab when only unsynced entries", () => {
    render(
      <DayDetailPanel
        {...makeProps({
          unsyncedEntries: [makeEntry()],
          remoteDayEntries: [],
          activeTab: "synced",
        })}
      />,
    );
    expect(screen.getByText(/noch nichts gesendet|nothing sent yet/i)).toBeInTheDocument();
  });

  it("getIssueSubject falls back to issueSubjects when not in issues array", () => {
    render(
      <DayDetailPanel
        {...makeProps({
          activeTab: "synced",
          remoteDayEntries: [makeRemoteEntry({ issue: { id: 999 } })],
          issues: [],
          issueSubjects: { 999: "Fetched subject" },
        })}
      />,
    );
    expect(screen.getByText("Fetched subject")).toBeInTheDocument();
  });

  it("getIssueSubject falls back to #id when not found anywhere", () => {
    render(
      <DayDetailPanel
        {...makeProps({
          activeTab: "synced",
          remoteDayEntries: [makeRemoteEntry({ issue: { id: 888 } })],
          issues: [],
          issueSubjects: {},
        })}
      />,
    );
    expect(screen.getByText("#888", { selector: ".de-card__title" })).toBeInTheDocument();
  });

  it("entry toggle select adds ID when not selected", () => {
    const onSelectionChange = vi.fn();
    render(<DayDetailPanel {...makeProps({ onSelectionChange, selectedIds: new Set() })} />);
    const entryCheckbox = screen.getAllByRole("checkbox").find((el) => el.closest(".de-card"))!;
    fireEvent.click(entryCheckbox);
    expect(onSelectionChange).toHaveBeenCalledWith(new Set(["e1"]));
  });

  it("entry toggle select removes ID when already selected", () => {
    const onSelectionChange = vi.fn();
    render(<DayDetailPanel {...makeProps({ onSelectionChange, selectedIds: new Set(["e1"]) })} />);
    const entryCheckbox = screen.getAllByRole("checkbox").find((el) => el.closest(".de-card"))!;
    fireEvent.click(entryCheckbox);
    expect(onSelectionChange).toHaveBeenCalledWith(new Set());
  });

  it("entry edit button calls onEdit with full entry object", () => {
    const onEdit = vi.fn();
    render(<DayDetailPanel {...makeProps({ onEdit })} />);
    fireEvent.click(screen.getByLabelText(/bearbeiten|edit/i));
    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: "e1", issueId: 100 }));
  });

  it("entry delete button calls onDelete with entry id", () => {
    const onDelete = vi.fn();
    render(<DayDetailPanel {...makeProps({ onDelete })} />);
    fireEvent.click(screen.getByLabelText(/löschen|delete/i));
    expect(onDelete).toHaveBeenCalledWith("e1");
  });

  it("entry increase calls onUpdateDuration with duration + DURATION_STEP_MINUTES", () => {
    const onUpdateDuration = vi.fn();
    render(<DayDetailPanel {...makeProps({ onUpdateDuration })} />);
    fireEvent.click(screen.getByLabelText(/minuten mehr|minutes more/i));
    expect(onUpdateDuration).toHaveBeenCalledWith("e1", 30 + DURATION_STEP_MINUTES);
  });

  it("entry decrease calls onUpdateDuration with duration - DURATION_STEP_MINUTES", () => {
    const onUpdateDuration = vi.fn();
    render(<DayDetailPanel {...makeProps({ onUpdateDuration })} />);
    fireEvent.click(screen.getByLabelText(/minuten weniger|minutes less/i));
    expect(onUpdateDuration).toHaveBeenCalledWith("e1", 30 - DURATION_STEP_MINUTES);
  });

  it("entry decrease clamps to DURATION_MIN_MINUTES", () => {
    const onUpdateDuration = vi.fn();
    render(
      <DayDetailPanel
        {...makeProps({
          onUpdateDuration,
          unsyncedEntries: [makeEntry({ duration: 20 })],
        })}
      />,
    );
    fireEvent.click(screen.getByLabelText(/minuten weniger|minutes less/i));
    expect(onUpdateDuration).toHaveBeenCalledWith("e1", DURATION_MIN_MINUTES);
  });

  it("total hours shown when selectedDayMinutes > 0", () => {
    render(<DayDetailPanel {...makeProps({ syncedMinutes: 60, selectedDayMinutes: 90 })} />);
    expect(screen.getByText("1.5h")).toBeInTheDocument();
  });

  it("remote entry without issue shows project name as title", () => {
    render(
      <DayDetailPanel
        {...makeProps({
          activeTab: "synced",
          remoteDayEntries: [makeRemoteEntry({ issue: undefined as any })],
        })}
      />,
    );
    const titleEl = document.querySelector(".de-card--disabled .de-card__title")!;
    expect(titleEl.textContent).toBe("PX");
  });

  it("remote entry without comments hides description", () => {
    render(
      <DayDetailPanel
        {...makeProps({
          activeTab: "synced",
          remoteDayEntries: [makeRemoteEntry({ comments: "" })],
        })}
      />,
    );
    expect(screen.queryByText("synced work")).not.toBeInTheDocument();
  });

  it("uses project-specific activities when available", () => {
    render(
      <DayDetailPanel
        {...makeProps({
          activitiesByProject: {
            1: [{ id: 5, name: "ProjectDev", is_default: false }],
          },
        })}
      />,
    );
    expect(screen.getByText("ProjectDev")).toBeInTheDocument();
  });

  it("remote entry loader spinner shows in synced tab header", () => {
    render(
      <DayDetailPanel
        {...makeProps({
          remoteDayEntries: [makeRemoteEntry()],
          syncedMinutes: 90,
          selectedDayMinutes: 120,
          remoteLoading: true,
        })}
      />,
    );
    const syncedTab = screen.getByText(/gesendet|sent/i).closest("[role='tab']")!;
    expect(syncedTab.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("indeterminate checkbox state when some but not all selected", () => {
    const entries = [
      makeEntry({ id: "e1" }),
      makeEntry({ id: "e2", issueId: 101, issueSubject: "Other" }),
    ];
    const { container } = render(
      <DayDetailPanel
        {...makeProps({
          unsyncedEntries: entries,
          selectedIds: new Set(["e1"]),
        })}
      />,
    );
    expect(container.querySelector(".de-checkbox__box--indeterminate")).toBeInTheDocument();
  });

  it("no tabs rendered when both unsynced and remote entries are empty", () => {
    render(
      <DayDetailPanel
        {...makeProps({
          unsyncedEntries: [],
          remoteDayEntries: [],
          unsyncedMinutes: 0,
          selectedDayMinutes: 0,
        })}
      />,
    );
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
  });

  it("remote entry shows hours as decimal format", () => {
    render(
      <DayDetailPanel
        {...makeProps({
          activeTab: "synced",
          remoteDayEntries: [makeRemoteEntry({ hours: 1.5 })],
        })}
      />,
    );
    expect(screen.getByText("1.5h")).toBeInTheDocument();
  });
});
