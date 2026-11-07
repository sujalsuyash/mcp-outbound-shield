// P-03: evaluating an allowed URL's canonical form returns the same canonical form.
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { anyInput, anyPolicyName, anyVector } from "../helpers/generators";
import { LOADED } from "../helpers/load-policies";
import { evaluateUrl } from "../../src/url/evaluate-url";

describe("P-03 canonical form is a fixed point", () => {
  it("evaluate(canonical) == canonical", () => {
    let allowed = 0;
    fc.assert(
      fc.property(anyInput, anyVector, anyPolicyName, (input, vector, policy) => {
        const first = evaluateUrl(input, vector, LOADED[policy]);
        if (!first.allow) return;
        allowed += 1;
        const second = evaluateUrl(first.canonical, vector, LOADED[policy]);
        expect(second).toEqual({ allow: true, canonical: first.canonical });
      }),
      { numRuns: 8000 }
    );
    expect(allowed).toBeGreaterThan(50); // the generator must actually reach "allow"
  });
});
