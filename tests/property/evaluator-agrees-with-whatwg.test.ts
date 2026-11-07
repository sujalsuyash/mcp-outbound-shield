// P-01 at evaluator level: whatever is allowed, a WHATWG parser (the browser's algorithm) resolves to
// the same host and path, with no credentials, on a host the policy lists.
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { anyInput, anyPolicyName, anyVector } from "../helpers/generators";
import { LOADED } from "../helpers/load-policies";
import { preParseOracle } from "../helpers/pre-parse-oracle";
import { evaluateUrl } from "../../src/url/evaluate-url";

describe("P-01 (evaluator) allowed URLs match the browser's view and the allowlist", () => {
  it("host, path, and credentials agree with new URL(), and the host is allowlisted", () => {
    let checked = 0;
    fc.assert(
      fc.property(anyInput, anyVector, anyPolicyName, (input, vector, policy) => {
        const verdict = evaluateUrl(input, vector, LOADED[policy]);
        if (!verdict.allow || verdict.canonical.startsWith("/")) return;
        checked += 1;

        const { stripped } = preParseOracle(input);
        const reference = new URL(stripped.startsWith("//") ? `https:${stripped}` : stripped);
        const canonical = new URL(verdict.canonical);

        expect(canonical.hostname).toBe(reference.hostname);
        expect(canonical.pathname).toBe(reference.pathname);
        expect(canonical.port).toBe(reference.port);
        expect(reference.username + reference.password).toBe("");

        const keys = [...LOADED[policy].entries.keys()];
        const hostKey = canonical.port === "" ? canonical.hostname : `${canonical.hostname}:${canonical.port}`;
        const listed = keys.includes(hostKey) || keys.some((k) => canonical.hostname.endsWith(`.${k}`));
        expect(listed).toBe(true);
      }),
      { numRuns: 8000 }
    );
    expect(checked).toBeGreaterThan(50);
  });
});
