// Orchestrator: parse the schema, validate the allowlist, compile path patterns. No logic of its own.
import type { AllowlistEntry, Policy } from "../types/policy";
import { compilePathPattern, type CompiledPathPattern } from "./compile-path-patterns";
import { PolicyError } from "./policy-error";
import { policySchema } from "./policy-schema";
import { validateAllowlist } from "./validate-allowlist";

export interface CompiledEntry {
  readonly host: string;
  readonly entry: AllowlistEntry;
  readonly patterns: readonly CompiledPathPattern[];
}

export interface LoadedPolicy {
  readonly policy: Policy;
  readonly entries: ReadonlyMap<string, CompiledEntry>;
  readonly warnings: readonly string[];
}

function compileEntries(policy: Policy, issues: string[]): Map<string, CompiledEntry> {
  const entries = new Map<string, CompiledEntry>();
  for (const [host, entry] of Object.entries(policy.allowlist)) {
    const patterns: CompiledPathPattern[] = [];
    for (const source of entry.allowed_paths) {
      try {
        patterns.push(compilePathPattern(source, entry.path_case_insensitive));
      } catch (error) {
        issues.push(error instanceof PolicyError ? `${host}: ${error.issues.join("; ")}` : String(error));
      }
    }
    entries.set(host, { host, entry, patterns });
  }
  return entries;
}

export function loadPolicy(raw: unknown): LoadedPolicy {
  const parsed = policySchema.safeParse(raw);
  if (!parsed.success) {
    throw new PolicyError(
      parsed.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
    );
  }
  const policy = parsed.data;

  const { errors, warnings } = validateAllowlist(policy);
  const issues = [...errors];
  const entries = compileEntries(policy, issues);

  if (issues.length > 0) throw new PolicyError(issues);
  return { policy, entries, warnings };
}
