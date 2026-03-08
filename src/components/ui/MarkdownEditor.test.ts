import { describe, it, expect } from "vitest";
import {
  textileToMarkdown,
  resolveAttachmentUrl,
  markdownToHtml,
  htmlToMarkdown,
} from "@/components/ui/markdown-utils";

describe("textileToMarkdown", () => {
  it("converts simple textile image to markdown", () => {
    expect(textileToMarkdown("!image.png!")).toBe("![](image.png)");
  });

  it("converts textile image with alt text", () => {
    expect(textileToMarkdown("!image.png(alt text)!")).toBe("![alt text](image.png)");
  });

  it("strips style prefix from textile image", () => {
    expect(textileToMarkdown("!{width:400px}image.png!")).toBe("![](image.png)");
  });

  it("strips style prefix and preserves alt text", () => {
    expect(textileToMarkdown("!{width:50%}photo.jpg(Caption)!")).toBe("![Caption](photo.jpg)");
  });

  it("converts textile image with absolute URL", () => {
    expect(textileToMarkdown("!https://example.com/img.png!")).toBe(
      "![](https://example.com/img.png)",
    );
  });

  it("converts h1 heading", () => {
    expect(textileToMarkdown("h1. Heading")).toBe("# Heading");
  });

  it("converts h2 heading", () => {
    expect(textileToMarkdown("h2. Heading")).toBe("## Heading");
  });

  it("converts h3 heading", () => {
    expect(textileToMarkdown("h3. Heading")).toBe("### Heading");
  });

  it("converts h6 heading", () => {
    expect(textileToMarkdown("h6. Deep heading")).toBe("###### Deep heading");
  });

  it("leaves text without textile syntax unchanged", () => {
    expect(textileToMarkdown("Just some plain text")).toBe("Just some plain text");
  });

  it("handles multiple images in same text", () => {
    const input = "See !a.png! and !b.png(icon)!";
    expect(textileToMarkdown(input)).toBe("See ![](a.png) and ![icon](b.png)");
  });

  it("does not convert single exclamation marks in normal text", () => {
    expect(textileToMarkdown("This is important!")).toBe("This is important!");
  });

  it("does not convert double exclamation marks separated by space", () => {
    expect(textileToMarkdown("wow! that! is cool")).toBe("wow! that! is cool");
  });

  it("converts heading on multiple lines", () => {
    const input = "h1. Title\nSome text\nh2. Subtitle";
    expect(textileToMarkdown(input)).toBe("# Title\nSome text\n## Subtitle");
  });

  it("handles textile image with path containing slashes", () => {
    expect(textileToMarkdown("!/attachments/download/123/file.png!")).toBe(
      "![](/attachments/download/123/file.png)",
    );
  });

  it("preserves existing markdown image syntax", () => {
    const md = "![alt](image.png)";
    expect(textileToMarkdown(md)).toBe(md);
  });
});

describe("resolveAttachmentUrl", () => {
  it("extracts pathname from absolute URL and prepends baseUrl", () => {
    expect(
      resolveAttachmentUrl("https://redmine.example.com/attachments/download/1/file.png", "/api"),
    ).toBe("/api/attachments/download/1/file.png");
  });

  it("returns original URL when no baseUrl provided", () => {
    const url = "https://redmine.example.com/attachments/download/1/file.png";
    expect(resolveAttachmentUrl(url)).toBe(url);
  });

  it("returns original string for invalid URL", () => {
    expect(resolveAttachmentUrl("not-a-url", "/api")).toBe("not-a-url");
  });

  it("returns original string for relative path (non-URL)", () => {
    expect(resolveAttachmentUrl("file.png", "/api")).toBe("file.png");
  });

  it("handles URL with query params", () => {
    expect(resolveAttachmentUrl("https://example.com/img.png?v=1", "/api")).toBe("/api/img.png");
  });
});

describe("markdownToHtml", () => {
  it("returns empty string for empty input", () => {
    expect(markdownToHtml("")).toBe("");
  });

  it("resolves image filename through attachmentMap", () => {
    const attachmentMap = {
      "file.png": "https://redmine.example.com/attachments/download/1/file.png",
    };
    const result = markdownToHtml("![](file.png)", "/api", attachmentMap);
    expect(result).toContain("/api/attachments/download/1/file.png");
  });

  it("uses baseUrl for relative path without attachmentMap match", () => {
    const result = markdownToHtml("![](/attachments/download/123/file.png)", "/api");
    expect(result).toContain("/api/attachments/download/123/file.png");
  });

  it("leaves absolute external URL unchanged", () => {
    const result = markdownToHtml("![](https://example.com/img.png)");
    expect(result).toContain("https://example.com/img.png");
  });

  it("rewrites absolute URL matching redmineUrl to proxy", () => {
    const result = markdownToHtml(
      "![](https://redmine.server.com/attachments/download/5/pic.png)",
      "/api",
      undefined,
      "https://redmine.server.com",
    );
    expect(result).toContain("/api/attachments/download/5/pic.png");
    expect(result).not.toContain("https://redmine.server.com");
  });

  it("does not rewrite absolute URL when it does not match redmineUrl", () => {
    const result = markdownToHtml(
      "![](https://other.server.com/img.png)",
      "/api",
      undefined,
      "https://redmine.server.com",
    );
    expect(result).toContain("https://other.server.com/img.png");
  });

  it("handles mixed text and images", () => {
    const result = markdownToHtml("Hello ![](pic.png) world", "/api");
    expect(result).toContain("Hello");
    expect(result).toContain("world");
    expect(result).toContain("/api/pic.png");
  });

  it("converts textile images before processing markdown", () => {
    const result = markdownToHtml("!screenshot.png!", "/api");
    expect(result).toContain("/api/screenshot.png");
  });

  it("converts textile headings in the pipeline", () => {
    const result = markdownToHtml("h2. My Title");
    expect(result).toContain("My Title");
    expect(result).toMatch(/<h2/);
  });

  it("handles attachmentMap with baseUrl resolving correctly", () => {
    const attachmentMap = { "logo.png": "https://redmine.test/attachments/download/42/logo.png" };
    const result = markdownToHtml("![Logo](logo.png)", "/api", attachmentMap);
    expect(result).toContain("/api/attachments/download/42/logo.png");
    expect(result).toContain("Logo");
  });

  it("prepends slash for relative path without leading slash", () => {
    const result = markdownToHtml("![](attachments/download/99/img.png)", "/api");
    expect(result).toContain("/api/attachments/download/99/img.png");
  });

  it("does not double slash for paths already starting with slash", () => {
    const result = markdownToHtml("![](/attachments/download/99/img.png)", "/api");
    expect(result).toContain("/api/attachments/download/99/img.png");
    expect(result).not.toContain("/api//attachments");
  });

  it("returns valid HTML for plain markdown text", () => {
    const result = markdownToHtml("**bold** and *italic*");
    expect(result).toContain("<strong>bold</strong>");
    expect(result).toContain("<em>italic</em>");
  });
});

describe("htmlToMarkdown", () => {
  it("returns empty string for empty input", () => {
    expect(htmlToMarkdown("")).toBe("");
  });

  it("returns empty string for empty paragraph", () => {
    expect(htmlToMarkdown("<p></p>")).toBe("");
  });

  it("converts paragraph to plain text", () => {
    expect(htmlToMarkdown("<p>Hello world</p>")).toBe("Hello world");
  });

  it("converts bold HTML to markdown", () => {
    expect(htmlToMarkdown("<p><strong>bold</strong></p>")).toBe("**bold**");
  });

  it("converts italic HTML to markdown", () => {
    expect(htmlToMarkdown("<p><em>italic</em></p>")).toBe("_italic_");
  });

  it("converts strikethrough HTML to markdown", () => {
    expect(htmlToMarkdown("<p><del>removed</del></p>")).toBe("~~removed~~");
  });

  it("converts heading to atx-style markdown", () => {
    expect(htmlToMarkdown("<h2>Title</h2>")).toBe("## Title");
  });

  it("converts unordered list with dash bullets", () => {
    const result = htmlToMarkdown("<ul><li>one</li><li>two</li></ul>");
    expect(result).toContain("-   one");
    expect(result).toContain("-   two");
  });

  it("converts ordered list", () => {
    const result = htmlToMarkdown("<ol><li>first</li><li>second</li></ol>");
    expect(result).toContain("1.");
    expect(result).toContain("first");
  });

  it("converts link to markdown", () => {
    expect(htmlToMarkdown('<a href="https://example.com">link</a>')).toBe(
      "[link](https://example.com)",
    );
  });

  it("converts image to markdown", () => {
    const result = htmlToMarkdown('<img src="pic.png" alt="photo">');
    expect(result).toBe("![photo](pic.png)");
  });
});
