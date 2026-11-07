// Produces the string that is emitted to the renderer: the full canonical URL, or path-only for relatives.
import type { ParsedUrl } from "./url-state";

export function emitCanonical(parsed: ParsedUrl, url: URL): string {
  return parsed.relative ? `${url.pathname}${url.search}${url.hash}` : url.href;
}
