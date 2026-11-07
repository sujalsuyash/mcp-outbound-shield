// Orchestrator: runs the URL steps in order and returns a verdict. Fails closed on any exception.
import type { LoadedPolicy } from "../policy/load-policy";
import type { Verdict } from "../types/verdict";
import type { Vector } from "../types/vector";
import { emitCanonical } from "./emit-canonical";
import { toVerdict } from "./step-result";
import { rejectResidualEntities } from "./steps/01-reject-residual-entities";
import { trimAndStrip } from "./steps/02-trim-and-strip";
import { charGate } from "./steps/03-char-gate";
import { delimiterGate } from "./steps/04-delimiter-gate";
import { resolveRelative } from "./steps/05-resolve-relative";
import { parseWhatwg } from "./steps/06-parse-whatwg";
import { checkScheme } from "./steps/07-check-scheme";
import { checkAuthority } from "./steps/08-check-authority";
import { checkPort } from "./steps/09-check-port";
import { matchHost } from "./steps/10-match-host";
import { matchPath } from "./steps/11-match-path";
import { matchQuery } from "./steps/12-match-query";
import { stripFragment } from "./steps/13-strip-fragment";
import { runHeuristics } from "./steps/14-run-heuristics";

export function evaluateUrl(raw: string, vector: Vector, loaded: LoadedPolicy): Verdict {
  try {
    const { policy } = loaded;

    const s1 = rejectResidualEntities(raw);
    if (!s1.ok) return toVerdict(s1);
    const s3 = charGate(trimAndStrip(s1.value));
    if (!s3.ok) return toVerdict(s3);
    const s4 = delimiterGate(s3.value);
    if (!s4.ok) return toVerdict(s4);
    const s5 = resolveRelative(s4.value, loaded);
    if (!s5.ok) return toVerdict(s5);
    const s6 = parseWhatwg(s5.value);
    if (!s6.ok) return toVerdict(s6);
    const parsed = s6.value;

    const s7 = checkScheme(parsed, policy.allow_http);
    if (!s7.ok) return toVerdict(s7);
    const s8 = checkAuthority(parsed);
    if (!s8.ok) return toVerdict(s8);
    const s9 = checkPort(parsed, loaded);
    if (!s9.ok) return toVerdict(s9);
    const s10 = matchHost(parsed, loaded);
    if (!s10.ok) return toVerdict(s10);
    const entry = s10.value;
    const s11 = matchPath(parsed, entry, policy.default_heuristics);
    if (!s11.ok) return toVerdict(s11);
    const s12 = matchQuery(parsed, entry.entry);
    if (!s12.ok) return toVerdict(s12);

    const finalUrl = stripFragment(parsed, vector);
    const s14 = runHeuristics(finalUrl, entry, policy.default_heuristics);
    if (!s14.ok) return toVerdict(s14);

    return { allow: true, canonical: emitCanonical(parsed, finalUrl) };
  } catch {
    return { allow: false, reason: "internal_error" };
  }
}
