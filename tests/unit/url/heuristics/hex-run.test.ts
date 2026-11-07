import { describe, expect, it } from "vitest";
import { hasHexRun } from "../../../../src/url/heuristics/hex-run";

describe("hex run", () => {
  it("flags 20 or more contiguous hex digits (boundary at 20)", () => {
    expect(hasHexRun("a".repeat(20))).toBe(true);
    expect(hasHexRun("a".repeat(19))).toBe(false);
    expect(hasHexRun("0123456789ABCDEF0123")).toBe(true);
  });
  it("finds a run inside a longer token", () => {
    expect(hasHexRun(`file-${"f".repeat(20)}-x`)).toBe(true);
  });
  it("does not flag a UUID (runs are broken by hyphens)", () => {
    expect(hasHexRun("123e4567-e89b-12d3-a456-426614174000")).toBe(false);
  });
  it("does not flag short hex or words", () => {
    expect(hasHexRun("deadbeef")).toBe(false);
    expect(hasHexRun("architecture")).toBe(false);
  });
});
