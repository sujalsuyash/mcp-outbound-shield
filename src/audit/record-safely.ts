// Sends an event to a sink and swallows any sink failure: logging must never change what is emitted.
import type { AuditEvent } from "./audit-event";
import type { AuditSink } from "./audit-sink";
import { makeAuditEvent } from "./make-audit-event";

export function recordSafely(sink: AuditSink, event: AuditEvent): void {
  try {
    sink.record(makeAuditEvent(event));
  } catch {
    // A failing log destination is not a reason to block, drop, or alter output.
  }
}
