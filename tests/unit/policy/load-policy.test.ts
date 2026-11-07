import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { MATRIX_POLICY_RAW } from "../../helpers/matrix-policy";
import { loadPolicy } from "../../../src/policy/load-policy";
import { PolicyError } from "../../../src/policy/policy-error";

const minimal = { version: 1, allowlist: { "a.com": { allowed_paths: ["/x/*.png"] } } };

describe("loadPolicy", () => {
  it("loads the matrix policy and compiles patterns", () => {
    const loaded = loadPolicy(MATRIX_POLICY_RAW);
    expect([...loaded.entries.keys()].sort()).toEqual(["api.corp.internal", "github.com", "static.internal"]);
    const github = loaded.entries.get("github.com");
    expect(github?.patterns[0]?.matches("/my-org/assets/logo.png")).toBe(true);
    expect(github?.patterns[0]?.matches("/evil/leak.png")).toBe(false);
  });

  it("loads policy.example.json from the repo root", () => {
    const raw: unknown = JSON.parse(readFileSync("policy.example.json", "utf8"));
    expect(() => loadPolicy(raw)).not.toThrow();
  });

  it("fills defaults", () => {
    const { policy } = loadPolicy(minimal);
    expect(policy.on_error).toBe("drop_message");
    expect(policy.link_handling_mode).toBe("defang_untrusted");
    expect(policy.default_heuristics.max_uri_length).toBe(200);
    expect(policy.allowlist["a.com"]?.allow_query).toBe(false);
  });

  it("does not share default arrays between entries", () => {
    const { policy } = loadPolicy({
      version: 1,
      allowlist: { "a.com": { allowed_paths: ["/a/*"] }, "b.com": { allowed_paths: ["/b/*"] } }
    });
    expect(policy.allowlist["a.com"]?.allowed_subdomains).not.toBe(policy.allowlist["b.com"]?.allowed_subdomains);
  });

  it("surfaces warnings", () => {
    const { warnings } = loadPolicy({
      version: 1,
      allowlist: { "a.com": { allowed_paths: ["/a/*"], allow_subdomains: true, acknowledge_wildcard_risk: true } }
    });
    expect(warnings.length).toBe(1);
  });

  const invalid: Array<[string, unknown]> = [
    ["not an object", "hello"],
    ["missing version", { allowlist: {} }],
    ["wrong version", { version: 2 }],
    ["unknown top-level key", { version: 1, fail_action: "strip_tag" }],
    ["unknown entry key", { version: 1, allowlist: { "a.com": { allowed_paths: ["/a"], nope: 1 } } }],
    ["bad enum", { version: 1, on_error: "ignore" }],
    ["negative limit", { version: 1, limits: { max_depth: -1 } }],
    ["entropy above 8", { version: 1, default_heuristics: { max_segment_entropy: 9 } }],
    ["shared hosting key", { version: 1, allowlist: { "github.io": { allowed_paths: ["/a"] } } }],
    ["bad path pattern", { version: 1, allowlist: { "a.com": { allowed_paths: ["/a/**/b"] } } }],
    ["wildcard without ack", { version: 1, allowlist: { "a.com": { allowed_paths: ["/a"], allow_subdomains: true } } }]
  ];
  for (const [name, raw] of invalid) {
    it(`refuses to load: ${name}`, () => {
      expect(() => loadPolicy(raw)).toThrow(PolicyError);
    });
  }

  it("reports all problems at once", () => {
    try {
      loadPolicy({
        version: 1,
        allowlist: { "github.io": { allowed_paths: [] }, "b.com": { allowed_paths: ["/a/**/b"] } }
      });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(PolicyError);
      expect((error as PolicyError).issues.length).toBeGreaterThanOrEqual(3);
    }
  });
});
