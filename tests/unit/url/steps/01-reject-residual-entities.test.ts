import { describe, expect, it } from "vitest";
import { rejectResidualEntities } from "../../../../src/url/steps/01-reject-residual-entities";

describe("step 1: reject residual entities", () => {
  it.each(["a&amp;b", "&#46;", "&#x2e;", "&#X2E;", "&lt;", "x&nbsp;y", "https://a.com/&#104;"])(
    "rejects %s", (input) => {
      expect(rejectResidualEntities(input)).toMatchObject({ ok: false, reason: "double_encoded" });
    });

  it.each(["a&b", "a&b=c&d=e", "&#;", "&amp", "&", "&&", "50% & more", "?a=1&b=2"])(
    "passes %s", (input) => {
      expect(rejectResidualEntities(input)).toEqual({ ok: true, value: input });
    });

  it("handles pathological input in linear time", () => {
    const started = Date.now();
    rejectResidualEntities(`&${"1".repeat(300_000)}`);
    rejectResidualEntities("&#".repeat(150_000));
    expect(Date.now() - started).toBeLessThan(1000);
  });
});
