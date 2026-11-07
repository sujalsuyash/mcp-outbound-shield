// Step 12: query allowlist. No query unless allow_query; then names, duplicates, and value shape.
import type { AllowlistEntry } from "../../types/policy";
import { pass, reject, type StepResult } from "../step-result";
import type { ParsedUrl } from "../url-state";

const VALUE = /^[A-Za-z0-9._-]*$/;

export function matchQuery(parsed: ParsedUrl, entry: AllowlistEntry): StepResult<void> {
  const href = parsed.url.href;
  const hashAt = href.indexOf("#");
  const beforeHash = hashAt === -1 ? href : href.slice(0, hashAt);
  const queryAt = beforeHash.indexOf("?");
  if (queryAt === -1) return pass(undefined);
  if (!entry.allow_query) return reject("query_not_allowed");

  const seen = new Set<string>();
  for (const pair of beforeHash.slice(queryAt + 1).split("&")) {
    if (pair === "") return reject("query_value_invalid", "empty parameter");
    const equals = pair.indexOf("=");
    const name = equals === -1 ? pair : pair.slice(0, equals);
    const value = equals === -1 ? "" : pair.slice(equals + 1);

    if (!entry.allowed_query_params.includes(name)) return reject("query_param_not_allowed", name);
    if (seen.has(name)) return reject("query_param_duplicate", name);
    seen.add(name);
    if (value.length > entry.max_param_value_length || !VALUE.test(value)) {
      return reject("query_value_invalid", name);
    }
  }
  return pass(undefined);
}
