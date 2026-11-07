// Step 6: WHATWG parse. The hand-over point from strings to a URL object.
import { pass, reject, type StepResult } from "../step-result";
import { RELATIVE_BASE, RELATIVE_HOST, type ParsedUrl, type ResolvedInput } from "../url-state";

export function parseWhatwg(input: ResolvedInput): StepResult<ParsedUrl> {
  try {
    const url = input.relative ? new URL(input.text, RELATIVE_BASE) : new URL(input.text);
    if (input.relative && url.host !== RELATIVE_HOST) {
      return reject("parse_failed", "relative URL escaped the placeholder base");
    }
    return pass({ url, relative: input.relative });
  } catch {
    return reject("parse_failed");
  }
}
