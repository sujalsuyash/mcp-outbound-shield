import { describe, expect, it } from "vitest";
import { hasBase64Signature } from "../../../../src/url/heuristics/base64-signature";

describe("base64 signature", () => {
  it("flags mixed-case alphanumeric tokens of 14+ characters", () => {
    expect(hasBase64Signature("U0VDUkVUX0RBVEE")).toBe(true);
    expect(hasBase64Signature("AbCdEfGh1jKlMn")).toBe(true); // exactly 14
    expect(hasBase64Signature("Ab-dEfGh1jKl_n")).toBe(true); // URL-safe alphabet
  });
  it("does not flag 13 characters (boundary)", () => {
    expect(hasBase64Signature("AbCdEfGh1jKlM")).toBe(false);
  });
  it("needs upper, lower and a digit", () => {
    expect(hasBase64Signature("abcdefghijklmnopq1")).toBe(false); // no upper
    expect(hasBase64Signature("ABCDEFGHIJKLMNOPQ1")).toBe(false); // no lower
    expect(hasBase64Signature("AbCdEfGhIjKlMnOpQr")).toBe(false); // no digit
  });
  it("flags padding characters", () => {
    expect(hasBase64Signature("ab=")).toBe(true);
    expect(hasBase64Signature("ab%3D")).toBe(true);
    expect(hasBase64Signature("ab%3d")).toBe(true);
  });
  it("leaves ordinary filenames alone", () => {
    for (const t of ["logo", "architecture-overview-diagram", "quarterly-revenue-summary-2026", "a", ""]) {
      expect(hasBase64Signature(t), t).toBe(false);
    }
  });
});
