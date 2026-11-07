// Step 4: reject backslashes, %25 anywhere, and % or ; anywhere before the first ? or #.
import { pass, reject, type StepResult } from "../step-result";

export function delimiterGate(text: string): StepResult<string> {
  if (text.includes("\\")) return reject("illegal_delimiter", "backslash");
  if (/%25/i.test(text)) return reject("illegal_delimiter", "double percent-encoding");

  const boundary = text.search(/[?#]/);
  const beforeQuery = boundary === -1 ? text : text.slice(0, boundary);
  if (beforeQuery.includes("%")) return reject("illegal_delimiter", "percent-encoding before the query");
  if (beforeQuery.includes(";")) return reject("illegal_delimiter", "semicolon before the query");
  return pass(text);
}
