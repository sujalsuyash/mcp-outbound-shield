import { describe, expect, it } from "vitest";
import { policySchema } from "../../../src/policy/policy-schema";
import { hasSubdomainRules, isAllowedSubdomain } from "../../../src/url/subdomain-rules";

const entry = (extra: Record<string, unknown>) =>
  policySchema.parse({ version: 1, allowlist: { "a.com": { allowed_paths: ["/x"], ...extra } } }).allowlist["a.com"]!;

describe("hasSubdomainRules", () => {
  it("is false by default and true when either option is set", () => {
    expect(hasSubdomainRules(entry({}))).toBe(false);
    expect(hasSubdomainRules(entry({ allowed_subdomains: ["cdn"] }))).toBe(true);
    expect(hasSubdomainRules(entry({ allow_subdomains: true, acknowledge_wildcard_risk: true }))).toBe(true);
  });
});

describe("isAllowedSubdomain: explicit list", () => {
  const e = entry({ allowed_subdomains: ["cdn", "static-1"] });
  it("allows exactly the listed labels", () => {
    expect(isAllowedSubdomain("cdn", e, 16)).toBe(true);
    expect(isAllowedSubdomain("static-1", e, 16)).toBe(true);
  });
  it("rejects everything else, including multi-level and lookalikes", () => {
    for (const p of ["", "evil", "cdn.evil", "a.cdn", "cdn2", "xcdn", "u0vdukvux0rbvee"]) {
      expect(isAllowedSubdomain(p, e, 16), p).toBe(false);
    }
  });
});

describe("isAllowedSubdomain: open wildcard", () => {
  const e = entry({ allow_subdomains: true, acknowledge_wildcard_risk: true });
  it("allows one short, simple label", () => {
    for (const p of ["x", "cdn", "a-b", "img2", "abcdefghijklmnop"]) expect(isAllowedSubdomain(p, e, 16), p).toBe(true);
  });
  it("enforces the label length limit exactly", () => {
    expect(isAllowedSubdomain("g".repeat(16), e, 16)).toBe(true);
    expect(isAllowedSubdomain("g".repeat(17), e, 16)).toBe(false);
    expect(isAllowedSubdomain("g".repeat(8), e, 7)).toBe(false);
  });
  it("rejects two levels, empty, underscores, uppercase, leading/trailing/double hyphens", () => {
    for (const p of ["a.b", "", "a_b", "A", "-a", "a-", "a--b", "a-b-c"]) expect(isAllowedSubdomain(p, e, 16), p).toBe(false);
  });
  it("rejects all-hex labels of 10+ characters but not shorter ones", () => {
    expect(isAllowedSubdomain("deadbeef12", e, 16)).toBe(false);
    expect(isAllowedSubdomain("deadbeef1", e, 16)).toBe(true);
    expect(isAllowedSubdomain("deadbeefgh", e, 16)).toBe(true);
  });
  it("is false when neither option is set", () => {
    expect(isAllowedSubdomain("cdn", entry({}), 16)).toBe(false);
  });
});
