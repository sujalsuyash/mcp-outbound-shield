// Sink that writes one JSON line per event. JSON escaping keeps attacker text from forging log lines.
import type { AuditEvent } from "./audit-event";
import type { AuditSink } from "./audit-sink";

export class ConsoleSink implements AuditSink {
  constructor(private readonly write: (line: string) => void = (line) => console.log(line)) {}

  record(event: AuditEvent): void {
    this.write(JSON.stringify({ source: "mcp-outbound-shield", ...event }));
  }
}
