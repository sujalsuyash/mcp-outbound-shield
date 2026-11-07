// P-04: the evaluator never throws, and never needs its internal_error safety net for string input.
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { anyInput, anyPolicyName, anyVector } from "../helpers/generators";
import { LOADED } from "../helpers/load-policies";
import { evaluateUrl } from "../../src/url/evaluate-url";

describe("P-04 evaluateUrl is total", () => {
  it("returns a well-formed verdict and never internal_error for any string", () => {
    fc.assert(
      fc.property(anyInput, anyVector, anyPolicyName, (input, vector, policy) => {
        const verdict = evaluateUrl(input, vector, LOADED[policy]);
        if (verdict.allow) {
          expect(typeof verdict.canonical).toBe("string");
        } else {
          expect(verdict.reason).not.toBe("internal_error");
        }
      }),
      { numRuns: 5000 }
    );
  });
});
