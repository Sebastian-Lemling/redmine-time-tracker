import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@/test/test-utils";
import { ConversationDialog } from "./ConversationDialog";
import type { RedmineIssue, RedmineJournal, RedmineAttachment } from "@/types/redmine";
import { ApiError } from "@/lib/errors";

vi.mock("../ui", () => ({
  MarkdownEditor: ({ value, onChange, placeholder, onKeyDown }: any) => (
    <textarea
      data-testid="md-editor"
      value={value}
      onChange={(e: any) => onChange(e.target.value)}
      placeholder={placeholder}
      onKeyDown={onKeyDown}
    />
  ),
  MarkdownViewer: ({ content }: any) => <div data-testid="md-viewer">{content}</div>,
  ErrorBoundary: ({ children }: any) => <>{children}</>,
}));

vi.mock("../../lib/dates", () => ({
  getTimeAgoUnit: () => ({ value: 5, unit: "minute" }),
}));

function makeIssue(overrides?: Partial<RedmineIssue>): RedmineIssue {
  return {
    id: 100,
    subject: "Test Issue",
    project: { id: 1, name: "TestProject" },
    tracker: { id: 1, name: "Bug" },
    status: { id: 1, name: "Open" },
    priority: { id: 2, name: "Normal" },
    done_ratio: 50,
    assigned_to: { id: 5, name: "Alice Dev" },
    updated_on: "2026-01-15T10:00:00Z",
    created_on: "2026-01-01T08:00:00Z",
    ...overrides,
  } as RedmineIssue;
}

function makeJournal(overrides?: Partial<RedmineJournal>): RedmineJournal {
  return {
    id: 1,
    user: { id: 10, name: "Alice Dev" },
    notes: "A comment",
    created_on: "2026-01-15T10:00:00Z",
    details: [],
    ...overrides,
  };
}

function makeAttachment(overrides?: Partial<RedmineAttachment>): RedmineAttachment {
  return {
    id: 1,
    filename: "screenshot.png",
    content_url: "https://redmine.example.com/files/screenshot.png",
    content_type: "image/png",
    filesize: 2048,
    ...overrides,
  };
}

function makeProps(overrides?: Record<string, unknown>) {
  return {
    instanceId: "default",
    issueId: 100,
    issueSubject: "Test Issue",
    issue: undefined as RedmineIssue | undefined,
    description: "Some description text" as string | undefined,
    comments: [] as RedmineJournal[],
    attachments: [] as RedmineAttachment[],
    redmineUrl: "https://redmine.example.com",
    fieldNameMap: undefined as Record<string, Record<string, string>> | undefined,
    initialTab: "comments" as "description" | "comments",
    currentUserId: undefined as number | undefined,
    onUpdateDescription: vi.fn(() => Promise.resolve()),
    onPostComment: vi.fn(() => Promise.resolve()),
    onUpdateComment: vi.fn(() => Promise.resolve()),
    onRefresh: vi.fn(),
    onClose: vi.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  Object.assign(navigator, {
    clipboard: { writeText: vi.fn(() => Promise.resolve()) },
  });
});

describe("ConversationDialog", () => {
  describe("header", () => {
    it("renders issue ID, subject, and external link", () => {
      render(<ConversationDialog {...makeProps()} />);
      expect(screen.getByText("#100")).toBeInTheDocument();
      expect(screen.getByText("Test Issue")).toBeInTheDocument();
      const link = screen.getByTitle(/Open #100 in Redmine|#100 in Redmine öffnen/);
      expect(link).toHaveAttribute("href", "https://redmine.example.com/issues/100");
      expect(link).toHaveAttribute("target", "_blank");
    });
  });

  describe("tabs", () => {
    it("switches between description and comments tabs", () => {
      render(<ConversationDialog {...makeProps({ initialTab: "comments" })} />);
      const descTab = screen.getByRole("tab", { name: /description|beschreibung/i });
      const commentsTab = screen.getByRole("tab", { name: /comments|kommentare/i });

      expect(commentsTab).toHaveAttribute("aria-selected", "true");
      expect(descTab).toHaveAttribute("aria-selected", "false");

      fireEvent.click(descTab);
      expect(descTab).toHaveAttribute("aria-selected", "true");
      expect(commentsTab).toHaveAttribute("aria-selected", "false");
    });

    it("shows comment count badge with correct count (only journals with notes)", () => {
      const comments: RedmineJournal[] = [
        makeJournal({ id: 1, notes: "Real comment" }),
        makeJournal({ id: 2, notes: "" }),
        makeJournal({ id: 3, notes: "  " }),
        makeJournal({ id: 4, notes: "Another real comment" }),
        makeJournal({ id: 5, notes: undefined as unknown as string }),
      ];
      render(<ConversationDialog {...makeProps({ comments })} />);
      expect(screen.getByText("2")).toBeInTheDocument();
    });

    it("does not show badge when no comments have notes", () => {
      const comments: RedmineJournal[] = [
        makeJournal({
          id: 1,
          notes: "",
          details: [{ property: "attr", name: "status_id", new_value: "2" }],
        }),
      ];
      const { container } = render(<ConversationDialog {...makeProps({ comments })} />);
      expect(container.querySelector(".conv-dialog__tab-badge")).not.toBeInTheDocument();
    });
  });

  describe("loading state", () => {
    it("shows spinner when description is undefined", () => {
      const { container } = render(
        <ConversationDialog
          {...makeProps({ description: undefined, initialTab: "description" })}
        />,
      );
      expect(container.querySelector(".conv-dialog__loading")).toBeInTheDocument();
    });
  });

  describe("description tab", () => {
    it("renders description text via MarkdownViewer", () => {
      render(
        <ConversationDialog
          {...makeProps({ description: "Hello world", initialTab: "description" })}
        />,
      );
      expect(screen.getByTestId("md-viewer")).toHaveTextContent("Hello world");
    });

    it("shows no-description message when description is empty", () => {
      render(<ConversationDialog {...makeProps({ description: "", initialTab: "description" })} />);
      expect(screen.getByText(/no description|keine beschreibung/i)).toBeInTheDocument();
    });
  });

  describe("description edit mode", () => {
    it("clicking pencil button opens editor with cancel and save buttons", () => {
      render(
        <ConversationDialog
          {...makeProps({ description: "Edit me", initialTab: "description" })}
        />,
      );
      const editBtn = document.querySelector(".conv-dialog__edit-btn") as HTMLElement;
      fireEvent.click(editBtn);

      expect(screen.getByTestId("md-editor")).toBeInTheDocument();
      expect(screen.getByText(/cancel|abbrechen/i)).toBeInTheDocument();
      expect(screen.getByText(/save|speichern/i)).toBeInTheDocument();
    });

    it("cancel button exits edit mode", () => {
      render(
        <ConversationDialog
          {...makeProps({ description: "Edit me", initialTab: "description" })}
        />,
      );
      fireEvent.click(document.querySelector(".conv-dialog__edit-btn") as HTMLElement);
      expect(screen.getByTestId("md-editor")).toBeInTheDocument();

      fireEvent.click(screen.getByText(/cancel|abbrechen/i));
      expect(screen.queryByTestId("md-editor")).not.toBeInTheDocument();
    });

    it("save button calls onUpdateDescription and exits edit mode", async () => {
      const onUpdateDescription = vi.fn(() => Promise.resolve());
      const onRefresh = vi.fn();
      render(
        <ConversationDialog
          {...makeProps({
            description: "Edit me",
            initialTab: "description",
            onUpdateDescription,
            onRefresh,
          })}
        />,
      );
      fireEvent.click(document.querySelector(".conv-dialog__edit-btn") as HTMLElement);
      fireEvent.click(screen.getByText(/^save$|^speichern$/i));

      await waitFor(() => {
        expect(onUpdateDescription).toHaveBeenCalledWith(100, "Edit me");
        expect(onRefresh).toHaveBeenCalledWith(100);
      });
    });

    it("Cmd+Enter triggers save on description edit", async () => {
      const onUpdateDescription = vi.fn(() => Promise.resolve());
      render(
        <ConversationDialog
          {...makeProps({
            description: "Original",
            initialTab: "description",
            onUpdateDescription,
          })}
        />,
      );
      fireEvent.click(document.querySelector(".conv-dialog__edit-btn") as HTMLElement);
      const editor = screen.getByTestId("md-editor");

      fireEvent.keyDown(editor, { key: "Enter", metaKey: true });

      await waitFor(() => {
        expect(onUpdateDescription).toHaveBeenCalled();
      });
    });

    it("pencil button on empty description opens editor", () => {
      render(<ConversationDialog {...makeProps({ description: "", initialTab: "description" })} />);
      fireEvent.click(document.querySelector(".conv-dialog__edit-btn") as HTMLElement);
      expect(screen.getByTestId("md-editor")).toBeInTheDocument();
    });
  });

  describe("comments tab — timeline rendering", () => {
    it("renders comment author names and timestamps", () => {
      const comments = [
        makeJournal({ id: 1, user: { id: 10, name: "Alice Dev" }, notes: "First comment" }),
        makeJournal({ id: 2, user: { id: 11, name: "Bob Tester" }, notes: "Second comment" }),
      ];
      render(<ConversationDialog {...makeProps({ comments })} />);
      expect(screen.getByText("Alice Dev")).toBeInTheDocument();
      expect(screen.getByText("Bob Tester")).toBeInTheDocument();
    });

    it("renders avatars with initials", () => {
      const comments = [
        makeJournal({ id: 1, user: { id: 10, name: "Alice Dev" }, notes: "Comment" }),
      ];
      const { container } = render(<ConversationDialog {...makeProps({ comments })} />);
      const avatar = container.querySelector(".conv-comment__avatar");
      expect(avatar).toBeInTheDocument();
      expect(avatar).toHaveTextContent("AD");
    });

    it("shows no comments message when empty", () => {
      render(<ConversationDialog {...makeProps({ comments: [] })} />);
      expect(screen.getByText(/no comments|keine kommentare/i)).toBeInTheDocument();
    });
  });

  describe("activity-only entries", () => {
    it("renders activity-only entries (details without notes) differently", () => {
      const comments = [
        makeJournal({
          id: 1,
          notes: "",
          user: { id: 10, name: "Alice Dev" },
          details: [{ property: "attr", name: "status_id", old_value: "1", new_value: "2" }],
        }),
      ];
      const { container } = render(<ConversationDialog {...makeProps({ comments })} />);
      expect(container.querySelector(".conv-comment--activity")).toBeInTheDocument();
      expect(container.querySelector(".conv-comment__activity-author")).toHaveTextContent(
        "Alice Dev",
      );
    });
  });

  describe("grouped comments", () => {
    it("hides avatar for consecutive comments by same author", () => {
      const comments = [
        makeJournal({ id: 1, user: { id: 10, name: "Alice Dev" }, notes: "First" }),
        makeJournal({ id: 2, user: { id: 10, name: "Alice Dev" }, notes: "Second" }),
      ];
      const { container } = render(<ConversationDialog {...makeProps({ comments })} />);
      expect(container.querySelectorAll(".conv-comment__avatar")).toHaveLength(1);
      expect(container.querySelector(".conv-comment__avatar-spacer")).toBeInTheDocument();
      expect(container.querySelector(".conv-comment--grouped")).toBeInTheDocument();
    });

    it("does not group when different authors", () => {
      const comments = [
        makeJournal({ id: 1, user: { id: 10, name: "Alice Dev" }, notes: "First" }),
        makeJournal({ id: 2, user: { id: 11, name: "Bob Tester" }, notes: "Second" }),
      ];
      const { container } = render(<ConversationDialog {...makeProps({ comments })} />);
      expect(container.querySelectorAll(".conv-comment__avatar")).toHaveLength(2);
      expect(container.querySelector(".conv-comment--grouped")).not.toBeInTheDocument();
    });
  });

  describe("comment editing", () => {
    it("own comments show edit button", () => {
      const comments = [makeJournal({ id: 1, user: { id: 10, name: "Me" }, notes: "My comment" })];
      const { container } = render(
        <ConversationDialog {...makeProps({ comments, currentUserId: 10 })} />,
      );
      expect(container.querySelector(".conv-comment__edit-btn")).toBeInTheDocument();
    });

    it("other users comments do not show edit button", () => {
      const comments = [
        makeJournal({ id: 1, user: { id: 11, name: "Other" }, notes: "Their comment" }),
      ];
      const { container } = render(
        <ConversationDialog {...makeProps({ comments, currentUserId: 10 })} />,
      );
      expect(container.querySelector(".conv-comment__edit-btn")).not.toBeInTheDocument();
    });

    it("no edit button when onUpdateComment is not provided", () => {
      const comments = [makeJournal({ id: 1, user: { id: 10, name: "Me" }, notes: "My comment" })];
      const { container } = render(
        <ConversationDialog
          {...makeProps({ comments, currentUserId: 10, onUpdateComment: undefined })}
        />,
      );
      expect(container.querySelector(".conv-comment__edit-btn")).not.toBeInTheDocument();
    });

    it("clicking edit button opens comment editor", () => {
      const comments = [makeJournal({ id: 1, user: { id: 10, name: "Me" }, notes: "My comment" })];
      const { container } = render(
        <ConversationDialog {...makeProps({ comments, currentUserId: 10 })} />,
      );
      fireEvent.click(container.querySelector(".conv-comment__edit-btn") as HTMLElement);
      const editors = screen.getAllByTestId("md-editor");
      expect(editors.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("metadata", () => {
    it("renders metadata grid when issue prop is provided", () => {
      const issue = makeIssue();
      const { container } = render(
        <ConversationDialog {...makeProps({ issue, initialTab: "description" })} />,
      );
      expect(container.querySelector(".conv-dialog__meta")).toBeInTheDocument();
      expect(container.querySelector(".conv-dialog__meta-grid")).toBeInTheDocument();
    });

    it("does not render metadata when issue is undefined", () => {
      const { container } = render(
        <ConversationDialog {...makeProps({ issue: undefined, initialTab: "description" })} />,
      );
      expect(container.querySelector(".conv-dialog__meta")).not.toBeInTheDocument();
    });

    it("renders status, priority, and tracker chips", () => {
      const issue = makeIssue({
        status: { id: 1, name: "In Progress" },
        priority: { id: 3, name: "High" },
        tracker: { id: 2, name: "Feature" },
      });
      render(<ConversationDialog {...makeProps({ issue, initialTab: "description" })} />);
      expect(screen.getByText("In Progress")).toBeInTheDocument();
      expect(screen.getByText("High")).toBeInTheDocument();
      expect(screen.getByText("Feature")).toBeInTheDocument();
    });

    it("renders fixed_version chip when present", () => {
      const issue = makeIssue({ fixed_version: { id: 1, name: "v2.0" } });
      render(<ConversationDialog {...makeProps({ issue, initialTab: "description" })} />);
      expect(screen.getByText("v2.0")).toBeInTheDocument();
    });

    it("renders assignee name", () => {
      const issue = makeIssue({ assigned_to: { id: 5, name: "Alice Dev" } });
      render(<ConversationDialog {...makeProps({ issue, initialTab: "description" })} />);
      expect(screen.getByText("Alice Dev")).toBeInTheDocument();
    });

    it("shows unassigned when no assignee", () => {
      const issue = makeIssue({ assigned_to: undefined });
      render(<ConversationDialog {...makeProps({ issue, initialTab: "description" })} />);
      expect(screen.getByText(/unassigned|nicht zugewiesen/i)).toBeInTheDocument();
    });

    it("shows done ratio percentage", () => {
      const issue = makeIssue({ done_ratio: 75 });
      render(<ConversationDialog {...makeProps({ issue, initialTab: "description" })} />);
      expect(screen.getByText("75%")).toBeInTheDocument();
    });
  });

  describe("attachments", () => {
    it("renders attachments section with file list", () => {
      const attachments = [
        makeAttachment({ id: 1, filename: "report.pdf", filesize: 1048576 }),
        makeAttachment({ id: 2, filename: "image.jpg", filesize: 512 }),
      ];
      render(<ConversationDialog {...makeProps({ attachments, initialTab: "description" })} />);
      expect(screen.getByText("report.pdf")).toBeInTheDocument();
      expect(screen.getByText("image.jpg")).toBeInTheDocument();
      expect(screen.getByText("1.0 MB")).toBeInTheDocument();
      expect(screen.getByText("512 B")).toBeInTheDocument();
    });

    it("does not render attachments section when empty", () => {
      const { container } = render(
        <ConversationDialog {...makeProps({ attachments: [], initialTab: "description" })} />,
      );
      expect(container.querySelector(".conv-dialog__attachments")).not.toBeInTheDocument();
    });

    it("renders attachment count in header", () => {
      const attachments = [makeAttachment(), makeAttachment({ id: 2, filename: "other.txt" })];
      render(<ConversationDialog {...makeProps({ attachments, initialTab: "description" })} />);
      expect(screen.getByText(/(files|dateien) \(2\)/i)).toBeInTheDocument();
    });
  });

  describe("copy button", () => {
    it("copies ticket info to clipboard", async () => {
      render(
        <ConversationDialog {...makeProps({ issue: makeIssue(), description: "Some desc" })} />,
      );
      const copyBtn = document.querySelector(".conv-dialog__copy-btn") as HTMLElement;
      fireEvent.click(copyBtn);

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalled();
        const text = (navigator.clipboard.writeText as ReturnType<typeof vi.fn>).mock
          .calls[0][0] as string;
        expect(text).toContain("#100");
        expect(text).toContain("Test Issue");
        expect(text).toContain("https://redmine.example.com/issues/100");
      });
    });
  });

  describe("dialog close", () => {
    it("Escape key closes dialog", () => {
      const onClose = vi.fn();
      render(<ConversationDialog {...makeProps({ onClose })} />);
      fireEvent.keyDown(window, { key: "Escape" });
      expect(onClose).toHaveBeenCalled();
    });

    it("backdrop click closes dialog", () => {
      const onClose = vi.fn();
      const { container } = render(<ConversationDialog {...makeProps({ onClose })} />);
      const backdrop = container.querySelector(".conv-dialog__backdrop") as HTMLElement;
      fireEvent.click(backdrop);
      expect(onClose).toHaveBeenCalled();
    });

    it("clicking inside dialog does not close it", () => {
      const onClose = vi.fn();
      render(<ConversationDialog {...makeProps({ onClose })} />);
      const dialog = screen.getByRole("dialog");
      fireEvent.click(dialog);
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe("error handling", () => {
    it("error toast appears on save failure", async () => {
      const onUpdateDescription = vi.fn(() => Promise.reject(new Error("Network fail")));
      render(
        <ConversationDialog
          {...makeProps({ description: "Text", initialTab: "description", onUpdateDescription })}
        />,
      );
      fireEvent.click(document.querySelector(".conv-dialog__edit-btn") as HTMLElement);
      fireEvent.click(screen.getByText(/^save$|^speichern$/i));

      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
        expect(screen.getByText(/save failed|speichern fehlgeschlagen/i)).toBeInTheDocument();
      });
    });

    it("shows forbidden message on ApiError 403", async () => {
      const onPostComment = vi.fn(() => Promise.reject(new ApiError("Forbidden", 403)));
      render(<ConversationDialog {...makeProps({ onPostComment })} />);
      const editors = screen.getAllByTestId("md-editor");
      const commentEditor = editors[editors.length - 1];
      fireEvent.change(commentEditor, { target: { value: "test" } });

      const sendBtn = document.querySelector(".conv-dialog__send-btn") as HTMLElement;
      fireEvent.click(sendBtn);

      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
        expect(screen.getByText(/no permission|keine berechtigung/i)).toBeInTheDocument();
      });
    });
  });

  describe("send button", () => {
    it("send button is disabled when comment text is empty", () => {
      render(<ConversationDialog {...makeProps()} />);
      const sendBtn = document.querySelector(".conv-dialog__send-btn") as HTMLElement;
      expect(sendBtn).toBeDisabled();
    });

    it("send button is enabled when comment has text", () => {
      render(<ConversationDialog {...makeProps()} />);
      const editors = screen.getAllByTestId("md-editor");
      const commentEditor = editors[editors.length - 1];
      fireEvent.change(commentEditor, { target: { value: "Hello" } });

      const sendBtn = document.querySelector(".conv-dialog__send-btn") as HTMLElement;
      expect(sendBtn).not.toBeDisabled();
    });

    it("sends comment and clears input on success", async () => {
      const onPostComment = vi.fn(() => Promise.resolve());
      const onRefresh = vi.fn();
      render(<ConversationDialog {...makeProps({ onPostComment, onRefresh })} />);
      const editors = screen.getAllByTestId("md-editor");
      const commentEditor = editors[editors.length - 1];
      fireEvent.change(commentEditor, { target: { value: "New comment" } });

      const sendBtn = document.querySelector(".conv-dialog__send-btn") as HTMLElement;
      fireEvent.click(sendBtn);

      await waitFor(() => {
        expect(onPostComment).toHaveBeenCalledWith(100, "New comment");
        expect(onRefresh).toHaveBeenCalledWith(100);
      });
    });
  });

  describe("comment input visibility", () => {
    it("comment input is visible on comments tab", () => {
      const { container } = render(<ConversationDialog {...makeProps()} />);
      expect(container.querySelector(".conv-dialog__input")).toBeInTheDocument();
    });

    it("comment input is not visible on description tab", () => {
      const { container } = render(
        <ConversationDialog {...makeProps({ initialTab: "description" })} />,
      );
      expect(container.querySelector(".conv-dialog__input")).not.toBeInTheDocument();
    });
  });

  describe("Escape key precedence", () => {
    it("Escape closes comment edit before closing dialog", () => {
      const onClose = vi.fn();
      const comments = [makeJournal({ id: 1, user: { id: 10, name: "Me" }, notes: "My comment" })];
      const { container } = render(
        <ConversationDialog {...makeProps({ comments, currentUserId: 10, onClose })} />,
      );
      fireEvent.click(container.querySelector(".conv-comment__edit-btn") as HTMLElement);
      expect(screen.getAllByTestId("md-editor").length).toBeGreaterThanOrEqual(2);

      fireEvent.keyDown(window, { key: "Escape" });
      expect(onClose).not.toHaveBeenCalled();

      fireEvent.keyDown(window, { key: "Escape" });
      expect(onClose).toHaveBeenCalled();
    });

    it("Escape closes description edit before closing dialog", () => {
      const onClose = vi.fn();
      render(
        <ConversationDialog
          {...makeProps({ description: "Text", initialTab: "description", onClose })}
        />,
      );
      fireEvent.click(document.querySelector(".conv-dialog__edit-btn") as HTMLElement);
      expect(screen.getByTestId("md-editor")).toBeInTheDocument();

      fireEvent.keyDown(window, { key: "Escape" });
      expect(onClose).not.toHaveBeenCalled();

      fireEvent.keyDown(window, { key: "Escape" });
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe("field change details in comments", () => {
    it("renders field change chips on a comment with details", () => {
      const comments = [
        makeJournal({
          id: 1,
          notes: "Changed status",
          details: [
            { property: "attr", name: "status_id", old_value: "New", new_value: "In Progress" },
          ],
        }),
      ];
      const { container } = render(<ConversationDialog {...makeProps({ comments })} />);
      expect(container.querySelector(".conv-comment__change-chip")).toBeInTheDocument();
      expect(screen.getByText("Status")).toBeInTheDocument();
      expect(screen.getByText("New → In Progress")).toBeInTheDocument();
    });

    it("uses fieldNameMap to resolve values", () => {
      const comments = [
        makeJournal({
          id: 1,
          notes: "",
          details: [{ property: "attr", name: "status_id", old_value: "1", new_value: "2" }],
        }),
      ];
      const fieldNameMap = { status_id: { "1": "Open", "2": "Closed" } };
      render(<ConversationDialog {...makeProps({ comments, fieldNameMap })} />);
      expect(screen.getByText("Open → Closed")).toBeInTheDocument();
    });
  });
});
