import { describe, expect, it } from "vitest";
import { NOOP_SINK } from "../../../src/audit/audit-sink";
import { recordSafely } from "../../../src/audit/record-safely";

describe("audit sink contract", () => {
  it("NOOP_SINK accepts events and does nothing", () => {
    expect(() => NOOP_SINK.record({ category: "url_violation", action: "stripped" })).not.toThrow();
  });
  it("recordSafely cleans the event before it reaches the sink", () => {
    const seen: unknown[] = [];
    recordSafely({ record: (e) => seen.push(e) }, { category: "url_violation", action: "stripped", subject: "a\nb" });
    expect(seen).toEqual([{ category: "url_violation", action: "stripped", subject: "a?b" }]);
  });
  it("recordSafely swallows a throwing sink", () => {
    const bad = { record: () => { throw new Error("disk full"); } };
    expect(() => recordSafely(bad, { category: "url_violation", action: "stripped" })).not.toThrow();
  });
});
