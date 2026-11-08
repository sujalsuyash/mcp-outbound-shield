// Applies on_error and records an audit event. Fails closed: both options withhold the message.
import type { AuditReason } from "../audit/audit-event";
import type { AuditSink } from "../audit/audit-sink";
import { recordSafely } from "../audit/record-safely";
import type { OnError } from "../types/policy";

export type ErrorOutcome = { readonly kind: OnError };

export function applyError(mode: OnError, reason: AuditReason, sink: AuditSink, detail?: string): ErrorOutcome {
  recordSafely(sink, {
    category: mode === "drop_message" ? "message_dropped" : "stream_aborted",
    action: mode === "drop_message" ? "dropped" : "aborted",
    reason,
    ...(detail !== undefined ? { detail } : {})
  });
  return { kind: mode };
}
