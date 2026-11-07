import { describe, expect, it } from "vitest";
import { DEFAULT_ENTRY_VALUES, DEFAULT_HEURISTICS, DEFAULT_LIMITS } from "../../../src/policy/default-policy";

describe("default policy values", () => {
  it("are positive and match the spec", () => {
    expect(Object.values(DEFAULT_LIMITS).every((n) => n > 0)).toBe(true);
    expect(Object.values(DEFAULT_HEURISTICS).every((n) => n > 0)).toBe(true);
    expect(DEFAULT_LIMITS.max_construct_bytes).toBe(4096);
    expect(DEFAULT_LIMITS.max_depth).toBe(64);
    expect(DEFAULT_LIMITS.max_nodes).toBe(10_000);
    expect(DEFAULT_HEURISTICS.max_uri_length).toBe(200);
    expect(DEFAULT_HEURISTICS.max_segment_entropy).toBe(4.2);
    expect(DEFAULT_HEURISTICS.max_path_depth).toBe(6);
  });

  it("deny by default", () => {
    expect(DEFAULT_ENTRY_VALUES.allow_query).toBe(false);
    expect(DEFAULT_ENTRY_VALUES.allow_subdomains).toBe(false);
    expect(DEFAULT_ENTRY_VALUES.allowed_subdomains).toEqual([]);
  });
});
