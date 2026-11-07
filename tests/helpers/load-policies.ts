// Loaded (validated and compiled) versions of the test policies, plus a ParsedUrl builder for step tests.
import { loadPolicy } from "../../src/policy/load-policy";
import type { ParsedUrl } from "../../src/url/url-state";
import { EXTRA_POLICY_RAW, MATRIX_POLICY_RAW, type PolicyName } from "./matrix-policy";

export const MATRIX = loadPolicy(MATRIX_POLICY_RAW);
export const EXTRA = loadPolicy(EXTRA_POLICY_RAW);

export const LOADED = { matrix: MATRIX, extra: EXTRA } satisfies Record<PolicyName, unknown>;

export function parsed(url: string, relative = false): ParsedUrl {
  return { url: new URL(url), relative };
}
