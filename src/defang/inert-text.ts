// Wraps text so a renderer shows it literally: a code span per line (Markdown) or escaped text (HTML).
// Any URL inside is defanged first.
import { defangText } from "./defang-text";

function codeSpan(content: string): string {
  const longestRun = Math.max(0, ...(content.match(/`+/g) ?? []).map((run) => run.length));
  const fence = "`".repeat(longestRun + 1);
  const pad = content.startsWith("`") || content.endsWith("`") ? " " : "";
  return `${fence}${pad}${content}${pad}${fence}`;
}

/** One self-contained code span per non-blank line, so blank lines cannot end a span early. */
export function toInertMarkdown(text: string): string {
  return text
    .split(/\r\n|\r|\n/)
    .map((line) => (line.trim() === "" ? "" : codeSpan(defangText(line))))
    .join("\n");
}

export function toInertHtml(text: string): string {
  return defangText(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
