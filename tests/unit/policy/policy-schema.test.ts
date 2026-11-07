import { describe, expect, it } from "vitest";
import { policySchema } from "../../../src/policy/policy-schema";

describe("policySchema", () => {
  it("fills every default from a minimal policy", () => {
    const p = policySchema.parse({ version: 1 });
    expect(p.stream_mode).toBe("incremental_prefix");
    expect(p.on_violation).toBe("strip_node");
    expect(p.allow_http).toBe(false);
    expect(p.limits.max_construct_bytes).toBe(4096);
    expect(p.default_heuristics.max_subdomain_label_length).toBe(16);
    expect(p.allowlist).toEqual({});
  });

  it("fills entry defaults and keeps max_uri_length undefined when unset", () => {
    const p = policySchema.parse({ version: 1, allowlist: { "a.com": { allowed_paths: ["/a"] } } });
    const entry = p.allowlist["a.com"];
    expect(entry?.max_param_value_length).toBe(32);
    expect(entry?.max_uri_length).toBeUndefined();
  });

  it("rejects unknown keys (strict)", () => {
    expect(policySchema.safeParse({ version: 1, surprise: true }).success).toBe(false);
  });

  it("rejects non-integer and non-positive numbers", () => {
    expect(policySchema.safeParse({ version: 1, limits: { max_depth: 1.5 } }).success).toBe(false);
    expect(policySchema.safeParse({ version: 1, limits: { max_depth: 0 } }).success).toBe(false);
  });
});
