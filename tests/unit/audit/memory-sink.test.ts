import { describe, expect, it } from "vitest";
import { MemorySink } from "../../../src/audit/memory-sink";

const event = { category: "url_violation", action: "stripped" } as const;

describe("MemorySink", () => {
  it("collects events in order", () => {
    const sink = new MemorySink();
    sink.record(event);
    sink.record({ ...event, action: "defanged" });
    expect(sink.events.map((e) => e.action)).toEqual(["stripped", "defanged"]);
  });
  it("is bounded and counts what it dropped", () => {
    const sink = new MemorySink(3);
    for (let i = 0; i < 10; i += 1) sink.record(event);
    expect(sink.events.length).toBe(3);
    expect(sink.droppedCount).toBe(7);
  });
  it("clear resets both", () => {
    const sink = new MemorySink(1);
    sink.record(event);
    sink.record(event);
    sink.clear();
    expect(sink.events.length).toBe(0);
    expect(sink.droppedCount).toBe(0);
  });
});
