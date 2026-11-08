// Applies link_handling_mode to a classified link. Returns structured parts; the Markdown/HTML passes
// turn them into nodes, so serializers do the escaping.
import { defangText } from "../defang/defang-text";
import { defangUrl } from "../defang/defang-url";
import type { LinkHandlingMode } from "../types/policy";
import type { LinkClassification } from "./classify-link";

export const WARNING_MARKER = " ⚠️";

export type LinkPart =
  | { readonly kind: "text"; readonly value: string }
  | { readonly kind: "code"; readonly value: string }
  | { readonly kind: "link"; readonly url: string; readonly text: string };

export interface LinkInput {
  readonly mode: LinkHandlingMode;
  /** Visible text of the link. For an autolink this is the URL as written. */
  readonly text: string;
  /** True when the link text is the URL itself (bare URL, www., or <url>). */
  readonly autolink: boolean;
  readonly classification: LinkClassification;
}

const text = (value: string): LinkPart => ({ kind: "text", value });
const code = (value: string): LinkPart => ({ kind: "code", value });

export function applyLinkMode(input: LinkInput): LinkPart[] {
  const { mode, autolink, classification } = input;
  const safeText = defangText(input.text);

  if (classification.kind === "unusable") return [text(safeText)];

  const link: LinkPart = { kind: "link", url: classification.canonical, text: input.text };
  if (classification.kind === "trusted" || mode === "allow") return [link];
  if (mode === "warn") return [link, text(WARNING_MARKER)];

  if (mode === "strip_untrusted") return autolink ? [] : [text(safeText)];

  // defang_untrusted
  if (autolink) return [code(defangUrl(input.text))];
  const shown = defangUrl(classification.canonical);
  return input.text.trim() === "" ? [code(shown)] : [text(safeText), text(" ("), code(shown), text(")")];
}
