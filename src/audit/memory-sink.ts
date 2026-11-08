// Sink that collects events in memory (tests, short-lived hosts). Bounded so it cannot grow forever.
import type { AuditEvent } from "./audit-event";
import type { AuditSink } from "./audit-sink";

export class MemorySink implements AuditSink {
  private readonly items: AuditEvent[] = [];
  private dropped = 0;

  constructor(private readonly maxEvents = 10_000) {}

  record(event: AuditEvent): void {
    if (this.items.length < this.maxEvents) this.items.push(event);
    else this.dropped += 1;
  }

  get events(): readonly AuditEvent[] {
    return this.items;
  }

  get droppedCount(): number {
    return this.dropped;
  }

  clear(): void {
    this.items.length = 0;
    this.dropped = 0;
  }
}
