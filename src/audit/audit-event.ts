// Type: shape of an audit event (what the shield did and why). Types only.
import type { RejectReason } from "../types/reject-reason";
import type { Vector } from "../types/vector";

export type AuditCategory =
  | "url_violation"
  | "element_removed"
  | "attribute_removed"
  | "link_handled"
  | "construct_inert"
  | "message_dropped"
  | "stream_aborted";

export type AuditAction =
  | "stripped"
  | "replaced"
  | "defanged"
  | "rewritten"
  | "kept_with_warning"
  | "made_inert"
  | "dropped"
  | "aborted";

export type AuditReason =
  | RejectReason
  | "idempotency_failure"
  | "depth_exceeded"
  | "node_limit_exceeded"
  | "input_too_large"
  | "disallowed_element"
  | "disallowed_attribute";

export interface AuditEvent {
  readonly category: AuditCategory;
  readonly action: AuditAction;
  readonly vector?: Vector;
  readonly reason?: AuditReason;
  /** Short explanation. Truncated and stripped of control characters by makeAuditEvent. */
  readonly detail?: string;
  /** The offending input (for example the URL), truncated. May contain attacker-chosen text. */
  readonly subject?: string;
}
