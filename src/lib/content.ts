import { marked } from "marked";
import sanitizeHtml from "sanitize-html";

/**
 * Tags/attributes we allow in stored document HTML. This is intentionally
 * limited to what the TipTap editor can produce (the required formatting set).
 */
const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p",
    "br",
    "strong",
    "b",
    "em",
    "i",
    "u",
    "s",
    "h1",
    "h2",
    "h3",
    "ul",
    "ol",
    "li",
    "blockquote",
    "code",
    "pre",
    "hr",
  ],
  allowedAttributes: {},
  // Drop the contents of anything not on the allow-list (e.g. <script>).
  disallowedTagsMode: "discard",
};

/** Sanitize editor-provided HTML before persisting it. */
export function sanitizeDocumentHtml(html: string): string {
  return sanitizeHtml(html, SANITIZE_OPTIONS).trim();
}

/** Escape plain text so it can be embedded safely in HTML. */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Convert an uploaded .txt file into simple paragraph HTML. */
export function txtToHtml(text: string): string {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const paragraphs = normalized
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => `<p>${escapeHtml(block).replace(/\n/g, "<br>")}</p>`);
  return paragraphs.join("") || "<p></p>";
}

/** Convert an uploaded .md file into sanitized HTML. */
export function markdownToHtml(text: string): string {
  const rawHtml = marked.parse(text, { async: false, gfm: true, breaks: false });
  return sanitizeDocumentHtml(rawHtml) || "<p></p>";
}
