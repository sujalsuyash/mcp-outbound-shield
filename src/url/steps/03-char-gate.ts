// Step 3: reject anything outside printable ASCII (U+0021 to U+007E). Nothing is silently stripped.
import { pass, reject, type StepResult } from "../step-result";

const ILLEGAL = /[^\u0021-\u007e]/;

export function charGate(text: string): StepResult<string> {
  const match = ILLEGAL.exec(text);
  if (match === null) return pass(text);
  const codePoint = match[0].codePointAt(0) ?? 0;
  return reject("illegal_char", `U+${codePoint.toString(16).toUpperCase().padStart(4, "0")}`);
}
