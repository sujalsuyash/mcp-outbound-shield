// Classifies a link as trusted (on the allowlist), untrusted-but-clean web, or unusable.
import type { LoadedPolicy } from "../policy/load-policy";
import type { Vector } from "../types/vector";
import { evaluateUrl } from "../url/evaluate-url";
import { canonicalizeWebUrl } from "./canonicalize-web-url";

export type LinkClassification =
  | { readonly kind: "trusted"; readonly canonical: string }
  | { readonly kind: "untrusted_web"; readonly canonical: string }
  | { readonly kind: "unusable" };

export function classifyLink(url: string, vector: Vector, loaded: LoadedPolicy): LinkClassification {
  const verdict = evaluateUrl(url, vector, loaded);
  if (verdict.allow) return { kind: "trusted", canonical: verdict.canonical };
  const clean = canonicalizeWebUrl(url, loaded);
  return clean === null ? { kind: "unusable" } : { kind: "untrusted_web", canonical: clean };
}
