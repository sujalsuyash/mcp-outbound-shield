import { describe, expect, it } from "vitest";
import { hasHighEntropy, shannonEntropy } from "../../../../src/url/heuristics/entropy-check";

describe("shannonEntropy", () => {
  it("matches known values", () => {
    expect(shannonEntropy("")).toBe(0);
    expect(shannonEntropy("aaaa")).toBe(0);
    expect(shannonEntropy("abab")).toBeCloseTo(1, 10);
    expect(shannonEntropy("abcd")).toBeCloseTo(2, 10);
    expect(shannonEntropy("abcdefgh")).toBeCloseTo(3, 10);
  });
});

describe("hasHighEntropy", () => {
  it("ignores tokens of 20 characters or fewer, however random (boundary)", () => {
    expect(hasHighEntropy("abcdefghijklmnopqrst", 4.2)).toBe(false); // 20 distinct, entropy 4.32
  });
  it("flags tokens of 21+ characters above the threshold", () => {
    expect(hasHighEntropy("abcdefghijklmnopqrstu", 4.2)).toBe(true); // 21 distinct, entropy 4.39
  });
  it("uses a strict comparison against the threshold", () => {
    const token = "ab".repeat(11); // 22 chars, entropy exactly 1
    expect(hasHighEntropy(token, 1)).toBe(false);
    expect(hasHighEntropy(token, 0.99)).toBe(true);
  });
  it("leaves long natural names alone", () => {
    expect(hasHighEntropy("architecture-overview-diagram", 4.2)).toBe(false);
    expect(hasHighEntropy("quarterly-revenue-summary-2026", 4.2)).toBe(false);
    expect(hasHighEntropy("company-logo-dark-theme-final", 4.2)).toBe(false);
  });
  it("counts code points, not UTF-16 units", () => {
    expect(shannonEntropy("\u{1f600}\u{1f601}")).toBeCloseTo(1, 10);
  });
});
