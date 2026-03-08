import TurndownService from "turndown";
import { marked } from "marked";

const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  bulletListMarker: "-",
});

turndown.addRule("strikethrough", {
  filter: ["del", "s"],
  replacement: (content) => `~~${content}~~`,
});

marked.setOptions({ breaks: true, gfm: true });

export function htmlToMarkdown(html: string): string {
  if (!html || html === "<p></p>") return "";
  return turndown.turndown(html);
}

// Textile images: !url!, !{style}url!, !url(alt)!
export function textileToMarkdown(text: string): string {
  let result = text;
  result = result.replace(
    /!(?:\{[^}]*\})?([^\s!{][^!\n]*?)(?:\(([^)]*)\))?!/g,
    (_match, url: string, alt: string) => {
      if (url.includes("(")) return _match;
      return `![${alt ?? ""}](${url})`;
    },
  );
  result = result.replace(
    /^h([1-6])\.\s+(.+)$/gm,
    (_m, level: string, content: string) => `${"#".repeat(Number(level))} ${content}`,
  );
  return result;
}

export function resolveAttachmentUrl(contentUrl: string, baseUrl?: string): string {
  try {
    const parsed = new URL(contentUrl);
    const path = parsed.pathname;
    return baseUrl ? `${baseUrl}${path}` : contentUrl;
  } catch {
    return contentUrl;
  }
}

export function markdownToHtml(
  md: string,
  baseUrl?: string,
  attachmentMap?: Record<string, string>,
  redmineUrl?: string,
): string {
  if (!md) return "";
  let text = textileToMarkdown(md);
  text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_m, alt: string, url: string) => {
    if (/^https?:\/\//.test(url)) {
      if (redmineUrl && baseUrl && url.startsWith(redmineUrl)) {
        const path = url.slice(redmineUrl.length);
        return `![${alt}](${baseUrl}${path.startsWith("/") ? "" : "/"}${path})`;
      }
      return _m;
    }
    if (attachmentMap?.[url]) {
      return `![${alt}](${resolveAttachmentUrl(attachmentMap[url], baseUrl)})`;
    }
    if (baseUrl) {
      return `![${alt}](${baseUrl}${url.startsWith("/") ? "" : "/"}${url})`;
    }
    return _m;
  });
  return marked.parse(text, { async: false }) as string;
}
