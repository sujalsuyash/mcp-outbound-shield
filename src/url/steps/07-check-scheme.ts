// Step 7: https only (http only when the policy enables it).
import { pass, reject, type StepResult } from "../step-result";
import type { ParsedUrl } from "../url-state";

export function checkScheme(parsed: ParsedUrl, allowHttp: boolean): StepResult<void> {
  const protocol = parsed.url.protocol;
  if (protocol === "https:" || (allowHttp && protocol === "http:")) return pass(undefined);
  return reject("scheme_not_allowed", protocol);
}
