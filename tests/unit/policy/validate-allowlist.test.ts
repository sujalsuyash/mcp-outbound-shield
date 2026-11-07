import { describe, expect, it } from "vitest";
import { policySchema } from "../../../src/policy/policy-schema";
import { validateAllowlist } from "../../../src/policy/validate-allowlist";

const make = (allowlist: Record<string, unknown>) =>
  validateAllowlist(policySchema.parse({ version: 1, allowlist }));

const ok = { allowed_paths: ["/a/*.png"] };

describe("validateAllowlist: host keys", () => {
  it("accepts ordinary hosts, host:port, and localhost", () => {
    const r = make({ "github.com": ok, "cdn.example.org": ok, "example.com:8443": ok, localhost: ok });
    expect(r.errors).toEqual([]);
  });

  it("accepts the relative key", () => {
    expect(make({ __relative__: ok }).errors).toEqual([]);
  });

  const badKeys: Array<[string, string]> = [
    ["GitHub.com", "uppercase"],
    ["münchen.de", "non-ascii"],
    ["example.com.", "trailing dot"],
    ["*.example.com", "wildcard in key"],
    ["https://example.com", "scheme in key"],
    ["example.com/path", "path in key"],
    ["127.0.0.1", "ipv4"],
    ["2130706433", "numeric host"],
    ["com", "public suffix"],
    ["co.uk", "public suffix"],
    ["github.io", "shared hosting"],
    ["herokuapp.com", "shared hosting"],
    ["example.com:443", "default port"],
    ["example.com:99999", "bad port"]
  ];
  for (const [key, why] of badKeys) {
    it(`rejects ${key} (${why})`, () => {
      expect(make({ [key]: ok }).errors.length).toBeGreaterThan(0);
    });
  }

  it("warns (not errors) for a specific subdomain on shared hosting", () => {
    const r = make({ "myorg.github.io": ok });
    expect(r.errors).toEqual([]);
    expect(r.warnings.length).toBe(1);
  });
});

describe("validateAllowlist: entry rules", () => {
  it("requires non-empty allowed_paths", () => {
    expect(make({ "a.com": { allowed_paths: [] } }).errors.length).toBe(1);
  });

  it("wildcard needs acknowledgment, and warns when acknowledged", () => {
    expect(make({ "a.com": { ...ok, allow_subdomains: true } }).errors.length).toBe(1);
    const r = make({ "a.com": { ...ok, allow_subdomains: true, acknowledge_wildcard_risk: true } });
    expect(r.errors).toEqual([]);
    expect(r.warnings.length).toBe(1);
  });

  it("rejects wildcard combined with an explicit subdomain list", () => {
    const r = make({
      "a.com": { ...ok, allow_subdomains: true, acknowledge_wildcard_risk: true, allowed_subdomains: ["cdn"] }
    });
    expect(r.errors.length).toBe(1);
  });

  it("rejects invalid subdomain labels", () => {
    expect(make({ "a.com": { ...ok, allowed_subdomains: ["CDN"] } }).errors.length).toBe(1);
    expect(make({ "a.com": { ...ok, allowed_subdomains: ["a.b"] } }).errors.length).toBe(1);
    expect(make({ "a.com": { ...ok, allowed_subdomains: ["cdn", "static-1"] } }).errors).toEqual([]);
  });

  it("keeps allow_query and allowed_query_params consistent", () => {
    expect(make({ "a.com": { ...ok, allow_query: true } }).errors.length).toBe(1);
    expect(make({ "a.com": { ...ok, allowed_query_params: ["x"] } }).errors.length).toBe(1);
    expect(make({ "a.com": { ...ok, allow_query: true, allowed_query_params: ["x"] } }).errors).toEqual([]);
  });

  it("rejects bad or duplicate query parameter names", () => {
    expect(make({ "a.com": { ...ok, allow_query: true, allowed_query_params: ["a b"] } }).errors.length).toBe(1);
    expect(make({ "a.com": { ...ok, allow_query: true, allowed_query_params: ["x", "x"] } }).errors.length).toBe(1);
  });

  it("relative entry cannot use subdomain settings", () => {
    expect(make({ __relative__: { ...ok, allowed_subdomains: ["cdn"] } }).errors.length).toBe(1);
  });
});
