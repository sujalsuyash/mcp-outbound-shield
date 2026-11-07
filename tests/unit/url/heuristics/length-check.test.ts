import { describe, expect, it } from "vitest";
import { exceedsLength } from "../../../../src/url/heuristics/length-check";

describe("length check", () => {
  it("is exclusive at the limit", () => {
    expect(exceedsLength("a".repeat(200), 200)).toBe(false);
    expect(exceedsLength("a".repeat(201), 200)).toBe(true);
    expect(exceedsLength("", 0)).toBe(false);
    expect(exceedsLength("a", 0)).toBe(true);
  });
});
