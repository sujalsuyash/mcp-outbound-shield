// Step 11: segment charset and length, depth, then the allowed path patterns.
import type { CompiledEntry } from "../../policy/load-policy";
import type { DefaultHeuristics } from "../../types/policy";
import { pass, reject, type StepResult } from "../step-result";
import type { ParsedUrl } from "../url-state";

const SEGMENT = /^[A-Za-z0-9._-]+$/;

export function matchPath(
  parsed: ParsedUrl,
  entry: CompiledEntry,
  heuristics: DefaultHeuristics
): StepResult<void> {
  const { pathname } = parsed.url;
  const segments = pathname === "/" ? [] : pathname.slice(1).split("/");

  for (const segment of segments) {
    if (segment.length === 0 || segment.length > heuristics.max_segment_length || !SEGMENT.test(segment)) {
      return reject("path_charset", segment.slice(0, 40));
    }
  }
  if (segments.length > heuristics.max_path_depth) return reject("path_too_deep", String(segments.length));
  if (!entry.patterns.some((pattern) => pattern.matches(pathname))) return reject("path_not_allowed", pathname);
  return pass(undefined);
}
