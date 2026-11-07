import { describe, expect, it } from "vitest";
import { trimAndStrip } from "../../../../src/url/steps/02-trim-and-strip";

describe("step 2: trim and strip", () => {
  it("trims leading and trailing spaces and C0 controls", () => {
    expect(trimAndStrip("  a  ")).toBe("a");
    expect(trimAndStrip("\u0001\u001f a \u0000")).toBe("a");
  });
  it("removes tab, LF and CR anywhere", () => {
    expect(trimAndStrip("a\tb\nc\rd")).toBe("abcd");
    expect(trimAndStrip("ht\ntps://x")).toBe("https://x");
  });
  it("keeps interior spaces and other controls (the char gate rejects those)", () => {
    expect(trimAndStrip("a b")).toBe("a b");
    expect(trimAndStrip("a\u0001b")).toBe("a\u0001b");
  });
  it("does not trim no-break space or DEL (browsers do not)", () => {
    expect(trimAndStrip("\u00a0a")).toBe("\u00a0a");
    expect(trimAndStrip("a\u007f")).toBe("a\u007f");
  });
  it("returns an empty string for blank input", () => {
    expect(trimAndStrip("")).toBe("");
    expect(trimAndStrip(" \t\n ")).toBe("");
  });
  it("is linear-time on adversarial whitespace", () => {
    const started = Date.now();
    trimAndStrip(`a${" ".repeat(1_000_000)}b`);
    trimAndStrip(`${" ".repeat(1_000_000)}a${" ".repeat(1_000_000)}`);
    expect(Date.now() - started).toBeLessThan(1000);
  });
});
