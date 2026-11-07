// Step 9: a non-default port is only allowed when the exact host:port is an allowlist key.
import type { LoadedPolicy } from "../../policy/load-policy";
import { pass, reject, type StepResult } from "../step-result";
import type { ParsedUrl } from "../url-state";

export function checkPort(parsed: ParsedUrl, loaded: LoadedPolicy): StepResult<void> {
  const { hostname, port } = parsed.url;
  if (port === "") return pass(undefined);
  return loaded.entries.has(`${hostname}:${port}`) ? pass(undefined) : reject("port_not_allowed", port);
}
