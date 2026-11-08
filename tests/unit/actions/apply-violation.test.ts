import { describe, expect, it } from "vitest";
import { MemorySink } from "../../../src/audit/memory-sink";
import { applyViolation, PLACEHOLDER_TEXT } from "../../../src/actions/apply-violation";

const input = { url: "https://evil.com/x?d=SECRET", vector: "markdown_image", reason: "host_not_allowed" } as const;

describe("applyViolation", () => {
  it("strip_node removes the node", () => {
    expect(applyViolation("strip_node", input, new MemorySink())).toEqual({ kind: "remove" });
  });
  it("replace_placeholder substitutes the placeholder text", () => {
    expect(applyViolation("replace_placeholder", input, new MemorySink())).toEqual({ kind: "text", value: PLACEHOLDER_TEXT });
    expect(PLACEHOLDER_TEXT).toBe("[Blocked Resource]");
  });
  it("defang substitutes the defanged URL as code", () => {
    expect(applyViolation("defang", input, new MemorySink())).toEqual({ kind: "code", value: "hxxps://evil[.]com/x?d=SECRET" });
  });
  it("never returns the original URL in any mode", () => {
    for (const mode of ["strip_node", "replace_placeholder", "defang"] as const) {
      expect(JSON.stringify(applyViolation(mode, input, new MemorySink()))).not.toContain("https://evil.com");
    }
  });

  it.each([
    ["strip_node", "stripped"], ["replace_placeholder", "replaced"], ["defang", "defanged"]
  ] as const)("records one %s audit event", (mode, action) => {
    const sink = new MemorySink();
    applyViolation(mode, input, sink);
    expect(sink.events).toEqual([
      { category: "url_violation", action, vector: "markdown_image", reason: "host_not_allowed", subject: input.url }
    ]);
  });

  it("still returns its outcome when the sink throws", () => {
    const bad = { record: () => { throw new Error("boom"); } };
    expect(applyViolation("strip_node", input, bad)).toEqual({ kind: "remove" });
  });
});
