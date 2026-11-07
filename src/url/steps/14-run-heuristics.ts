// Step 14: call the heuristic checks in order. No heuristic logic here.
import type { CompiledEntry } from "../../policy/load-policy";
import type { DefaultHeuristics } from "../../types/policy";
import { extractTokens } from "../extract-tokens";
import { hasBase64Signature } from "../heuristics/base64-signature";
import { hasHighEntropy } from "../heuristics/entropy-check";
import { hasHexRun } from "../heuristics/hex-run";
import { exceedsLength } from "../heuristics/length-check";
import { pass, reject, type StepResult } from "../step-result";

export function runHeuristics(
  url: URL,
  entry: CompiledEntry,
  heuristics: DefaultHeuristics
): StepResult<void> {
  const maxLength = entry.entry.max_uri_length ?? heuristics.max_uri_length;
  if (exceedsLength(url.href, maxLength)) return reject("uri_too_long", String(url.href.length));

  const tokens = extractTokens(url, entry);
  if (tokens.some(hasBase64Signature)) return reject("base64_signature");
  if (!entry.entry.allow_uuid_or_sha_paths && tokens.some(hasHexRun)) return reject("hex_run");
  if (tokens.some((token) => hasHighEntropy(token, heuristics.max_segment_entropy))) {
    return reject("high_entropy");
  }
  return pass(undefined);
}
