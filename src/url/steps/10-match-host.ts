// Step 10: find the allowlist entry for the host (exact, or explicit subdomain of an entry).
import type { CompiledEntry, LoadedPolicy } from "../../policy/load-policy";
import { RELATIVE_KEY } from "../../policy/validate-allowlist";
import { pass, reject, type StepResult } from "../step-result";
import { hasSubdomainRules, isAllowedSubdomain } from "../subdomain-rules";
import type { ParsedUrl } from "../url-state";

function findParentEntry(hostname: string, loaded: LoadedPolicy): CompiledEntry | undefined {
  let best: CompiledEntry | undefined;
  for (const entry of loaded.entries.values()) {
    if (entry.host === RELATIVE_KEY || entry.host.includes(":")) continue;
    if (!hostname.endsWith(`.${entry.host}`)) continue;
    if (best === undefined || entry.host.length > best.host.length) best = entry;
  }
  return best;
}

export function matchHost(parsed: ParsedUrl, loaded: LoadedPolicy): StepResult<CompiledEntry> {
  if (parsed.relative) {
    const relativeEntry = loaded.entries.get(RELATIVE_KEY);
    return relativeEntry ? pass(relativeEntry) : reject("relative_not_allowed");
  }

  const { hostname, port } = parsed.url;
  const exact = loaded.entries.get(port === "" ? hostname : `${hostname}:${port}`);
  if (exact) return pass(exact);

  const parent = port === "" ? findParentEntry(hostname, loaded) : undefined;
  if (parent === undefined || !hasSubdomainRules(parent.entry)) {
    return reject("host_not_allowed", hostname);
  }

  const prefix = hostname.slice(0, hostname.length - parent.host.length - 1);
  const maxLabel = loaded.policy.default_heuristics.max_subdomain_label_length;
  return isAllowedSubdomain(prefix, parent.entry, maxLabel)
    ? pass(parent)
    : reject("subdomain_not_allowed", prefix);
}
