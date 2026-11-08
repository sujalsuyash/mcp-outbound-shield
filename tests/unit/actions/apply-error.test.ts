import { describe, expect, it } from "vitest";
import { MemorySink } from "../../../src/audit/memory-sink";
import { applyError } from "../../../src/actions/apply-error";

describe("applyError", () => {
  it("returns the configured mode and records a matching event", () => {
    const drop = new MemorySink();
    expect(applyError("drop_message", "idempotency_failure", drop, "second pass differed")).toEqual({ kind: "drop_message" });
    expect(drop.events).toEqual([
      { category: "message_dropped", action: "dropped", reason: "idempotency_failure", detail: "second pass differed" }
    ]);

    const abort = new MemorySink();
    expect(applyError("abort_stream", "depth_exceeded", abort)).toEqual({ kind: "abort_stream" });
    expect(abort.events).toEqual([{ category: "stream_aborted", action: "aborted", reason: "depth_exceeded" }]);
  });
  it("still returns its outcome when the sink throws", () => {
    const bad = { record: () => { throw new Error("boom"); } };
    expect(applyError("drop_message", "internal_error", bad)).toEqual({ kind: "drop_message" });
  });
});
