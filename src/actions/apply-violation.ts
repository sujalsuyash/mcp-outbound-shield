// Applies on_violation to a rejected URL and records an audit event. Returns what to put in its place.
import type { AuditSink } from "../audit/audit-sink";
import { recordSafely } from "../audit/record-safely";
import { defangUrl } from "../defang/defang-url";
import type { OnViolation } from "../types/policy";
import type { RejectReason } from "../types/reject-reason";
import type { Vector } from "../types/vector";

export const PLACEHOLDER_TEXT = "[Blocked Resource]";

export type ViolationOutcome =
  | { readonly kind: "remove" }
  | { readonly kind: "text"; readonly value: string }
  | { readonly kind: "code"; readonly value: string };

export interface ViolationInput {
  readonly url: string;
  readonly vector: Vector;
  readonly reason: RejectReason;
}

export function applyViolation(mode: OnViolation, input: ViolationInput, sink: AuditSink): ViolationOutcome {
  const action = mode === "strip_node" ? "stripped" : mode === "replace_placeholder" ? "replaced" : "defanged";
  recordSafely(sink, {
    category: "url_violation",
    action,
    vector: input.vector,
    reason: input.reason,
    subject: input.url
  });

  if (mode === "replace_placeholder") return { kind: "text", value: PLACEHOLDER_TEXT };
  if (mode === "defang") return { kind: "code", value: defangUrl(input.url) };
  return { kind: "remove" };
}
