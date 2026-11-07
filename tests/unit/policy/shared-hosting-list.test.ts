import { describe, expect, it } from "vitest";
import { SHARED_HOSTING_SUFFIXES } from "../../../src/policy/shared-hosting-list";

describe("SHARED_HOSTING_SUFFIXES", () => {
  it("is lowercase, trimmed, free of leading dots and duplicates", () => {
    for (const s of SHARED_HOSTING_SUFFIXES) {
      expect(s).toBe(s.trim().toLowerCase());
      expect(s.startsWith(".")).toBe(false);
      expect(s).toContain(".");
    }
    expect(new Set(SHARED_HOSTING_SUFFIXES).size).toBe(SHARED_HOSTING_SUFFIXES.length);
  });

  it("contains the hosts named in the README", () => {
    for (const s of ["github.io", "herokuapp.com", "amazonaws.com"]) {
      expect(SHARED_HOSTING_SUFFIXES).toContain(s);
    }
  });
});
