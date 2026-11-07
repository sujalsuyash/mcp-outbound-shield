// Step 5: classify the input as absolute, protocol-relative, or absolute-path relative.
import type { LoadedPolicy } from "../../policy/load-policy";
import { RELATIVE_KEY } from "../../policy/validate-allowlist";
import { pass, reject, type StepResult } from "../step-result";
import type { ResolvedInput } from "../url-state";

const SCHEME = /^[a-zA-Z][a-zA-Z0-9+.-]*:/;

export function resolveRelative(text: string, loaded: LoadedPolicy): StepResult<ResolvedInput> {
  if (text.startsWith("//")) return pass({ text: `https:${text}`, relative: false });
  if (SCHEME.test(text)) return pass({ text, relative: false });
  if (text.startsWith("/") && loaded.entries.has(RELATIVE_KEY)) return pass({ text, relative: true });
  return reject("relative_not_allowed", "only absolute-path URLs can be allowed, via __relative__");
}
