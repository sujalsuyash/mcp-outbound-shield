// Canonicalizes an ordinary http(s) link for display (no allowlist). Returns the parser's own href, or null.
// Looser than image evaluation on purpose: the emitted value is the browser's view, and a link needs a click.
import type { LoadedPolicy } from "../policy/load-policy";
import { rejectResidualEntities } from "../url/steps/01-reject-residual-entities";
import { trimAndStrip } from "../url/steps/02-trim-and-strip";
import { resolveRelative } from "../url/steps/05-resolve-relative";
import { parseWhatwg } from "../url/steps/06-parse-whatwg";
import { checkScheme } from "../url/steps/07-check-scheme";
import { checkAuthority } from "../url/steps/08-check-authority";

export function canonicalizeWebUrl(raw: string, loaded: LoadedPolicy): string | null {
  try {
    const s1 = rejectResidualEntities(raw);
    if (!s1.ok) return null;
    const s5 = resolveRelative(trimAndStrip(s1.value), loaded);
    if (!s5.ok || s5.value.relative) return null;
    const s6 = parseWhatwg(s5.value);
    if (!s6.ok) return null;
    if (!checkScheme(s6.value, true).ok) return null;
    if (!checkAuthority(s6.value).ok) return null;
    return s6.value.url.href;
  } catch {
    return null;
  }
}
