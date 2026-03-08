import { useEffect, useCallback, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { common, createLowlight } from "lowlight";
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Link as LinkIcon,
  List,
  ListOrdered,
  Heading2,
  Quote,
  Undo2,
  Redo2,
} from "lucide-react";
import { htmlToMarkdown, markdownToHtml } from "./markdown-utils";

const lowlight = createLowlight(common);

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  autoFocus?: boolean;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  baseUrl?: string;
  attachmentMap?: Record<string, string>;
  redmineUrl?: string;
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder,
  autoFocus,
  onKeyDown,
  baseUrl,
  attachmentMap,
  redmineUrl,
}: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        link: false,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "md-editor__link" },
      }),
      Image.configure({
        HTMLAttributes: { class: "md-viewer__image" },
      }),
      Placeholder.configure({
        placeholder: placeholder ?? "",
      }),
    ],
    content: value ? markdownToHtml(value, baseUrl, attachmentMap, redmineUrl) : "",
    autofocus: autoFocus ? "end" : false,
    onUpdate: ({ editor: ed }) => {
      onChange(htmlToMarkdown(ed.getHTML()));
    },
    editorProps: {
      attributes: {
        class: "md-editor__content",
      },
      handleKeyDown: (_view, event) => {
        if (onKeyDown) {
          onKeyDown(event as unknown as React.KeyboardEvent<HTMLTextAreaElement>);
        }
        return false;
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    const currentMd = htmlToMarkdown(editor.getHTML());
    if (currentMd !== value) {
      editor.commands.setContent(
        value ? markdownToHtml(value, baseUrl, attachmentMap, redmineUrl) : "",
      );
    }
  }, [value, editor, baseUrl, attachmentMap, redmineUrl]);

  const setLink = useCallback(() => {
    if (!editor) return;
    const prev = editor.getAttributes("link").href;
    const url = window.prompt("URL", prev ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    }
  }, [editor]);

  if (!editor) return null;

  return (
    <div className="md-editor">
      <div className="md-editor__toolbar">
        <ToolbarBtn
          icon={Bold}
          label="Bold"
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        />
        <ToolbarBtn
          icon={Italic}
          label="Italic"
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        />
        <ToolbarBtn
          icon={Strikethrough}
          label="Strikethrough"
          active={editor.isActive("strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        />
        <div className="md-editor__toolbar-sep" />
        <ToolbarBtn
          icon={Heading2}
          label="Heading"
          active={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        />
        <ToolbarBtn
          icon={Quote}
          label="Quote"
          active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        />
        <ToolbarBtn
          icon={Code}
          label="Code"
          active={editor.isActive("code")}
          onClick={() => editor.chain().focus().toggleCode().run()}
        />
        <div className="md-editor__toolbar-sep" />
        <ToolbarBtn
          icon={List}
          label="Bullet list"
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        />
        <ToolbarBtn
          icon={ListOrdered}
          label="Numbered list"
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        />
        <ToolbarBtn
          icon={LinkIcon}
          label="Link"
          active={editor.isActive("link")}
          onClick={setLink}
        />
        <div className="md-editor__toolbar-sep" />
        <ToolbarBtn
          icon={Undo2}
          label="Undo"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
        />
        <ToolbarBtn
          icon={Redo2}
          label="Redo"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
        />
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

function ToolbarBtn({
  icon: Icon,
  label,
  active,
  disabled,
  onClick,
}: {
  icon: React.FC<{ size?: number }>;
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`md-editor__toolbar-btn${active ? " md-editor__toolbar-btn--active" : ""}`}
      title={label}
      onClick={onClick}
      disabled={disabled}
      tabIndex={-1}
    >
      <Icon size={15} />
    </button>
  );
}

const COPY_SVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
const CHECK_SVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;

export function MarkdownViewer({
  content,
  baseUrl,
  attachmentMap,
  redmineUrl,
}: {
  content: string;
  baseUrl?: string;
  attachmentMap?: Record<string, string>;
  redmineUrl?: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        link: false,
        codeBlock: false,
      }),
      CodeBlockLowlight.configure({
        lowlight,
        defaultLanguage: null,
      }),
      Link.configure({
        openOnClick: true,
        HTMLAttributes: { class: "md-editor__link" },
      }),
      Image.configure({
        HTMLAttributes: { class: "md-viewer__image" },
      }),
    ],
    content: content ? markdownToHtml(content, baseUrl, attachmentMap, redmineUrl) : "",
    editable: false,
  });

  useEffect(() => {
    if (!editor) return;
    editor.commands.setContent(
      content ? markdownToHtml(content, baseUrl, attachmentMap, redmineUrl) : "",
    );
  }, [content, editor, baseUrl, attachmentMap, redmineUrl]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    const injectButtons = () => {
      el.querySelectorAll("pre").forEach((pre) => {
        if (pre.querySelector(".md-viewer__copy-btn")) return;
        const btn = document.createElement("button");
        btn.className = "md-viewer__copy-btn";
        btn.type = "button";
        btn.title = "Copy";
        btn.innerHTML = COPY_SVG;
        btn.addEventListener("click", () => {
          const code = pre.querySelector("code");
          const text = (code ?? pre).textContent ?? "";
          navigator.clipboard.writeText(text).then(() => {
            btn.innerHTML = CHECK_SVG;
            btn.classList.add("md-viewer__copy-btn--copied");
            setTimeout(() => {
              btn.innerHTML = COPY_SVG;
              btn.classList.remove("md-viewer__copy-btn--copied");
            }, 1500);
          });
        });
        pre.style.position = "relative";
        pre.appendChild(btn);
      });
    };

    const timer = setTimeout(injectButtons, 50);
    return () => clearTimeout(timer);
  }, [content, editor]);

  if (!editor) return null;

  return (
    <div className="md-viewer" ref={wrapRef}>
      <EditorContent editor={editor} />
    </div>
  );
}
