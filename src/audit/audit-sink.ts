// Interface: where audit events are sent. Implementations must not throw into the pipeline.
import type { AuditEvent } from "./audit-event";

export interface AuditSink {
  record(event: AuditEvent): void;
}

export const NOOP_SINK: AuditSink = { record: () => undefined };
